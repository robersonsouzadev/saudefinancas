'use client';

import { useState } from 'react';

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
}

const initialAgents: AgentCard[] = [
  {
    id: '1',
    name: 'Dra. Maya — Saúde & Longevidade',
    department: 'Saúde',
    systemPrompt: 'Seu nome é Dra. Maya. Você é a ESPECIALISTA EM SAÚDE FÍSICA, SONO E LONGEVIDADE do sistema Saúde & Finanças. Sua função é analisar indicadores biológicos (sono, HRV, batimentos, passos), orientar sobre rotinas saudáveis e prevenir estresse metabólico.',
    modelName: 'gpt-4o-mini',
    provider: 'OpenAI',
    temperature: 0.7,
    acountCount: 42,
    isPrimary: false,
    isActive: true
  },
  {
    id: '2',
    name: 'Otávio — Estrategista Financeiro',
    department: 'Financeiro',
    systemPrompt: 'Seu nome é Otávio. Você é o CONSULTOR FINANCEIRO E ESTRATEGISTA ORÇAMENTÁRIO do sistema Saúde & Finanças. Sua função é analisar extratos, identificar despesas desnecessárias, sugerir metas de economia e categorizar transações automaticamente.',
    modelName: 'gpt-4o-mini',
    provider: 'OpenAI',
    temperature: 0.5,
    acountCount: 38,
    isPrimary: false,
    isActive: true
  },
  {
    id: '3',
    name: 'Nutri Bia — Nutrição & Macros',
    department: 'Nutrição',
    systemPrompt: 'Seu nome é Nutri Bia. Você é a ESPECIALISTA NUTRICIONAL E VISÃO COMPUTACIONAL do sistema Saúde & Finanças. Sua função é analisar fotos de refeições enviadas pelo usuário, extrair calorias/macronutrientes da Tabela TACO e sugerir ajustes na dieta.',
    modelName: 'gpt-4o-mini',
    provider: 'OpenAI',
    temperature: 0.6,
    acountCount: 55,
    isPrimary: false,
    isActive: true
  },
  {
    id: '4',
    name: 'Vita — Orquestradora Geral',
    department: 'Orquestrador',
    systemPrompt: 'Seu nome é Vita. Você é a ORQUESTRADORA PRINCIPAL DE BEM-ESTAR INTEGRADO (Saúde + Finanças). Sua função é correlacionar o impacto do estresse financeiro na saúde biológica do usuário e vice-versa, fornecendo relatórios executivos unificados.',
    modelName: 'gpt-4o-mini',
    provider: 'OpenAI',
    temperature: 0.7,
    acountCount: 120,
    isPrimary: true,
    isActive: true
  }
];

