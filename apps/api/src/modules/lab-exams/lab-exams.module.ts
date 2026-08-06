import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { LabExamsController } from './lab-exams.controller';
import { LabExamsService } from './services/lab-exams.service';
import { LabOcrService } from './services/lab-ocr.service';
import { BiomarkerNormalizerService } from './services/biomarker-normalizer.service';
import { BiomarkerAnalyzerService } from './services/biomarker-analyzer.service';
import { PhenoAgeService } from './services/pheno-age.service';
import { LabInsightService } from './services/lab-insight.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [LabExamsController],
  providers: [
    LabExamsService,
    LabOcrService,
    BiomarkerNormalizerService,
    BiomarkerAnalyzerService,
    PhenoAgeService,
    LabInsightService,
  ],
  exports: [LabExamsService, LabOcrService],
})
export class LabExamsModule {}
