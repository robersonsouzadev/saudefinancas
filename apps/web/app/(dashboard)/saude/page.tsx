'use client';

import { useState } from 'react';

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
    <div className="space-y-6 text-white pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Diário de Saúde & Hábitos Biológicos</h1>
          <p className="text-slate-400 text-xs mt-1">Acompanhe seu sono, hidratação, humor e atividades físicas em tempo real</p>
        </div>
        {saved && (
          <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold animate-pulse">
            ✓ Log de Saúde Registrado!
          </span>
        )}
      </div>

      {/* Metric Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-xl relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">😴 Horas de Sono</span>
          <div className="text-3xl font-extrabold text-sky-400 mt-2">{sleepHours}h</div>
          <span className="text-[11px] text-emerald-400 mt-1 inline-block">Qualidade: Excelente (88%)</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-xl relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">💧 Hidratação</span>
          <div className="text-3xl font-extrabold text-cyan-400 mt-2">{waterLiters.toFixed(1)} L</div>
          <span className="text-[11px] text-cyan-300 mt-1 inline-block">Meta diária: 2.5L</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-xl relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">😊 Humor & Energia</span>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">{mood} / 10</div>
          <span className="text-[11px] text-emerald-300 mt-1 inline-block">Estresse Baixo</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl backdrop-blur-xl relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🏋️ Exercício Físico</span>
          <div className="text-3xl font-extrabold text-amber-400 mt-2">{exerciseMin} min</div>
          <span className="text-[11px] text-amber-300 mt-1 inline-block">{exerciseType}</span>
        </div>
      </div>

      {/* Interactive Daily Log Form */}
      <form onSubmit={handleSaveLog} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-base font-bold text-white">Registrar Biometria de Hoje</h2>
          <p className="text-xs text-slate-400">Ajuste os valores abaixo para atualizar o indicador biocombustível da Vita.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Sono Slider */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Horas de Sono ({sleepHours}h)</span>
              <span className="text-sky-400">Meta: 8.0h</span>
            </div>
            <input 
              type="range" 
              min="3" 
              max="12" 
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(parseFloat(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer" 
            />
          </div>

          {/* Água Increment */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Água Ingerida Hoje</span>
              <span className="text-cyan-400">{waterLiters.toFixed(1)} Litros</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                type="button"
                onClick={() => setWaterLiters(prev => Math.max(0, prev - 0.25))}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300"
              >
                - 250ml
              </button>
              <button 
                type="button"
                onClick={() => setWaterLiters(prev => prev + 0.25)}
                className="px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 rounded-lg text-xs font-bold"
              >
                + 250ml (Copo)
              </button>
              <button 
                type="button"
                onClick={() => setWaterLiters(prev => prev + 0.50)}
                className="px-3 py-1 bg-cyan-500 text-slate-950 hover:opacity-90 rounded-lg text-xs font-bold"
              >
                + 500ml (Garrafa)
              </button>
            </div>
          </div>

          {/* Humor Slider */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Nível de Humor & Energia ({mood}/10)</span>
              <span className="text-emerald-400">{mood >= 8 ? '😊 Otimo' : mood >= 5 ? '😐 Médio' : '😫 Baixo'}</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={mood}
              onChange={(e) => setMood(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer" 
            />
          </div>

          {/* Exercício Input */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Atividade Física</span>
              <span className="text-amber-400">{exerciseMin} minutos</span>
            </div>
            <div className="flex space-x-2">
              <input 
                type="number" 
                value={exerciseMin}
                onChange={(e) => setExerciseMin(parseInt(e.target.value) || 0)}
                className="w-24 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-white text-xs" 
              />
              <select 
                value={exerciseType}
                onChange={(e) => setExerciseType(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-white text-xs"
              >
                <option>Musculação</option>
                <option>Corrida</option>
                <option>Caminhada</option>
                <option>Ciclismo</option>
                <option>Natação</option>
                <option>Yoga</option>
              </select>
            </div>
          </div>
        </div>

        <button 
          type="submit"
          className="bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-bold px-8 py-3 rounded-xl hover:opacity-95 transition shadow-lg shadow-sky-500/20 text-xs"
        >
          Salvar Log de Saúde
        </button>
      </form>
    </div>
  );
}
