import { it as test } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
function setup({
  rows = [{ id: 42, language: "id-ID" }],
  upstreamError,
  locked = true,
  transcripts = [],
} = {}) {
  const calls = [];
  const client = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return {
        rows: sql.includes("event_transcript") ? transcripts : [{ locked }],
      };
    },
    release: () => calls.push("release"),
  };
  const pool = {
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows };
    },
    connect: async () => client,
  };
  const axios = {
    get: async (...args) => {
      calls.push(args);
      if (upstreamError) throw upstreamError;
      return { data: { event_id: 42, warnings: [] } };
    },
  };
  axios.post = async (...args) => {
    calls.push({ post: args });
    if (upstreamError) throw upstreamError;
    return { data: { event_id: 42, version: 1, warnings: [] } };
  };
  const dependencies = {
    axios,
    fs: {
      promises: {
        mkdir: async () => {},
        writeFile: async (file, content) =>
          calls.push({ file, entries: JSON.parse(content) }),
      },
    },
    path,
    "../../common/config/config.js": {
      services: { llm: { api: "http://ai.invalid/" } },
      paths: { summary: "/private/tmp/meetha-speech-test" },
    },
    "../utils/catchAsync": (fn) => fn,
  };
  const sandbox = {
    require: (name) => dependencies[name],
    module: { exports: {} },
    __dirname: process.cwd(),
  };
  vm.runInNewContext(
    fs.readFileSync(
      path.join(process.cwd(), "src/model/speech/speech.operations.js"),
      "utf8",
    ),
    sandbox,
  );
  const req = {
    params: { eventId: "42" },
    query: {},
    user: { roleId: 2, username: "owner" },
    pool: () => pool,
  };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  return { controller: sandbox.module.exports, req, res, calls };
}
test("invalid event ID never reaches database or AI", async () => {
  const x = setup();
  x.req.params.eventId = "42 OR 1=1";
  await x.controller.get(x.req, x.res);
  assert.equal(x.res.statusCode, 400);
  assert.equal(x.calls.length, 0);
});
test("unowned event does not expose AI results", async () => {
  const x = setup({ rows: [] });
  await x.controller.get(x.req, x.res);
  assert.equal(x.res.statusCode, 404);
  assert.equal(x.calls.length, 1);
  assert.deepEqual(Array.from(x.calls[0].params), [42, false, "owner"]);
});
test("missing or nonnumeric role uses ownership without passing NaN to PostgreSQL", async () => {
  for (const role of [undefined, "user", null]) {
    const x = setup({ rows: [] });
    x.req.user.roleId = role;
    await x.controller.check(x.req, x.res);
    assert.equal(x.res.statusCode, 404);
    assert.deepEqual(Array.from(x.calls[0].params), [42, false, "owner"]);
  }
});
test("administrator role supports numeric and string IDs", async () => {
  for (const role of [1, "1"]) {
    const x = setup();
    x.req.user.roleId = role;
    await x.controller.get(x.req, x.res);
    assert.equal(x.calls[0].params[1], true);
    assert.equal(x.res.statusCode, 200);
  }
});
test("clean checked event remains a successful result", async () => {
  const x = setup();
  await x.controller.get(x.req, x.res);
  assert.equal(x.res.statusCode, 200);
  assert.equal(x.res.body.warnings.length, 0);
  assert.equal(x.calls[1][0], "http://ai.invalid/inappropriate-speech/42");
});
test("missing stored result maps to not checked", async () => {
  const x = setup({ upstreamError: { response: { status: 404 } } });
  await x.controller.get(x.req, x.res);
  assert.equal(x.res.statusCode, 404);
});
test("concurrent check is rejected and connection released", async () => {
  const x = setup({ locked: false });
  await x.controller.check(x.req, x.res);
  assert.equal(x.res.statusCode, 409);
  assert.equal(x.calls.at(-1), "release");
});
test("upstream failure returns controlled error without leaking server details", async () => {
  const x = setup({
    upstreamError: { response: { status: 500, data: "private detail" } },
  });
  await x.controller.get(x.req, x.res);
  assert.equal(x.res.statusCode, 502);
  assert.ok(!JSON.stringify(x.res.body).includes("private detail"));
});

test("check writes ordered transcript snapshot and forwards server-derived path and language", async () => {
  const x = setup({
    transcripts: [{ attendance: "Rina", start: "18.5", transcript: "Halo" }],
  });
  x.req.body = { path: "../../private", event_id: 999, lang: "invalid" };
  await x.controller.check(x.req, x.res);
  assert.equal(x.res.statusCode, 200);
  const post = x.calls.find((c) => c.post).post;
  assert.equal(post[0], "http://ai.invalid/inappropriate-speech");
  assert.equal(post[1].event_id, 42);
  assert.equal(post[1].path, "meetha/summary/inappropriate_42.txt");
  assert.equal(post[1].lang, "id-ID");
  assert.equal(x.calls.find((c) => c.entries).entries[0].second, 18.5);
  assert.ok(x.calls.some((c) => c.sql && c.sql.includes("pg_advisory_unlock")));
  assert.equal(x.calls.at(-1), "release");
});
test("empty transcript does not call model and releases the lock", async () => {
  const x = setup();
  await x.controller.check(x.req, x.res);
  assert.equal(x.res.statusCode, 422);
  assert.ok(!x.calls.some((c) => c.post));
  assert.equal(x.calls.at(-1), "release");
});

test("quotes and newlines survive snapshot serialization for exact highlighting", async () => {
  const text = 'Dia bilang "jangan"\nke saya.';
  const x = setup({
    transcripts: [{ attendance: "Rina", start: 1, transcript: text }],
  });
  await x.controller.check(x.req, x.res);
  assert.equal(x.calls.find((c) => c.entries).entries[0].text, text);
});
test("AI missing transcript file is a file error, not a connection error", async () => {
  const x = setup({
    transcripts: [{ attendance: "Rina", start: 1, transcript: "Halo" }],
    upstreamError: { response: { status: 404 } },
  });
  await x.controller.check(x.req, x.res);
  assert.equal(x.res.statusCode, 422);
  assert.match(x.res.body.message, /mount/);
});
test("not checked is distinguishable from an inaccessible event", async () => {
  const x = setup({ upstreamError: { response: { status: 404 } } });
  await x.controller.get(x.req, x.res);
  assert.equal(x.res.body.code, "NOT_CHECKED");
  const inaccessible = setup({ rows: [] });
  await inaccessible.controller.get(inaccessible.req, inaccessible.res);
  assert.notEqual(inaccessible.res.body.code, "NOT_CHECKED");
});
test("invalid segment time is rejected before calling AI", async () => {
  const x = setup({
    transcripts: [{ attendance: "Rina", start: "bad", transcript: "Halo" }],
  });
  await x.controller.check(x.req, x.res);
  assert.equal(x.res.statusCode, 422);
  assert.ok(!x.calls.some((c) => c.post));
});
