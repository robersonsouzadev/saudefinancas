'use client';

import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Plus, Camera, DollarSign, Activity, HeartPulse, 
  TrendingUp, Sparkles, AlertCircle, CheckCircle2, ArrowUpRight,
  Wallet, Moon, Droplets, Dumbbell, ShieldCheck, Flame, PieChart, Layers
} from 'lucide-react';

// Monthly Financial Stream (6 months history)
const monthlyCashflowData = [
  { month: 'Mar', receitas: 5200, gastos: 3100, aportes: 1200 },
  { month: 'Abr', receitas: 5400, gastos: 3250, aportes: 1400 },
  { month: 'Mai', receitas: 5300, gastos: 2900, aportes: 1500 },
  { month: 'Jun', receitas: 5800, gastos: 3400, aportes: 1600 },
  { month: 'Jul', receitas: 5600, gastos: 3050, aportes: 1800 },
  { month: 'Ago', receitas: 6000, gastos: 3100, aportes: 2000 },
];

// Biological Weekly Trend Data (7 days)
const weeklyBioData = [
  { day: 'Seg', sono: 7.2, energia: 8, estresse: 3 },
  { day: 'Ter', sono: 6.8, energia: 7, estresse: 5 },
  { day: 'Qua', sono: 8.0, energia: 9, estresse: 2 },
  { day: 'Qui', sono: 7.5, energia: 8, estresse: 3 },
  { day: 'Sex', sono: 6.5, energia: 6, estresse: 6 },
  { day: 'Sáb', sono: 8.5, energia: 9, estresse: 2 },
  { day: 'Dom', sono: 8.2, energia: 9, estresse: 1 },
];

// Category Budget Allocations
const categoryBudgets = [
  { category: 'Alimentação', spent: 850, budget: 1500, percent: 56 },
  { category: 'Moradia', spent: 1200, budget: 1200, percent: 100 },
  { category: 'Transporte', spent: 320, budget: 750, percent: 42 },
  { category: 'Saúde', spent: 280, budget: 500, percent: 56 },
  { category: 'Lazer', spent: 450, budget: 600, percent: 75 },
];

