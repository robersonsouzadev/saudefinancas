import { Controller, Get, Post, Put, Delete, Body, Param, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FinanceService } from './services/finance.service';
import { BudgetService } from './services/budget.service';
import { RecurringService } from './services/recurring.service';
import { CategorizerService } from './services/categorizer.service';
import { ReceiptOcrService } from './services/receipt-ocr.service';

@Controller('finance')
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly budgetService: BudgetService,
    private readonly recurringService: RecurringService,
    private readonly categorizerService: CategorizerService,
    private readonly receiptOcrService: ReceiptOcrService,
  ) {}

  @Post('accounts')
  async createAccount(@Body() data: any) {
    return this.financeService.createAccount(data);
  }

  @Get('accounts/:userId')
  async getUserAccounts(@Param('userId') userId: string) {
    return this.financeService.getUserAccounts(userId);
  }

  @Put('accounts/:accountId')
  async updateAccount(@Param('accountId') accountId: string, @Body() data: any) {
    return this.financeService.updateAccount(accountId, data);
  }

  @Delete('accounts/:accountId')
  async deleteAccount(@Param('accountId') accountId: string) {
    return this.financeService.deleteAccount(accountId);
  }

  @Post('transactions')
  async createTransaction(@Body() data: any) {
    return this.financeService.createTransaction(data);
  }

  @Get('transactions/:userId')
  async getTransactions(@Param('userId') userId: string, @Query() filter: any) {
    return this.financeService.getTransactions(userId, filter);
  }

  @Put('transactions/:transactionId')
  async updateTransaction(@Param('transactionId') transactionId: string, @Body() data: any) {
    return this.financeService.updateTransaction(transactionId, data);
  }

  @Delete('transactions/:transactionId')
  async deleteTransaction(@Param('transactionId') transactionId: string) {
    return this.financeService.deleteTransaction(transactionId);
  }

  @Get('overview/:userId')
  async getOverview(@Param('userId') userId: string, @Query('period') period: string) {
    return this.financeService.getFinancialOverview(userId, period);
  }

  @Post('budgets')
  async setBudget(@Body() data: any) {
    return this.budgetService.setBudget(data);
  }

  @Get('budgets/:userId')
  async getUserBudgets(@Param('userId') userId: string) {
    return this.budgetService.getUserBudgets(userId);
  }

  @Post('categorize')
  async categorize(@Body('description') description: string) {
    return this.categorizerService.categorizeDescription(description);
  }

  @Post('receipt/parse')
  @UseInterceptors(FileInterceptor('image'))
  async parseReceipt(@UploadedFile() file: any) {
    return this.receiptOcrService.parseReceiptImage(file?.buffer || Buffer.from(''));
  }
}
