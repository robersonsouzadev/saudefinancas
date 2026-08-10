'use client';

import { useState, useEffect } from 'react';
import { 
  HeartPulse, Moon, Droplets, Smile, Dumbbell, Save, Check, 
  Flame, Shield, Settings, Calendar as CalendarIcon, Info, Sparkles, AlertCircle, RefreshCw
} from 'lucide-react';
import { authFetch, parseJsonResponse } from '@/lib/api';

interface DailyLogData {
  id?: string;
  date: string;
  sleepHours?: number;
  sleepQuality?: number;
  bedTime?: string;
  wakeTime?: string;
  sleepFactors?: string;
  waterIntakeMl: number;
  waterGoalMl: number;
  moodScore?: number;
  moodTags?: string;
  energyLevel?: number;
  stressLevel?: number;
  exerciseMinutes?: number;
  exerciseType?: string;
  exerciseIntensity?: string;
  symptoms?: string;
  notes?: string;
  vitalityScore?: number;
}

interface CalendarDay {
  date: string;
  dayOfWeek: string;
  dayNumber: number;
  isToday: boolean;
  hasLog: boolean;
  vitalityScore: number;
  waterIntakeMl: number;
  waterGoalMl: number;
  sleepHours: number;
  moodScore: number;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  shieldsRemaining: number;
}

interface HydrationSettingData {
  dailyGoalMl: number;
  useOmsCalculation: boolean;
  reminderInterval: number;
  startHour: number;
  endHour: number;
  notifyWhatsapp: boolean;
}

const EMOJI_MOODS = [
  { score: 1, emoji: '😫', label: 'Péssimo', color: '#f87171' },
  { score: 2, emoji: '😞', label: 'Ruim', color: '#fb923c' },
  { score: 3, emoji: '😐', label: 'Neutro', color: '#facc15' },
  { score: 4, emoji: '😊', label: 'Bom', color: '#4ade80' },
  { score: 5, emoji: '😁', label: 'Excelente', color: '#38bdf8' },
];

const EMOTION_TAGS = ['Ansioso', 'Motivado', 'Cansado', 'Focado', 'Irritado', 'Grato', 'Triste', 'Calmo', 'Estressado', 'Confiante'];
const SLEEP_FACTOR_TAGS = ['Cafeína à Noite', 'Telas Antes de Dormir', 'Álcool', 'Exercício à Noite', 'Barulho / Luz', 'Ronco / Apneia'];
const SYMPTOM_TAGS = ['Dor de Cabeça', 'Fadiga Muscular', 'Inchaço / Retenção', 'Má Digestão', 'Dor nas Costas', 'Enxaqueca', 'Congestão Nasal'];

