import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { BodyMeasurementsService } from './body-measurements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly bodyMeasurementsService: BodyMeasurementsService,
  ) {}

  @Get()
  async listUsers() {
    return this.usersService.listUsers();
  }

  // Routes for logged-in user profile & measurements
  @Get('me/profile')
  async getMyHealthProfile(@Request() req: any) {
    return this.bodyMeasurementsService.getHealthProfile(req.user.id);
  }

  @Put('me/profile')
  async updateMyProfile(@Request() req: any, @Body() body: any) {
    return this.usersService.updateProfile(req.user.id, body);
  }

  @Get('me/measurements')
  async listMyMeasurements(@Request() req: any) {
    return this.bodyMeasurementsService.listMeasurements(req.user.id);
  }

  @Get('me/measurements/latest')
  async getMyLatestMeasurement(@Request() req: any) {
    return this.bodyMeasurementsService.getLatestMeasurement(req.user.id);
  }

  @Post('me/measurements')
  async createMyMeasurement(@Request() req: any, @Body() body: any) {
    return this.bodyMeasurementsService.createMeasurement(req.user.id, body);
  }

  @Delete('me/measurements/:id')
  async deleteMyMeasurement(@Request() req: any, @Param('id') id: string) {
    return this.bodyMeasurementsService.deleteMeasurement(req.user.id, id);
  }

  // Admin routes by user id
  @Get(':id')
  async getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Post()
  async createUser(@Body() body: any) {
    return this.usersService.createUser(body);
  }

  @Put(':id')
  async updateUser(@Param('id') id: string, @Body() body: any) {
    return this.usersService.updateUser(id, body);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
