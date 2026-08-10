import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';
import { MedOcrService } from './services/med-ocr.service';

@Module({
  imports: [PrismaModule],
  controllers: [MedicationsController],
  providers: [MedicationsService, MedOcrService],
  exports: [MedicationsService, MedOcrService],
})
export class MedicationsModule {}
