require("dotenv/config");
import { z } from "zod";
const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    JWT_SECRET: z.string().min(1),
    JWT_ACCESS_EXPIRATION_MINUTES: z.coerce.number().positive().default(30),
    JWT_REFRESH_EXPIRATION_DAYS: z.coerce.number().positive().default(30),
    COOKIE_EXPIRATION_HOURS: z.coerce.number().positive().default(24),
    SQL_DIALECT: z.literal("postgres").default("postgres"),
    SQL_MAX_POOL: z.coerce.number().int().min(1).default(10),
    SQL_MIN_POOL: z.coerce.number().int().min(0).default(0),
    SQL_IDLE: z.coerce.number().int().min(0).default(10000),
    SQL_PORT: z.coerce.number().int().default(5432),
    RUNTIME_ENABLED: z.enum(["true", "false"]).default("true"),
    API_ENV: z.string().optional(),
    API_LOGO_FILENAME: z.string().optional(),
    BACKEND_URL: z.string().optional(),
    BILLING_MEETHA_APP_ID: z.string().optional(),
    BILLING_SERVICE_BASE_URL: z.string().optional(),
    DATA_ROOT: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    EMAIL_SERVER: z.string().optional(),
    EVENTS_DIR: z.string().optional(),
    FIRST_REGISTER_CREDIT_AMOUNT: z.string().optional(),
    FIRST_REGISTER_CREDIT_IS_ACTIVE: z.string().optional(),
    FRONTEND_URL: z.string().optional(),
    LLM_SERVER: z.string().optional(),
    PER_MINUTE_RATE: z.string().optional(),
    PG_MIDTRANS_CLIENT_KEY: z.string().optional(),
    PG_MIDTRANS_IS_ACTIVE: z.string().optional(),
    PG_MIDTRANS_IS_PRODUCTION: z.string().optional(),
    PG_MIDTRANS_SERVER_KEY: z.string().optional(),
    REDIS_SERVER: z.string().optional(),
    SMTP_HOST: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USERNAME: z.string().optional(),
    SQL_DATABASE_NAME: z.string().optional(),
    SQL_HOST: z.string().optional(),
    SQL_PASSWORD: z.string().optional(),
    SQL_USERNAME: z.string().optional(),
    SSO_SERVICE_BASE_URL: z.string().optional(),
    STATIC_DIR: z.string().optional(),
    STT_SERVER: z.string().optional(),
    SUMMARY_DIR: z.string().optional(),
    UPLOAD_DIR: z.string().optional(),
    USER_SERVICE_BASE_URL: z.string().optional(),
    WS_STT_SERVER: z.string().optional(),
    ZOOM_API_KEY: z.string().optional(),
    ZOOM_API_SECRET: z.string().optional(),
    ZOOM_S2S_ACCOUNT_ID: z.string().optional(),
    ZOOM_S2S_API_KEY: z.string().optional(),
    ZOOM_S2S_API_SECRET: z.string().optional(),
  })
  .passthrough()
  .superRefine((env, context) => {
    // The HTTP API can run alone for local development, but an enabled
    // import worker must never start without a usable STT endpoint.
    if (env.RUNTIME_ENABLED === "false") return;
    for (const [key, protocols] of [
      ["STT_SERVER", ["http:", "https:"]],
      // The legacy `websocket` client also performs Upgrade handshakes with
      // http(s) URLs; don't reject existing office configuration on startup.
      ["WS_STT_SERVER", ["http:", "https:", "ws:", "wss:"]],
      ["BILLING_SERVICE_BASE_URL", ["http:", "https:"]],
    ] as const) {
      const value = env[key];
      let valid = false;
      try {
        valid =
          Boolean(value?.trim()) &&
          protocols.some((protocol) => new URL(value!).protocol === protocol);
      } catch {
        // Invalid URL; report it with the setting name below.
      }
      if (!valid) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: `A valid ${protocols.join(" or ")} URL is required when RUNTIME_ENABLED=true`,
        });
      }
    }
    if (!env.REDIS_SERVER?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["REDIS_SERVER"],
        message: "Required when RUNTIME_ENABLED=true",
      });
    }
    if (!env.BILLING_MEETHA_APP_ID?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["BILLING_MEETHA_APP_ID"],
        message: "Required when RUNTIME_ENABLED=true",
      });
    }
    if (
      !Number.isFinite(Number(env.PER_MINUTE_RATE)) ||
      Number(env.PER_MINUTE_RATE) <= 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["PER_MINUTE_RATE"],
        message: "Must be a positive number when RUNTIME_ENABLED=true",
      });
    }
  });
const parsed = schema.safeParse(process.env);
if (!parsed.success)
  throw new Error(
    "Invalid environment: " +
      parsed.error.issues
        .map((i) => i.path.join(".") + ": " + i.message)
        .join("; "),
  );
export const environment = parsed.data;
