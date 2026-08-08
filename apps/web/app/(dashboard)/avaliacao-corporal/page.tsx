'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Ruler,
  Plus,
  Scale,
  Activity,
  Flame,
  Droplets,
  HeartPulse,
  TrendingUp,
  Sparkles,
  Award,
  ChevronRight,
  Calendar,
  User,
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Target,
  BarChart3,
  GitCompare,
  History,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { useAuth } from '../../providers/AuthProvider';
import { authFetch } from '@/lib/api';
import { INDICATOR_CONFIGS, getTrendBadge } from './body-constants';

// ─── ANEL DE BODY SCORE ─────────────────────────────────────────
function BodyScoreRing({ score }: { score?: number }) {
  const displayScore = score !== undefined && score !== null ? score : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = score !== undefined && score !== null 
    ? circumference - (displayScore / 100) * circumference 
    : circumference;

  let scoreColor = '#4ade80'; // verde
  let label = 'Excelente';
  if (score === undefined || score === null) {
    scoreColor = '#8a8f98';
    label = 'Aguardando';
  } else if (score < 60) {
    scoreColor = '#f87171';
    label = 'Atenção';
  } else if (score < 75) {
    scoreColor = '#fbbf24';
    label = 'Bom';
  } else if (score >= 85) {
    scoreColor = '#60a5fa';
    label = 'Excepcional';
  }

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            className="stroke-[#ffffff0d]"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke={scoreColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${scoreColor}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold tracking-tight text-[#f7f8f8]">
            {score !== undefined && score !== null ? score : '--'}
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#8a8f98]">
            Body Score
          </span>
        </div>
      </div>
      <div
        className="mt-2 inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border"
        style={{
          color: scoreColor,
          borderColor: `${scoreColor}40`,
          backgroundColor: `${scoreColor}10`,
        }}
      >
        <Sparkles className="w-3 h-3" />
        <span>{label}</span>
      </div>
    </div>
  );
}

// ─── GAUGE ARC SEMICIRCULAR ─────────────────────────────────────
function BioGaugeArc({
  value,
  min,
  max,
  label,
  unit = '',
  statusText = 'Sem dados',
  color = '#4ade80',
}: {
  value?: number | null;
  min: number;
  max: number;
  label: string;
  unit?: string;
  statusText?: string;
  color?: string;
}) {
  const hasValue = value !== undefined && value !== null;
  const numValue = hasValue ? value : min;
  const percent = hasValue ? Math.max(0, Math.min(100, ((numValue - min) / (max - min)) * 100)) : 0;
  const angle = -180 + (percent / 100) * 180;
  const gaugeColor = hasValue ? color : '#575c66';

  return (
    <div className="linear-card p-4 flex flex-col items-center justify-between text-center relative overflow-hidden">
      <span className="text-xs font-medium text-[#8a8f98] mb-1">{label}</span>

      <div className="relative w-40 h-20 overflow-hidden my-2 flex justify-center">
        {/* Arc Background */}
        <svg className="w-40 h-40" viewBox="0 0 100 100">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#ffffff12"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={gaugeColor}
            strokeWidth="10"
            strokeDasharray="126"
            strokeDashoffset={126 - (percent / 100) * 126}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Pointer Needle */}
        <div
          className="absolute bottom-0 w-1 h-12 bg-white rounded-full origin-bottom transition-transform duration-1000"
          style={{
            transform: `rotate(${angle}deg)`,
            boxShadow: '0 0 6px rgba(255,255,255,0.8)',
          }}
        />
      </div>

      <div className="mt-1">
        <div className="text-xl font-bold text-[#f7f8f8]">
          {hasValue ? value : '--'} <span className="text-xs font-normal text-[#8a8f98]">{hasValue ? unit : ''}</span>
        </div>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-1"
          style={{ color: gaugeColor, backgroundColor: `${gaugeColor}15` }}
        >
          {hasValue ? statusText : 'Aguardando medição'}
        </span>
      </div>
    </div>
  );
}

