import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function response() {
  let statusCode = 200;
  let body: any;
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    send(value: any) {
      body = value;
      return res;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
  };
  return res;
}

describe("legacy import API contract and access control", () => {
  it("keeps the valid restart response and refuses a mismatched owner", async () => {
    const { restartImport } = require("../dist/model/import/import.operations");
    let updated = false;
    const req = {
      body: { id: 71 },
      user: { roleId: 2, username: "alice" },
      pool: () => ({
        async query(sql: string, params: any[]) {
          if (sql.startsWith("SELECT")) {
            expect(params).toEqual([71, "alice"]);
            return { rows: [] };
          }
          updated = true;
          return { rowCount: 1 };
        },
      }),
    };
    const res = response();
    await restartImport(req, res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, message: "Event not found" });
    expect(updated).toBe(false);
  });

  it("does not restart an event that might already have been billed", async () => {
    const { restartImport } = require("../dist/model/import/import.operations");
    let updates = 0;
    const req = {
      body: { id: 71 },
      user: { roleId: 1 },
      pool: () => ({
        async query(sql: string) {
          if (sql.startsWith("SELECT"))
            return {
              rows: [
                {
                  id: 71,
                  uploading: 3,
                  import_message: "Billing reconciliation required",
                },
              ],
            };
          updates++;
          return { rowCount: 1 };
        },
      }),
    };
    const res = response();
    await restartImport(req, res);
    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(updates).toBe(0);
  });

  it("never calls STT reset for a missing event ID", async () => {
    const { resetImport } = require("../dist/model/import/import.operations");
    let calls = 0;
    const res = response();
    await resetImport(
      {
        body: {},
        user: { roleId: 1 },
        pool: () => ({
          query: () => {
            throw new Error("unexpected query");
          },
        }),
        core: {
          resetEventProcessor: () => {
            calls++;
          },
        },
      },
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(calls).toBe(0);
  });

  it("rejects invalid recording uploads before writing an event", async () => {
    const {
      eventsFileImportv2,
    } = require("../dist/model/import/import.operations");
    const res = response();
    await eventsFileImportv2(
      { body: { description: "Meeting" }, user: { roleId: 1 } },
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Recording file is required",
    });
  });

  it("keeps non-admin ownership derived from the JWT rather than form fields", async () => {
    const {
      eventsFileImportv2,
    } = require("../dist/model/import/import.operations");
    let inserts = 0;
    const res = response();
    await eventsFileImportv2(
      {
        file: { filename: "recording.wav" },
        body: { description: "Meeting", username: "someone-else" },
        user: { roleId: 2, userId: 7, username: "alice" },
        pool: () => ({
          async query(sql: string, params: any[]) {
            if (sql.startsWith("SELECT")) {
              expect(params).toEqual([7]);
              return { rows: [{ username: "alice", user_uuid: "uuid-7" }] };
            }
            inserts++;
          },
        }),
      },
      res,
    );
    expect(res.statusCode).toBe(403);
    expect(inserts).toBe(0);
  });

  it("preserves a valid legacy upload response and pending notification", async () => {
    const {
      eventsFileImportv2,
    } = require("../dist/model/import/import.operations");
    let savedParams: any[] = [];
    let pending = 0;
    const res = response();
    await eventsFileImportv2(
      {
        file: { filename: "recording.wav" },
        body: {
          description: "Weekly sync",
          subject: "Team",
          duration: 240,
          language: "id",
          username: "alice",
          user_uuid: "uuid-7",
          third_party_key_1: "billing-key",
        },
        user: { roleId: 2, userId: 7, username: "alice" },
        pool: () => ({
          query(sql: string, params: any[], callback?: Function) {
            if (sql.startsWith("SELECT"))
              return Promise.resolve({
                rows: [{ username: "alice", user_uuid: "uuid-7" }],
              });
            savedParams = params;
            callback?.(null, { rows: [{ id: 42 }] });
          },
        }),
        core: {
          notifyEventAsPending(id: number) {
            pending = id;
          },
        },
      },
      res,
    );
    expect(savedParams[3]).toBe("recording.wav");
    expect(savedParams[18]).toBe("alice");
    expect(savedParams[19]).toBe("uuid-7");
    expect(pending).toBe(42);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      message: "Server Notification! Success adding import event to database.",
      data: {
        event_id: 42,
        description: "Weekly sync",
        username: "alice",
        user_uuid: "uuid-7",
        import_file_path: "recording.wav",
      },
    });
  });

  it("prevents resetting an already completed recording", async () => {
    const { resetImport } = require("../dist/model/import/import.operations");
    let remoteReset = false;
    const res = response();
    await resetImport(
      {
        body: { id: 42 },
        user: { roleId: 1 },
        pool: () => ({
          query: async () => ({
            rows: [{ id: 42, uploading: 2, import_message: "Finished" }],
          }),
        }),
        core: {
          resetEventProcessor() {
            remoteReset = true;
          },
        },
      },
      res,
    );
    expect(res.statusCode).toBe(409);
    expect(remoteReset).toBe(false);
  });
});

describe("legacy export input", () => {
  it("rejects SQL injection without issuing a query", async () => {
    const {
      exportEventTranscripts,
    } = require("../dist/model/export/export.operations");
    let queries = 0;
    const res = response();
    await exportEventTranscripts(
      {
        query: { eventId: "3 OR 1=1" },
        user: { roleId: 1 },
        pool: () => ({
          query() {
            queries++;
          },
        }),
      },
      res,
    );
    expect(res.statusCode).toBe(400);
    expect(queries).toBe(0);
  });

  it("keeps a valid export lookup scoped to its owner", async () => {
    const {
      exportEventTranscripts,
    } = require("../dist/model/export/export.operations");
    let statement = "";
    let values: any[] = [];
    const res = response();
    await exportEventTranscripts(
      {
        query: { eventId: "71" },
        user: { roleId: 2, username: "alice" },
        pool: () => ({
          query(sql: string, params: any[], callback: Function) {
            statement = sql;
            values = params;
            callback(null, { rows: [] });
          },
        }),
      },
      res,
    );
    expect(statement).toContain("e.id = $1 AND e.datausername = $2");
    expect(values).toEqual([71, "alice"]);
    expect(res.body).toEqual({ success: false, message: "Event Not found" });
  });
});
