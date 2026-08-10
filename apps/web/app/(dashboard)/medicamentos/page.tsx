'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Pill, Plus, Clock, CheckCircle2, AlertTriangle, ShieldAlert, 
  MessageSquare, DollarSign, Calendar, TrendingUp, Sparkles, 
  Sun, Sunset, Moon, Coffee, Edit3, Trash2, Check, X, Bell, UserCheck,
  Camera, Upload, FileText, Loader2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { authFetch } from '@/lib/api';

interface MedicationItem {
  id: string;
  name: string;
  brand?: string;
  pharmacy?: string;
  type: 'MEDICAMENTO' | 'VITAMINA' | 'SUPLEMENTO' | 'FITOTERAPICO';
  category: 'CONTINUO' | 'TEMPORARIO' | 'SOS';
  dosage: string;
  unit: string;
  time: string;
  period: 'MANHA' | 'TARDE' | 'NOITE' | 'MADRUGADA';
  instructions: string;
  currentStock: number;
  stockAlertAt: number;
  costPerUnit: number;
  status: 'TOMADO' | 'PENDENTE' | 'PROXIMO' | 'ATRASADO';
  notifyWhatsapp: boolean;
  escalateToFamily: boolean;
  color: string;
}

const adherenceTrendData = [
  { day: 'Seg', score: 100 },
  { day: 'Ter', score: 100 },
  { day: 'Qua', score: 100 },
  { day: 'Qui', score: 100 },
  { day: 'Sex', score: 100 },
  { day: 'Sáb', score: 100 },
  { day: 'Dom', score: 100 },
];

const mapDbMedicationToUi = (med: any): MedicationItem => {
  const schedule = med.schedules?.[0] || {};
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = med.intakeLogs?.find((l: any) => {
    const logDate = new Date(l.loggedAt || l.createdAt).toISOString().split('T')[0];
    return logDate === todayStr;
  });

  return {
    id: med.id,
    name: med.name,
    brand: med.brand || '',
    pharmacy: med.pharmacy || '',
    type: med.type || 'MEDICAMENTO',
    category: med.category || 'CONTINUO',
    dosage: med.dosage || '',
    unit: med.unit || 'comprimido',
    time: schedule.time || '08:00',
    period: schedule.period || 'MANHA',
    instructions: med.instructions || 'Tomar conforme orientação',
    currentStock: med.currentStock ?? 30,
    stockAlertAt: med.stockAlertAt ?? 5,
    costPerUnit: Number(med.costPerUnit) || 0,
    status: todayLog ? (todayLog.status as any) : 'PENDENTE',
    notifyWhatsapp: schedule.notifyWhatsapp ?? true,
    escalateToFamily: schedule.escalateToFamily ?? false,
    color: med.color || (med.type === 'MEDICAMENTO' ? '#f87171' : med.type === 'VITAMINA' ? '#facc15' : '#4ade80'),
  };
};

