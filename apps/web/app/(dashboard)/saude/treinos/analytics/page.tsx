'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  Flame,
  Clock,
  Award,
  Calendar,
  Target,
  Zap,
  Activity,
  Trophy,
  BarChart2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { authFetch } from '@/lib/api';

export default function WorkoutAnalyticsPage() {
  const router = useRouter();
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics(rangeDays);
  }, [rangeDays]);

  const fetchAnalytics = async (days: number) => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/workouts/analytics?range=${days}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
        if (data.exerciseProgress && data.exerciseProgress.length > 0) {
          setSelectedExerciseId(data.exerciseProgress[0].exerciseId);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedExercise = analytics?.exerciseProgress?.find(
    (e: any) => e.exerciseId === selectedExerciseId
  ) || analytics?.exerciseProgress?.[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24 text-[#f7f8f8]">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push('/saude/treinos')}
            className="flex items-center space-x-1.5 text-xs text-[#8a8f98] hover:text-white transition mb-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Voltar para Meus Treinos</span>
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-[#818cf8]" />
            Analytics & Desempenho Fitness
          </h1>
          <p className="text-xs text-[#8a8f98]">
            Métricas de força, volume, frequência e score de performance inspirados nos melhores softwares.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-[#0f1115] border border-[#ffffff0e] self-start sm:self-auto">
          {[
            { label: '30 Dias', days: 30 },
            { label: '60 Dias', days: 60 },
            { label: '90 Dias', days: 90 },
            { label: '180 Dias', days: 180 },
          ].map((item) => (
            <button
              key={item.days}
              onClick={() => setRangeDays(item.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                rangeDays === item.days
                  ? 'bg-[#818cf8] text-white shadow-md'
                  : 'text-[#8a8f98] hover:text-white hover:bg-[#16191e]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-3">
            <Dumbbell className="w-10 h-10 text-[#818cf8] animate-bounce mx-auto" />
            <p className="text-xs text-[#8a8f98]">Compilando relatórios e estatísticas...</p>
          </div>
        </div>
      ) : !analytics ? (
        <div className="text-center py-12 space-y-3">
          <Activity className="w-10 h-10 text-[#8a8f98] mx-auto" />
          <p className="text-sm text-[#8a8f98]">Nenhum dado analítico encontrado para este período.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ===== SEÇÃO 1: KPI CARDS ===== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: Treinos */}
            <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e] space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-[#8a8f98]">
                <span className="text-[10px] font-bold uppercase tracking-wider">🏋️ Total de Treinos</span>
                {analytics.kpis.workoutsChange !== 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                      analytics.kpis.workoutsChange >= 0
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {analytics.kpis.workoutsChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {analytics.kpis.workoutsChange > 0 ? '+' : ''}{analytics.kpis.workoutsChange}%
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-[#f7f8f8]">
                {analytics.kpis.totalWorkouts} <span className="text-xs font-normal text-[#8a8f98]">sessões</span>
              </div>
              <span className="text-[10px] text-[#575c66] block">nos últimos {analytics.rangeDays} dias</span>
            </div>

            {/* KPI 2: Volume Total */}
            <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e] space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-[#8a8f98]">
                <span className="text-[10px] font-bold uppercase tracking-wider">📊 Volume Total (kg)</span>
                {analytics.kpis.volumeChange !== 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                      analytics.kpis.volumeChange >= 0
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {analytics.kpis.volumeChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {analytics.kpis.volumeChange > 0 ? '+' : ''}{analytics.kpis.volumeChange}%
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-[#818cf8]">
                {(analytics.kpis.totalVolume / 1000).toFixed(1)}t
              </div>
              <span className="text-[10px] text-[#575c66] block">Carga total levantada ({analytics.kpis.totalVolume.toLocaleString('pt-BR')} kg)</span>
            </div>

            {/* KPI 3: Calorias Gastas */}
            <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e] space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-[#8a8f98]">
                <span className="text-[10px] font-bold uppercase tracking-wider">🔥 Calorias Burned</span>
                {analytics.kpis.caloriesChange !== 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                      analytics.kpis.caloriesChange >= 0
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {analytics.kpis.caloriesChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {analytics.kpis.caloriesChange > 0 ? '+' : ''}{analytics.kpis.caloriesChange}%
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-[#f97316]">
                {analytics.kpis.totalCalories.toLocaleString('pt-BR')} <span className="text-xs font-normal text-[#8a8f98]">kcal</span>
              </div>
              <span className="text-[10px] text-[#575c66] block">Estimativa MET metabolic fitness</span>
            </div>

            {/* KPI 4: Tempo Total */}
            <div className="p-4 rounded-xl bg-[#0f1115] border border-[#ffffff0e] space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-[#8a8f98]">
                <span className="text-[10px] font-bold uppercase tracking-wider">⏱️ Duração em Treino</span>
              </div>
              <div className="text-2xl font-bold font-mono text-[#38bdf8]">
                {Math.floor(analytics.kpis.totalDurationMin / 60)}h {analytics.kpis.totalDurationMin % 60}m
              </div>
              <span className="text-[10px] text-[#575c66] block">Média de {analytics.kpis.avgDurationMin} min por sessão</span>
            </div>
          </div>

          {/* ===== SEÇÃO 2: SCORE DE ATLETA & HEATMAP DE FREQUÊNCIA ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Score de Atleta (Gauge estilo Freeletics / Garmin) */}
            <div className="p-5 rounded-2xl bg-[#0f1115] border border-[#ffffff0e] space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5 uppercase tracking-wider">
                  <Award className="w-4 h-4 text-amber-400" />
                  Score de Atleta (0-100)
                </h3>
                <span className="text-[10px] font-mono text-[#8a8f98]">Freeletics / Garmin Index</span>
              </div>

              {/* Gauge Display */}
              <div className="flex items-center justify-center py-2 relative">
                <div className="w-32 h-32 rounded-full border-8 border-[#16191e] border-t-[#818cf8] border-r-[#38bdf8] border-b-emerald-400 flex items-center justify-center shadow-xl">
                  <div className="text-center">
                    <span className="text-3xl font-extrabold font-mono text-[#f7f8f8]">
                      {analytics.athleteScore.score}
                    </span>
                    <span className="text-[10px] text-[#8a8f98] block uppercase font-mono">Pontos</span>
                  </div>
                </div>
              </div>

              {/* Sub-barras de Fatores */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#8a8f98]">Consistência Semanal</span>
                  <span className="font-mono text-[#818cf8] font-bold">{analytics.athleteScore.consistencyScore}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#16191e] overflow-hidden">
                  <div className="h-full rounded-full bg-[#818cf8]" style={{ width: `${analytics.athleteScore.consistencyScore}%` }} />
                </div>

                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-[#8a8f98]">Progressão de Volume</span>
                  <span className="font-mono text-emerald-400 font-bold">{analytics.athleteScore.volumeScore}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#16191e] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${analytics.athleteScore.volumeScore}%` }} />
                </div>
              </div>
            </div>

            {/* Heatmap de Frequência de Treinos (GitHub / Apple Rings Style) */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0f1115] border border-[#ffffff0e] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Frequência Diária (Heatmap GitHub)
                </h3>
                <span className="text-[10px] font-mono text-[#8a8f98]">Últimos {analytics.rangeDays} dias</span>
              </div>

              {/* Grid de Dias */}
              <div className="flex flex-wrap gap-1.5 py-2">
                {analytics.dailyHeatmap.map((item: any) => {
                  let colorClass = 'bg-[#16191e] border-[#ffffff08]';
                  if (item.count === 1) colorClass = 'bg-emerald-500/40 border-emerald-400/60 text-white';
                  if (item.count >= 2) colorClass = 'bg-emerald-400 border-emerald-300 text-black font-bold';

                  const dObj = new Date(item.date + 'T00:00:00');
                  const dayNum = dObj.getDate();

                  return (
                    <div
                      key={item.date}
                      className={`w-7 h-7 rounded-md border flex items-center justify-center text-[9px] font-mono transition-all hover:scale-110 cursor-pointer ${colorClass}`}
                      title={`${item.date}: ${item.count > 0 ? `${item.count} treino(s) (${item.title})` : 'Nenhum treino'}`}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="flex items-center justify-between text-[10px] text-[#575c66] pt-2 border-t border-[#ffffff08]">
                <span>Menos treinos</span>
                <div className="flex items-center space-x-1.5">
                  <span className="w-3 h-3 rounded bg-[#16191e] border border-[#ffffff12]" />
                  <span className="w-3 h-3 rounded bg-emerald-500/40 border border-emerald-400/60" />
                  <span className="w-3 h-3 rounded bg-emerald-400 border border-emerald-300" />
                </div>
                <span>Mais treinos</span>
              </div>
            </div>
          </div>

          {/* ===== SEÇÃO 3: VOLUME SEMANAL & RADAR MUSCULAR ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico 1: Volume Semanal (BarChart Recharts - Hevy Style) */}
            <div className="p-5 rounded-2xl bg-[#0f1115] border border-[#ffffff0e] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5 uppercase tracking-wider">
                  <BarChart2 className="w-4 h-4 text-[#818cf8]" />
                  Volume Total Semanal (kg)
                </h3>
                <span className="text-[10px] font-mono text-[#8a8f98]">Hevy Volume Trend</span>
              </div>

              {analytics.weeklyVolume.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-[#575c66]">
                  Sem histórico suficiente de volume.
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.weeklyVolume}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                      <XAxis dataKey="weekLabel" stroke="#575c66" fontSize={10} tickLine={false} />
                      <YAxis stroke="#575c66" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f1115', borderColor: '#ffffff1a', borderRadius: '8px', fontSize: '11px' }}
                        formatter={(val: any) => [`${Number(val).toLocaleString('pt-BR')} kg`, 'Volume Total']}
                      />
                      <Bar dataKey="totalVolume" fill="#818cf8" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Gráfico 2: Radar de Cobertura Muscular (RadarChart Recharts - RP Hypertrophy Style) */}
            <div className="p-5 rounded-2xl bg-[#0f1115] border border-[#ffffff0e] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5 uppercase tracking-wider">
                  <Target className="w-4 h-4 text-[#38bdf8]" />
                  Distribuição Muscular (Radar Body Map)
                </h3>
                <span className="text-[10px] font-mono text-[#8a8f98]">JEFIT / RP Hypertrophy</span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={analytics.muscleRadar}>
                    <PolarGrid stroke="#ffffff12" />
                    <PolarAngleAxis dataKey="muscleCategory" stroke="#8a8f98" fontSize={10} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#575c66" fontSize={8} />
                    <Radar name="Séries Executadas" dataKey="sets" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.35} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f1115', borderColor: '#ffffff1a', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(val: any) => [`${val} séries`, 'Total de Séries']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ===== SEÇÃO 4: PROGRESSÃO DE 1RM POR EXERCÍCIO (STRONG STYLE) ===== */}
          <div className="p-5 rounded-2xl bg-[#0f1115] border border-[#ffffff0e] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5 uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Evolução de Força (1RM Estimado — Epley Formula)
                </h3>
                <p className="text-[11px] text-[#8a8f98]">Progresso de carga máxima estimada para cada exercício ao longo do tempo.</p>
              </div>

              {/* Selector de Exercícios Top */}
              {analytics.exerciseProgress && analytics.exerciseProgress.length > 0 && (
                <div className="flex items-center space-x-1 overflow-x-auto pb-1">
                  {analytics.exerciseProgress.map((ex: any) => (
                    <button
                      key={ex.exerciseId}
                      onClick={() => setSelectedExerciseId(ex.exerciseId)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition whitespace-nowrap ${
                        selectedExerciseId === ex.exerciseId
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-[#16191e] text-[#8a8f98] border border-[#ffffff08] hover:text-white'
                      }`}
                    >
                      {ex.namePt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedExercise && selectedExercise.history.length > 0 ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedExercise.history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                    <XAxis dataKey="date" stroke="#575c66" fontSize={10} tickLine={false} />
                    <YAxis stroke="#575c66" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f1115', borderColor: '#ffffff1a', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(val: any, name: any, item: any) => [
                        `${val} kg (Melhor set: ${item.payload.weight}kg × ${item.payload.reps} reps)`,
                        '1RM Estimado',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="estimated1RM"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6, fill: '#34d399' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-[#575c66]">
                Selecione um exercício com histórico de cargas para visualizar a curva de progressão 1RM.
              </div>
            )}
          </div>

          {/* ===== SEÇÃO 5: TENDÊNCIA DE CALORIAS/DURAÇÃO & RECORDES PESSOAIS ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico: Tendência de Calorias & Tempo (Garmin / Strava AreaChart) */}
            <div className="p-5 rounded-2xl bg-[#0f1115] border border-[#ffffff0e] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5 uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Gasto Calórico & Tempo por Sessão
                </h3>
                <span className="text-[10px] font-mono text-[#8a8f98]">Garmin / Strava Trend</span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.sessionTrend}>
                    <defs>
                      <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
                    <XAxis dataKey="date" stroke="#575c66" fontSize={10} tickLine={false} />
                    <YAxis stroke="#575c66" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f1115', borderColor: '#ffffff1a', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Area type="monotone" dataKey="caloriesBurned" name="Calorias (kcal)" stroke="#f97316" fillOpacity={1} fill="url(#colorCal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quadro de Recordes Pessoais (PRs - Strong PR Hall) */}
            <div className="p-5 rounded-2xl bg-[#0f1115] border border-[#ffffff0e] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#f7f8f8] flex items-center gap-1.5 uppercase tracking-wider">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Galeria de Recordes Pessoais (PRs)
                </h3>
                <span className="text-[10px] font-mono text-[#8a8f98]">Personal Bests</span>
              </div>

              {analytics.personalRecords.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-xs text-[#575c66]">
                  Complete treinos para registrar seus recordes de carga.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {analytics.personalRecords.map((pr: any, idx: number) => (
                    <div
                      key={pr.exerciseName}
                      className="p-2.5 rounded-xl bg-[#16191e] border border-[#ffffff0a] flex items-center justify-between text-xs hover:border-[#818cf850] transition"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-[11px] font-bold">
                          #{idx + 1}
                        </div>
                        <div>
                          <span className="font-semibold block text-[#f7f8f8]">{pr.exerciseName}</span>
                          <span className="text-[10px] text-[#8a8f98]">{pr.date}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-bold font-mono text-emerald-400 block">{pr.weight}kg × {pr.reps}</span>
                        <span className="text-[9px] font-mono text-[#8a8f98]">1RM: {pr.estimated1RM}kg</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
