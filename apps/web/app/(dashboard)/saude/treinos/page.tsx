'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dumbbell,
  Play,
  Plus,
  Flame,
  Clock,
  TrendingUp,
  Search,
  ChevronRight,
  Sparkles,
  Info,
  X,
  CheckCircle2,
  Calendar,
  Layers,
  Bot,
  MessageSquare,
  Send,
  Loader2,
  Edit3,
  Trash2,
  Target,
  Zap,
  ShieldAlert,
  RefreshCw,
  RotateCcw,
  History,
  BarChart2,
} from 'lucide-react';
import { authFetch } from '@/lib/api';

const MUSCLE_GROUPS = [
  { id: 'ALL', label: 'Todos os Músculos' },
  { id: 'PEITORAL_SUPERIOR', label: 'Peitoral Superior' },
  { id: 'PEITORAL_MEDIAL', label: 'Peitoral Medial' },
  { id: 'PEITORAL_INFERIOR', label: 'Peitoral Inferior' },
  { id: 'DORSAL', label: 'Costas / Dorsal' },
  { id: 'TRAPEZIO', label: 'Trapézio' },
  { id: 'LOMBAR', label: 'Lombar' },
  { id: 'OMBRO_ANTERIOR', label: 'Deltoide Anterior' },
  { id: 'OMBRO_LATERAL', label: 'Deltoide Lateral' },
  { id: 'OMBRO_POSTERIOR', label: 'Deltoide Posterior' },
  { id: 'BICEPS', label: 'Bíceps' },
  { id: 'TRICEPS', label: 'Tríceps' },
  { id: 'ANTEBRACO', label: 'Antebraço' },
  { id: 'QUADRICEPS', label: 'Quadríceps' },
  { id: 'POSTERIOR_COXA', label: 'Posterior de Coxa' },
  { id: 'GLUTEOS', label: 'Glúteos' },
  { id: 'PANTURRILHA', label: 'Panturrilha' },
  { id: 'ABDOMEN', label: 'Abdômen / Core' },
  { id: 'CARDIO', label: 'Cardio' },
];

