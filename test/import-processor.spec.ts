import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type Query = { sql: string; params?: any[] };

function setup({
  failInsert = false,
  failBilling = false,
  claimDenied = false,
} = {}) {
  const queries: Query[] = [];
  const notifications: string[] = [];
  const transcripts: any[][] = [];
  let charges = 0;
  let insertFails = failInsert;
  let fetchQuery: (() => Promise<any>) | undefined;
  const pool = {
    async query(sql: string, params?: any[]) {
      queries.push({ sql, params });
      if (sql.startsWith("SELECT * FROM event WHERE"))
        return fetchQuery ? fetchQuery() : { rows: [] };
      if (sql.startsWith("SELECT uploading FROM event"))
        return { rows: [{ uploading: 1 }] };
      if (sql.includes("SELECT COUNT(*)"))
        return { rows: [{ count: transcripts.length }] };
      if (sql.includes("SELECT 1 FROM event_transcript"))
        return {
          rowCount: transcripts.filter(
            (row) => row[0] === params?.[0] && row[10] === params?.[1],
          ).length,
        };
      if (sql.includes("SELECT id FROM event_attendance"))
        return { rows: [{ id: 9 }] };
      if (sql.includes("INSERT INTO event_transcript")) {
        if (sql.includes("seq)")) throw new Error("column seq does not exist");
        if (insertFails) throw new Error("disk write failed");
        transcripts.push(params!);
        return { rowCount: 1 };
      }
      if (sql.includes("UPDATE event SET import_message = $1") && claimDenied)
        return { rowCount: 0 };
      if (sql.includes("UPDATE event") || sql.includes("update event"))
        return { rowCount: 1 };
      return { rows: [] };
    },
  };
  const emitter = {
    emit(name: string) {
      notifications.push(name);
    },
  };
  const fakeMoment: any = () => ({
    format: () => "2026-11-06 09:00:00",
    utcOffset() {
      return this;
    },
  });
  fakeMoment.locale = () => {};
  const axios = {
    async post(url: string) {
      if (url.includes("billing_log")) {
        charges++;
        if (failBilling)
          throw new Error("billing connection lost after request");
        return { data: { status_code: 201, data: { id: charges } } };
      }
      return { data: { response: 200 } };
    },
    async put() {
      return { data: {} };
    },
    async get() {
      return { data: {} };
    },
  };
  const dependencies: Record<string, any> = {
    "../app-logger/console.js": console,
    "../app-logger/logger.js": { error() {} },
    "../config/config.js": {
      services: {
        billing: {
          base_url: "http://billing.test",
          create_billing_log_endpoint: "/billing_log/create/",
          success_billing_log_endpoint: "/billing_log/update_status/success/",
          meetha_app_id: "test",
        },
        pricing: { staticPerMinutes: 1 },
        stt: {
          api: "http://stt.test",
          ws: "ws://stt.test",
          import_endpoint: "/meetha",
        },
      },
    },
    moment: fakeMoment,
    websocket: { client: class {} },
    axios,
    "../email/email.js": { async sendImportNotificationEmail() {} },
    "./import-constants.js": {
      BILLING_CLAIM_MESSAGE: "Billing reconciliation required",
    },
    "@socket.io/redis-adapter": { createAdapter() {} },
    redis: { createClient() {} },
  };
  const sandbox = {
    module: { exports: {} as any },
    require: (id: string) => dependencies[id],
    setTimeout,
    clearTimeout,
  };
  const source = readFileSync("src/common/runtime/import-processor.js", "utf8");
  runInNewContext(
    source +
      `
    module.exports.__test = {
      saveTranscript, synchronizeTranscripts, handleWebSocketMessage,
      enqueueEventWork, handleEventFailure, fetchUploadableEvents,
      processUploadingEvents, tryFinishEvent, cancelEventUploadWithEventId,
      initialize(pool, emitter) { dbpool = () => pool; io = emitter; stopping = false; },
      queue(events) { uploadingEvents = events; },
      queued() { return uploadingEvents; },
    };
  `,
    sandbox,
  );
  const core = sandbox.module.exports.__test;
  core.initialize(pool, emitter);
  const event = {
    id: 42,
    uploading: 1,
    duration_sec: 60,
    total_segment: 1,
    datausername: "owner",
    data_user_uuid: "uuid",
    third_party_key_1: "placeholder",
    description: "Test",
    timestart: "2026-11-06",
  } as any;
  const message = (data: Record<string, any>, type = "progress") => ({
    utf8Data: JSON.stringify({
      response: 200,
      message: type,
      data: { meetha_id: 42, ...data },
    }),
  });
  const segment = {
    message_id: "seg-1",
    transcript: "Halo semua",
    speaker_tag: 1,
    start_sec: 0,
    end_sec: 1,
    audio_len: 1,
  };
  return {
    core,
    pool,
    event,
    message,
    segment,
    notifications,
    transcripts,
    queries,
    get charges() {
      return charges;
    },
    failInserts(enabled: boolean) {
      insertFails = enabled;
    },
    setFetchQuery(query: () => Promise<any>) {
      fetchQuery = query;
    },
  };
}

