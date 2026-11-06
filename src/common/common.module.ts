import { ConfigModule } from "@nestjs/config";
import config = require("./config/config");
import { RelayService } from "./runtime/relay.service";
import { Global, Module } from "@nestjs/common";
import { DatabaseService } from "./database/database.service";
import { PrismaService } from "./prisma/prisma.service";
import { RuntimeService } from "./runtime/runtime.service";
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [() => config],
    }),
  ],
  providers: [DatabaseService, PrismaService, RuntimeService, RelayService],
  exports: [DatabaseService, PrismaService, RuntimeService, RelayService],
})
export class CommonModule {}
