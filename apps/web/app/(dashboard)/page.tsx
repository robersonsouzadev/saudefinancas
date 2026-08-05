'use client';

import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
  PieChart, Pie
} from 'recharts';

const expenseData = [
  { category: 'Alimentação', amount: 850, color: '#0EA5E9' },
  { category: 'Moradia', amount: 1200, color: '#10B981' },
  { category: 'Transporte', amount: 320, color: '#F59E0B' },
  { category: 'Saúde', amount: 280, color: '#EC4899' },
  { category: 'Lazer', amount: 450, color: '#8B5CF6' },
];

const macroData = [
  { name: 'Carbos', value: 180, goal: 250, color: '#0EA5E9' },
  { name: 'Proteínas', value: 120, goal: 140, color: '#10B981' },
  { name: 'Gorduras', value: 55, goal: 65, color: '#F59E0B' },
];

export default function DashboardHome() {
  const [activeModal, setActiveModal] = useState<'meal' | 'expense' | 'health' | null>(null);

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-500/10 via-emerald-500/10 to-transparent p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">
            Olá! Seu equilíbrio hoje está excelente.
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Seu marcador biocombustível indica boa recuperação física e orçamento sob controle.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setActiveModal('meal')}
            className="px-4 py-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 font-medium text-xs transition"
          >
            📸 + Foto de Prato
          </button>
          <button 
            onClick={() => setActiveModal('expense')}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-medium text-xs transition"
          >
            💰 + Lançar Gasto
          </button>
        </div>
      </div>

      {/* Top 3 Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wellbeing Score */}
        <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl group hover:border-sky-500/50 transition duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Wellbeing Score</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">+4 pts esta semana</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-5xl font-extrabold bg-gradient-to-r from-sky-400 to-emerald-400 bg-clip-text text-transparent">85</span>
            <span className="text-slate-500 text-base font-medium">/ 100</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full w-[85%] transition-all duration-1000"></div>
          </div>
        </div>

        {/* Saúde Score */}
        <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl group hover:border-emerald-500/50 transition duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saúde Física & Sono</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">7.8h de sono</span>
          </div>
          <div className="flex items-baseline space-x-3">
            <span className="text-5xl font-extrabold text-emerald-400">A</span>
            <span className="text-slate-400 text-sm font-medium">Excelente recuperação</span>
          </div>
          <div className="mt-4 flex items-center space-x-4 text-xs text-slate-400">
            <div>💧 Água: <span className="text-white font-semibold">2.4L</span></div>
            <div>🔥 Calorias: <span className="text-white font-semibold">1.840 kcal</span></div>
          </div>
        </div>

        {/* Finanças Score */}
        <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl group hover:border-violet-500/50 transition duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition"></div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Líquido Mensal</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30">68% economizado</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold text-white">R$ 2.450</span>
            <span className="text-emerald-400 text-xs font-semibold">▲ +12%</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Receitas: <strong className="text-emerald-400">R$ 5.500</strong></span>
            <span>Gastos: <strong className="text-rose-400">R$ 3.050</strong></span>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Chart */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Gastos por Categoria</h3>
              <p className="text-xs text-slate-400">Distribuição financeira deste mês</p>
            </div>
            <span className="text-xs text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">Total: R$ 3.100</span>
          </div>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="category" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#FFF' }} 
                  formatter={(value: any) => [`R$ ${value}`, 'Valor']}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Calorie & Macro Tracker Gauge */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Balanço Nutricional Diário</h3>
              <p className="text-xs text-slate-400">Meta: 2.200 kcal | Consumido: 1.840 kcal</p>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">360 kcal restantes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* Calorie Gauge */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-950/50 rounded-xl border border-slate-800/80">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#1E293B" strokeWidth="8" fill="transparent" />
                  <circle 
                    cx="50" cy="50" r="40" 
                    stroke="url(#calorieGradient)" 
                    strokeWidth="8" 
                    strokeDasharray="251.2" 
                    strokeDashoffset="45" 
                    strokeLinecap="round" 
                    fill="transparent" 
                  />
                  <defs>
                    <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0EA5E9" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-extrabold text-white">1.840</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">kcal hoje</span>
                </div>
              </div>
            </div>

            {/* Macros Breakdown */}
            <div className="space-y-4">
              {macroData.map((macro) => (
                <div key={macro.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300">{macro.name}</span>
                    <span className="text-slate-400">{macro.value}g / {macro.goal}g</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (macro.value / macro.goal) * 100)}%`, backgroundColor: macro.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Insights Section */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse"></div>
            <h3 className="text-lg font-bold text-white">Insights Proativos do Vita</h3>
          </div>
          <span className="text-xs text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">2 Novas Correlações</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-rose-400 uppercase tracking-wider">
              <span>⚠️ Correlação de Estresse & Gastos</span>
              <span>Severidade Média</span>
            </div>
            <p className="text-sm text-slate-200">
              Você gasta <strong className="text-white font-semibold">30% a mais com fast food</strong> nos dias em que dorme menos de 6 horas.
            </p>
          </div>

          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <span>🎉 Conquista Biológica</span>
              <span>Hidratação OK</span>
            </div>
            <p className="text-sm text-slate-200">
              Parabéns! Sua meta de hidratação (<strong className="text-white font-semibold">2.4L/dia</strong>) foi atingida em 6 dos últimos 7 dias.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Menu */}
      <div className="fixed bottom-6 right-6 flex items-center space-x-3">
        <button 
          onClick={() => setActiveModal('meal')}
          className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 text-slate-950 font-bold text-2xl shadow-2xl hover:scale-105 transition flex items-center justify-center shadow-sky-500/30"
          title="Novo registro rápido"
        >
          +
        </button>
      </div>

      {/* Quick Action Modal Placeholder */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg text-white">
                {activeModal === 'meal' ? '📸 Analisar Foto de Refeição' : '💰 Lançar Nova Transação'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-slate-400">
              {activeModal === 'meal' 
                ? 'Envie a foto do seu prato de comida para a Vision AI calcular calorias e macros automaticamente.' 
                : 'Informe o valor e a categoria do seu gasto ou receita.'}
            </p>
            <div className="p-8 border-2 border-dashed border-slate-800 rounded-xl text-center text-slate-500 hover:border-sky-500 transition cursor-pointer">
              {activeModal === 'meal' ? 'Arraste a foto do prato aqui ou clique para selecionar' : 'Valor: R$ 0,00'}
            </div>
            <button 
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-bold rounded-xl"
            >
              Confirmar Registro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
