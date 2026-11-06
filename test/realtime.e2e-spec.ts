import { it, expect } from "vitest";
import { createRequire } from "node:module";
import http from "node:http";
import { io } from "socket.io-client";
const require = createRequire(import.meta.url);
it.skipIf(!process.env.TEST_REDIS_URL)(
  "preserves Socket.IO pending event and closes Redis/timers",
  async () => {
    const config = require("../dist/common/config/config");
    config.services.redis.server_url = process.env.TEST_REDIS_URL;
    const core = require("../dist/common/runtime/import-processor");
    const server = http.createServer();
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    let socket: any;
    try {
      await core.startService(server, () => ({
        query: async () => ({ rows: [] }),
      }));
      const address = server.address() as any;
      socket = io(`http://127.0.0.1:${address.port}`, {
        transports: ["websocket"],
        reconnection: false,
      });
      await new Promise<void>((resolve, reject) => {
        socket.once("connect", resolve);
        socket.once("connect_error", reject);
      });
      const pending = new Promise((resolve) =>
        socket.once("event_import_pending", resolve),
      );
      core.notifyEventAsPending(42, { id: 42 });
      expect(await pending).toEqual({ id: 42 });
    } finally {
      socket?.disconnect();
      await core.stopService();
      if (server.listening)
        await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
);

it("preserves raw WebSocket broadcast relay payload", async () => {
  const { WebSocket } = require("ws");
  const { RelayService } = require("../dist/common/runtime/relay.service");
  const runtimeEnabled = process.env.RUNTIME_ENABLED;
  const relayPort = process.env.WS_RELAY_PORT;
  process.env.RUNTIME_ENABLED = "true";
  process.env.WS_RELAY_PORT = "0";
  const relay = new RelayService();
  let first: any, second: any;
  try {
    relay.start();
    if (!relay.server.address())
      await new Promise<void>((resolve) =>
        relay.server.once("listening", resolve),
      );
    const port = relay.server.address().port;
    first = new WebSocket(`ws://127.0.0.1:${port}`);
    second = new WebSocket(`ws://127.0.0.1:${port}`);
    await Promise.all(
      [first, second].map(
        (socket) =>
          new Promise<void>((resolve, reject) => {
            socket.once("open", resolve);
            socket.once("error", reject);
          }),
      ),
    );
    const message = new Promise((resolve) =>
      second.once("message", (data: Buffer) => resolve(data.toString())),
    );
    first.send("recording-payload");
    expect(await message).toBe("recording-payload");
  } finally {
    first?.terminate();
    second?.terminate();
    await relay.onApplicationShutdown();
    if (runtimeEnabled === undefined) delete process.env.RUNTIME_ENABLED;
    else process.env.RUNTIME_ENABLED = runtimeEnabled;
    if (relayPort === undefined) delete process.env.WS_RELAY_PORT;
    else process.env.WS_RELAY_PORT = relayPort;
  }
});
