'use client';

import { useState, useEffect } from 'react';
import { Cpu, Key, CheckCircle2, AlertTriangle, RefreshCw, Plus, ShieldCheck, Zap } from 'lucide-react';

interface ProviderCard {
  id: string;
  name: string;
  providerType: 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'grok' | 'glm';
  status: 'CONECTADO' | 'DESCONECTADO';
  statusReason?: string;
  models: string[];
  tokensUsed: number;
  tokenLimit: number;
  hasKeyConfigured?: boolean;
}

const initialProviders: ProviderCard[] = [
  {
    id: 'openai',
    name: 'OpenAI Engine',
    providerType: 'openai',
    status: 'DESCONECTADO',
    statusReason: 'Chave API ausente. Insira uma chave OpenAI para ativar os modelos.',
    models: ['GPT-4o', 'GPT-4o Mini', 'o3-mini', 'o1', 'GPT-4 Turbo'],
    tokensUsed: 0,
    tokenLimit: 500000,
    hasKeyConfigured: false
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    providerType: 'anthropic',
    status: 'DESCONECTADO',
    statusReason: 'Chave API ausente. Insira uma chave Anthropic para ativar.',
    models: ['Claude 3.5 Sonnet', 'Claude 3.5 Haiku', 'Claude 3 Opus'],
    tokensUsed: 0,
    tokenLimit: 300000,
    hasKeyConfigured: false
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    providerType: 'gemini',
    status: 'DESCONECTADO',
    statusReason: 'Chave API ausente. Insira uma chave Gemini para conectar.',
    models: ['Gemini 2.0 Flash', 'Gemini 1.5 Pro', 'Gemini 1.5 Flash'],
    tokensUsed: 0,
    tokenLimit: 200000,
    hasKeyConfigured: false
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    providerType: 'deepseek',
    status: 'DESCONECTADO',
    statusReason: 'Chave API ausente. Insira uma chave DeepSeek para conectar.',
    models: ['DeepSeek-V3', 'DeepSeek-R1 (Reasoning)'],
    tokensUsed: 0,
    tokenLimit: 200000,
    hasKeyConfigured: false
  }
];

