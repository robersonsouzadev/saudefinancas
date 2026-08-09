'use client';

import { useState, useEffect } from 'react';
import { Cpu, Key, AlertTriangle, RefreshCw, Plus, ShieldCheck } from 'lucide-react';
import { authFetch } from '@/lib/api';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  Alert,
} from '../../../components/ui';

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
    hasKeyConfigured: false,
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
    hasKeyConfigured: false,
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
    hasKeyConfigured: false,
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
    hasKeyConfigured: false,
  },
];

export default function ProvedoresIAPage() {
  const [providers, setProviders] = useState<ProviderCard[]>(initialProviders);
  const [testingMap, setTestingMap] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const fetchProvidersStatus = async () => {
    try {
      const res = await authFetch('/api/llm-providers');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProviders((prev) =>
            prev.map((p) => {
              const found = data.find((d: any) => d.id === p.id || d.providerType === p.providerType);
              if (found) {
                return {
                  ...p,
                  status: found.status || (found.hasKeyConfigured ? 'CONECTADO' : 'DESCONECTADO'),
                  hasKeyConfigured: found.hasKeyConfigured,
                  statusReason: found.statusReason || p.statusReason,
                };
              }
              return p;
            })
          );
        }
      }
    } catch (e) {
      console.log('Erro ao carregar provedores:', e);
    }
  };

  useEffect(() => {
    fetchProvidersStatus();
  }, []);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput) return;
    setSaveError('');
    setSaveSuccess('');

    try {
      const res = await authFetch('/api/llm-providers/key', {
        method: 'POST',
        body: JSON.stringify({
          provider: selectedProvider,
          key: apiKeyInput,
        }),
      });

      if (res.ok) {
        setSaveSuccess('Chave API salva e criptografada com sucesso (AES-256)!');
        setApiKeyInput('');
        await fetchProvidersStatus();
        setTimeout(() => {
          setModalOpen(false);
          setSaveSuccess('');
        }, 1200);
      } else {
        const errData = await res.json().catch(() => null);
        setSaveError(errData?.message || 'Erro ao salvar chave no servidor.');
      }
    } catch (err: any) {
      setSaveError(err?.message || 'Não foi possível se conectar ao servidor da API.');
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingMap((prev) => ({ ...prev, [providerId]: true }));
    try {
      const res = await authFetch('/api/llm-providers/test', {
        method: 'POST',
        body: JSON.stringify({ provider: providerId }),
      });
      if (res.ok) {
        const data = await res.json();
        setProviders((prev) =>
          prev.map((p) =>
            p.id === providerId
              ? {
                  ...p,
                  status: data.ok ? 'CONECTADO' : 'DESCONECTADO',
                  statusReason:
                    data.reason || (data.ok ? 'Conexão ativada e validada!' : 'Falha na validação da chave API.'),
                }
              : p
          )
        );
      }
    } catch (err) {
      console.error('Erro ao testar conexão:', err);
    } finally {
      setTestingMap((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Design System Page Header */}
      <PageHeader
        icon={<Cpu className="w-5 h-5 text-accent" />}
        title="Provedores de Inteligência Artificial"
        subtitle="Gerenciamento de chaves API e verificação de conexões com LLMs"
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setModalOpen(true)}
          >
            Configurar Chave API
          </Button>
        }
      />

      {/* Grid of Clean Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => {
          const isConnected = p.status === 'CONECTADO';
          const isTesting = testingMap[p.id];

          return (
            <Card key={p.id} padding="standard" className="flex flex-col justify-between">
              <div className="space-y-3">
                {/* Provider Title & Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded bg-surface border border-subtle flex items-center justify-center text-xs font-bold text-primary">
                      {p.name.charAt(0)}
                    </div>
                    <h3 className="font-semibold text-sm text-primary tracking-tight">{p.name}</h3>
                  </div>

                  <Badge variant={isConnected ? 'success' : 'neutral'} dot>
                    {isConnected ? 'ONLINE' : 'DESCONECTADO'}
                  </Badge>
                </div>

                {/* Status Notice */}
                {!isConnected && (
                  <div className="p-2.5 rounded-md bg-surface border border-subtle text-[11px] text-secondary flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-tertiary shrink-0 mt-0.5" />
                    <span>{p.statusReason}</span>
                  </div>
                )}

                {/* Models Supported Tags */}
                <div>
                  <span className="text-[10px] font-semibold text-tertiary uppercase tracking-wider block mb-1.5">
                    Modelos Suportados
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.models.map((m) => (
                      <span
                        key={m}
                        className="px-2 py-0.5 rounded bg-surface border border-subtle text-[11px] text-secondary"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-subtle flex items-center justify-between mt-3">
                <span className="text-[11px] font-mono text-tertiary">0 / {p.tokenLimit.toLocaleString()} tokens</span>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTestConnection(p.id)}
                  disabled={isTesting}
                  isLoading={isTesting}
                  leftIcon={!isTesting ? <RefreshCw className="w-3 h-3 text-secondary" /> : undefined}
                >
                  {isTesting ? 'Testando...' : 'Testar Conexão'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* API Key Configuration Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <Key className="w-4 h-4 text-accent" />
            <span>Configurar Chave API</span>
          </span>
        }

      >
        <form onSubmit={handleSaveKey} className="space-y-4 text-xs">
          {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}
          {saveError && <Alert variant="error">{saveError}</Alert>}

          <Select
            label="SELECIONE O PROVEDOR"
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            options={[
              { value: 'openai', label: 'OpenAI (GPT-4o, o3-mini)' },
              { value: 'anthropic', label: 'Anthropic (Claude 3.5 Sonnet)' },
              { value: 'gemini', label: 'Google Gemini (Gemini 2.0 Flash)' },
              { value: 'deepseek', label: 'DeepSeek (V3, R1)' },
            ]}
          />

          <Input
            label="CHAVE API (API KEY)"
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="sk-proj-..."
            required
            className="font-mono"
            hint="Sua chave é armazenada de forma criptografada via AES-256 no banco de dados."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Salvar Chave
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

