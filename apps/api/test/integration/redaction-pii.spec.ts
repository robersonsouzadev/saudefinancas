import { describe, it, expect } from 'vitest';
import { WearablesObservabilityService } from '../../src/modules/wearables/services/wearables-observability.service';

describe('Observabilidade e Redação Estrita de PII / Segredos (G4.2)', () => {
  const service = new WearablesObservabilityService();

  const canaryValues = {
    email: 'canary_user_970@vitasatude.com',
    jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    bearer: 'Bearer sec_canary_tok_12345678',
    password: 'canary_secret_pwd_987',
    coordsPair: '-20.4486, -54.6295',
    coordsJson: '{"latitude": -20.4486, "longitude": -54.6295}',
    binaryBuffer: '<Buffer 0e 10 20 00 00 00 00 00 2e 46 49 54 86 11 00 00 ... 500 more bytes>',
    binaryHex: '4a6f686e446f655365637265744b6579313233343536373839304142434445464142434445463132333435363738393041424344454641424344454631323334',
    connectionString: 'postgresql://vita_staging_app:secret_db_pass_999@127.0.0.1:5433/saudefinancas_test?schema=public',
  };

  it('1. Deve redigir estritamente endereço de e-mail canário', () => {
    const raw = `Processando arquivo do usuário ${canaryValues.email} com sucesso`;
    const redacted = service.redact(raw);

    expect(redacted).not.toContain(canaryValues.email);
    expect(redacted).toContain('[REDACTED_EMAIL]');
  });

  it('2. Deve redigir estritamente token JWT sintético', () => {
    const raw = `Token de autorização recebido: ${canaryValues.jwt}`;
    const redacted = service.redact(raw);

    expect(redacted).not.toContain(canaryValues.jwt);
    expect(redacted).toContain('[REDACTED_JWT]');
  });

  it('3. Deve redigir estritamente header com Bearer Token', () => {
    const raw = `Authorization header: ${canaryValues.bearer} no request`;
    const redacted = service.redact(raw);

    expect(redacted).not.toContain('sec_canary_tok_12345678');
    expect(redacted).toContain('Bearer [REDACTED_TOKEN]');
  });

  it('4. Deve redigir senhas e credenciais em texto puro', () => {
    const raw = `Tentativa de conexão com password: "${canaryValues.password}" falhou`;
    const redacted = service.redact(raw);

    expect(redacted).not.toContain(canaryValues.password);
    expect(redacted).toContain('[REDACTED_SECRET]');
  });

  it('5. Deve redigir coordenadas geográficas e pontos de rota GPS', () => {
    const rawPair = `Ponto de partida detectado em: ${canaryValues.coordsPair}`;
    const redactedPair = service.redact(rawPair);
    expect(redactedPair).not.toContain('-20.4486');
    expect(redactedPair).not.toContain('-54.6295');
    expect(redactedPair).toContain('[REDACTED_GEO]');

    const rawJson = `Telemetria GPS: ${canaryValues.coordsJson}`;
    const redactedJson = service.redact(rawJson);
    expect(redactedJson).not.toContain('-20.4486');
    expect(redactedJson).not.toContain('-54.6295');
    expect(redactedJson).toContain('[REDACTED_GEO]');
  });

  it('6. Deve redigir buffers binários e sequências hexadecimais longas', () => {
    const rawBuffer = `Conteúdo binário recebido: ${canaryValues.binaryBuffer}`;
    const redactedBuffer = service.redact(rawBuffer);
    expect(redactedBuffer).not.toContain('0e 10 20 00');
    expect(redactedBuffer).toContain('[REDACTED_BUFFER]');

    const rawHex = `Payload bruto: ${canaryValues.binaryHex}`;
    const redactedHex = service.redact(rawHex);
    expect(redactedHex).not.toContain(canaryValues.binaryHex);
    expect(redactedHex).toContain('[REDACTED_HEX_DATA]');
  });

  it('7. Deve redigir credenciais de banco em connection strings completas', () => {
    const rawConn = `Tentando conectar a: ${canaryValues.connectionString}`;
    const redactedConn = service.redact(rawConn);

    expect(redactedConn).not.toContain('secret_db_pass_999');
    expect(redactedConn).toContain('postgresql://[REDACTED_DB_CREDENTIALS]@127.0.0.1:5433/saudefinancas_test?schema=public');
  });

  it('8. Deve validar formato e baixa cardinalidade das métricas Prometheus', () => {
    service.recordImport({ provider: 'MANUAL_FIT', status: 'PROCESSED' }, 1250);
    service.recordImport({ provider: 'MANUAL_FIT', status: 'FAILED' });
    service.recordFencingViolation('worker-pod-1');
    service.recordReconciliation('pending', 3);

    const metricsText = service.getMetricsAsPrometheusText();

    expect(metricsText).toContain('wearables_imports_total{provider="MANUAL_FIT",status="PROCESSED"} 1');
    expect(metricsText).toContain('wearables_imports_total{provider="MANUAL_FIT",status="FAILED"} 1');
    expect(metricsText).toContain('wearables_lease_fencing_violations_total{worker_instance="worker-pod-1"} 1');
    expect(metricsText).toContain('wearables_reconciler_recovered_total{type="pending"} 3');

    // Baixa cardinalidade: não contém IDs dinâmicos de usuário ou arquivo
    expect(metricsText).not.toContain('user_');
    expect(metricsText).not.toContain('import_');
  });
});
