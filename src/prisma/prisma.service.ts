import {
  INestApplication,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { PrismaClient } from "../../generated/prisma";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on("beforeExit", async () => {
      await app.close();
    });

    process.on("SIGINT", async () => {
      await app.close();
    });

    process.on("SIGTERM", async () => {
      await app.close();
    });
  }
}

// import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
// import { PrismaClient } from '../../generated/prisma';
// @Injectable()
// export class PrismaService extends PrismaClient implements OnModuleInit {
//   enableShutdownHooks(app: INestApplication<any>) {
//     throw new Error('Method not implemented.');
//   }
//   async onModuleInit() {
//     await this.$connect();
//   }
// }
