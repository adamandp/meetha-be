const pino = require("pino");
const { developmentTransport } = require("./transport");
module.exports = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: developmentTransport(),
  redact: {
    paths: [
      "password",
      "token",
      "api_key",
      "secret",
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "*.password",
      "*.token",
      "*.api_key",
      "*.serverKey",
      "*.clientKey",
    ],
    censor: "[REDACTED]",
  },
});