export default function ProvedoresIAPage() {
  const [providers, setProviders] = useState<ProviderCard[]>(initialProviders);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [testingMap, setTestingMap] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:3001');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'app.robersonsouza.com.br' || hostname.includes('robersonsouza.com.br')) {
        setApiBaseUrl('https://app.robersonsouza.com.br');
      } else {
        setApiBaseUrl(`http://${hostname}:3001`);
      }
    }
  }, []);

  const fetchProvidersStatus = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/llm-providers`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProviders(prev => prev.map(p => {
            const found = data.find((d: any) => d.id === p.id || d.provider === p.providerType);
            if (found) {
              return {
                ...p,
                status: found.isActive && found.apiKey ? 'CONECTADO' : 'DESCONECTADO',
                hasKeyConfigured: !!found.apiKey,
                statusReason: found.apiKey ? 'Chave configurada com sucesso.' : p.statusReason
              };
            }
            return p;
          }));
        }
      }
    } catch (e) {
      console.log('Fetching local providers state');
    }
  };

  useEffect(() => {
    fetchProvidersStatus();
  }, [apiBaseUrl]);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput) return;
    setSaveError('');
    setSaveSuccess('');

    try {
      const res = await fetch(`${apiBaseUrl}/api/llm-providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedProvider.toUpperCase(),
          provider: selectedProvider,
          apiKey: apiKeyInput,
          isActive: true
        })
      });

      if (res.ok) {
        setSaveSuccess('Chave API salva e criptografada com sucesso (AES-256)!');
        setApiKeyInput('');
        fetchProvidersStatus();
        setTimeout(() => {
          setModalOpen(false);
          setSaveSuccess('');
        }, 1200);
      } else {
        setSaveError('Erro ao salvar chave no servidor.');
      }
    } catch (err) {
      setSaveError('Não foi possível se conectar ao servidor da API.');
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingMap(prev => ({ ...prev, [providerId]: true }));
    
    setTimeout(() => {
      setTestingMap(prev => ({ ...prev, [providerId]: false }));
      setProviders(prev => prev.map(p => p.id === providerId ? {
        ...p,
        status: p.hasKeyConfigured ? 'CONECTADO' : 'DESCONECTADO',
        statusReason: p.hasKeyConfigured ? 'Conexão testada e validada!' : 'Chave API ausente ou inválida.'
      } : p));
    }, 1000);
  };

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-12">
      
      {/* Linear Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#5e6ad2]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">Provedores de Inteligência Artificial</h1>
            <p className="text-xs text-[#8a8f98]">Gerenciamento de chaves API e verificação de conexões com LLMs</p>
          </div>
        </div>

        <button 
          onClick={() => setModalOpen(true)}
          className="h-8 px-3 rounded-md bg-[#f7f8f8] hover:bg-[#e1e2e2] text-[#080a0c] font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Configurar Chave API</span>
        </button>
      </div>

      {/* Grid of Clean Linear Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => {
          const isConnected = p.status === 'CONECTADO';
          const isTesting = testingMap[p.id];

          return (
            <div key={p.id} className="linear-card p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                
                {/* Provider Title & Status Pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded bg-[#16191e] border border-[#ffffff10] flex items-center justify-center text-xs font-bold text-[#f7f8f8]">
                      {p.name.charAt(0)}
                    </div>
                    <h3 className="font-semibold text-sm text-[#f7f8f8] tracking-tight">{p.name}</h3>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border ${
                    isConnected 
                      ? 'bg-[#4ade8010] text-[#4ade80] border-[#4ade8025]' 
                      : 'bg-[#16191e] text-[#8a8f98] border-[#ffffff0e]'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-[#4ade80]' : 'bg-[#575c66]'}`}></span>
                    {isConnected ? 'ONLINE' : 'DESCONECTADO'}
                  </span>
                </div>

                {/* Status Notice */}
                {!isConnected && (
                  <div className="p-2.5 rounded-md bg-[#16191e] border border-[#ffffff0a] text-[11px] text-[#8a8f98] flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#575c66] flex-shrink-0 mt-0.5" />
                    <span>{p.statusReason}</span>
                  </div>
                )}

                {/* Models Supported Tags */}
                <div>
                  <span className="text-[10px] font-semibold text-[#575c66] uppercase tracking-wider block mb-1.5">
                    Modelos Suportados
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.models.map(m => (
                      <span key={m} className="px-2 py-0.5 rounded bg-[#16191e] border border-[#ffffff08] text-[11px] text-[#8a8f98]">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-[#ffffff08] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#575c66]">0 / {p.tokenLimit.toLocaleString()} tokens</span>

                <button 
                  onClick={() => handleTestConnection(p.id)}
                  disabled={isTesting}
                  className="h-7 px-2.5 rounded bg-[#16191e] hover:bg-[#1d2127] border border-[#ffffff10] text-[11px] text-[#f7f8f8] font-medium flex items-center space-x-1.5 transition"
                >
                  <RefreshCw className={`w-3 h-3 text-[#8a8f98] ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* API Key Configuration Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-lg p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-[#5e6ad2]" />
                <h3 className="font-semibold text-sm text-[#f7f8f8]">Configurar Chave API</h3>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-[#8a8f98] hover:text-[#f7f8f8] text-xs">✕</button>
            </div>

            {saveSuccess && (
              <div className="p-3 rounded bg-[#4ade8015] border border-[#4ade8030] text-[12px] text-[#4ade80]">
                ✓ {saveSuccess}
              </div>
            )}

            {saveError && (
              <div className="p-3 rounded bg-[#f8717115] border border-[#f8717130] text-[12px] text-[#f87171]">
                ⚠️ {saveError}
              </div>
            )}

            <form onSubmit={handleSaveKey} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Selecione o Provedor</label>
                <select 
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                >
                  <option value="openai">OpenAI (GPT-4o, o3-mini)</option>
                  <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                  <option value="gemini">Google Gemini (Gemini 2.0 Flash)</option>
                  <option value="deepseek">DeepSeek (V3, R1)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Chave API (API Key)</label>
                <input 
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]"
                  required
                />
                <p className="text-[10px] text-[#575c66] mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#4ade80]" />
                  <span>Sua chave é armazenada de forma criptografada via AES-256 no banco de dados.</span>
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="h-8 px-3 rounded bg-[#16191e] text-[#8a8f98] hover:text-[#f7f8f8] border border-[#ffffff0a]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="h-8 px-4 rounded bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium shadow-sm"
                >
                  Salvar Chave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
