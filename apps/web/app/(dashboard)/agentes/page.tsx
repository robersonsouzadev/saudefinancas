'use client';

import { useState } from 'react';
import { 
  Bot, Sliders, MessageSquare, Plus, Check, Edit3, Trash2, 
  Sparkles, HeartPulse, Wallet, Apple, ShieldCheck, PhoneCall, RefreshCw
} from 'lucide-react';

interface AgentCard {
  id: string;
  name: string;
  department: 'Saúde' | 'Financeiro' | 'Nutrição' | 'Orquestrador';
  systemPrompt: string;
  modelName: string;
  provider: string;
  temperature: number;
  acountCount: number;
  isPrimary: boolean;
  isActive: boolean;
  whatsappEnabled?: boolean;
  whatsappIntegrationType?: 'uazapi' | 'meta';
  uazapiServerUrl?: string;
  uazapiInstanceName?: string;
  uazapiToken?: string;
  webhookUrl?: string;
}

const initialAgents: AgentCard[] = [
  {
    id: '1',
    name: 'Dra. Maya — Saúde & Longevidade',
    department: 'Saúde',
    systemPrompt: 'Seu nome é Dra. Maya. Você é a especialista em saúde física, sono e longevidade do sistema. Sua função é analisar indicadores biológicos, orientar rotinas saudáveis e prevenir estresse metabólico.',
    modelName: 'gpt-4o-mini',
    provider: 'OpenAI',
    temperature: 0.7,
    acountCount: 42,
    isPrimary: false,
    isActive: true,
    whatsappEnabled: true,
    whatsappIntegrationType: 'uazapi',
    uazapiServerUrl: 'https://uazapi.com',
    uazapiInstanceName: 'DRA_MAYA_HEALTH',
    uazapiToken: 'token_maya_sec_2026',
    webhookUrl: 'https://app.robersonsouza.com.br/api/whatsapp/webhook/dra-maya'
  },
  {
    id: '2',
    name: 'Otávio — Estrategista Financeiro',
    department: 'Financeiro',
    systemPrompt: 'Seu nome é Otávio. Você é o consultor financeiro e estrategista orçamentário. Sua função é analisar extratos, identificar despesas e sugerir metas de economia.',
    modelName: 'gpt-4o-mini',
    provider: 'OpenAI',
    temperature: 0.5,
    acountCount: 38,
    isPrimary: false,
    isActive: true,
    whatsappEnabled: true,
    whatsappIntegrationType: 'uazapi',
    uazapiServerUrl: 'https://uazapi.com',
    uazapiInstanceName: 'OTAVIO_FINANCE',
    uazapiToken: 'token_otavio_sec_2026',
    webhookUrl: 'https://app.robersonsouza.com.br/api/whatsapp/webhook/otavio'
  },
  {
    id: '3',
    name: 'Nutri Bia — Nutrição Integrativa',
    department: 'Nutrição',
    systemPrompt: 'Seu nome é Nutri Bia. Você é a nutricionista integrativa responsável pela análise de refeições por foto, contagem de macronutrientes e ajuste calórico.',
    modelName: 'gpt-4o-mini',
    provider: 'OpenAI',
    temperature: 0.6,
    acountCount: 54,
    isPrimary: false,
    isActive: true,
    whatsappEnabled: true,
    whatsappIntegrationType: 'uazapi',
    uazapiServerUrl: 'https://uazapi.com',
    uazapiInstanceName: 'NUTRI_BIA',
    uazapiToken: 'token_bia_sec_2026',
    webhookUrl: 'https://app.robersonsouza.com.br/api/whatsapp/webhook/nutri-bia'
  },
  {
    id: '4',
    name: 'Vita — Assistente Principal (Orquestrador)',
    department: 'Orquestrador',
    systemPrompt: 'Seu nome é Vita. Você é o agente orquestrador principal do sistema Saúde & Finanças. Você correlaciona os dados de saúde com finanças e coordena a comunicação.',
    modelName: 'gpt-4o',
    provider: 'OpenAI',
    temperature: 0.7,
    acountCount: 120,
    isPrimary: true,
    isActive: true,
    whatsappEnabled: true,
    whatsappIntegrationType: 'uazapi',
    uazapiServerUrl: 'https://uazapi.com',
    uazapiInstanceName: 'VITA_ORCHESTRATOR',
    uazapiToken: 'token_vita_sec_2026',
    webhookUrl: 'https://app.robersonsouza.com.br/api/whatsapp/webhook/vita'
  }
];

