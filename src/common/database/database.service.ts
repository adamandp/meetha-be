import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { Pool, PoolConfig } from "pg";
import config = require("../config/config");
import { decrypt } from "../config/crypto";
export function databaseOptions(): PoolConfig {
  if (process.env.DATABASE_URL)
    return {
      connectionString: process.env.DATABASE_URL,
      max: config.sqlDB.pool.max,
    };
  const password = config.sqlDB.password;
  return {
    host: config.sqlDB.host,
    port: config.sqlDB.port,
    user: config.sqlDB.user,
    database: config.sqlDB.database,
    password: password && password.includes(":") ? decrypt(password) : password,
    max: config.sqlDB.pool.max,
    idleTimeoutMillis: config.sqlDB.pool.idle,
  };
}
@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  readonly pool = new Pool(databaseOptions());
  constructor() {
    this.pool.on("error", (error) =>
      require("../app-logger/logger").error(
        { err: error },
        "PostgreSQL pool error",
      ),
    );
  }
  async onApplicationShutdown() {
    await this.pool.end();
  }
}
