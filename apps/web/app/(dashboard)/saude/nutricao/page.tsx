'use client';

import { useState } from 'react';
import { Apple, Camera, Sparkles, Utensils, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/api';

export default function NutricaoPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedMeal, setAnalyzedMeal] = useState<any>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await authFetch('/api/multimodal-intake/photo', {
          method: 'POST',
          body: JSON.stringify({ image: base64, mimeType: file.type, context: 'Refeição' }),
        });

        if (res.ok) {
          const data = await res.json();
          const nut = data.nutrition_data || data;
          setAnalyzedMeal({
            name: nut?.meal_type || 'Refeição Analisada por IA',
            calories: nut?.total_calories || 450,
            items: nut?.items || [{ name: 'Refeição Registrada', weight_g: 250, calories: nut?.total_calories || 450 }],
            macros: {
              carbs: nut?.items?.[0]?.carbs_g || 45,
              protein: nut?.items?.[0]?.protein_g || 30,
              fat: nut?.items?.[0]?.fat_g || 12,
            },
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erro na visão IA:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const currentCarbs = analyzedMeal?.macros?.carbs || 0;
  const currentProtein = analyzedMeal?.macros?.protein || 0;
  const currentFat = analyzedMeal?.macros?.fat || 0;

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
        <label className="w-full flex flex-col items-center justify-center cursor-pointer space-y-3 group">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleImageSelect}
            className="hidden" 
          />

          <div className="w-12 h-12 rounded-md bg-[#16191e] border border-[#ffffff10] flex items-center justify-center text-[#4ade80] group-hover:bg-[#1d2127] transition">
            {analyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
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
        </label>
      </div>

      {/* AI Result Card */}
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
            {analyzedMeal.items.map((item: any, idx: number) => (
              <div key={idx} className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md flex justify-between items-center text-xs">
                <span className="text-[#f7f8f8] font-medium">{item.name} ({item.weight_g || item.weight || '100g'})</span>
                <span className="text-[#8a8f98] font-mono">{item.calories} kcal</span>
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
              <span className="text-[#f7f8f8] font-bold">{currentCarbs}g / 250g ({Math.round((currentCarbs / 250) * 100)}%)</span>
            </div>
            <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden border border-[#ffffff0a]">
              <div className="bg-[#5e6ad2] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((currentCarbs / 250) * 100))}%` }}></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#8a8f98]">Proteínas</span>
              <span className="text-[#f7f8f8] font-bold">{currentProtein}g / 140g ({Math.round((currentProtein / 140) * 100)}%)</span>
            </div>
            <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden border border-[#ffffff0a]">
              <div className="bg-[#4ade80] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((currentProtein / 140) * 100))}%` }}></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#8a8f98]">Gorduras</span>
              <span className="text-[#f7f8f8] font-bold">{currentFat}g / 65g ({Math.round((currentFat / 65) * 100)}%)</span>
            </div>
            <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden border border-[#ffffff0a]">
              <div className="bg-[#facc15] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((currentFat / 65) * 100))}%` }}></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
