export class FitUploadConfig {
  static readonly DEFAULT_SIZE_MB = 15;
  static readonly MIN_SIZE_MB = 1;
  static readonly MAX_SIZE_MB = 50;

  static getMaxUploadSizeMb(): number {
    const raw = process.env.MAX_FIT_UPLOAD_SIZE_MB;
    if (!raw || raw.trim().length === 0) {
      return this.DEFAULT_SIZE_MB;
    }

    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < this.MIN_SIZE_MB || parsed > this.MAX_SIZE_MB) {
      throw new Error(
        `[FATAL_CONFIG_ERROR] MAX_FIT_UPLOAD_SIZE_MB inválido: "${raw}". ` +
        `Deve ser um número inteiro entre ${this.MIN_SIZE_MB} e ${this.MAX_SIZE_MB} megabytes.`
      );
    }

    return parsed;
  }

  // Calculado estaticamente uma única vez no carregamento
  static readonly MAX_UPLOAD_SIZE_MB: number = FitUploadConfig.getMaxUploadSizeMb();
  static readonly MAX_UPLOAD_SIZE_BYTES: number = FitUploadConfig.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
}
