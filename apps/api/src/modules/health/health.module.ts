import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WearablesModule } from '../wearables/wearables.module';
import { HealthController } from './health.controller';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    WearablesModule,
    BullModule.registerQueueAsync({
      name: 'wearables-fit-import',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          lazyConnect: true,
        },
      }),
    }),
  ],
  controllers: [HealthController],
})
export class HealthModule {}
