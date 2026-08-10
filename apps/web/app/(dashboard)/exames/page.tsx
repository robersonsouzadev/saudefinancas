'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileText, Upload, Sparkles, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, 
  Activity, ShieldAlert, Heart, Calendar, Plus, RefreshCw, Eye, Trash2, X, ChevronDown, ChevronUp, Info, Pencil,
  Target, Clock, Zap, BarChart3, ArrowUpRight, ArrowDownRight, Lightbulb, BookOpen
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
  ReferenceArea
} from 'recharts';
import { authFetch } from '@/lib/api';
import { getHealthTip } from './health-tips';

// ═══════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════

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
  missingPhenoAgeBiomarkers?: string[];
  providedPhenoAgeBiomarkers?: string[];
}

interface HealthScoreData {
  globalScore: number;
  trend: string;
  categoryScores: Record<string, { score: number; total: number; optimal: number; attention: number }>;
  topAttentionItems: any[];
  topImprovements: any[];
  nextCheckupDate: string;
}

interface AISummaryData {
  summary: string;
  goodNews: string[];
  attentionItems: string[];
  tips: Array<{ icon: string; title: string; description: string }>;
}

// ═══════════════════════════════════════════════════
// HEALTH SCORE RING COMPONENT
// ═══════════════════════════════════════════════════

function HealthScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  const getScoreColor = (s: number) => {
    if (s >= 91) return '#4ade80';
    if (s >= 71) return '#38bdf8';
    if (s >= 41) return '#fbbf24';
    return '#f87171';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 91) return 'Excelente';
    if (s >= 71) return 'Bom';
    if (s >= 41) return 'Atenção';
    return 'Crítico';
  };

  const color = getScoreColor(animatedScore);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background Ring */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#1a1d23" strokeWidth="10" fill="none"
        />
        {/* Score Ring */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth="10" fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s' }}
        />
        {/* Glow effect */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth="10" fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          opacity="0.3" filter="blur(6px)"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-mono" style={{ color }}>{animatedScore}</span>
        <span className="text-xs text-[#a1a1aa] font-medium">{getScoreLabel(animatedScore)}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// BIOMARKER GAUGE BAR COMPONENT
// ═══════════════════════════════════════════════════

function BiomarkerGaugeBar({ value, refMin, refMax, optMin, optMax, status }: {
  value: number; refMin?: number; refMax?: number; optMin?: number; optMax?: number; status: string;
}) {
  const min = Math.min(value, refMin ?? value, optMin ?? value) * 0.7;
  const max = Math.max(value, refMax ?? value, optMax ?? value) * 1.3;
  const range = max - min || 1;
  
  const toPercent = (v: number) => Math.max(0, Math.min(100, ((v - min) / range) * 100));
  
  const valuePos = toPercent(value);
  const refMinPos = refMin !== undefined ? toPercent(refMin) : 0;
  const refMaxPos = refMax !== undefined ? toPercent(refMax) : 100;
  
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'OTIMO': return '#4ade80';
      case 'NORMAL': return '#38bdf8';
      case 'BAIXO': return '#38bdf8';
      case 'ALTO': return '#fb923c';
      case 'CRITICO_BAIXO': return '#a855f7';
      case 'CRITICO_ALTO': return '#f87171';
      default: return '#cbd5e1';
    }
  };

  const color = getStatusColor(status);

  return (
    <div className="w-full h-3.5 sm:h-4 relative rounded-full overflow-hidden bg-[#181b22] border border-[#ffffff15] shadow-inner">
      {/* Critical low zone */}
      <div className="absolute h-full bg-[#38bdf815] rounded-l-full" style={{ left: '0%', width: `${refMinPos}%` }} />
      {/* Normal zone */}
      <div className="absolute h-full bg-[#4ade8020]" style={{ left: `${refMinPos}%`, width: `${refMaxPos - refMinPos}%` }} />
      {/* Critical high zone */}
      <div className="absolute h-full bg-[#f8717115] rounded-r-full" style={{ left: `${refMaxPos}%`, width: `${100 - refMaxPos}%` }} />
      {/* Reference borders */}
      <div className="absolute h-full w-0.5 bg-[#4ade8060]" style={{ left: `${refMinPos}%` }} />
      <div className="absolute h-full w-0.5 bg-[#4ade8060]" style={{ left: `${refMaxPos}%` }} />
      {/* Value marker */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-xl transition-all duration-700 z-10"
        style={{ 
          left: `${valuePos}%`, 
          transform: `translate(-50%, -50%)`,
          backgroundColor: color,
          boxShadow: `0 0 12px ${color}`,
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MINI SPARKLINE COMPONENT
// ═══════════════════════════════════════════════════

function MiniSparkline({ data, color = '#5e6ad2' }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  
  const width = 56;
  const height = 20;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="opacity-70">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════
// HEALTH TIP TOOLTIP COMPONENT
// ═══════════════════════════════════════════════════

function HealthTipTooltip({ biomarkerKey, biomarkerName, status, onClose }: { biomarkerKey: string; biomarkerName?: string; status: string; onClose: () => void }) {
  const tip = getHealthTip(biomarkerKey, biomarkerName);
  if (!tip) return null;

  const isAltered = status !== 'NORMAL' && status !== 'OTIMO';
  const explanation = status === 'ALTO' || status === 'CRITICO_ALTO' ? tip.whenHigh : tip.whenLow;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#0f1115] border border-[#ffffff15] rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#5e6ad220] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[#5e6ad2]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#f7f8f8]">{tip.name}</h3>
                <p className="text-xs text-[#a1a1aa]">Entenda seu resultado</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#a1a1aa] hover:text-white"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-3 rounded-lg bg-[#16191e] border border-[#ffffff08]">
            <p className="text-xs uppercase tracking-wider text-[#5e6ad2] font-semibold mb-1">O que é</p>
            <p className="text-xs text-[#c4c7cd] leading-relaxed">{tip.whatIs}</p>
          </div>

          {isAltered && (
            <div className={`p-3 rounded-lg border ${status.includes('CRITICO') ? 'bg-[#f871710d] border-[#f8717125]' : 'bg-[#fbbf240d] border-[#fbbf2425]'}`}>
              <p className="text-xs uppercase tracking-wider font-semibold mb-1" style={{ color: status.includes('CRITICO') ? '#f87171' : '#fbbf24' }}>
                {status === 'ALTO' || status === 'CRITICO_ALTO' ? '↑ Seu valor está alto' : '↓ Seu valor está baixo'}
              </p>
              <p className="text-xs text-[#c4c7cd] leading-relaxed">{explanation}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-[#4ade80] font-semibold flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Dicas para melhorar
            </p>
            {tip.tips.map((t, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#16191e] border border-[#ffffff06]">
                <p className="text-xs text-[#c4c7cd] leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════

export default function LabExamsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBiomarker, setSelectedBiomarker] = useState<string | null>('GLUCOSE');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScoreData | null>(null);
  const [aiSummary, setAISummary] = useState<AISummaryData | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    METABOLICO: true,
    LIPIDIOS: true,
    HEMOGRAMA: false,
    HORMONIOS: false,
    VITAMINAS_MINERAIS: false,
  });
  const [expandedGoodNews, setExpandedGoodNews] = useState(false);
  const [expandedAttention, setExpandedAttention] = useState(false);
  const [isPhenoInfoOpen, setIsPhenoInfoOpen] = useState(false);

  // Tooltip state
  const [activeTip, setActiveTip] = useState<{ key: string; name?: string; status: string } | null>(null);

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
    fetchHealthScore();
    fetchAISummary();
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
      if (res.ok) {
        const data = await res.json();
        if (data) setSummary(data);
      } else {
        console.warn('Dashboard summary respondeu com status não-OK:', res.status);
      }
    } catch (err) {
      console.error('Erro de conexão em fetchDashboardSummary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHealthScore = async () => {
    try {
      const res = await authFetch('/api/lab-exams/health-score');
      if (res.ok) {
        const data = await res.json();
        if (data) setHealthScore(data);
      }
    } catch (err) {
      console.error('Erro ao buscar health score:', err);
    }
  };

  const fetchAISummary = async () => {
    setIsLoadingAI(true);
    try {
      const res = await authFetch('/api/lab-exams/ai-summary');
      if (res.ok) {
        const data = await res.json();
        if (data) setAISummary(data);
      }
    } catch (err) {
      console.error('Erro ao buscar AI summary:', err);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const fetchBiomarkerHistory = async (key: string) => {
    try {
      const res = await authFetch(`/api/lab-exams/history/${key}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setHistoryData(data);
      }
    } catch (err) {
      console.error('Erro ao buscar histórico do biomarcador:', err);
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
          await fetchHealthScore();
          await fetchAISummary();
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
        await fetchHealthScore();
      } else {
        alert('Erro ao salvar alterações do biomarcador.');
      }
    } catch {
      alert('Erro de conexão ao salvar biomarcador.');
    }
  };

  const handleDeleteResult = async (resultId: string, biomarkerKey: string, biomarkerName: string) => {
    if (!confirm(`Deseja remover o biomarcador "${biomarkerName}" do seu histórico de exames?`)) return;

    // Optimistic UI update: remove biomarkerKey immediately from local summary state so row vanishes instantly
    setSummary((prevSummary: any) => {
      if (!prevSummary || !prevSummary.recentExams) return prevSummary;
      const updatedExams = prevSummary.recentExams.map((exam: any) => ({
        ...exam,
        results: (exam.results || []).filter((r: any) => r.biomarkerKey !== biomarkerKey && r.id !== resultId),
      }));
      return {
        ...prevSummary,
        recentExams: updatedExams,
        totalBiomarkers: Math.max(0, (prevSummary.totalBiomarkers || 1) - 1),
      };
    });

    try {
      const res = await authFetch(`/api/lab-exams/results/${resultId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchDashboardSummary();
        await fetchHealthScore();
      } else {
        alert('Erro ao excluir biomarcador.');
        await fetchDashboardSummary();
      }
    } catch {
      alert('Erro de conexão ao excluir biomarcador.');
      await fetchDashboardSummary();
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OTIMO':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#4ade8015] border border-[#4ade8040] text-[#4ade80]">🟢 Ótimo</span>;
      case 'NORMAL':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#38bdf815] border border-[#38bdf840] text-[#38bdf8]">🔵 Normal</span>;
      case 'ALTO':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#fb923c15] border border-[#fb923c40] text-[#fb923c]">🟧 Levemente Alto</span>;
      case 'CRITICO_ALTO':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#f8717115] border border-[#f8717140] text-[#f87171]">🔴 Crítico Alto</span>;
      case 'BAIXO':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#38bdf815] border border-[#38bdf840] text-[#38bdf8]">🔷 Levemente Baixo</span>;
      case 'CRITICO_BAIXO':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#a855f715] border border-[#a855f740] text-[#c084fc]">🟣 Crítico Baixo</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold text-[#cbd5e1] bg-[#16191e] border border-[#ffffff12]">Normal</span>;
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

  // Calculate client-side health score as fallback
  const clientHealthScore = useMemo(() => {
    if (healthScore) return healthScore.globalScore;
    if (!summary?.recentExams?.[0]?.results) return 0;
    const results = summary.recentExams[0].results;
    const total = results.length || 1;
    const optimal = results.filter(r => r.status === 'NORMAL' || r.status === 'OTIMO').length;
    return Math.round((optimal / total) * 100);
  }, [healthScore, summary]);

  const RADAR_SHORT_LABELS: Record<string, string> = {
    METABOLICO: 'Metabólico',
    LIPIDIOS: 'Lipídios',
    HEMOGRAMA: 'Hemograma',
    TIREOIDE: 'Tireoide',
    HEPATICO: 'Hepático',
    RENAL: 'Renal',
    VITAMINAS_MINERAIS: 'Vitaminas',
    HORMONIOS: 'Hormônios',
    INFLAMACAO: 'Inflamação',
  };

  // Build radar chart data from category scores
  const radarData = useMemo(() => {
    if (healthScore?.categoryScores) {
      return Object.entries(healthScore.categoryScores).map(([key, val]) => ({
        category: RADAR_SHORT_LABELS[key] || categoryLabels[key]?.label || key,
        score: val.score,
        fullMark: 100,
      }));
    }
    // Fallback: calculate from grouped results
    return Object.entries(groupedResults).map(([cat, items]) => {
      const total = items.length || 1;
      const optimal = items.filter(i => i.status === 'NORMAL' || i.status === 'OTIMO').length;
      return {
        category: RADAR_SHORT_LABELS[cat] || categoryLabels[cat]?.label || cat,
        score: Math.round((optimal / total) * 100),
        fullMark: 100,
      };
    });
  }, [healthScore, groupedResults]);

  // All biomarker keys for dynamic selector
  const allBiomarkers = useMemo(() => {
    const map = new Map<string, string>();
    if (summary?.recentExams) {
      summary.recentExams.forEach(exam => {
        exam.results?.forEach(r => {
          if (!map.has(r.biomarkerKey)) {
            map.set(r.biomarkerKey, r.biomarkerName);
          }
        });
      });
    }
    return Array.from(map.entries()).map(([key, name]) => ({ key, label: name }));
  }, [summary]);

  // Build sparkline data map: biomarkerKey → array of values
  const sparklineMap = useMemo(() => {
    const map = new Map<string, number[]>();
    if (summary?.recentExams && summary.recentExams.length > 1) {
      [...summary.recentExams].reverse().forEach(exam => {
        exam.results?.forEach(r => {
          if (!map.has(r.biomarkerKey)) map.set(r.biomarkerKey, []);
          map.get(r.biomarkerKey)!.push(r.value);
        });
      });
    }
    return map;
  }, [summary]);

  // Computed score
  const score = clientHealthScore;
  const trendValue = healthScore?.trend || (summary?.optimalCount ? `+${summary.optimalCount}` : '0');
  const nextCheckup = healthScore?.nextCheckupDate 
    ? new Date(healthScore.nextCheckupDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : latestExam 
      ? (() => { const d = new Date(latestExam.examDate); d.setMonth(d.getMonth() + 6); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); })()
      : '-';

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-semibold text-[#f7f8f8]">Laboratório Inteligente & Biomarcadores</h1>
            <span className="text-xs font-mono text-[#5e6ad2] bg-[#5e6ad215] border border-[#5e6ad230] px-2.5 py-0.5 rounded-full">
              Vision IA Active
            </span>
          </div>
          <p className="text-sm text-[#a1a1aa] mt-1">
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

      {/* ═══ HERO: HEALTH SCORE + 5 KPI CARDS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Health Score Ring Card */}
        <div className="col-span-2 sm:col-span-1 p-4 sm:p-5 rounded-xl bg-[#0f1115] border border-[#ffffff12] relative overflow-hidden group flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-[#5e6ad210] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <p className="text-xs sm:text-sm text-[#cbd5e1] uppercase tracking-wider font-bold mb-2">Health Score</p>
          <HealthScoreRing score={score} size={110} />
        </div>

        {/* PhenoAge Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#0f1115] border border-[#ffffff12] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-[#5e6ad210] rounded-full blur-xl group-hover:bg-[#5e6ad220] transition" />
          <div className="flex items-center justify-between text-xs sm:text-sm text-[#cbd5e1] font-semibold">
            <div className="flex items-center gap-1">
              <span>Idade Biológica</span>
              <button
                onClick={() => setIsPhenoInfoOpen(true)}
                title="O que é a Idade Biológica PhenoAge?"
                className="text-[#a1a1aa] hover:text-[#5e6ad2] transition"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <Activity className="w-4 h-4 text-[#5e6ad2]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-semibold text-[#f7f8f8] font-mono">
              {summary?.phenoAge ? `${summary.phenoAge}` : '--'}
            </span>
            <span className="text-xs text-[#cbd5e1] font-medium">anos</span>
          </div>
          {summary?.phenoAge && summary?.chronologicalAge ? (
            (() => {
              const diff = summary.chronologicalAge - summary.phenoAge;
              const isYounger = diff > 0;
              return (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded inline-block mt-2 ${
                    isYounger ? 'text-[#4ade80] bg-[#4ade8015] border border-[#4ade8030]' : 'text-[#fbbf24] bg-[#fbbf2415] border border-[#fbbf2430]'
                  }`}
                >
                  {isYounger ? `-${diff.toFixed(1)} anos mais jovem` : `+${Math.abs(diff).toFixed(1)} anos acima`}
                </span>
              );
            })()
          ) : (
            <button
              onClick={() => setIsPhenoInfoOpen(true)}
              className="text-xs font-semibold text-[#fbbf24] bg-[#fbbf2415] border border-[#fbbf2430] hover:bg-[#fbbf2425] px-2 py-0.5 rounded inline-flex items-center gap-1 mt-1 transition"
            >
              <span>Faltam {summary?.missingPhenoAgeBiomarkers?.length || 9} exames</span>
              <Info className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Total Biomarkers */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#0f1115] border border-[#ffffff12]">
          <div className="flex items-center justify-between text-xs sm:text-sm text-[#cbd5e1] font-semibold">
            <span>Biomarcadores</span>
            <BarChart3 className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-semibold text-[#f7f8f8] font-mono">{summary?.totalBiomarkers || 0}</span>
            <span className="text-xs text-[#cbd5e1] font-medium">em {summary?.totalExams || 0} exames</span>
          </div>
          {/* Progress bar: % optimal */}
          <div className="mt-2 w-full h-2 rounded-full bg-[#1a1d23] overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#4ade80] to-[#38bdf8] transition-all duration-1000"
              style={{ width: `${summary?.totalBiomarkers ? Math.round(((summary?.optimalCount || 0) / summary.totalBiomarkers) * 100) : 0}%` }}
            />
          </div>
          <p className="text-xs font-semibold text-[#4ade80] mt-1.5">
            {summary?.optimalCount || 0} em zona ótima 🟢
          </p>
        </div>

        {/* Attention Items */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#0f1115] border border-[#ffffff12]">
          <div className="flex items-center justify-between text-xs sm:text-sm text-[#cbd5e1] font-semibold">
            <span>Pontos Atenção</span>
            <Zap className="w-4 h-4 text-[#fbbf24]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-semibold text-[#fbbf24] font-mono">{summary?.attentionCount || 0}</span>
            <span className="text-xs text-[#cbd5e1] font-medium">fora da zona</span>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1">Requer ajuste de estilo de vida</p>
        </div>

        {/* Trend Card */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#0f1115] border border-[#ffffff12]">
          <div className="flex items-center justify-between text-xs sm:text-sm text-[#cbd5e1] font-semibold">
            <span>Tendência</span>
            <TrendingUp className="w-4 h-4 text-[#4ade80]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className={`text-lg sm:text-xl font-semibold font-mono ${String(trendValue).startsWith('-') ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
              {String(trendValue).startsWith('-') || String(trendValue).startsWith('+') ? trendValue : `+${trendValue}`}
            </span>
            <span className="text-xs text-[#cbd5e1] font-medium">pts</span>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1">vs exame anterior</p>
        </div>

        {/* Next Checkup */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#0f1115] border border-[#ffffff12]">
          <div className="flex items-center justify-between text-xs sm:text-sm text-[#cbd5e1] font-semibold">
            <span>Próximo Check-up</span>
            <Calendar className="w-4 h-4 text-[#c084fc]" />
          </div>
          <div className="mt-2">
            <span className="text-sm sm:text-base font-bold text-[#f7f8f8] block">{nextCheckup}</span>
            <span className="text-xs text-[#a1a1aa]">{latestExam?.laboratory || 'Laboratório'}</span>
          </div>
        </div>
      </div>

      {/* ═══ VITA IA EXPANDED CARD ═══ */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0f1115] via-[#111420] to-[#0f1115] border border-[#5e6ad220] shadow-lg shadow-[#5e6ad208] space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#5e6ad208] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#4ade8005] rounded-full blur-3xl" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5e6ad2] to-[#7c3aed] flex items-center justify-center text-white shadow-lg shadow-[#5e6ad230]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-semibold text-[#f7f8f8]">Vita IA — Seu Relatório de Saúde</h2>
              <p className="text-xs text-[#a1a1aa] mt-0.5">Resumo inteligente dos seus exames em linguagem simples</p>
            </div>
          </div>
          <span className="text-xs font-mono font-semibold text-[#818cf8] bg-[#5e6ad215] border border-[#5e6ad230] px-3 py-1 rounded-full">
            GPT-4o
          </span>
        </div>

        {/* AI Summary Text */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#16191e80] backdrop-blur-sm border border-[#ffffff12] relative z-10">
          {isLoadingAI ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-[#cbd5e1]">
              <RefreshCw className="w-4 h-4 animate-spin text-[#818cf8]" />
              <span>Vita IA analisando seus exames...</span>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-[#e2e8f0] leading-relaxed font-medium">
              {aiSummary?.summary || latestExam?.aiInsight || 'Envie um exame para receber sua análise personalizada pela Vita IA.'}
            </p>
          )}
        </div>

        {/* Three Columns: Good / Attention / Tips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 relative z-10">
          {/* ✅ Good News */}
          <div className="p-4 rounded-xl bg-[#4ade800a] border border-[#4ade8025] space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-[#4ade80] font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> O que está ótimo
                </p>
                {aiSummary?.goodNews && aiSummary.goodNews.length > 0 && (
                  <span className="text-xs font-bold text-[#4ade80] bg-[#4ade8015] px-2 py-0.5 rounded border border-[#4ade8030]">
                    {aiSummary.goodNews.length} marcadores
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {(() => {
                  const items = aiSummary?.goodNews || ['Carregando marcadores em nível ótimo...'];
                  const visible = expandedGoodNews ? items : items.slice(0, 4);
                  return (
                    <>
                      {visible.map((item, i) => (
                        <p key={i} className="text-xs sm:text-sm text-[#e2e8f0] flex items-start gap-2 leading-relaxed">
                          <span className="text-[#4ade80] shrink-0 font-bold">✓</span>
                          <span>{item}</span>
                        </p>
                      ))}
                      {items.length > 4 && (
                        <button
                          onClick={() => setExpandedGoodNews(!expandedGoodNews)}
                          className="text-xs font-bold text-[#4ade80] hover:underline mt-2 block"
                        >
                          {expandedGoodNews ? '▲ Recolher' : `▼ Ver todos (${items.length - 4} mais)`}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* ⚠️ Attention */}
          <div className="p-4 rounded-xl bg-[#fbbf240a] border border-[#fbbf2425] space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-[#fbbf24] font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Pontos de atenção
                </p>
                {aiSummary?.attentionItems && aiSummary.attentionItems.length > 0 && (
                  <span className="text-xs font-bold text-[#fbbf24] bg-[#fbbf2415] px-2 py-0.5 rounded border border-[#fbbf2430]">
                    {aiSummary.attentionItems.length} alertas
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {(() => {
                  const items = aiSummary?.attentionItems || ['Nenhum ponto de atenção no momento'];
                  const visible = expandedAttention ? items : items.slice(0, 4);
                  return (
                    <>
                      {visible.map((item, i) => (
                        <p key={i} className="text-xs sm:text-sm text-[#e2e8f0] flex items-start gap-2 leading-relaxed">
                          <span className="text-[#fbbf24] shrink-0 font-bold">⚠</span>
                          <span>{typeof item === 'string' ? item : `${item}`}</span>
                        </p>
                      ))}
                      {items.length > 4 && (
                        <button
                          onClick={() => setExpandedAttention(!expandedAttention)}
                          className="text-xs font-bold text-[#fbbf24] hover:underline mt-2 block"
                        >
                          {expandedAttention ? '▲ Recolher' : `▼ Ver todos (${items.length - 4} mais)`}
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* 💡 Tips */}
          <div className="p-4 rounded-xl bg-[#5e6ad20a] border border-[#5e6ad225] space-y-2.5">
            <p className="text-xs uppercase tracking-wider text-[#818cf8] font-bold flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-4 h-4" /> Dicas para melhorar
            </p>
            <div className="space-y-2.5">
              {(aiSummary?.tips || [
                { icon: '🥗', title: 'Alimentação', description: 'Aumente fibras e reduza açúcares' },
                { icon: '🏋️', title: 'Exercícios', description: 'Mantenha atividade física regular' },
                { icon: '😴', title: 'Sono', description: 'Garanta 7-8h de sono por noite' },
              ]).slice(0, 4).map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-base shrink-0">{tip.icon}</span>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-[#f7f8f8]">{tip.title}</p>
                    <p className="text-xs text-[#cbd5e1] leading-relaxed">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Recent Patterns & Radar Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Metabolic Patterns */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-[#fbbf24]" />
            <span>Padrões Metabólicos Identificados</span>
          </h2>

          {summary?.recentPatterns?.map((pattern, idx) => {
            const isCritical = pattern.severity === 'CRITICAL';
            const isWarning = pattern.severity === 'WARNING';

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border space-y-1.5 ${
                  isCritical
                    ? 'bg-[#f871710d] border-[#f8717130]'
                    : isWarning
                    ? 'bg-[#fbbf240d] border-[#fbbf2430]'
                    : 'bg-[#5e6ad20d] border-[#5e6ad230]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#f7f8f8]">{pattern.title}</span>
                  <span
                    className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                      isCritical
                        ? 'text-[#f87171] bg-[#f8717115]'
                        : isWarning
                        ? 'text-[#fbbf24] bg-[#fbbf2415]'
                        : 'text-[#60a5fa] bg-[#60a5fa15]'
                    }`}
                  >
                    {isCritical ? '🔴 Crítico' : isWarning ? '🟡 Atenção' : '🔵 Info'}
                  </span>
                </div>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">{pattern.description}</p>
              </div>
            );
          })}

          {(!summary?.recentPatterns || summary.recentPatterns.length === 0) && (
            <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff12] text-center">
              <p className="text-xs text-[#a1a1aa]">Nenhum padrão metabólico detectado</p>
            </div>
          )}
        </div>

        {/* Radar Chart: Category Health Overview */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#0f1115] border border-[#ffffff12] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#5e6ad2]" />
                <span>Visão Geral por Categoria</span>
              </h2>
              <p className="text-xs text-[#a1a1aa]">% de biomarcadores em zona ótima por sistema</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#ffffff20" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#cbd5e1', fontSize: 13, fontWeight: '600' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Radar
                    name="Score (%)"
                    dataKey="score"
                    stroke="#5e6ad2"
                    fill="#5e6ad2"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[#a1a1aa]">
                Envie exames para visualizar o radar de saúde
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ TREND CHART WITH REFERENCE ZONES ═══ */}
      <div className="p-5 rounded-xl bg-[#0f1115] border border-[#ffffff12] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#5e6ad2]" />
              <span>Gráfico de Tendência Longitudinal</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#cbd5e1] mt-0.5">Evolução temporal com zonas de referência</p>
          </div>

          {/* Dynamic Biomarker Selector */}
          <div className="flex flex-wrap gap-1.5 max-w-md">
            {(allBiomarkers.length > 0 ? allBiomarkers.slice(0, 8) : [
              { key: 'GLUCOSE', label: 'Glicose' },
              { key: 'INSULIN', label: 'Insulina' },
              { key: 'LDL', label: 'LDL-C' },
            ]).map((item) => (
              <button
                key={item.key}
                onClick={() => setSelectedBiomarker(item.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  selectedBiomarker === item.key
                    ? 'bg-[#5e6ad2] text-white shadow-sm'
                    : 'bg-[#16191e] text-[#cbd5e1] hover:text-[#f7f8f8] hover:bg-[#1f232b]'
                }`}
              >
                {item.label}
              </button>
            ))}
            {allBiomarkers.length > 8 && (
              <select
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-[#16191e] text-[#cbd5e1] border border-[#ffffff12] focus:outline-none focus:border-[#5e6ad2]"
                value={selectedBiomarker || ''}
                onChange={(e) => setSelectedBiomarker(e.target.value)}
              >
                <option value="" disabled>+ Mais...</option>
                {allBiomarkers.slice(8).map(b => (
                  <option key={b.key} value={b.key}>{b.label}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Area Chart with Reference Zones */}
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
              <XAxis dataKey="date" stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} />
              <YAxis stroke="#71717a" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#16191e', borderColor: '#ffffff12', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#f7f8f8', fontWeight: 'bold' }}
              />
              {/* Reference zone (green band) */}
              {historyData.length > 0 && historyData[0].refMin !== undefined && historyData[0].refMax !== undefined && (
                <ReferenceArea
                  y1={historyData[0].refMin}
                  y2={historyData[0].refMax}
                  fill="#4ade80"
                  fillOpacity={0.06}
                  strokeOpacity={0}
                />
              )}
              {historyData.length > 0 && historyData[0].refMin !== undefined && (
                <ReferenceLine y={historyData[0].refMin} stroke="#4ade8040" strokeDasharray="4 4" />
              )}
              {historyData.length > 0 && historyData[0].refMax !== undefined && (
                <ReferenceLine y={historyData[0].refMax} stroke="#4ade8040" strokeDasharray="4 4" />
              )}
              <Area type="monotone" dataKey="value" stroke="#5e6ad2" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" dot={{ r: 4, fill: '#5e6ad2', strokeWidth: 2, stroke: '#0f1115' }} activeDot={{ r: 6, fill: '#5e6ad2' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ BIOMARKERS TABLE BY CATEGORY ═══ */}
      <div className="space-y-3">
        <h2 className="text-xs sm:text-sm font-semibold text-[#f7f8f8]">Tabela Consolidada de Biomarcadores</h2>

        {Object.keys(groupedResults).map((cat) => {
          const items = groupedResults[cat];
          const isExpanded = expandedCategories[cat] ?? true;
          const catInfo = categoryLabels[cat] || { label: cat, icon: '📋' };
          const catOptimal = items.filter(i => i.status === 'NORMAL' || i.status === 'OTIMO').length;

          return (
            <div key={cat} className="rounded-xl bg-[#0f1115] border border-[#ffffff12] overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full px-4 py-3 flex items-center justify-between bg-[#16191e] hover:bg-[#1d2127] transition border-b border-[#ffffff08]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{catInfo.icon}</span>
                  <span className="text-xs sm:text-sm font-semibold text-[#f7f8f8]">{catInfo.label}</span>
                  <span className="text-[11px] font-mono text-[#a1a1aa] bg-[#0f1115] px-2 py-0.5 rounded border border-[#ffffff12]">
                    {catOptimal}/{items.length} ótimos
                  </span>
                  {/* Mini category progress */}
                  <div className="hidden sm:block w-16 h-1.5 rounded-full bg-[#1a1d23] overflow-hidden border border-[#ffffff10]">
                    <div className="h-full rounded-full bg-[#4ade80]" style={{ width: `${(catOptimal / items.length) * 100}%` }} />
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-[#a1a1aa]" /> : <ChevronDown className="w-4 h-4 text-[#a1a1aa]" />}
              </button>

              {/* Biomarkers List */}
              {isExpanded && (
                <div className="divide-y divide-[#ffffff08]">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedBiomarker(item.biomarkerKey)}
                      className="px-4 py-2.5 hover:bg-[#16191e50] cursor-pointer transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold text-[#f7f8f8]">{item.biomarkerName}</span>
                            {getStatusBadge(item.status)}
                            {/* Health tip button - 100% covered for all biomarkers */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveTip({ key: item.biomarkerKey, name: item.biomarkerName, status: item.status }); }}
                              className="px-2 py-0.5 rounded bg-[#5e6ad215] hover:bg-[#5e6ad230] border border-[#5e6ad230] text-[#818cf8] hover:text-white text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
                              title="Ver orientação e dicas de saúde para este biomarcador"
                            >
                              <Lightbulb className="w-3 h-3 text-[#fbbf24]" />
                              <span>Dicas</span>
                            </button>
                          </div>
                          {/* Gauge Bar */}
                          <div className="mt-1.5 w-full sm:max-w-xs">
                            <BiomarkerGaugeBar
                              value={item.value}
                              refMin={item.referenceMin}
                              refMax={item.referenceMax}
                              optMin={item.optimalMin}
                              optMax={item.optimalMax}
                              status={item.status}
                            />
                          </div>
                          <p className="text-[11px] font-mono text-[#a1a1aa] mt-1">
                            Ref: {item.referenceMin ?? 0} - {item.referenceMax ?? '-'} {item.unit}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 sm:ml-3 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-[#ffffff08]">
                          {/* Sparkline */}
                          {sparklineMap.has(item.biomarkerKey) && (
                            <MiniSparkline
                              data={sparklineMap.get(item.biomarkerKey)!}
                              color={
                                item.status === 'OTIMO' ? '#4ade80' :
                                item.status === 'NORMAL' ? '#38bdf8' :
                                item.status === 'BAIXO' ? '#38bdf8' :
                                item.status === 'ALTO' ? '#fb923c' :
                                item.status === 'CRITICO_BAIXO' ? '#a855f7' : '#f87171'
                              }
                            />
                          )}

                          <div className="text-right space-y-0.5">
                            <div className="text-xs sm:text-sm font-bold font-mono text-[#f7f8f8]">
                              {item.value} <span className="text-[11px] font-normal text-[#a1a1aa]">{item.unit}</span>
                            </div>

                            {item.delta !== undefined && item.delta !== null && (
                              <div className="text-[11px] font-mono flex items-center justify-end gap-1">
                                {item.delta > 0 ? (
                                  <span className="text-[#fbbf24] flex items-center"><TrendingUp className="w-3 h-3" /> +{item.delta}%</span>
                                ) : (
                                  <span className="text-[#4ade80] flex items-center"><TrendingDown className="w-3 h-3" /> {item.delta}%</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditResult(item); }}
                              className="p-1.5 rounded hover:bg-[#1d2127] text-[#71717a] hover:text-[#5e6ad2] transition"
                              title="Editar biomarcador"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteResult(item.id, item.biomarkerKey, item.biomarkerName); }}
                              className="p-1.5 rounded hover:bg-[#1d2127] text-[#71717a] hover:text-[#f87171] transition"
                              title="Excluir biomarcador"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="w-full max-w-md bg-[#0f1115] border border-[#ffffff12] rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Upload de Laudo de Exame</h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-[#a1a1aa] hover:text-[#f7f8f8] p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#a1a1aa]">
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
                <span className="text-xs text-[#71717a] block">JPG, PNG, PDF até 10MB</span>
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
                  <div className="p-3 rounded-lg bg-[#08090b] border border-[#ffffff10] font-mono text-xs space-y-1 max-h-36 overflow-y-auto">
                    <div className="text-xs text-[#5e6ad2] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Activity className="w-3 h-3 animate-pulse" /> Console de Diagnóstico IA:
                    </div>
                    {uploadLogs.map((log, idx) => (
                      <div key={idx} className={log.includes('❌') ? 'text-[#f87171]' : log.includes('✅') ? 'text-[#4ade80]' : 'text-[#a1a1aa]'}>
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
                    <p className="text-xs opacity-90">{uploadError}</p>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-[#0f1115] border border-[#ffffff12] rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#ffffff08]">
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Editar Biomarcador</h3>
              <button onClick={() => { setIsEditModalOpen(false); setEditingResult(null); }} className="text-[#a1a1aa] hover:text-white p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Nome do Biomarcador</label>
                <input
                  type="text"
                  value={editForm.biomarkerName}
                  onChange={(e) => setEditForm({ ...editForm, biomarkerName: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Valor</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Unidade</label>
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
                  <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Ref. Mínima</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.referenceMin}
                    onChange={(e) => setEditForm({ ...editForm, referenceMin: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Ref. Máxima</label>
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
                <label className="text-xs text-[#a1a1aa] uppercase tracking-wider">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                >
                  <option value="NORMAL">🔵 Normal</option>
                  <option value="OTIMO">🟢 Ótimo</option>
                  <option value="BAIXO">🔷 Levemente Baixo</option>
                  <option value="ALTO">🟧 Levemente Alto</option>
                  <option value="CRITICO_BAIXO">🟣 Crítico Baixo</option>
                  <option value="CRITICO_ALTO">🔴 Crítico Alto</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#ffffff08]">
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingResult(null); }}
                className="px-4 py-1.5 rounded-lg text-xs text-[#a1a1aa] hover:text-white hover:bg-[#16191e] transition"
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

      {/* ═══ HEALTH TIP TOOLTIP MODAL ═══ */}
      {activeTip && (
        <HealthTipTooltip
          biomarkerKey={activeTip.key}
          biomarkerName={activeTip.name}
          status={activeTip.status}
          onClose={() => setActiveTip(null)}
        />
      )}

      {/* ═══ PHENOAGE INFO & MISSING BIOMARKERS MODAL ═══ */}
      {isPhenoInfoOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#0f1115] border border-[#5e6ad230] shadow-2xl p-5 sm:p-6 space-y-5 text-xs text-[#c4c7cd] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#5e6ad215] border border-[#5e6ad230] flex items-center justify-center text-[#5e6ad2]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#f7f8f8]">Idade Biológica (PhenoAge)</h3>
                  <p className="text-xs text-[#a1a1aa]">Algoritmo Científico de Yale — Dra. Morgan Levine</p>
                </div>
              </div>
              <button
                onClick={() => setIsPhenoInfoOpen(false)}
                className="text-[#a1a1aa] hover:text-white transition p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="leading-relaxed">
                A <strong className="text-[#f7f8f8]">Idade Biológica</strong> mede o envelhecimento celular e a resiliência do seu corpo. Ao contrário da idade cronológica (da sua certidão), ela avalia o estresse imunológico, inflamatório, hepático e renal através de <strong className="text-[#5e6ad2]">9 biomarcadores de sangue essenciais</strong>.
              </p>

              <div className="p-3.5 rounded-xl bg-[#16191e] border border-[#ffffff0a] space-y-2">
                <h4 className="text-xs font-bold text-[#f7f8f8] flex items-center justify-between">
                  <span>Requisitos para o Cálculo ({summary?.providedPhenoAgeBiomarkers?.length || 0}/9)</span>
                  <span className="text-xs font-semibold text-[#fbbf24]">
                    {summary?.missingPhenoAgeBiomarkers?.length ? `Faltam ${summary.missingPhenoAgeBiomarkers.length}` : 'Completo 🎉'}
                  </span>
                </h4>

                <div className="space-y-1 pt-1">
                  {[
                    { name: 'Albumina', desc: 'Reserva proteica e saúde hepática' },
                    { name: 'Creatinina', desc: 'Função de filtração renal' },
                    { name: 'Glicose de Jejum', desc: 'Metabolismo glicêmico' },
                    { name: 'Proteína C-Reativa (PCR-us)', desc: 'Inflamação sistêmica de baixo grau' },
                    { name: 'Linfócitos (%)', desc: 'Imunidade e defesa celular' },
                    { name: 'VCM (Volume Corpuscular Médio)', desc: 'Tamanho das hemácias (Hemograma)' },
                    { name: 'RDW (Variabilidade de Hemácias)', desc: 'Estresse oxidativo e renovação sanguínea' },
                    { name: 'Fosfatase Alcalina', desc: 'Metabolismo ósseo e biliar' },
                    { name: 'Leucócitos (Glóbulos Brancos)', desc: 'Contagem imunológica total' },
                  ].map((req, idx) => {
                    const isProvided = summary?.providedPhenoAgeBiomarkers?.some(
                      (p) => p.toLowerCase().includes(req.name.toLowerCase().split(' ')[0])
                    );

                    return (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg flex items-center justify-between text-xs border ${
                          isProvided
                            ? 'bg-[#4ade800a] border-[#4ade8020] text-[#f7f8f8]'
                            : 'bg-[#fbbf240a] border-[#fbbf2420] text-[#a1a1aa]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="shrink-0">{isProvided ? '✅' : '❌'}</span>
                          <div>
                            <span className="font-semibold block">{req.name}</span>
                            <span className="text-xs text-[#a1a1aa]">{req.desc}</span>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isProvided ? 'text-[#4ade80] bg-[#4ade8015]' : 'text-[#fbbf24] bg-[#fbbf2415]'}`}>
                          {isProvided ? 'Enviado' : 'Pendente'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#5e6ad20a] border border-[#5e6ad220] text-xs text-[#a1a1aa]">
                💡 <strong className="text-[#f7f8f8]">Dica:</strong> Ao solicitar seu próximo exame de sangue de rotina, peça para seu médico incluir os biomarcadores pendentes para desbloquear a sua Idade Biológica PhenoAge.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsPhenoInfoOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-xs font-semibold transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
