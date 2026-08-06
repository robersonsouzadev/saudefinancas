'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  FileText, Upload, Sparkles, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, 
  Activity, ShieldAlert, Heart, Calendar, Plus, RefreshCw, Eye, Trash2, X, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine 
} from 'recharts';

interface LabResultItem {
  id: string;
  biomarkerKey: string;
  biomarkerName: string;
  category: string;
  value: number;
  unit: string;
  referenceMin?: number;
  referenceMax?: number;
  optimalMin?: number;
  optimalMax?: number;
  status: 'CRITICO_BAIXO' | 'BAIXO' | 'NORMAL' | 'OTIMO' | 'ALTO' | 'CRITICO_ALTO';
  delta?: number;
  previousValue?: number;
}

interface LabExamData {
  id: string;
  title: string;
  laboratory?: string;
  examDate: string;
  aiInsight?: string;
  phenoAge?: number;
  results: LabResultItem[];
}

interface DashboardSummary {
  phenoAge?: number;
  chronologicalAge?: number;
  totalExams: number;
  totalBiomarkers: number;
  attentionCount: number;
  optimalCount: number;
  recentPatterns: Array<{
    title: string;
    description: string;
    severity: 'WARNING' | 'CRITICAL' | 'INFO';
  }>;
  recentExams: LabExamData[];
}

