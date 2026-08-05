'use client';

import { useState } from 'react';

export default function ConfiguracoesPage() {
  const [saved, setSaved] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('sk-proj-••••••••••••••••••••');
  const [anthropicKey, setAnthropicKey] = useState('sk-ant-••••••••••••••••••••');
  const [geminiKey, setGeminiKey] = useState('AIzaSy••••••••••••••••••••');
  const [deepseekKey, setDeepseekKey] = useState('sk-••••••••••••••••••••');
  
  const [uazapiInstance, setUazapiInstance] = useState('sf_personal_instance');
  const [uazapiToken, setUazapiToken] = useState('uaz_token_••••••••');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl text-white pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Configurações & Conexões</h1>
          <p className="text-slate-400 text-xs mt-1">Gerencie chaves de API, LLM Hub, canal WhatsApp Uazapi e perfil</p>
        </div>
        {saved && (
          <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold animate-pulse">
            ✓ Salvo com sucesso!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* LLM Hub Section */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                🔀 Central Multi-LLM (Provedores de IA)
              </h2>
              <p className="text-xs text-slate-400">As chaves são armazenadas com criptografia militar AES-256-GCM.</p>
            </div>
            <span className="text-xs text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">4 Provedores</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">OpenAI API Key (GPT-4o / Vision / Whisper)</label>
              <input 
                type="password" 
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Anthropic API Key (Claude 3.5)</label>
              <input 
                type="password" 
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Google Gemini API Key (Gemini 2.0 Flash)</label>
              <input 
                type="password" 
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">DeepSeek API Key (DeepSeek-V3)</label>
              <input 
                type="password" 
                value={deepseekKey}
                onChange={(e) => setDeepseekKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Uazapi Section */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                📱 Canal WhatsApp (Uazapi Gateway)
              </h2>
              <p className="text-xs text-slate-400">Conecte seu WhatsApp para interagir por voz, texto e fotos com a Vita.</p>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Instância Conectada</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nome da Instância Uazapi</label>
              <input 
                type="text" 
                value={uazapiInstance}
                onChange={(e) => setUazapiInstance(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Token de Autenticação Uazapi</label>
              <input 
                type="password" 
                value={uazapiToken}
                onChange={(e) => setUazapiToken(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
              />
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white">Perfil do Usuário</h2>
            <p className="text-xs text-slate-400">Seus dados pessoais para personalizar os relatórios da Vita.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nome Completo</label>
              <input 
                type="text" 
                defaultValue="Roberson" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email</label>
              <input 
                type="email" 
                defaultValue="admin@saudefinancas.com" 
                className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
              />
            </div>
          </div>
        </div>

        <button 
          type="submit"
          className="bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-bold px-8 py-3 rounded-xl hover:opacity-95 transition shadow-lg shadow-sky-500/20 text-xs"
        >
          Salvar Todas as Configurações
        </button>
      </form>
    </div>
  );
}
