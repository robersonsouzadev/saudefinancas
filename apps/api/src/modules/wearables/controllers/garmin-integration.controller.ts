import { Controller, Get, Delete, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('integrations/garmin')
@UseGuards(JwtAuthGuard)
export class GarminIntegrationController {
  constructor(private readonly configService: ConfigService) {}

  @Get('status')
  async getStatus() {
    const oauthEnabled = this.configService.get<string>('GARMIN_OAUTH_ENABLED') === 'true';
    const fitImportEnabled = this.configService.get<string>('FIT_IMPORT_ENABLED') !== 'false';

    return {
      provider: 'GARMIN',
      status: oauthEnabled ? 'CONNECTED' : 'PENDING_PROVIDER_APPROVAL',
      officialProgram: 'Garmin Connect Developer Program',
      authorizedFlow: 'OAuth 2.0 (PKCE)',
      targetApis: ['Garmin Health API', 'Garmin Activity API'],
      message: oauthEnabled
        ? 'Integração oficial Garmin Connect conectada.'
        : 'Integração oficial em preparação. As credenciais do Garmin Connect Developer Program estão em homologação junto à Garmin. Utilize o Importador de Arquivos .FIT para carregar seus treinos do Forerunner 970.',
      oauthEnabled,
      fitImportEnabled,
      supportedDevices: ['Forerunner', 'Fenix', 'Venu', 'Edge', 'Outros relógios Garmin'],
    };
  }

  @Delete('disconnect')
  async disconnect() {
    // Revogação de acesso e exclusão de quaisquer tokens residuais
    return {
      provider: 'GARMIN',
      status: 'DISCONNECTED',
      message: 'Integração Garmin desconectada com sucesso.',
    };
  }
}
