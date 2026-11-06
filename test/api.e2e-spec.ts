import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { createRequire } from "node:module";
import request from "supertest";
const require = createRequire(import.meta.url);
const { createApplication } = require("../dist/main");
const { RuntimeService } = require("../dist/common/runtime/runtime.service");
const { generateToken, generateExpires } = require("../dist/common/auth/token");
const axios = require("axios");
let app: any, runtime: any, query: any;
const headers = () => ({
  Authorization:
    "Bearer " +
    generateToken(
      { userId: 1, roleId: 1, username: "owner" },
      generateExpires(24),
    ),
});
beforeAll(async () => {
  app = await createApplication();
  runtime = app.get(RuntimeService);
});
afterAll(async () => {
  await app?.close();
});
beforeEach(() => {
  vi.restoreAllMocks();
  query = vi
    .spyOn(runtime.database.pool, "query")
    .mockImplementation((_sql: any, ...args: any[]) => {
      const cb = args.at(-1);
      const result = { rows: [], rowCount: 0 };
      if (typeof cb === "function") {
        cb(null, result);
        return;
      }
      return Promise.resolve(result);
    });
});
describe("Nest HTTP compatibility", () => {
  it("rejects protected endpoint without token", async () => {
    const res = await request(app.getHttpServer()).get("/v1/globals/events");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: "Invalid token" });
    expect(query).not.toHaveBeenCalled();
  });
  it("retains events response and trailing slash", async () => {
    const res = await request(app.getHttpServer())
      .get("/v1/globals/events/")
      .set(headers());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: "Success", data: [] });
    expect(query).toHaveBeenCalled();
  });
  it("retains ownership rejection before querying", async () => {
    const token = generateToken(
      { userId: 2, roleId: 2, username: "other" },
      generateExpires(24),
    );
    const res = await request(app.getHttpServer())
      .get("/v1/globals/events?ufa=true&username=owner")
      .set("Authorization", "Bearer " + token);
    expect(res.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
  });
  it("validates login before accessing DB", async () => {
    const res = await request(app.getHttpServer())
      .post("/v1/auth/login")
      .send({ username: "owner" });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
  it("retains rapi login/token payload using Prisma repository", async () => {
    const bcrypt = require("bcrypt");
    const prisma = {
      user: {
        findFirst: async () => ({
          id: 1,
          role_id: 1n,
          username: "owner",
          fullname: "Owner",
          password: await bcrypt.hash("password1", 4),
          user_uuid: "uuid",
          createdon: "2024-01-01",
        }),
      },
      role: { findUnique: async () => ({ id: 1, name: "admin" }) },
    };
    require("../dist/model/user/user.repository").configure(prisma);
    const res = await request(app.getHttpServer())
      .post("/v1/auth/rapi_login")
      .send({ username: "owner", password: "password1" });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("owner");
    expect(res.body.user.is_superuser).toBe(true);
    expect(res.body.tokens.access.token).toBeTypeOf("string");
    expect(res.body.billing.credit).toBe(999999999);
  });
  it("preserves billing upstream URL and response", async () => {
    const upstream = vi
      .spyOn(axios, "get")
      .mockResolvedValue({ data: { status_code: 200, data: { credit: 100 } } });
    const res = await request(app.getHttpServer())
      .get("/v1/globals/getUserBillingInfo?user_uuid=example")
      .set(headers());
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(upstream).toHaveBeenCalled();
  });
  it("rejects invalid speech ID before DB/AI", async () => {
    const res = await request(app.getHttpServer())
      .get("/v1/globals/events/nope/inappropriate-speech")
      .set(headers());
    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
  it("enforces role access", async () => {
    const token = generateToken(
      { userId: 2, roleId: 2, username: "other" },
      generateExpires(24),
    );
    const res = await request(app.getHttpServer())
      .get("/v1/roles")
      .set("Authorization", "Bearer " + token);
    expect(res.status).toBe(403);
  });
  it("keeps missing event response", async () => {
    const res = await request(app.getHttpServer())
      .get("/v1/globals/detailEvents")
      .set(headers());
    expect(res.body).toEqual({
      success: false,
      message: "ID is Required",
      data: [],
    });
  });
  it("renews near-expiry access token in Authorization header", async () => {
    const token = generateToken(
      { userId: 1, roleId: 1, username: "owner" },
      generateExpires(0.5),
    );
    const res = await request(app.getHttpServer())
      .get("/v1/globals/settings")
      .set("Authorization", "Bearer " + token);
    expect(res.headers.authorization).toMatch(/^Bearer /);
  });
});
