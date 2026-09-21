import { describe, it, expect } from 'vitest';
import { PseudonymizationService } from '../../src/modules/wearables/services/pseudonymization.service';
import { ConfigService } from '@nestjs/config';

describe('PseudonymizationService', () => {
  const configMock = {
    get: (key: string) => {
      if (key === 'AUDIT_HMAC_SECRET') return 'super_secret_audit_hmac_key_2026';
      return null;
    },
  } as unknown as ConfigService;

  const service = new PseudonymizationService(configMock);

  it('deve gerar pseudônimo consistente e determinístico para o mesmo userId', () => {
    const userId = 'usr-123456-uuid';
    const pseud1 = service.generatePseudonym(userId);
    const pseud2 = service.generatePseudonym(userId);

    expect(pseud1).toBeDefined();
    expect(pseud1.length).toBe(64); // SHA-256 hex = 64 chars
    expect(pseud1).toBe(pseud2);
  });

  it('deve gerar pseudônimos completamente diferentes para userIds distintos', () => {
    const userA = 'user-a-123';
    const userB = 'user-b-456';

    const pseudA = service.generatePseudonym(userA);
    const pseudB = service.generatePseudonym(userB);

    expect(pseudA).not.toBe(pseudB);
  });

  it('deve alterar o pseudônimo gerado se a chave de auditoria for rotacionada', () => {
    const userId = 'usr-rotation-test';
    const service1 = new PseudonymizationService({ get: () => 'key_version_1' } as any);
    const service2 = new PseudonymizationService({ get: () => 'key_version_2' } as any);

    const pseud1 = service1.generatePseudonym(userId);
    const pseud2 = service2.generatePseudonym(userId);

    expect(pseud1).not.toBe(pseud2);
  });
});
