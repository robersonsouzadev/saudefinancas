'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Bot, Trash2, Search, ArrowLeft, Send, Loader2, Zap, Sparkles, X, 
  Plus, Edit3, HeartPulse, Wallet, Apple, Check, PhoneCall, Copy, Scale, Save
} from 'lucide-react';
import { authFetch } from '@/lib/api';

interface Agent {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  modelName: string;
  temperature: number;
  isDefault?: boolean;
  department?: string;
  whatsappEnabled?: boolean;
  uazapiInstanceName?: string;
  uazapiToken?: string;
}

interface SandboxMessage {
  role: 'user' | 'agent';
  content: string;
  tokens?: number;
}

const PROVIDER_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o — Flagship (Mais Inteligente)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini — Recomendado (Rápido e Econômico)' },
    { value: 'o3-mini', label: 'o3-mini — Raciocínio Rápido (Reasoning)' },
    { value: 'o1', label: 'o1 — Raciocínio Avançado' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet — Equilibrado' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku — Rápido' },
  ],
  gemini: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — Ultra Rápido' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro — Contexto Longo' },
  ],
  deepseek: [
    { value: 'deepseek-chat', label: 'DeepSeek V3 — Chat' },
    { value: 'deepseek-reasoner', label: 'DeepSeek R1 — Raciocínio (Reasoning)' },
  ],
};

const defaultAgentsList: Agent[] = [
  {
    id: 'dra-maya',
    name: 'Dra. Maya — Saúde & Longevidade',
    description: 'Especialista em saúde física, biometria e longevidade.',
    systemPrompt: 'Seu nome é Dra. Maya. Você é a especialista em saúde física, sono e longevidade do sistema Saúde & Finanças. Sua função é analisar indicadores biológicos, orientar rotinas saudáveis e prevenir estresse metabólico.',
    modelName: 'gpt-4o-mini',
    temperature: 0.7,
    department: 'Saúde',
    whatsappEnabled: true,
  },
  {
    id: 'otavio-finance',
    name: 'Otávio — Estrategista Financeiro',
    description: 'Consultor orçamentário e analista de investimentos.',
    systemPrompt: 'Seu nome é Otávio. Você é o consultor financeiro e estrategista orçamentário. Sua função é analisar extratos, identificar despesas e sugerir metas de economia e rebalanceamento de carteira.',
    modelName: 'gpt-4o-mini',
    temperature: 0.5,
    department: 'Financeiro',
    whatsappEnabled: true,
  },
  {
    id: 'nutri-bia',
    name: 'Nutri Bia — Nutrição Integrativa',
    description: 'Nutricionista responsável pela análise de macronutrientes.',
    systemPrompt: 'Seu nome é Nutri Bia. Você é a nutricionista integrativa responsável pela análise de refeições por foto, contagem de macronutrientes e ajuste calórico personalizado.',
    modelName: 'gpt-4o-mini',
    temperature: 0.6,
    department: 'Nutrição',
    whatsappEnabled: true,
  },
  {
    id: 'vita-master',
    name: 'Vita — Assistente Principal (Orquestrador)',
    description: 'Agente master que correlaciona saúde com finanças.',
    systemPrompt: 'Seu nome é Vita. Você é a assistente orquestradora principal do sistema Saúde & Finanças. Você correlaciona os dados de saúde com finanças e coordena a comunicação.',
    modelName: 'gpt-4o',
    temperature: 0.7,
    department: 'Orquestrador',
    isDefault: true,
    whatsappEnabled: true,
  },
];