export default function DashboardHome() {
  const [activeModal, setActiveModal] = useState<'meal' | 'expense' | 'health' | 'investment' | null>(null);

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-12">
      
      {/* 1. Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div>
          <h1 className="text-xl font-semibold text-[#f7f8f8] tracking-tight flex items-center gap-2">
            <span>Painel Executivo de Saúde & Finanças</span>
            <span className="text-[10px] font-mono text-[#5e6ad2] bg-[#5e6ad215] px-2 py-0.5 rounded border border-[#5e6ad230]">
              v2.0 Pro
            </span>
          </h1>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Métricas integradas de longevidade biológica, fluxo de caixa e patrimônio investido
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button 
            onClick={() => setActiveModal('meal')}
            className="h-8 px-3 rounded-md bg-[#16191e] border border-[#ffffff12] hover:bg-[#1d2127] text-xs font-medium text-[#f7f8f8] flex items-center space-x-1.5 transition"
          >
            <Camera className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>+ Refeição</span>
          </button>

          <button 
            onClick={() => setActiveModal('expense')}
            className="h-8 px-3 rounded-md bg-[#16191e] border border-[#ffffff12] hover:bg-[#1d2127] text-xs font-medium text-[#f7f8f8] flex items-center space-x-1.5 transition"
          >
            <DollarSign className="w-3.5 h-3.5 text-[#f87171]" />
            <span>+ Gasto</span>
          </button>

          <button 
            onClick={() => setActiveModal('investment')}
            className="h-8 px-3 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+ Aporte</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Patrimônio Total Líquido */}
        <div className="linear-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-[#5e6ad2]" /> Patrimônio Líquido
            </span>
            <span className="text-[10px] font-mono text-[#4ade80] bg-[#4ade8015] px-2 py-0.5 rounded border border-[#4ade8030]">
              +14.8% ano
            </span>
          </div>

          <div>
            <div className="text-3xl font-bold font-mono text-[#f7f8f8] tracking-tight">
              R$ 84.650,00
            </div>
            <span className="text-[11px] text-[#8a8f98] block mt-0.5">Contas Bancárias + Carteira XP</span>
          </div>

          <div className="pt-2 border-t border-[#ffffff08] flex justify-between items-center text-[11px] font-mono text-[#8a8f98]">
            <span>Investido: <strong className="text-[#f7f8f8]">R$ 68.200</strong></span>
            <span>Caixa: <strong className="text-[#4ade80]">R$ 16.450</strong></span>
          </div>
        </div>

        {/* KPI 2: Recovery / Readiness Score (Oura/Whoop Style) */}
        <div className="linear-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-[#f87171]" /> Readiness Index
            </span>
            <span className="text-[10px] font-mono text-[#4ade80] bg-[#4ade8015] px-2 py-0.5 rounded border border-[#4ade8030]">
              Excelente
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-[#4ade80]">92</span>
            <span className="text-[#575c66] text-xs font-medium">/ 100</span>
          </div>

          <div className="w-full bg-[#16191e] h-1.5 rounded-full overflow-hidden border border-[#ffffff0a]">
            <div className="bg-[#4ade80] h-full rounded-full w-[92%] transition-all duration-500"></div>
          </div>

          <div className="pt-1 flex justify-between items-center text-[11px] font-mono text-[#8a8f98]">
            <span>😴 Sono: <strong className="text-[#f7f8f8]">7.8h</strong></span>
            <span>⚡ HRV: <strong className="text-[#4ade80]">68 ms</strong></span>
          </div>
        </div>

        {/* KPI 3: Fluxo de Caixa & Savings Rate */}
        <div className="linear-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#22c55e]" /> Taxa de Poupança
            </span>
            <span className="text-[10px] font-mono text-[#4ade80] bg-[#4ade8015] px-2 py-0.5 rounded border border-[#4ade8030]">
              33.3% Mês
            </span>
          </div>

          <div>
            <div className="text-3xl font-bold font-mono text-[#4ade80]">
              R$ 2.900,00
            </div>
            <span className="text-[11px] text-[#8a8f98] block mt-0.5">Sobra líquida para investimento</span>
          </div>

          <div className="pt-2 border-t border-[#ffffff08] flex justify-between items-center text-[11px] font-mono text-[#8a8f98]">
            <span>Receitas: <strong className="text-[#4ade80]">R$ 6.000</strong></span>
            <span>Gastos: <strong className="text-[#f87171]">R$ 3.100</strong></span>
          </div>
        </div>

        {/* KPI 4: Balanço Calórico & Nutricional */}
        <div className="linear-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#facc15]" /> Balanço Calórico
            </span>
            <span className="text-[10px] font-mono text-[#facc15] bg-[#facc1515] px-2 py-0.5 rounded border border-[#facc1530]">
              360 kcal resta
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-[#f7f8f8]">1.840</span>
            <span className="text-[#575c66] text-xs font-medium">/ 2.200 kcal</span>
          </div>

          <div className="w-full bg-[#16191e] h-1.5 rounded-full overflow-hidden border border-[#ffffff0a]">
            <div className="bg-[#facc15] h-full rounded-full w-[84%] transition-all duration-500"></div>
          </div>

          <div className="pt-1 flex justify-between items-center text-[10px] font-mono text-[#8a8f98]">
            <span>C: <strong className="text-[#f7f8f8]">180g</strong></span>
            <span>P: <strong className="text-[#4ade80]">120g</strong></span>
            <span>G: <strong className="text-[#facc15]">55g</strong></span>
          </div>
        </div>

      </div>

      {/* 3. Double Chart Row (Financial Stream & Biological Trend) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Financial Cashflow & Investment Stream Chart (2 Cols) */}
        <div className="lg:col-span-2 linear-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#ffffff0e] pb-3 gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Fluxo Financeiro & Aportes Acumulados</h3>
              <p className="text-[11px] text-[#8a8f98]">Evolução de Receitas, Despesas e Investimentos nos últimos 6 meses</p>
            </div>

            <div className="flex items-center space-x-3 text-[11px] font-mono text-[#8a8f98]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#5e6ad2]"></span> Receitas</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#272a30]"></span> Gastos</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#4ade80]"></span> Aportes</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCashflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#575c66" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#575c66" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#16191e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '12px' }} 
                  itemStyle={{ color: '#f7f8f8' }}
                />
                <Bar dataKey="receitas" fill="#5e6ad2" radius={[3, 3, 0, 0]} />
                <Bar dataKey="gastos" fill="#272a30" radius={[3, 3, 0, 0]} />
                <Bar dataKey="aportes" fill="#4ade80" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biological Sleep & Recovery Line Trend Chart (1 Col) */}
        <div className="linear-card p-5 space-y-4">
          <div className="border-b border-[#ffffff0e] pb-3">
            <h3 className="text-sm font-semibold text-[#f7f8f8]">Tendência de Sono & Recuperação</h3>
            <p className="text-[11px] text-[#8a8f98]">Histórico biológico dos últimos 7 dias</p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyBioData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#575c66" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#575c66" fontSize={11} tickLine={false} axisLine={false} domain={[4, 10]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#16191e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '12px' }} 
                  itemStyle={{ color: '#f7f8f8' }}
                />
                <Line type="monotone" dataKey="sono" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa' }} />
                <Line type="monotone" dataKey="energia" stroke="#4ade80" strokeWidth={2} dot={{ r: 3, fill: '#4ade80' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md text-[11px] text-[#8a8f98] flex items-center justify-between">
            <span>Média de Sono: <strong className="text-[#f7f8f8] font-mono">7.5h/noite</strong></span>
            <span className="text-[#4ade80] font-mono">✓ Estável</span>
          </div>
        </div>

      </div>

      {/* 4. Bottom Row: Category Budgets & Vita AI Bio-Financial Correlation Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Category Budget Allocation Widget */}
        <div className="linear-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
            <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#5e6ad2]" />
              <span>Orçamento Familiar por Categoria (%)</span>
            </h3>
            <span className="text-[11px] font-mono text-[#8a8f98]">Mês Vigente</span>
          </div>

          <div className="space-y-3.5 text-xs font-mono">
            {categoryBudgets.map((c) => (
              <div key={c.category} className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[#8a8f98] font-sans font-medium">{c.category}</span>
                  <span className="text-[#f7f8f8]">
                    R$ {c.spent} / R$ {c.budget} <strong className="text-[#5e6ad2]">({c.percent}%)</strong>
                  </span>
                </div>
                <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden border border-[#ffffff0a]">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      c.percent >= 100 ? 'bg-[#f87171]' : c.percent > 70 ? 'bg-[#facc15]' : 'bg-[#5e6ad2]'
                    }`}
                    style={{ width: `${Math.min(100, c.percent)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vita AI Bio-Financial Correlation Radar */}
        <div className="linear-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
            <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5e6ad2]" />
              <span>Radar de Correlação Bio-Financeira Vita AI</span>
            </h3>
            <span className="text-[10px] font-mono text-[#4ade80] bg-[#4ade8015] px-2 py-0.5 rounded border border-[#4ade8030]">
              Motor Ativo
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" /> Sono x Controle de Impulsos
                </span>
                <span className="text-[10px] font-mono text-[#4ade80]">+32% Eficiência</span>
              </div>
              <p className="text-[#8a8f98] text-[11px]">
                Sua média de 7.8h de sono esta semana manteve os gastos desnecessários com restaurantes e delivery 32% abaixo da média dos meses anteriores.
              </p>
            </div>

            <div className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#5e6ad2]" /> Oportunidade de Rebalanceamento
                </span>
                <span className="text-[10px] font-mono text-[#5e6ad2]">Recomendação</span>
              </div>
              <p className="text-[#8a8f98] text-[11px]">
                Você tem uma sobra líquida de R$ 2.900,00 prevista este mês. O Agente Otávio recomenda alocar R$ 1.500 em FIIs e R$ 1.400 em Renda Fixa.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
