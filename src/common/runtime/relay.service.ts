import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { WebSocket, WebSocketServer } from "ws";
@Injectable()
export class RelayService implements OnApplicationShutdown {
  private server?: WebSocketServer;
  start() {
    if (
      process.env.RUNTIME_ENABLED === "false" ||
      process.env.WS_RELAY_ENABLED === "false"
    )
      return;
    this.server = new WebSocketServer({
      port: Number(process.env.WS_RELAY_PORT || 8080),
    });
    this.server.on("connection", (socket) =>
      socket.on("message", (data) => {
        this.server?.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) client.send(data);
        });
      }),
    );
  }
  async onApplicationShutdown() {
    if (this.server) {
      for (const client of this.server.clients) client.terminate();
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    }
  }
}
