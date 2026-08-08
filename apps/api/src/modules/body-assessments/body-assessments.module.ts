import { Module } from '@nestjs/common';
import { BodyAssessmentsController } from './body-assessments.controller';
import { BodyAssessmentsService } from './services/body-assessments.service';
import { BodyAssessmentCalculatorService } from './services/body-assessment-calculator.service';

@Module({
  controllers: [BodyAssessmentsController],
  providers: [BodyAssessmentsService, BodyAssessmentCalculatorService],
  exports: [BodyAssessmentsService, BodyAssessmentCalculatorService],
})
export class BodyAssessmentsModule {}
