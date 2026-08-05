'use client';

import { useState } from 'react';
import { Sparkles, AlertTriangle, AlertCircle, CheckCircle2, ThumbsUp, ThumbsDown } from 'lucide-react';

export default function InsightsPage() {
  const [feedbacks, setFeedbacks] = useState<Record<string, 'up' | 'down'>>({});

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedbacks(prev => ({ ...prev, [id]: type }));
  };

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-12">
      
      {/* Linear Page Header */}
      <div className="flex items-center space-x-3 border-b border-[#ffffff0e] pb-5">
        <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#eab308]">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">Insights & Correlações Biológicas × Financeiras</h1>
          <p className="text-xs text-[#8a8f98]">Identificação automática de padrões entre sono, estresse, dieta e comportamento de consumo</p>
        </div>
      </div>

      {/* Insights Cards Feed */}
      <div className="space-y-3">
        
        {/* Insight 1 */}
        <div className="linear-card p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#f8717115] text-[#f87171] border border-[#f8717130] text-[10px] font-mono font-semibold rounded">
                <AlertCircle className="w-3 h-3" /> Crítico
              </span>
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Gatilho de Estresse e Gastos Com Delivery</h3>
              <p className="text-xs text-[#8a8f98]">
                Nos dias em que seu nível de estresse ultrapassa 8/10, seus gastos com pedidos de restaurante e transporte por aplicativo aumentam em média 45%.
              </p>
            </div>

            <div className="flex items-center space-x-1">
              <button 
                onClick={() => handleFeedback('1', 'up')}
                className={`p-1.5 rounded transition ${feedbacks['1'] === 'up' ? 'text-[#4ade80] bg-[#16191e]' : 'text-[#575c66] hover:text-[#f7f8f8]'}`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleFeedback('1', 'down')}
                className={`p-1.5 rounded transition ${feedbacks['1'] === 'down' ? 'text-[#f87171] bg-[#16191e]' : 'text-[#575c66] hover:text-[#f7f8f8]'}`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Insight 2 */}
        <div className="linear-card p-5 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#facc1515] text-[#facc15] border border-[#facc1530] text-[10px] font-mono font-semibold rounded">
                <AlertTriangle className="w-3 h-3" /> Atenção
              </span>
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Impacto do Sono Privado na Ingestão Calórica</h3>
              <p className="text-xs text-[#8a8f98]">
                Sua ingestão calórica excede a meta diária em 22% nos dias subsequentes a noites com menos de 6 horas de sono reparador.
              </p>
            </div>

            <div className="flex items-center space-x-1">
              <button 
                onClick={() => handleFeedback('2', 'up')}
                className={`p-1.5 rounded transition ${feedbacks['2'] === 'up' ? 'text-[#4ade80] bg-[#16191e]' : 'text-[#575c66] hover:text-[#f7f8f8]'}`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleFeedback('2', 'down')}
                className={`p-1.5 rounded transition ${feedbacks['2'] === 'down' ? 'text-[#f87171] bg-[#16191e]' : 'text-[#575c66] hover:text-[#f7f8f8]'}`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
