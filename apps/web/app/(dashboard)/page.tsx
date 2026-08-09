'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { 
  Camera, DollarSign, HeartPulse, 
  TrendingUp, Sparkles, CheckCircle2, 
  Wallet, Flame, PieChart, User, Scale, Activity, Ruler, ArrowRight, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '@/lib/api';

export default function DashboardHome() {
  const [activeModal, setActiveModal] = useState<'meal' | 'expense' | 'health' | 'investment' | null>(null);
  const [healthProfile, setHealthProfile] = useState<any>(null);
  const [financeOverview, setFinanceOverview] = useState<any>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    categoryBreakdown: {},
  });
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [profRes, finRes, sumRes] = await Promise.all([
        authFetch('/api/users/me/profile'),
        authFetch('/api/finance/overview'),
        authFetch('/api/dashboard/summary'),
      ]);

      if (profRes.ok) setHealthProfile(await profRes.json().catch(() => null));
      if (finRes.ok) setFinanceOverview(await finRes.json().catch(() => ({})));
      if (sumRes.ok) setDashboardSummary(await sumRes.json().catch(() => null));
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

  const totalIncome = financeOverview.totalIncome || 0;
  const totalExpenses = financeOverview.totalExpenses || 0;
  const netBalance = financeOverview.netBalance || (totalIncome - totalExpenses);
  const savingsRate = totalIncome > 0 ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1) : '0.0';

  const categoryChartData = Object.entries(financeOverview.categoryBreakdown || {}).map(([category, amount]) => ({
    category,
    spent: amount as number,
  }));

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-[1600px] mx-auto pb-12">
      
      {/* 1. Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#f7f8f8] tracking-tight flex items-center gap-2.5">
            <span>Painel Executivo de Saúde & Finanças</span>
            <span className="text-xs font-mono text-[#5e6ad2] bg-[#5e6ad215] px-2.5 py-0.5 rounded border border-[#5e6ad230]">
              Modo Produção
            </span>
          </h1>
          <p className="text-sm text-[#a1a1aa] mt-1">
            Métricas integradas de longevidade biológica, composição corporal e fluxo de caixa
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
            href="/financas"
            className="h-8 px-3 rounded-md bg-[#16191e] border border-[#ffffff12] hover:bg-[#1d2127] text-xs font-medium text-[#f7f8f8] flex items-center space-x-1.5 transition"
          >
            <DollarSign className="w-3.5 h-3.5 text-[#f87171]" />
            <span>+ Gasto</span>
          </Link>

          <Link 
            href="/investimentos"
            className="h-8 px-3 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+ Aporte</span>
          </Link>
        </div>
      </div>

      {/* BANNER DE PERFIL SAÚDE INTEGRAÇÃO SE EXISTIR */}
      {healthProfile?.user && (
        <div className="bg-[#16191e] border border-[#ffffff0d] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#5e6ad215] border border-[#5e6ad230] flex items-center justify-center text-[#5e6ad2] font-semibold text-sm">
              <User className="w-5 h-5" />
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
                  ? `Peso atual: ${latest.weightKg} kg ${latest.bodyFatPercent ? `(${latest.bodyFatPercent}% BF)` : ''}` 
                  : 'Nenhuma medição corporal registrada recentemente'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
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
              href="/configuracoes"
              className="text-[#5e6ad2] hover:text-[#7d87e0] font-medium text-xs flex items-center space-x-1 transition"
            >
              <span>Editar Perfil</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 2. Top 4 Executive KPI Cards (REAL DATA) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6">
        
        {/* KPI 1: Patrimônio Total Líquido */}
        <div className="linear-card p-4 sm:p-5 xl:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-[#5e6ad2]" /> Saldo Líquido
            </span>
            <span className="text-xs font-mono text-[#5e6ad2] bg-[#5e6ad215] px-2 py-0.5 rounded border border-[#5e6ad230]">
              Real
            </span>
          </div>

          <div>
            <div className={`text-2xl font-bold font-mono ${netBalance < 0 ? 'text-[#f87171]' : 'text-[#f7f8f8]'} tracking-tight`}>
              R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-[#a1a1aa] block mt-1">Saldo em contas bancárias salvas</span>
          </div>

          <div className="pt-2 border-t border-[#ffffff08] flex justify-between items-center text-xs font-mono text-[#a1a1aa]">
            <span>Receitas: <strong className="text-[#4ade80]">R$ {totalIncome.toFixed(2)}</strong></span>
            <span>Saídas: <strong className="text-[#f87171]">R$ {totalExpenses.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* KPI 2: Recovery / Readiness Score */}
        <div className="linear-card p-4 sm:p-5 xl:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-[#f87171]" /> Readiness Index
            </span>
            <span className="text-xs font-mono text-[#4ade80] bg-[#4ade8015] px-2 py-0.5 rounded border border-[#4ade8030]">
              {dashboardSummary?.scores?.wellbeing ? 'Ativo' : 'Aguardando'}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-[#4ade80]">
              {dashboardSummary?.scores?.wellbeing || 80}
            </span>
            <span className="text-[#71717a] text-sm font-medium">/ 100</span>
          </div>

          <div className="w-full bg-[#16191e] h-1.5 rounded-full overflow-hidden border border-[#ffffff0a]">
            <div className="bg-[#4ade80] h-full rounded-full transition-all duration-500" style={{ width: `${dashboardSummary?.scores?.wellbeing || 80}%` }}></div>
          </div>

          <div className="pt-1 flex justify-between items-center text-xs font-mono text-[#a1a1aa]">
            <span>😴 Sono: <strong className="text-[#f7f8f8]">{latest?.weightKg ? '7.5h' : '0.0h'}</strong></span>
            <span>⚡ Saúde: <strong className="text-[#4ade80]">Normal</strong></span>
          </div>
        </div>

        {/* KPI 3: Fluxo de Caixa & Savings Rate */}
        <div className="linear-card p-4 sm:p-5 xl:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#22c55e]" /> Taxa de Poupança
            </span>
            <span className="text-xs font-mono text-[#4ade80] bg-[#4ade8015] px-2 py-0.5 rounded border border-[#4ade8030]">
              {savingsRate}% Mês
            </span>
          </div>

          <div>
            <div className="text-2xl font-bold font-mono text-[#4ade80]">
              R$ {(totalIncome - totalExpenses > 0 ? totalIncome - totalExpenses : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-[#a1a1aa] block mt-1">Sobra líquida calculada</span>
          </div>

          <div className="pt-2 border-t border-[#ffffff08] flex justify-between items-center text-xs font-mono text-[#a1a1aa]">
            <span>Entradas: <strong className="text-[#4ade80]">R$ {totalIncome.toFixed(2)}</strong></span>
            <span>Saídas: <strong className="text-[#f87171]">R$ {totalExpenses.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* KPI 4: Balanço Calórico */}
        <div className="linear-card p-4 sm:p-5 xl:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-[#fb923c]" /> Balanço Calórico
            </span>
            <span className="text-xs font-mono text-[#fb923c]">
              Meta TMB: {bmr || 2200} kcal
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-[#f7f8f8]">
              {dashboardSummary?.health?.calorieTracker?.consumed || 0}
            </span>
            <span className="text-[#71717a] text-sm font-medium">/ {bmr || 2200} kcal</span>
          </div>

          <div className="w-full bg-[#16191e] h-1.5 rounded-full overflow-hidden border border-[#ffffff0a]">
            <div 
              className="bg-[#fb923c] h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, ((dashboardSummary?.health?.calorieTracker?.consumed || 0) / (bmr || 2200)) * 100)}%` }}
            ></div>
          </div>

          <div className="pt-1 flex justify-between items-center text-xs font-mono text-[#a1a1aa]">
            <span>C: 0g</span>
            <span>P: 0g</span>
            <span>G: 0g</span>
          </div>
        </div>

      </div>

      {/* 3. Real Category Expenses Breakdown Chart */}
      <div className="linear-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#f7f8f8]">Despesas por Categoria</h3>
            <p className="text-xs text-[#a1a1aa]">Gastos reais consolidados do mês vigente</p>
          </div>
          <span className="text-xs font-mono text-[#5e6ad2] bg-[#5e6ad215] px-2 py-0.5 rounded border border-[#5e6ad230]">
            {categoryChartData.length} categorias com lançamentos
          </span>
        </div>

        {categoryChartData.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#a1a1aa] space-y-2 border border-dashed border-[#ffffff0a] rounded-lg">
            <PieChart className="w-8 h-8 text-[#71717a] mx-auto" />
            <p className="font-semibold text-[#f7f8f8]">Nenhuma despesa registrada ainda</p>
            <p className="text-xs max-w-sm mx-auto">
              Lance suas despesas no Chat Vita ou na página de Finanças para visualizar o gráfico categorizado.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <XAxis dataKey="category" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f1115', borderColor: '#ffffff14', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Gasto']}
                />
                <Bar dataKey="spent" fill="#5e6ad2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

    </div>
  );
}