export default function AgentesPage() {
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
  const [activeTab, setActiveTab] = useState<'prompt' | 'whatsapp'>('prompt');
  const [searchQuery, setSearchQuery] = useState('');
  const [agents, setAgents] = useState<Agent[]>(defaultAgentsList);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loadingSave, setLoadingSave] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [providerType, setProviderType] = useState('openai');
  const [modelName, setModelName] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState('0.7');
  const [department, setDepartment] = useState('Saúde');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  // Prompt Optimizer State
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<{ original: string; optimized: string } | null>(null);

  // Sandbox State
  const [sandboxMessages, setSandboxMessages] = useState<SandboxMessage[]>([]);
  const [sandboxInput, setSandboxInput] = useState('');
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const sandboxEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchAgents = useCallback(async () => {
    try {
      const res = await authFetch('/api/agents');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAgents(data);
        }
      }
    } catch (e) {
      console.log('Usando lista de agentes padrão');
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    sandboxEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sandboxMessages]);

  const handleEdit = (ag: Agent) => {
    setSelectedAgent(ag);
    setName(ag.name);
    setSystemPrompt(ag.systemPrompt);
    setModelName(ag.modelName || 'gpt-4o-mini');
    setTemperature(String(ag.temperature || 0.7));
    setDepartment(ag.department || 'Saúde');
    setWhatsappEnabled(ag.whatsappEnabled || false);
    setSandboxMessages([]);
    setViewMode('edit');
  };

  const handleNewAgent = () => {
    setSelectedAgent(null);
    setName('Novo Agente Especialista');
    setSystemPrompt('Seu nome é... Sua função é ajudar o usuário com...');
    setModelName('gpt-4o-mini');
    setTemperature('0.7');
    setDepartment('Saúde');
    setWhatsappEnabled(false);
    setSandboxMessages([]);
    setViewMode('create');
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !systemPrompt) {
      showToast('Preencha o nome e o System Prompt');
      return;
    }
    setLoadingSave(true);
    try {
      const isEdit = viewMode === 'edit' && selectedAgent;
      const endpoint = isEdit ? `/api/agents/${selectedAgent.id}` : '/api/agents';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await authFetch(endpoint, {
        method,
        body: JSON.stringify({
          name,
          systemPrompt,
          modelName,
          temperature: parseFloat(temperature),
          department,
          whatsappEnabled,
        }),
      });

      if (res.ok) {
        showToast(isEdit ? 'Agente atualizado com sucesso!' : 'Agente criado com sucesso!');
        await fetchAgents();
        setViewMode('list');
      } else {
        showToast('Erro ao salvar no servidor.');
      }
    } catch {
      showToast('Falha de conexão com a API.');
    } finally {
      setLoadingSave(false);
    }
  };

  const handleDeleteAgent = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente remover este agente?')) return;
    try {
      const res = await authFetch(`/api/agents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Agente removido!');
        await fetchAgents();
      }
    } catch {
      showToast('Erro ao remover agente');
    }
  };

  // Otimizar System Prompt com IA
  const handleOptimizePrompt = async () => {
    if (!systemPrompt.trim()) {
      showToast('Insira o System Prompt original para otimizar');
      return;
    }
    setOptimizing(true);
    try {
      const agentId = selectedAgent?.id || 'new';
      const res = await authFetch(`/api/agents/${agentId}/optimize-prompt`, {
        method: 'POST',
        body: JSON.stringify({ systemPrompt }),
      });

      if (res.ok) {
        const data = await res.json();
        setOptimizeResult({ original: data.original, optimized: data.optimized });
      } else {
        showToast('Erro ao otimizar prompt.');
      }
    } catch {
      showToast('Falha ao conectar com o otimizador.');
    } finally {
      setOptimizing(false);
    }
  };

  const handleApplyOptimizedPrompt = () => {
    if (!optimizeResult) return;
    setSystemPrompt(optimizeResult.optimized);
    setOptimizeResult(null);
    showToast('✨ Prompt otimizado aplicado! Salve para confirmar.');
  };

  // Enviar mensagem no Sandbox de Testes
  const handleSandboxSend = async () => {
    if (!sandboxInput.trim() || sandboxLoading) return;

    const userText = sandboxInput.trim();
    const userMsg: SandboxMessage = { role: 'user', content: userText };

    setSandboxMessages(prev => [...prev, userMsg]);
    setSandboxInput('');
    setSandboxLoading(true);

    try {
      const agentId = selectedAgent?.id || 'new';
      const res = await authFetch(`/api/agents/${agentId}/test`, {
        method: 'POST',
        body: JSON.stringify({
          message: userText,
          systemPrompt,
          modelName,
          temperature: parseFloat(temperature),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSandboxMessages(prev => [
          ...prev,
          {
            role: 'agent',
            content: data.message || 'Sem resposta.',
            tokens: data.tokens,
          },
        ]);
      } else {
        setSandboxMessages(prev => [
          ...prev,
          {
            role: 'agent',
            content: '❌ Erro ao processar. Verifique se a chave de IA está configurada em Provedores de IA.',
          },
        ]);
      }
    } catch {
      setSandboxMessages(prev => [
        ...prev,
        {
          role: 'agent',
          content: '❌ Falha de conexão com o Sandbox.',
        },
      ]);
    } finally {
      setSandboxLoading(false);
    }
  };

  const handleSandboxKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSandboxSend();
    }
  };

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (a.department && a.department.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-[1600px] mx-auto pb-12">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#16191e] border border-[#5e6ad240] text-[#f7f8f8] px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-medium animate-slide-down">
          <Check className="w-4 h-4 text-[#4ade80]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODAL: PROMPT OTIMIZADO */}
      {optimizeResult && (
        <div className="fixed inset-0 bg-[#080a0c]/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-[#ffffff0e]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#5e6ad220] rounded-lg text-[#5e6ad2]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#f7f8f8]">Prompt Otimizado pela IA</h3>
                  <p className="text-xs text-[#a1a1aa]">Revise as melhorias antes de aplicar ao agente</p>
                </div>
              </div>
              <button onClick={() => setOptimizeResult(null)} className="text-[#a1a1aa] hover:text-[#f7f8f8]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="font-bold uppercase tracking-wider text-[#cbd5e1] text-xs">System Prompt Original</p>
                <div className="bg-[#16191e] border border-[#ffffff0e] rounded-xl p-3.5 text-[#cbd5e1] font-mono text-xs leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap">
                  {optimizeResult.original}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="font-bold uppercase tracking-wider text-[#4ade80] text-xs flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Prompt Sugerido pela IA
                </p>
                <div className="bg-[#5e6ad210] border border-[#5e6ad230] rounded-xl p-3.5 text-[#f7f8f8] font-mono text-xs leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap">
                  {optimizeResult.optimized}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-[#ffffff0e]">
              <button
                onClick={() => setOptimizeResult(null)}
                className="px-4 py-2 bg-[#16191e] hover:bg-[#1f232b] text-[#a1a1aa] rounded-lg font-medium text-xs"
              >
                Descartar
              </button>
              <button
                onClick={handleApplyOptimizedPrompt}
                className="px-5 py-2 bg-[#5e6ad2] hover:bg-[#6e7be2] text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Aplicar Prompt Otimizado</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 1: LISTA DE AGENTES */}
      {viewMode === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#c084fc]">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">Meus Agentes de IA</h1>
                <p className="text-xs text-[#a1a1aa]">Especialistas virtuais de saúde, nutrição, finanças e suporte</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a1a1aa]" />
                <input 
                  type="text" 
                  placeholder="Buscar agente por nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 bg-[#16191e] border border-[#ffffff12] rounded-md text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <button 
                onClick={handleNewAgent}
                className="h-8 px-3 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Agente</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAgents.map((ag) => (
              <div key={ag.id} className="linear-card p-5 space-y-4 flex flex-col justify-between hover:border-[#5e6ad240] transition">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#5e6ad2]">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base text-[#f7f8f8] tracking-tight">{ag.name}</h3>
                        <span className="text-xs text-[#cbd5e1] font-mono font-medium">{ag.modelName || 'gpt-4o-mini'}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-[#4ade8010] text-[#4ade80] border border-[#4ade8025]">
                      ATIVO
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#16191e] border border-[#ffffff0a] text-xs sm:text-sm text-[#cbd5e1] font-mono line-clamp-3 leading-relaxed">
                    "{ag.systemPrompt}"
                  </div>

                  <div className="flex items-center space-x-2 text-xs font-mono text-[#cbd5e1]">
                    <span className="px-2.5 py-1 rounded bg-[#16191e] border border-[#ffffff12] font-medium">
                      Temp: {ag.temperature}
                    </span>
                    {ag.whatsappEnabled && (
                      <span className="px-2.5 py-1 rounded bg-[#4ade8010] border border-[#4ade8020] text-[#4ade80] font-semibold flex items-center gap-1">
                        <PhoneCall className="w-3.5 h-3.5" /> WhatsApp UazAPI
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#ffffff08] flex items-center justify-between">
                  <button 
                    onClick={() => handleEdit(ag)}
                    className="h-8 px-3.5 rounded bg-[#5e6ad215] hover:bg-[#5e6ad225] border border-[#5e6ad230] text-xs sm:text-sm text-[#818cf8] font-semibold flex items-center space-x-1.5 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Testar & Editar</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button 
                      onClick={() => handleEdit(ag)}
                      className="p-1.5 text-[#a1a1aa] hover:text-[#f7f8f8] transition"
                      title="Editar Configurações"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteAgent(ag.id, e)}
                      className="p-1.5 text-[#a1a1aa] hover:text-[#f87171] transition"
                      title="Remover Agente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* VISTA 2: EDIT / CREATE COM SANDBOX SPLIT (SAC DIGITAL STYLE) */}
      {(viewMode === 'edit' || viewMode === 'create') && (
        <div className="space-y-4">
          
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-4">
            <button 
              onClick={() => setViewMode('list')}
              className="text-xs text-[#a1a1aa] hover:text-[#f7f8f8] flex items-center space-x-1.5 font-medium transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para lista de agentes</span>
            </button>
            <h2 className="text-sm font-semibold text-[#f7f8f8]">
              {viewMode === 'create' ? 'Criar Novo Agente Especialista' : `Editar Agente — ${name}`}
            </h2>
          </div>

          {/* Two-Column Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* COLUNA ESQUERDA (60% / 7 COLS): CONFIGURAÇÕES DO AGENTE */}
            <form onSubmit={handleSaveAgent} className="lg:col-span-7 linear-card p-6 space-y-5">
              
              {/* Nome do Agente */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase mb-1">Nome do Agente</label>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Dra. Maya — Saúde & Longevidade"
                  className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  required
                />
              </div>

              {/* System Prompt com Botão Otimizar com IA */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase">
                    Contexto (System Prompt / Instruções)
                  </label>
                  <button
                    type="button"
                    onClick={handleOptimizePrompt}
                    disabled={optimizing}
                    className="px-2.5 py-1 bg-[#5e6ad215] hover:bg-[#5e6ad225] border border-[#5e6ad240] text-[#5e6ad2] rounded-md text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                  >
                    {optimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span>{optimizing ? 'Otimizando...' : '✨ Otimizar com IA'}</span>
                  </button>
                </div>
                <textarea 
                  rows={8}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Instruções fundamentais para o comportamento e limites da persona..."
                  className="w-full p-3.5 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs sm:text-sm text-[#f7f8f8] font-mono leading-relaxed focus:outline-none focus:border-[#5e6ad2] resize-none"
                  required
                />
              </div>

              {/* Seleção de Provedor & Modelo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase mb-1">Provedor de IA</label>
                  <select 
                    value={providerType}
                    onChange={(e) => {
                      setProviderType(e.target.value);
                      const defaultM = PROVIDER_MODELS[e.target.value]?.[0]?.value || 'gpt-4o-mini';
                      setModelName(defaultM);
                    }}
                    className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="deepseek">DeepSeek AI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase mb-1">Modelo LLM</label>
                  <select 
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    {(PROVIDER_MODELS[providerType] || PROVIDER_MODELS.openai).map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Temperatura & Departamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase">Temperatura (Criatividade)</label>
                    <span className="text-xs font-mono font-bold text-[#5e6ad2]">{temperature}</span>
                  </div>
                  <input 
                    type="range" min="0" max="2" step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    className="w-full mt-2 accent-[#5e6ad2]"
                  />
                  <div className="flex justify-between text-xs font-mono text-[#a1a1aa] mt-1 uppercase">
                    <span>Preciso (0.0)</span>
                    <span>Criativo (2.0)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase mb-1">Departamento / Função</label>
                  <input 
                    type="text" 
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="ex: Saúde, Finanças, Nutrição"
                    className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-xs sm:text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
              </div>

              {/* WhatsApp Checkbox */}
              <div className="p-3.5 rounded-lg bg-[#16191e] border border-[#ffffff0a] flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <PhoneCall className="w-4 h-4 text-[#4ade80]" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#f7f8f8]">Atendimento WhatsApp (UazAPI)</h4>
                    <p className="text-xs text-[#cbd5e1]">Permitir que este agente responda mensagens no canal oficial WhatsApp.</p>
                  </div>
                </div>
                <input 
                  type="checkbox"
                  checked={whatsappEnabled}
                  onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#080a0c] border-[#ffffff20] text-[#5e6ad2]"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-[#ffffff0e]">
                <button 
                  type="button" 
                  onClick={() => setViewMode('list')}
                  className="h-9 px-4 rounded-lg bg-[#16191e] hover:bg-[#1f232b] text-[#a1a1aa] font-medium text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={loadingSave}
                  className="h-9 px-5 rounded-lg bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-sm"
                >
                  {loadingSave ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{viewMode === 'create' ? 'Salvar Novo Agente' : 'Atualizar Persona'}</span>
                </button>
              </div>
            </form>

            {/* COLUNA DIREITA (40% / 5 COLS): SANDBOX DE TESTES REAL */}
            <div className="lg:col-span-5 linear-card p-0 flex flex-col h-[420px] lg:h-[580px] overflow-hidden border border-[#ffffff12]">
              
              {/* Sandbox Header */}
              <div className="p-4 bg-[#16191e] border-b border-[#ffffff0e] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-[#5e6ad2]" />
                  <h3 className="text-xs font-semibold text-[#f7f8f8]">🤖 Sandbox de Testes Em Tempo Real</h3>
                </div>

                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-[#4ade8010] text-[#4ade80] border border-[#4ade8025]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-ping"></span>
                  LIVE AGENT
                </span>
              </div>

              {/* Messages Display Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-[#080a0c]/40">
                {sandboxMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50 p-6">
                    <Zap className="w-8 h-8 text-[#5e6ad2]" />
                    <p className="text-xs text-[#a1a1aa]">Envie uma mensagem de teste para interagir com este agente usando IA real.</p>
                  </div>
                )}

                {sandboxMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-[#a1a1aa] mb-1 font-mono">
                      {msg.role === 'user' ? 'Você (Teste)' : name || 'Agente'}
                    </span>
                    <div className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed font-sans ${
                      msg.role === 'user'
                        ? 'bg-[#5e6ad2] text-white rounded-tr-none shadow-sm'
                        : 'bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.tokens && (
                        <span className="text-xs font-mono text-[#4ade80] block text-right mt-1">
                          ⚡ {msg.tokens} tokens
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {sandboxLoading && (
                  <div className="flex items-center space-x-2 text-xs text-[#a1a1aa] bg-[#16191e] p-3 rounded-xl border border-[#ffffff0a] w-max">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5e6ad2]" />
                    <span>Pensando e gerando resposta...</span>
                  </div>
                )}
                <div ref={sandboxEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-[#16191e] border-t border-[#ffffff0e] flex items-center space-x-2">
                <input 
                  type="text"
                  value={sandboxInput}
                  onChange={(e) => setSandboxInput(e.target.value)}
                  onKeyDown={handleSandboxKeyDown}
                  placeholder="Digite uma mensagem de teste..."
                  className="flex-1 h-9 px-3 rounded-lg bg-[#0f1115] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  disabled={sandboxLoading}
                />
                <button 
                  type="button"
                  onClick={handleSandboxSend}
                  disabled={sandboxLoading || !sandboxInput.trim()}
                  className="h-9 px-3.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6e7be2] disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center transition shadow-sm"
                >
                  {sandboxLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
