import { Controller, Get, Post, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { FinanceService } from './services/finance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('accounts')
  async getUserAccounts(@Req() req: any) {
    return this.financeService.getUserAccounts(req.user.id);
  }

  @Get('transactions')
  async getTransactions(@Req() req: any) {
    return this.financeService.getTransactions(req.user.id);
  }

  @Post('transactions')
  async createTransaction(@Req() req: any, @Body() data: any) {
    return this.financeService.createTransaction(req.user.id, data);
  }

  @Delete('transactions/:id')
  async deleteTransaction(@Req() req: any, @Param('id') id: string) {
    return this.financeService.deleteTransaction(req.user.id, id);
  }

  @Get('overview')
  async getOverview(@Req() req: any) {
    return this.financeService.getFinancialOverview(req.user.id);
  }
}
