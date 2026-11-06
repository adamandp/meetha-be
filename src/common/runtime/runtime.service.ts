import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { PrismaService } from "../prisma/prisma.service";
import config = require("../config/config");
@Injectable()
export class RuntimeService implements OnApplicationShutdown {
  readonly core = require("./import-processor");
  readonly zoomBot: any;
  readonly midtrans: any;
  private started = false;
  constructor(
    readonly database: DatabaseService,
    readonly prisma: PrismaService,
  ) {
    require("../../model/user/user.repository").configure(prisma);
    require("../../model/role/role.repository").configure(prisma);
    this.zoomBot = new (require("../zoom/zoom-bot"))(database.pool, this.core);
    if (config.services.payment_method.midtrans.active) {
      this.midtrans = new (require("midtrans-client").Snap)({
        isProduction:
          config.services.payment_method.midtrans.production === "true",
        serverKey: config.services.payment_method.midtrans.serverKey,
        clientKey: config.services.payment_method.midtrans.clientKey,
      });
    }
  }
  async start(server: any) {
    if (process.env.RUNTIME_ENABLED === "false") return;
    this.started = true;
    await this.core.startService(server, () => this.database.pool);
  }
  async onApplicationShutdown() {
    if (this.started) await this.core.stopService();
  }
}
