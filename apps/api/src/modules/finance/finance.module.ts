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
    OpenFinanceService
  ],
  exports: [
    FinanceService, 
    BudgetService, 
    CategorizerService,
    PaymentAccountsService,
    CreditCardsService,
    BoletosService,
    OpenFinanceService
  ],
})
export class FinanceModule {}
