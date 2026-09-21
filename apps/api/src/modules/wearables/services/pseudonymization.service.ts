import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PseudonymizationService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = 
      this.configService.get<string>('AUDIT_HMAC_SECRET') || 
      this.configService.get<string>('JWT_SECRET') || 
      'vita_saude_audit_hmac_default_secret_key_2026';
  }

  generatePseudonym(userId: string): string {
    if (!userId) return '';
    return crypto
      .createHmac('sha256', this.secret)
      .update(userId)
      .digest('hex');
  }
}