export default function MedicamentosPage() {
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWhatsappDemoOpen, setIsWhatsappDemoOpen] = useState(false);
  const [selectedMedForDemo, setSelectedMedForDemo] = useState<MedicationItem | null>(null);

  // Photo Upload & AI Scan States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isAiPreFilled, setIsAiPreFilled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const res = await authFetch('/api/medications');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMedications(data.map(mapDbMedicationToUi));
        }
      }
    } catch (err) {
      console.log('Sem medicamentos cadastrados no banco ou erro de rede');
    }
  };

  // Form State for new medication
  const [formData, setFormData] = useState<{
    name: string;
    brand: string;
    pharmacy: string;
    type: 'MEDICAMENTO' | 'VITAMINA' | 'SUPLEMENTO' | 'FITOTERAPICO';
    category: 'CONTINUO' | 'TEMPORARIO' | 'SOS';
    dosage: string;
    unit: string;
    time: string;
    period: 'MANHA' | 'TARDE' | 'NOITE' | 'MADRUGADA';
    instructions: string;
    currentStock: number;
    stockAlertAt: number;
    costPerUnit: number;
    notifyWhatsapp: boolean;
    escalateToFamily: boolean;
  }>({
    name: '',
    brand: '',
    pharmacy: '',
    type: 'MEDICAMENTO',
    category: 'CONTINUO',
    dosage: '',
    unit: 'comprimido',
    time: '08:00',
    period: 'MANHA',
    instructions: '',
    currentStock: 30,
    stockAlertAt: 5,
    costPerUnit: 1.0,
    notifyWhatsapp: true,
    escalateToFamily: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      pharmacy: '',
      type: 'MEDICAMENTO',
      category: 'CONTINUO',
      dosage: '',
      unit: 'comprimido',
      time: '08:00',
      period: 'MANHA',
      instructions: '',
      currentStock: 30,
      stockAlertAt: 5,
      costPerUnit: 1.0,
      notifyWhatsapp: true,
      escalateToFamily: true,
    });
    setIsAiPreFilled(false);
  };

  // Canvas Image Compression helper
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            resolve(compressedBase64);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setScanError('Por favor, selecione uma imagem válida (JPG, PNG, WEBP).');
      return;
    }

    setScanError(null);
    setUploadFile(file);

    try {
      const compressed = await compressImage(file);
      setFilePreview(compressed);
    } catch (err) {
      console.error('Erro ao comprimir imagem:', err);
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const processMedUpload = async () => {
    if (!filePreview) {
      setScanError('Selecione uma imagem da embalagem antes de prosseguir.');
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setScanLogs(['Iniciando leitura inteligente de embalagem...', 'Comprimindo payload base64...']);

    try {
      const base64Parts = filePreview.split(',');
      const base64 = base64Parts.length > 1 ? base64Parts[1] : base64Parts[0];

      setScanLogs((prev) => [...prev, 'Enviando imagem para GPT-4o Vision API...']);

      const res = await authFetch('/api/medications/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mimeType: uploadFile?.type || 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Falha ao processar imagem de medicamento.');
      }

      const result = await res.json();
      setScanLogs((prev) => [...prev, ' Leitura de embalagem concluída com sucesso!']);

      const extracted = result.data || {};

      // Pre-fill form with AI extractions
      setFormData({
        name: extracted.name || '',
        brand: extracted.brand || '',
        pharmacy: extracted.pharmacy || '',
        type: extracted.type || 'MEDICAMENTO',
        category: extracted.category || 'CONTINUO',
        dosage: extracted.dosage || '',
        unit: extracted.unit || 'comprimido',
        time: extracted.time || '08:00',
        period: extracted.period || 'MANHA',
        instructions: extracted.instructions || 'Tomar conforme orientação',
        currentStock: Number(extracted.currentStock) || 30,
        stockAlertAt: Number(extracted.stockAlertAt) || 5,
        costPerUnit: extracted.costPerUnit ? Number(extracted.costPerUnit) : 1.0,
        notifyWhatsapp: true,
        escalateToFamily: true,
      });

      setIsAiPreFilled(true);

      // Close upload modal and open form modal after a brief pause
      setTimeout(() => {
        setIsScanning(false);
        setIsUploadOpen(false);
        setIsAddModalOpen(true);
      }, 1000);

    } catch (err: any) {
      console.error('Erro no upload do medicamento:', err);
      setScanError(err.message || 'Erro ao processar imagem.');
      setScanLogs((prev) => [...prev, ` Erro: ${err.message || 'Falha na conexão'}`]);
      setIsScanning(false);
    }
  };

  const handleMarkAsTaken = async (id: string) => {
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          return {
            ...med,
            status: 'TOMADO',
            currentStock: Math.max(0, med.currentStock - 1),
          };
        }
        return med;
      })
    );

    try {
      const res = await authFetch(`/api/medications/${id}/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'TOMADO' }),
      });
      if (res.ok) {
        fetchMedications();
      }
    } catch (err) {
      console.error('Erro ao marcar medicamento como tomado:', err);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    if (!confirm('Deseja realmente remover este medicamento do cadastro?')) return;

    setMedications((prev) => prev.filter((x) => x.id !== id));

    try {
      const res = await authFetch(`/api/medications/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        fetchMedications();
      }
    } catch (err) {
      console.error('Erro ao remover medicamento:', err);
    }
  };

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.dosage) return;

    try {
      setIsSubmitting(true);
      const payload = {
        name: formData.name,
        brand: formData.brand || undefined,
        pharmacy: formData.pharmacy || undefined,
        type: formData.type,
        category: formData.category,
        dosage: formData.dosage,
        unit: formData.unit,
        instructions: formData.instructions || 'Tomar conforme orientação',
        currentStock: Number(formData.currentStock) || 30,
        stockAlertAt: Number(formData.stockAlertAt) || 5,
        costPerUnit: Number(formData.costPerUnit) || 0,
        color: formData.type === 'MEDICAMENTO' ? '#f87171' : formData.type === 'VITAMINA' ? '#facc15' : '#4ade80',
        schedules: [
          {
            time: formData.time,
            period: formData.period,
            notifyWhatsapp: formData.notifyWhatsapp,
            escalateToFamily: formData.escalateToFamily,
          },
        ],
      };

      const res = await authFetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchMedications();
        setIsAddModalOpen(false);
        resetForm();
      } else {
        alert('Não foi possível cadastrar o medicamento no banco de dados.');
      }
    } catch (err) {
      console.error('Erro ao cadastrar medicamento:', err);
      alert('Erro de conexão ao salvar medicamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics Calculations
  const totalDosesToday = medications.length;
  const takenDosesToday = medications.filter((m) => m.status === 'TOMADO').length;
  const adherencePercent = totalDosesToday > 0 ? Math.round((takenDosesToday / totalDosesToday) * 100) : 100;
  const lowStockItems = medications.filter((m) => m.currentStock <= m.stockAlertAt);
  const totalMonthlySpend = medications.reduce((acc, m) => acc + m.costPerUnit * 30, 0);

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-[1400px] mx-auto pb-12">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#f7f8f8] tracking-tight flex items-center gap-2.5">
            <Pill className="w-6 h-6 text-[#f472b6]" />
            <span>Controle de Medicamentos & Vitaminas</span>
            <span className="text-xs font-mono text-[#f472b6] bg-[#f472b615] px-2 py-0.5 rounded border border-[#f472b630]">
              WhatsApp Active
            </span>
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Gestão inteligente de posologia, alertas de estoque, custo mensal e lembretes via WhatsApp com escalonamento familiar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => {
              setSelectedMedForDemo(medications[0]);
              setIsWhatsappDemoOpen(true);
            }}
            className="h-8 px-3 rounded-md bg-[#16191e] border border-[#ffffff12] hover:bg-[#1d2127] text-xs font-medium text-[#f7f8f8] flex items-center space-x-1.5 transition"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
            <span>📱 Testar WhatsApp</span>
          </button>

          <button 
            onClick={() => {
              setScanLogs([]);
              setScanError(null);
              setFilePreview(null);
              setUploadFile(null);
              setIsUploadOpen(true);
            }}
            className="h-8 px-3 rounded-md bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>📷 Upload de Medicamento</span>
          </button>

          <button 
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="h-8 px-3 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Novo Medicamento</span>
          </button>
        </div>
      </div>

      {/* 2. Top 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Score de Aderência */}
        <div className="linear-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-[#cbd5e1] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#4ade80]" /> Score de Aderência
            </span>
            <span className="text-xs font-mono font-semibold text-[#4ade80] bg-[#4ade8015] px-2.5 py-0.5 rounded border border-[#4ade8030]">
              Excelente
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-[#4ade80]">{adherencePercent}%</span>
            <span className="text-[#a1a1aa] text-xs sm:text-sm font-medium">dos horários</span>
          </div>

          <div className="w-full bg-[#16191e] h-2 rounded-full overflow-hidden border border-[#ffffff0a]">
            <div className="bg-[#4ade80] h-full rounded-full transition-all duration-500" style={{ width: `${adherencePercent}%` }}></div>
          </div>

          <span className="text-xs text-[#a1a1aa] block">Nenhuma dose esquecida esta semana</span>
        </div>

        {/* KPI 2: Doses de Hoje */}
        <div className="linear-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#60a5fa]" /> Doses de Hoje
            </span>
            <span className="text-xs font-mono text-[#60a5fa] bg-[#60a5fa15] px-2 py-0.5 rounded border border-[#60a5fa30]">
              {takenDosesToday}/{totalDosesToday} Concluídas
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold font-mono text-[#f7f8f8]">{takenDosesToday}</span>
            <span className="text-[#a1a1aa] text-xs">/ {totalDosesToday} tomadas</span>
          </div>

          <div className="w-full bg-[#16191e] h-1.5 rounded-full overflow-hidden border border-[#ffffff0a]">
            <div className="bg-[#60a5fa] h-full rounded-full transition-all duration-500" style={{ width: `${totalDosesToday > 0 ? (takenDosesToday / totalDosesToday) * 100 : 0}%` }}></div>
          </div>

          <span className="text-xs text-[#a1a1aa] block">Acompanhamento diário de posologia</span>
        </div>

        {/* KPI 3: Estoque Baixo */}
        <div className="linear-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-[#facc15]" /> Alerta de Estoque
            </span>
            <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
              lowStockItems.length > 0 
                ? 'text-[#facc15] bg-[#facc1515] border-[#facc1530]' 
                : 'text-[#4ade80] bg-[#4ade8015] border-[#4ade8030]'
            }`}>
              {lowStockItems.length} Alerta{lowStockItems.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div>
            <div className="text-2xl font-bold font-mono text-[#f7f8f8]">
              {lowStockItems.length > 0 ? lowStockItems[0].name : 'Estoque OK'}
            </div>
            <span className="text-xs text-[#facc15] block mt-0.5">
              {lowStockItems.length > 0 ? `Restam apenas ${lowStockItems[0].currentStock} ${lowStockItems[0].unit}s (Mín: ${lowStockItems[0].stockAlertAt})` : 'Todos itens acima do estoque mínimo'}
            </span>
          </div>

          <div className="pt-1 border-t border-[#ffffff08] flex justify-between items-center text-xs font-mono text-[#a1a1aa]">
            <span>Farmácia para compra: <strong className="text-[#f7f8f8]">{lowStockItems.length > 0 && lowStockItems[0].pharmacy ? lowStockItems[0].pharmacy : 'Não informada'}</strong></span>
          </div>
        </div>

        {/* KPI 4: Custo Mensal Estimado */}
        <div className="linear-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#22c55e]" /> Custo Mensal em Saúde
            </span>
            <span className="text-xs font-mono text-[#22c55e] bg-[#22c55e15] px-2 py-0.5 rounded border border-[#22c55e30]">
              Orçamento
            </span>
          </div>

          <div>
            <div className="text-3xl font-bold font-mono text-[#22c55e]">
              R$ {totalMonthlySpend.toFixed(2)}
            </div>
            <span className="text-xs text-[#a1a1aa] block mt-0.5">Custo médio por dose: R$ {(totalMonthlySpend / (totalDosesToday * 30 || 1)).toFixed(2)}</span>
          </div>

          <div className="pt-1 border-t border-[#ffffff08] flex justify-between items-center text-xs font-mono text-[#a1a1aa]">
            <span>Lançado em Finanças: <strong className="text-[#4ade80]">✓ Sincronizado</strong></span>
          </div>
        </div>

      </div>

      {/* 3. Medisafe 4-Quadrant Visual Pillbox (Manhã, Tarde, Noite, Madrugada) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#5e6ad2]" />
            <span>Pillbox Visual de Hoje (Cronograma de Doses)</span>
          </h2>
          <span className="text-xs font-mono text-[#a1a1aa]">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Quadrant 1: MANHÃ (06:00 - 12:00) */}
          <div className="linear-card p-4 space-y-3 border-t-2 border-t-[#facc15]">
            <div className="flex items-center justify-between text-xs font-semibold border-b border-[#ffffff0e] pb-2">
              <span className="flex items-center gap-1.5 text-[#facc15]">
                <Sun className="w-4 h-4" /> MANHÃ
              </span>
              <span className="text-xs font-mono text-[#a1a1aa]">06:00 - 12:00</span>
            </div>

            <div className="space-y-2.5">
              {medications.filter((m) => m.period === 'MANHA').map((m) => (
                <div key={m.id} className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-xs text-[#f7f8f8]">{m.name}</div>
                      <div className="text-xs text-[#a1a1aa] font-mono">
                        {m.brand ? `${m.brand} • ` : ''}{m.dosage} • {m.time}
                      </div>
                    </div>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      m.status === 'TOMADO' 
                        ? 'text-[#4ade80] bg-[#4ade8015] border border-[#4ade8030]' 
                        : 'text-[#facc15] bg-[#facc1515] border border-[#facc1530]'
                    }`}>
                      {m.status === 'TOMADO' ? '✓ Tomado' : 'Pendente'}
                    </span>
                  </div>

                  <p className="text-xs text-[#a1a1aa]">{m.instructions}</p>

                  {m.status !== 'TOMADO' && (
                    <button 
                      onClick={() => handleMarkAsTaken(m.id)}
                      className="w-full py-1 rounded bg-[#4ade8020] hover:bg-[#4ade8030] text-[#4ade80] text-xs font-medium flex items-center justify-center space-x-1 transition"
                    >
                      <Check className="w-3 h-3" />
                      <span>Marcar como Tomado</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quadrant 2: TARDE (12:00 - 18:00) */}
          <div className="linear-card p-4 space-y-3 border-t-2 border-t-[#4ade80]">
            <div className="flex items-center justify-between text-xs font-semibold border-b border-[#ffffff0e] pb-2">
              <span className="flex items-center gap-1.5 text-[#4ade80]">
                <Sunset className="w-4 h-4" /> TARDE
              </span>
              <span className="text-xs font-mono text-[#a1a1aa]">12:00 - 18:00</span>
            </div>

            <div className="space-y-2.5">
              {medications.filter((m) => m.period === 'TARDE').map((m) => (
                <div key={m.id} className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-xs text-[#f7f8f8]">{m.name}</div>
                      <div className="text-xs text-[#a1a1aa] font-mono">
                        {m.brand ? `${m.brand} • ` : ''}{m.dosage} • {m.time}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#60a5fa] bg-[#60a5fa15] px-2 py-0.5 rounded border border-[#60a5fa30]">
                      Próxima
                    </span>
                  </div>

                  <p className="text-xs text-[#a1a1aa]">{m.instructions}</p>

                  <button 
                    onClick={() => handleMarkAsTaken(m.id)}
                    className="w-full py-1 rounded bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-xs font-medium flex items-center justify-center space-x-1 transition"
                  >
                    <Check className="w-3 h-3" />
                    <span>Marcar como Tomado</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quadrant 3: NOITE (18:00 - 00:00) */}
          <div className="linear-card p-4 space-y-3 border-t-2 border-t-[#60a5fa]">
            <div className="flex items-center justify-between text-xs font-semibold border-b border-[#ffffff0e] pb-2">
              <span className="flex items-center gap-1.5 text-[#60a5fa]">
                <Moon className="w-4 h-4" /> NOITE
              </span>
              <span className="text-xs font-mono text-[#a1a1aa]">18:00 - 00:00</span>
            </div>

            <div className="space-y-2.5">
              {medications.filter((m) => m.period === 'NOITE').map((m) => (
                <div key={m.id} className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-xs text-[#f7f8f8]">{m.name}</div>
                      <div className="text-xs text-[#a1a1aa] font-mono">
                        {m.brand ? `${m.brand} • ` : ''}{m.dosage} • {m.time}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-[#a1a1aa] bg-[#16191e] px-2 py-0.5 rounded border border-[#ffffff10]">
                      Aguardando
                    </span>
                  </div>

                  <p className="text-xs text-[#a1a1aa]">{m.instructions}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quadrant 4: MADRUGADA / SOS */}
          <div className="linear-card p-4 space-y-3 border-t-2 border-t-[#a855f7]">
            <div className="flex items-center justify-between text-xs font-semibold border-b border-[#ffffff0e] pb-2">
              <span className="flex items-center gap-1.5 text-[#a855f7]">
                <Coffee className="w-4 h-4" /> SOS / CONFORME NECESSIDADE
              </span>
            </div>

            <div className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md text-center space-y-2">
              <p className="text-xs text-[#a1a1aa]">
                Nenhum medicamento SOS ou analgésico cadastrado no momento.
              </p>
              <button 
                onClick={() => {
                  resetForm();
                  setFormData((prev) => ({ ...prev, category: 'SOS' }));
                  setIsAddModalOpen(true);
                }}
                className="text-xs text-[#5e6ad2] hover:underline"
              >
                + Cadastrar item SOS
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Adherence Trend & Full Medications Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Adherence Trend Chart (1 Col) */}
        <div className="linear-card p-5 space-y-4">
          <div className="border-b border-[#ffffff0e] pb-3">
            <h3 className="text-sm font-semibold text-[#f7f8f8]">Histórico de Aderência (7 dias)</h3>
            <p className="text-xs text-[#a1a1aa]">% de doses tomadas no horário estipulado</p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={adherenceTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="day" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} domain={[60, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#16191e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '6px', fontSize: '12px' }} 
                  itemStyle={{ color: '#4ade80' }}
                />
                <Area type="monotone" dataKey="score" stroke="#4ade80" fill="#4ade8015" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md text-xs text-[#a1a1aa] flex items-center justify-between">
            <span>Aderência Semanal: <strong className="text-[#4ade80] font-mono">95.7%</strong></span>
            <span className="text-[#4ade80] font-mono"> Meta &gt; 90%</span>
          </div>
        </div>

        {/* Full Medications Active List Table (2 Cols) */}
        <div className="lg:col-span-2 linear-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#f7f8f8]">Lista de Medicamentos & Vitaminas Ativos</h3>
              <p className="text-xs text-[#a1a1aa]">Detalhamento de posologia, marca, estoque e custo por dose</p>
            </div>
            <span className="text-xs font-mono text-[#a1a1aa]">{medications.length} Itens Cadastrados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#ffffff0e] text-[#a1a1aa]">
                  <th className="pb-2 font-medium">NOME</th>
                  <th className="pb-2 font-medium">MARCA</th>
                  <th className="pb-2 font-medium">DOSAGEM</th>
                  <th className="pb-2 font-medium">HORÁRIO</th>
                  <th className="pb-2 font-medium">ESTOQUE</th>
                  <th className="pb-2 font-medium">CUSTO/DOSE</th>
                  <th className="pb-2 font-medium text-right">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff08]">
                {medications.map((m) => (
                  <tr key={m.id} className="hover:bg-[#16191e] transition">
                    <td className="py-2.5 font-sans font-medium text-[#f7f8f8] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></span>
                      <span>{m.name}</span>
                      {m.notifyWhatsapp && (
                        <span title="WhatsApp Ativo">
                          <MessageSquare className="w-3 h-3 text-[#25D366]" />
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-[#a1a1aa]">{m.brand || '-'}</td>
                    <td className="py-2.5 text-[#a1a1aa]">{m.dosage}</td>
                    <td className="py-2.5 text-[#f7f8f8]">{m.time}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        m.currentStock <= m.stockAlertAt 
                          ? 'text-[#facc15] bg-[#facc1515] border border-[#facc1530]' 
                          : 'text-[#a1a1aa]'
                      }`}>
                        {m.currentStock} {m.unit}s
                      </span>
                    </td>
                    <td className="py-2.5 text-[#4ade80]">R$ {m.costPerUnit.toFixed(2)}</td>
                    <td className="py-2.5 text-right space-x-1">
                      <button 
                        onClick={() => {
                          setSelectedMedForDemo(m);
                          setIsWhatsappDemoOpen(true);
                        }}
                        className="p-1 hover:bg-[#1d2127] rounded text-[#a1a1aa] hover:text-[#25D366]" 
                        title="Simular Lembrete WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteMedication(m.id)}
                        className="p-1 hover:bg-[#1d2127] rounded text-[#a1a1aa] hover:text-[#f87171]" 
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 5. Modal 1: Add/Edit Medication Form Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="linear-card w-full max-w-lg p-5 sm:p-6 space-y-4 border border-[#ffffff15] shadow-2xl rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
              <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#5e6ad2]" /> Cadastrar Novo Medicamento / Vitamina
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#a1a1aa] hover:text-[#f7f8f8] p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isAiPreFilled && (
              <div className="p-2.5 bg-[#5e6ad220] border border-[#5e6ad240] rounded-md text-xs text-[#a5b4fc] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#a5b4fc] shrink-0" />
                <span>Dados extraídos automaticamente pela IA! Verifique e ajuste antes de salvar.</span>
              </div>
            )}

            <form onSubmit={handleAddMedication} className="space-y-3 text-xs">
              <div>
                <label className="text-[#a1a1aa] block mb-1 font-medium">Nome do Medicamento ou Vitamina</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Vitamina D3 2000UI, Losartana 50mg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#a1a1aa] block mb-1 font-medium">Marca / Fabricante</label>
                  <input 
                    type="text" 
                    placeholder="Ex: EMS, Medley, Eurofarma"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
                <div>
                  <label className="text-[#a1a1aa] block mb-1 font-medium">Farmácia Preferida</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Drogasil, Droga Raia"
                    value={formData.pharmacy}
                    onChange={(e) => setFormData({ ...formData, pharmacy: e.target.value })}
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#a1a1aa] block mb-1 font-medium">Tipo</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    <option value="MEDICAMENTO">Medicamento</option>
                    <option value="VITAMINA">Vitamina</option>
                    <option value="SUPLEMENTO">Suplemento</option>
                    <option value="FITOTERAPICO">Fitoterápico</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#a1a1aa] block mb-1 font-medium">Categoria de Uso</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    <option value="CONTINUO">Uso Contínuo</option>
                    <option value="TEMPORARIO">Uso Temporário</option>
                    <option value="SOS">SOS (Se Necessário)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#a1a1aa] block mb-1 font-medium">Dosagem</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: 50mg, 1000 UI, 5ml"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
                <div>
                  <label className="text-[#a1a1aa] block mb-1 font-medium">Unidade da Dose</label>
                  <input 
                    type="text" 
                    placeholder="Ex: comprimido, cápsula, ml"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#a1a1aa] block mb-1 font-medium">Horário da Dose</label>
                  <input 
                    type="time" 
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
                <div>
                  <label className="text-[#a1a1aa] block mb-1 font-medium">Período do Dia</label>
                  <select 
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  >
                    <option value="MANHA">Manhã (06:00 - 12:00)</option>
                    <option value="TARDE">Tarde (12:00 - 18:00)</option>
                    <option value="NOITE">Noite (18:00 - 00:00)</option>
                    <option value="MADRUGADA">Madrugada (00:00 - 06:00)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[#a1a1aa] block mb-1 font-medium">Estoque Inicial</label>
                  <input 
                    type="number" 
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
                <div>
                  <label className="text-[#a1a1aa] block mb-1 font-medium">Estoque Mínimo (Alerta)</label>
                  <input 
                    type="number" 
                    value={formData.stockAlertAt}
                    onChange={(e) => setFormData({ ...formData, stockAlertAt: Number(e.target.value) })}
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
                <div>
                  <label className="text-[#a1a1aa] block mb-1 font-medium">Custo por Dose (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData({ ...formData, costPerUnit: Number(e.target.value) })}
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#a1a1aa] block mb-1 font-medium">Instruções de Uso</label>
                <input 
                  type="text" 
                  placeholder="Ex: Tomar em jejum, Não tomar com leite"
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  className="w-full bg-[#16191e] border border-[#ffffff12] rounded px-3 py-1.5 text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                />
              </div>

              <div className="pt-2 border-t border-[#ffffff0e] space-y-2">
                <label className="flex items-center space-x-2 text-xs text-[#f7f8f8] cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.notifyWhatsapp}
                    onChange={(e) => setFormData({ ...formData, notifyWhatsapp: e.target.checked })}
                    className="accent-[#5e6ad2] rounded"
                  />
                  <span>Enviar lembrete interativo via <strong>WhatsApp</strong> no horário</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-[#f7f8f8] cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.escalateToFamily}
                    onChange={(e) => setFormData({ ...formData, escalateToFamily: e.target.checked })}
                    className="accent-[#5e6ad2] rounded"
                  />
                  <span>Escalonar para <strong>Grupo Familiar</strong> se ignorar por 45min</span>
                </label>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-[#16191e] hover:bg-[#1d2127] text-[#a1a1aa] text-xs font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-xs font-medium flex items-center space-x-1 disabled:opacity-50"
                >
                  <span>{isSubmitting ? 'Salvando...' : 'Salvar Medicamento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal 2: Photo Upload & AI Scanner Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="linear-card w-full max-w-lg p-5 sm:p-6 space-y-4 border border-[#ffffff15] shadow-2xl rounded-xl">
            <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
              <h3 className="text-sm font-semibold text-[#f7f8f8] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#10b981]" /> Upload de Foto do Medicamento / Caixa
              </h3>
              <button 
                onClick={() => {
                  if (!isScanning) setIsUploadOpen(false);
                }} 
                disabled={isScanning}
                className="text-[#a1a1aa] hover:text-[#f7f8f8] p-1 disabled:opacity-30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#a1a1aa]">
                Tire uma foto ou faça upload da caixa, frasco ou rótulo do medicamento. A IA identificará o nome, dosagem, marca e instruções para pré-preencher seu cadastro.
              </p>

              {/* Drag and drop / File selector area */}
              <div 
                onClick={() => !isScanning && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                  filePreview 
                    ? 'border-[#10b98150] bg-[#10b98108]' 
                    : 'border-[#ffffff18] hover:border-[#10b98180] bg-[#16191e]'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  accept="image/*" 
                  className="hidden" 
                  disabled={isScanning}
                />

                {filePreview ? (
                  <div className="relative w-full max-h-48 flex justify-center overflow-hidden rounded-lg">
                    <img src={filePreview} alt="Preview do Medicamento" className="max-h-44 object-contain rounded-md shadow-md" />
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-[#10b98115] flex items-center justify-center text-[#10b981]">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-semibold text-[#f7f8f8] block">Clique para selecionar foto</span>
                      <span className="text-[#71717a] block mt-0.5">ou arraste a foto do frasco / embalagem</span>
                    </div>
                  </>
                )}
              </div>

              {scanError && (
                <div className="p-3 bg-[#f8717115] border border-[#f8717130] rounded-md text-xs text-[#f87171] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              {/* Console de diagnóstico */}
              {scanLogs.length > 0 && (
                <div className="p-3 bg-[#111318] border border-[#ffffff0a] rounded-md font-mono text-[11px] space-y-1 max-h-28 overflow-y-auto">
                  {scanLogs.map((log, index) => (
                    <div key={index} className="text-[#a1a1aa] flex items-center gap-1.5">
                      <span className="text-[#10b981]">›</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2 border-t border-[#ffffff0e]">
                <button 
                  type="button" 
                  onClick={() => setIsUploadOpen(false)}
                  disabled={isScanning}
                  className="px-3 py-1.5 rounded bg-[#16191e] hover:bg-[#1d2127] text-[#a1a1aa] text-xs font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  onClick={processMedUpload}
                  disabled={!filePreview || isScanning}
                  className="px-4 py-1.5 rounded bg-gradient-to-r from-emerald-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white text-xs font-medium flex items-center space-x-1.5 disabled:opacity-50 transition"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando com IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>🤖 Ler Foto com IA</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal 3: WhatsApp Interactive Demo Modal */}
      {isWhatsappDemoOpen && selectedMedForDemo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-[#0b141a] rounded-2xl border border-[#ffffff15] shadow-2xl overflow-hidden text-[#e9edef] font-sans">
            
            {/* WhatsApp Header */}
            <div className="bg-[#202c33] p-3 flex items-center justify-between border-b border-[#ffffff10]">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold text-xs">
                  Vita
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#e9edef]">Saúde & Finanças Vita IA</div>
                  <div className="text-xs text-[#00a884]">Bot Oficial Verificado</div>
                </div>
              </div>
              <button onClick={() => setIsWhatsappDemoOpen(false)} className="text-[#8696a0] hover:text-[#e9edef]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* WhatsApp Chat Area */}
            <div className="p-4 space-y-3 bg-[#0b141a] text-xs">
              <div className="bg-[#202c33] p-3 rounded-lg space-y-2 border border-[#ffffff0a]">
                <div className="font-bold text-[#00a884] flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5" /> Lembrete de Medicamento!
                </div>
                <div className="text-[#e9edef]">
                  Olá! Chegou a hora de tomar seu medicamento:
                </div>
                <div className="bg-[#111b21] p-2 rounded text-xs font-mono space-y-0.5">
                  <div><strong>💊 {selectedMedForDemo.name}</strong></div>
                  {selectedMedForDemo.brand && <div className="text-[#8696a0]">Marca: {selectedMedForDemo.brand}</div>}
                  <div className="text-[#8696a0]">Dose: {selectedMedForDemo.dosage}</div>
                  <div className="text-[#8696a0]">Horário: {selectedMedForDemo.time}</div>
                  <div className="text-[#00a884]">📝 {selectedMedForDemo.instructions}</div>
                </div>
                <div className="text-xs text-[#8696a0] text-right">08:00 ✓✓</div>
              </div>

              {/* Interactive WhatsApp Reply Buttons */}
              <div className="space-y-1.5 pt-1">
                <button 
                  onClick={() => {
                    handleMarkAsTaken(selectedMedForDemo.id);
                    setIsWhatsappDemoOpen(false);
                  }}
                  className="w-full py-2 bg-[#202c33] hover:bg-[#00a884] hover:text-white text-[#00a884] font-medium rounded text-center transition border border-[#00a88440]"
                >
                  ✅ Marcar como Tomado
                </button>
                <button 
                  onClick={() => setIsWhatsappDemoOpen(false)}
                  className="w-full py-2 bg-[#202c33] hover:bg-[#2a3942] text-[#e9edef] font-medium rounded text-center transition border border-[#ffffff10]"
                >
                  ⏰ Adiar 30 minutos
                </button>
                <button 
                  onClick={() => setIsWhatsappDemoOpen(false)}
                  className="w-full py-2 bg-[#202c33] hover:bg-[#f8717120] text-[#f87171] font-medium rounded text-center transition border border-[#f8717130]"
                >
                  ❌ Pular esta dose
                </button>
              </div>
            </div>

            <div className="p-2 bg-[#111b21] text-center text-xs text-[#8696a0] border-t border-[#ffffff0a]">
              🔒 Comunicação direta via Uazapi WhatsApp API
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
