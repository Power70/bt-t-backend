import {
  INestApplication,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

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

  enableShutdownHooks(app: INestApplication) {
    // Use non-async handlers and intentionally ignore the returned promise
    process.on('beforeExit', () => {
      void app.close();
    });

    process.on('SIGINT', () => {
      void app.close();
    });

    process.on('SIGTERM', () => {
      void app.close();
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
