import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { FinanceService } from './services/finance.service';
import { PaymentAccountsService } from './services/payment-accounts.service';
import { CreditCardsService } from './services/credit-cards.service';
import { BoletosService } from './services/boletos.service';
import { OpenFinanceService } from './services/open-finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly paymentAccountsService: PaymentAccountsService,
    private readonly creditCardsService: CreditCardsService,
    private readonly boletosService: BoletosService,
    private readonly openFinanceService: OpenFinanceService
  ) {}

  @Get('transactions')
  async getTransactions(@Req() req: any, @Query() query: any) {
    return this.financeService.getTransactions(req.user.id, query);
  }

  @Post('transactions')
  async createTransaction(@Req() req: any, @Body() data: any) {
    return this.financeService.createTransaction(req.user.id, data);
  }

  @Put('transactions/:id')
  async updateTransactionPut(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.financeService.updateTransaction(req.user.id, id, data);
  }

  @Patch('transactions/:id')
  async updateTransactionPatch(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.financeService.updateTransaction(req.user.id, id, data);
  }

  @Delete('transactions/:id')
  async deleteTransaction(@Req() req: any, @Param('id') id: string) {
    return this.financeService.deleteTransaction(req.user.id, id);
  }

  @Get('overview')
  async getOverview(@Req() req: any) {
    return this.financeService.getFinancialOverview(req.user.id);
  }

  @Get('accounts')
  async getUserAccounts(@Req() req: any) {
    return this.paymentAccountsService.getUserAccounts(req.user.id);
  }

  @Post('accounts')
  async createAccount(@Req() req: any, @Body() data: any) {
    return this.paymentAccountsService.createAccount(req.user.id, data);
  }

  @Put('accounts/:id')
  async updateAccount(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.paymentAccountsService.updateAccount(req.user.id, id, data);
  }

  @Delete('accounts/:id')
  async deleteAccount(@Req() req: any, @Param('id') id: string) {
    return this.paymentAccountsService.deleteAccount(req.user.id, id);
  }

  @Get('credit-cards')
  async getCreditCards(@Req() req: any) {
    return this.creditCardsService.getUserCards(req.user.id);
  }

  @Post('credit-cards')
  async createCreditCard(@Req() req: any, @Body() data: any) {
    return this.creditCardsService.createCard(req.user.id, data);
  }

  @Get('credit-cards/:id/bill')
  async getCreditCardBill(@Req() req: any, @Param('id') id: string, @Query('month') month: string, @Query('year') year: string) {
    return this.creditCardsService.getCardBill(req.user.id, id, parseInt(month), parseInt(year));
  }

  @Delete('credit-cards/:id')
  async deleteCreditCard(@Req() req: any, @Param('id') id: string) {
    return this.creditCardsService.deleteCard(req.user.id, id);
  }

  @Get('boletos')
  async getBoletos(@Req() req: any, @Query('status') status?: string) {
    return this.boletosService.getBoletos(req.user.id, status);
  }

  @Post('boletos')
  async createBoleto(@Req() req: any, @Body() data: any) {
    return this.boletosService.createBoleto(req.user.id, data);
  }

  @Post('boletos/:id/pay')
  async payBoleto(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.boletosService.payBoleto(req.user.id, id, data);
  }

  @Delete('boletos/:id')
  async deleteBoleto(@Req() req: any, @Param('id') id: string) {
    return this.boletosService.deleteBoleto(req.user.id, id);
  }

  @Get('open-finance/status')
  async getOpenFinanceStatus(@Req() req: any) {
    return this.openFinanceService.getStatus(req.user.id);
  }

  @Post('open-finance/connect')
  async connectOpenFinance(@Req() req: any, @Body() payload: any) {
    return this.openFinanceService.connectWidget(req.user.id, payload);
  }

  @Post('open-finance/webhook')
  async openFinanceWebhook(@Body() payload: any) {
    // Should ideally be public, but placed here as requested.
    return this.openFinanceService.handleWebhook(payload);
  }
}
