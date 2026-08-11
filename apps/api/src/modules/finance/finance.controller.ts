import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { FinanceService } from './services/finance.service';
import { PaymentAccountsService } from './services/payment-accounts.service';
import { CreditCardsService } from './services/credit-cards.service';
import { BoletosService } from './services/boletos.service';
import { OpenFinanceService } from './services/open-finance.service';
import { BudgetService } from './services/budget.service';
import { RecurringService } from './services/recurring.service';
import { TitlesService } from './services/titles.service';
import { EntitiesService } from './services/entities.service';
import { CostCentersService } from './services/cost-centers.service';
import { VoiceFinanceService } from './services/voice-finance.service';
import { ReportsService } from './services/reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TitleType, TitleStatus, EntityType } from '@prisma/client';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly paymentAccountsService: PaymentAccountsService,
    private readonly creditCardsService: CreditCardsService,
    private readonly boletosService: BoletosService,
    private readonly openFinanceService: OpenFinanceService,
    private readonly budgetService: BudgetService,
    private readonly recurringService: RecurringService,
    private readonly titlesService: TitlesService,
    private readonly entitiesService: EntitiesService,
    private readonly costCentersService: CostCentersService,
    private readonly voiceFinanceService: VoiceFinanceService,
    private readonly reportsService: ReportsService,
  ) {}

  // ----------------------------------------------------
  // TÍTULOS FINANCEIROS (CONTAS A PAGAR / A RECEBER)
  // ----------------------------------------------------

  @Get('titles')
  async getTitles(
    @Req() req: any,
    @Query('type') type?: TitleType,
    @Query('status') status?: TitleStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('entityId') entityId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('costCenterId') costCenterId?: string,
    @Query('search') search?: string,
  ) {
    return this.titlesService.getTitles(req.user.id, {
      type,
      status,
      startDate,
      endDate,
      entityId,
      categoryId,
      costCenterId,
      search,
    });
  }

  @Get('titles/aging')
  async getAgingReport(@Req() req: any, @Query('type') type?: TitleType) {
    return this.titlesService.getAgingReport(req.user.id, type || 'PAYABLE');
  }

  @Post('titles')
  async createTitle(@Req() req: any, @Body() data: any) {
    return this.titlesService.createTitle(req.user.id, data);
  }

  @Post('titles/batch-pay')
  async batchPayTitles(@Req() req: any, @Body() data: { titleIds: string[]; paymentAccountId?: string; paymentMethod?: any; paymentDate?: string }) {
    return this.titlesService.batchPayTitles(req.user.id, data);
  }

  @Put('titles/:id')
  async updateTitle(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.titlesService.updateTitle(req.user.id, id, data);
  }

  @Post('titles/:id/pay')
  async payTitle(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.titlesService.payTitle(req.user.id, id, data);
  }

  @Delete('titles/:id')
  async cancelTitle(@Req() req: any, @Param('id') id: string) {
    return this.titlesService.cancelTitle(req.user.id, id);
  }

  // ----------------------------------------------------
  // ENTIDADES (FORNECEDORES / CLIENTES - CRM BÁSICO)
  // ----------------------------------------------------

  @Get('entities')
  async getEntities(@Req() req: any, @Query('type') type?: EntityType) {
    return this.entitiesService.getEntities(req.user.id, type);
  }

  @Post('entities')
  async createEntity(@Req() req: any, @Body() data: any) {
    return this.entitiesService.createEntity(req.user.id, data);
  }

  @Put('entities/:id')
  async updateEntity(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.entitiesService.updateEntity(req.user.id, id, data);
  }

  @Delete('entities/:id')
  async deleteEntity(@Req() req: any, @Param('id') id: string) {
    return this.entitiesService.deleteEntity(req.user.id, id);
  }

  @Get('entities/:id/statement')
  async getEntityStatement(@Req() req: any, @Param('id') id: string) {
    return this.entitiesService.getEntityStatement(req.user.id, id);
  }

  // ----------------------------------------------------
  // CENTROS DE CUSTO
  // ----------------------------------------------------

  @Get('cost-centers')
  async getCostCenters(@Req() req: any) {
    return this.costCentersService.getCostCenters(req.user.id);
  }

  @Post('cost-centers')
  async createCostCenter(@Req() req: any, @Body() data: any) {
    return this.costCentersService.createCostCenter(req.user.id, data);
  }

  @Put('cost-centers/:id')
  async updateCostCenter(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.costCentersService.updateCostCenter(req.user.id, id, data);
  }

  @Delete('cost-centers/:id')
  async deleteCostCenter(@Req() req: any, @Param('id') id: string) {
    return this.costCentersService.deleteCostCenter(req.user.id, id);
  }

  // ----------------------------------------------------
  // IA POR VOZ (PARSER DE COMANDOS FINANCEIROS)
  // ----------------------------------------------------

  @Post('voice/parse')
  async parseVoiceCommand(@Req() req: any, @Body('text') text: string) {
    return this.voiceFinanceService.parseVoiceCommand(req.user.id, text || '');
  }

  // ----------------------------------------------------
  // RELATÓRIOS (DRE, FLUXO DE CAIXA, SAÚDE FINANCEIRA)
  // ----------------------------------------------------

  @Get('reports/dre')
  async getDRE(
    @Req() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('regime') regime?: 'COMPETENCE' | 'CASH',
  ) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    const m = month ? parseInt(month) : new Date().getMonth() + 1;
    return this.reportsService.getDRE(req.user.id, y, m, regime || 'COMPETENCE');
  }

  @Get('reports/cash-flow')
  async getCashFlowForecast(@Req() req: any, @Query('days') days?: string) {
    return this.reportsService.getCashFlowForecast(req.user.id, days ? parseInt(days) : 30);
  }

  @Get('reports/health-score')
  async getHealthScore(@Req() req: any) {
    return this.reportsService.getFinancialHealthScore(req.user.id);
  }

  // ----------------------------------------------------
  // TRANSAÇÕES & CONCILIAÇÃO
  // ----------------------------------------------------

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

  @Put('credit-cards/:id')
  async updateCreditCard(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.creditCardsService.updateCard(req.user.id, id, data);
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

  @Get('budgets')
  async getBudgets(@Req() req: any) {
    return this.budgetService.getUserBudgets(req.user.id);
  }

  @Post('budgets')
  async setBudget(@Req() req: any, @Body() data: any) {
    return this.budgetService.setBudget(req.user.id, data);
  }

  @Delete('budgets/:id')
  async deleteBudget(@Req() req: any, @Param('id') id: string) {
    return this.budgetService.deleteBudget(req.user.id, id);
  }

  @Get('recurring')
  async getRecurringRules(@Req() req: any) {
    return this.recurringService.getUserRecurringRules(req.user.id);
  }

  @Post('recurring')
  async createRecurringRule(@Req() req: any, @Body() data: any) {
    return this.recurringService.createRecurringRule(req.user.id, data);
  }

  @Delete('recurring/:id')
  async deleteRecurringRule(@Req() req: any, @Param('id') id: string) {
    return this.recurringService.deleteRecurringRule(req.user.id, id);
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
    return this.openFinanceService.handleWebhook(payload);
  }
}
