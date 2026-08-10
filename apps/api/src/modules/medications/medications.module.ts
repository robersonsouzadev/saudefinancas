import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';
import { MedOcrService } from './services/med-ocr.service';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  imports: [PrismaModule],
  controllers: [MedicationsController],
  providers: [MedicationsService, MedOcrService, EncryptionService],
  exports: [MedicationsService, MedOcrService],
})
export class MedicationsModule {}
