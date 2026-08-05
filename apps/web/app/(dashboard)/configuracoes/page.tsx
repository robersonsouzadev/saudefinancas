'use client';

import { useState } from 'react';
import { Settings, ShieldCheck, Key, PhoneCall, Check, Save } from 'lucide-react';

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
    <div className="space-y-6 text-[#f7f8f8] max-w-4xl mx-auto pb-12">
      
      {/* Linear Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#a1a1aa]">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">Configurações do Sistema</h1>
            <p className="text-xs text-[#8a8f98]">Central de chaves de API, canal WhatsApp UazAPI e segurança</p>
          </div>
        </div>

        {saved && (
          <span className="px-3 py-1 bg-[#4ade8015] text-[#4ade80] border border-[#4ade8030] rounded text-xs font-mono flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> Salvo com Sucesso!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        
        {/* Multi-LLM Section */}
        <div className="linear-card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
            <div>
              <h2 className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
                <Key className="w-4 h-4 text-[#5e6ad2]" /> Central Multi-LLM (Chaves de API)
              </h2>
              <p className="text-[11px] text-[#8a8f98] mt-0.5">Armazenamento criptografado via AES-256 no banco de dados.</p>
            </div>
            <span className="text-[10px] font-mono text-[#5e6ad2] bg-[#5e6ad215] px-2 py-0.5 rounded border border-[#5e6ad230]">
              4 Provedores
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">OpenAI API Key</label>
              <input 
                type="password" 
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Anthropic API Key</label>
              <input 
                type="password" 
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Google Gemini API Key</label>
              <input 
                type="password" 
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">DeepSeek API Key</label>
              <input 
                type="password" 
                value={deepseekKey}
                onChange={(e) => setDeepseekKey(e.target.value)}
                className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]"
              />
            </div>
          </div>
        </div>

        {/* WhatsApp Uazapi Section */}
        <div className="linear-card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
            <div>
              <h2 className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#4ade80]" /> Canal Oficial WhatsApp (UazAPI)
              </h2>
              <p className="text-[11px] text-[#8a8f98] mt-0.5">Instância global para envio de alertas do assistente Vita.</p>
            </div>
            <span className="text-[10px] font-mono text-[#4ade80] bg-[#4ade8015] px-2 py-0.5 rounded border border-[#4ade8030]">
              UazAPI Ativo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Nome da Instância UazAPI</label>
              <input 
                type="text" 
                value={uazapiInstance}
                onChange={(e) => setUazapiInstance(e.target.value)}
                className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Token de Autenticação</label>
              <input 
                type="password" 
                value={uazapiToken}
                onChange={(e) => setUazapiToken(e.target.value)}
                className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button 
            type="submit"
            className="h-9 px-5 rounded bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium flex items-center space-x-1.5 transition shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações</span>
          </button>
        </div>

      </form>

    </div>
  );
}
