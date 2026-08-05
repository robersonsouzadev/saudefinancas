import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { FamilyService } from './family.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('family')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post('groups')
  async createGroup(@Request() req: any, @Body() body: any) {
    return this.familyService.createGroup(req.user.sub || req.user.id, body);
  }

  @Get('groups')
  async getUserGroups(@Request() req: any) {
    return this.familyService.getUserGroups(req.user.sub || req.user.id);
  }

  @Get('groups/:id')
  async getGroupDetails(@Request() req: any, @Param('id') id: string) {
    return this.familyService.getGroupDetails(id, req.user.sub || req.user.id);
  }

  @Post('groups/:id/members')
  async addMember(@Param('id') id: string, @Body() body: { userId: string; role?: string }) {
    return this.familyService.addMember(id, body.userId, body.role);
  }

  @Delete('groups/:id/members/:userId')
  async removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.familyService.removeMember(id, userId);
  }

  @Post('groups/:id/budget')
  async setFamilyBudget(@Param('id') id: string, @Body() body: any) {
    return this.familyService.setFamilyBudget(id, body);
  }

  @Get('groups/:id/finances')
  async getGroupFinances(
    @Request() req: any,
    @Param('id') id: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.familyService.getGroupFinances(id, req.user.sub || req.user.id, month, year);
  }
}
