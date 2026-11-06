const logger = require("./logger");
const sensitive =
  /password|secret|authorization|cookie|api.?key|access.?token|refresh.?token|serverKey|clientKey/i;
function clean(value, seen = new WeakSet()) {
  if (value instanceof Error)
    return { name: value.name, message: value.message, stack: value.stack };
  if (!value || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => clean(v, seen));
  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => [
      key,
      sensitive.test(key) ? "[REDACTED]" : clean(v, seen),
    ]),
  );
}
const write =
  (level) =>
  (...args) =>
    logger[level](
      { details: args.map((v) => clean(v)) },
      typeof args[0] === "string" ? args[0] : "Application event",
    );
module.exports = {
  log: write("info"),
  info: write("info"),
  warn: write("warn"),
  error: write("error"),
  err: write("error"),
  debug: write("debug"),
};