describe("STT import persistence", () => {
  it("inserts into the actual existing schema (without seq) and deduplicates resync", async () => {
    const x = setup();
    const packet = {
      data: {
        meetha_id: 42,
        results: {
          ...x.segment,
          attendance_name: "Speaker 1",
          attendance_id: 9,
        },
      },
    };
    expect(await x.core.saveTranscript(packet, x.event)).toBe(true);
    expect(await x.core.saveTranscript(packet, x.event)).toBe(false);
    expect(x.transcripts).toHaveLength(1);
    expect(
      x.queries.find((query) => query.sql.includes("INSERT INTO"))?.params,
    ).toHaveLength(13);
  });

  it("waits for durable segments after a premature 100% progress signal", async () => {
    const x = setup();
    x.core.queue([x.event]);
    await x.core.enqueueEventWork(x.event, () =>
      x.core.handleWebSocketMessage(
        x.event,
        x.message({ total_percent: 100, total_chunks: 1 }),
      ),
    );
    expect(x.charges).toBe(0);
    expect(x.event.finished).toBeUndefined();
    expect(
      x.queries.some((query) => query.sql.includes("import_status = $5")),
    ).toBe(false);

    await x.core.enqueueEventWork(x.event, () =>
      x.core.handleWebSocketMessage(
        x.event,
        x.message({ results: x.segment }, "transcribe"),
      ),
    );
    expect(x.transcripts).toHaveLength(1);
    expect(x.charges).toBe(1);
    expect(x.event.finished).toBe(true);
    expect(x.core.queued()).toHaveLength(0);
    expect(x.notifications).toContain("event_import_finished");
    const finishedQuery = x.queries.find((query) =>
      query.sql.includes("import_status = $5"),
    )!;
    expect(finishedQuery.params).toEqual([
      2,
      100,
      1,
      2,
      2,
      "Finished",
      42,
      "Billing reconciliation required",
    ]);
    expect(
      x.queries.some(
        (q) =>
          q.sql.includes("SET import_message = $1") &&
          q.params?.[0] === "Billing reconciliation required",
      ),
    ).toBe(true);
  });

  it("keeps billing untouched and marks the event failed when an insert fails", async () => {
    const x = setup({ failInsert: true });
    x.core.queue([x.event]);
    await x.core.enqueueEventWork(x.event, () =>
      x.core.handleWebSocketMessage(
        x.event,
        x.message(
          { total_percent: 100, total_chunks: 1, results: x.segment },
          "transcribe",
        ),
      ),
    );
    expect(x.transcripts).toHaveLength(0);
    expect(x.charges).toBe(0);
    expect(x.event.failed).toBe(true);
    expect(x.core.queued()).toHaveLength(0);
    expect(x.notifications).toContain("event_import_failed");
    expect(
      x.queries
        .find((query) => query.sql.includes("UPDATE event SET id"))
        ?.params?.slice(0, 2),
    ).toEqual([3, 3]);
  });

  it("does not charge if the billing claim belongs to another worker", async () => {
    const x = setup({ claimDenied: true });
    x.event.completionReceived = true;
    x.event.observedSegments = new Set(["seg-1"]);
    await x.core.saveTranscript(
      { data: { meetha_id: 42, results: { ...x.segment } } },
      x.event,
    );
    await x.core.tryFinishEvent(x.event);
    expect(x.charges).toBe(0);
    expect(x.event.finished).toBe(true);
    expect(x.notifications).not.toContain("event_import_finished");
  });

  it("preserves a reconciliation marker when the billing response is ambiguous", async () => {
    const x = setup({ failBilling: true });
    x.event.completionReceived = true;
    x.event.observedSegments = new Set(["seg-1"]);
    await x.core.saveTranscript(
      { data: { meetha_id: 42, results: { ...x.segment } } },
      x.event,
    );
    await x.core.tryFinishEvent(x.event);
    expect(x.charges).toBe(1);
    expect(x.event.failed).toBe(true);
    expect(
      x.queries.some((q) =>
        q.sql.includes(
          "SET uploading = 3, import_status = 3, loading = 0 WHERE id = $1 AND import_message = $2",
        ),
      ),
    ).toBe(true);
    expect(
      x.queries.filter((q) => q.sql.includes("SET import_message = $1")),
    ).toHaveLength(1);
  });

  it("removes stale failed jobs so an event can be queued on restart", async () => {
    const x = setup();
    x.core.queue([x.event]);
    await x.core.handleEventFailure(x.event, new Error("STT offline"));
    expect(x.core.queued()).toHaveLength(0);
    const restarted = {
      ...x.event,
      uploading: 0,
      failed: undefined,
      failurePromise: undefined,
    };
    x.core.queue([restarted]);
    x.core.cancelEventUploadWithEventId(42);
    expect(x.core.queued()).toHaveLength(0);
  });

  it("ignores a stale poll response after an event is cancelled", async () => {
    const x = setup();
    x.core.queue([x.event]);
    let resolveFetch!: (value: any) => void;
    x.setFetchQuery(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const pendingFetch = x.core.fetchUploadableEvents();
    x.core.cancelEventUploadWithEventId(42);
    resolveFetch({ rows: [{ ...x.event, uploading: 0 }] });
    await pendingFetch;
    expect(x.core.queued()).toHaveLength(0);
    x.setFetchQuery(async () => ({ rows: [{ id: 42, uploading: 0 }] }));
    await x.core.fetchUploadableEvents();
    expect(x.core.queued()).toHaveLength(1);
  });

  it("parameterizes the speaker lookup even for speaker names containing quotes", async () => {
    const x = setup();
    await x.core.synchronizeTranscripts(
      [{ ...x.segment, speaker_tag: "a' OR 1=1 --" }],
      x.event,
    );
    const lookup = x.queries.find((query) =>
      query.sql.includes("SELECT id FROM event_attendance"),
    )!;
    expect(lookup.sql).toContain("name = $1");
    expect(lookup.params).toEqual(["Speaker a' OR 1=1 --", 42]);
  });

  it("propagates snapshot synchronization failures instead of completing", async () => {
    const x = setup({ failInsert: true });
    await expect(
      x.core.synchronizeTranscripts([x.segment], x.event),
    ).rejects.toThrow("disk write failed");
    expect(x.charges).toBe(0);
  });
});

describe("import environment", () => {
  const checkEnvironment = (runtimeEnabled: string, stt: string, ws: string) =>
    spawnSync(
      process.execPath,
      ["-e", "require('./dist/common/config/environment')"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          JWT_SECRET: "test-secret",
          RUNTIME_ENABLED: runtimeEnabled,
          STT_SERVER: stt,
          WS_STT_SERVER: ws,
          BILLING_SERVICE_BASE_URL: "http://billing.test:8181",
          BILLING_MEETHA_APP_ID: "meetha",
          REDIS_SERVER: "127.0.0.1:6379",
          PER_MINUTE_RATE: "1",
        },
      },
    );
  it("rejects missing STT endpoints when the runtime is enabled", () => {
    const result = checkEnvironment("true", "", "");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("STT_SERVER");
    expect(result.stderr).toContain("WS_STT_SERVER");
  });
  it("allows isolated API development without STT when runtime is disabled", () => {
    expect(checkEnvironment("false", "", "").status).toBe(0);
  });
  it("accepts the original HTTP WebSocket URL from Meetha legacy", () => {
    expect(
      checkEnvironment("true", "http://stt:8080", "http://ws_stag:8080").status,
    ).toBe(0);
  });
});