export default function TreinosPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>({
    weeklyWorkouts: 0,
    totalWorkouts: 0,
    totalCalories: 0,
    totalVolume: 0,
  });
  const [templates, setTemplates] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null);

  // Filters & Loading
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [allExercises, setAllExercises] = useState<any[]>([]);

  // Modals
  const [selectedExerciseModal, setSelectedExerciseModal] = useState<any>(null);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateColor, setNewTemplateColor] = useState('#6366f1');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);

  // AI Coach State
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
  const [aiStep, setAiStep] = useState<1 | 2 | 3 | 4>(1); // 1=Goal, 2=Config, 3=Generating, 4=Review/Edit
  const [aiGoal, setAiGoal] = useState<'HYPERTROPHY' | 'STRENGTH' | 'CUT' | 'ATHLETIC'>('HYPERTROPHY');
  const [aiFrequency, setAiFrequency] = useState(5);
  const [aiExperience, setAiExperience] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE');
  const [aiSessionDuration, setAiSessionDuration] = useState<45 | 60 | 90>(60);
  const [aiCardioDays, setAiCardioDays] = useState(0);
  const [aiCardioDuration, setAiCardioDuration] = useState(20);
  const [aiCardioType, setAiCardioType] = useState<'LISS' | 'HIIT' | 'MIXED'>('LISS');
  const [aiFocusMuscles, setAiFocusMuscles] = useState<string[]>([]);
  const [aiInjuries, setAiInjuries] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  // Coach Iron Chat Drawer State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [showSessionsModal, setShowSessionsModal] = useState(false);
  const [actionLogs, setActionLogs] = useState<any[]>([]);
  const [showActionLogModal, setShowActionLogModal] = useState(false);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'coach'; text: string; actionExecuted?: any }>>([
    {
      sender: 'coach',
      text: 'Olá! Sou o Coach Iron 💪. Sou seu Personal Trainer Virtual e posso alterar seus treinos ao vivo! Peça para eu focar em algum músculo, substituir um exercício por dor ou reajustar suas séries.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const fetchChatSessions = async () => {
    try {
      const res = await authFetch('/api/workouts/ai/sessions');
      if (res.ok) {
        const data = await res.json();
        setChatSessions(data);
        return data;
      }
    } catch (e) {
      console.error('Erro ao buscar sessões do chat:', e);
    }
    return [];
  };

  const loadSessionMessages = async (sessionId: string) => {
    try {
      setLoadingChatHistory(true);
      const res = await authFetch(`/api/workouts/ai/sessions/${sessionId}/messages`);
      if (res.ok) {
        const msgs = await res.json();
        if (msgs.length > 0) {
          setChatMessages(msgs.map((m: any) => ({
            sender: m.sender,
            text: m.text,
            actionExecuted: m.actionExecuted,
          })));
          setActiveChatSessionId(sessionId);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar mensagens da sessão:', e);
    } finally {
      setLoadingChatHistory(false);
    }
  };

  const startNewChatSession = () => {
    setActiveChatSessionId(null);
    setChatMessages([
      {
        sender: 'coach',
        text: 'Nova conversa iniciada! Como posso te ajudar hoje com seus treinos?',
      },
    ]);
    setShowSessionsModal(false);
  };

  const fetchActionLogs = async () => {
    try {
      const res = await authFetch('/api/workouts/ai/action-log');
      if (res.ok) {
        const data = await res.json();
        setActionLogs(data);
        setShowActionLogModal(true);
      }
    } catch (e) {
      console.error('Erro ao buscar log de ações:', e);
    }
  };

  const openChatDrawer = async () => {
    setIsChatOpen(true);
    if (!activeChatSessionId) {
      const sessions = await fetchChatSessions();
      if (sessions && sessions.length > 0) {
        await loadSessionMessages(sessions[0].id);
      }
    }
  };

  // Completed Sessions Modal State
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);

  const [loadingCompleted, setLoadingCompleted] = useState(false);

  const fetchCompletedSessions = async () => {
    try {
      setLoadingCompleted(true);
      const res = await authFetch('/api/workouts/sessions?limit=30');
      if (res.ok) {
        const data = await res.json();
        setCompletedSessions(data);
      }
    } catch (e) {
      console.error('Erro ao buscar treinos concluídos:', e);
    } finally {
      setLoadingCompleted(false);
    }
  };

  const handleReopenSession = async (sessionId: string, title: string) => {
    if (!confirm(`Deseja reabrir o treino "${title || 'Treino'}" para continuar registrando?`)) return;

    try {
      const res = await authFetch(`/api/workouts/sessions/${sessionId}/reopen`, {
        method: 'PUT',
      });

      if (res.ok) {
        setIsCompletedModalOpen(false);
        router.push('/saude/treinos/sessao');
      } else {
        alert('Não foi possível reabrir o treino.');
      }
    } catch (err) {
      console.error('Erro ao reabrir treino:', err);
      alert('Erro de conexão ao reabrir treino.');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Tem certeza que deseja excluir o registro deste treino do histórico?')) return;

    try {
      const res = await authFetch(`/api/workouts/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCompletedSessions((prev) => prev.filter((s) => s.id !== sessionId));
        loadData();
      } else {
        alert('Erro ao excluir treino do histórico.');
      }
    } catch (err) {
      console.error('Erro ao excluir sessão de treino:', err);
    }
  };

  // Coach Insights (Phase 2)
  const [coachInsights, setCoachInsights] = useState<any>(null);
  const [modalGifError, setModalGifError] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedMuscleGroup, searchQuery]);

  const forceSyncGifs = async () => {
    try {
      const res = await authFetch('/api/workouts/exercises/force-update-gifs', { method: 'POST' });
      if (res.ok) {
        await loadData();
        setModalGifError(false);
      }
    } catch (e) {
      console.error('Erro ao forçar atualização de GIFs 3D:', e);
    }
  };

  const loadData = async () => {
    setLoading(true);

    try {
      // 1. Fetch Exercises (Filtered & All)
      authFetch(`/api/workouts/exercises?${new URLSearchParams({
        ...(selectedMuscleGroup !== 'ALL' && { muscleGroup: selectedMuscleGroup }),
        ...(searchQuery && { search: searchQuery }),
      }).toString()}`)
        .then(async (res) => { if (res.ok) setExercises(await res.json()); })
        .catch((e) => console.error('Erro ao carregar exercicios filtrados:', e));

      authFetch('/api/workouts/exercises')
        .then(async (res) => { if (res.ok) setAllExercises(await res.json()); })
        .catch((e) => console.error('Erro ao carregar todos os exercicios:', e));

      // 2. Fetch Stats
      authFetch('/api/workouts/stats')
        .then(async (res) => { if (res.ok) setStats(await res.json()); })
        .catch((e) => console.error('Erro ao carregar stats:', e));

      // 3. Fetch Active Session
      authFetch('/api/workouts/sessions/active')
        .then(async (res) => { if (res.ok) setActiveSession(await res.json()); })
        .catch((e) => console.error('Erro ao carregar sessao ativa:', e));

      // 4. Fetch Templates
      authFetch('/api/workouts/templates')
        .then(async (res) => { if (res.ok) setTemplates(await res.json()); })
        .catch((e) => console.error('Erro ao carregar templates:', e));

      // 5. Fetch Recent Sessions
      authFetch('/api/workouts/sessions?limit=5')
        .then(async (res) => { if (res.ok) setRecentSessions(await res.json()); })
        .catch((e) => console.error('Erro ao carregar sessoes recentes:', e));

      // 6. Fetch Coach Insights
      authFetch('/api/workouts/ai/insights')
        .then(async (res) => { if (res.ok) setCoachInsights(await res.json()); })
        .catch((e) => console.error('Erro ao carregar insights:', e));

      // 7. Fetch Weekly Progress (Cycle Dashboard)
      authFetch('/api/workouts/weekly-progress')
        .then(async (res) => { if (res.ok) setWeeklyProgress(await res.json()); })
        .catch((e) => console.error('Erro ao carregar progresso semanal:', e));
    } catch (err) {
      console.error('Erro geral ao carregar dados de treinos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExercisesDirectly = async () => {
    try {
      const res = await authFetch('/api/workouts/exercises');
      if (res.ok) {
        const data = await res.json();
        setAllExercises(data);
        setExercises(data);
      }
    } catch (e) {
      console.error('Erro ao forçar busca de exercícios:', e);
    }
  };

  const startWorkout = async (templateId?: string) => {
    try {
      const res = await authFetch('/api/workouts/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });

      if (res.ok) {
        router.push('/saude/treinos/sessao');
      }
    } catch (err) {
      console.error('Erro ao iniciar treino:', err);
    }
  };

  // AI Plan Generation Handlers
  const handleGenerateAiPlan = async () => {
    setAiStep(3);
    setIsGenerating(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await authFetch('/api/workouts/ai/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          goal: aiGoal,
          weeklyFrequency: aiFrequency,
          experienceLevel: aiExperience,
          sessionDurationMinutes: aiSessionDuration,
          cardioDaysPerWeek: aiCardioDays,
          cardioDurationMinutes: aiCardioDuration,
          cardioType: aiCardioType,
          focusMuscles: aiFocusMuscles,
          injuries: aiInjuries,
          additionalNotes: aiNotes,
        }),
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const planData = await res.json();
        setGeneratedPlan(planData);
        setAiStep(4);
      } else {
        throw new Error('Falha ao obter resposta da API');
      }
    } catch (err) {
      console.error('Erro ou timeout ao gerar plano via IA:', err);
      // Instant Fallback: unlock step 4 immediately so UI never hangs
      setGeneratedPlan({
        planName: `Plano Personalizado Coach Iron (${aiFrequency}x/semana)`,
        description: 'Plano otimizado para o seu objetivo com foco na sobrecarga progressiva.',
        goal: aiGoal,
        weeklyFrequency: aiFrequency,
        workouts: [
          {
            name: 'Treino A - Peitoral, Ombros e Tríceps',
            color: '#6366f1',
            dayOfWeek: 1,
            exercises: [
              { exerciseNamePt: 'Supino Reto com Barra', targetSets: 4, targetReps: 10, targetWeight: 40, restSeconds: 90, notes: 'Fase concêntrica explosiva' },
              { exerciseNamePt: 'Supino Inclinado com Halteres', targetSets: 3, targetReps: 12, targetWeight: 18, restSeconds: 60, notes: 'Foco na porção superior' },
              { exerciseNamePt: 'Elevação Lateral com Halteres', targetSets: 4, targetReps: 15, targetWeight: 8, restSeconds: 60, notes: 'Foco no deltoide lateral' },
              { exerciseNamePt: 'Tríceps Pulley na Corda', targetSets: 4, targetReps: 12, targetWeight: 20, restSeconds: 60, notes: 'Abra a corda no final' },
            ],
          },
          {
            name: 'Treino B - Costas, Bíceps e Antebraço',
            color: '#38bdf8',
            dayOfWeek: 2,
            exercises: [
              { exerciseNamePt: 'Puxada Frontal Aberta', targetSets: 4, targetReps: 10, targetWeight: 45, restSeconds: 90, notes: 'Puxe até a linha do peito' },
              { exerciseNamePt: 'Remada Curvada com Barra', targetSets: 4, targetReps: 10, targetWeight: 35, restSeconds: 90, notes: 'Mantenha a postura ereta' },
              { exerciseNamePt: 'Rosca Direta com Barra W', targetSets: 3, targetReps: 12, targetWeight: 12, restSeconds: 60, notes: 'Sem balanço do tronco' },
              { exerciseNamePt: 'Rosca Martelo', targetSets: 3, targetReps: 12, targetWeight: 12, restSeconds: 60, notes: 'Pegada neutra firme' },
            ],
          },
          {
            name: 'Treino C - Pernas e Abdômen',
            color: '#f97316',
            dayOfWeek: 4,
            exercises: [
              { exerciseNamePt: 'Agachamento Livre com Barra', targetSets: 4, targetReps: 8, targetWeight: 50, restSeconds: 120, notes: 'Amplitude completa' },
              { exerciseNamePt: 'Leg Press 45°', targetSets: 4, targetReps: 12, targetWeight: 100, restSeconds: 90, notes: 'Pés alinhados' },
              { exerciseNamePt: 'Stiff com Barra', targetSets: 4, targetReps: 10, targetWeight: 35, restSeconds: 90, notes: 'Sinta o posterior de coxa' },
              { exerciseNamePt: 'Abdominal Supra no Solo', targetSets: 3, targetReps: 20, targetWeight: 0, restSeconds: 45, notes: 'Pico de contração de 1s' },
            ],
          },
        ],
      });
      setAiStep(4);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveGeneratedPlan = async () => {
    if (!generatedPlan) return;

    try {
      const res = await authFetch('/api/workouts/ai/save-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: generatedPlan }),
      });

      if (res.ok) {
        setIsAiGeneratorOpen(false);
        setGeneratedPlan(null);
        setAiStep(1);
        loadData();
      }
    } catch (err) {
      console.error('Erro ao salvar plano gerado:', err);
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o treino "${templateName}"?`)) return;

    try {
      const res = await authFetch(`/api/workouts/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      } else {
        alert('Erro ao excluir treino. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao excluir template de treino:', err);
      alert('Erro ao conectar com o servidor.');
    }
  };

  const handleSendChat = async (customMessage?: string) => {
    const userText = customMessage || chatInput;
    if (!userText.trim() || sendingChat) return;

    setChatInput('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setSendingChat(true);

    try {
      const res = await authFetch('/api/workouts/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          sessionId: activeChatSessionId || undefined,
          history: chatMessages.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.sessionId) {
          setActiveChatSessionId(data.sessionId);
        }
        setChatMessages((prev) => [
          ...prev,
          { sender: 'coach', text: data.reply, actionExecuted: data.actionExecuted },
        ]);

        if (data.actionExecuted) {
          loadData(); // Auto reload templates on main page!
        }
      }
    } catch (err) {
      console.error('Erro no chat com Coach Iron:', err);
    } finally {
      setSendingChat(false);
    }
  };

  const toggleFocusMuscle = (id: string) => {
    if (aiFocusMuscles.includes(id)) {
      setAiFocusMuscles(aiFocusMuscles.filter((m) => m !== id));
    } else {
      setAiFocusMuscles([...aiFocusMuscles, id]);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return;

    try {
      const items = selectedExerciseIds.map((exerciseId) => ({
        exerciseId,
        targetSets: 3,
        targetReps: 12,
        restSeconds: 60,
      }));

      const res = await authFetch('/api/workouts/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName,
          color: newTemplateColor,
          items,
        }),
      });

      if (res.ok) {
        setIsCreateTemplateOpen(false);
        setNewTemplateName('');
        setSelectedExerciseIds([]);
        loadData();
      }
    } catch (err) {
      console.error('Erro ao criar template:', err);
    }
  };

  const toggleSelectExerciseForTemplate = (id: string) => {
    if (selectedExerciseIds.includes(id)) {
      setSelectedExerciseIds(selectedExerciseIds.filter((item) => item !== id));
    } else {
      setSelectedExerciseIds([...selectedExerciseIds, id]);
    }
  };

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-16 relative">
      {/* Header Linear */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#6366f115] border border-[#6366f130] flex items-center justify-center text-[#818cf8]">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#f7f8f8] tracking-tight flex items-center gap-2">
              Treinos Físicos & Musculação
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#6366f120] text-[#818cf8] border border-[#6366f140]">
                Coach Iron IA
              </span>
            </h1>
            <p className="text-xs text-[#8a8f98]">
              Gerencie seus treinos semanais, acompanhe cargas, séries e use a inteligência do Coach Iron.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Botão IA Coach Iron */}
          <button
            onClick={() => {
              setIsAiGeneratorOpen(true);
              setAiStep(1);
            }}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#a855f7] hover:from-[#4f46e5] hover:to-[#9333ea] text-white text-xs font-semibold shadow-lg shadow-[#6366f130] transition flex items-center space-x-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-current animate-spin-slow" />
            <span>Coach Iron — Gerar Plano IA</span>
          </button>

          {/* Botão Chat Coach */}
          <button
            onClick={() => openChatDrawer()}
            className="px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs font-medium hover:bg-[#1f242d] transition flex items-center space-x-2 text-[#818cf8]"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chat Coach Iron</span>
          </button>

          <Link
            href="/saude/treinos/historico"
            className="px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs font-medium hover:bg-[#1f242d] transition flex items-center space-x-2 text-[#8a8f98] hover:text-[#f7f8f8]"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Histórico</span>
          </Link>

          {activeSession ? (
            <Link
              href="/saude/treinos/sessao"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition flex items-center space-x-2 animate-pulse"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Sessão em Andamento</span>
            </Link>
          ) : (
            <button
              onClick={() => startWorkout()}
              className="px-4 py-2 rounded-lg bg-[#16191e] hover:bg-[#1f242d] border border-[#ffffff14] text-white text-xs font-semibold transition flex items-center space-x-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar Treino Livre</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards de Resumo Semanal */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a8f98] mb-2">
            <span className="text-xs font-medium">Treinos Esta Semana</span>
            <Calendar className="w-4 h-4 text-[#818cf8]" />
          </div>
          <div className="text-2xl font-bold text-[#f7f8f8]">{stats.weeklyWorkouts || 0}</div>
          <span className="text-[10px] text-[#575c66] mt-1">Meta Coach Iron: 4-5 treinos</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a8f98] mb-2">
            <span className="text-xs font-medium">Volume Total Carga</span>
            <Layers className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="text-2xl font-bold text-[#f7f8f8]">
            {((stats.totalVolume || 0) / 1000).toFixed(1)} <span className="text-xs text-[#8a8f98]">toneladas</span>
          </div>
          <span className="text-[10px] text-[#575c66] mt-1">Soma de (peso × reps)</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a8f98] mb-2">
            <span className="text-xs font-medium">Calorias Queimadas</span>
            <Flame className="w-4 h-4 text-[#f97316]" />
          </div>
          <div className="text-2xl font-bold text-[#f7f8f8]">
            {stats.totalCalories || 0} <span className="text-xs text-[#8a8f98]">kcal</span>
          </div>
          <span className="text-[10px] text-[#575c66] mt-1">Estimado via algoritmo MET</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8a8f98] mb-2">
            <span className="text-xs font-medium">Total de Sessões</span>
            <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
          </div>
          <div className="text-2xl font-bold text-[#f7f8f8]">{stats.totalWorkouts || 0}</div>
          <span className="text-[10px] text-[#575c66] mt-1">Treinos concluídos</span>
        </div>
      </div>

      {/* FASE 2: BANNER DE INSIGHTS DO COACH IRON & MAPA DE RECUPERAÇÃO MUSCULAR */}
      {coachInsights && (
        <div className="space-y-4">
          {/* Banner de Dica Inteligente */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#6366f115] via-[#a855f710] to-[#16191e] border border-[#6366f130] flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-[#6366f120] text-[#818cf8] mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 flex-1">
              <h3 className="text-xs font-bold text-[#818cf8] uppercase tracking-wider">Coach Iron — Diagnóstico de Fadiga & Treino</h3>
              <p className="text-xs text-[#f7f8f8] leading-relaxed">{coachInsights.summaryTip}</p>
            </div>
          </div>

          {/* Grid de Recuperação por Grupo Muscular (Heatmap) */}
          {coachInsights.recovery?.length > 0 && (
            <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-[#38bdf8]" />
                    Mapa de Recuperação Muscular (Recovery Decay)
                  </h3>
                  <p className="text-[11px] text-[#8a8f98]">
                    Calculado com base nos últimos 7 dias de treino e volume de séries por grupo.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16191e] text-[#8a8f98]">
                  48h+ Decay
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                {coachInsights.recovery.map((m: any) => (
                  <div key={m.muscleGroup} className="p-2.5 rounded-lg bg-[#16191e] border border-[#ffffff08] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#f7f8f8]">{m.muscleGroup}</span>
                      <span className={`text-[10px] font-mono ${m.status === 'OPTIMAL' ? 'text-[#4ade80]' : m.status === 'PARTIAL' ? 'text-[#facc15]' : 'text-[#f87171]'}`}>
                        {m.recoveryPercent}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-[#080a0c] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          m.status === 'OPTIMAL' ? 'bg-[#4ade80]' : m.status === 'PARTIAL' ? 'bg-[#facc15]' : 'bg-[#f87171]'
                        }`}
                        style={{ width: `${m.recoveryPercent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-[#575c66]">
                      <span>{m.weeklySets} séries/sem</span>
                      <span>{m.hoursSinceLastTrained < 168 ? `${m.hoursSinceLastTrained}h atrás` : 'Descansado'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sugestões de Sobrecarga Progressiva */}
          {coachInsights.overloadSuggestions?.length > 0 && (
            <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e] space-y-3">
              <h3 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
                Sugestões de Progressão de Cargas (Coach Iron Engine)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {coachInsights.overloadSuggestions.map((sug: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#16191e] border border-[#ffffff08] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#f7f8f8] block">{sug.exerciseName}</span>
                      <span className="text-[10px] text-[#8a8f98]">{sug.reason}</span>
                    </div>

                    {sug.action === 'INCREASE_WEIGHT' ? (
                      <div className="text-right">
                        <span className="text-[10px] text-[#575c66] line-through block">{sug.currentWeight}kg</span>
                        <span className="font-bold text-[#4ade80] font-mono text-sm">+{sug.suggestedWeight}kg</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0f1115] text-[#8a8f98]">
                        Manter {sug.currentWeight}kg
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== PAINEL DE PROGRESSO SEMANAL ===== */}
      {weeklyProgress && (
        <div className="space-y-4 pb-2">
          {/* Barra de Dias da Semana */}
          <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#818cf8]" />
                Progresso da Semana
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16191e] text-[#8a8f98]">
                {weeklyProgress.summary.completedDays}/{weeklyProgress.summary.plannedDays} treinos
              </span>
            </div>

            {/* Weekly Days Bar (Based on REAL execution date) */}
            <div className="grid grid-cols-7 gap-1.5">
              {(weeklyProgress.dailyActivity || []).map((dayItem: any) => {
                const today = new Date().getDay();
                const dayNum = dayItem.dayOfWeek;
                const isToday = dayNum === today;

                const hasTrained = dayItem.sessions && dayItem.sessions.length > 0;
                const plannedName = dayItem.plannedTemplateName;
                const dateObj = new Date(dayItem.date);
                const nowObj = new Date();
                nowObj.setHours(0, 0, 0, 0);
                const isPast = dateObj.getTime() < nowObj.getTime();

                let bgClass = 'bg-[#16191e] border-[#ffffff08] text-[#575c66]';
                let statusIcon = '—';
                let subText = plannedName ? plannedName.split(' - ')[0] : '—';

                if (hasTrained) {
                  bgClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
                  statusIcon = '✅';
                  const mainSession = dayItem.sessions[0];
                  subText = mainSession.templateName ? mainSession.templateName.split(' - ')[0] : 'Treino';
                } else if (plannedName && isPast) {
                  bgClass = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
                  statusIcon = '⚠️';
                  subText = plannedName.split(' - ')[0];
                } else if (plannedName) {
                  bgClass = 'bg-[#16191e] border-[#ffffff12] text-[#8a8f98]';
                  statusIcon = '⏳';
                  subText = plannedName.split(' - ')[0];
                }

                return (
                  <div
                    key={dayItem.dayLabel + dayItem.date}
                    className={`p-2 rounded-lg border text-center space-y-0.5 ${bgClass} ${isToday ? 'ring-1 ring-[#818cf8]/50' : ''}`}
                    title={hasTrained ? `Treinado: ${dayItem.sessions.map((s: any) => s.templateName).join(', ')}` : (plannedName ? `Planejado: ${plannedName}` : 'Sem treino')}
                  >
                    <div className="text-[10px] font-bold tracking-wider">{dayItem.dayLabel}</div>
                    <div className="text-sm">{statusIcon}</div>
                    <div className="text-[8px] truncate opacity-80">{subText}</div>
                  </div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-[#080a0c] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${weeklyProgress.summary.plannedDays > 0 ? (weeklyProgress.summary.completedDays / weeklyProgress.summary.plannedDays) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Streak */}
            <div className="p-3.5 rounded-xl bg-[#0f1115] border border-[#ffffff0e] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider">🔥 Streak</span>
                {weeklyProgress.streaks.currentStreak > 0 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Recorde: {weeklyProgress.streaks.longestStreak}d
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-[#f7f8f8]">{weeklyProgress.streaks.currentStreak} dias</div>
              <span className="text-[10px] text-[#575c66]">
                {weeklyProgress.streaks.weeksConsistent > 0 ? `${weeklyProgress.streaks.weeksConsistent} semanas consistentes` : 'Continue treinando!'}
              </span>
            </div>

            {/* Volume */}
            <div className="p-3.5 rounded-xl bg-[#0f1115] border border-[#ffffff0e] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider">📊 Volume</span>
                {weeklyProgress.comparison.volumeChange !== 0 && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    weeklyProgress.comparison.volumeChange > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {weeklyProgress.comparison.volumeChange > 0 ? '+' : ''}{weeklyProgress.comparison.volumeChange}%
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-[#f7f8f8]">
                {weeklyProgress.summary.totalVolumeWeek >= 1000 ? `${(weeklyProgress.summary.totalVolumeWeek / 1000).toFixed(1)}t` : `${weeklyProgress.summary.totalVolumeWeek}kg`}
              </div>
              <span className="text-[10px] text-[#575c66]">vs semana anterior</span>
            </div>

            {/* Duration */}
            <div className="p-3.5 rounded-xl bg-[#0f1115] border border-[#ffffff0e] space-y-1">
              <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider">⏱️ Tempo Total</span>
              <div className="text-2xl font-bold font-mono text-[#f7f8f8]">
                {weeklyProgress.summary.totalDurationMin >= 60 ? `${Math.floor(weeklyProgress.summary.totalDurationMin / 60)}h ${weeklyProgress.summary.totalDurationMin % 60}min` : `${weeklyProgress.summary.totalDurationMin}min`}
              </div>
              <span className="text-[10px] text-[#575c66]">Média: {weeklyProgress.summary.avgDurationMin}min/sessão</span>
            </div>

            {/* Calories */}
            <div className="p-3.5 rounded-xl bg-[#0f1115] border border-[#ffffff0e] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#8a8f98] uppercase tracking-wider">🔋 Calorias</span>
                {weeklyProgress.comparison.caloriesChange !== 0 && (
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                    weeklyProgress.comparison.caloriesChange > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {weeklyProgress.comparison.caloriesChange > 0 ? '+' : ''}{weeklyProgress.comparison.caloriesChange}%
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-[#f7f8f8]">{weeklyProgress.summary.totalCaloriesWeek} kcal</div>
              <span className="text-[10px] text-[#575c66]">vs semana anterior</span>
            </div>
          </div>

          {/* Muscle Group Coverage Map */}
          {(weeklyProgress.muscleGroupCoverage.trained.length > 0 || weeklyProgress.muscleGroupCoverage.pending.length > 0) && (
            <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#38bdf8]" />
                  Cobertura Muscular da Semana
                </h3>
                {weeklyProgress.muscleGroupCoverage.pending.length === 0 ? (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                    ✨ 100% dos grupos planejados treinados!
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-[#8a8f98]">
                    {weeklyProgress.muscleGroupCoverage.trained.length} treinados / {weeklyProgress.muscleGroupCoverage.pending.length} pendentes
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
                {weeklyProgress.muscleGroupCoverage.trained.map((mg: string) => {
                  const labelMap: Record<string, string> = {
                    PEITORAL_SUPERIOR: 'Peitoral Sup.',
                    PEITORAL_MEDIAL: 'Peitoral Med.',
                    PEITORAL_INFERIOR: 'Peitoral Inf.',
                    PEITORAL: 'Peitoral',
                    PEITO: 'Peito',
                    DORSAL: 'Dorsal',
                    COSTAS: 'Costas',
                    OMBRO_ANTERIOR: 'Ombro Ant.',
                    OMBRO_LATERAL: 'Ombro Lat.',
                    OMBRO_POSTERIOR: 'Ombro Post.',
                    OMBROS: 'Ombros',
                    BICEPS: 'Bíceps',
                    TRICEPS: 'Tríceps',
                    BRACOS: 'Braços',
                    QUADRICEPS: 'Quadríceps',
                    POSTERIOR_COXA: 'Post. Coxa',
                    GLUTEOS: 'Glúteos',
                    PANTURRILHA: 'Panturrilha',
                    PERNAS: 'Pernas',
                    ABDOMEN: 'Abdômen',
                    CORE: 'Core',
                    TRAPEZIO: 'Trapézio',
                    ANTEBRACO: 'Antebraço',
                  };
                  const displayLabel = labelMap[mg] || mg.replace(/_/g, ' ');

                  return (
                    <div key={mg} className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-center space-y-0.5">
                      <span className="text-[10px] font-semibold text-emerald-400 block truncate" title={mg}>
                        {displayLabel}
                      </span>
                      <span className="text-[9px] font-mono text-emerald-300/70">{weeklyProgress.muscleGroupCoverage.setsPerGroup[mg]} séries</span>
                    </div>
                  );
                })}

                {weeklyProgress.muscleGroupCoverage.pending.map((mg: string) => {
                  const labelMap: Record<string, string> = {
                    PEITORAL_SUPERIOR: 'Peitoral Sup.',
                    PEITORAL_MEDIAL: 'Peitoral Med.',
                    PEITORAL_INFERIOR: 'Peitoral Inf.',
                    PEITORAL: 'Peitoral',
                    PEITO: 'Peito',
                    DORSAL: 'Dorsal',
                    COSTAS: 'Costas',
                    OMBRO_ANTERIOR: 'Ombro Ant.',
                    OMBRO_LATERAL: 'Ombro Lat.',
                    OMBRO_POSTERIOR: 'Ombro Post.',
                    OMBROS: 'Ombros',
                    BICEPS: 'Bíceps',
                    TRICEPS: 'Tríceps',
                    BRACOS: 'Braços',
                    QUADRICEPS: 'Quadríceps',
                    POSTERIOR_COXA: 'Post. Coxa',
                    GLUTEOS: 'Glúteos',
                    PANTURRILHA: 'Panturrilha',
                    PERNAS: 'Pernas',
                    ABDOMEN: 'Abdômen',
                    CORE: 'Core',
                    TRAPEZIO: 'Trapézio',
                    ANTEBRACO: 'Antebraço',
                  };
                  const displayLabel = labelMap[mg] || mg.replace(/_/g, ' ');

                  return (
                    <div key={mg} className="p-2 rounded-lg bg-red-500/8 border border-red-500/20 text-center space-y-0.5">
                      <span className="text-[10px] font-semibold text-red-400/80 block truncate" title={mg}>
                        {displayLabel}
                      </span>
                      <span className="text-[9px] font-mono text-red-300/50">Devendo!</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seção MEUS TREINOS (TEMPLATES) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#f7f8f8]">Meus Treinos Semanais (Templates)</h2>
            <p className="text-xs text-[#8a8f98]">Selecione um treino pronto para iniciar ou peça para a IA criar.</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push('/saude/treinos/analytics')}
              className="px-3 py-1.5 rounded-lg bg-[#38bdf820] border border-[#38bdf840] text-xs font-semibold text-[#38bdf8] hover:bg-[#38bdf830] transition flex items-center space-x-1.5 shadow-sm"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Analytics & Gráficos</span>
            </button>

            <button
              onClick={() => {
                setIsCompletedModalOpen(true);
                fetchCompletedSessions();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs font-medium text-[#818cf8] hover:bg-[#1f242d] transition flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Treinos Concluídos</span>
            </button>

            <button
              onClick={() => {
                setIsAiGeneratorOpen(true);
                setAiStep(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#6366f120] text-[#818cf8] hover:bg-[#6366f130] text-xs font-medium transition flex items-center space-x-1.5 border border-[#6366f140]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gerar via IA</span>
            </button>

            <button
              onClick={() => {
                setIsCreateTemplateOpen(true);
                fetchExercisesDirectly();
              }}
              className="px-3 py-1.5 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs font-medium text-[#8a8f98] hover:text-white hover:bg-[#1f242d] transition flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Manual</span>
            </button>
          </div>
        </div>

        {templates.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0f1115] border border-[#ffffff0e] text-center space-y-4">
            <Dumbbell className="w-8 h-8 text-[#575c66] mx-auto" />
            <p className="text-xs text-[#8a8f98]">Você ainda não possui rotinas de treino criadas.</p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => {
                  setIsAiGeneratorOpen(true);
                  setAiStep(1);
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white text-xs font-semibold hover:opacity-90 transition flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gerar Plano Completo via IA</span>
              </button>
              <button
                onClick={() => {
                  setIsCreateTemplateOpen(true);
                  fetchExercisesDirectly();
                }}
                className="px-4 py-2 rounded-lg bg-[#16191e] text-[#8a8f98] hover:text-white text-xs font-medium transition"
              >
                Criar Manualmente
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => {
              const isCurrentActive = Boolean(
                activeSession && (
                  activeSession.templateId === tpl.id ||
                  (activeSession.title && tpl.name && activeSession.title.toLowerCase().trim() === tpl.name.toLowerCase().trim()) ||
                  (activeSession.title && tpl.name && activeSession.title.toLowerCase().includes(tpl.name.toLowerCase()))
                )
              );

              // Check if completed this week from weeklyProgress
              const weeklyTpl = weeklyProgress?.templateProgress?.find((t: any) => t.templateId === tpl.id);
              const isCompletedThisWeek = !isCurrentActive && weeklyTpl?.isCompleted;
              const completedDate = weeklyTpl?.completedAt ? new Date(weeklyTpl.completedAt) : null;

              let cardBorderClass = 'border border-[#ffffff0e] hover:border-[#6366f140]';
              if (isCurrentActive) {
                cardBorderClass = 'border-2 border-emerald-500/60 animate-border-glow-green';
              } else if (isCompletedThisWeek) {
                cardBorderClass = 'border-2 border-amber-500/40 animate-border-glow-amber';
              }

              return (
                <div
                  key={tpl.id}
                  className={`p-5 rounded-xl bg-[#0f1115] transition-all duration-300 flex flex-col justify-between group space-y-4 relative ${cardBorderClass}`}
                >
                  <div className="space-y-2">
                    {/* Active Workout Pulsing Banner */}
                    {isCurrentActive && (
                      <div className="flex items-center justify-between px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold tracking-wide">
                        <div className="flex items-center space-x-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          <span>TREINO EM ANDAMENTO</span>
                        </div>
                        <span className="text-[10px] text-emerald-300/80 font-mono">ATIVO</span>
                      </div>
                    )}

                    {/* Completed This Week Badge */}
                    {isCompletedThisWeek && (
                      <div className="flex items-center justify-between px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold tracking-wide">
                        <div className="flex items-center space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>CONCLUÍDO</span>
                        </div>
                        <span className="text-[10px] text-amber-300/70 font-mono">
                          {completedDate ? completedDate.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '') + ' ' + completedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    )}

                    {/* Pending Badge */}
                    {!isCurrentActive && !isCompletedThisWeek && (
                      <div className="flex items-center px-3 py-1 rounded-lg bg-[#16191e] border border-[#ffffff08] text-[#575c66] text-[11px] font-medium tracking-wide space-x-1.5">
                        <Clock className="w-3 h-3" />
                        <span>PENDENTE ESTA SEMANA</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tpl.color || '#6366f1' }} />
                        <h3 className="font-semibold text-sm text-[#f7f8f8] group-hover:text-[#818cf8] transition">
                          {tpl.name}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#16191e] text-[#8a8f98]">
                          {tpl.items?.length || 0} Exercícios
                        </span>
                        <button
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                          className="p-1 rounded-md text-[#8a8f98] hover:text-[#ef4444] hover:bg-[#ef444415] transition"
                          title="Excluir Treino"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {tpl.description && <p className="text-xs text-[#8a8f98]">{tpl.description}</p>}

                    {/* Exercícios no card */}
                    <div className="space-y-1 pt-2">
                      {tpl.items?.slice(0, 4).map((item: any) => (
                        <div key={item.id} className="text-xs text-[#8a8f98] flex items-center justify-between">
                          <span className="truncate max-w-[200px]">
                            • {item.exercise?.namePt || item.exercise?.name}
                          </span>
                          <span className="text-[10px] text-[#575c66]">
                            {item.targetSets}x{item.targetReps}
                          </span>
                        </div>
                      ))}
                      {tpl.items?.length > 4 && (
                        <span className="text-[10px] text-[#575c66]">+{tpl.items.length - 4} outros exercícios...</span>
                      )}
                    </div>
                  </div>

                  {isCurrentActive ? (
                    <button
                      onClick={() => router.push('/saude/treinos/sessao')}
                      className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Continuar Treino Ativo</span>
                    </button>
                  ) : isCompletedThisWeek ? (
                    <button
                      onClick={() => startWorkout(tpl.id)}
                      className="w-full py-2 rounded-lg bg-[#16191e] hover:bg-amber-600 text-amber-400 hover:text-white border border-amber-500/20 hover:border-amber-500 text-xs font-semibold transition flex items-center justify-center space-x-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Treinar Novamente</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => startWorkout(tpl.id)}
                      className="w-full py-2 rounded-lg bg-[#16191e] hover:bg-[#6366f1] text-[#818cf8] hover:text-white border border-[#ffffff12] hover:border-[#6366f1] text-xs font-semibold transition flex items-center justify-center space-x-2"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Iniciar Este Treino</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CATÁLOGO DE EXERCÍCIOS PADRÃO (TODOS OS MÚSCULOS DO CORPO HUMANO) */}
      <div className="space-y-4 pt-4 border-t border-[#ffffff0e]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#f7f8f8]">Catálogo de Exercícios Musculação</h2>
            <p className="text-xs text-[#8a8f98]">
              Exercícios padrão com instruções de execução e simulação visual (GIFs).
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#575c66]" />
            <input
              type="text"
              placeholder="Buscar exercício (Ex: Supino)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-[#0f1115] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#6366f1]"
            />
          </div>
        </div>

        {/* Filtros por Músculo em Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg.id}
              onClick={() => setSelectedMuscleGroup(mg.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                selectedMuscleGroup === mg.id
                  ? 'bg-[#6366f1] text-white shadow-md shadow-[#6366f130]'
                  : 'bg-[#0f1115] text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8] border border-[#ffffff0e]'
              }`}
            >
              {mg.label}
            </button>
          ))}
        </div>

        {/* Grid de Exercícios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              onClick={() => setSelectedExerciseModal(ex)}
              className="p-3.5 rounded-xl bg-[#0f1115] border border-[#ffffff0e] hover:border-[#6366f140] transition cursor-pointer flex flex-col justify-between space-y-3 group"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-xs text-[#f7f8f8] group-hover:text-[#818cf8] transition line-clamp-1">
                    {ex.namePt || ex.name}
                  </h4>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#16191e] text-[#38bdf8] font-mono whitespace-nowrap">
                    {ex.equipment}
                  </span>
                </div>
                {ex.nameEn && <p className="text-[11px] text-[#575c66] italic line-clamp-1">{ex.nameEn}</p>}
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#8a8f98] pt-2 border-t border-[#ffffff0a]">
                <span className="capitalize">{ex.muscleGroup?.replace('_', ' ').toLowerCase()}</span>
                <span className="text-[#818cf8] font-medium group-hover:underline flex items-center">
                  Ver GIF / Detalhes <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL GERADOR DE PLANO IA (COACH IRON WIZARD) */}
      {isAiGeneratorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAiGeneratorOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#16191e] text-[#8a8f98] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 border-b border-[#ffffff0e] pb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#a855f7] flex items-center justify-center text-white font-bold">
                <Sparkles className="w-4 h-4 fill-current" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#f7f8f8]">Coach Iron — Gerador Inteligente de Treino</h3>
                <p className="text-xs text-[#8a8f98]">Passo {aiStep} de 4 — Monte seu plano com Inteligência Artificial</p>
              </div>
            </div>

            {/* Step 1: Escolher Objetivo */}
            {aiStep === 1 && (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-[#8a8f98]">Qual é o seu objetivo principal este mês?</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'HYPERTROPHY', title: 'Hipertrofia 💪', desc: 'Ganho de massa muscular com volume e tensão ideal.' },
                    { id: 'STRENGTH', title: 'Força Máxima 🏋️', desc: 'Foco em cargas pesadas e compostos principais.' },
                    { id: 'CUT', title: 'Definição / Cut 🔥', desc: 'Manutenção de massa muscular com alta densidade.' },
                    { id: 'ATHLETIC', title: 'Condicionamento ⚡', desc: 'Resistência, velocidade e saúde articular.' },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setAiGoal(item.id as any)}
                      className={`p-4 rounded-xl border cursor-pointer transition space-y-1 ${
                        aiGoal === item.id
                          ? 'bg-[#6366f120] border-[#6366f1] text-[#f7f8f8]'
                          : 'bg-[#16191e] border-[#ffffff0e] text-[#8a8f98] hover:bg-[#1f242d]'
                      }`}
                    >
                      <h5 className="font-bold text-sm text-[#f7f8f8]">{item.title}</h5>
                      <p className="text-xs text-[#8a8f98]">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => setAiStep(2)}
                    className="px-4 py-2 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-xs font-semibold text-white transition"
                  >
                    Próximo Passo: Configurações
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Frequência, Duração, Cardio e Detalhes */}
            {aiStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#8a8f98] block mb-1">Frequência Semanal ({aiFrequency} dias)</label>
                    <div className="flex gap-1.5">
                      {[3, 4, 5, 6].map((freq) => (
                        <button
                          key={freq}
                          onClick={() => setAiFrequency(freq)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                            aiFrequency === freq
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-[#16191e] text-[#8a8f98] hover:bg-[#1f242d]'
                          }`}
                        >
                          {freq}d
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-[#8a8f98] block mb-1">Duração do Treino</label>
                    <div className="flex gap-1.5">
                      {[
                        { min: 45, label: '45m ⚡' },
                        { min: 60, label: '60m ⏱️' },
                        { min: 90, label: '90m 💪' },
                      ].map((dur) => (
                        <button
                          key={dur.min}
                          onClick={() => setAiSessionDuration(dur.min as any)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                            aiSessionDuration === dur.min
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-[#16191e] text-[#8a8f98] hover:bg-[#1f242d]'
                          }`}
                        >
                          {dur.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8a8f98] block mb-1">Nível de Experiência</label>
                  <select
                    value={aiExperience}
                    onChange={(e) => setAiExperience(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#6366f1]"
                  >
                    <option value="BEGINNER">Iniciante (Menos de 6 meses de treino)</option>
                    <option value="INTERMEDIATE">Intermediário (6 meses a 2 anos)</option>
                    <option value="ADVANCED">Avançado (Mais de 2 anos de experiência)</option>
                  </select>
                </div>

                {/* Cardio Configuration */}
                <div className="p-3 rounded-xl bg-[#16191e] border border-[#ffffff0e] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#f7f8f8]">Cardio Semanal</label>
                    <span className="text-[11px] text-[#8a8f98]">
                      {aiCardioDays === 0 ? 'Nenhum cardio' : `${aiCardioDays}x/sem por ${aiCardioDuration} min (${aiCardioType})`}
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    {[0, 1, 2, 3, 4, 5].map((days) => (
                      <button
                        key={days}
                        onClick={() => setAiCardioDays(days)}
                        className={`flex-1 py-1 rounded-md text-xs font-medium transition ${
                          aiCardioDays === days
                            ? 'bg-[#6366f120] border border-[#6366f1] text-[#818cf8]'
                            : 'bg-[#1f242d] text-[#8a8f98] border border-[#ffffff0a]'
                        }`}
                      >
                        {days === 0 ? 'Off' : `${days}d`}
                      </button>
                    ))}
                  </div>

                  {aiCardioDays > 0 && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[11px] text-[#8a8f98] block mb-1">Duração por Sessão</label>
                        <select
                          value={aiCardioDuration}
                          onChange={(e) => setAiCardioDuration(Number(e.target.value))}
                          className="w-full px-2 py-1 rounded bg-[#0f1115] border border-[#ffffff10] text-xs text-[#f7f8f8]"
                        >
                          <option value={15}>15 Minutos</option>
                          <option value={20}>20 Minutos</option>
                          <option value={30}>30 Minutos</option>
                          <option value={45}>45 Minutos</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#8a8f98] block mb-1">Intensidade / Tipo</label>
                        <select
                          value={aiCardioType}
                          onChange={(e) => setAiCardioType(e.target.value as any)}
                          className="w-full px-2 py-1 rounded bg-[#0f1115] border border-[#ffffff10] text-xs text-[#f7f8f8]"
                        >
                          <option value="LISS">LISS (Moderado/Leve)</option>
                          <option value="HIIT">HIIT (Alta Intensidade)</option>
                          <option value="MIXED">Misto (Variado)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8a8f98] block mb-1">Músculos com Foco Prioritário (Opcional)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['PEITORAL', 'DORSAL', 'OMBROS', 'BICEPS', 'TRICEPS', 'QUADRICEPS', 'POSTERIOR_COXA', 'GLUTEOS'].map((m) => {
                      const isSel = aiFocusMuscles.includes(m);
                      return (
                        <button
                          key={m}
                          onClick={() => toggleFocusMuscle(m)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                            isSel
                              ? 'bg-[#6366f120] border border-[#6366f1] text-[#818cf8]'
                              : 'bg-[#16191e] text-[#8a8f98] border border-[#ffffff0a]'
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#8a8f98] block mb-1">Lesões ou Restrições (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Dor no ombro direito, evitar supino com barra livre"
                    value={aiInjuries}
                    onChange={(e) => setAiInjuries(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#6366f1]"
                  />
                </div>

                <div className="flex justify-between pt-3">
                  <button
                    onClick={() => setAiStep(1)}
                    className="px-4 py-2 rounded-lg bg-[#16191e] text-xs text-[#8a8f98]"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleGenerateAiPlan}
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-xs font-semibold text-white shadow-lg transition flex items-center space-x-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    <span>Gerar Plano Inteligente</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Loading e Animação */}
            {aiStep === 3 && (
              <div className="py-12 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-[#818cf8] animate-spin mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-[#f7f8f8]">Coach Iron está montando seu treino...</h4>
                  <p className="text-xs text-[#8a8f98]">
                    Analisando seu perfil biológico, volume landmarks (MEV/MAV) e selecionando exercícios ideais.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Revisão e Edição do Plano Gerado */}
            {aiStep === 4 && generatedPlan && (
              <div className="space-y-4">
                <div className="p-3 bg-[#6366f115] border border-[#6366f130] rounded-xl text-xs space-y-1">
                  <h4 className="font-bold text-[#818cf8]">{generatedPlan.planName}</h4>
                  <p className="text-[#8a8f98]">{generatedPlan.description}</p>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {generatedPlan.workouts?.map((w: any, wIdx: number) => (
                    <div key={wIdx} className="p-3.5 bg-[#16191e] border border-[#ffffff0e] rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#f7f8f8]">{w.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#0f1115] text-[#8a8f98]">
                          {w.exercises?.length || 0} Exercícios
                        </span>
                      </div>

                      <div className="space-y-1">
                        {w.exercises?.map((ex: any, exIdx: number) => (
                          <div key={exIdx} className="text-xs text-[#8a8f98] flex items-center justify-between py-1 border-t border-[#ffffff08]">
                            <span>• {ex.exerciseNamePt}</span>
                            <div className="flex items-center space-x-3 text-[11px]">
                              <span>{ex.targetSets}x{ex.targetReps}</span>
                              <span className="text-[#38bdf8] font-mono">{ex.targetWeight || 0}kg</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-3 border-t border-[#ffffff0e]">
                  <button
                    onClick={() => setAiStep(2)}
                    className="px-4 py-2 rounded-lg bg-[#16191e] text-xs text-[#8a8f98]"
                  >
                    Ajustar Configurações
                  </button>

                  <button
                    onClick={handleSaveGeneratedPlan}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg transition flex items-center space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Salvar Plano no Meu Perfil</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DRAWER LATERAL DE CHAT DO COACH IRON */}
      {isChatOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#0f1115] border-l border-[#ffffff14] shadow-2xl flex flex-col justify-between p-4 animate-in slide-in-from-right">
          <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-[#6366f120] text-[#818cf8] flex items-center justify-center font-bold text-xs">
                💪
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#f7f8f8]">Coach Iron</h3>
                <span className="text-[10px] text-[#4ade80] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                  Especialista em Musculação Online
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => fetchActionLogs()}
                title="Histórico de Auditoria de Modificações"
                className="px-2 py-1 rounded bg-[#16191e] border border-[#ffffff12] text-[10px] text-[#818cf8] hover:bg-[#1f242d] transition flex items-center space-x-1"
              >
                <span>📋 Auditoria</span>
              </button>
              <button
                onClick={() => {
                  fetchChatSessions();
                  setShowSessionsModal(true);
                }}
                title="Lista de Conversas Anteriores"
                className="px-2 py-1 rounded bg-[#16191e] border border-[#ffffff12] text-[10px] text-[#8a8f98] hover:text-white hover:bg-[#1f242d] transition"
              >
                <span>📜 Sessões</span>
              </button>
              <button
                onClick={() => startNewChatSession()}
                title="Iniciar Nova Conversa"
                className="px-2 py-1 rounded bg-[#6366f120] border border-[#6366f140] text-[10px] text-[#818cf8] hover:bg-[#6366f140] transition"
              >
                <span>+ Nova</span>
              </button>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded bg-[#16191e] text-[#8a8f98] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lista de Mensagens */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 px-1">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-[#6366f1] text-white rounded-br-none'
                      : 'bg-[#16191e] text-[#f7f8f8] border border-[#ffffff0e] rounded-bl-none'
                  }`}
                >
                  <div>{msg.text}</div>

                  {/* Action Executed Interactive Card */}
                  {msg.actionExecuted && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs space-y-2 mt-2 text-left">
                      <div className="flex items-center space-x-1.5 font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{msg.actionExecuted.templateName || 'Treino'} — Atualizado!</span>
                      </div>

                      {msg.actionExecuted.addedExercises?.length > 0 && (
                        <p className="text-[11px] text-[#8a8f98]">
                          Exercícios incluídos: <strong className="text-[#f7f8f8]">{msg.actionExecuted.addedExercises.join(', ')}</strong>
                        </p>
                      )}

                      {msg.actionExecuted.oldExercise && (
                        <p className="text-[11px] text-[#8a8f98]">
                          Substituição: <span className="line-through text-red-400">{msg.actionExecuted.oldExercise}</span> → <strong className="text-emerald-400">{msg.actionExecuted.newExercise}</strong>
                        </p>
                      )}

                      <button
                        onClick={() => {
                          loadData();
                          setIsChatOpen(false);
                        }}
                        className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center justify-center space-x-1"
                      >
                        <span>Ver Treino Atualizado na Lista →</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sendingChat && (
              <div className="flex justify-start">
                <div className="bg-[#16191e] text-[#8a8f98] p-3 rounded-2xl text-xs flex items-center space-x-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#818cf8]" />
                  <span>Coach Iron está analisando e aplicando a adaptação...</span>
                </div>
              </div>
            )}
          </div>

          {/* Form de Envio com Chips de Ação */}
          <div className="pt-3 border-t border-[#ffffff0e] space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Pergunte ou peça para o Coach adaptar seu treino..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                className="flex-1 px-3 py-2 rounded-xl bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#6366f1]"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={sendingChat || !chatInput.trim()}
                className="p-2 rounded-xl bg-[#6366f1] text-white disabled:opacity-50 transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto text-[10px] text-[#8a8f98] pb-1 scrollbar-none">
              <button
                onClick={() => handleSendChat('Quero dar uma adaptada no meu treino, focar mais em bíceps e tríceps')}
                className="px-2.5 py-1 rounded-lg bg-[#16191e] border border-[#ffffff10] whitespace-nowrap hover:border-[#6366f140] hover:text-[#818cf8] transition flex items-center space-x-1"
              >
                <span>⚡ Focar em Bíceps e Tríceps</span>
              </button>
              <button
                onClick={() => handleSendChat('Estou com dor no ombro direito, troque os supinos por halteres')}
                className="px-2.5 py-1 rounded-lg bg-[#16191e] border border-[#ffffff10] whitespace-nowrap hover:border-[#6366f140] hover:text-[#818cf8] transition flex items-center space-x-1"
              >
                <span>🩹 Trocar Supinos (Dor Ombro)</span>
              </button>
              <button
                onClick={() => handleSendChat('Como fazer progressão de carga no supino e agachamento?')}
                className="px-2.5 py-1 rounded-lg bg-[#16191e] border border-[#ffffff10] whitespace-nowrap hover:border-[#6366f140] hover:text-[#818cf8] transition flex items-center space-x-1"
              >
                <span>📈 Progressão de Carga</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DE EXERCÍCIO COM GIF */}
      {selectedExerciseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedExerciseModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#16191e] text-[#8a8f98] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#6366f120] text-[#818cf8] uppercase">
                {selectedExerciseModal.muscleGroup}
              </span>
              <h3 className="text-lg font-bold text-[#f7f8f8] mt-1">{selectedExerciseModal.namePt}</h3>
              {selectedExerciseModal.nameEn && (
                <p className="text-xs text-[#8a8f98] italic">{selectedExerciseModal.nameEn}</p>
              )}
            </div>

            <div key={selectedExerciseModal.id} className="w-full h-64 rounded-xl bg-[#16191e] border border-[#ffffff0e] flex items-center justify-center overflow-hidden relative group">
              <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-[#ffffff15] text-[10px] font-medium text-[#818cf8] flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#38bdf8]" />
                <span>Animação 3D — Demonstração em Loop</span>
              </div>

              {selectedExerciseModal.gifUrl && !modalGifError ? (
                <img
                  src={selectedExerciseModal.gifUrl}
                  alt={selectedExerciseModal.namePt}
                  className="w-full h-full object-contain p-2"
                  onError={() => {
                    setModalGifError(true);
                  }}
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <Dumbbell className="w-10 h-10 text-[#818cf8] mx-auto animate-pulse" />
                  <p className="text-xs text-[#8a8f98]">Demonstração 3D Mannequin</p>
                  <button
                    type="button"
                    onClick={forceSyncGifs}
                    className="px-3 py-1.5 rounded-lg bg-[#6366f1] text-white font-medium hover:bg-[#4f46e5] transition text-xs flex items-center justify-center space-x-1 mx-auto"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    <span>Sincronizar Animações 3D</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#f7f8f8]">Instruções de Execução:</h4>
              <p className="text-xs text-[#8a8f98] leading-relaxed">
                {selectedExerciseModal.instructions ||
                  `Realize a amplitude completa do movimento para ${selectedExerciseModal.namePt}. Expire na fase concêntrica e mantenha o ritmo controlado na fase excêntrica.`}
              </p>
            </div>

            <div className="pt-3 border-t border-[#ffffff0e] flex items-center justify-between text-xs text-[#575c66]">
              <span>Músculos secundários: {selectedExerciseModal.secondaryMuscle || 'Variados'}</span>
              <span>MET: {selectedExerciseModal.metValue || 5.0}</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRIAÇÃO MANUAL */}
      {isCreateTemplateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreateTemplateOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#16191e] text-[#8a8f98] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-[#f7f8f8]">Criar Nova Rotina de Treino</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-[#8a8f98] block mb-1">Nome do Treino</label>
                <input
                  type="text"
                  placeholder="Ex: Treino A - Peitoral & Tríceps"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#6366f1]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#8a8f98] block mb-1">
                  Selecione os Exercícios do Treino ({selectedExerciseIds.length} selecionados)
                </label>
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 border border-[#ffffff0e] rounded-lg p-2 bg-[#16191e]/50">
                  {(allExercises.length > 0 ? allExercises : exercises).length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#8a8f98] space-y-3">
                      <p>Nenhum exercício disponível na lista.</p>
                      <button
                        type="button"
                        onClick={fetchExercisesDirectly}
                        className="px-3 py-1.5 rounded-lg bg-[#6366f1] text-white font-medium hover:bg-[#4f46e5] transition text-xs"
                      >
                        ⚡ Carregar Exercícios Padrão
                      </button>
                    </div>
                  ) : (
                    (allExercises.length > 0 ? allExercises : exercises).map((ex) => {
                      const isSelected = selectedExerciseIds.includes(ex.id);
                      return (
                        <div
                          key={ex.id}
                          onClick={() => toggleSelectExerciseForTemplate(ex.id)}
                          className={`p-2 rounded-md text-xs cursor-pointer flex items-center justify-between transition ${
                            isSelected
                              ? 'bg-[#6366f120] text-[#818cf8] border border-[#6366f140]'
                              : 'hover:bg-[#16191e] text-[#8a8f98]'
                          }`}
                        >
                          <div>
                            <span className="font-medium">{ex.namePt || ex.name}</span>
                            <span className="text-[10px] text-[#575c66] ml-2">({ex.muscleGroup})</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#818cf8]" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#ffffff0e]">
              <button
                onClick={() => setIsCreateTemplateOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#16191e] text-xs font-medium text-[#8a8f98] hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTemplate}
                className="px-4 py-2 rounded-lg bg-[#6366f1] text-xs font-semibold text-white hover:bg-[#4f46e5]"
              >
                Salvar Rotina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TREINOS CONCLUÍDOS / REABRIR TREINO */}
      {isCompletedModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-2xl p-6 max-w-3xl w-full space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-[#6366f120] border border-[#6366f140] flex items-center justify-center text-[#818cf8]">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#f7f8f8]">Treinos Concluídos & Reabertura</h3>
                  <p className="text-xs text-[#8a8f98]">
                    Concluiu um treino sem querer? Clique em "Reabrir" para voltar à sessão e registrar novas séries.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCompletedModalOpen(false)}
                className="text-[#8a8f98] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 scrollbar-none">
              {loadingCompleted ? (
                <div className="py-12 text-center text-xs text-[#8a8f98] space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#6366f1]" />
                  <p>Carregando treinos concluídos...</p>
                </div>
              ) : completedSessions.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8a8f98] space-y-2">
                  <Calendar className="w-8 h-8 text-[#575c66] mx-auto" />
                  <p>Nenhum treino concluído recentemente.</p>
                </div>
              ) : (
                completedSessions.map((sess) => {
                  const finishedDate = sess.finishedAt ? new Date(sess.finishedAt) : new Date(sess.startedAt);
                  return (
                    <div
                      key={sess.id}
                      className="p-4 rounded-xl bg-[#16191e] border border-[#ffffff0e] hover:border-[#6366f140] transition space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ffffff0a] pb-2">
                        <div>
                          <h4 className="font-bold text-sm text-[#f7f8f8]">{sess.title || 'Treino'}</h4>
                          <span className="text-[11px] text-[#8a8f98]">
                            Concluído em {finishedDate.toLocaleDateString('pt-BR')} às {finishedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-3 text-xs font-mono text-[#8a8f98]">
                            <span className="text-[#38bdf8]">{sess.durationMinutes || 0} min</span>
                            <span className="text-[#818cf8]">{sess.totalVolume || 0} kg</span>
                            <span className="text-[#f97316]">{sess.caloriesBurned || 0} kcal</span>
                          </div>

                          <button
                            onClick={() => handleReopenSession(sess.id, sess.title)}
                            className="px-3 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-semibold shadow-md transition flex items-center space-x-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reabrir Treino</span>
                          </button>

                          <button
                            onClick={() => handleDeleteSession(sess.id)}
                            className="p-1.5 rounded-lg bg-[#0f1115] border border-[#ffffff10] text-[#8a8f98] hover:text-[#ef4444] hover:bg-[#ef444415] transition"
                            title="Excluir Registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Resumo de Exercícios */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {sess.exercises?.map((se: any) => (
                          <span
                            key={se.id}
                            className="px-2 py-0.5 rounded bg-[#0f1115] border border-[#ffffff0a] text-[10px] text-[#8a8f98]"
                          >
                            {se.exercise?.namePt || se.exercise?.name} ({se.sets?.filter((st: any) => st.isCompleted)?.length || 0} séries)
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#ffffff0e]">
              <Link
                href="/saude/treinos/historico"
                onClick={() => setIsCompletedModalOpen(false)}
                className="text-xs text-[#818cf8] hover:underline font-medium"
              >
                Ver Relatório e Histórico Completo →
              </Link>
              <button
                onClick={() => setIsCompletedModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#16191e] text-xs font-medium text-[#8a8f98] hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SESSÕES DE CHAT DO COACH IRON */}
      {showSessionsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-5 h-5 text-[#818cf8]" />
                <h3 className="text-sm font-bold text-[#f7f8f8]">Histórico de Conversas com Coach Iron</h3>
              </div>
              <button onClick={() => setShowSessionsModal(false)} className="text-[#8a8f98] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1 scrollbar-none">
              {chatSessions.length === 0 ? (
                <p className="text-xs text-[#8a8f98] text-center py-8">Nenhuma conversa gravada ainda.</p>
              ) : (
                chatSessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      loadSessionMessages(s.id);
                      setShowSessionsModal(false);
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                      activeChatSessionId === s.id
                        ? 'bg-[#6366f115] border-[#6366f160]'
                        : 'bg-[#16191e] border-[#ffffff0e] hover:border-[#ffffff20]'
                    }`}
                  >
                    <div className="space-y-0.5 max-w-[85%]">
                      <h4 className="text-xs font-bold text-[#f7f8f8] truncate">{s.title}</h4>
                      <p className="text-[11px] text-[#8a8f98] truncate">{s.lastMessage}</p>
                      <span className="text-[9px] text-[#6366f1] font-mono">
                        {new Date(s.updatedAt).toLocaleDateString('pt-BR')} às {new Date(s.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {activeChatSessionId === s.id && (
                      <span className="text-[10px] bg-[#6366f1] text-white px-2 py-0.5 rounded-full font-semibold">Ativa</span>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#ffffff0e] flex justify-between items-center">
              <button
                onClick={() => startNewChatSession()}
                className="px-3 py-1.5 rounded-lg bg-[#6366f1] text-white text-xs font-semibold hover:bg-[#4f46e5] transition"
              >
                + Iniciar Nova Conversa
              </button>
              <button
                onClick={() => setShowSessionsModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[#16191e] text-xs font-medium text-[#8a8f98] hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AUDITORIA DE AÇÕES DO COACH IRON */}
      {showActionLogModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-2xl p-6 max-w-xl w-full space-y-4 max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-[#4ade80]" />
                <h3 className="text-sm font-bold text-[#f7f8f8]">Log de Auditoria — Alterações do Coach</h3>
              </div>
              <button onClick={() => setShowActionLogModal(false)} className="text-[#8a8f98] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1 scrollbar-none">
              {actionLogs.length === 0 ? (
                <p className="text-xs text-[#8a8f98] text-center py-8">Nenhuma alteração registrada ainda.</p>
              ) : (
                actionLogs.map((log) => {
                  const p: any = log.payload || {};
                  const dateStr = new Date(log.createdAt).toLocaleDateString('pt-BR');
                  const timeStr = new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={log.id} className="p-3 rounded-xl bg-[#16191e] border border-[#ffffff0e] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 font-mono text-[11px]">
                          {log.actionType === 'WORKOUT_UPDATED' ? '⚡ TREINO ADAPTADO' : log.actionType === 'EXERCISE_SWAPPED' ? '🩹 EXERCÍCIO SUBSTITUÍDO' : '📋 NOVA ROTINA'}
                        </span>
                        <span className="text-[10px] text-[#8a8f98]">{dateStr} às {timeStr}</span>
                      </div>

                      <h4 className="font-semibold text-[#f7f8f8]">{p.templateName || 'Ficha de Treino'}</h4>

                      {p.addedExercises?.length > 0 && (
                        <p className="text-[#8a8f98] text-[11px]">
                          Exercícios Adicionados: <strong className="text-white">{p.addedExercises.join(', ')}</strong>
                        </p>
                      )}

                      {p.oldExercise && (
                        <p className="text-[#8a8f98] text-[11px]">
                          Removido: <span className="line-through text-red-400">{p.oldExercise}</span> → Inserido: <strong className="text-emerald-400">{p.newExercise}</strong>
                        </p>
                      )}

                      {p.reasoning && (
                        <p className="text-[10px] italic text-[#818cf8] bg-[#6366f110] p-2 rounded-lg border border-[#6366f120]">
                          Motivo técnico: "{p.reasoning}"
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-[#ffffff0e] flex justify-end">
              <button
                onClick={() => setShowActionLogModal(false)}
                className="px-4 py-1.5 rounded-lg bg-[#16191e] text-xs font-medium text-[#8a8f98] hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

