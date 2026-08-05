'use client';

import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  Plus, Camera, DollarSign, Activity, HeartPulse, 
  TrendingUp, Sparkles, AlertCircle, CheckCircle2, ArrowUpRight
} from 'lucide-react';

const expenseData = [
  { category: 'Alimentação', amount: 850 },
  { category: 'Moradia', amount: 1200 },
  { category: 'Transporte', amount: 320 },
  { category: 'Saúde', amount: 280 },
  { category: 'Lazer', amount: 450 },
];

const macroData = [
  { name: 'Carbos', value: 180, goal: 250, percent: 72 },
  { name: 'Proteínas', value: 120, goal: 140, percent: 85 },
  { name: 'Gorduras', value: 55, goal: 65, percent: 84 },
];

export default function DashboardHome() {
  const [activeModal, setActiveModal] = useState<'meal' | 'expense' | null>(null);

  return (
    <div className="space-y-6 text-[#f7f8f8] pb-12 max-w-7xl mx-auto">
      
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div>
          <h1 className="text-xl font-semibold text-[#f7f8f8] tracking-tight">
            Painel Geral de Controle
          </h1>
          <p className="text-xs text-[#8a8f98] mt-0.5">
            Métricas unificadas de saúde biológica e finanças pessoais
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setActiveModal('meal')}
            className="h-8 px-3 rounded-md bg-[#16191e] border border-[#ffffff12] hover:bg-[#1d2127] text-xs font-medium text-[#f7f8f8] flex items-center space-x-1.5 transition"
          >
            <Camera className="w-3.5 h-3.5 text-[#5e6ad2]" />
            <span>+ Refeição</span>
          </button>
          <button 
            onClick={() => setActiveModal('expense')}
            className="h-8 px-3 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-xs font-medium text-white flex items-center space-x-1.5 transition shadow-sm"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>+ Lançar Gasto</span>
          </button>
        </div>
      </div>

      {/* Top 3 Linear Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Wellbeing Score */}
        <div className="linear-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Wellbeing Score</span>
            <span className="text-[11px] font-mono text-[#4ade80] bg-[#4ade8015] px-2 py-0.5 rounded border border-[#4ade8030]">
              +4 pts
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-bold font-mono text-[#f7f8f8] tracking-tight">85</span>
            <span className="text-[#575c66] text-xs font-medium">/ 100</span>
          </div>

          <div className="w-full bg-[#16191e] h-1.5 rounded-full overflow-hidden border border-[#ffffff0a]">
            <div className="bg-[#5e6ad2] h-full rounded-full w-[85%] transition-all duration-500"></div>
          </div>
        </div>

        {/* Saúde Física */}
        <div className="linear-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Saúde & Recuperação</span>
            <span className="text-[11px] font-mono text-[#60a5fa] bg-[#60a5fa15] px-2 py-0.5 rounded border border-[#60a5fa30]">
              7.8h Sono
            </span>
          </div>

          <div className="flex items-baseline space-x-3">
            <span className="text-4xl font-bold font-mono text-[#4ade80]">A</span>
            <span className="text-xs text-[#8a8f98]">Ótimo descanso regenerativo</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-[#8a8f98]">
            <div>💧 Água: <span className="text-[#f7f8f8] font-bold">2.4L</span></div>
            <div>🔥 Meta: <span className="text-[#f7f8f8] font-bold">1,840 kcal</span></div>
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className="linear-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Balanço Financeiro</span>
            <span className="text-[11px] font-mono text-[#4ade80] bg-[#4ade8015] px-2 py-0.5 rounded border border-[#4ade8030]">
              +12% Líquido
            </span>
          </div>

          <div>
            <div className="text-3xl font-bold font-mono text-[#f7f8f8]">
              R$ 2.450,00
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono pt-1 border-t border-[#ffffff08] text-[#8a8f98]">
            <span>Receitas: <strong className="text-[#4ade80]">R$ 5.500</strong></span>
            <span>Gastos: <strong className="text-[#f87171]">R$ 3.050</strong></span>
          </div>
        </div>

      </div>

      {/* Main Charts & Indicators Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Expenses Bar Chart */}
        <div className="lg:col-span-2 linear-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Gastos por Categoria (Mês Vigente)</h3>
              <p className="text-[11px] text-[#8a8f98]">Distribuição orçamentária por setor financeiro</p>
            </div>
            <span className="text-[11px] font-mono text-[#8a8f98]">Total: R$ 3.100,00</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="category" stroke="#575c66" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#575c66" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#16191e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '12px' }} 
                  itemStyle={{ color: '#f7f8f8' }}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 1 ? '#5e6ad2' : '#272a30'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nutritional Macros Breakdown */}
        <div className="linear-card p-5 space-y-4">
          <div className="border-b border-[#ffffff0e] pb-3">
            <h3 className="text-sm font-semibold text-[#f7f8f8]">Macros Nutricionais</h3>
            <p className="text-[11px] text-[#8a8f98]">Consumo diário calibrado por gramas</p>
          </div>

          <div className="space-y-4">
            {macroData.map((m) => (
              <div key={m.name} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-[#8a8f98]">{m.name}</span>
                  <span className="text-[#f7f8f8] font-bold">{m.value}g / {m.goal}g ({m.percent}%)</span>
                </div>
                <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden border border-[#ffffff0a]">
                  <div 
                    className="bg-[#5e6ad2] h-full rounded-full transition-all duration-500" 
                    style={{ width: `${m.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md text-[11px] text-[#8a8f98] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#5e6ad2] flex-shrink-0" />
            <span>Faltam <strong>360 kcal</strong> para fechar a meta de hoje.</span>
          </div>
        </div>

      </div>

      {/* Proactive Insights Section */}
      <div className="linear-card p-5 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-[#f7f8f8]">
          <Sparkles className="w-4 h-4 text-[#5e6ad2]" />
          <span>Insights Proativos do Agente Vita</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 text-[#facc15] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#f7f8f8] block">Correlação de Sono & Gastos Delivery</span>
              <p className="text-[#8a8f98] text-[11px] mt-0.5">
                Nos dias em que você dorme menos de 6.5h, seus gastos com iFood aumentam em média 38%.
              </p>
            </div>
          </div>

          <div className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md flex items-start space-x-3">
            <CheckCircle2 className="w-4 h-4 text-[#4ade80] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#f7f8f8] block">Consistência Orçamentária</span>
              <p className="text-[#8a8f98] text-[11px] mt-0.5">
                O orçamento familiar da categoria Alimentação está 21% abaixo do teto previsto.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
