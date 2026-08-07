'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  Check,
  Plus,
  Trash2,
  Clock,
  Flame,
  Layers,
  Dumbbell,
  CheckCircle2,
  ChevronLeft,
  X,
  Sparkles,
  AlertCircle,
  Star,
  Eye,
  EyeOff,
} from 'lucide-react';
import { authFetch } from '@/lib/api';

export default function WorkoutSessionPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Rest Timer State
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | null>(null);
  const [restTimerActive, setRestTimerActive] = useState(false);

  // Add Exercise Modal
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [availableExercises, setAvailableExercises] = useState<any[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');

  // Finish Modal State
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [intensity, setIntensity] = useState('MODERATE');
  const [notes, setNotes] = useState('');
  const [finishedSummary, setFinishedSummary] = useState<any>(null);

  // GIF Preview Toggle
  const [expandedGifId, setExpandedGifId] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveSession(true);
  }, []);

  // Timer principal da sessão
  useEffect(() => {
    if (!session || session.finishedAt) return;

    const startTime = new Date(session.startedAt).getTime();
    const updateDuration = () => {
      const now = new Date().getTime();
      setElapsedSeconds(Math.floor((now - startTime) / 1000));
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // Rest Timer logic
  useEffect(() => {
    if (!restTimerActive || restTimerSeconds === null || restTimerSeconds <= 0) return;

    const timer = setInterval(() => {
      setRestTimerSeconds((prev) => {
        if (prev === null || prev <= 1) {
          setRestTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [restTimerActive, restTimerSeconds]);

  const fetchActiveSession = async (showLoadingSpinner = false) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      const res = await authFetch('/api/workouts/sessions/active');
      if (res.ok) {
        const data = await res.json();
        if (!data) {
          router.push('/saude/treinos');
          return;
        }
        setSession(data);
      } else {
        router.push('/saude/treinos');
      }
    } catch (err) {
      console.error('Erro ao carregar sessão ativa:', err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  const handleUpdateSet = async (setId: string, data: any) => {
    // Optimistic UI update to prevent lag or scroll jumping
    setSession((prevSession: any) => {
      if (!prevSession) return prevSession;
      return {
        ...prevSession,
        exercises: prevSession.exercises.map((ex: any) => ({
          ...ex,
          sets: ex.sets.map((set: any) =>
            set.id === setId ? { ...set, ...data } : set
          ),
        })),
      };
    });

    try {
      const res = await authFetch(`/api/workouts/sets/${setId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        // Se a série foi completada, dispara o Rest Timer (60s padrão)
        if (data.isCompleted) {
          startRestTimer(60);
        }
        fetchActiveSession(false);
      }
    } catch (err) {
      console.error('Erro ao atualizar série:', err);
      fetchActiveSession(false);
    }
  };

  const handleAddSet = async (sessionExerciseId: string) => {
    try {
      const res = await authFetch(`/api/workouts/session-exercises/${sessionExerciseId}/set`, {
        method: 'POST',
      });
      if (res.ok) fetchActiveSession(false);
    } catch (err) {
      console.error('Erro ao adicionar série:', err);
    }
  };

  const handleRemoveSet = async (setId: string) => {
    try {
      const res = await authFetch(`/api/workouts/sets/${setId}`, {
        method: 'DELETE',
      });
      if (res.ok) fetchActiveSession(false);
    } catch (err) {
      console.error('Erro ao remover série:', err);
    }
  };

  const startRestTimer = (seconds: number) => {
    setRestTimerSeconds(seconds);
    setRestTimerActive(true);
  };

  const openAddExerciseModal = async () => {
    setIsAddExerciseModalOpen(true);
    try {
      const res = await authFetch('/api/workouts/exercises');
      if (res.ok) setAvailableExercises(await res.json());
    } catch (err) {
      console.error('Erro ao carregar lista de exercícios:', err);
    }
  };

  const handleAddExerciseToSession = async (exerciseId: string) => {
    if (!session) return;
    try {
      const res = await authFetch(`/api/workouts/sessions/${session.id}/exercise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId }),
      });

      if (res.ok) {
        setIsAddExerciseModalOpen(false);
        fetchActiveSession(false);
      }
    } catch (err) {
      console.error('Erro ao adicionar exercício:', err);
    }
  };

  const handleFinishSession = async () => {
    if (!session) return;
    try {
      const res = await authFetch(`/api/workouts/sessions/${session.id}/finish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, intensity, notes }),
      });

      if (res.ok) {
        const finishedData = await res.json();
        setFinishedSummary(finishedData);
      }
    } catch (err) {
      console.error('Erro ao finalizar treino:', err);
    }
  };

  const formatSeconds = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Dumbbell className="w-10 h-10 text-[#818cf8] animate-bounce mx-auto" />
          <p className="text-xs text-[#8a8f98]">Carregando sessão de treino...</p>
        </div>
      </div>
    );
  }

  if (finishedSummary) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pt-6 text-center text-[#f7f8f8]">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Treino Concluído! 🎉</h1>
          <p className="text-xs text-[#8a8f98]">Ótimo trabalho! Suas estatísticas foram registradas no histórico.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e]">
          <div className="p-3 bg-[#16191e] rounded-lg">
            <span className="text-[10px] text-[#8a8f98] block">Duração</span>
            <span className="text-lg font-bold text-[#38bdf8]">{finishedSummary.durationMinutes || 0} min</span>
          </div>

          <div className="p-3 bg-[#16191e] rounded-lg">
            <span className="text-[10px] text-[#8a8f98] block">Volume Carga</span>
            <span className="text-lg font-bold text-[#818cf8]">{finishedSummary.totalVolume || 0} kg</span>
          </div>

          <div className="p-3 bg-[#16191e] rounded-lg">
            <span className="text-[10px] text-[#8a8f98] block">Calorias Gastas</span>
            <span className="text-lg font-bold text-[#f97316]">{finishedSummary.caloriesBurned || 0} kcal</span>
          </div>
        </div>

        <button
          onClick={() => router.push('/saude/treinos')}
          className="w-full py-3 rounded-xl bg-[#6366f1] text-white font-semibold text-xs hover:bg-[#4f46e5] transition"
        >
          Voltar para o Painel de Treinos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24 text-[#f7f8f8]">
      {/* Top Header Sticky Bar */}
      <div className="sticky top-0 z-30 bg-[#080a0c]/90 backdrop-blur-md py-3 border-b border-[#ffffff0e] flex items-center justify-between">
        <button
          onClick={() => router.push('/saude/treinos')}
          className="flex items-center space-x-1.5 text-xs text-[#8a8f98] hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#16191e] border border-[#ffffff12] text-xs font-mono text-[#38bdf8]">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatSeconds(elapsedSeconds)}</span>
          </div>

          <button
            onClick={() => setIsFinishModalOpen(true)}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
          >
            Finalizar Treino
          </button>
        </div>
      </div>

      {/* Floating Rest Timer Bar (if active) */}
      {restTimerActive && restTimerSeconds !== null && restTimerSeconds > 0 && (
        <div className="fixed bottom-6 right-6 z-40 p-4 rounded-xl bg-[#0f1115] border border-[#6366f160] shadow-2xl flex items-center space-x-4 animate-bounce">
          <div className="w-10 h-10 rounded-full bg-[#6366f120] text-[#818cf8] flex items-center justify-center font-mono font-bold text-sm">
            {restTimerSeconds}s
          </div>
          <div>
            <span className="text-xs font-semibold block">Descanso em Andamento</span>
            <span className="text-[10px] text-[#8a8f98]">Recupere o fôlego antes da próxima série</span>
          </div>
          <button
            onClick={() => setRestTimerActive(false)}
            className="p-1 rounded text-[#8a8f98] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Título do Treino */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase text-[#818cf8] tracking-wider">SESSÃO DE TREINO ATIVA</span>
        <h1 className="text-xl font-bold">{session?.title || 'Treino em Andamento'}</h1>
      </div>

      {/* Lista de Exercícios na Sessão */}
      <div className="space-y-6">
        {session?.exercises?.map((sessionEx: any, exIdx: number) => (
          <div
            key={sessionEx.id}
            className="p-4 sm:p-5 rounded-2xl bg-[#0f1115] border border-[#ffffff0e] space-y-4 shadow-sm"
          >
            {/* Header do Exercício */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-lg bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[11px] font-bold text-[#818cf8]">
                  {exIdx + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#f7f8f8]">
                    {sessionEx.exercise?.namePt || sessionEx.exercise?.name}
                  </h3>
                  {sessionEx.exercise?.nameEn && (
                    <span className="text-[11px] text-[#575c66] italic block">{sessionEx.exercise.nameEn}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* GIF Preview Toggle Button */}
                {sessionEx.exercise?.gifUrl && (
                  <button
                    onClick={() => setExpandedGifId(expandedGifId === sessionEx.id ? null : sessionEx.id)}
                    className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-[10px] font-semibold transition-all ${
                      expandedGifId === sessionEx.id
                        ? 'bg-[#818cf820] border-[#818cf850] text-[#818cf8]'
                        : 'bg-[#16191e] border-[#ffffff12] text-[#8a8f98] hover:text-[#818cf8] hover:border-[#818cf840]'
                    }`}
                    title="Ver demonstração do exercício"
                  >
                    {expandedGifId === sessionEx.id ? (
                      <><EyeOff className="w-3 h-3" /><span>Ocultar</span></>
                    ) : (
                      <><Eye className="w-3 h-3" /><span>Como fazer</span></>
                    )}
                  </button>
                )}

                <span className="text-[10px] px-2 py-0.5 rounded bg-[#16191e] text-[#38bdf8] font-mono">
                  {sessionEx.exercise?.equipment}
                </span>
              </div>
            </div>

            {/* Expandable 3D GIF Preview */}
            {expandedGifId === sessionEx.id && sessionEx.exercise?.gifUrl && (
              <div className="rounded-xl overflow-hidden border border-[#ffffff12] bg-[#080a0c] flex items-center justify-center p-2 animate-in slide-in-from-top-2 duration-300">
                <div className="relative w-full max-w-xs aspect-square">
                  <img
                    src={sessionEx.exercise.gifUrl}
                    alt={`Demonstração: ${sessionEx.exercise?.namePt || sessionEx.exercise?.name}`}
                    className="w-full h-full object-contain rounded-lg"
                    loading="lazy"
                  />
                  <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm">
                    <span className="text-[10px] text-[#8a8f98] block text-center">Demonstração 3D — {sessionEx.exercise?.namePt || sessionEx.exercise?.name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tabela de Séries (3-Tap UX Rule) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#575c66] border-b border-[#ffffff0a] pb-2">
                    <th className="py-1 font-medium w-12 text-center">SÉRIE</th>
                    <th className="py-1 font-medium w-24">CARGA (KG)</th>
                    <th className="py-1 font-medium w-24">REPS</th>
                    <th className="py-1 font-medium text-center w-16">CONCLUÍDO</th>
                    <th className="py-1 font-medium w-10 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff08]">
                  {sessionEx.sets?.map((set: any, setIdx: number) => (
                    <tr
                      key={set.id}
                      className={`transition ${set.isCompleted ? 'bg-emerald-500/5' : 'hover:bg-[#16191e]'}`}
                    >
                      <td className="py-2.5 text-center font-mono font-semibold text-[#8a8f98]">
                        {setIdx + 1}
                      </td>

                      <td className="py-2">
                        <input
                          type="number"
                          step="0.5"
                          value={set.weight || ''}
                          onChange={(e) =>
                            handleUpdateSet(set.id, { weight: parseFloat(e.target.value) || 0 })
                          }
                          placeholder="0"
                          className="w-16 px-2 py-1 rounded bg-[#16191e] border border-[#ffffff12] text-xs font-mono text-center focus:outline-none focus:border-[#6366f1]"
                        />
                      </td>

                      <td className="py-2">
                        <input
                          type="number"
                          value={set.reps || ''}
                          onChange={(e) =>
                            handleUpdateSet(set.id, { reps: parseInt(e.target.value, 10) || 0 })
                          }
                          placeholder="0"
                          className="w-16 px-2 py-1 rounded bg-[#16191e] border border-[#ffffff12] text-xs font-mono text-center focus:outline-none focus:border-[#6366f1]"
                        />
                      </td>

                      <td className="py-2 text-center">
                        <button
                          onClick={() => handleUpdateSet(set.id, { isCompleted: !set.isCompleted })}
                          className={`w-7 h-7 rounded-lg mx-auto flex items-center justify-center transition ${
                            set.isCompleted
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                              : 'bg-[#16191e] text-[#575c66] hover:text-[#8a8f98] border border-[#ffffff12]'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>
                      </td>

                      <td className="py-2 text-right">
                        <button
                          onClick={() => handleRemoveSet(set.id)}
                          className="p-1 text-[#575c66] hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Adicionar Série */}
            <div className="flex items-center justify-between pt-2 border-t border-[#ffffff0a]">
              <button
                onClick={() => handleAddSet(sessionEx.id)}
                className="px-3 py-1.5 rounded-lg bg-[#16191e] hover:bg-[#1f242d] text-xs font-medium text-[#818cf8] transition flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Série</span>
              </button>

              <div className="flex items-center space-x-2 text-[11px] text-[#575c66]">
                <span>Descanso:</span>
                <button
                  onClick={() => startRestTimer(60)}
                  className="px-2 py-0.5 rounded bg-[#16191e] hover:text-white"
                >
                  60s
                </button>
                <button
                  onClick={() => startRestTimer(90)}
                  className="px-2 py-0.5 rounded bg-[#16191e] hover:text-white"
                >
                  90s
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Botão Adicionar Exercício Avulso */}
        <button
          onClick={openAddExerciseModal}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-[#ffffff14] hover:border-[#6366f160] text-xs font-semibold text-[#818cf8] hover:bg-[#6366f110] transition flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Exercício a este Treino</span>
        </button>
      </div>

      {/* MODAL ADICIONAR EXERCÍCIO */}
      {isAddExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setIsAddExerciseModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#16191e] text-[#8a8f98] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold">Adicionar Exercício ao Treino</h3>

            <input
              type="text"
              placeholder="Buscar exercício pelo nome..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#6366f1]"
            />

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {availableExercises
                .filter(
                  (ex) =>
                    !exerciseSearch ||
                    ex.namePt?.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
                    ex.nameEn?.toLowerCase().includes(exerciseSearch.toLowerCase())
                )
                .map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => handleAddExerciseToSession(ex.id)}
                    className="p-3 rounded-lg bg-[#16191e] hover:bg-[#6366f120] hover:border-[#6366f140] border border-transparent cursor-pointer flex items-center justify-between transition"
                  >
                    <div>
                      <h4 className="font-semibold text-xs text-[#f7f8f8]">{ex.namePt}</h4>
                      <span className="text-[10px] text-[#575c66]">{ex.muscleGroup}</span>
                    </div>
                    <Plus className="w-4 h-4 text-[#818cf8]" />
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FINALIZAR SESSÃO */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsFinishModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#16191e] text-[#8a8f98] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold">Finalizar Treino</h3>
              <p className="text-xs text-[#8a8f98]">Confira o resumo da sua sessão de hoje.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#8a8f98] block mb-1">Intensidade do Treino</label>
                <select
                  value={intensity}
                  onChange={(e) => setIntensity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#6366f1]"
                >
                  <option value="LIGHT">Leve (Carga moderada / Descansos longos)</option>
                  <option value="MODERATE">Moderada (Bodybuilding padrão)</option>
                  <option value="VIGOROUS">Vigorosa (Cargas pesadas / Supersets)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[#8a8f98] block mb-1">Como avalia este treino?</label>
                <div className="flex items-center justify-center space-x-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-1 transition ${
                        rating >= star ? 'text-amber-400 scale-110' : 'text-[#575c66]'
                      }`}
                    >
                      <Star className="w-6 h-6 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#8a8f98] block mb-1">Notas do Treino (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Supino bateu RPE 9. Tríceps rendeu bem."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#6366f1]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-[#ffffff0e]">
              <button
                onClick={() => setIsFinishModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#16191e] text-xs font-medium text-[#8a8f98]"
              >
                Continuar Treinando
              </button>
              <button
                onClick={handleFinishSession}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-lg"
              >
                Confirmar & Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
