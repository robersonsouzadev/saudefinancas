'use client';

import { useState } from 'react';

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
    <div className="space-y-6 text-white pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Diário Nutricional com IA</h1>
          <p className="text-slate-400 text-xs mt-1">Análise automática de refeições por Visão Computacional (Tabela TACO)</p>
        </div>
        <span className="px-3 py-1 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-full text-xs font-semibold">
          IA Vision Ativa
        </span>
      </div>

      {/* Upload Dropzone */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
        <div 
          onClick={handleSimulateVision}
          className="border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition group"
        >
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition">
            📸
          </div>
          <h3 className="font-bold text-base text-white">Arraste uma foto da refeição ou clique aqui</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Nossa IA identificará cada ingrediente, estimará a porção e calculará calorias e macronutrientes instantaneamente.
          </p>
          {analyzing && (
            <div className="mt-4 flex items-center space-x-2 text-sky-400 text-xs font-semibold animate-pulse">
              <div className="w-3 h-3 rounded-full bg-sky-400"></div>
              <span>Analisando prato com Vision AI (Tabela TACO)...</span>
            </div>
          )}
        </div>
      </div>

      {/* Simulated AI Result Card */}
      {analyzedMeal && (
        <div className="bg-slate-900 border border-emerald-500/40 p-6 rounded-2xl shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Refeição Identificada</span>
              <h3 className="text-lg font-bold text-white">{analyzedMeal.name}</h3>
            </div>
            <span className="text-xl font-extrabold text-emerald-400">{analyzedMeal.calories} kcal</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">Carboidratos</span>
              <p className="text-sm font-bold text-sky-400">{analyzedMeal.macros.carbs}g</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">Proteínas</span>
              <p className="text-sm font-bold text-emerald-400">{analyzedMeal.macros.protein}g</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase">Gorduras</span>
              <p className="text-sm font-bold text-amber-400">{analyzedMeal.macros.fat}g</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Itens Detectados</h4>
            <div className="space-y-1.5">
              {analyzedMeal.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between text-xs px-3 py-2 bg-slate-950/40 rounded-lg border border-slate-800/60">
                  <span className="text-slate-200">{item.name} (~{item.weight})</span>
                  <span className="text-slate-400 font-semibold">{item.calories}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Daily Macros Overview */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl space-y-4">
        <h2 className="text-lg font-bold text-white">Progresso Diário de Macronutrientes</h2>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-300">Carboidratos</span>
              <span className="text-sky-400">180g / 250g (72%)</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: '72%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-300">Proteínas</span>
              <span className="text-emerald-400">120g / 140g (85%)</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: '85%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-300">Gorduras</span>
              <span className="text-amber-400">55g / 65g (84%)</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: '84%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