export default function AgentesPage() {
  const [agents, setAgents] = useState<AgentCard[]>(initialAgents);
  const [selectedAgent, setSelectedAgent] = useState<AgentCard | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'whatsapp'>('prompt');

  const handleToggleActive = (id: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const handleOpenConfig = (agent: AgentCard) => {
    setSelectedAgent({ ...agent });
    setShowConfigModal(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;

    setAgents(prev => prev.map(a => a.id === selectedAgent.id ? selectedAgent : a));
    setShowConfigModal(false);
  };

  const getDeptIcon = (dept: string) => {
    switch (dept) {
      case 'Saúde': return <HeartPulse className="w-4 h-4 text-[#f87171]" />;
      case 'Financeiro': return <Wallet className="w-4 h-4 text-[#22c55e]" />;
      case 'Nutrição': return <Apple className="w-4 h-4 text-[#4ade80]" />;
      default: return <Sparkles className="w-4 h-4 text-[#5e6ad2]" />;
    }
  };

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-12">
      
      {/* Linear Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#a855f7]">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">Meus Agentes de IA</h1>
            <p className="text-xs text-[#8a8f98]">Especialistas virtuais de saúde, nutrição, finanças e WhatsApp</p>
          </div>
        </div>

        <button 
          onClick={() => {
            const newAg: AgentCard = {
              id: String(Date.now()),
              name: 'Novo Agente Especialista',
              department: 'Saúde',
              systemPrompt: 'Você é um assistente especialista...',
              modelName: 'gpt-4o-mini',
              provider: 'OpenAI',
              temperature: 0.7,
              acountCount: 0,
              isPrimary: false,
              isActive: true,
              whatsappEnabled: false
            };
            setSelectedAgent(newAg);
            setShowConfigModal(true);
          }}
          className="h-8 px-3 rounded-md bg-[#f7f8f8] hover:bg-[#e1e2e2] text-[#080a0c] font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Criar Agente</span>
        </button>
      </div>

      {/* Agents Linear Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((a) => (
          <div key={a.id} className="linear-card p-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded bg-[#16191e] border border-[#ffffff10] flex items-center justify-center">
                    {getDeptIcon(a.department)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[#f7f8f8] tracking-tight">{a.name}</h3>
                    <span className="text-[10px] text-[#8a8f98] font-mono">{a.provider} · {a.modelName}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleToggleActive(a.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                    a.isActive 
                      ? 'bg-[#4ade8010] text-[#4ade80] border-[#4ade8025]' 
                      : 'bg-[#16191e] text-[#575c66] border-[#ffffff0e]'
                  }`}
                >
                  {a.isActive ? 'ATIVO' : 'INATIVO'}
                </button>
              </div>

              {/* System Prompt Snippet */}
              <div className="p-3 rounded bg-[#16191e] border border-[#ffffff0a] text-[11px] text-[#8a8f98] font-mono line-clamp-3">
                "{a.systemPrompt}"
              </div>

              {/* Badges Info */}
              <div className="flex items-center space-x-2 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-[#16191e] border border-[#ffffff08] text-[#8a8f98]">
                  Temp: {a.temperature}
                </span>
                {a.whatsappEnabled && (
                  <span className="px-2 py-0.5 rounded bg-[#4ade8010] border border-[#4ade8020] text-[#4ade80] font-mono text-[10px] flex items-center gap-1">
                    <PhoneCall className="w-3 h-3" /> WhatsApp UazAPI
                  </span>
                )}
              </div>

            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#ffffff08] flex items-center justify-between">
              <span className="text-[11px] text-[#575c66] font-mono">{a.acountCount} interações</span>
              
              <button 
                onClick={() => handleOpenConfig(a)}
                className="h-7 px-3 rounded bg-[#16191e] hover:bg-[#1d2127] border border-[#ffffff10] text-[11px] text-[#f7f8f8] font-medium flex items-center space-x-1.5 transition"
              >
                <Edit3 className="w-3 h-3 text-[#8a8f98]" />
                <span>Configurar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Config Modal */}
      {showConfigModal && selectedAgent && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-lg p-6 w-full max-w-xl space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            
            <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
              <h3 className="font-semibold text-sm text-[#f7f8f8]">{selectedAgent.name}</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-[#8a8f98] hover:text-[#f7f8f8] text-xs">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#ffffff0e] text-xs font-medium space-x-4">
              <button 
                onClick={() => setActiveTab('prompt')}
                className={`pb-2 border-b-2 transition ${activeTab === 'prompt' ? 'border-[#5e6ad2] text-[#f7f8f8]' : 'border-transparent text-[#8a8f98]'}`}
              >
                Prompt & Modelo
              </button>
              <button 
                onClick={() => setActiveTab('whatsapp')}
                className={`pb-2 border-b-2 transition ${activeTab === 'whatsapp' ? 'border-[#5e6ad2] text-[#f7f8f8]' : 'border-transparent text-[#8a8f98]'}`}
              >
                Integração WhatsApp (UazAPI)
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              {activeTab === 'prompt' ? (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Nome do Agente</label>
                    <input 
                      type="text" 
                      value={selectedAgent.name}
                      onChange={(e) => setSelectedAgent({ ...selectedAgent, name: e.target.value })}
                      className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">System Prompt (Instruções da IA)</label>
                    <textarea 
                      rows={5}
                      value={selectedAgent.systemPrompt}
                      onChange={(e) => setSelectedAgent({ ...selectedAgent, systemPrompt: e.target.value })}
                      className="w-full p-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Modelo LLM</label>
                      <select 
                        value={selectedAgent.modelName}
                        onChange={(e) => setSelectedAgent({ ...selectedAgent, modelName: e.target.value })}
                        className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none"
                      >
                        <option value="gpt-4o-mini">gpt-4o-mini</option>
                        <option value="gpt-4o">gpt-4o</option>
                        <option value="claude-3-5-sonnet">claude-3-5-sonnet</option>
                        <option value="deepseek-v3">deepseek-v3</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Temperatura ({selectedAgent.temperature})</label>
                      <input 
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedAgent.temperature}
                        onChange={(e) => setSelectedAgent({ ...selectedAgent, temperature: parseFloat(e.target.value) })}
                        className="w-full mt-2"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      id="wa-check"
                      checked={selectedAgent.whatsappEnabled || false}
                      onChange={(e) => setSelectedAgent({ ...selectedAgent, whatsappEnabled: e.target.checked })}
                      className="rounded bg-[#16191e] border-[#ffffff12]"
                    />
                    <label htmlFor="wa-check" className="text-xs font-semibold text-[#f7f8f8]">Ativar Atendimento WhatsApp via UazAPI</label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">URL do Servidor UazAPI</label>
                    <input 
                      type="text" 
                      value={selectedAgent.uazapiServerUrl || ''}
                      onChange={(e) => setSelectedAgent({ ...selectedAgent, uazapiServerUrl: e.target.value })}
                      placeholder="https://uazapi.com"
                      className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Nome da Instância</label>
                      <input 
                        type="text" 
                        value={selectedAgent.uazapiInstanceName || ''}
                        onChange={(e) => setSelectedAgent({ ...selectedAgent, uazapiInstanceName: e.target.value })}
                        placeholder="INSTANCE_NAME"
                        className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Token de Acesso</label>
                      <input 
                        type="password" 
                        value={selectedAgent.uazapiToken || ''}
                        onChange={(e) => setSelectedAgent({ ...selectedAgent, uazapiToken: e.target.value })}
                        placeholder="token_sec_..."
                        className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowConfigModal(false)}
                  className="h-8 px-3 rounded bg-[#16191e] text-[#8a8f98] hover:text-[#f7f8f8] border border-[#ffffff0a]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="h-8 px-4 rounded bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
