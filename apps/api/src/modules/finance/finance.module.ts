import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './services/finance.service';
import { BudgetService } from './services/budget.service';
import { RecurringService } from './services/recurring.service';
import { CategorizerService } from './services/categorizer.service';
import { ReceiptOcrService } from './services/receipt-ocr.service';
import { PaymentAccountsService } from './services/payment-accounts.service';
import { CreditCardsService } from './services/credit-cards.service';
import { BoletosService } from './services/boletos.service';
import { OpenFinanceService } from './services/open-finance.service';
import { TitlesService } from './services/titles.service';
import { EntitiesService } from './services/entities.service';
import { CostCentersService } from './services/cost-centers.service';
import { VoiceFinanceService } from './services/voice-finance.service';
import { ReportsService } from './services/reports.service';

@Module({
  controllers: [FinanceController],
  providers: [
    FinanceService,
    BudgetService,
    RecurringService,
    CategorizerService,
    ReceiptOcrService,
    PaymentAccountsService,
    CreditCardsService,
    BoletosService,
    OpenFinanceService,
    TitlesService,
    EntitiesService,
    CostCentersService,
    VoiceFinanceService,
    ReportsService,
  ],
  exports: [
    FinanceService, 
    BudgetService, 
    CategorizerService,
    PaymentAccountsService,
    CreditCardsService,
    BoletosService,
    OpenFinanceService,
    TitlesService,
    EntitiesService,
    CostCentersService,
    VoiceFinanceService,
    ReportsService,
  ],
})
export class FinanceModule {}
