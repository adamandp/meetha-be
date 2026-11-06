import { beforeAll, afterAll, it, expect, describe } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import { Pool } from "pg";
import request from "supertest";
const require = createRequire(import.meta.url);
const testUrl = process.env.TEST_DATABASE_URL;
describe.skipIf(!testUrl)("existing PostgreSQL schema integration", () => {
  let app: any, pool: Pool;
  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !url.pathname.endsWith("_test")
    )
      throw new Error(
        "Integration fixture requires a local database with a _test suffix",
      );
    process.env.DATABASE_URL = testUrl;
    pool = new Pool({ connectionString: testUrl });
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public");
    await pool.query(
      fs.readFileSync("test/fixtures/existing-schema.sql", "utf8"),
    );
    await pool.query(
      `INSERT INTO role (id,name,priority,event_role,status,createdby,updatedby) VALUES (1,'Admin',0,0,1,'test','test'),(2,'User',0,0,1,'test','test')`,
    );
    await pool.query("SELECT setval('role_id_seq',2)");
    app = await require("../dist/main").createApplication();
  });
  afterAll(async () => {
    await app?.close();
    await pool?.end();
  });
  it("registers, persists bcrypt password and logs in without schema changes", async () => {
    const res = await request(app.getHttpServer())
      .post("/v1/auth/register")
      .send({
        username: "member",
        fullname: "Member",
        email: "member@example.test",
        password: "password1",
        phone_number: "08123",
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const stored = await pool.query(
      'SELECT username,role_id,password FROM "user" WHERE username=$1',
      ["member"],
    );
    expect(stored.rows[0].role_id).toBe("2");
    expect(stored.rows[0].password).toMatch(/^\$2/);
    const login = await request(app.getHttpServer())
      .post("/v1/auth/rapi_login")
      .send({ username: "member", password: "password1" });
    expect(login.status).toBe(200);
    expect(login.body.user.username).toBe("member");
    expect(login.body.user.is_superuser).toBe(false);
    expect(login.body.user.password).toBeUndefined();
  });
  it("lists users with flattened role fields and no BigInt JSON errors", async () => {
    const auth = require("../dist/common/auth/token");
    const token = auth.generateToken(
      { userId: 1, roleId: 1, username: "admin" },
      auth.generateExpires(24),
    );
    const res = await request(app.getHttpServer())
      .get("/v1/users?page=1&limit=10")
      .set("Authorization", "Bearer " + token);
    expect(res.status).toBe(200);
    expect(res.body.users.count).toBe(1);
    expect(res.body.users.rows[0]["role.name"]).toBe("User");
  });
  it("creates role with required existing database fields", async () => {
    const auth = require("../dist/common/auth/token");
    const token = auth.generateToken(
      { userId: 1, roleId: 1, username: "admin" },
      auth.generateExpires(24),
    );
    const res = await request(app.getHttpServer())
      .post("/v1/roles")
      .set("Authorization", "Bearer " + token)
      .send({ name: "Reviewer" });
    expect(res.status).toBe(200);
    expect(res.body.role.name).toBe("Reviewer");
  });
});
