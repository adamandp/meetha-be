import { it, expect } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const require = createRequire(import.meta.url);
it("generates DOCX and retains output file/database path contract", async () => {
  const config = require("../dist/common/config/config");
  const destination = fs.mkdtempSync(
    path.join(os.tmpdir(), "meetha-export-test-"),
  );
  config.paths.events = destination;
  config.static.logo_filename = "meetha-logo-small.png";
  const exportApi = require("../dist/model/export/export.operations");
  const logger = require("../dist/common/app-logger/logger");
  const originalError = logger.error;
  const loggedErrors: any[] = [];
  logger.error = (...args: any[]) => loggedErrors.push(args);
  const calls: any[] = [];
  const req = {
    query: { format: "docx" },
    pool: () => ({
      query: async (...args: any[]) => {
        calls.push(args);
        return { rows: [] };
      },
    }),
  };
  const res: any = {
    headers: {},
    code: 200,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(c: number) {
      this.code = c;
      return this;
    },
    send(value: any) {
      this.body = value;
      return this;
    },
  };
  try {
    await exportApi.exportTranscriptToWord(
      42,
      {
        timestart: "2024-01-01T09:00:00Z",
        subject: "Test meeting",
        description: "Meeting",
        long_summary: null,
      },
      [],
      [],
      res,
      req,
    );
    expect(res.code, JSON.stringify(loggedErrors)).toBe(200);
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.subarray(0, 2).toString()).toBe("PK");
    expect(res.headers["Content-Type"]).toContain("wordprocessingml");
    expect(calls[0][0]).toContain("UPDATE event SET real_transcript_path");
    expect(fs.existsSync(calls[0][1][0])).toBe(true);
  } finally {
    logger.error = originalError;
    fs.rmSync(destination, { recursive: true, force: true });
  }
});
