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

  // Filters & Loading
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedExerciseModal, setSelectedExerciseModal] = useState<any>(null);
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateColor, setNewTemplateColor] = useState('#6366f1');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedMuscleGroup, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Stats
      const statsRes = await authFetch('/api/workouts/stats');
      if (statsRes.ok) setStats(await statsRes.json());

      // 2. Fetch Active Session
      const activeRes = await authFetch('/api/workouts/sessions/active');
      if (activeRes.ok) {
        const sessionData = await activeRes.json();
        setActiveSession(sessionData);
      }

      // 3. Fetch Templates
      const templatesRes = await authFetch('/api/workouts/templates');
      if (templatesRes.ok) setTemplates(await templatesRes.json());

      // 4. Fetch Exercises
      const queryParams = new URLSearchParams();
      if (selectedMuscleGroup !== 'ALL') queryParams.append('muscleGroup', selectedMuscleGroup);
      if (searchQuery) queryParams.append('search', searchQuery);

      const exRes = await authFetch(`/api/workouts/exercises?${queryParams.toString()}`);
      if (exRes.ok) setExercises(await exRes.json());

      // 5. Fetch Recent Sessions
      const sessionsRes = await authFetch('/api/workouts/sessions?limit=5');
      if (sessionsRes.ok) setRecentSessions(await sessionsRes.json());
    } catch (err) {
      console.error('Erro ao carregar dados de treinos:', err);
    } finally {
      setLoading(false);
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
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-16">
      {/* Header Linear */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#6366f115] border border-[#6366f130] flex items-center justify-center text-[#818cf8]">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#f7f8f8] tracking-tight">Treinos Físicos & Musculação</h1>
            <p className="text-xs text-[#8a8f98]">
              Gerencie seus treinos semanais, acompanhe cargas, séries, duração e calorias gastas.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/saude/treinos/historico"
            className="px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs font-medium hover:bg-[#1f242d] transition flex items-center space-x-2 text-[#8a8f98] hover:text-[#f7f8f8]"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Histórico & Analytics</span>
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
              className="px-4 py-2 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-semibold shadow-lg shadow-[#6366f130] transition flex items-center space-x-2"
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
          <span className="text-[10px] text-[#575c66] mt-1">Meta: 4 a 5 treinos/semana</span>
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

      {/* Seção MEUS TREINOS (TEMPLATES) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#f7f8f8]">Meus Treinos Semanais (Templates)</h2>
            <p className="text-xs text-[#8a8f98]">Selecione um treino pronto para iniciar ou crie novas rotinas.</p>
          </div>

          <button
            onClick={() => setIsCreateTemplateOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs font-medium text-[#818cf8] hover:bg-[#1f242d] transition flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Criar Novo Treino</span>
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="p-8 rounded-xl bg-[#0f1115] border border-[#ffffff0e] text-center space-y-3">
            <Dumbbell className="w-8 h-8 text-[#575c66] mx-auto" />
            <p className="text-xs text-[#8a8f98]">Você ainda não possui rotinas de treino criadas.</p>
            <button
              onClick={() => setIsCreateTemplateOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#6366f1] text-white text-xs font-semibold hover:bg-[#4f46e5] transition"
            >
              Criar Primeiro Treino
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-5 rounded-xl bg-[#0f1115] border border-[#ffffff0e] hover:border-[#6366f140] transition flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tpl.color || '#6366f1' }} />
                      <h3 className="font-semibold text-sm text-[#f7f8f8] group-hover:text-[#818cf8] transition">
                        {tpl.name}
                      </h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#16191e] text-[#8a8f98]">
                      {tpl.items?.length || 0} Exercícios
                    </span>
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

                <button
                  onClick={() => startWorkout(tpl.id)}
                  className="w-full py-2 rounded-lg bg-[#16191e] hover:bg-[#6366f1] text-[#818cf8] hover:text-white border border-[#ffffff12] hover:border-[#6366f1] text-xs font-semibold transition flex items-center justify-center space-x-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Iniciar Este Treino</span>
                </button>
              </div>
            ))}
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

          {/* Input de Busca */}
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

      {/* MODAL DE DETALHES DE EXERCÍCIO COM GIF */}
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

            {/* Simulação GIF/Imagem */}
            <div className="w-full h-56 rounded-xl bg-[#16191e] border border-[#ffffff0e] flex items-center justify-center overflow-hidden relative">
              {selectedExerciseModal.gifUrl ? (
                <img
                  src={selectedExerciseModal.gifUrl}
                  alt={selectedExerciseModal.namePt}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 space-y-2">
                  <Dumbbell className="w-12 h-12 text-[#575c66] mx-auto animate-pulse" />
                  <p className="text-xs text-[#8a8f98]">Demonstração 3D de Execução</p>
                  <span className="text-[10px] text-[#575c66] block">
                    Equipamento necessário: {selectedExerciseModal.equipment}
                  </span>
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

      {/* MODAL DE CRIAÇÃO DE TEMPLATE */}
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
                  {exercises.map((ex) => {
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
                          <span className="font-medium">{ex.namePt}</span>
                          <span className="text-[10px] text-[#575c66] ml-2">({ex.muscleGroup})</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#818cf8]" />}
                      </div>
                    );
                  })}
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
    </div>
  );
}