describe("transcript API", () => {
  it("returns persisted segments in time order without referencing missing seq column", async () => {
    const {
      eventTranscripts,
    } = require("../dist/model/transcript/transcript.operations");
    const transcript = { id: 17, transcript: "Recorded", start: 1.5 };
    let sql = "";
    let response: any;
    const req = {
      query: { eventId: "42" },
      user: { roleId: 2, username: "owner" },
      pool: () => ({
        query(query: string, params: any[], callback: Function) {
          sql = query;
          expect(params).toEqual(["42", "owner"]);
          callback(null, { rows: [transcript] });
        },
      }),
    };
    await eventTranscripts(req, {
      send(data: any) {
        response = data;
      },
    });
    expect(sql).toContain("order by et.start, et.id");
    expect(sql).not.toMatch(/\bseq\b/i);
    expect(response).toEqual({
      success: true,
      message: "Success",
      data: [transcript],
    });
  });
});

describe("restart import", () => {
  it("clears persistent error state and cancels the old in-memory task", async () => {
    const { restartImport } = require("../dist/model/import/import.operations");
    let cancelled: number | undefined;
    let queryParameters: any[] = [];
    let response: any;
    await restartImport(
      {
        body: { id: 42 },
        user: { roleId: 2, username: "owner" },
        core: {
          cancelEventUploadWithEventId(id: number) {
            cancelled = id;
          },
        },
        pool: () => ({
          async query(sql: string, params: any[]) {
            if (
              sql.startsWith("SELECT id, uploading, import_message FROM event")
            )
              return { rows: [{ id: 42, uploading: 3 }] };
            queryParameters = params;
            return { rowCount: 1 };
          },
        }),
      },
      {
        send(value: any) {
          response = value;
        },
      },
    );
    expect(queryParameters).toEqual([
      0,
      0,
      0,
      42,
      "Billing reconciliation required",
    ]);
    expect(cancelled).toBe(42);
    expect(response.success).toBe(true);
  });
});
