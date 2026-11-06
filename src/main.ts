import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { RelayService } from "./common/runtime/relay.service";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Logger } from "nestjs-pino";
import { mkdir } from "node:fs/promises";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import proxy from "express-http-proxy";
import { rateLimit } from "express-rate-limit";
import { AppModule } from "./app.module";
import { RuntimeService } from "./common/runtime/runtime.service";
import config = require("./common/config/config");
export async function createApplication() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.set("query parser", "extended");
  app.enableCors();
  app.use(helmet(), compression(), cookieParser());
  const runtime = app.get(RuntimeService);
  await Promise.all(
    [config.paths.uploads, config.paths.events, config.paths.summary].map(
      (dir) => mkdir(dir, { recursive: true }),
    ),
  );
  app.use("/static", express.static(config.paths.static));
  app.use("/v1/audio", express.static(config.paths.uploads, {
    setHeaders: (res) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }));
  app.use(
    "/v1/mom",
    async (req: any, res: any, next: any) => {
      const auth = require("./common/auth/token");
      const request = {
        headers: {
          authorization:
            req.headers.authorization ||
            (req.query.token ? "Bearer " + req.query.token : undefined),
        },
      };
      const result = await auth.verifyToken(request);
      if (!result.ok)
        return res
          .status(401)
          .send({ success: false, message: "Invalid token" });
      next();
    },
    express.static(config.paths.events),
  );
  app.use((req: any, _res: any, next: any) => {
    req.postgres = runtime.database.pool;
    req.pool = () => runtime.database.pool;
    req.core = runtime.core;
    req.zoomBot = runtime.zoomBot;
    req.midtrans_snap = runtime.midtrans;
    next();
  });
  if (config.env === "production")
    app.use(
      "/v1/auth",
      rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 20,
        skipSuccessfulRequests: true,
      }),
    );
  if (config.services.stt.api) app.use("/stt", proxy(config.services.stt.api));
  if (config.services.stt.ws) app.use("/ws", proxy(config.services.stt.ws));
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("Meetha API")
      .setVersion("1.0")
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup("v1/docs", app, document);
  await app.init();
  return app;
}
async function bootstrap() {
  const app = await createApplication();
  await app.get(RuntimeService).start(app.getHttpServer());
  app.get(RelayService).start();
  await app.listen(config.port);
}
if (require.main === module)
  bootstrap().catch((error) => {
    require("./common/app-logger/logger").fatal(
      { err: error },
      "Startup failed",
    );
    process.exitCode = 1;
  });