export default function LabExamsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBiomarker, setSelectedBiomarker] = useState<string | null>('GLUCOSE');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    METABOLICO: true,
    LIPIDIOS: true,
    HEMOGRAMA: false,
    HORMONIOS: false,
    VITAMINAS_MINERAIS: false,
  });

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  useEffect(() => {
    if (selectedBiomarker) {
      fetchBiomarkerHistory(selectedBiomarker);
    }
  }, [selectedBiomarker]);

  const fetchDashboardSummary = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/lab-exams/dashboard`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        // Fallback demo data if endpoint is not returning data yet
        setDemoSummary();
      }
    } catch {
      setDemoSummary();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBiomarkerHistory = async (key: string) => {
    try {
      const res = await fetch(`${API_BASE}/lab-exams/history/${key}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      } else {
        setDemoHistory(key);
      }
    } catch {
      setDemoHistory(key);
    }
  };

  const setDemoSummary = () => {
    setSummary({
      phenoAge: 31.4,
      chronologicalAge: 35,
      totalExams: 3,
      totalBiomarkers: 24,
      attentionCount: 3,
      optimalCount: 18,
      recentPatterns: [
        {
          title: 'Resistência Insulínica Leve Flagged',
          description: 'Elevação combinada de Insulina de Jejum (8.2 µIU/mL) e Razão Triglicerídeos/HDL (3.2). Recomendado reduzir carboidratos refinados.',
          severity: 'WARNING',
        },
        {
          title: 'Perfil Lipídico Excelente',
          description: 'Queda de 23% no LDL-C (88 mg/dL) e aumento de 12% no HDL-C (58 mg/dL) vs exame anterior.',
          severity: 'INFO',
        },
      ],
      recentExams: [
        {
          id: '1',
          title: 'Hemograma Completo + Perfil Lipídico',
          laboratory: 'Fleury Medicina Diagnóstica',
          examDate: '2026-07-15T00:00:00.000Z',
          phenoAge: 31.4,
          aiInsight: 'Seus marcadores cardiovasculares apresentaram evolução significativa. O LDL-C reduziu de 115 para 88 mg/dL (-23.4%), enquanto o HDL subiu para 58 mg/dL. Atenção para a Insulina de Jejum que apresentou leve elevação (8.2 µIU/mL), sinalizando padrão inicial de resistência insulínica.',
          results: [
            { id: '101', biomarkerKey: 'GLUCOSE', biomarkerName: 'Glicose de Jejum', category: 'METABOLICO', value: 92, unit: 'mg/dL', referenceMin: 70, referenceMax: 99, optimalMin: 75, optimalMax: 86, status: 'NORMAL', delta: 4.5, previousValue: 88 },
            { id: '102', biomarkerKey: 'INSULIN', biomarkerName: 'Insulina de Jejum', category: 'METABOLICO', value: 8.2, unit: 'µIU/mL', referenceMin: 2.6, referenceMax: 24.9, optimalMin: 2.0, optimalMax: 5.0, status: 'ALTO', delta: 34.4, previousValue: 6.1 },
            { id: '103', biomarkerKey: 'HBA1C', biomarkerName: 'Hemoglobina Glicada (HbA1c)', category: 'METABOLICO', value: 5.1, unit: '%', referenceMin: 4.0, referenceMax: 5.6, optimalMin: 4.8, optimalMax: 5.2, status: 'OTIMO', delta: -3.7, previousValue: 5.3 },
            { id: '104', biomarkerKey: 'HOMA_IR', biomarkerName: 'HOMA-IR', category: 'METABOLICO', value: 1.86, unit: 'índice', referenceMin: 0, referenceMax: 2.15, optimalMin: 0, optimalMax: 1.0, status: 'NORMAL', delta: 43.0, previousValue: 1.3 },
            { id: '105', biomarkerKey: 'TOTAL_CHOLESTEROL', biomarkerName: 'Colesterol Total', category: 'LIPIDIOS', value: 185, unit: 'mg/dL', referenceMin: 0, referenceMax: 190, optimalMin: 160, optimalMax: 190, status: 'OTIMO', delta: -11.9, previousValue: 210 },
            { id: '106', biomarkerKey: 'LDL', biomarkerName: 'LDL Colesterol', category: 'LIPIDIOS', value: 88, unit: 'mg/dL', referenceMin: 0, referenceMax: 130, optimalMin: 50, optimalMax: 90, status: 'OTIMO', delta: -23.4, previousValue: 115 },
            { id: '107', biomarkerKey: 'HDL', biomarkerName: 'HDL Colesterol', category: 'LIPIDIOS', value: 58, unit: 'mg/dL', referenceMin: 40, referenceMax: 100, optimalMin: 50, optimalMax: 80, status: 'OTIMO', delta: 11.5, previousValue: 52 },
            { id: '108', biomarkerKey: 'TRIGLYCERIDES', biomarkerName: 'Triglicerídeos', category: 'LIPIDIOS', value: 95, unit: 'mg/dL', referenceMin: 0, referenceMax: 150, optimalMin: 40, optimalMax: 80, status: 'NORMAL', delta: -33.1, previousValue: 142 },
            { id: '109', biomarkerKey: 'VITAMIN_D', biomarkerName: '25-OH Vitamina D', category: 'VITAMINAS_MINERAIS', value: 48.5, unit: 'ng/mL', referenceMin: 20, referenceMax: 100, optimalMin: 40, optimalMax: 60, status: 'OTIMO', delta: 27.6, previousValue: 38.0 },
            { id: '110', biomarkerKey: 'TSH', biomarkerName: 'Hormônio Tireoestimulante (TSH)', category: 'TIREOIDE', value: 1.85, unit: 'mIU/L', referenceMin: 0.4, referenceMax: 4.5, optimalMin: 1.0, optimalMax: 2.0, status: 'OTIMO', delta: -2.6, previousValue: 1.90 },
            { id: '111', biomarkerKey: 'ALT', biomarkerName: 'TGP (ALT)', category: 'HEPATICO', value: 22, unit: 'U/L', referenceMin: 7, referenceMax: 56, optimalMin: 12, optimalMax: 25, status: 'OTIMO', delta: -12.0, previousValue: 25 },
            { id: '112', biomarkerKey: 'HS_CRP', biomarkerName: 'Proteína C Reativa (PCR-us)', category: 'INFLAMACAO', value: 0.45, unit: 'mg/L', referenceMin: 0, referenceMax: 3.0, optimalMin: 0, optimalMax: 0.5, status: 'OTIMO', delta: -43.7, previousValue: 0.80 },
          ],
        },
      ],
    });
  };

  const setDemoHistory = (key: string) => {
    const demos: Record<string, any[]> = {
      GLUCOSE: [
        { date: 'Jan 2025', value: 96, optimalMax: 86, refMax: 99 },
        { date: 'Jul 2025', value: 88, optimalMax: 86, refMax: 99 },
        { date: 'Jan 2026', value: 90, optimalMax: 86, refMax: 99 },
        { date: 'Jul 2026', value: 92, optimalMax: 86, refMax: 99 },
      ],
      LDL: [
        { date: 'Jan 2025', value: 135, optimalMax: 90, refMax: 130 },
        { date: 'Jul 2025', value: 115, optimalMax: 90, refMax: 130 },
        { date: 'Jul 2026', value: 88, optimalMax: 90, refMax: 130 },
      ],
      INSULIN: [
        { date: 'Jan 2025', value: 5.2, optimalMax: 5.0, refMax: 24.9 },
        { date: 'Jul 2025', value: 6.1, optimalMax: 5.0, refMax: 24.9 },
        { date: 'Jul 2026', value: 8.2, optimalMax: 5.0, refMax: 24.9 },
      ],
    };
    setHistoryData(demos[key] || demos.GLUCOSE);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const processUpload = async () => {
    if (!filePreview) return;
    setIsProcessing(true);
    try {
      const base64 = filePreview.split(',')[1];
      const mimeType = uploadFile?.type || 'image/jpeg';
      const res = await fetch(`${API_BASE}/lab-exams/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType, title: examTitle }),
        credentials: 'include',
      });
      if (res.ok) {
        setIsUploadOpen(false);
        setUploadFile(null);
        setFilePreview(null);
        fetchDashboardSummary();
      }
    } catch {
      // Ignore
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OTIMO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#4ade8015] border border-[#4ade8030] text-[#4ade80]">🟢 Ótimo</span>;
      case 'NORMAL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#38bdf815] border border-[#38bdf830] text-[#38bdf8]">🔵 Normal</span>;
      case 'ALTO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#fbbf2415] border border-[#fbbf2430] text-[#fbbf24]">🟡 Levemente Alto</span>;
      case 'CRITICO_ALTO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#f8717115] border border-[#f8717130] text-[#f87171]">🔴 Crítico Alto</span>;
      case 'BAIXO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#fbbf2415] border border-[#fbbf2430] text-[#fbbf24]">🟡 Levemente Baixo</span>;
      case 'CRITICO_BAIXO':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#f8717115] border border-[#f8717130] text-[#f87171]">🔴 Crítico Baixo</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] text-[#8a8f98] bg-[#16191e]">Normal</span>;
    }
  };

  const categoryLabels: Record<string, { label: string; icon: string }> = {
    METABOLICO: { label: 'Metabólico & Glicemia', icon: '⚡' },
    LIPIDIOS: { label: 'Perfil Lipídico & Cardiorrisco', icon: '🫀' },
    HEMOGRAMA: { label: 'Hemograma Completo', icon: '🩸' },
    TIREOIDE: { label: 'Hormônios Tireoidianos', icon: '🦋' },
    HEPATICO: { label: 'Função Hepática', icon: '🍃' },
    RENAL: { label: 'Função Renal', icon: '💧' },
    VITAMINAS_MINERAIS: { label: 'Vitaminas & Minerais', icon: '✨' },
    HORMONIOS: { label: 'Painel Hormonal', icon: '⚖️' },
    INFLAMACAO: { label: 'Marcadores Inflamatórios', icon: '🔥' },
  };

  const latestExam = summary?.recentExams?.[0];

  // Group results by category
  const groupedResults: Record<string, LabResultItem[]> = {};
  if (latestExam?.results) {
    latestExam.results.forEach((item) => {
      const cat = item.category || 'OUTROS';
      if (!groupedResults[cat]) groupedResults[cat] = [];
      groupedResults[cat].push(item);
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[#f7f8f8]">Laboratório Inteligente & Biomarcadores</h1>
            <span className="text-[10px] font-mono text-[#5e6ad2] bg-[#5e6ad215] border border-[#5e6ad230] px-2 py-0.5 rounded-full">
              Vision IA Active
            </span>
          </div>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Acompanhe o histórico de laudos, zonas funcionais e cálculo de idade biológica
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-xs font-medium shadow-lg shadow-[#5e6ad220] transition hover:scale-[1.02]"
        >
          <Upload className="w-4 h-4" />
          <span>Upload de Laudo / Foto</span>
        </button>
      </div>

      {/* ═══ SUMMARY CARDS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PhenoAge Card */}
        <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff12] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#5e6ad210] rounded-full blur-xl group-hover:bg-[#5e6ad220] transition"></div>
          <div className="flex items-center justify-between text-xs text-[#8a8f98]">
            <span>Idade Biológica (PhenoAge)</span>
            <Activity className="w-4 h-4 text-[#5e6ad2]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#f7f8f8] font-mono">
              {summary?.phenoAge ? `${summary.phenoAge} anos` : '31.4 anos'}
            </span>
            <span className="text-xs font-semibold text-[#4ade80] bg-[#4ade8015] px-1.5 py-0.5 rounded">
              -3.6 anos jovem
            </span>
          </div>
          <p className="text-[10px] text-[#8a8f98] mt-1">Calculado via Morgan Levine Algorithm (9 biomarcadores)</p>
        </div>

        {/* Total Biomarkers */}
        <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff12]">
          <div className="flex items-center justify-between text-xs text-[#8a8f98]">
            <span>Biomarcadores Mapeados</span>
            <FileText className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#f7f8f8] font-mono">{summary?.totalBiomarkers || 24}</span>
            <span className="text-xs text-[#8a8f98]">em {summary?.totalExams || 3} exames</span>
          </div>
          <p className="text-[10px] text-[#4ade80] mt-1">
            {summary?.optimalCount || 18} marcadores em zona ótima 🟢
          </p>
        </div>

        {/* Attention Items */}
        <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff12]">
          <div className="flex items-center justify-between text-xs text-[#8a8f98]">
            <span>Pontos de Atenção</span>
            <AlertTriangle className="w-4 h-4 text-[#fbbf24]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#fbbf24] font-mono">{summary?.attentionCount || 3}</span>
            <span className="text-xs text-[#8a8f98]">taxas fora da zona ótima</span>
          </div>
          <p className="text-[10px] text-[#8a8f98] mt-1">Requer ajuste de estilo de vida / dieta</p>
        </div>

        {/* Latest Exam Date */}
        <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff12]">
          <div className="flex items-center justify-between text-xs text-[#8a8f98]">
            <span>Último Exame Processado</span>
            <Calendar className="w-4 h-4 text-[#c084fc]" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-semibold text-[#f7f8f8] block truncate">
              {latestExam?.title || 'Hemograma + Perfil Lipídico'}
            </span>
            <span className="text-xs text-[#8a8f98]">
              {latestExam ? new Date(latestExam.examDate).toLocaleDateString('pt-BR') : '15/07/2026'} • {latestExam?.laboratory || 'Fleury'}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ METABOLIC PATTERNS & VITA IA INSIGHT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Metabolic Pattern Alerts */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-[#fbbf24]" />
            <span>Padrões Metabólicos Identificados</span>
          </h2>

          {summary?.recentPatterns?.map((pattern, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border space-y-1.5 ${
                pattern.severity === 'CRITICAL'
                  ? 'bg-[#f871710d] border-[#f8717130]'
                  : pattern.severity === 'WARNING'
                  ? 'bg-[#fbbf240d] border-[#fbbf2430]'
                  : 'bg-[#5e6ad20d] border-[#5e6ad230]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#f7f8f8]">{pattern.title}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded text-[#fbbf24] bg-[#fbbf2415]">
                  AI Detect
                </span>
              </div>
              <p className="text-[11px] text-[#8a8f98] leading-relaxed">{pattern.description}</p>
            </div>
          ))}
        </div>

        {/* Vita IA Executive Insight */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#0f1115] border border-[#ffffff12] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#5e6ad2] flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-semibold text-[#f7f8f8]">Interpretação Integrada Vita IA</h2>
            </div>
            <span className="text-[10px] text-[#8a8f98] font-mono">Comparação vs Exame Anterior</span>
          </div>

          <p className="text-xs text-[#8a8f98] leading-relaxed bg-[#16191e] p-3.5 rounded-lg border border-[#ffffff0a]">
            {latestExam?.aiInsight ||
              'Seus marcadores cardiovasculares apresentaram evolução significativa. O LDL-C reduziu de 115 para 88 mg/dL (-23.4%), enquanto o HDL subiu para 58 mg/dL. Atenção para a Insulina de Jejum que apresentou leve elevação (8.2 µIU/mL), sinalizando padrão inicial de resistência insulínica.'}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 bg-[#16191e] rounded border border-[#ffffff08]">
              <span className="text-[#8a8f98] block text-[10px]">Evolução do LDL</span>
              <span className="font-semibold text-[#4ade80] font-mono">-23.4% (88 mg/dL)</span>
            </div>
            <div className="p-2 bg-[#16191e] rounded border border-[#ffffff08]">
              <span className="text-[#8a8f98] block text-[10px]">Triglicerídeos</span>
              <span className="font-semibold text-[#4ade80] font-mono">-33.1% (95 mg/dL)</span>
            </div>
            <div className="p-2 bg-[#16191e] rounded border border-[#ffffff08]">
              <span className="text-[#8a8f98] block text-[10px]">Vitamina D</span>
              <span className="font-semibold text-[#38bdf8] font-mono">+27.6% (48.5 ng/mL)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ HIGH-STANDARD RECHARTS CHART FOR SELECTED BIOMARKER ═══ */}
      <div className="p-5 rounded-xl bg-[#0f1115] border border-[#ffffff12] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#5e6ad2]" />
              <span>Gráfico de Tendência Longitudinais</span>
            </h2>
            <p className="text-[11px] text-[#8a8f98]">Evolução temporal do biomarcador selecionado</p>
          </div>

          {/* Biomarker Selector Pills */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { key: 'GLUCOSE', label: 'Glicose' },
              { key: 'INSULIN', label: 'Insulina' },
              { key: 'LDL', label: 'LDL-C' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setSelectedBiomarker(item.key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  selectedBiomarker === item.key
                    ? 'bg-[#5e6ad2] text-white'
                    : 'bg-[#16191e] text-[#8a8f98] hover:text-[#f7f8f8]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* High Standard Area Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5e6ad2" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#5e6ad2" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
              <XAxis dataKey="date" stroke="#575c66" tick={{ fill: '#8a8f98', fontSize: 11 }} axisLine={false} />
              <YAxis stroke="#575c66" tick={{ fill: '#8a8f98', fontSize: 11 }} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#16191e', borderColor: '#ffffff12', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#f7f8f8', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="value" stroke="#5e6ad2" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ BIOMARKERS TABLE BY CATEGORY ═══ */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-[#f7f8f8]">Tabela Consolidada de Biomarcadores</h2>

        {Object.keys(groupedResults).map((cat) => {
          const items = groupedResults[cat];
          const isExpanded = expandedCategories[cat] ?? true;
          const catInfo = categoryLabels[cat] || { label: cat, icon: '📋' };

          return (
            <div key={cat} className="rounded-xl bg-[#0f1115] border border-[#ffffff12] overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full px-5 py-3.5 flex items-center justify-between bg-[#16191e] hover:bg-[#1d2127] transition border-b border-[#ffffff08]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{catInfo.icon}</span>
                  <span className="text-xs font-semibold text-[#f7f8f8]">{catInfo.label}</span>
                  <span className="text-[10px] text-[#8a8f98] font-mono bg-[#0f1115] px-2 py-0.5 rounded">
                    {items.length} taxas
                  </span>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-[#8a8f98]" /> : <ChevronDown className="w-4 h-4 text-[#8a8f98]" />}
              </button>

              {/* Biomarkers List */}
              {isExpanded && (
                <div className="divide-y divide-[#ffffff08]">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedBiomarker(item.biomarkerKey)}
                      className="px-5 py-3 flex items-center justify-between hover:bg-[#16191e50] cursor-pointer transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-[#f7f8f8]">{item.biomarkerName}</span>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-[10px] text-[#575c66] mt-0.5 font-mono">
                          Ref: {item.referenceMin ?? 0} - {item.referenceMax ?? '-'} {item.unit} | Ótimo: {item.optimalMin ?? '-'}-{item.optimalMax ?? '-'}
                        </p>
                      </div>

                      <div className="text-right space-y-0.5">
                        <div className="text-sm font-bold font-mono text-[#f7f8f8]">
                          {item.value} <span className="text-[10px] font-normal text-[#8a8f98]">{item.unit}</span>
                        </div>

                        {item.delta !== undefined && item.delta !== null && (
                          <div className="text-[10px] font-mono flex items-center justify-end gap-1">
                            {item.delta > 0 ? (
                              <span className="text-[#fbbf24] flex items-center"><TrendingUp className="w-3 h-3" /> +{item.delta}%</span>
                            ) : (
                              <span className="text-[#4ade80] flex items-center"><TrendingDown className="w-3 h-3" /> {item.delta}%</span>
                            )}
                            <span className="text-[#575c66]">vs anterior ({item.previousValue})</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ UPLOAD MODAL ═══ */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#0f1115] border border-[#ffffff12] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Upload de Laudo de Exame</h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-[#8a8f98] hover:text-[#f7f8f8]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#8a8f98]">
              Tire uma foto ou anexe o PDF do seu exame de sangue. A IA extrai e classifica todos os biomarcadores.
            </p>

            <input
              type="text"
              placeholder="Título (ex: Hemograma Fleury Julho 2026)"
              value={examTitle}
              onChange={(e) => setExamTitle(e.target.value)}
              className="w-full bg-[#16191e] border border-[#ffffff12] rounded-lg px-3 py-2 text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            />

            {!filePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#ffffff12] hover:border-[#5e6ad2] rounded-xl p-8 text-center cursor-pointer space-y-2 transition"
              >
                <Upload className="w-8 h-8 text-[#5e6ad2] mx-auto" />
                <span className="text-xs text-[#f7f8f8] block font-medium">Clique para selecionar foto ou PDF</span>
                <span className="text-[10px] text-[#575c66] block">JPG, PNG, PDF até 10MB</span>
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden border border-[#ffffff12]">
                  <img src={filePreview} alt="Exame preview" className="w-full h-40 object-cover" />
                  <button
                    onClick={() => { setUploadFile(null); setFilePreview(null); }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={processUpload}
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-xs font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Vision IA Processando Laudo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Processar com IA Vision</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
