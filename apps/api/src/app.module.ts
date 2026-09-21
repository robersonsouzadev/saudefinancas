import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FamilyModule } from './modules/family/family.module';
import { AiEngineModule } from './modules/ai-engine/ai-engine.module';
import { LlmProvidersModule } from './modules/llm-providers/llm-providers.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';

import { HealthTrackerModule } from './modules/health-tracker/health-tracker.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { InsightsModule } from './modules/insights/insights.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { MultimodalIntakeModule } from './modules/multimodal-intake/multimodal-intake.module';
import { LabExamsModule } from './modules/lab-exams/lab-exams.module';
import { AgentsModule } from './modules/agents/agents.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { BodyAssessmentsModule } from './modules/body-assessments/body-assessments.module';
import { WearablesModule } from './modules/wearables/wearables.module';
import { HealthModule } from './modules/health/health.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          lazyConnect: true,
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FamilyModule,
    LlmProvidersModule,
    KnowledgeModule,
    AiEngineModule,
    WhatsappModule,
    HealthTrackerModule,
    NutritionModule,
    InsightsModule,
    DashboardModule,
    MedicationsModule,
    MultimodalIntakeModule,
    LabExamsModule,
    AgentsModule,
    WorkoutsModule,
    BodyAssessmentsModule,
    WearablesModule,
    HealthModule,
  ],
})
export class AppModule {}
