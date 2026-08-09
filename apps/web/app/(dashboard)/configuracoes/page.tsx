'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Ruler, 
  PhoneCall, 
  Check, 
  Save, 
  Plus, 
  Trash2, 
  Activity, 
  Flame, 
  Scale, 
  TrendingDown, 
  TrendingUp, 
  Cpu, 
  Calendar,
  HeartPulse,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '@/lib/api';

export default function ConfiguracoesPage() {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Perfil de Saúde
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [biologicalSex, setBiologicalSex] = useState<'MASCULINO' | 'FEMININO'>('MASCULINO');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [password, setPassword] = useState('');

  // Perfil Calculado (retornado da API)
  const [healthProfile, setHealthProfile] = useState<any>(null);
  const [measurements, setMeasurements] = useState<any[]>([]);

  // WhatsApp Uazapi
  const [uazapiInstance, setUazapiInstance] = useState('sf_personal_instance');
  const [uazapiToken, setUazapiToken] = useState('uaz_token_••••••••');

  // Modal Registrar Medidas
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [measurementDate, setMeasurementDate] = useState(new Date().toISOString().split('T')[0]);
  const [weightKg, setWeightKg] = useState('');
  const [bodyFatPercent, setBodyFatPercent] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [hipCm, setHipCm] = useState('');
  const [chestCm, setChestCm] = useState('');
  const [neckCm, setNeckCm] = useState('');
  const [shoulderCm, setShoulderCm] = useState('');
  const [abdomenCm, setAbdomenCm] = useState('');
  const [rightBicepCm, setRightBicepCm] = useState('');
  const [leftBicepCm, setLeftBicepCm] = useState('');
  const [rightForearmCm, setRightForearmCm] = useState('');
  const [leftForearmCm, setLeftForearmCm] = useState('');
  const [rightThighCm, setRightThighCm] = useState('');
  const [leftThighCm, setLeftThighCm] = useState('');
  const [rightCalfCm, setRightCalfCm] = useState('');
  const [leftCalfCm, setLeftCalfCm] = useState('');
  const [measurementNotes, setMeasurementNotes] = useState('');

  // Carregar dados reais do usuário
  useEffect(() => {
    loadProfileAndMeasurements();
  }, []);

  const parseJsonResponse = async (res: Response) => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return res.json();
    }
    const text = await res.text();
    throw new Error(text || `Erro HTTP ${res.status}`);
  };

  const loadProfileAndMeasurements = async () => {
    try {
      setLoading(true);
      const [profileRes, measurementsRes] = await Promise.all([
        authFetch('/api/users/me/profile'),
        authFetch('/api/users/me/measurements'),
      ]);

      if (profileRes.ok) {
        const data = await parseJsonResponse(profileRes);
        setHealthProfile(data);
        if (data.user) {
          setName(data.user.name || '');
          setEmail(data.user.email || '');
          setWhatsappPhone(data.user.whatsappPhone || data.user.phone || '');
          setBiologicalSex(data.user.biologicalSex || 'MASCULINO');
          setHeightCm(data.user.heightCm || '');
          if (data.user.birthDate) {
            setBirthDate(new Date(data.user.birthDate).toISOString().split('T')[0]);
          }
        }
      }

      if (measurementsRes.ok) {
        const list = await parseJsonResponse(measurementsRes);
        setMeasurements(list);
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  // Salvar perfil do usuário
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await authFetch('/api/users/me/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name,
          whatsappPhone,
          birthDate: birthDate || null,
          biologicalSex,
          heightCm: heightCm ? Number(heightCm) : null,
          password: password || undefined,
        }),
      });

      if (!res.ok) {
        const data = await parseJsonResponse(res);
        throw new Error(data.message || 'Erro ao salvar perfil');
      }

      setSaved(true);
      setPassword('');
      await loadProfileAndMeasurements();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar perfil');
    }
  };

  // Salvar nova medição corporal
  const handleSaveMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/users/me/measurements', {
        method: 'POST',
        body: JSON.stringify({
          measuredAt: measurementDate,
          weightKg,
          bodyFatPercent,
          waistCm,
          hipCm,
          chestCm,
          neckCm,
          shoulderCm,
          abdomenCm,
          rightBicepCm,
          leftBicepCm,
          rightForearmCm,
          leftForearmCm,
          rightThighCm,
          leftThighCm,
          rightCalfCm,
          leftCalfCm,
          notes: measurementNotes,
        }),
      });

      if (!res.ok) {
        const data = await parseJsonResponse(res);
        throw new Error(data.message || 'Erro ao salvar medição');
      }

      setShowMeasurementModal(false);
      resetMeasurementForm();
      await loadProfileAndMeasurements();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar medição');
    }
  };

  // Excluir medição
  const handleDeleteMeasurement = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta medição corporal?')) return;
    try {
      const res = await authFetch(`/api/users/me/measurements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadProfileAndMeasurements();
      }
    } catch (err: any) {
      alert('Erro ao excluir medição');
    }
  };

  const resetMeasurementForm = () => {
    setWeightKg('');
    setBodyFatPercent('');
    setWaistCm('');
    setHipCm('');
    setChestCm('');
    setNeckCm('');
    setShoulderCm('');
    setAbdomenCm('');
    setRightBicepCm('');
    setLeftBicepCm('');
    setRightForearmCm('');
    setLeftForearmCm('');
    setRightThighCm('');
    setLeftThighCm('');
    setRightCalfCm('');
    setLeftCalfCm('');
    setMeasurementNotes('');
  };

  const latest = healthProfile?.latestMeasurement;
  const bmi = healthProfile?.bmi;
  const bmr = healthProfile?.bmr;
  const waistToHip = healthProfile?.waistToHip;
  const deltas = healthProfile?.deltas;
  const age = healthProfile?.age;

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-[1400px] mx-auto pb-16">
      
      {/* Header Estilo Linear */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#5e6ad2]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#f7f8f8] tracking-tight">Configurações & Perfil de Saúde</h1>
            <p className="text-sm text-[#8a8f98] mt-0.5">Dados pessoais, medições corporais, cálculo metabólico e integrações</p>
          </div>
        </div>

        {saved && (
          <span className="px-3.5 py-1.5 bg-[#4ade8015] text-[#4ade80] border border-[#4ade8030] rounded-lg text-xs font-medium flex items-center gap-1.5 animate-pulse">
            <Check className="w-4 h-4" /> Alterações salvas com sucesso!
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Atalho para Provedores de IA */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#5e6ad215] to-[#080a0c] border border-[#5e6ad230] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#5e6ad220] border border-[#5e6ad240] flex items-center justify-center text-[#5e6ad2]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#f7f8f8]">Provedores de Inteligência Artificial</h4>
            <p className="text-[11px] text-[#8a8f98]">Gerencie suas chaves API do OpenAI, Anthropic, Gemini e DeepSeek na tela dedicada.</p>
          </div>
        </div>
        <Link 
          href="/provedores-ia" 
          className="h-8 px-3.5 rounded-lg bg-[#16191e] hover:bg-[#1f232b] border border-[#ffffff14] text-xs font-medium text-[#f7f8f8] flex items-center justify-center space-x-1.5 transition self-start sm:self-center shrink-0"
        >
          <span>Acessar Provedores IA</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* SEÇÃO 1: PERFIL DO USUÁRIO */}
      <form onSubmit={handleSaveProfile} className="linear-card p-6 space-y-5">
        <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-4">
          <div>
            <h2 className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
              <User className="w-4 h-4 text-[#5e6ad2]" /> Meu Perfil & Dados Biológicos
            </h2>
            <p className="text-[11px] text-[#8a8f98] mt-0.5">Informações essenciais para cálculo automático de TMB, IMC e evolução corporal.</p>
          </div>
          {age !== null && age !== undefined && (
            <span className="text-xs font-mono text-[#5e6ad2] bg-[#5e6ad215] px-2.5 py-1 rounded-md border border-[#5e6ad230]">
              🎂 {age} anos de idade
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Nome Completo</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">E-mail de Acesso</label>
            <input 
              type="email" 
              value={email}
              disabled
              className="w-full h-9 px-3 rounded-lg bg-[#16191e]/50 border border-[#ffffff08] text-[#8a8f98] cursor-not-allowed font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">📅 Data de Nascimento</label>
            <input 
              type="date" 
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">🧬 Sexo Biológico</label>
            <select 
              value={biologicalSex}
              onChange={(e: any) => setBiologicalSex(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            >
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">📏 Altura (em cm)</label>
            <input 
              type="number" 
              placeholder="ex: 178"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : '')}
              className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">📱 WhatsApp (Notificações)</label>
            <input 
              type="text" 
              placeholder="5567999887766"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">🔑 Alterar Senha (opcional)</label>
            <input 
              type="password" 
              placeholder="Deixe em branco para manter a senha atual"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button 
            type="submit"
            className="h-9 px-5 rounded-lg bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Perfil</span>
          </button>
        </div>
      </form>

      {/* SEÇÃO 2: RESUMO E MEDIDAS CORPORAIS */}
      <div className="linear-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ffffff0e] pb-4">
          <div>
            <h2 className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
              <Ruler className="w-4 h-4 text-[#4ade80]" /> Composição & Medidas Corporais
            </h2>
            <p className="text-[11px] text-[#8a8f98] mt-0.5">Acompanhamento temporal do quadro muscular, gordura corporal e circunferências.</p>
          </div>
          <button
            onClick={() => setShowMeasurementModal(true)}
            className="h-9 px-4 rounded-lg bg-[#4ade80]/10 hover:bg-[#4ade80]/20 border border-[#4ade80]/30 text-[#4ade80] font-medium text-xs flex items-center space-x-1.5 transition self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Medidas Corporais</span>
          </button>
        </div>

        {/* CARDS DE CÁLCULO INTELIGENTE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Peso */}
          <div className="bg-[#16191e] border border-[#ffffff0d] rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-[#8a8f98]">
              <span className="text-[11px] font-semibold uppercase">Peso & Gordura</span>
              <Scale className="w-4 h-4 text-[#38bdf8]" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold text-[#f7f8f8]">
                {latest?.weightKg ? `${latest.weightKg} kg` : '--'}
              </span>
              {latest?.bodyFatPercent && (
                <span className="text-xs text-[#8a8f98]">({latest.bodyFatPercent}% BF)</span>
              )}
            </div>
            {deltas?.weightKg !== undefined && deltas.weightKg !== null && (
              <div className="flex items-center space-x-1 text-[11px]">
                {deltas.weightKg < 0 ? (
                  <span className="text-[#4ade80] flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" /> {deltas.weightKg} kg vs anterior
                  </span>
                ) : deltas.weightKg > 0 ? (
                  <span className="text-[#fb923c] flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +{deltas.weightKg} kg vs anterior
                  </span>
                ) : (
                  <span className="text-[#8a8f98]">Sem alteração de peso</span>
                )}
              </div>
            )}
          </div>

          {/* Card IMC */}
          <div className="bg-[#16191e] border border-[#ffffff0d] rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-[#8a8f98]">
              <span className="text-[11px] font-semibold uppercase">Índice IMC (OMS)</span>
              <Activity className="w-4 h-4 text-[#5e6ad2]" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold text-[#f7f8f8]">
                {bmi?.bmi || '--'}
              </span>
            </div>
            {bmi?.classification && (
              <span 
                className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold border"
                style={{ 
                  color: bmi.statusColor, 
                  backgroundColor: `${bmi.statusColor}15`,
                  borderColor: `${bmi.statusColor}30`
                }}
              >
                {bmi.classification}
              </span>
            )}
          </div>

          {/* Card TMB */}
          <div className="bg-[#16191e] border border-[#ffffff0d] rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-[#8a8f98]">
              <span className="text-[11px] font-semibold uppercase">Taxa Metabólica (TMB)</span>
              <Flame className="w-4 h-4 text-[#fb923c]" />
            </div>
            <div className="flex items-baseline space-x-1">
              <span className="text-xl font-bold text-[#f7f8f8]">
                {bmr ? `${bmr.toLocaleString('pt-BR')} kcal` : '--'}
              </span>
            </div>
            <p className="text-[10px] text-[#8a8f98]">Gasto calórico mínimo em repouso</p>
          </div>

          {/* Card Relação Cintura/Quadril */}
          <div className="bg-[#16191e] border border-[#ffffff0d] rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-[#8a8f98]">
              <span className="text-[11px] font-semibold uppercase">Relação Cintura/Quadril</span>
              <HeartPulse className="w-4 h-4 text-[#f43f5e]" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-bold text-[#f7f8f8]">
                {waistToHip?.ratio || '--'}
              </span>
            </div>
            {waistToHip?.risk && (
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                waistToHip.risk === 'Baixo' 
                  ? 'text-[#4ade80] bg-[#4ade8015] border-[#4ade8030]' 
                  : waistToHip.risk === 'Moderado' 
                    ? 'text-[#facc15] bg-[#facc1515] border-[#facc1530]' 
                    : 'text-[#f87171] bg-[#f8717115] border-[#f8717130]'
              }`}>
                Risco {waistToHip.risk}
              </span>
            )}
          </div>
        </div>

        {/* SEÇÃO HISTÓRICO DE MEDIDAS */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-[#8a8f98] uppercase tracking-wider">Histórico de Medições Registradas</h3>
          
          {measurements.length === 0 ? (
            <div className="p-8 text-center bg-[#16191e]/50 border border-[#ffffff08] rounded-xl text-[#8a8f98] text-xs">
              Nenhuma medição corporal registrada ainda. Clique em <strong>"+ Registrar Medidas Corporais"</strong> para começar.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#ffffff0d] rounded-xl">
              <table className="w-full text-left text-xs text-[#f7f8f8]">
                <thead className="bg-[#16191e] text-[#8a8f98] text-[11px] uppercase font-semibold border-b border-[#ffffff0d]">
                  <tr>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Peso</th>
                    <th className="py-2.5 px-3">Cintura</th>
                    <th className="py-2.5 px-3">Quadril</th>
                    <th className="py-2.5 px-3">Bíceps (Dir/Esq)</th>
                    <th className="py-2.5 px-3">Coxa (Dir/Esq)</th>
                    <th className="py-2.5 px-3">Obs</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff08]">
                  {measurements.map((m) => (
                    <tr key={m.id} className="hover:bg-[#16191e]/50 transition">
                      <td className="py-2.5 px-3 font-mono text-[#5e6ad2]">
                        {new Date(m.measuredAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">
                        {m.weightKg ? `${m.weightKg} kg` : '-'}
                      </td>
                      <td className="py-2.5 px-3">{m.waistCm ? `${m.waistCm} cm` : '-'}</td>
                      <td className="py-2.5 px-3">{m.hipCm ? `${m.hipCm} cm` : '-'}</td>
                      <td className="py-2.5 px-3">
                        {m.rightBicepCm || m.leftBicepCm 
                          ? `${m.rightBicepCm || '-'} / ${m.leftBicepCm || '-'} cm` 
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {m.rightThighCm || m.leftThighCm 
                          ? `${m.rightThighCm || '-'} / ${m.leftThighCm || '-'} cm` 
                          : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-[#8a8f98] max-w-[150px] truncate">{m.notes || '-'}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteMeasurement(m.id)}
                          className="text-[#8a8f98] hover:text-[#f87171] p-1 transition"
                          title="Excluir medição"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO 3: WHATSAPP UAZAPI */}
      <div className="linear-card p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
          <div>
            <h2 className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-[#4ade80]" /> Canal Oficial WhatsApp (UazAPI)
            </h2>
            <p className="text-[11px] text-[#8a8f98] mt-0.5">Instância global para envio de alertas e envio de voz do assistente Vita.</p>
          </div>
          <span className="text-[10px] font-mono text-[#4ade80] bg-[#4ade8015] px-2.5 py-1 rounded border border-[#4ade8030]">
            ● UazAPI Ativo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Nome da Instância UazAPI</label>
            <input 
              type="text" 
              value={uazapiInstance}
              onChange={(e) => setUazapiInstance(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Token de Autenticação</label>
            <input 
              type="password" 
              value={uazapiToken}
              onChange={(e) => setUazapiToken(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>
        </div>
      </div>

      {/* MODAL REGISTRAR MEDIDAS CORPORAIS */}
      {showMeasurementModal && (
        <div className="fixed inset-0 bg-[#080a0c]/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-2xl p-6 w-full max-w-2xl space-y-5 shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
              <h3 className="font-semibold text-sm text-[#f7f8f8] flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#4ade80]" /> Registrar Medidas Corporais
              </h3>
              <button 
                onClick={() => setShowMeasurementModal(false)} 
                className="text-[#8a8f98] hover:text-[#f7f8f8] text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMeasurement} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">📅 Data da Medição</label>
                <input 
                  type="date" 
                  value={measurementDate}
                  onChange={(e) => setMeasurementDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  required
                />
              </div>

              {/* Composição Principal */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#5e6ad2] uppercase tracking-wider">── Composição Principal ──</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Peso (kg)</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 82.5"
                      value={weightKg} onChange={(e) => setWeightKg(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">% Gordura Corporal (BF)</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 18.5"
                      value={bodyFatPercent} onChange={(e) => setBodyFatPercent(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                </div>
              </div>

              {/* Circunferências Tronco */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#38bdf8] uppercase tracking-wider">── Circunferências Tronco (cm) ──</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Cintura</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 88"
                      value={waistCm} onChange={(e) => setWaistCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Quadril</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 101"
                      value={hipCm} onChange={(e) => setHipCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Peito / Tórax</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 104"
                      value={chestCm} onChange={(e) => setChestCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Pescoço</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 39"
                      value={neckCm} onChange={(e) => setNeckCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Ombros</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 118"
                      value={shoulderCm} onChange={(e) => setShoulderCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Abdômen</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 90"
                      value={abdomenCm} onChange={(e) => setAbdomenCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                </div>
              </div>

              {/* Membros Superiores */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#4ade80] uppercase tracking-wider">── Membros Superiores (cm) ──</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Bíceps Direito</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 36.5"
                      value={rightBicepCm} onChange={(e) => setRightBicepCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Bíceps Esquerdo</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 36.0"
                      value={leftBicepCm} onChange={(e) => setLeftBicepCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Antebraço Dir</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 29.5"
                      value={rightForearmCm} onChange={(e) => setRightForearmCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Antebraço Esq</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 29.0"
                      value={leftForearmCm} onChange={(e) => setLeftForearmCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                </div>
              </div>

              {/* Membros Inferiores */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#facc15] uppercase tracking-wider">── Membros Inferiores (cm) ──</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Coxa Direita</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 58.0"
                      value={rightThighCm} onChange={(e) => setRightThighCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Coxa Esquerda</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 57.5"
                      value={leftThighCm} onChange={(e) => setLeftThighCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Panturrilha Dir</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 38.5"
                      value={rightCalfCm} onChange={(e) => setRightCalfCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Panturrilha Esq</label>
                    <input 
                      type="number" step="0.1" placeholder="ex: 38.0"
                      value={leftCalfCm} onChange={(e) => setLeftCalfCm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#8a8f98] uppercase mb-1">Observações (opcional)</label>
                <input 
                  type="text" placeholder="ex: Em jejum, pós-treino"
                  value={measurementNotes} onChange={(e) => setMeasurementNotes(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#ffffff0e]">
                <button 
                  type="button" 
                  onClick={() => setShowMeasurementModal(false)}
                  className="h-9 px-4 rounded-lg bg-[#16191e] hover:bg-[#1f232b] text-[#8a8f98] font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="h-9 px-5 rounded-lg bg-[#4ade80] hover:bg-[#3ec46f] text-black font-semibold shadow-sm"
                >
                  Salvar Medidas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
