'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, AlertTriangle, AlertCircle, CheckCircle2, 
  ThumbsUp, ThumbsDown, RefreshCw, Loader2, HeartPulse, 
  Moon, Droplets, Dumbbell
} from 'lucide-react';
import { authFetch, parseJsonResponse } from '@/lib/api';

interface InsightItem {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  dataPayload?: any;
  createdAt?: string;
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Record<string, 'up' | 'down'>>({});

  const loadInsights = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/insights');
      if (res.ok) {
        const data = await parseJsonResponse(res);
        if (Array.isArray(data) && data.length > 0) {
          setInsights(data);
        } else {
          // Se não houver, dispara a análise automática inicial
          triggerAnalysis();
        }
      }
    } catch (err) {
      console.error('Erro ao carregar insights:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerAnalysis = async () => {
    try {
      setAnalyzing(true);
      const res = await authFetch('/api/insights/analyze', { method: 'POST' });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        if (Array.isArray(data)) {
          setInsights(data);
        }
      }
    } catch (err) {
      console.error('Erro ao analisar correlações:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedbacks(prev => ({ ...prev, [id]: type }));
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#f8717115] text-[#f87171] border border-[#f8717130] text-xs font-mono font-semibold rounded">
            <AlertCircle className="w-3.5 h-3.5" /> Atenção Prioritária
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#facc1515] text-[#facc15] border border-[#facc1530] text-xs font-mono font-semibold rounded">
            <AlertTriangle className="w-3.5 h-3.5" /> Moderado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#4ade8015] text-[#4ade80] border border-[#4ade8030] text-xs font-mono font-semibold rounded">
            <CheckCircle2 className="w-3.5 h-3.5" /> Padrão Otimizado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-[1400px] mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#eab308]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold text-[#f7f8f8] tracking-tight">
              Insights de Saúde & Longevidade
            </h1>
            <p className="text-sm text-[#a1a1aa] mt-0.5">
              Identificação inteligente de padrões cruzando sono, hidratação, recuperação muscular e estresse
            </p>
          </div>
        </div>

        <button
          onClick={triggerAnalysis}
          disabled={analyzing}
          className="h-8 px-3 rounded-md bg-[#16191e] border border-[#ffffff12] hover:bg-[#1d2127] text-xs font-medium text-[#f7f8f8] flex items-center space-x-2 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#eab308] ${analyzing ? 'animate-spin' : ''}`} />
          <span>{analyzing ? 'Analisando...' : 'Re-analisar Dados'}</span>
        </button>
      </div>

      {/* Insights Cards Feed */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[#a1a1aa] space-y-3">
          <Loader2 className="w-7 h-7 text-[#eab308] animate-spin mx-auto" />
          <p>Processando biomarcadores e correlações de saúde...</p>
        </div>
      ) : insights.length === 0 ? (
        <div className="py-16 text-center text-xs text-[#a1a1aa] space-y-3 border border-dashed border-[#ffffff0e] rounded-xl">
          <HeartPulse className="w-8 h-8 text-[#71717a] mx-auto opacity-50" />
          <p className="text-sm font-semibold text-[#f7f8f8]">Nenhum insight gerado ainda</p>
          <p className="max-w-md mx-auto">
            Registre suas noites de sono, copos de água e sessões de treino para que a engine de IA identifique correlações.
          </p>
          <button
            onClick={triggerAnalysis}
            className="mt-2 h-8 px-4 rounded-md bg-[#5e6ad2] text-white text-xs font-medium"
          >
            Executar Análise Agora
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((ins) => (
            <div key={ins.id} className="linear-card p-5 space-y-3">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(ins.severity)}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#f7f8f8]">{ins.title}</h3>
                  <p className="text-sm text-[#cbd5e1] leading-relaxed">
                    {ins.description}
                  </p>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button 
                    onClick={() => handleFeedback(ins.id, 'up')}
                    className={`p-1.5 rounded transition ${feedbacks[ins.id] === 'up' ? 'text-[#4ade80] bg-[#16191e]' : 'text-[#71717a] hover:text-[#f7f8f8]'}`}
                    title="Insight relevante"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleFeedback(ins.id, 'down')}
                    className={`p-1.5 rounded transition ${feedbacks[ins.id] === 'down' ? 'text-[#f87171] bg-[#16191e]' : 'text-[#71717a] hover:text-[#f7f8f8]'}`}
                    title="Não relevante"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
