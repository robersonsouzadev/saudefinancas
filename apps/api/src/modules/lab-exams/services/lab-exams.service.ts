import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LabOcrService } from './lab-ocr.service';
import { BiomarkerNormalizerService } from './biomarker-normalizer.service';
import { BiomarkerAnalyzerService } from './biomarker-analyzer.service';
import { PhenoAgeService } from './pheno-age.service';
import { LabInsightService } from './lab-insight.service';

@Injectable()
export class LabExamsService {
  constructor(
    private prisma: PrismaService,
    private ocrService: LabOcrService,
    private normalizer: BiomarkerNormalizerService,
    private analyzer: BiomarkerAnalyzerService,
    private phenoAgeService: PhenoAgeService,
    private insightService: LabInsightService,
  ) {}

  async createExamFromOCR(userId: string, imageBase64: string, mimeType: string, customTitle?: string) {
    try {
      const ocrData = await this.ocrService.parseExamImage(imageBase64, mimeType);
      const title = customTitle || (ocrData.laboratory ? `Exame ${ocrData.laboratory}` : 'Exame Laboratorial');

      // Map extracted items (support both items and results array properties)
      const itemsList = ocrData.items || ocrData.results || [];
      if (itemsList.length === 0) {
        return { exam: null, patterns: [], message: 'Nenhum biomarcador foi extraído da imagem. Tente uma foto mais nítida.' };
      }

      const rawItems = itemsList.map((item: any) => {
        const norm = this.normalizer.normalize(item.name || 'Biomarcador');
        return {
          biomarkerKey: norm.key,
          biomarkerName: norm.name,
          category: norm.category,
          value: Number(item.value) || 0,
          unit: item.unit || 'mg/dL',
          referenceMin: item.reference_min !== undefined ? Number(item.reference_min) : undefined,
          referenceMax: item.reference_max !== undefined ? Number(item.reference_max) : undefined,
        };
      });

      // Fetch previous results for delta calculation
      let previousMap = new Map<string, number>();
      try {
        const previousExam = await this.prisma.labExam.findFirst({
          where: { userId },
          orderBy: { examDate: 'desc' },
          include: { results: true },
        });
        if (previousExam) {
          previousExam.results.forEach((r) => previousMap.set(r.biomarkerKey, r.value));
        }
      } catch {
        // No previous exams, continue without delta
      }

      // Analyze status, delta, and patterns
      const { analyzedResults, patterns } = this.analyzer.analyzeResults(rawItems, previousMap);

      // Calculate PhenoAge
      const bioMap: Record<string, number> = {};
      analyzedResults.forEach((r) => (bioMap[r.biomarkerKey] = r.value));
      const phenoAge = this.phenoAgeService.calculatePhenoAge(35, bioMap);

      // Generate Vita IA Insight
      let aiInsight: string;
      try {
        aiInsight = await this.insightService.generateInsight(title, analyzedResults, patterns, phenoAge);
      } catch {
        aiInsight = 'Análise de IA indisponível no momento. Consulte os biomarcadores extraídos.';
      }

      // Save to DB
      const exam = await this.prisma.labExam.create({
        data: {
          userId,
          title,
          laboratory: ocrData.laboratory || 'Laboratório',
          examDate: (ocrData.exam_date && !isNaN(new Date(ocrData.exam_date).getTime())) ? new Date(ocrData.exam_date) : new Date(),
          aiProcessed: true,
          aiInsight,
          phenoAge,
          results: {
            create: analyzedResults.map((r) => ({
              biomarkerKey: r.biomarkerKey,
              biomarkerName: r.biomarkerName,
              category: r.category,
              value: r.value,
              unit: r.unit,
              referenceMin: r.referenceMin ?? null,
              referenceMax: r.referenceMax ?? null,
              optimalMin: r.optimalMin ?? null,
              optimalMax: r.optimalMax ?? null,
              status: r.status || 'NORMAL',
              delta: r.delta ?? null,
              previousValue: r.previousValue ?? null,
            })),
          },
        },
        include: { results: true },
      });

      return { exam, patterns };
    } catch (error: any) {
      console.error('Erro em createExamFromOCR:', error?.message || error);
      throw new Error(`Falha ao processar exame: ${error?.message || 'Erro interno do servidor'}`);
    }
  }

  async getUserExams(userId: string) {
    return this.prisma.labExam.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { results: true },
    });
  }

  async getExamById(id: string) {
    return this.prisma.labExam.findUnique({
      where: { id },
      include: { results: true },
    });
  }

  async getBiomarkerHistory(userId: string, biomarkerKey: string) {
    const results = await this.prisma.labResult.findMany({
      where: {
        exam: { userId },
        biomarkerKey,
      },
      include: { exam: true },
      orderBy: { exam: { examDate: 'asc' } },
    });

    return results.map((r) => ({
      date: new Date(r.exam.examDate).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      value: r.value,
      refMin: r.referenceMin,
      refMax: r.referenceMax,
    }));
  }

  async getDashboardSummary(userId: string) {
    const exams = await this.getUserExams(userId);
    if (exams.length === 0) {
      return null; // Frontend handles demo/empty state
    }

    const latestExam = exams[0];
    let totalBiomarkers = 0;
    let attentionCount = 0;
    let optimalCount = 0;

    latestExam.results.forEach((r) => {
      totalBiomarkers++;
      if (r.status === 'OTIMO') optimalCount++;
      if (r.status === 'ALTO' || r.status === 'CRITICO_ALTO' || r.status === 'BAIXO' || r.status === 'CRITICO_BAIXO') {
        attentionCount++;
      }
    });

    const bioMap: Record<string, number> = {};
    latestExam.results.forEach((r) => (bioMap[r.biomarkerKey] = r.value));
    const { patterns } = this.analyzer.analyzeResults(
      latestExam.results.map((r) => ({ ...r, category: r.category as any })),
    );

    return {
      phenoAge: latestExam.phenoAge || 31.4,
      chronologicalAge: 35,
      totalExams: exams.length,
      totalBiomarkers,
      attentionCount,
      optimalCount,
      recentPatterns: patterns,
      recentExams: exams,
    };
  }

  async deleteExam(id: string) {
    return this.prisma.labExam.delete({ where: { id } });
  }
  async updateResult(resultId: string, userId: string, data: { value?: number; unit?: string; biomarkerName?: string; category?: string; referenceMin?: number; referenceMax?: number; status?: string }) {
    const result = await this.prisma.labResult.findUnique({
      where: { id: resultId },
      include: { exam: true },
    });
    if (!result || result.exam.userId !== userId) {
      throw new Error('Acesso negado ou resultado não encontrado');
    }
    return this.prisma.labResult.update({
      where: { id: resultId },
      data: data as any,
    });
  }

  async deleteResult(resultId: string, userId: string) {
    const result = await this.prisma.labResult.findUnique({
      where: { id: resultId },
      include: { exam: true },
    });
    if (!result || result.exam.userId !== userId) {
      throw new Error('Acesso negado ou resultado não encontrado');
    }
    await this.prisma.labResult.delete({
      where: { id: resultId },
    });
    return { deleted: true };
  }
}
