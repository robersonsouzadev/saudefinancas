'use client';

import { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  Plus, Camera, DollarSign, Activity, HeartPulse, 
  TrendingUp, Sparkles, AlertCircle, CheckCircle2, ArrowUpRight
} from 'lucide-react';

export default function DashboardHome() {
  const [activeModal, setActiveModal] = useState<'meal' | 'expense' | null>(null);

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-12">
      
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
              Ativo
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-4xl font-bold font-mono text-[#f7f8f8] tracking-tight">100</span>
            <span className="text-[#575c66] text-xs font-medium">/ 100</span>
          </div>

          <div className="w-full bg-[#16191e] h-1.5 rounded-full overflow-hidden border border-[#ffffff0a]">
            <div className="bg-[#5e6ad2] h-full rounded-full w-[100%] transition-all duration-500"></div>
          </div>
        </div>

        {/* Saúde Física */}
        <div className="linear-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Saúde & Recuperação</span>
            <span className="text-[11px] font-mono text-[#60a5fa] bg-[#60a5fa15] px-2 py-0.5 rounded border border-[#60a5fa30]">
              Diário Ativo
            </span>
          </div>

          <div className="flex items-baseline space-x-3">
            <span className="text-4xl font-bold font-mono text-[#4ade80]">A</span>
            <span className="text-xs text-[#8a8f98]">Aguardando logs diários</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-[#8a8f98]">
            <div>💧 Água: <span className="text-[#f7f8f8] font-bold">0.0L</span></div>
            <div>🔥 Meta: <span className="text-[#f7f8f8] font-bold">2,000 kcal</span></div>
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className="linear-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Balanço Financeiro</span>
            <span className="text-[11px] font-mono text-[#8a8f98] bg-[#16191e] px-2 py-0.5 rounded border border-[#ffffff0e]">
              Produção
            </span>
          </div>

          <div>
            <div className="text-3xl font-bold font-mono text-[#f7f8f8]">
              R$ 0,00
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono pt-1 border-t border-[#ffffff08] text-[#8a8f98]">
            <span>Receitas: <strong className="text-[#4ade80]">R$ 0,00</strong></span>
            <span>Gastos: <strong className="text-[#f87171]">R$ 0,00</strong></span>
          </div>
        </div>

      </div>

      {/* Proactive Insights Section */}
      <div className="linear-card p-5 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-semibold text-[#f7f8f8]">
          <Sparkles className="w-4 h-4 text-[#5e6ad2]" />
          <span>Insights Proativos do Agente Vita</span>
        </div>

        <div className="p-4 bg-[#16191e] border border-[#ffffff0a] rounded-md text-xs text-[#8a8f98] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#4ade80] flex-shrink-0" />
          <span>Sistema pronto para uso em produção! Comece a registrar biometria e transações para gerar correlações com IA.</span>
        </div>
      </div>

    </div>
  );
}
