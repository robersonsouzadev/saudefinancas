import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';

@Module({
  imports: [PrismaModule],
  controllers: [MedicationsController],
  providers: [MedicationsService],
  exports: [MedicationsService],
})
export class MedicationsModule {}
