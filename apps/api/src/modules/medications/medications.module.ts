import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';
import { MedOcrService } from './services/med-ocr.service';
import { MedicationReminderCronService } from './services/medication-reminder-cron.service';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  imports: [PrismaModule, WhatsappModule],
  controllers: [MedicationsController],
  providers: [MedicationsService, MedOcrService, MedicationReminderCronService, EncryptionService],
  exports: [MedicationsService, MedOcrService, MedicationReminderCronService],
})
export class MedicationsModule {}
