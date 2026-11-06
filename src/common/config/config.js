const path = require("node:path");
const { environment } = require("./environment");
const envVars = environment;
const root = path.resolve(
  envVars.DATA_ROOT || path.join(process.cwd(), "..", "..", "meetha"),
);
const paths = {
  uploads: path.resolve(envVars.UPLOAD_DIR || path.join(root, "file_uploaded")),
  events: path.resolve(envVars.EVENTS_DIR || path.join(root, "events")),
  summary: path.resolve(envVars.SUMMARY_DIR || path.join(root, "summary")),
  static: path.resolve(
    envVars.STATIC_DIR || path.join(process.cwd(), "static"),
  ),
};

const config = {
  paths,
  env: envVars.NODE_ENV,
  using_user_service: true,
  using_billing_service: true,
  app_env: envVars.API_ENV,
  fe_url: envVars.FRONTEND_URL,
  port: envVars.PORT,
  zoomS2SAccountID: envVars.ZOOM_S2S_ACCOUNT_ID,
  zoomS2SApiKey: envVars.ZOOM_S2S_API_KEY,
  zoomS2SApiSecret: envVars.ZOOM_S2S_API_SECRET,
  zoomApiKey: envVars.ZOOM_API_KEY,
  zoomApiSecret: envVars.ZOOM_API_SECRET,
  zoomLeaveUrl: envVars.FRONTEND_URL,
  zoomBotName: "Meetha",
  zoomRoleId: 0, // 0 for participant, 1 for host
  zoomBaseURL: "https://api.zoom.us",
  zoomOAuthURL: "https://zoom.us/oauth/token",
  audioCapturePath: "/path/to/save/audio/files",
  services: {
    email: {
      base_url: envVars.EMAIL_SERVER,
    },
    redis: {
      server_url: envVars.REDIS_SERVER,
    },
    user: {
      base_url: envVars.USER_SERVICE_BASE_URL,
      register_endpoint: "/users/create/",
      license_endpoint: "/account/api/get_license",
      user_by_uuid_endpoint: "/users/uuid/",
    },
    sso: {
      base_url: envVars.SSO_SERVICE_BASE_URL,
      login_endpoint: "/api/auth/login",
    },
    stt: {
      api: envVars.STT_SERVER,
      ws: envVars.WS_STT_SERVER,
      import_endpoint: "/meetha",
      refresh_endpoint: "/refresh",
      reset_endpoint: "/reset",
    },
    llm: {
      api: envVars.LLM_SERVER,
      delete_endpoint: "/delete-file/",
      assign_endpoint: "/assign-file/",
      summary_endpoint: "/summary/",
      chat_endpoint: "/chat/",
      create_article_endpoint: "/create-article",
      get_article_endpoint: "/get-article/",
    },
    billing: {
      base_url: envVars.BILLING_SERVICE_BASE_URL,
      meetha_app_id: envVars.BILLING_MEETHA_APP_ID,
      create_user_endpoint: "/users/create/",
      user_endpoint: "/users/",
      credit_endpoint: "/user_credit/uuid/",
      create_topup_endpoint: "/topup/create/",
      success_topup_endpoint: "/topup/status/success/",
      cancel_topup_endpoint: "/topup/status/canceled/",
      expire_topup_endpoint: "/topup/status/expired/",
      topup_list_endpoint: "/topup/list/",
      snap_topup_endpoint: "/topup/update/token/",
      activate_app_user_endpoint: "/user_app/create/",
      create_billing_log_endpoint: "/billing_log/create/",
      success_billing_log_endpoint: "/billing_log/update_status/success/",
      billing_log_endpoint: "/billing_log/list/",
    },
    pricing: {
      staticPerMinutes: envVars.PER_MINUTE_RATE,
      firstRegisterBonus: {
        active: envVars.FIRST_REGISTER_CREDIT_IS_ACTIVE,
        amount: envVars.FIRST_REGISTER_CREDIT_AMOUNT,
      },
    },
    payment_method: {
      midtrans: {
        active: envVars.PG_MIDTRANS_IS_ACTIVE,
        production: envVars.PG_MIDTRANS_IS_PRODUCTION,
        serverKey: envVars.PG_MIDTRANS_SERVER_KEY,
        clientKey: envVars.PG_MIDTRANS_CLIENT_KEY,
      },
    },
  },
  static: {
    base: "static",
    images: "images",
    logo_filename: envVars.API_LOGO_FILENAME,
  },
  meetha: {
    frontend_url: envVars.FRONTEND_URL,
    backend_url: envVars.BACKEND_URL,
  },
  events: {
    directory: "events",
  },
  pagination: {
    limit: 10,
    page: 1,
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: 10,
  },
  cookie: {
    cookieExpirationHours: envVars.COOKIE_EXPIRATION_HOURS,
  },
  sqlDB: {
    user: envVars.SQL_USERNAME,
    host: envVars.SQL_HOST,
    database: envVars.SQL_DATABASE_NAME,
    password: envVars.SQL_PASSWORD,
    port: envVars.SQL_PORT,
    dialect: envVars.SQL_DIALECT,
    pool: {
      max: envVars.SQL_MAX_POOL,
      min: envVars.SQL_MIN_POOL,
      idle: envVars.SQL_IDLE,
    },
    define: {
      timestamps: false,

      freezeTableName: true,

      underscored: true,
    },
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  asr_model: {
    url: "https://abc.cakra.ai/stt-model/getLatest/id-ID",
    latest_model_url: "https://abc.cakra.ai/stt-model/getLatest/id-ID",
    model_password:
      "8d1d82eb2aaf06a6339e2a6cd271777a35b33bc31cf713b0eed3f5a1ca841fb2beb57156ed7637d8fd1fc6de876d79b84cf6334a1a3e55902168d0100ed384a9",
  },
  engine: {},
};

module.exports = config;
