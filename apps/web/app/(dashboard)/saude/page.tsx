'use client';

import { useState } from 'react';
import { HeartPulse, Moon, Droplets, Smile, Dumbbell, Save, Check } from 'lucide-react';

export default function SaudePage() {
  const [sleepHours, setSleepHours] = useState(7.5);
  const [waterLiters, setWaterLiters] = useState(2.4);
  const [mood, setMood] = useState(8);
  const [exerciseMin, setExerciseMin] = useState(45);
  const [exerciseType, setExerciseType] = useState('Musculação');
  const [saved, setSaved] = useState(false);

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-[1400px] mx-auto pb-12">
      
      {/* Linear Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#f87171]">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#f7f8f8] tracking-tight">Diário de Saúde & Hábitos Biológicos</h1>
            <p className="text-sm text-[#8a8f98] mt-0.5">Acompanhamento de sono, hidratação, estresse e atividades físicas</p>
          </div>
        </div>

        {saved && (
          <span className="px-3 py-1 bg-[#4ade8015] text-[#4ade80] border border-[#4ade8030] rounded text-xs font-mono flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Log de Saúde Registrado!
          </span>
        )}
      </div>

      {/* Metric Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="linear-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-[#60a5fa]" /> Sono
            </span>
            <span className="text-[10px] font-mono text-[#4ade80]">88% Qualidade</span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#f7f8f8]">{sleepHours}h</div>
          <span className="text-[11px] text-[#8a8f98] block">Meta: 8.0h diárias</span>
        </div>

        <div className="linear-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-[#38bdf8]" /> Hidratação
            </span>
            <span className="text-[10px] font-mono text-[#38bdf8]">96% Meta</span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#f7f8f8]">{waterLiters.toFixed(1)} L</div>
          <span className="text-[11px] text-[#8a8f98] block">Meta: 2.5 Litros</span>
        </div>

        <div className="linear-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-[#4ade80]" /> Humor & Energia
            </span>
            <span className="text-[10px] font-mono text-[#4ade80]">Estresse Baixo</span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#f7f8f8]">{mood} / 10</div>
          <span className="text-[11px] text-[#8a8f98] block">Nível excelente</span>
        </div>

        <div className="linear-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5 text-[#facc15]" /> Exercício
            </span>
            <span className="text-[10px] font-mono text-[#facc15]">{exerciseType}</span>
          </div>
          <div className="text-3xl font-bold font-mono text-[#f7f8f8]">{exerciseMin} min</div>
          <span className="text-[11px] text-[#8a8f98] block">Treino diário concluído</span>
        </div>
      </div>

      {/* Interactive Log Form Card */}
      <div className="linear-card p-6 space-y-5">
        <h3 className="font-semibold text-sm text-[#f7f8f8] border-b border-[#ffffff0e] pb-3">
          Registrar Biometria do Dia
        </h3>

        <form onSubmit={handleSaveLog} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sleep Slider */}
            <div className="space-y-2">
              <div className="flex justify-between font-mono">
                <span className="text-[#8a8f98]">Horas de Sono:</span>
                <span className="font-bold text-[#f7f8f8]">{sleepHours}h</span>
              </div>
              <input 
                type="range"
                min="4"
                max="12"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#16191e] rounded-lg appearance-none cursor-pointer accent-[#5e6ad2]"
              />
            </div>

            {/* Water Quick Add */}
            <div className="space-y-2">
              <div className="flex justify-between font-mono">
                <span className="text-[#8a8f98]">Água Ingerida Hoje:</span>
                <span className="font-bold text-[#f7f8f8]">{waterLiters.toFixed(2)} L</span>
              </div>
              <div className="flex space-x-2">
                <button 
                  type="button" 
                  onClick={() => setWaterLiters(prev => Math.max(0, prev - 0.25))}
                  className="h-8 px-3 rounded bg-[#16191e] border border-[#ffffff10] text-[#8a8f98] hover:text-[#f7f8f8]"
                >
                  - 250ml
                </button>
                <button 
                  type="button" 
                  onClick={() => setWaterLiters(prev => prev + 0.25)}
                  className="h-8 px-3 rounded bg-[#16191e] border border-[#ffffff10] text-[#f7f8f8] hover:bg-[#1d2127]"
                >
                  + 250ml (Copo)
                </button>
                <button 
                  type="button" 
                  onClick={() => setWaterLiters(prev => prev + 0.5)}
                  className="h-8 px-3 rounded bg-[#16191e] border border-[#ffffff10] text-[#f7f8f8] hover:bg-[#1d2127]"
                >
                  + 500ml (Garrafa)
                </button>
              </div>
            </div>

            {/* Mood Slider */}
            <div className="space-y-2">
              <div className="flex justify-between font-mono">
                <span className="text-[#8a8f98]">Nível de Humor & Energia (1-10):</span>
                <span className="font-bold text-[#f7f8f8]">{mood} / 10</span>
              </div>
              <input 
                type="range"
                min="1"
                max="10"
                value={mood}
                onChange={(e) => setMood(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#16191e] rounded-lg appearance-none cursor-pointer accent-[#4ade80]"
              />
            </div>

            {/* Exercise Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#8a8f98] mb-1 font-mono">Atividade (Minutos)</label>
                <input 
                  type="number"
                  value={exerciseMin}
                  onChange={(e) => setExerciseMin(parseInt(e.target.value) || 0)}
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8a8f98] mb-1 font-mono">Tipo de Exercício</label>
                <select 
                  value={exerciseType}
                  onChange={(e) => setExerciseType(e.target.value)}
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none"
                >
                  <option value="Musculação">Musculação</option>
                  <option value="Corrida / Caminhada">Corrida / Caminhada</option>
                  <option value="Ciclismo">Ciclismo</option>
                  <option value="Natação">Natação</option>
                  <option value="Crossfit / Funcional">Crossfit / Funcional</option>
                </select>
              </div>
            </div>

          </div>

          <div className="pt-2 border-t border-[#ffffff08] flex justify-end">
            <button 
              type="submit"
              className="h-9 px-5 rounded bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium flex items-center space-x-1.5 transition shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Log de Saúde</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
