import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { databaseOptions } from "../database/database.service";
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnApplicationShutdown
{
  constructor() {
    super({ adapter: new PrismaPg(databaseOptions()) });
  }
  async onApplicationShutdown() {
    await this.$disconnect();
  }
}
