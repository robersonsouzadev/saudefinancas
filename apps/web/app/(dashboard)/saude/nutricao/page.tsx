'use client';

import { useState } from 'react';
import { Apple, Camera, Sparkles, CheckCircle2, Utensils, Zap } from 'lucide-react';

export default function NutricaoPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedMeal, setAnalyzedMeal] = useState<any>(null);

  const handleSimulateVision = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalyzedMeal({
        name: 'Almoço Executivo Tradicional',
        calories: 511,
        items: [
          { name: 'Arroz branco', weight: '150g', calories: '195 kcal' },
          { name: 'Feijão carioca', weight: '100g', calories: '76 kcal' },
          { name: 'Bife de alcatra grelhado', weight: '120g', calories: '240 kcal' },
        ],
        macros: { carbs: 52, protein: 38, fat: 14 }
      });
    }, 1500);
  };

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-12">
      
      {/* Linear Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#4ade80]">
            <Apple className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">Diário Nutricional com Visão IA</h1>
            <p className="text-xs text-[#8a8f98]">Análise automática de refeições por fotos (Tabela TACO)</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded bg-[#4ade8010] text-[#4ade80] border border-[#4ade8025] text-xs font-mono flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> IA Vision Ativa
        </span>
      </div>

      {/* Upload Dropzone */}
      <div className="linear-card p-8 text-center space-y-4 flex flex-col items-center justify-center border-dashed">
        <div 
          onClick={handleSimulateVision}
          className="w-full flex flex-col items-center justify-center cursor-pointer space-y-3 group"
        >
          <div className="w-12 h-12 rounded-md bg-[#16191e] border border-[#ffffff10] flex items-center justify-center text-[#4ade80] group-hover:bg-[#1d2127] transition">
            <Camera className="w-6 h-6" />
          </div>

          <div>
            <h3 className="font-semibold text-sm text-[#f7f8f8]">Arraste uma foto da refeição ou clique para selecionar</h3>
            <p className="text-xs text-[#8a8f98] mt-1 max-w-md">
              A IA identifica os ingredientes, estima a porção e calcula calorias e macronutrientes instantaneamente.
            </p>
          </div>

          {analyzing && (
            <div className="flex items-center space-x-2 text-[#4ade80] text-xs font-mono animate-pulse pt-2">
              <span className="w-2 h-2 rounded-full bg-[#4ade80]"></span>
              <span>Analisando prato com Vision AI (Tabela TACO)...</span>
            </div>
          )}
        </div>
      </div>

      {/* Simulated AI Result Card */}
      {analyzedMeal && (
        <div className="linear-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
            <div className="flex items-center space-x-2">
              <Utensils className="w-4 h-4 text-[#4ade80]" />
              <h3 className="font-semibold text-sm text-[#f7f8f8]">{analyzedMeal.name}</h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#4ade80] bg-[#4ade8015] px-2.5 py-0.5 rounded border border-[#4ade8030]">
              {analyzedMeal.calories} kcal
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {analyzedMeal.items.map((item: any) => (
              <div key={item.name} className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md flex justify-between items-center text-xs">
                <span className="text-[#f7f8f8] font-medium">{item.name} ({item.weight})</span>
                <span className="text-[#8a8f98] font-mono">{item.calories}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Macro Progress Bars */}
      <div className="linear-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#f7f8f8] border-b border-[#ffffff0e] pb-3">
          Progresso Diário de Macronutrientes
        </h3>

        <div className="space-y-4 text-xs font-mono">
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#8a8f98]">Carboidratos</span>
              <span className="text-[#f7f8f8] font-bold">180g / 250g (72%)</span>
            </div>
            <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden border border-[#ffffff0a]">
              <div className="bg-[#5e6ad2] h-full rounded-full w-[72%]"></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#8a8f98]">Proteínas</span>
              <span className="text-[#f7f8f8] font-bold">120g / 140g (85%)</span>
            </div>
            <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden border border-[#ffffff0a]">
              <div className="bg-[#4ade80] h-full rounded-full w-[85%]"></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#8a8f98]">Gorduras</span>
              <span className="text-[#f7f8f8] font-bold">55g / 65g (84%)</span>
            </div>
            <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden border border-[#ffffff0a]">
              <div className="bg-[#facc15] h-full rounded-full w-[84%]"></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
