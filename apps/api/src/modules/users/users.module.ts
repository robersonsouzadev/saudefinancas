import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { BodyMeasurementsService } from './body-measurements.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, BodyMeasurementsService],
  exports: [UsersService, BodyMeasurementsService],
})
export class UsersModule {}