export default function SaudePage() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, shieldsRemaining: 1 });
  const [omsRecommendationMl, setOmsRecommendationMl] = useState<number>(2500);

  // Form State
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [sleepQuality, setSleepQuality] = useState<number>(4);
  const [bedTime, setBedTime] = useState<string>('23:00');
  const [wakeTime, setWakeTime] = useState<string>('06:30');
  const [selectedSleepFactors, setSelectedSleepFactors] = useState<string[]>([]);
  
  const [waterIntakeMl, setWaterIntakeMl] = useState<number>(0);
  const [waterGoalMl, setWaterGoalMl] = useState<number>(2500);
  
  const [moodScore, setMoodScore] = useState<number>(4);
  const [selectedMoodTags, setSelectedMoodTags] = useState<string[]>([]);
  const [energyLevel, setEnergyLevel] = useState<number>(8);
  const [stressLevel, setStressLevel] = useState<number>(2); // 1 to 5
  
  const [exerciseMinutes, setExerciseMinutes] = useState<number>(45);
  const [exerciseType, setExerciseType] = useState<string>('Musculação');
  const [exerciseIntensity, setExerciseIntensity] = useState<string>('MODERADO');
  
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [vitalityScore, setVitalityScore] = useState<number>(85);

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isHydrationModalOpen, setIsHydrationModalOpen] = useState<boolean>(false);
  const [trendsInsight, setTrendsInsight] = useState<string>('');
  
  // AI Health Story State
  const [aiStory, setAiStory] = useState<string>('');
  const [aiStoryHighlights, setAiStoryHighlights] = useState<string[]>([]);
  const [loadingStory, setLoadingStory] = useState<boolean>(false);

  // Hydration Settings State
  const [hydrationSettings, setHydrationSettings] = useState<HydrationSettingData>({
    dailyGoalMl: 2500,
    useOmsCalculation: true,
    reminderInterval: 90,
    startHour: 8,
    endHour: 21,
    notifyWhatsapp: true,
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  useEffect(() => {
    loadDailyLog(selectedDate);
    loadCalendar();
    loadAnalytics();
  }, [selectedDate]);

  const loadDailyLog = async (dateStr: string) => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/health-tracker/daily?date=${dateStr}`);
      if (res.ok) {
        const data = await parseJsonResponse(res);
        setOmsRecommendationMl(data.omsRecommendationMl || 2500);
        if (data.streak) setStreak(data.streak);

        if (data.log) {
          const l: DailyLogData = data.log;
          setSleepHours(l.sleepHours ?? 7.5);
          setSleepQuality(l.sleepQuality ?? 4);
          setBedTime(l.bedTime || '23:00');
          setWakeTime(l.wakeTime || '06:30');
          setSelectedSleepFactors(l.sleepFactors ? l.sleepFactors.split(',') : []);
          
          setWaterIntakeMl(l.waterIntakeMl ?? 0);
          setWaterGoalMl(l.waterGoalMl ?? data.omsRecommendationMl ?? 2500);
          
          setMoodScore(l.moodScore ?? 4);
          setSelectedMoodTags(l.moodTags ? l.moodTags.split(',') : []);
          setEnergyLevel(l.energyLevel ?? 8);
          setStressLevel(l.stressLevel ?? 2);
          
          setExerciseMinutes(l.exerciseMinutes ?? 0);
          setExerciseType(l.exerciseType || 'Musculação');
          setExerciseIntensity(l.exerciseIntensity || 'MODERADO');
          
          setSelectedSymptoms(l.symptoms ? l.symptoms.split(',') : []);
          setNotes(l.notes || '');
          setVitalityScore(l.vitalityScore ?? 85);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar log diário:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCalendar = async () => {
    try {
      const res = await authFetch('/api/health-tracker/calendar?days=14');
      if (res.ok) {
        const list = await parseJsonResponse(res);
        setCalendarDays(list);
      }
    } catch (err) {
      console.error('Erro ao carregar calendário:', err);
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await authFetch('/api/health-tracker/analytics/trends?days=7');
      if (res.ok) {
        const data = await parseJsonResponse(res);
        setTrendsInsight(data.correlationInsight || '');
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  const loadHydrationSettings = async () => {
    try {
      const res = await authFetch('/api/health-tracker/hydration-settings');
      if (res.ok) {
        const data = await parseJsonResponse(res);
        setHydrationSettings(data);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações de hidratação:', err);
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await authFetch('/api/health-tracker/daily', {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          data: {
            sleepHours,
            sleepQuality,
            bedTime,
            wakeTime,
            sleepFactors: selectedSleepFactors,
            waterIntakeMl,
            waterGoalMl,
            moodScore,
            moodTags: selectedMoodTags,
            energyLevel,
            stressLevel,
            exerciseMinutes,
            exerciseType,
            exerciseIntensity,
            symptoms: selectedSymptoms,
            notes,
          },
        }),
      });

      if (res.ok) {
        const savedLog = await parseJsonResponse(res);
        if (savedLog.vitalityScore != null) setVitalityScore(savedLog.vitalityScore);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        await loadCalendar();
      } else {
        alert('Erro ao salvar log de saúde');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao conectar ao servidor');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAddWater = async (amountMl: number) => {
    const newAmount = Math.max(0, waterIntakeMl + amountMl);
    setWaterIntakeMl(newAmount);

    try {
      const res = await authFetch('/api/health-tracker/water', {
        method: 'POST',
        body: JSON.stringify({
          amountMl,
          date: selectedDate,
        }),
      });

      if (res.ok) {
        const updated = await parseJsonResponse(res);
        if (updated.vitalityScore != null) setVitalityScore(updated.vitalityScore);
        await loadCalendar();
      }
    } catch (err) {
      console.error('Erro ao adicionar água:', err);
    }
  };

  const handleUseShield = async () => {
    if (streak.shieldsRemaining <= 0) {
      alert('Você não tem escudos de saúde disponíveis nesta semana.');
      return;
    }
    if (!confirm('Deseja ativar 1 Escudo de Saúde para proteger sua sequência de dias?')) return;

    try {
      const res = await authFetch('/api/health-tracker/streak/shield', { method: 'POST' });
      if (res.ok) {
        const updated = await parseJsonResponse(res);
        setStreak(updated);
        alert('🛡️ Escudo de Saúde ativado com sucesso! Seu streak está protegido.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao ativar escudo');
    }
  };

  const handleSaveHydrationSettings = async () => {
    try {
      const res = await authFetch('/api/health-tracker/hydration-settings', {
        method: 'PUT',
        body: JSON.stringify(hydrationSettings),
      });

      if (res.ok) {
        const updated = await parseJsonResponse(res);
        setHydrationSettings(updated);
        if (updated.useOmsCalculation) {
          setWaterGoalMl(omsRecommendationMl);
        } else {
          setWaterGoalMl(updated.dailyGoalMl);
        }
        setIsHydrationModalOpen(false);
        alert('✅ Configurações de hidratação atualizadas! Lembretes ativos via WhatsApp até 21:00.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar configurações de hidratação');
    }
  };

  const handleGenerateStory = async () => {
    try {
      setLoadingStory(true);
      const res = await authFetch('/api/health-tracker/generate-story', { method: 'POST' });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        setAiStory(data.story || '');
        setAiStoryHighlights(data.highlights || []);
      }
    } catch (err) {
      console.error('Erro ao gerar Health Story:', err);
    } finally {
      setLoadingStory(false);
    }
  };

  const toggleArrayItem = (list: string[], setList: (newVal: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const waterProgressPct = Math.min(100, Math.round((waterIntakeMl / Math.max(1, waterGoalMl)) * 100));

  const getVitalityColor = (score: number) => {
    if (score >= 80) return '#4ade80';
    if (score >= 60) return '#facc15';
    if (score >= 40) return '#fb923c';
    return '#f87171';
  };

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-[1400px] mx-auto pb-16">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#f87171]">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#f7f8f8] tracking-tight flex items-center gap-2">
              <span>Diário de Saúde & Hábitos Biológicos</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded border border-[#4ade8030] bg-[#4ade8010] text-[#4ade80]">
                Fase 1 Ativa
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-[#a1a1aa] mt-0.5">
              Registro biológico diário, hidratação inteligente OMS com WhatsApp, monitoramento de sono e vitalidade
            </p>
          </div>
        </div>

        {/* BADGES DE STREAK E VITALIDADE */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Badge Streak */}
          <div className="h-9 px-3.5 rounded-lg bg-[#16191e] border border-[#ffffff12] flex items-center space-x-2">
            <Flame className="w-4 h-4 text-[#fb923c] animate-pulse" />
            <span className="text-xs font-semibold text-[#f7f8f8]">
              {streak.currentStreak} {streak.currentStreak === 1 ? 'Dia' : 'Dias'} Seguidos
            </span>
            <button 
              onClick={handleUseShield}
              title={`Usar Escudo de Saúde (${streak.shieldsRemaining} restante)`}
              className="ml-1 text-[#60a5fa] hover:text-[#93c5fd] p-1 rounded hover:bg-[#ffffff08]"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Badge Vitalidade Score */}
          <div className="h-9 px-3.5 rounded-lg bg-[#16191e] border border-[#ffffff12] flex items-center space-x-2">
            <Sparkles className="w-4 h-4" style={{ color: getVitalityColor(vitalityScore) }} />
            <span className="text-xs font-semibold" style={{ color: getVitalityColor(vitalityScore) }}>
              {vitalityScore} / 100 Vitalidade
            </span>
          </div>

          {/* Botão Config de Hidratação */}
          <button
            onClick={() => {
              loadHydrationSettings();
              setIsHydrationModalOpen(true);
            }}
            className="h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] hover:bg-[#1d2127] text-xs text-[#a1a1aa] hover:text-[#f7f8f8] flex items-center space-x-1.5 transition"
          >
            <Droplets className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Config Lembretes Água</span>
          </button>
        </div>
      </div>

      {/* CALENDÁRIO HORIZONTAL DE 14 DIAS */}
      <div className="linear-card p-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <CalendarIcon className="w-3.5 h-3.5 text-[#5e6ad2]" /> Histórico Recente (Selecione o Dia)
          </span>
          {!isToday && (
            <button 
              onClick={() => setSelectedDate(todayStr)}
              className="text-xs font-mono text-[#5e6ad2] hover:underline flex items-center gap-1"
            >
              <span>Ir para HOJE</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {calendarDays.map((day) => {
            const isSelected = day.date === selectedDate;
            const vColor = getVitalityColor(day.vitalityScore);

            return (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`min-w-[62px] py-2 px-1.5 rounded-lg border text-center transition flex flex-col items-center justify-between space-y-1 ${
                  isSelected 
                    ? 'bg-[#5e6ad220] border-[#5e6ad2] text-[#f7f8f8] shadow-md shadow-[#5e6ad220]' 
                    : day.isToday 
                      ? 'bg-[#16191e] border-[#4ade8080] text-[#f7f8f8]' 
                      : 'bg-[#16191e]/60 border-[#ffffff0e] hover:bg-[#16191e] text-[#a1a1aa]'
                }`}
              >
                <span className="text-[10px] font-mono tracking-tighter opacity-80">{day.dayOfWeek}</span>
                <span className={`text-sm font-bold font-mono ${day.isToday ? 'text-[#4ade80]' : ''}`}>
                  {day.dayNumber}
                </span>
                
                {/* Indicador de Status/Score */}
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: day.hasLog ? vColor : '#3f3f46' }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI CARDS (RESUMO DAS BIOMETRIAS DO DIA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sono */}
        <div className="linear-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-[#60a5fa]" /> Sono
            </span>
            <span className="text-xs font-mono text-[#60a5fa]">
              Qualidade {sleepQuality}/5
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#f7f8f8]">{sleepHours}h</div>
          <div className="flex justify-between items-center text-xs text-[#a1a1aa] font-mono">
            <span>Dormiu: {bedTime}</span>
            <span>Acordou: {wakeTime}</span>
          </div>
        </div>

        {/* Card 2: Hidratação */}
        <div className="linear-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-[#38bdf8]" /> Hidratação
            </span>
            <span className="text-xs font-mono text-[#38bdf8]">{waterProgressPct}% Meta</span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#f7f8f8]">
            {(waterIntakeMl / 1000).toFixed(2)} L
          </div>
          {/* Barra Visual de Progresso */}
          <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden border border-[#ffffff0a]">
            <div 
              className="bg-gradient-to-r from-[#38bdf8] to-[#60a5fa] h-full transition-all duration-500 rounded-full" 
              style={{ width: `${waterProgressPct}%` }}
            />
          </div>
          <span className="text-xs text-[#a1a1aa] block font-mono">Meta: {(waterGoalMl / 1000).toFixed(2)} L (OMS)</span>
        </div>

        {/* Card 3: Humor & Energia */}
        <div className="linear-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-[#4ade80]" /> Humor & Energia
            </span>
            <span className="text-xs font-mono text-[#4ade80]">
              {EMOJI_MOODS.find(m => m.score === moodScore)?.label || 'Bom'}
            </span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#f7f8f8] flex items-center gap-2">
            <span>{EMOJI_MOODS.find(m => m.score === moodScore)?.emoji || '😊'}</span>
            <span className="text-lg text-[#a1a1aa] font-normal">| E: {energyLevel}/10</span>
          </div>
          <span className="text-xs text-[#a1a1aa] block">
            Nível de Estresse: {['Nenhum', 'Leve', 'Moderado', 'Alto', 'Extremo'][stressLevel - 1] || 'Leve'}
          </span>
        </div>

        {/* Card 4: Exercício */}
        <div className="linear-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-[#facc15]" /> Exercício
            </span>
            <span className="text-xs font-mono text-[#facc15]">{exerciseType}</span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#f7f8f8]">{exerciseMinutes} min</div>
          <span className="text-xs text-[#a1a1aa] block capitalize">Intensidade {exerciseIntensity.toLowerCase()}</span>
        </div>
      </div>

      {/* CARD DE INSIGHT DE TENDÊNCIA E CORRELAÇÃO IA */}
      {trendsInsight && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#5e6ad215] via-[#16191e] to-[#080a0c] border border-[#5e6ad230] flex items-start space-x-3">
          <Sparkles className="w-5 h-5 text-[#5e6ad2] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-[#f7f8f8] uppercase tracking-wider font-mono">
              Insight de Correlação Biológica
            </h4>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              {trendsInsight}
            </p>
          </div>
        </div>
      )}

      {/* CARD DE HEALTH STORY GERADA POR IA (FASE 2) */}
      <div className="linear-card p-5 space-y-4 bg-gradient-to-br from-[#16191e] via-[#16191e] to-[#5e6ad210] border border-[#5e6ad230]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ffffff0e] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5e6ad220] border border-[#5e6ad240] flex items-center justify-center text-[#5e6ad2]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[#f7f8f8] uppercase tracking-wider font-mono">
                Health Story Semanal (Inteligência Artificial)
              </h4>
              <p className="text-xs text-[#a1a1aa]">Síntese narrativa dos seus hábitos biológicos e recomendações</p>
            </div>
          </div>

          <button
            onClick={handleGenerateStory}
            disabled={loadingStory}
            className="h-8 px-4 rounded-lg bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-xs font-medium flex items-center space-x-1.5 transition shadow-sm self-start sm:self-center disabled:opacity-50"
          >
            {loadingStory ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Gerando Análise...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiStory ? 'Regerar Health Story' : '✨ Gerar Health Story com IA'}</span>
              </>
            )}
          </button>
        </div>

        {aiStory ? (
          <div className="space-y-3 pt-1">
            {/* Highlights */}
            {aiStoryHighlights.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {aiStoryHighlights.map((h, i) => (
                  <span key={i} className="px-2.5 py-1 rounded bg-[#ffffff08] border border-[#ffffff10] text-[11px] font-mono text-[#4ade80]">
                    ✓ {h}
                  </span>
                ))}
              </div>
            )}
            
            {/* Narrative text */}
            <div className="p-4 rounded-xl bg-[#080a0c]/60 border border-[#ffffff0a] text-xs text-[#d4d4d8] leading-relaxed whitespace-pre-line font-sans">
              {aiStory}
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#a1a1aa] italic">
            Clique no botão acima para analisar seus dados dos últimos 7 dias e gerar um relatório narrativo personalizado por IA.
          </p>
        )}
      </div>

      {/* FORMULÁRIO DE CHECK-IN RÁPIDO DO DIA */}
      <div className="linear-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
          <h3 className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-[#f87171]" />
            <span>Registrar Biometria do Dia ({selectedDate})</span>
          </h3>
          {savedSuccess && (
            <span className="px-3 py-1 bg-[#4ade8015] text-[#4ade80] border border-[#4ade8030] rounded text-xs font-mono flex items-center gap-1.5 animate-pulse">
              <Check className="w-3.5 h-3.5" /> Biometria Salva com Sucesso!
            </span>
          )}
        </div>

        <form onSubmit={handleSaveLog} className="space-y-6 text-xs">
          
          {/* SEÇÃO 1: SONO & DESCANSO */}
          <div className="space-y-3 p-4 rounded-xl bg-[#16191e]/40 border border-[#ffffff08]">
            <div className="flex items-center justify-between border-b border-[#ffffff08] pb-2">
              <span className="font-semibold text-xs text-[#f7f8f8] flex items-center gap-1.5 uppercase font-mono">
                <Moon className="w-4 h-4 text-[#60a5fa]" /> 1. Qualidade e Duração do Sono
              </span>
              <span className="font-mono text-[#60a5fa] font-bold">{sleepHours} Horas</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Slider de horas */}
              <div className="space-y-2">
                <label className="text-[#a1a1aa] font-mono block">Horas Dormidas:</label>
                <input 
                  type="range"
                  min="3"
                  max="12"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#16191e] rounded-lg appearance-none cursor-pointer accent-[#60a5fa]"
                />
              </div>

              {/* Horários dormir / acordar */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#a1a1aa] font-mono block mb-1">⏰ Dormiu às:</label>
                  <input 
                    type="time" 
                    value={bedTime}
                    onChange={(e) => setBedTime(e.target.value)}
                    className="w-full h-8 px-2 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#60a5fa]"
                  />
                </div>
                <div>
                  <label className="text-[#a1a1aa] font-mono block mb-1">⏰ Acordou às:</label>
                  <input 
                    type="time" 
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="w-full h-8 px-2 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#60a5fa]"
                  />
                </div>
              </div>

              {/* Qualidade do sono */}
              <div>
                <label className="text-[#a1a1aa] font-mono block mb-1">⭐ Qualidade Subjetiva:</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSleepQuality(q)}
                      className={`flex-1 h-8 rounded font-mono text-xs transition ${
                        sleepQuality === q 
                          ? 'bg-[#60a5fa] text-white font-bold' 
                          : 'bg-[#16191e] border border-[#ffffff10] text-[#a1a1aa] hover:bg-[#1d2127]'
                      }`}
                    >
                      {q}★
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags de fatores do sono */}
            <div>
              <label className="text-[#a1a1aa] font-mono block mb-1.5">Fatores Relevantes da Noite:</label>
              <div className="flex flex-wrap gap-1.5">
                {SLEEP_FACTOR_TAGS.map((factor) => {
                  const active = selectedSleepFactors.includes(factor);
                  return (
                    <button
                      key={factor}
                      type="button"
                      onClick={() => toggleArrayItem(selectedSleepFactors, setSelectedSleepFactors, factor)}
                      className={`px-2.5 py-1 rounded-md text-xs transition ${
                        active 
                          ? 'bg-[#60a5fa20] border border-[#60a5fa60] text-[#60a5fa]' 
                          : 'bg-[#16191e] border border-[#ffffff10] text-[#a1a1aa] hover:text-[#f7f8f8]'
                      }`}
                    >
                      {factor}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: HIDRATAÇÃO DIÁRIA */}
          <div className="space-y-3 p-4 rounded-xl bg-[#16191e]/40 border border-[#ffffff08]">
            <div className="flex items-center justify-between border-b border-[#ffffff08] pb-2">
              <span className="font-semibold text-xs text-[#f7f8f8] flex items-center gap-1.5 uppercase font-mono">
                <Droplets className="w-4 h-4 text-[#38bdf8]" /> 2. Consumo de Água & Hidratação
              </span>
              <span className="font-mono text-[#38bdf8] font-bold">
                {(waterIntakeMl / 1000).toFixed(2)} L / {(waterGoalMl / 1000).toFixed(2)} L
              </span>
            </div>

            {/* Botoes de adicao rapida de agua */}
            <div className="flex flex-wrap items-center gap-2">
              <button 
                type="button" 
                onClick={() => handleQuickAddWater(-250)}
                className="h-8 px-3 rounded bg-[#16191e] border border-[#ffffff10] text-[#a1a1aa] hover:text-[#f7f8f8]"
              >
                - 250ml
              </button>
              <button 
                type="button" 
                onClick={() => handleQuickAddWater(200)}
                className="h-8 px-3 rounded bg-[#16191e] border border-[#ffffff10] text-[#f7f8f8] hover:bg-[#1d2127]"
              >
                + 200ml (Xícara)
              </button>
              <button 
                type="button" 
                onClick={() => handleQuickAddWater(250)}
                className="h-8 px-3 rounded bg-[#16191e] border border-[#38bdf840] text-[#38bdf8] hover:bg-[#38bdf815] font-semibold"
              >
                + 250ml (Copo)
              </button>
              <button 
                type="button" 
                onClick={() => handleQuickAddWater(350)}
                className="h-8 px-3 rounded bg-[#16191e] border border-[#ffffff10] text-[#f7f8f8] hover:bg-[#1d2127]"
              >
                + 350ml (Copo Grande)
              </button>
              <button 
                type="button" 
                onClick={() => handleQuickAddWater(500)}
                className="h-8 px-3 rounded bg-[#16191e] border border-[#ffffff10] text-[#f7f8f8] hover:bg-[#1d2127]"
              >
                + 500ml (Garrafa)
              </button>
              <button 
                type="button" 
                onClick={() => handleQuickAddWater(750)}
                className="h-8 px-3 rounded bg-[#16191e] border border-[#ffffff10] text-[#f7f8f8] hover:bg-[#1d2127]"
              >
                + 750ml (Squeeze)
              </button>

              <button
                type="button"
                onClick={() => setWaterGoalMl(omsRecommendationMl)}
                className="h-8 px-3 rounded bg-[#38bdf815] text-[#38bdf8] border border-[#38bdf830] text-xs font-mono ml-auto"
                title={`Recomendação OMS baseada no seu peso: ${omsRecommendationMl}ml`}
              >
                Dica OMS ({omsRecommendationMl}ml)
              </button>
            </div>
          </div>

          {/* SEÇÃO 3: HUMOR, ENERGIA & ESTRESSE */}
          <div className="space-y-3 p-4 rounded-xl bg-[#16191e]/40 border border-[#ffffff08]">
            <div className="flex items-center justify-between border-b border-[#ffffff08] pb-2">
              <span className="font-semibold text-xs text-[#f7f8f8] flex items-center gap-1.5 uppercase font-mono">
                <Smile className="w-4 h-4 text-[#4ade80]" /> 3. Nível de Humor, Energia & Estresse
              </span>
              <span className="font-mono text-[#4ade80] font-bold">
                Humor: {EMOJI_MOODS.find(m => m.score === moodScore)?.label} | Energia: {energyLevel}/10
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Emojis de Humor */}
              <div>
                <label className="text-[#a1a1aa] font-mono block mb-2">Como você se sentiu hoje?</label>
                <div className="grid grid-cols-5 gap-2">
                  {EMOJI_MOODS.map((item) => {
                    const isSelected = moodScore === item.score;
                    return (
                      <button
                        key={item.score}
                        type="button"
                        onClick={() => setMoodScore(item.score)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                          isSelected
                            ? 'bg-[#16191e] border-[#4ade80] shadow-md shadow-[#4ade8020]'
                            : 'bg-[#16191e]/60 border-[#ffffff0e] hover:bg-[#16191e]'
                        }`}
                      >
                        <span className="text-2xl">{item.emoji}</span>
                        <span className="text-[10px] font-mono text-[#a1a1aa]">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders Energia e Estresse */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between font-mono mb-1">
                    <span className="text-[#a1a1aa]">Nível de Energia (1-10):</span>
                    <span className="font-bold text-[#4ade80]">{energyLevel} / 10</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="10"
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-[#16191e] rounded-lg appearance-none cursor-pointer accent-[#4ade80]"
                  />
                </div>

                <div>
                  <label className="text-[#a1a1aa] font-mono block mb-1">Nível de Estresse Percebido:</label>
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { level: 1, label: 'Nenhum' },
                      { level: 2, label: 'Leve' },
                      { level: 3, label: 'Moderado' },
                      { level: 4, label: 'Alto' },
                      { level: 5, label: 'Extremo' },
                    ].map((s) => (
                      <button
                        key={s.level}
                        type="button"
                        onClick={() => setStressLevel(s.level)}
                        className={`py-1.5 rounded text-[11px] font-mono transition ${
                          stressLevel === s.level 
                            ? 'bg-[#fb923c] text-white font-bold' 
                            : 'bg-[#16191e] border border-[#ffffff10] text-[#a1a1aa] hover:bg-[#1d2127]'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tags de Emocao Granular */}
            <div>
              <label className="text-[#a1a1aa] font-mono block mb-1.5">Sentimentos Granulares do Dia:</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOTION_TAGS.map((tag) => {
                  const active = selectedMoodTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleArrayItem(selectedMoodTags, setSelectedMoodTags, tag)}
                      className={`px-2.5 py-1 rounded-md text-xs transition ${
                        active 
                          ? 'bg-[#4ade8020] border border-[#4ade8060] text-[#4ade80]' 
                          : 'bg-[#16191e] border border-[#ffffff10] text-[#a1a1aa] hover:text-[#f7f8f8]'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SEÇÃO 4: EXERCÍCIO & ATIVIDADE FÍSICA */}
          <div className="space-y-3 p-4 rounded-xl bg-[#16191e]/40 border border-[#ffffff08]">
            <div className="flex items-center justify-between border-b border-[#ffffff08] pb-2">
              <span className="font-semibold text-xs text-[#f7f8f8] flex items-center gap-1.5 uppercase font-mono">
                <Dumbbell className="w-4 h-4 text-[#facc15]" /> 4. Exercício & Atividade Física
              </span>
              <span className="font-mono text-[#facc15] font-bold">{exerciseMinutes} Minutos</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[#a1a1aa] mb-1 font-mono">Duração (Minutos):</label>
                <input 
                  type="number"
                  value={exerciseMinutes}
                  onChange={(e) => setExerciseMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full h-8 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#facc15]"
                />
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1 font-mono">Tipo de Atividade:</label>
                <select 
                  value={exerciseType}
                  onChange={(e) => setExerciseType(e.target.value)}
                  className="w-full h-8 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#facc15]"
                >
                  <option value="Musculação">Musculação</option>
                  <option value="Corrida / Caminhada">Corrida / Caminhada</option>
                  <option value="Ciclismo">Ciclismo</option>
                  <option value="Natação">Natação</option>
                  <option value="Crossfit / Funcional">Crossfit / Funcional</option>
                  <option value="Pilates / Yoga">Pilates / Yoga</option>
                  <option value="Artes Marciais / Luta">Artes Marciais / Luta</option>
                </select>
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1 font-mono">Intensidade:</label>
                <select 
                  value={exerciseIntensity}
                  onChange={(e) => setExerciseIntensity(e.target.value)}
                  className="w-full h-8 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#facc15]"
                >
                  <option value="LEVE">Leve</option>
                  <option value="MODERADO">Moderada</option>
                  <option value="INTENSO">Intensa</option>
                </select>
              </div>
            </div>
          </div>

          {/* SEÇÃO 5: SINTOMAS & NOTAS LIVRES */}
          <div className="space-y-3 p-4 rounded-xl bg-[#16191e]/40 border border-[#ffffff08]">
            <span className="font-semibold text-xs text-[#f7f8f8] flex items-center gap-1.5 uppercase font-mono border-b border-[#ffffff08] pb-2 block">
              <AlertCircle className="w-4 h-4 text-[#f87171]" /> 5. Sintomas e Notas Livres do Dia
            </span>

            <div>
              <label className="text-[#a1a1aa] font-mono block mb-1.5">Sintomas Notados (se houver):</label>
              <div className="flex flex-wrap gap-1.5">
                {SYMPTOM_TAGS.map((symptom) => {
                  const active = selectedSymptoms.includes(symptom);
                  return (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => toggleArrayItem(selectedSymptoms, setSelectedSymptoms, symptom)}
                      className={`px-2.5 py-1 rounded-md text-xs transition ${
                        active 
                          ? 'bg-[#f8717120] border border-[#f8717160] text-[#f87171]' 
                          : 'bg-[#16191e] border border-[#ffffff10] text-[#a1a1aa] hover:text-[#f7f8f8]'
                      }`}
                    >
                      {symptom}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[#a1a1aa] font-mono block mb-1">Notas / Observações Livres:</label>
              <textarea 
                rows={2}
                placeholder="Ex: Tive reunião desgastante à tarde, mas o treino foi excelente..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
              />
            </div>
          </div>

          {/* BOTÃO SALVAR LOG */}
          <div className="pt-2 border-t border-[#ffffff08] flex justify-end">
            <button 
              type="submit"
              disabled={saving}
              className="h-10 px-6 rounded-lg bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium flex items-center space-x-2 transition shadow-lg shadow-[#5e6ad220] disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Salvando Biometria...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Biometria do Dia</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL CONFIGURAÇÕES DE HIDRATAÇÃO WHATSAPP */}
      {isHydrationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="linear-card w-full max-w-lg p-6 space-y-5 border border-[#ffffff14] shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
              <h3 className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
                <Droplets className="w-4 h-4 text-[#38bdf8]" />
                <span>Configurações de Hidratação & Lembretes WhatsApp</span>
              </h3>
              <button 
                onClick={() => setIsHydrationModalOpen(false)}
                className="text-[#a1a1aa] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#a1a1aa] font-mono mb-1">Cálculo de Meta Diária:</label>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={hydrationSettings.useOmsCalculation}
                      onChange={(e) => setHydrationSettings({ ...hydrationSettings, useOmsCalculation: e.target.checked })}
                      className="accent-[#38bdf8]"
                    />
                    <span>Usar recomendação OMS (35ml × peso)</span>
                  </label>
                </div>
                {hydrationSettings.useOmsCalculation && (
                  <p className="text-[11px] text-[#38bdf8] mt-1 font-mono">
                    💡 Sua meta calculada pela OMS é de <strong>{omsRecommendationMl} ml/dia</strong>.
                  </p>
                )}
              </div>

              {!hydrationSettings.useOmsCalculation && (
                <div>
                  <label className="block text-[#a1a1aa] font-mono mb-1">Meta Personalizada (ml/dia):</label>
                  <input 
                    type="number"
                    step="50"
                    value={hydrationSettings.dailyGoalMl}
                    onChange={(e) => setHydrationSettings({ ...hydrationSettings, dailyGoalMl: parseInt(e.target.value, 10) || 2500 })}
                    className="w-full h-8 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-[#a1a1aa] font-mono mb-1">Intervalo dos Lembretes no WhatsApp:</label>
                <select
                  value={hydrationSettings.reminderInterval}
                  onChange={(e) => setHydrationSettings({ ...hydrationSettings, reminderInterval: parseInt(e.target.value, 10) })}
                  className="w-full h-8 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8]"
                >
                  <option value={60}>A cada 60 minutos (1 hora)</option>
                  <option value={90}>A cada 90 minutos (1 hora e meia - Recomendado)</option>
                  <option value={120}>A cada 120 minutos (2 horas)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] font-mono mb-1">Início dos Avisos:</label>
                  <select
                    value={hydrationSettings.startHour}
                    onChange={(e) => setHydrationSettings({ ...hydrationSettings, startHour: parseInt(e.target.value, 10) })}
                    className="w-full h-8 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8]"
                  >
                    <option value={6}>06:00</option>
                    <option value={7}>07:00</option>
                    <option value={8}>08:00 (Padrão)</option>
                    <option value={9}>09:00</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#a1a1aa] font-mono mb-1">Término dos Avisos (Limite 21h):</label>
                  <select
                    value={hydrationSettings.endHour}
                    onChange={(e) => setHydrationSettings({ ...hydrationSettings, endHour: parseInt(e.target.value, 10) })}
                    className="w-full h-8 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8]"
                  >
                    <option value={19}>19:00</option>
                    <option value={20}>20:00</option>
                    <option value={21}>21:00 (Limite Noturno)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-[#ffffff0e]">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={hydrationSettings.notifyWhatsapp}
                    onChange={(e) => setHydrationSettings({ ...hydrationSettings, notifyWhatsapp: e.target.checked })}
                    className="accent-[#38bdf8]"
                  />
                  <span className="font-semibold text-[#f7f8f8]">Ativar notificações periódicas via WhatsApp</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#ffffff0e]">
              <button
                type="button"
                onClick={() => setIsHydrationModalOpen(false)}
                className="h-8 px-3 rounded bg-[#16191e] text-[#a1a1aa] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveHydrationSettings}
                className="h-8 px-4 rounded bg-[#38bdf8] hover:bg-[#0284c7] text-white font-medium transition"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
