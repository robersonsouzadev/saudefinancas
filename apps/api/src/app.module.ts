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

// Mocks for other modules to be implemented later
@Module({}) class HealthTrackerModule {}
@Module({}) class NutritionModule {}
@Module({}) class FinanceModule {}
@Module({}) class InsightsModule {}
@Module({}) class DashboardModule {}

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
  ],
})
export class AppModule {}
