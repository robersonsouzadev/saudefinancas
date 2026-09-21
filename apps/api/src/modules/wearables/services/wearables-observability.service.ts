import { Injectable, Logger } from '@nestjs/common';

export interface ImportMetricLabels {
  provider: string;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
}

@Injectable()
export class WearablesObservabilityService {
  private readonly logger = new Logger('WearablesObservability');

  // Contadores de métricas com labels de baixa cardinalidade
  private importsTotal = new Map<string, number>();
  private importDurations = new Map<string, number[]>();
  private fencingViolationsTotal = new Map<string, number>();
  private reconcilerRecoveredTotal = new Map<string, number>();

  /**
   * Função pura de higienização e redação de PII, segredos e dados sensíveis
   */
  redact(input: string | any): string {
    if (input === null || input === undefined) return '';
    let str = typeof input === 'object' ? JSON.stringify(input) : String(input);

    // 1. Connection strings de Banco de Dados
    str = str.replace(/postgres(ql)?:\/\/[^@\s]+@([^\s"'`]+)/gi, 'postgresql://[REDACTED_DB_CREDENTIALS]@$2');

    // 2. JWT Tokens (header.payload.signature)
    str = str.replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+/g, '[REDACTED_JWT]');

    // 3. Bearer Tokens
    str = str.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{8,}/gi, 'Bearer [REDACTED_TOKEN]');

    // 4. Senhas e segredos explícitos
    str = str.replace(/(["']?(?:password|passwd|secret|token)["']?\s*[:=]\s*["']?)([^"',\s\}]+)(["']?)/gi, '$1[REDACTED_SECRET]$3');

    // 5. Emails (incluindo canários e usuários)
    str = str.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]');

    // 6. Coordenadas GPS (pares latitude, longitude)
    str = str.replace(/(-?\d{1,3}\.\d{4,})\s*,\s*(-?\d{1,3}\.\d{4,})/g, '[REDACTED_GEO]');
    str = str.replace(/(["']?(?:latitude|longitude|lat|lon|position_lat|position_long)["']?\s*[:=]\s*["']?)(-?\d{1,3}\.\d+)(["']?)/gi, '$1[REDACTED_GEO]$3');

    // 7. Fragmentos binários ou hexadecimais longos (> 64 caracteres)
    str = str.replace(/<Buffer(?:\s+[0-9a-f]{2})+(\s*\.\.\.\s*\d+\s*more\s*bytes)?>/gi, '[REDACTED_BUFFER]');
    str = str.replace(/\b[0-9a-fA-F]{64,}\b/g, '[REDACTED_HEX_DATA]');

    return str;
  }

  // Métodos seguros de log com redação obrigatória
  safeLog(message: string, context?: string): void {
    this.logger.log(this.redact(message), context);
  }

  safeWarn(message: string, context?: string): void {
    this.logger.warn(this.redact(message), context);
  }

  safeError(message: string, trace?: string, context?: string): void {
    this.logger.error(this.redact(message), trace ? this.redact(trace) : undefined, context);
  }

  // Coleta de métricas operacionais
  recordImport(labels: ImportMetricLabels, durationMs?: number): void {
    const key = `provider="${labels.provider}",status="${labels.status}"`;
    const count = this.importsTotal.get(key) || 0;
    this.importsTotal.set(key, count + 1);

    if (durationMs !== undefined && durationMs >= 0) {
      const durations = this.importDurations.get(key) || [];
      durations.push(durationMs / 1000); // Em segundos
      this.importDurations.set(key, durations);
    }
  }

  recordFencingViolation(workerInstance = 'default'): void {
    const key = `worker_instance="${workerInstance}"`;
    const count = this.fencingViolationsTotal.get(key) || 0;
    this.fencingViolationsTotal.set(key, count + 1);
  }

  recordReconciliation(type: 'pending' | 'expired_processing', count: number): void {
    const key = `type="${type}"`;
    const current = this.reconcilerRecoveredTotal.get(key) || 0;
    this.reconcilerRecoveredTotal.set(key, current + count);
  }

  /**
   * Renderiza métricas em formato texto compatível com Prometheus
   */
  getMetricsAsPrometheusText(): string {
    const lines: string[] = [];

    lines.push('# HELP wearables_imports_total Total de arquivos FIT recebidos por status e provedor');
    lines.push('# TYPE wearables_imports_total counter');
    for (const [labels, val] of this.importsTotal.entries()) {
      lines.push(`wearables_imports_total{${labels}} ${val}`);
    }

    lines.push('\n# HELP wearables_lease_fencing_violations_total Violações de fencing de lease detectadas');
    lines.push('# TYPE wearables_lease_fencing_violations_total counter');
    for (const [labels, val] of this.fencingViolationsTotal.entries()) {
      lines.push(`wearables_lease_fencing_violations_total{${labels}} ${val}`);
    }

    lines.push('\n# HELP wearables_reconciler_recovered_total Total de jobs recuperados pelo outbox reconciler');
    lines.push('# TYPE wearables_reconciler_recovered_total counter');
    for (const [labels, val] of this.reconcilerRecoveredTotal.entries()) {
      lines.push(`wearables_reconciler_recovered_total{${labels}} ${val}`);
    }

    return lines.join('\n') + '\n';
  }
}
