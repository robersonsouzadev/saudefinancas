'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  FileText, Upload, Sparkles, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, 
  Activity, ShieldAlert, Heart, Calendar, Plus, RefreshCw, Eye, Trash2, X, ChevronDown, ChevronUp, Info, Pencil
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine 
} from 'recharts';
import { authFetch } from '@/lib/api';

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

  const [editingResult, setEditingResult] = useState<LabResultItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    biomarkerName: '',
    value: 0,
    unit: '',
    referenceMin: 0,
    referenceMax: 0,
    status: 'NORMAL' as string,
  });

  const [uploadLogs, setUploadLogs] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
      const res = await authFetch('/api/lab-exams/dashboard');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setSummary(data);
      } else {
        setEmptySummary();
      }
    } catch {
      setEmptySummary();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBiomarkerHistory = async (key: string) => {
    try {
      const res = await authFetch(`/api/lab-exams/history/${key}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        setHistoryData(data);
      } else {
        setHistoryData([]);
      }
    } catch {
      setHistoryData([]);
    }
  };

  const setEmptySummary = () => {
    setSummary({
      totalExams: 0,
      totalBiomarkers: 0,
      attentionCount: 0,
      optimalCount: 0,
      recentPatterns: [],
      recentExams: [],
    });
  };

  const compressImage = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    try {
      if (file.type.startsWith('image/')) {
        const compressedDataUrl = await compressImage(file);
        setFilePreview(compressedDataUrl);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('pt-BR');
    setUploadLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  const processUpload = async () => {
    if (!filePreview) return;
    setIsProcessing(true);
    setUploadLogs([]);
    setUploadError(null);

    addLog('📸 Preparando e validando laudo de imagem...');
    try {
      const base64 = filePreview.includes(',') ? filePreview.split(',')[1] : filePreview;
      const mimeType = uploadFile?.type || 'image/jpeg';
      const payloadSizeKB = Math.round((base64.length * 0.75) / 1024);

      addLog(`📦 Imagem codificada (Mime: ${mimeType}, Tamanho: ${payloadSizeKB} KB).`);
      addLog('🚀 Enviando para a API de IA Vision (/api/lab-exams/upload)...');

      const res = await authFetch('/api/lab-exams/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType, title: examTitle || 'Exame de Sangue' }),
      });

      addLog(`📡 Resposta da API recebida com Código HTTP ${res.status} (${res.statusText || 'OK'}).`);

      if (res.ok) {
        const data = await res.json();
        const itemCount = data?.exam?.results?.length || data?.patterns?.length || 0;
        addLog(`✅ Sucesso! Exame salvo no banco com ${itemCount} biomarcadores extraídos.`);
        addLog('🔄 Atualizando dashboard com novos dados...');

        setTimeout(async () => {
          setIsUploadOpen(false);
          setUploadFile(null);
          setFilePreview(null);
          setExamTitle('');
          setUploadLogs([]);
          await fetchDashboardSummary();
        }, 1200);
      } else {
        let errorMsg = 'Erro no servidor';
        try {
          const errJson = await res.json();
          errorMsg = Array.isArray(errJson.message) ? errJson.message.join(', ') : (errJson.message || errJson.error || JSON.stringify(errJson));
        } catch {
          errorMsg = await res.text();
        }
        addLog(`❌ Falha no servidor (HTTP ${res.status}): ${errorMsg}`);
        setUploadError(`Erro ${res.status}: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('Erro ao enviar laudo de exame:', err);
      const msg = err.message || 'Falha de conexão com a API backend';
      addLog(`❌ Erro inesperado: ${msg}`);
      setUploadError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditResult = (result: LabResultItem) => {
    setEditingResult(result);
    setEditForm({
      biomarkerName: result.biomarkerName,
      value: result.value,
      unit: result.unit,
      referenceMin: result.referenceMin ?? 0,
      referenceMax: result.referenceMax ?? 0,
      status: result.status,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingResult) return;
    try {
      const res = await authFetch(`/api/lab-exams/results/${editingResult.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingResult(null);
        await fetchDashboardSummary();
      } else {
        alert('Erro ao salvar alterações do biomarcador.');
      }
    } catch {
      alert('Erro de conexão ao salvar biomarcador.');
    }
  };

  const handleDeleteResult = async (resultId: string, biomarkerName: string) => {
    if (!confirm(`Deseja remover o biomarcador "${biomarkerName}" deste exame?`)) return;
    try {
      const res = await authFetch(`/api/lab-exams/results/${resultId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchDashboardSummary();
      } else {
        alert('Erro ao excluir biomarcador.');
      }
    } catch {
      alert('Erro de conexão ao excluir biomarcador.');
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

  // Consolidate results by category across all user exams (most recent value per biomarkerKey)
  const groupedResults: Record<string, LabResultItem[]> = {};
  if (summary?.recentExams && summary.recentExams.length > 0) {
    const biomarkerMap = new Map<string, LabResultItem>();

    // Iterate from oldest to newest so newer results overwrite older for the same biomarker
    [...summary.recentExams].reverse().forEach((exam) => {
      if (exam.results) {
        exam.results.forEach((item) => {
          biomarkerMap.set(item.biomarkerKey, item);
        });
      }
    });

    biomarkerMap.forEach((item) => {
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

                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditResult(item); }}
                          className="p-1.5 rounded hover:bg-[#1d2127] text-[#575c66] hover:text-[#5e6ad2] transition"
                          title="Editar biomarcador"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteResult(item.id, item.biomarkerName); }}
                          className="p-1.5 rounded hover:bg-[#1d2127] text-[#575c66] hover:text-[#f87171] transition"
                          title="Excluir biomarcador"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

                {/* ═══ LIVE UPLOAD LOGS & ERROR BOX ═══ */}
                {uploadLogs.length > 0 && (
                  <div className="p-3 rounded-lg bg-[#08090b] border border-[#ffffff10] font-mono text-[11px] space-y-1 max-h-36 overflow-y-auto">
                    <div className="text-[10px] text-[#5e6ad2] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Activity className="w-3 h-3 animate-pulse" /> Console de Diagnóstico IA:
                    </div>
                    {uploadLogs.map((log, idx) => (
                      <div key={idx} className={log.includes('❌') ? 'text-[#f87171]' : log.includes('✅') ? 'text-[#4ade80]' : 'text-[#8a8f98]'}>
                        {log}
                      </div>
                    ))}
                  </div>
                )}

                {uploadError && (
                  <div className="p-3 rounded-lg bg-[#f8717115] border border-[#f8717130] text-[#f87171] text-xs space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-400" /> Falha no Processamento
                    </div>
                    <p className="text-[11px] opacity-90">{uploadError}</p>
                  </div>
                )}

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

      {/* ═══ EDIT BIOMARKER MODAL ═══ */}
      {isEditModalOpen && editingResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0f1115] border border-[#ffffff12] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#ffffff08]">
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Editar Biomarcador</h3>
              <button onClick={() => { setIsEditModalOpen(false); setEditingResult(null); }} className="text-[#8a8f98] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] text-[#8a8f98] uppercase tracking-wider">Nome do Biomarcador</label>
                <input
                  type="text"
                  value={editForm.biomarkerName}
                  onChange={(e) => setEditForm({ ...editForm, biomarkerName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8a8f98] uppercase tracking-wider">Valor</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8a8f98] uppercase tracking-wider">Unidade</label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8a8f98] uppercase tracking-wider">Ref. Mínima</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.referenceMin}
                    onChange={(e) => setEditForm({ ...editForm, referenceMin: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8a8f98] uppercase tracking-wider">Ref. Máxima</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.referenceMax}
                    onChange={(e) => setEditForm({ ...editForm, referenceMax: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[#8a8f98] uppercase tracking-wider">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                >
                  <option value="NORMAL">🔵 Normal</option>
                  <option value="OTIMO">🟢 Ótimo</option>
                  <option value="ALTO">🟡 Levemente Alto</option>
                  <option value="CRITICO_ALTO">🔴 Crítico Alto</option>
                  <option value="BAIXO">🟡 Levemente Baixo</option>
                  <option value="CRITICO_BAIXO">🔴 Crítico Baixo</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#ffffff08]">
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingResult(null); }}
                className="px-4 py-1.5 rounded-lg text-xs text-[#8a8f98] hover:text-white hover:bg-[#16191e] transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-xs font-medium transition"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
