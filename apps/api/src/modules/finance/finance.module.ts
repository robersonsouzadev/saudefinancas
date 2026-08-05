import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './services/finance.service';
import { BudgetService } from './services/budget.service';
import { RecurringService } from './services/recurring.service';
import { CategorizerService } from './services/categorizer.service';
import { ReceiptOcrService } from './services/receipt-ocr.service';

@Module({
  controllers: [FinanceController],
  providers: [
    FinanceService,
    BudgetService,
    RecurringService,
    CategorizerService,
    ReceiptOcrService,
  ],
  exports: [FinanceService, BudgetService, CategorizerService],
})
export class FinanceModule {}
