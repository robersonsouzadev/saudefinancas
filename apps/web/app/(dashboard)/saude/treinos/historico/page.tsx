'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  Calendar,
  Clock,
  Flame,
  Layers,
  ChevronLeft,
  Star,
  CheckCircle2,
  Dumbbell,
  RotateCcw,
  Trash2,
  Play,
} from 'lucide-react';
import { authFetch } from '@/lib/api';

export default function WorkoutHistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const [sessionsRes, statsRes, reportRes] = await Promise.all([
        authFetch('/api/workouts/sessions?limit=50'),
        authFetch('/api/workouts/stats'),
        authFetch('/api/workouts/ai/weekly-report'),
      ]);

      if (sessionsRes.ok) setSessions(await sessionsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (reportRes.ok) setWeeklyReport(await reportRes.json());
    } catch (err) {
      console.error('Erro ao carregar histórico de treinos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReopenSession = async (sessionId: string, title: string) => {
    if (!confirm(`Deseja reabrir o treino "${title || 'Treino'}" para continuar registrando?`)) return;

    try {
      const res = await authFetch(`/api/workouts/sessions/${sessionId}/reopen`, {
        method: 'PUT',
      });

      if (res.ok) {
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
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } else {
        alert('Erro ao excluir treino do histórico.');
      }
    } catch (err) {
      console.error('Erro ao excluir sessão de treino:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 text-[#f7f8f8]">
      {/* Header Linear */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/saude/treinos"
            className="p-2 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#8a8f98] hover:text-white transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Histórico de Treinos & Progresso</h1>
            <p className="text-xs text-[#8a8f98]">
              Consulte seu histórico completo de sessões executadas, volume levantado e calorias.
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e]">
          <span className="text-xs text-[#8a8f98] block mb-1">Total de Treinos</span>
          <div className="text-2xl font-bold">{stats?.totalWorkouts || 0}</div>
          <span className="text-[10px] text-[#575c66]">Sessões concluídas</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e]">
          <span className="text-xs text-[#8a8f98] block mb-1">Volume Acumulado</span>
          <div className="text-2xl font-bold text-[#818cf8]">
            {(((stats?.totalVolume || 0) / 1000)).toFixed(1)} <span className="text-xs text-[#8a8f98]">ton</span>
          </div>
          <span className="text-[10px] text-[#575c66]">Soma total de cargas</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e]">
          <span className="text-xs text-[#8a8f98] block mb-1">Calorias Gastas</span>
          <div className="text-2xl font-bold text-[#f97316]">
            {stats?.totalCalories || 0} <span className="text-xs text-[#8a8f98]">kcal</span>
          </div>
          <span className="text-[10px] text-[#575c66]">Total estimado MET</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e]">
          <span className="text-xs text-[#8a8f98] block mb-1">Treinos Esta Semana</span>
          <div className="text-2xl font-bold text-emerald-400">{stats?.weeklyWorkouts || 0}</div>
          <span className="text-[10px] text-[#575c66]">Assiduidade semanal</span>
        </div>
      </div>

      {/* RELATÓRIO EXECUTIVO SEMANAL DO COACH IRON (FASE 3) */}
      {weeklyReport && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0f1115] via-[#16191e] to-[#0f1115] border border-[#6366f140] space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg">🤖</span>
              <div>
                <h3 className="font-bold text-sm text-[#f7f8f8]">Relatório Semanal Executivo — Coach Iron</h3>
                <span className="text-[10px] text-[#818cf8] font-mono">{weeklyReport.period} • {weeklyReport.userName}</span>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#6366f120] text-[#818cf8] border border-[#6366f140] font-mono">
              Volume: {weeklyReport.totalVolumeTons} ton
            </span>
          </div>

          <p className="text-xs text-[#f7f8f8] leading-relaxed bg-[#080a0c]/60 p-3 rounded-xl border border-[#ffffff08]">
            {weeklyReport.coachVerdict}
          </p>

          {/* Ranking SFR dos Exercícios */}
          {weeklyReport.topExercisesSFR?.length > 0 && (
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-semibold text-[#8a8f98]">Seus Exercícios Mais Eficientes (Relação Estímulo / Fadiga — SFR)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {weeklyReport.topExercisesSFR.map((sfr: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-[#080a0c] border border-[#ffffff08] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-[#f7f8f8] block">{sfr.exerciseName}</span>
                      <span className="text-[10px] text-[#8a8f98]">{sfr.tier} • RPE Médio: {sfr.avgRpe}</span>
                    </div>
                    <span className="text-xs font-bold text-[#818cf8] font-mono">SFR {sfr.sfrScore}/10</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista de Sessões Realizadas */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold">Sessões Realizadas</h2>

        {sessions.length === 0 ? (
          <div className="p-12 text-center bg-[#0f1115] border border-[#ffffff0e] rounded-2xl space-y-2">
            <Calendar className="w-8 h-8 text-[#575c66] mx-auto" />
            <p className="text-xs text-[#8a8f98]">Nenhum treino registrado no histórico ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((sess) => {
              const startDate = new Date(sess.startedAt);
              return (
                <div
                  key={sess.id}
                  className="p-5 rounded-2xl bg-[#0f1115] border border-[#ffffff0e] hover:border-[#6366f140] transition space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ffffff0a] pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-[#6366f115] border border-[#6366f130] flex items-center justify-center text-[#818cf8]">
                        <Dumbbell className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[#f7f8f8]">{sess.title || 'Treino'}</h3>
                        <span className="text-xs text-[#8a8f98]">
                          {startDate.toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-4 text-xs font-mono">
                        <div className="flex items-center space-x-1 text-[#38bdf8]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{sess.durationMinutes || 0} min</span>
                        </div>

                        <div className="flex items-center space-x-1 text-[#818cf8]">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{sess.totalVolume || 0} kg</span>
                        </div>

                        <div className="flex items-center space-x-1 text-[#f97316]">
                          <Flame className="w-3.5 h-3.5" />
                          <span>{sess.caloriesBurned || 0} kcal</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleReopenSession(sess.id, sess.title)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#6366f120] text-[#818cf8] hover:bg-[#6366f130] text-xs font-medium transition flex items-center space-x-1 border border-[#6366f140]"
                        title="Reabrir este treino concluído para continuar editando"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reabrir</span>
                      </button>

                      <button
                        onClick={() => handleDeleteSession(sess.id)}
                        className="p-1.5 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#8a8f98] hover:text-[#ef4444] hover:bg-[#ef444415] transition"
                        title="Excluir Registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Resumo de Exercícios */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {sess.exercises?.map((sessionEx: any) => {
                      const completedSets = sessionEx.sets?.filter((s: any) => s.isCompleted);
                      return (
                        <div
                          key={sessionEx.id}
                          className="p-2.5 rounded-lg bg-[#16191e] border border-[#ffffff08] text-xs space-y-1"
                        >
                          <span className="font-semibold text-[#f7f8f8] block truncate">
                            {sessionEx.exercise?.namePt || sessionEx.exercise?.name}
                          </span>
                          <span className="text-[10px] text-[#8a8f98] block">
                            {completedSets?.length || 0} séries concluídas
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {sess.notes && (
                    <p className="text-xs text-[#8a8f98] italic pt-1 border-t border-[#ffffff08]">
                      Nota: "{sess.notes}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
