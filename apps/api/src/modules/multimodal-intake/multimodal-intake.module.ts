import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MultimodalIntakeController } from './multimodal-intake.controller';
import { VoiceProcessorService } from './services/voice-processor.service';
import { VisionProcessorService } from './services/vision-processor.service';
import { IntakeClassifierService } from './services/intake-classifier.service';
import { IntakeDispatcherService } from './services/intake-dispatcher.service';
import { LabExamsModule } from '../lab-exams/lab-exams.module';
import { EncryptionService } from '../../common/services/encryption.service';

@Module({
  imports: [PrismaModule, LabExamsModule],
  controllers: [MultimodalIntakeController],
  providers: [
    VoiceProcessorService,
    VisionProcessorService,
    IntakeClassifierService,
    IntakeDispatcherService,
    EncryptionService,
  ],
  exports: [IntakeDispatcherService],
})
export class MultimodalIntakeModule {}
