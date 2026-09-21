import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    try {
      await this.$executeRawUnsafe(`SET TIME ZONE 'UTC'`);
      const tzRows = await this.$queryRawUnsafe<Array<{ TimeZone?: string; timezone?: string }>>(`SHOW TIMEZONE`);
      const sessionTz = tzRows[0]?.TimeZone || tzRows[0]?.timezone || 'UNKNOWN';

      const telemetry = {
        databaseTimezone: 'UTC',
        sessionTimezone: sessionTz,
        nodeTimezone: process.env.TZ || 'UTC',
        utcInvariantEnabled: true,
      };

      this.logger.log(`[Database Session] Configuração UTC do pool: ${JSON.stringify(telemetry)}`);
    } catch (err: any) {
      this.logger.warn(`Não foi possível validar TimeZone no onModuleInit: ${err?.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
