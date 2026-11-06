function developmentTransport() {
  if ((process.env.NODE_ENV || "development") !== "development") return undefined;

  return {
    target: "pino-pretty",
    options: {
      colorize: Boolean(process.stdout.isTTY),
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  };
}

module.exports = { developmentTransport };
