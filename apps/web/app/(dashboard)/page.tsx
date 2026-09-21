'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Camera, HeartPulse, Flame, Scale, Activity, Ruler, 
  ArrowRight, Loader2, Dumbbell, Pill, Sparkles, Shield, 
  Moon, Droplets, Smile, CheckCircle2, Clock
} from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '@/lib/api';

export default function DashboardHome() {
  const [healthProfile, setHealthProfile] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [profRes, sumRes] = await Promise.all([
        authFetch('/api/users/me/profile'),
        authFetch('/api/dashboard/summary'),
      ]);

      if (profRes.ok) setHealthProfile(await profRes.json().catch(() => null));
      if (sumRes.ok) setSummary(await sumRes.json().catch(() => null));
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const latest = healthProfile?.latestMeasurement;
  const bmi = healthProfile?.bmi;
  const bmr = healthProfile?.bmr;
  const age = healthProfile?.age;

  const vitality = summary?.vitalityScore ?? 80;
  const streak = summary?.streak || { currentStreak: 0, longestStreak: 0, shieldsRemaining: 1 };
  const nutrition = summary?.nutrition || {
    consumedCalories: 0,
    targetCalories: 2200,
    consumedProtein: 0,
    targetProtein: 140,
    consumedCarbs: 0,
    targetCarbs: 250,
    consumedFat: 0,
    targetFat: 65,
    mealsCount: 0,
  };
  const workout = summary?.workouts?.recentWorkout;
  const habits = summary?.habits;
  const medications = summary?.medications || [];
  const bodyComp = summary?.bodyComposition;

  const calPercent = Math.min(100, Math.round((nutrition.consumedCalories / (nutrition.targetCalories || 2200)) * 100));

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-[1600px] mx-auto pb-12">
      
      {/* 1. Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#f7f8f8] tracking-tight flex items-center gap-2.5">
            <span>Painel Executivo de Saúde & Longevidade</span>
            <span className="text-xs font-mono text-[#5e6ad2] bg-[#5e6ad215] px-2.5 py-0.5 rounded border border-[#5e6ad230]">
              Vita Longevity
            </span>
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Métricas integradas de biomarcadores, treinos de musculação, nutrição e hábitos diários
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <Link 
            href="/saude/nutricao"
            className="h-8 px-3 rounded-md bg-[#16191e] border border-[#ffffff12] hover:bg-[#1d2127] text-xs font-medium text-[#f7f8f8] flex items-center space-x-1.5 transition"
          >
            <Camera className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>+ Refeição</span>
          </Link>

          <Link 
            href="/saude/treinos"
            className="h-8 px-3 rounded-md bg-[#16191e] border border-[#ffffff12] hover:bg-[#1d2127] text-xs font-medium text-[#f7f8f8] flex items-center space-x-1.5 transition"
          >
            <Dumbbell className="w-3.5 h-3.5 text-[#6366f1]" />
            <span>+ Treino</span>
          </Link>

          <Link 
            href="/saude"
            className="h-8 px-3 rounded-md bg-[#16191e] border border-[#ffffff12] hover:bg-[#1d2127] text-xs font-medium text-[#f7f8f8] flex items-center space-x-1.5 transition"
          >
            <HeartPulse className="w-3.5 h-3.5 text-[#f87171]" />
            <span>+ Hábitos</span>
          </Link>

          <Link 
            href="/medicamentos"
            className="h-8 px-3 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Medicamentos</span>
          </Link>
        </div>
      </div>

      {/* 2. Banner de Perfil & Biometria */}
      {healthProfile?.user && (
        <div className="bg-[#16191e] border border-[#ffffff0d] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#5e6ad215] border border-[#5e6ad230] flex items-center justify-center text-[#5e6ad2] font-semibold text-sm">
              <HeartPulse className="w-5 h-5 text-[#5e6ad2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-[#f7f8f8]">{healthProfile.user.name || 'Usuário'}</h3>
                {age !== null && age !== undefined && (
                  <span className="text-xs font-mono text-[#5e6ad2] bg-[#5e6ad215] px-2 py-0.5 rounded border border-[#5e6ad230]">
                    {age} anos
                  </span>
                )}
                {healthProfile.user.heightCm && (
                  <span className="text-xs font-mono text-[#a1a1aa]">
                    • {healthProfile.user.heightCm} cm
                  </span>
                )}
              </div>
              <p className="text-xs text-[#a1a1aa]">
                {latest?.weightKg 
                  ? `Peso atual: ${latest.weightKg} kg ${latest.bodyFatPercent ? `(${latest.bodyFatPercent}% Gordura Corporal)` : ''}` 
                  : 'Nenhuma medição corporal registrada recentemente'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs flex-wrap gap-y-2">
            {bmi && (
              <div className="bg-[#080a0c] px-3 py-1.5 rounded-lg border border-[#ffffff08] flex items-center space-x-2">
                <Scale className="w-3.5 h-3.5 text-[#5e6ad2]" />
                <span>IMC: <strong className="font-mono text-[#f7f8f8]">{bmi.bmi}</strong></span>
                <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ color: bmi.statusColor, backgroundColor: `${bmi.statusColor}15` }}>
                  {bmi.classification}
                </span>
              </div>
            )}

            {bmr && (
              <div className="bg-[#080a0c] px-3 py-1.5 rounded-lg border border-[#ffffff08] flex items-center space-x-2">
                <Flame className="w-3.5 h-3.5 text-[#fb923c]" />
                <span>TMB: <strong className="font-mono text-[#f7f8f8]">{bmr} kcal</strong></span>
              </div>
            )}

            <Link 
              href="/avaliacao-corporal"
              className="text-[#5e6ad2] hover:text-[#7d87e0] font-medium text-xs flex items-center space-x-1 transition"
            >
              <span>Avaliação Completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 3. Top 4 Executive KPI Cards (Health & Longevity) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        
        {/* KPI 1: Score Geral de Vitalidade */}
        <div className="linear-card p-4 sm:p-5 xl:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#5e6ad2]" /> Vitalidade & Longevidade
            </span>
            <span className="text-xs font-mono text-[#4ade80] bg-[#4ade8015] px-2 py-0.5 rounded border border-[#4ade8030]">
              {vitality >= 80 ? 'Excelente' : vitality >= 65 ? 'Bom' : 'Atenção'}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-[#f7f8f8]">
              {vitality}
            </span>
            <span className="text-[#71717a] text-sm font-medium">/ 100</span>
          </div>

          <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden border border-[#ffffff0a]">
            <div 
              className="bg-gradient-to-r from-[#5e6ad2] to-[#4ade80] h-full rounded-full transition-all duration-500" 
              style={{ width: `${vitality}%` }}
            ></div>
          </div>

          <div className="pt-1 flex justify-between items-center text-xs font-mono text-[#a1a1aa]">
            <span>😴 Sono: <strong className="text-[#f7f8f8]">{habits?.sleepHours ? `${habits.sleepHours}h` : 'Registrar'}</strong></span>
            <span>💧 Água: <strong className="text-[#38bdf8]">{habits?.waterIntakeMl || 0}ml</strong></span>
          </div>
        </div>

        {/* KPI 2: Ofensiva de Hábitos (Streak) */}
        <div className="linear-card p-4 sm:p-5 xl:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#fb923c]" /> Ofensiva de Hábitos
            </span>
            <span className="text-xs font-mono text-[#fb923c] bg-[#fb923c15] px-2 py-0.5 rounded border border-[#fb923c30]">
              {streak.currentStreak} {streak.currentStreak === 1 ? 'dia' : 'dias'}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-[#fb923c]">
              {streak.currentStreak}
            </span>
            <span className="text-[#71717a] text-sm font-medium">dias seguidos</span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#a1a1aa]">
            <Shield className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Escudos de proteção ativos: <strong className="text-[#38bdf8] font-mono">{streak.shieldsRemaining}</strong></span>
          </div>

          <div className="pt-2 border-t border-[#ffffff08] flex justify-between items-center text-xs text-[#a1a1aa]">
            <span>Recorde histórico: <strong className="text-[#f7f8f8] font-mono">{streak.longestStreak} dias</strong></span>
            <Link href="/saude" className="text-[#5e6ad2] hover:underline text-xs">Ver diário</Link>
          </div>
        </div>

        {/* KPI 3: Balanço Nutricional & Calorias */}
        <div className="linear-card p-4 sm:p-5 xl:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#4ade80]" /> Nutrição Diária
            </span>
            <span className="text-xs font-mono text-[#4ade80] bg-[#4ade8015] px-2 py-0.5 rounded border border-[#4ade8030]">
              {calPercent}% da meta
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-[#f7f8f8]">
              {nutrition.consumedCalories}
            </span>
            <span className="text-[#71717a] text-sm font-medium">/ {nutrition.targetCalories} kcal</span>
          </div>

          <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden border border-[#ffffff0a]">
            <div 
              className="bg-[#4ade80] h-full rounded-full transition-all duration-500" 
              style={{ width: `${calPercent}%` }}
            ></div>
          </div>

          <div className="pt-1 flex justify-between items-center text-xs font-mono text-[#a1a1aa]">
            <span>P: <strong className="text-[#4ade80]">{nutrition.consumedProtein}g</strong></span>
            <span>C: <strong className="text-[#facc15]">{nutrition.consumedCarbs}g</strong></span>
            <span>G: <strong className="text-[#fb923c]">{nutrition.consumedFat}g</strong></span>
          </div>
        </div>

        {/* KPI 4: Treino & Performance Física */}
        <div className="linear-card p-4 sm:p-5 xl:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-[#6366f1]" /> Treino & Volume
            </span>
            <span className="text-xs font-mono text-[#6366f1] bg-[#6366f115] px-2 py-0.5 rounded border border-[#6366f130]">
              Coach Iron
            </span>
          </div>

          {workout ? (
            <div>
              <h4 className="text-sm font-semibold text-[#f7f8f8] truncate">{workout.title}</h4>
              <div className="flex items-center gap-3 text-xs font-mono text-[#a1a1aa] mt-1">
                <span>⏱️ {workout.durationMinutes || 45} min</span>
                <span>🔥 {Math.round(workout.caloriesBurned || 300)} kcal</span>
              </div>
              <div className="pt-2 border-t border-[#ffffff08] mt-2 flex justify-between items-center text-xs text-[#a1a1aa]">
                <span>Volume: <strong className="text-[#f7f8f8] font-mono">{Math.round(workout.totalVolume || 0).toLocaleString('pt-BR')} kg</strong></span>
                <Link href="/saude/treinos/historico" className="text-[#6366f1] hover:underline">Histórico</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[#a1a1aa]">Nenhum treino concluído hoje.</p>
              <Link 
                href="/saude/treinos"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#6366f1] hover:underline"
              >
                <span>Acessar fichas de treino →</span>
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* 4. Grid Secundário: Medicamentos & Avaliação Corporal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card: Medicamentos & Suplementos do Dia */}
        <div className="linear-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
            <div className="flex items-center space-x-2">
              <Pill className="w-4 h-4 text-[#f472b6]" />
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Medicamentos & Suplementação</h3>
            </div>
            <Link href="/medicamentos" className="text-xs text-[#5e6ad2] hover:underline">
              Gerenciar todos →
            </Link>
          </div>

          {medications.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#a1a1aa] space-y-1">
              <Pill className="w-6 h-6 text-[#71717a] mx-auto opacity-50" />
              <p>Nenhum medicamento ativo cadastrado.</p>
              <Link href="/medicamentos" className="text-[#5e6ad2] hover:underline inline-block mt-1">
                + Cadastrar medicação ou vitamina
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {medications.slice(0, 4).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#080a0c] border border-[#ffffff0a]">
                  <div className="flex items-center space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color || '#5e6ad2' }} />
                    <div>
                      <h4 className="text-xs font-semibold text-[#f7f8f8]">{m.name}</h4>
                      <p className="text-[11px] text-[#a1a1aa] font-mono">{m.dosage}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-[#a1a1aa] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#71717a]" /> {m.time}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      m.status === 'TOMADO' 
                        ? 'bg-[#4ade8015] text-[#4ade80] border border-[#4ade8030]' 
                        : 'bg-[#facc1515] text-[#facc15] border border-[#facc1530]'
                    }`}>
                      {m.status === 'TOMADO' ? 'Tomado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card: Composição Corporal & Bioimpedância */}
        <div className="linear-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
            <div className="flex items-center space-x-2">
              <Ruler className="w-4 h-4 text-[#3b82f6]" />
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Composição Corporal & Bioimpedância</h3>
            </div>
            <Link href="/avaliacao-corporal" className="text-xs text-[#3b82f6] hover:underline">
              Evolução completa →
            </Link>
          </div>

          {bodyComp ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#080a0c] p-3 rounded-lg border border-[#ffffff0a] text-center">
                  <span className="text-[11px] text-[#a1a1aa] uppercase font-semibold">Peso</span>
                  <div className="text-base font-bold font-mono text-[#f7f8f8] mt-1">{bodyComp.weightKg} kg</div>
                </div>

                <div className="bg-[#080a0c] p-3 rounded-lg border border-[#ffffff0a] text-center">
                  <span className="text-[11px] text-[#a1a1aa] uppercase font-semibold">% Gordura</span>
                  <div className="text-base font-bold font-mono text-[#38bdf8] mt-1">
                    {bodyComp.bodyFatPercent ? `${bodyComp.bodyFatPercent}%` : '--'}
                  </div>
                </div>

                <div className="bg-[#080a0c] p-3 rounded-lg border border-[#ffffff0a] text-center">
                  <span className="text-[11px] text-[#a1a1aa] uppercase font-semibold">Massa Muscular</span>
                  <div className="text-base font-bold font-mono text-[#4ade80] mt-1">
                    {bodyComp.skeletalMuscleMassKg ? `${bodyComp.skeletalMuscleMassKg} kg` : '--'}
                  </div>
                </div>

                <div className="bg-[#080a0c] p-3 rounded-lg border border-[#ffffff0a] text-center">
                  <span className="text-[11px] text-[#a1a1aa] uppercase font-semibold">IMC</span>
                  <div className="text-base font-bold font-mono text-[#fb923c] mt-1">
                    {bodyComp.bmi ? bodyComp.bmi.toFixed(1) : '--'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-[#080a0c] rounded-lg border border-[#ffffff08] flex items-center justify-between text-xs text-[#a1a1aa]">
                <span>Última avaliação registrada:</span>
                <span className="font-mono text-[#f7f8f8]">
                  {bodyComp.assessmentDate ? new Date(bodyComp.assessmentDate).toLocaleDateString('pt-BR') : 'Recente'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[#a1a1aa] space-y-1">
              <Scale className="w-6 h-6 text-[#71717a] mx-auto opacity-50" />
              <p>Nenhuma avaliação de bioimpedância cadastrada.</p>
              <Link href="/avaliacao-corporal" className="text-[#3b82f6] hover:underline inline-block mt-1">
                + Realizar nova avaliação física
              </Link>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