// ─── DASHBOARD PRINCIPAL DE AVALIAÇÃO CORPORAL ──────────────────
export default function BodyAssessmentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'charts' | 'compare' | 'history' | 'goals'
  >('dashboard');
  const [summary, setSummary] = useState<any>(null);
  const [evolution, setEvolution] = useState<any[]>([]);
  const [allAssessments, setAllAssessments] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modais
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comparação
  const [compareId1, setCompareId1] = useState<string>('');
  const [compareId2, setCompareId2] = useState<string>('');
  const [compareData, setCompareData] = useState<any>(null);

  // Função para obter o formulário limpo para nova avaliação
  const getEmptyFormData = () => ({
    assessmentDate: new Date().toISOString().split('T')[0],
    assessorName: '',
    equipmentName: '',
    notes: '',
    weightKg: '',
    heightCm: user?.heightCm || '',
    age: '',
    sex: 'MASCULINO',
    waistCm: '',
    bodyFatPercent: '',
    fatMassKg: '',
    leanMassKg: '',
    skeletalMuscleMassKg: '',
    totalBodyWaterL: '',
    totalBodyWaterPercent: '',
    leanMassWaterPercent: '',
    hydrationIndex: '',
    intracellularWaterL: '',
    intracellularWaterPercent: '',
    extracellularWaterL: '',
    extracellularWaterPercent: '',
    basalMetabolicRate: '',
    phaseAngle: '',
    cellularAge: '',
    updateUserProfileHeight: false,
  });

  // Estado do formulário Nova Avaliação
  const [formData, setFormData] = useState<any>(getEmptyFormData());

  // Estado do formulário Nova Meta
  const [goalFormData, setGoalFormData] = useState({
    indicator: 'bodyFatPercent',
    targetValue: 18.0,
    unit: '%',
    deadlineMonths: 3,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, evoRes, allRes, goalsRes] = await Promise.all([
        authFetch('/api/body-assessments/dashboard'),
        authFetch('/api/body-assessments/evolution'),
        authFetch('/api/body-assessments'),
        authFetch('/api/body-assessments/goals'),
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (evoRes.ok) setEvolution(await evoRes.json());
      if (allRes.ok) {
        const list = await allRes.json();
        setAllAssessments(list);
        if (list.length >= 2) {
          setCompareId1(list[1].id);
          setCompareId2(list[0].id);
        }
      }
      if (goalsRes.ok) setGoals(await goalsRes.json());
    } catch (err) {
      console.error('Erro ao carregar avaliação corporal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/body-assessments', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsNewModalOpen(false);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Erro ao criar avaliação:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/body-assessments/goals', {
        method: 'POST',
        body: JSON.stringify(goalFormData),
      });
      if (res.ok) {
        setIsGoalModalOpen(false);
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Erro ao criar meta:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompare = async () => {
    if (!compareId1 || !compareId2) return;
    try {
      const res = await authFetch(
        `/api/body-assessments/compare?id1=${compareId1}&id2=${compareId2}`
      );
      if (res.ok) {
        setCompareData(await res.json());
      }
    } catch (err) {
      console.error('Erro ao comparar:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'compare') {
      handleCompare();
    }
  }, [activeTab, compareId1, compareId2]);

  const latest = summary?.latest;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#3b82f6] animate-spin" />
          <span className="text-sm text-[#8a8f98]">Carregando Bioimpedância & Composição...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── HEADER BAR ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-[#f7f8f8] tracking-tight">Avaliação Corporal</h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#3b82f615] text-[#3b82f6] border border-[#3b82f630]">
              Bioimpedância 3D
            </span>
          </div>
          <p className="text-xs text-[#8a8f98] mt-1">
            {latest
              ? `Última avaliação: ${new Date(latest.assessmentDate).toLocaleDateString('pt-BR')} • Avaliador: ${latest.assessorName || 'Profissional'}`
              : 'Nenhuma avaliação cadastrada ainda.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setFormData(getEmptyFormData());
              setIsNewModalOpen(true);
            }}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold shadow-lg shadow-[#3b82f620] transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Avaliação</span>
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#16191e] hover:bg-[#22272f] border border-[#ffffff15] text-xs font-medium text-[#f7f8f8] transition"
          >
            <GitCompare className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>Comparar</span>
          </button>
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#16191e] hover:bg-[#22272f] border border-[#ffffff15] text-xs font-medium text-[#f7f8f8] transition"
          >
            <Target className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>Meta</span>
          </button>
        </div>
      </div>

      {/* ─── TABS DE NAVEGAÇÃO INTERNA ───────────────────────────── */}
      <div className="flex space-x-1 border-b border-[#ffffff0e] text-xs font-medium">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'dashboard'
              ? 'border-[#3b82f6] text-[#3b82f6]'
              : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Visão Geral</span>
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'charts'
              ? 'border-[#3b82f6] text-[#3b82f6]'
              : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8]'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Gráficos de Evolução</span>
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'compare'
              ? 'border-[#3b82f6] text-[#3b82f6]'
              : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8]'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>Comparar (A vs B)</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'history'
              ? 'border-[#3b82f6] text-[#3b82f6]'
              : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Timeline ({allAssessments.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: VISÃO GERAL (DASHBOARD) ───────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Hero Row: Body Score + 6 Top KPI Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="linear-card p-4 flex flex-col items-center justify-center bg-gradient-to-b from-[#16191e] to-[#0f1115]">
              <BodyScoreRing score={summary?.bodyScore || 70} />
              <span className="text-[11px] text-[#8a8f98] text-center px-4 mt-1">
                Score baseado no percentual de gordura, RCEst, hidratação e ângulo de fase.
              </span>
            </div>

            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* KPI 1: Peso */}
              <div className="linear-card p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8a8f98]">Peso Corporal</span>
                  <Scale className="w-4 h-4 text-[#60a5fa]" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-bold text-[#f7f8f8]">{latest?.weightKg || '--'}</span>
                  <span className="text-xs text-[#8a8f98] ml-1">kg</span>
                </div>
                {latest?.deltaWeight !== undefined && (
                  <div className="flex items-center space-x-1">
                    <span className="text-[11px] font-medium text-[#4ade80] bg-[#4ade8015] px-1.5 py-0.5 rounded">
                      {latest.deltaWeight > 0 ? `+${latest.deltaWeight}` : latest.deltaWeight} kg
                    </span>
                    <span className="text-[10px] text-[#575c66]">vs anterior</span>
                  </div>
                )}
              </div>

              {/* KPI 2: % Gordura */}
              <div className="linear-card p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8a8f98]">Gordura Corporal</span>
                  <Activity className="w-4 h-4 text-[#f472b6]" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-bold text-[#f7f8f8]">
                    {latest?.bodyFatPercent || '--'}
                  </span>
                  <span className="text-xs text-[#8a8f98] ml-1">%</span>
                </div>
                {latest?.deltaFatPercent !== undefined && (
                  <div className="flex items-center space-x-1">
                    <span className="text-[11px] font-medium text-[#4ade80] bg-[#4ade8015] px-1.5 py-0.5 rounded">
                      {latest.deltaFatPercent > 0 ? `+${latest.deltaFatPercent}` : latest.deltaFatPercent} pp
                    </span>
                    <span className="text-[10px] text-[#575c66]">({latest.fatMassKg} kg)</span>
                  </div>
                )}
              </div>

              {/* KPI 3: Massa Muscular */}
              <div className="linear-card p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8a8f98]">Massa Muscular</span>
                  <TrendingUp className="w-4 h-4 text-[#4ade80]" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-bold text-[#f7f8f8]">
                    {latest?.skeletalMuscleMassKg || '--'}
                  </span>
                  <span className="text-xs text-[#8a8f98] ml-1">kg</span>
                </div>
                {latest?.deltaMuscleMass !== undefined && (
                  <div className="flex items-center space-x-1">
                    <span className="text-[11px] font-medium text-[#4ade80] bg-[#4ade8015] px-1.5 py-0.5 rounded">
                      {latest.deltaMuscleMass > 0 ? `+${latest.deltaMuscleMass}` : latest.deltaMuscleMass} kg
                    </span>
                    <span className="text-[10px] text-[#575c66]">({latest.skeletalMusclePercent}%)</span>
                  </div>
                )}
              </div>

              {/* KPI 4: Massa Magra Total */}
              <div className="linear-card p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8a8f98]">Massa Magra</span>
                  <Layers className="w-4 h-4 text-[#a78bfa]" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-bold text-[#f7f8f8]">
                    {latest?.leanMassKg || '--'}
                  </span>
                  <span className="text-xs text-[#8a8f98] ml-1">kg</span>
                </div>
                <div className="text-[11px] text-[#8a8f98]">
                  {latest?.leanMassPercent ? `${latest.leanMassPercent}% do peso` : '--'}
                </div>
              </div>

              {/* KPI 5: IMC */}
              <div className="linear-card p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8a8f98]">IMC (Padrão OMS)</span>
                  <Activity className="w-4 h-4 text-[#fbbf24]" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-bold text-[#f7f8f8]">{latest?.bmi || '--'}</span>
                  <span className="text-xs text-[#8a8f98] ml-1">kg/m²</span>
                </div>
                <span className="text-[11px] text-[#fbbf24] bg-[#fbbf2415] px-1.5 py-0.5 rounded w-fit">
                  {latest?.bmi ? (latest.bmi >= 25 ? 'Sobrepeso' : 'Eutrófico') : '--'}
                </span>
              </div>

              {/* KPI 6: Cintura & RCEst */}
              <div className="linear-card p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#8a8f98]">Cintura & RCEst</span>
                  <Ruler className="w-4 h-4 text-[#3b82f6]" />
                </div>
                <div className="my-2">
                  <span className="text-2xl font-bold text-[#f7f8f8]">
                    {latest?.waistCm || '--'}
                  </span>
                  <span className="text-xs text-[#8a8f98] ml-1">cm</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#8a8f98]">RCEst:</span>
                  <span className="font-bold text-[#3b82f6]">{latest?.waistHeightRatio || '--'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Semicircular BioGauges Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <BioGaugeArc
              label="Índice de Hidratação"
              value={latest?.hydrationIndex || 3.9}
              min={1.9}
              max={6.2}
              statusText="Euhidratado (Saudável)"
              color="#4ade80"
            />
            <BioGaugeArc
              label="Ângulo de Fase (°)"
              value={latest?.phaseAngle || 8.9}
              min={4.0}
              max={10.2}
              statusText="Excelente Integridade"
              color="#3b82f6"
            />
            <BioGaugeArc
              label="Razão Músculo / Gordura"
              value={latest?.muscleFatRatio || 1.9}
              min={0.3}
              max={4.5}
              unit="kg/kg"
              statusText="Atlético / Protegido"
              color="#4ade80"
            />
            <BioGaugeArc
              label="Relação Cintura/Estatura"
              value={latest?.waistHeightRatio || 0.54}
              min={0.3}
              max={0.8}
              statusText="Risco Aumentado (Meta: <0,50)"
              color="#fbbf24"
            />
          </div>

          {/* Idade Celular & Seção de Hidratação Avançada */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <CellularAgeCard
                cronologicalAge={latest?.age || 46}
                cellularAge={latest?.cellularAge || 40}
                phaseAngle={latest?.phaseAngle || 8.9}
              />
            </div>

            <div className="lg:col-span-2 linear-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Droplets className="w-5 h-5 text-[#60a5fa]" />
                  <h4 className="text-sm font-semibold text-[#f7f8f8]">Análise de Água Corporal</h4>
                </div>
                <span className="text-xs text-[#8a8f98]">
                  Total: <strong className="text-[#f7f8f8]">{latest?.totalBodyWaterL || 46.1} L</strong> ({latest?.totalBodyWaterPercent || 57.1}%)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#080a0c] border border-[#ffffff0a]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#8a8f98]">Água Intracelular (ICW)</span>
                    <span className="text-xs font-bold text-[#60a5fa]">{latest?.intracellularWaterPercent || 59.2}%</span>
                  </div>
                  <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-[#60a5fa] h-full rounded-full"
                      style={{ width: `${latest?.intracellularWaterPercent || 59.2}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#8a8f98]">{latest?.intracellularWaterL || 27.3} Litros em células musculares e tecidos</span>
                </div>

                <div className="p-4 rounded-lg bg-[#080a0c] border border-[#ffffff0a]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#8a8f98]">Água Extracelular (ECW)</span>
                    <span className="text-xs font-bold text-[#a78bfa]">{latest?.extracellularWaterPercent || 40.8}%</span>
                  </div>
                  <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-[#a78bfa] h-full rounded-full"
                      style={{ width: `${latest?.extracellularWaterPercent || 40.8}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#8a8f98]">{latest?.extracellularWaterL || 18.8} Litros em plasma e fluidos livres</span>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-[#3b82f60a] border border-[#3b82f620] flex items-center justify-between text-xs">
                <span className="text-[#8a8f98]">Água na Massa Magra (FFM Hydration):</span>
                <span className="font-bold text-[#60a5fa]">{latest?.leanMassWaterPercent || 72.9}% (Faixa Ideal: 72% - 74%)</span>
              </div>
            </div>
          </div>

          {/* Seção de Metas Corporal */}
          {goals.length > 0 && (
            <div className="linear-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Target className="w-5 h-5 text-[#4ade80]" />
                  <h4 className="text-sm font-semibold text-[#f7f8f8]">Metas de Composição Corporal</h4>
                </div>
                <button
                  onClick={() => setIsGoalModalOpen(true)}
                  className="text-xs text-[#3b82f6] hover:underline"
                >
                  + Adicionar Meta
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((g: any) => {
                  const conf = INDICATOR_CONFIGS[g.indicator] || { name: g.indicator, unit: g.unit };
                  const currentVal = latest ? latest[g.indicator] : g.currentValue;
                  const progress = currentVal ? Math.min(100, Math.round((currentVal / g.targetValue) * 100)) : 50;

                  return (
                    <div key={g.id} className="p-3.5 rounded-lg bg-[#080a0c] border border-[#ffffff0a]">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-medium text-[#f7f8f8]">{conf.name}</span>
                        <span className="text-[#8a8f98]">
                          Atual: <strong className="text-[#f7f8f8]">{currentVal || '--'} {g.unit}</strong> → Meta: <strong className="text-[#4ade80]">{g.targetValue} {g.unit}</strong>
                        </span>
                      </div>
                      <div className="w-full bg-[#16191e] h-2.5 rounded-full overflow-hidden mb-1">
                        <div
                          className="bg-[#4ade80] h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-[#575c66]">
                        <span>Prazo: {g.deadlineMonths ? `${g.deadlineMonths} meses` : 'Livre'}</span>
                        <span>{progress}% da meta atingido</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: GRÁFICOS DE EVOLUÇÃO ─────────────────────────── */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Evolução do Peso & Gordura */}
            <div className="linear-card p-5">
              <h4 className="text-sm font-semibold text-[#f7f8f8] mb-1">Evolução do Peso & % Gordura</h4>
              <p className="text-xs text-[#8a8f98] mb-4">Acompanhamento temporal de perda lipídica</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                    <XAxis dataKey="date" stroke="#575c66" fontSize={11} />
                    <YAxis stroke="#575c66" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#16191e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '6px' }}
                    />
                    <Area type="monotone" dataKey="weightKg" name="Peso (kg)" stroke="#60a5fa" fill="#60a5fa15" strokeWidth={2} />
                    <Area type="monotone" dataKey="bodyFatPercent" name="Gordura (%)" stroke="#f472b6" fill="#f472b615" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Massa Muscular vs Massa Magra */}
            <div className="linear-card p-5">
              <h4 className="text-sm font-semibold text-[#f7f8f8] mb-1">Massa Muscular vs Massa Magra</h4>
              <p className="text-xs text-[#8a8f98] mb-4">Preservação muscular durante o processo</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                    <XAxis dataKey="date" stroke="#575c66" fontSize={11} />
                    <YAxis stroke="#575c66" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#16191e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '6px' }}
                    />
                    <Area type="monotone" dataKey="leanMassKg" name="Massa Magra (kg)" stroke="#a78bfa" fill="#a78bfa15" strokeWidth={2} />
                    <Area type="monotone" dataKey="skeletalMuscleMassKg" name="Muscular (kg)" stroke="#4ade80" fill="#4ade8015" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 3: Ângulo de Fase (Vitalidade Celular) */}
            <div className="linear-card p-5">
              <h4 className="text-sm font-semibold text-[#f7f8f8] mb-1">Evolução do Ângulo de Fase (°)</h4>
              <p className="text-xs text-[#8a8f98] mb-4">Integridade de membrana celular (Valores &gt; 6.5° ideal)</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                    <XAxis dataKey="date" stroke="#575c66" fontSize={11} />
                    <YAxis stroke="#575c66" fontSize={11} domain={[4, 11]} />
                    <ReferenceLine y={6.5} stroke="#4ade80" strokeDasharray="3 3" label={{ value: 'Ideal (6.5°)', fill: '#4ade80', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#16191e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '6px' }}
                    />
                    <Line type="monotone" dataKey="phaseAngle" name="Ângulo de Fase (°)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 4: RCEst (Relação Cintura / Estatura) */}
            <div className="linear-card p-5">
              <h4 className="text-sm font-semibold text-[#f7f8f8] mb-1">Relação Cintura / Estatura (RCEst)</h4>
              <p className="text-xs text-[#8a8f98] mb-4">Indicador de risco cardiometabólico (Manter &lt; 0,50)</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                    <XAxis dataKey="date" stroke="#575c66" fontSize={11} />
                    <YAxis stroke="#575c66" fontSize={11} domain={[0.3, 0.8]} />
                    <ReferenceArea y1={0.4} y2={0.49} fill="#4ade8010" />
                    <ReferenceLine y={0.5} stroke="#fbbf24" strokeDasharray="3 3" label={{ value: 'Limite Risco (0.50)', fill: '#fbbf24', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#16191e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '6px' }}
                    />
                    <Line type="monotone" dataKey="waistHeightRatio" name="RCEst" stroke="#fbbf24" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: COMPARAÇÃO (A VS B) ──────────────────────────── */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          <div className="linear-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <label className="text-xs text-[#8a8f98] block mb-1">Avaliação Anterior (A):</label>
              <select
                value={compareId1}
                onChange={(e) => setCompareId1(e.target.value)}
                className="bg-[#080a0c] border border-[#ffffff15] text-xs rounded-lg px-3 py-2 text-[#f7f8f8] w-full sm:w-64"
              >
                {allAssessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.assessmentDate).toLocaleDateString('pt-BR')} — {a.weightKg} kg
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-bold text-[#3b82f6]">VS</span>

            <div className="w-full sm:w-auto">
              <label className="text-xs text-[#8a8f98] block mb-1">Avaliação Mais Recente (B):</label>
              <select
                value={compareId2}
                onChange={(e) => setCompareId2(e.target.value)}
                className="bg-[#080a0c] border border-[#ffffff15] text-xs rounded-lg px-3 py-2 text-[#f7f8f8] w-full sm:w-64"
              >
                {allAssessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.assessmentDate).toLocaleDateString('pt-BR')} — {a.weightKg} kg
                  </option>
                ))}
              </select>
            </div>
          </div>

          {compareData && compareData.current && (
            <div className="linear-card overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#16191e] border-b border-[#ffffff0e] text-[#8a8f98] font-medium">
                  <tr>
                    <th className="p-3.5">Indicador</th>
                    <th className="p-3.5">Anterior (A)</th>
                    <th className="p-3.5">Atual (B)</th>
                    <th className="p-3.5">Diferença</th>
                    <th className="p-3.5 text-right">Tendência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff0a]">
                  {Object.entries(INDICATOR_CONFIGS).map(([key, config]) => {
                    const valA = compareData.previous ? compareData.previous[key] : null;
                    const valB = compareData.current[key];
                    if (valB === undefined || valB === null) return null;

                    const delta = valA !== null && valA !== undefined ? parseFloat((valB - valA).toFixed(1)) : null;
                    const badge = getTrendBadge(delta, config.isHigherBetter);

                    return (
                      <tr key={key} className="hover:bg-[#ffffff05] transition">
                        <td className="p-3.5 font-medium text-[#f7f8f8]">
                          {config.name}
                        </td>
                        <td className="p-3.5 text-[#8a8f98]">
                          {valA !== null && valA !== undefined ? `${valA} ${config.unit}` : '—'}
                        </td>
                        <td className="p-3.5 font-bold text-[#f7f8f8]">
                          {valB} {config.unit}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${badge.color} ${badge.bg}`}>
                            {badge.text} {config.unit}
                          </span>
                        </td>
                        <td className="p-3.5 text-right text-base">
                          {badge.icon}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: TIMELINE (HISTÓRICO) ─────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {allAssessments.map((a, idx) => (
            <div key={a.id} className="linear-card p-5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-[#ffffff0e]">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-[#3b82f615] border border-[#3b82f630] flex items-center justify-center text-[#3b82f6] font-bold text-xs">
                    #{allAssessments.length - idx}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#f7f8f8]">
                      {new Date(a.assessmentDate).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(a.assessmentDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </h4>
                    <span className="text-xs text-[#8a8f98]">Avaliador: {a.assessorName || 'Profissional'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs text-[#8a8f98]">
                  <span>Equipamento: <strong className="text-[#f7f8f8]">{a.equipmentName || 'BIA'}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                <div className="p-2.5 rounded bg-[#080a0c] border border-[#ffffff0a]">
                  <span className="text-[#8a8f98] block text-[10px]">Peso</span>
                  <strong className="text-[#f7f8f8] text-sm">{a.weightKg} kg</strong>
                </div>
                <div className="p-2.5 rounded bg-[#080a0c] border border-[#ffffff0a]">
                  <span className="text-[#8a8f98] block text-[10px]">Gordura %</span>
                  <strong className="text-[#f472b6] text-sm">{a.bodyFatPercent}%</strong>
                </div>
                <div className="p-2.5 rounded bg-[#080a0c] border border-[#ffffff0a]">
                  <span className="text-[#8a8f98] block text-[10px]">Massa Muscular</span>
                  <strong className="text-[#4ade80] text-sm">{a.skeletalMuscleMassKg} kg</strong>
                </div>
                <div className="p-2.5 rounded bg-[#080a0c] border border-[#ffffff0a]">
                  <span className="text-[#8a8f98] block text-[10px]">Ângulo de Fase</span>
                  <strong className="text-[#3b82f6] text-sm">{a.phaseAngle}°</strong>
                </div>
                <div className="p-2.5 rounded bg-[#080a0c] border border-[#ffffff0a]">
                  <span className="text-[#8a8f98] block text-[10px]">Cintura</span>
                  <strong className="text-[#f7f8f8] text-sm">{a.waistCm} cm</strong>
                </div>
                <div className="p-2.5 rounded bg-[#080a0c] border border-[#ffffff0a]">
                  <span className="text-[#8a8f98] block text-[10px]">RCEst</span>
                  <strong className="text-[#fbbf24] text-sm">{a.waistHeightRatio}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL: NOVA AVALIAÇÃO (ACCORDION) ────────────────────── */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="linear-card w-full max-w-2xl p-6 space-y-6 my-8 border border-[#ffffff15]">
            <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-4">
              <div className="flex items-center space-x-2">
                <Ruler className="w-5 h-5 text-[#3b82f6]" />
                <h3 className="text-base font-bold text-[#f7f8f8]">Cadastrar Nova Bioimpedância</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      assessmentDate: new Date().toISOString().split('T')[0],
                      assessorName: 'Leonardo Zonzini Lattanzio',
                      equipmentName: 'InBody 570 / Terra Science',
                      notes: 'Avaliação de bioimpedância de teste',
                      weightKg: 80.8,
                      heightCm: 175,
                      age: 46,
                      sex: 'MASCULINO',
                      waistCm: 94.5,
                      bodyFatPercent: 21.7,
                      fatMassKg: 17.5,
                      leanMassKg: 63.3,
                      skeletalMuscleMassKg: 32.7,
                      totalBodyWaterL: 46.1,
                      totalBodyWaterPercent: 57.1,
                      leanMassWaterPercent: 72.9,
                      hydrationIndex: 3.9,
                      intracellularWaterL: 27.3,
                      intracellularWaterPercent: 59.2,
                      extracellularWaterL: 18.8,
                      extracellularWaterPercent: 40.8,
                      basalMetabolicRate: 1704,
                      phaseAngle: 8.9,
                      cellularAge: 40,
                      updateUserProfileHeight: false,
                    })
                  }
                  className="px-2.5 py-1 rounded bg-[#3b82f615] text-[#3b82f6] hover:bg-[#3b82f625] border border-[#3b82f630] text-[11px] font-medium transition"
                >
                  ⚡ Preencher Exemplo
                </button>
                <button onClick={() => setIsNewModalOpen(false)} className="text-[#8a8f98] hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateAssessment} className="space-y-4 text-xs">
              {/* Grupo 1: Dados da Medição */}
              <div className="p-4 rounded-lg bg-[#080a0c] border border-[#ffffff0a] space-y-3">
                <h4 className="font-bold text-[#3b82f6] uppercase tracking-wider text-[11px]">1. Dados da Avaliação</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[#8a8f98] block mb-1">Data</label>
                    <input
                      type="date"
                      value={formData.assessmentDate || ''}
                      onChange={(e) => setFormData({ ...formData, assessmentDate: e.target.value })}
                      className="bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[#8a8f98] block mb-1">Avaliador / Profissional</label>
                    <input
                      type="text"
                      placeholder="Ex: Dr. Leonardo Zonzini"
                      value={formData.assessorName || ''}
                      onChange={(e) => setFormData({ ...formData, assessorName: e.target.value })}
                      className="bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[#8a8f98] block mb-1">Equipamento BIA</label>
                    <input
                      type="text"
                      placeholder="Ex: InBody 570"
                      value={formData.equipmentName || ''}
                      onChange={(e) => setFormData({ ...formData, equipmentName: e.target.value })}
                      className="bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Grupo 2: Dados Físicos */}
              <div className="p-4 rounded-lg bg-[#080a0c] border border-[#ffffff0a] space-y-3">
                <h4 className="font-bold text-[#3b82f6] uppercase tracking-wider text-[11px]">2. Dados Físicos Básicos</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[#8a8f98] block mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 80.8"
                      value={formData.weightKg ?? ''}
                      onChange={(e) => setFormData({ ...formData, weightKg: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] w-full font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[#8a8f98] block mb-1">Altura (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ex: 175"
                      value={formData.heightCm ?? ''}
                      onChange={(e) => setFormData({ ...formData, heightCm: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] w-full font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[#8a8f98] block mb-1">Idade (anos)</label>
                    <input
                      type="number"
                      placeholder="Ex: 46"
                      value={formData.age ?? ''}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                      className="bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[#8a8f98] block mb-1">Cintura (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Ex: 94.5"
                      value={formData.waistCm ?? ''}
                      onChange={(e) => setFormData({ ...formData, waistCm: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="updateUserProfileHeight"
                    checked={formData.updateUserProfileHeight || false}
                    onChange={(e) => setFormData({ ...formData, updateUserProfileHeight: e.target.checked })}
                    className="rounded border-[#ffffff30] bg-[#16191e]"
                  />
                  <label htmlFor="updateUserProfileHeight" className="text-[11px] text-[#8a8f98]">
                    Atualizar altura padrão no meu perfil de usuário
                  </label>
                </div>
              </div>

              {/* Grupo 3: Composição Corporal */}
              <div className="p-4 rounded-lg bg-[#080a0c] border border-[#ffffff0a] space-y-3">
                <h4 className="font-bold text-[#3b82f6] uppercase tracking-wider text-[11px]">3. Composição Corporal</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[#8a8f98] block mb-1">% Gordura</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 21.7"
                      value={formData.bodyFatPercent ?? ''}
                      onChange={(e) => setFormData({ ...formData, bodyFatPercent: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f472b6] font-bold w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[#8a8f98] block mb-1">Massa Muscular (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 32.7"
                      value={formData.skeletalMuscleMassKg ?? ''}
                      onChange={(e) => setFormData({ ...formData, skeletalMuscleMassKg: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#4ade80] font-bold w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[#8a8f98] block mb-1">Ângulo de Fase (°)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 8.9"
                      value={formData.phaseAngle ?? ''}
                      onChange={(e) => setFormData({ ...formData, phaseAngle: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#3b82f6] font-bold w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[#8a8f98] block mb-1">Idade Celular</label>
                    <input
                      type="number"
                      placeholder="Ex: 40"
                      value={formData.cellularAge ?? ''}
                      onChange={(e) => setFormData({ ...formData, cellularAge: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                      className="bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-[#ffffff0e]">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#16191e] hover:bg-[#22272f] text-[#8a8f98] text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold shadow-lg shadow-[#3b82f620] disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Avaliação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
