import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { FinanceModule } from './modules/finance/finance.module';
import { InsightsModule } from './modules/insights/insights.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InvestmentsModule } from './modules/investments/investments.module';
import { MedicationsModule } from './modules/medications/medications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
    FinanceModule,
    InsightsModule,
    DashboardModule,
    InvestmentsModule,
    MedicationsModule,
  ],
})
export class AppModule {}
