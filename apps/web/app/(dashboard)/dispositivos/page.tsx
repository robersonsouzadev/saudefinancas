'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Watch, UploadCloud, CheckCircle2, Clock, AlertTriangle, 
  ShieldCheck, ArrowRight, RefreshCw, FileText, Activity, 
  Lock, Info, MapPin, Heart, Flame
} from 'lucide-react';
import { authFetch } from '@/lib/api';

interface ImportItem {
  id: string;
  originalFileName: string;
  fileSizeBytes: number;
  status: 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'DUPLICATE' | 'FAILED' | 'CANCELLED';
  errorCode?: string;
  errorMessage?: string;
  processingDurationMs?: number;
  processedAt?: string;
  createdAt: string;
}

interface ActivityItem {
  id: string;
  sportCategory: string;
  sportNameOriginal?: string;
  startedAt: string;
  localDate: string;
  durationSeconds: number;
  distanceMeters?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  totalCaloriesEstimated?: number;
  laps?: Array<{ id: string; lapIndex: number }>;
  telemetry?: { sampleCount: number; hasLocationData: boolean };
}

export default function DispositivosPage() {
  const [imports, setImports] = useState<ImportItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Consentimentos LGPD
  const [wearableConsent, setWearableConsent] = useState(true);
  const [locationConsent, setLocationConsent] = useState(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);
  const [maxUploadSizeMb, setMaxUploadSizeMb] = useState<number>(15);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
    loadConsents();
    loadConfig();
  }, []);

  // Polling para acompanhar arquivos em processamento
  useEffect(() => {
    if (!activeImportId) return;

    const interval = setInterval(async () => {
      try {
        const res = await authFetch(`/api/integrations/wearables/imports/${activeImportId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'PROCESSED') {
            setUploadStatus('Arquivo processado com sucesso! Treino registrado.');
            setActiveImportId(null);
            loadData();
          } else if (data.status === 'FAILED') {
            setErrorMessage(data.errorMessage || 'Falha durante a decodificação do arquivo FIT.');
            setActiveImportId(null);
            loadData();
          }
        }
      } catch (e) {
        console.error('Erro no polling de importação:', e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeImportId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [importsRes, activitiesRes] = await Promise.all([
        authFetch('/api/integrations/wearables/imports?limit=10'),
        authFetch('/api/integrations/wearables/activities?limit=10'),
      ]);

      if (importsRes.ok) {
        const data = await importsRes.json();
        setImports(data.items || []);
      }
      if (activitiesRes.ok) {
        const data = await activitiesRes.json();
        setActivities(data.items || []);
      }
    } catch (e) {
      console.error('Erro ao carregar dados de wearables:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConsents = async () => {
    try {
      const res = await authFetch('/api/integrations/wearables/consent');
      if (res.ok) {
        const data = await res.json();
        setWearableConsent(data.wearableDataProcessing);
        setLocationConsent(data.locationDataProcessing);
      }
    } catch (e) {
      console.error('Erro ao carregar consentimentos:', e);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await authFetch('/api/integrations/wearables/config');
      if (res.ok) {
        const data = await res.json();
        if (data.maxUploadSizeMb) {
          setMaxUploadSizeMb(data.maxUploadSizeMb);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar configurações de wearables:', e);
    }
  };

  const handleConsentToggle = async (type: 'WEARABLE_DATA_PROCESSING' | 'LOCATION_DATA_PROCESSING', currentVal: boolean) => {
    setIsUpdatingConsent(true);
    const newVal = !currentVal;
    try {
      const res = await authFetch('/api/integrations/wearables/consent', {
        method: 'POST',
        body: JSON.stringify({
          consentType: type,
          granted: newVal,
        }),
      });
      if (res.ok) {
        if (type === 'WEARABLE_DATA_PROCESSING') setWearableConsent(newVal);
        if (type === 'LOCATION_DATA_PROCESSING') setLocationConsent(newVal);
      }
    } catch (e) {
      console.error('Erro ao atualizar consentimento:', e);
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.fit')) {
      setErrorMessage('Por favor, selecione exclusivamente arquivos com extensão .FIT');
      return;
    }

    if (file.size > maxUploadSizeMb * 1024 * 1024) {
      setErrorMessage(`O arquivo excede o limite máximo permitido de ${maxUploadSizeMb} MB.`);
      return;
    }

    setIsUploading(true);
    setUploadStatus('Validando assinatura binária e enviando para storage seguro...');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await authFetch('/api/integrations/wearables/fit/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.status === 202) {
        setUploadStatus('Arquivo aceito (HTTP 202). Processamento isolado em andamento...');
        setActiveImportId(data.importId);
        loadData();
      } else if (res.status === 200 && data.status === 'DUPLICATE') {
        setUploadStatus('Arquivo já havia sido importado anteriormente (Deduplicado por SHA-256).');
        setIsUploading(false);
        loadData();
      } else {
        throw new Error(data.message || 'Erro ao importar arquivo');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha no upload do arquivo FIT');
      setUploadStatus(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#f7f8f8] flex items-center gap-2.5">
          <Watch className="w-7 h-7 text-[#10b981]" />
          Dispositivos & Wearables
        </h1>
        <p className="text-sm text-[#cbd5e1] mt-1">
          Integração oficial com Garmin Connect e importador seguro de telemetria esportiva (.FIT) para Forerunner 970.
        </p>
      </div>

      {/* Grid Principal: Garmin Connect + Importador FIT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CARD 1: Garmin Connect Cloud (Integração Oficial em Preparação) */}
        <div className="bg-[#16191e] border border-[#ffffff12] rounded-xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">⌚</span>
                <h2 className="text-base font-bold text-[#f7f8f8]">Integração Garmin Connect com Vita Saúde</h2>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#f59e0b20] text-[#f59e0b] border border-[#f59e0b40] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Em Homologação Oficial
              </span>
            </div>

            <div className="p-4 rounded-lg bg-[#0f1115] border border-[#ffffff0a] text-xs text-[#cbd5e1] space-y-2 leading-relaxed">
              <p className="font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                Conformidade com o Garmin Connect Developer Program:
              </p>
              <p>
                A conexão em nuvem do Vita Saúde utilizará exclusivamente o protocolo oficial <strong>OAuth 2.0 (PKCE)</strong> e as APIs contratuais autorizadas (Garmin Health API e Activity API).
              </p>
              <p className="text-[#a1a1aa] flex items-center gap-1.5 pt-1">
                <Lock className="w-3.5 h-3.5 text-[#eab308]" />
                <strong>Regra de Segurança:</strong> Esta plataforma jamais solicitará ou armazenará sua senha do Garmin Connect.
              </p>
            </div>

            <div className="text-xs text-[#a1a1aa] space-y-1">
              <p>• Dispositivos suportados: Garmin Forerunner 970, Fenix, Epix, Venu, Edge</p>
              <p>• Status do provedor: <code className="text-[#f59e0b]">PENDING_PROVIDER_APPROVAL</code></p>
            </div>
          </div>

          <div className="pt-6 border-t border-[#ffffff0a] mt-6">
            <button
              disabled={true}
              className="w-full py-2.5 px-4 rounded-lg bg-[#1f242d] text-[#71717a] text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed border border-[#ffffff08]"
              title="Aguardando aprovação de chaves da Garmin"
            >
              <Lock className="w-3.5 h-3.5" />
              Conectar Garmin Connect (Aguardando Aprovação de Chaves)
            </button>
            <p className="text-center text-[11px] text-[#71717a] mt-2">
              Utilize o importador abaixo para carregar seus treinos do Forerunner hoje mesmo.
            </p>
          </div>
        </div>

        {/* CARD 2: Importador de Arquivos FIT */}
        <div className="bg-[#16191e] border border-[#ffffff12] rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-[#3b82f6]" />
                <h2 className="text-base font-bold text-[#f7f8f8]">Importador de Treinos (.FIT)</h2>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#10b98120] text-[#10b981] border border-[#10b98140] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                FIT SDK Oficial Ativo
              </span>
            </div>

            <p className="text-xs text-[#cbd5e1]">
              Arraste os arquivos <code>.FIT</code> exportados do seu Garmin Forerunner 970 ou sincronizados via USB/Garmin Connect Web.
            </p>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
                isUploading 
                  ? 'border-[#3b82f6] bg-[#3b82f610]' 
                  : 'border-[#ffffff18] hover:border-[#3b82f6] bg-[#0f1115] hover:bg-[#1f242d]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".fit"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <UploadCloud className="w-8 h-8 text-[#3b82f6] animate-pulse" />
              <div>
                <p className="text-xs font-semibold text-[#f7f8f8]">Clique para selecionar ou arraste o arquivo .FIT</p>
                <p className="text-[11px] text-[#71717a] mt-0.5">Suporta cabeçalhos de 12 e 14 bytes • Limite máximo de {maxUploadSizeMb} MB</p>
              </div>
            </div>

            {/* Status & Feedback */}
            {uploadStatus && (
              <div className="p-3 rounded-lg bg-[#3b82f615] border border-[#3b82f630] text-xs text-[#93c5fd] flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>{uploadStatus}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-lg bg-[#ef444415] border border-[#ef444430] text-xs text-[#fca5a5] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#ffffff0a] text-[11px] text-[#71717a] flex items-center justify-between">
            <span>Deduplicação por SHA-256</span>
            <span>Parsing assíncrono em worker isolado</span>
          </div>
        </div>

      </div>

      {/* CARD 3: Governança de Privacidade & Consentimento LGPD */}
      <div className="bg-[#16191e] border border-[#ffffff12] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#10b981]" />
          <h2 className="text-sm font-bold text-[#f7f8f8]">Governança, Privacidade & LGPD (Art. 11 e 16)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[#0f1115] border border-[#ffffff0a] rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1 pr-4">
                <p className="font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#3b82f6]" />
                  Processamento de Métricas Fisiológicas
                </p>
                <p className="text-[11px] text-[#a1a1aa]">
                  Frequência cardíaca, zonas de esforço, ritmo, cadência e estimativas de gasto calórico.
                </p>
              </div>
              <input
                type="checkbox"
                checked={wearableConsent}
                disabled={isUpdatingConsent}
                onChange={() => handleConsentToggle('WEARABLE_DATA_PROCESSING', wearableConsent)}
                className="w-4 h-4 accent-[#10b981] rounded cursor-pointer mt-1"
              />
            </div>
            <p className="text-[10px] text-[#71717a]">Necessário para alimentar o histórico de treinos e métricas do Coach Iron.</p>
          </div>

          <div className="p-4 bg-[#0f1115] border border-[#ffffff0a] rounded-lg space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1 pr-4">
                <p className="font-semibold text-[#f7f8f8] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#f59e0b]" />
                  Processamento de Coordenadas de Localização (GPS)
                </p>
                <p className="text-[11px] text-[#a1a1aa]">
                  Latitude e longitude precisas de rotas ao ar livre (Opt-in explícito).
                </p>
              </div>
              <input
                type="checkbox"
                checked={locationConsent}
                disabled={isUpdatingConsent}
                onChange={() => handleConsentToggle('LOCATION_DATA_PROCESSING', locationConsent)}
                className="w-4 h-4 accent-[#10b981] rounded cursor-pointer mt-1"
              />
            </div>
            <p className="text-[10px] text-[#71717a]">
              {locationConsent ? 'GPS ativado: mapas de percurso são salvos.' : 'GPS desativado: coordenadas são descartadas na decodificação.'}
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#0f1115] border border-[#ffffff08] rounded text-[11px] text-[#a1a1aa] flex items-center justify-between">
          <span>🔒 Dados protegidos em trânsito por TLS e em repouso por criptografia autenticada.</span>
          <span>Retenção de telemetria fina: 180 dias</span>
        </div>
      </div>

      {/* CARD 4: Histórico Recente de Treinos Decodificados */}
      <div className="bg-[#16191e] border border-[#ffffff12] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#6366f1]" />
            <h2 className="text-sm font-bold text-[#f7f8f8]">Treinos Importados de Wearables</h2>
          </div>
          <button
            onClick={loadData}
            className="text-xs text-[#a1a1aa] hover:text-[#f7f8f8] flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs text-[#a1a1aa] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#6366f1]" />
            Carregando histórico...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#71717a]">
            Nenhum treino de wearable importado ainda. Arraste seu primeiro arquivo .FIT acima!
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((act) => (
              <div
                key={act.id}
                className="p-3.5 bg-[#0f1115] border border-[#ffffff0a] rounded-lg flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#f7f8f8]">
                      {act.sportNameOriginal || act.sportCategory}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#6366f120] text-[#a5b4fc] border border-[#6366f130]">
                      {act.localDate}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[#a1a1aa] text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#71717a]" />
                      {formatDuration(act.durationSeconds)}
                    </span>
                    {act.distanceMeters && (
                      <span>{(act.distanceMeters / 1000).toFixed(2)} km</span>
                    )}
                    {act.avgHeartRate && (
                      <span className="flex items-center gap-1 text-[#f87171]">
                        <Heart className="w-3 h-3" />
                        {act.avgHeartRate} bpm
                      </span>
                    )}
                    {act.totalCaloriesEstimated && (
                      <span className="flex items-center gap-1 text-[#fbbf24]">
                        <Flame className="w-3 h-3" />
                        {Math.round(act.totalCaloriesEstimated)} kcal
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right text-[11px] text-[#71717a]">
                  {act.laps && act.laps.length > 0 && (
                    <span className="bg-[#16191e] px-2 py-1 rounded border border-[#ffffff08]">
                      {act.laps.length} voltas (laps)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CARD 5: Histórico de Arquivos Físicos (ImportedFile) */}
      <div className="bg-[#16191e] border border-[#ffffff12] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#a1a1aa]" />
          <h2 className="text-sm font-bold text-[#f7f8f8]">Histórico de Arquivos Físicos (.FIT)</h2>
        </div>

        {imports.length === 0 ? (
          <p className="text-xs text-[#71717a] py-2">Nenhum arquivo no histórico.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-[#71717a] border-b border-[#ffffff0a]">
                <tr>
                  <th className="pb-2">Arquivo</th>
                  <th className="pb-2">Tamanho</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Duração</th>
                  <th className="pb-2">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff08] text-[#cbd5e1]">
                {imports.map((imp) => (
                  <tr key={imp.id}>
                    <td className="py-2.5 font-mono text-[#f7f8f8]">{imp.originalFileName}</td>
                    <td className="py-2.5">{formatBytes(imp.fileSizeBytes)}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        imp.status === 'PROCESSED' 
                          ? 'bg-[#10b98120] text-[#10b981]' 
                          : imp.status === 'PROCESSING' 
                            ? 'bg-[#3b82f620] text-[#3b82f6]' 
                            : imp.status === 'DUPLICATE'
                              ? 'bg-[#f59e0b20] text-[#f59e0b]'
                              : imp.status === 'FAILED'
                                ? 'bg-[#ef444420] text-[#ef4444]'
                                : 'bg-[#71717a20] text-[#a1a1aa]'
                      }`}>
                        {imp.status}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-[#71717a]">
                      {imp.processingDurationMs ? `${imp.processingDurationMs}ms` : '—'}
                    </td>
                    <td className="py-2.5 text-[#71717a]">
                      {new Date(imp.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