export default function MeusAgentesPage() {
  const [agents, setAgents] = useState<AgentCard[]>(initialAgents);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentCard | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [department, setDepartment] = useState<'Saúde' | 'Financeiro' | 'Nutrição' | 'Orquestrador'>('Saúde');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelName, setModelName] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.7);

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.systemPrompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSetPrimary = (id: string) => {
    setAgents(prev => prev.map(a => ({
      ...a,
      isPrimary: a.id === id
    })));
  };

  const handleToggleActive = (id: string) => {
    setAgents(prev => prev.map(a => ({
      ...a,
      isActive: a.id === id ? !a.isActive : a.isActive
    })));
  };

  const handleDelete = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id));
  };

  const handleOpenCreateModal = () => {
    setEditingAgent(null);
    setName('');
    setDepartment('Saúde');
    setSystemPrompt('');
    setModelName('gpt-4o-mini');
    setTemperature(0.7);
    setShowModal(true);
  };

  const handleOpenEditModal = (agent: AgentCard) => {
    setEditingAgent(agent);
    setName(agent.name);
    setDepartment(agent.department);
    setSystemPrompt(agent.systemPrompt);
    setModelName(agent.modelName);
    setTemperature(agent.temperature);
    setShowModal(true);
  };

  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !systemPrompt) return;

    if (editingAgent) {
      setAgents(prev => prev.map(a => a.id === editingAgent.id ? {
        ...a,
        name,
        department,
        systemPrompt,
        modelName,
        temperature
      } : a));
    } else {
      const newAgent: AgentCard = {
        id: String(Date.now()),
        name,
        department,
        systemPrompt,
        modelName,
        provider: 'OpenAI',
        temperature,
        acountCount: 0,
        isPrimary: false,
        isActive: true
      };
      setAgents([...agents, newAgent]);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-xl text-sky-400">
              🤖
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Meus Agentes</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Gerencie seus assistentes de IA e suas personalidades especializadas em Saúde, Nutrição e Finanças.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar agentes..." 
              className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 w-48 sm:w-64"
            />
            <span className="absolute left-3 top-3 text-slate-500 text-xs">🔍</span>
          </div>

          <button 
            onClick={handleOpenCreateModal}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition shadow-lg shadow-sky-500/20 text-xs flex items-center space-x-2 flex-shrink-0"
          >
            <span>+</span>
            <span>Criar Agente</span>
          </button>
        </div>
      </div>

      {/* Grid of Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredAgents.map((agent) => (
          <div 
            key={agent.id} 
            className={`bg-slate-900/90 border ${agent.isPrimary ? 'border-amber-500/50 shadow-amber-500/10' : 'border-slate-800'} rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition relative group`}
          >
            <div className="space-y-3">
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-sky-400 text-lg">
                    {agent.department === 'Saúde' ? '🩺' : agent.department === 'Financeiro' ? '💰' : agent.department === 'Nutrição' ? '🥗' : '🌟'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white group-hover:text-sky-400 transition">{agent.name}</h3>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">{agent.department}</span>
                  </div>
                </div>

                {/* Edit & Delete Action Icons */}
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleOpenEditModal(agent)}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition text-xs"
                    title="Editar Agente"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDelete(agent.id)}
                    className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition text-xs"
                    title="Excluir Agente"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* System Prompt Snippet */}
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                  {agent.systemPrompt}
                </p>
              </div>

              {/* Model & Usage Stats */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span className="font-mono text-[11px] text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/20">
                  &gt;_ {agent.modelName}
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  🔄 {agent.acountCount} acionamentos
                </span>
              </div>
            </div>

            {/* Action Badges Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {agent.isPrimary ? (
                <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold flex items-center gap-1.5">
                  ⭐ PRINCIPAL
                </span>
              ) : (
                <button 
                  onClick={() => handleSetPrimary(agent.id)}
                  className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-full text-xs font-semibold transition"
                >
                  ⭐ DEFINIR PRINCIPAL
                </button>
              )}

              <button 
                onClick={() => handleToggleActive(agent.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition flex items-center gap-1.5 ${
                  agent.isActive 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${agent.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                {agent.isActive ? 'ATIVO' : 'INATIVO'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">
                {editingAgent ? 'Editar Agente Especializado' : 'Criar Novo Agente Especializado'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveAgent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nome do Agente</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Dr. Lucas — Longevidade"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Área / Módulo</label>
                  <select 
                    value={department}
                    onChange={(e: any) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                  >
                    <option value="Saúde">Saúde Física & Sono</option>
                    <option value="Financeiro">Estrategista Financeiro</option>
                    <option value="Nutrição">Nutrição & Macros</option>
                    <option value="Orquestrador">Orquestrador Geral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Prompt de Instruções (System Prompt)</label>
                <textarea 
                  rows={5}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Seu nome é Lucas. Você é o especialista em..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs leading-relaxed" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Modelo de IA</label>
                  <select 
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Rápido e Barato)</option>
                    <option value="gpt-4o">gpt-4o (Flagship Multimodal)</option>
                    <option value="claude-3-5-sonnet">claude-3-5-sonnet (Alta precisão)</option>
                    <option value="gemini-2-flash">gemini-2-flash (Ultra Rápido)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Temperatura ({temperature})</label>
                  <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer mt-2" 
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-sky-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-sky-400 transition"
              >
                {editingAgent ? 'Salvar Alterações' : 'Criar Agente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
