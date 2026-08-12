'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Wallet, Plus, Loader2, Edit3, Trash2, Check, Landmark, Receipt, CreditCard as CreditCardIcon,
  Banknote, X, Search, Filter, PieChart, RefreshCw, Calendar, AlertTriangle,
  Mic, MicOff, DollarSign, Building2, Layers, CheckSquare, Sparkles, TrendingUp, TrendingDown, FileText, ArrowRight, ShieldCheck, ChevronRight, Download, Columns, Table as TableIcon
} from 'lucide-react';
import { authFetch } from '@/lib/api';

const PluggyConnect = dynamic(
  () => import('react-pluggy-connect').then((mod) => mod.PluggyConnect),
  { ssr: false }
);

// Interfaces
interface Account {
  id: string;
  name: string;
  bankName?: string;
  accountType?: string;
  balance: number;
  bankColor?: string;
}

interface CreditCardItem {
  id: string;
  name: string;
  creditLimit: number;
  usedLimit?: number;
  availableLimit?: number;
  closingDay: number;
  dueDay: number;
  brand?: string;
  cardColor?: string;
}

interface FinancialTitle {
  id: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  status: 'OPEN' | 'DUE_TODAY' | 'OVERDUE' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  documentNumber?: string;
  description: string;
  notes?: string;
  originalAmount: number;
  paidAmount: number;
  discountAmount?: number;
  interestAmount?: number;
  finalAmount?: number;
  issueDate: string;
  dueDate: string;
  competenceDate: string;
  entityId?: string;
  entityName?: string;
  categoryId?: string;
  costCenterId?: string;
  paymentMethod?: string;
  paymentAccountId?: string;
  barcode?: string;
  category?: { name: string; icon?: string; color?: string };
  costCenter?: { name: string; color?: string };
  entity?: { name: string; type: string };
  paymentAccount?: { name: string };
  payments?: any[];
}

interface FinancialEntity {
  id: string;
  type: 'SUPPLIER' | 'CLIENT';
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  notes?: string;
  _count?: { titles: number };
}

interface CostCenter {
  id: string;
  name: string;
  color?: string;
  isActive: boolean;
  _count?: { titles: number; transactions: number };
}

interface TransactionItem {
  id: string;
  date: string;
  description: string;
  category?: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  amount: number;
  paymentMethod?: string;
  paymentAccountId?: string;
}

interface Budget {
  id: string;
  category: string;
  amount: number;
  spent: number;
  percentage: number;
  isExceeded: boolean;
  remaining: number;
}

export default function FinancasPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'payables' | 'receivables' | 'entities' | 'costCenters' | 'accounts' | 'transactions' | 'reports' | 'calendar'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Dados do Sistema
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardItem[]>([]);
  const [titles, setTitles] = useState<FinancialTitle[]>([]);
  const [entities, setEntities] = useState<FinancialEntity[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [dreData, setDreData] = useState<any>(null);
  const [cashFlowData, setCashFlowData] = useState<any>(null);
  const [healthScore, setHealthScore] = useState<any>(null);

  // New states for task features
  const [dreRegime, setDreRegime] = useState<'COMPETENCE' | 'CASH'>('COMPETENCE');
  const [agingData, setAgingData] = useState<any>(null);
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');
  const [txAccountFilter, setTxAccountFilter] = useState('');
  const [txStartDate, setTxStartDate] = useState('');
  const [txEndDate, setTxEndDate] = useState('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [calendarDayModal, setCalendarDayModal] = useState(false);
  const [calendarData, setCalendarData] = useState<any[]>([]);

  // View Mode for Payables/Receivables
  const [viewMode, setViewMode] = useState<'TABLE' | 'KANBAN'>('TABLE');

  // Filtros
  const [titleSearch, setTitleSearch] = useState('');
  const [titleStatusFilter, setTitleStatusFilter] = useState<string>('ALL');
  const [selectedTitleIds, setSelectedTitleIds] = useState<string[]>([]);

  // Modais State
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [titleModalType, setTitleModalType] = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE');
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedTitleForPay, setSelectedTitleForPay] = useState<FinancialTitle | null>(null);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [showCostCenterModal, setShowCostCenterModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState<FinancialTitle | null>(null);
  const [showPluggyKeysModal, setShowPluggyKeysModal] = useState(false);
  const [pluggyKeysForm, setPluggyKeysForm] = useState({ clientId: '', clientSecret: '' });
  const [savingPluggyKeys, setSavingPluggyKeys] = useState(false);
  const [pluggyConnectToken, setPluggyConnectToken] = useState<string | null>(null);
  const [showPluggyWidget, setShowPluggyWidget] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cnpjStatus, setCnpjStatus] = useState<string | null>(null);
  const [syncingOpenFinance, setSyncingOpenFinance] = useState(false);

  const handleSyncAllOpenFinance = async () => {
    setSyncingOpenFinance(true);
    try {
      const res = await authFetch('/api/finance/open-finance/sync-all', { method: 'POST' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error('Erro ao sincronizar Open Finance:', err);
    } finally {
      setSyncingOpenFinance(false);
    }
  };

  const handleLookupCNPJ = async (cnpjToLookup?: string) => {
    const rawDoc = cnpjToLookup !== undefined ? cnpjToLookup : entityForm.document;
    const cleanDoc = rawDoc.replace(/\D/g, '');
    if (cleanDoc.length !== 14) return;

    setLoadingCnpj(true);
    setCnpjStatus(null);
    try {
      const res = await authFetch(`/api/finance/cnpj/${cleanDoc}`);
      if (res.ok) {
        const data = await res.json();
        setEntityForm(prev => ({
          ...prev,
          name: data.name || prev.name,
          document: data.formattedCnpj || prev.document,
          email: data.email || prev.email,
          phone: data.phone || prev.phone,
          notes: data.address ? `Endereço: ${data.address}` : prev.notes,
        }));
        setCnpjStatus(`✅ ${data.status} (${data.source})`);
      } else {
        const err = await res.json();
        setCnpjStatus(`⚠️ ${err.message || 'CNPJ não encontrado na Receita Federal'}`);
      }
    } catch (err) {
      console.error('Erro ao consultar CNPJ:', err);
      setCnpjStatus('⚠️ Erro ao consultar CNPJ');
    } finally {
      setLoadingCnpj(false);
    }
  };

  // Form States
  const [titleForm, setTitleForm] = useState({
    description: '',
    documentNumber: '',
    originalAmount: '',
    dueDate: new Date().toISOString().split('T')[0],
    competenceDate: new Date().toISOString().split('T')[0], // OBRIGATÓRIO
    entityId: '',
    entityName: '',
    categoryId: '',
    costCenterId: '',
    paymentMethod: 'PIX',
    paymentAccountId: '',
    barcode: '',
    notes: '',
  });

  const [payForm, setPayForm] = useState({
    amount: '',
    paymentAccountId: '',
    paymentMethod: 'PIX',
    paymentDate: new Date().toISOString().split('T')[0],
    discountApplied: '0',
    interestApplied: '0',
    notes: '',
  });

  const [entityForm, setEntityForm] = useState({
    type: 'SUPPLIER' as 'SUPPLIER' | 'CLIENT',
    name: '',
    document: '',
    email: '',
    phone: '',
    notes: '',
  });

  const [costCenterForm, setCostCenterForm] = useState({
    name: '',
    color: '#3b82f6',
  });

  const [accountForm, setAccountForm] = useState({
    name: '',
    bankName: '',
    accountType: 'CHECKING',
    balance: '0',
    bankColor: '#3b82f6',
  });

  const [cardForm, setCardForm] = useState({
    paymentAccountId: '',
    name: '',
    creditLimit: '0',
    closingDay: 1,
    dueDay: 10,
    brand: 'Mastercard',
    cardColor: '#1e293b',
  });

  // Voice AI State
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<any>(null);

  // Fetch Inicial
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      const [accRes, cardsRes, titlesRes, entRes, ccRes, txRes, budRes, dreRes, cfRes, hsRes, agingRes, calRes] = await Promise.all([
        authFetch('/api/finance/accounts'),
        authFetch('/api/finance/credit-cards'),
        authFetch('/api/finance/titles'),
        authFetch('/api/finance/entities'),
        authFetch('/api/finance/cost-centers'),
        authFetch('/api/finance/transactions'),
        authFetch('/api/finance/budgets'),
        authFetch(`/api/finance/reports/dre?regime=${dreRegime}`),
        authFetch('/api/finance/reports/cash-flow?days=30'),
        authFetch('/api/finance/reports/health-score'),
        authFetch('/api/finance/titles/aging'),
        authFetch(`/api/finance/calendar?year=${year}&month=${month}`),
      ]);

      if (accRes.ok) setAccounts(await accRes.json());
      if (cardsRes.ok) setCreditCards(await cardsRes.json());
      if (titlesRes.ok) setTitles(await titlesRes.json());
      if (entRes.ok) setEntities(await entRes.json());
      if (ccRes.ok) setCostCenters(await ccRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
      if (budRes.ok) setBudgets(await budRes.json());
      if (dreRes.ok) setDreData(await dreRes.json());
      if (cfRes.ok) setCashFlowData(await cfRes.json());
      if (hsRes.ok) setHealthScore(await hsRes.json());
      if (agingRes.ok) setAgingData(await agingRes.json());
      if (calRes.ok) setCalendarData(await calRes.json());
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  }, [dreRegime]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Totais Calculados
  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);
  const payablesList = titles.filter((t) => t.type === 'PAYABLE');
  const receivablesList = titles.filter((t) => t.type === 'RECEIVABLE');

  const openPayablesTotal = payablesList
    .filter((t) => t.status !== 'PAID' && t.status !== 'CANCELLED')
    .reduce((acc, t) => acc + (t.originalAmount - t.paidAmount), 0);

  const openReceivablesTotal = receivablesList
    .filter((t) => t.status !== 'PAID' && t.status !== 'CANCELLED')
    .reduce((acc, t) => acc + (t.originalAmount - t.paidAmount), 0);

  const dueTodayPayables = payablesList.filter((t) => t.status === 'DUE_TODAY');
  const overduePayables = payablesList.filter((t) => t.status === 'OVERDUE');

  // Submit Título
  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/finance/titles', {
        method: 'POST',
        body: JSON.stringify({
          type: titleModalType,
          description: titleForm.description,
          documentNumber: titleForm.documentNumber || undefined,
          originalAmount: parseFloat(titleForm.originalAmount),
          dueDate: titleForm.dueDate,
          competenceDate: titleForm.competenceDate, // OBRIGATÓRIO
          entityId: titleForm.entityId || undefined,
          entityName: titleForm.entityName || undefined,
          categoryId: titleForm.categoryId || undefined,
          costCenterId: titleForm.costCenterId || undefined,
          paymentMethod: titleForm.paymentMethod,
          paymentAccountId: titleForm.paymentAccountId || undefined,
          barcode: titleForm.barcode || undefined,
          notes: titleForm.notes || undefined,
        }),
      });

      if (res.ok) {
        setShowTitleModal(false);
        resetTitleForm();
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetTitleForm = () => {
    setTitleForm({
      description: '',
      documentNumber: '',
      originalAmount: '',
      dueDate: new Date().toISOString().split('T')[0],
      competenceDate: new Date().toISOString().split('T')[0],
      entityId: '',
      entityName: '',
      categoryId: '',
      costCenterId: '',
      paymentMethod: 'PIX',
      paymentAccountId: '',
      barcode: '',
      notes: '',
    });
  };

  // Submit Baixa de Título
  const handlePayTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTitleForPay) return;

    try {
      const res = await authFetch(`/api/finance/titles/${selectedTitleForPay.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(payForm.amount),
          paymentAccountId: payForm.paymentAccountId || undefined,
          paymentMethod: payForm.paymentMethod,
          paymentDate: payForm.paymentDate,
          discountApplied: parseFloat(payForm.discountApplied || '0'),
          interestApplied: parseFloat(payForm.interestApplied || '0'),
          notes: payForm.notes || undefined,
        }),
      });

      if (res.ok) {
        setShowPayModal(false);
        setSelectedTitleForPay(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Baixa em Lote
  const handleBatchPay = async () => {
    if (selectedTitleIds.length === 0) return;
    try {
      const res = await authFetch('/api/finance/titles/batch-pay', {
        method: 'POST',
        body: JSON.stringify({ titleIds: selectedTitleIds }),
      });
      if (res.ok) {
        setSelectedTitleIds([]);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Voice Command
  const handleParseVoice = async (textToParse: string) => {
    if (!textToParse.trim()) return;
    setVoiceParsing(true);
    try {
      const res = await authFetch('/api/finance/voice/parse', {
        method: 'POST',
        body: JSON.stringify({ text: textToParse }),
      });
      if (res.ok) {
        const draft = await res.json();
        setVoiceDraft(draft);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVoiceParsing(false);
    }
  };

  const toggleVoiceRecognition = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Seu navegador não suporta a API de voz.');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceText(transcript);
        handleParseVoice(transcript);
        setShowVoiceModal(true);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      
      recognition.start();
    }
  };

  const handleConfirmVoiceDraft = async () => {
    if (!voiceDraft) return;
    try {
      const res = await authFetch('/api/finance/titles', {
        method: 'POST',
        body: JSON.stringify({
          type: voiceDraft.type,
          description: voiceDraft.description,
          originalAmount: voiceDraft.originalAmount,
          dueDate: voiceDraft.dueDate,
          competenceDate: voiceDraft.competenceDate,
          entityId: voiceDraft.entityId || undefined,
          categoryId: voiceDraft.categoryId || undefined,
          paymentMethod: voiceDraft.paymentMethod,
        }),
      });
      if (res.ok) {
        setShowVoiceModal(false);
        setVoiceDraft(null);
        setVoiceText('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Entidade (Fornecedor/Cliente)
  const handleSaveEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/finance/entities', {
        method: 'POST',
        body: JSON.stringify(entityForm),
      });
      if (res.ok) {
        setShowEntityModal(false);
        setEntityForm({ type: 'SUPPLIER', name: '', document: '', email: '', phone: '', notes: '' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Centro de Custo
  const handleSaveCostCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/finance/cost-centers', {
        method: 'POST',
        body: JSON.stringify(costCenterForm),
      });
      if (res.ok) {
        setShowCostCenterModal(false);
        setCostCenterForm({ name: '', color: '#3b82f6' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Conta Bancária
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/finance/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: accountForm.name,
          bankName: accountForm.bankName,
          accountType: accountForm.accountType,
          balance: parseFloat(accountForm.balance),
          bankColor: accountForm.bankColor,
        }),
      });
      if (res.ok) {
        setShowAccountModal(false);
        setAccountForm({ name: '', bankName: '', accountType: 'CHECKING', balance: '0', bankColor: '#3b82f6' });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Chaves Individuais Pluggy (BYOK)
  const handleSavePluggyKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPluggyKeys(true);
    try {
      const res = await authFetch('/api/finance/open-finance/credentials', {
        method: 'POST',
        body: JSON.stringify(pluggyKeysForm),
      });

      if (res.ok) {
        setShowPluggyKeysModal(false);
        // Tenta gerar connectToken imediatamente e abre o widget SDK
        const tokenRes = await authFetch('/api/finance/open-finance/connect-token', { method: 'POST' });
        if (tokenRes.ok) {
          const data = await tokenRes.json();
          if (data.connectToken) {
            setPluggyConnectToken(data.connectToken);
            setShowPluggyWidget(true);
          }
        }
      } else {
        const err = await res.json();
        alert(err.message || 'Chaves da Pluggy inválidas. Verifique o Client ID e Secret.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar credenciais.');
    } finally {
      setSavingPluggyKeys(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER & QUICK ACTIONS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-400" /> Gestão Financeira ERP
          </h1>
          <p className="text-sm text-slate-400">
            Controle integrado de contas a pagar, a receber, fluxo de caixa e relatórios por competência.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={async () => {
                try {
                  const res = await authFetch('/api/finance/open-finance/connect-token', { method: 'POST' });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.connectToken) {
                      setPluggyConnectToken(data.connectToken);
                      setShowPluggyWidget(true);
                    }
                  } else {
                    setShowPluggyKeysModal(true);
                  }
                } catch (err) {
                  setShowPluggyKeysModal(true);
                }
              }}
              className="flex items-center gap-2 rounded-l-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition"
            >
              <RefreshCw className="h-4 w-4" /> ⚡ Conectar Banco (Pluggy)
            </button>
            <button
              onClick={() => setShowPluggyKeysModal(true)}
              title="Configurar Minhas Chaves Pluggy"
              className="rounded-r-lg bg-teal-700 px-2.5 py-2 text-sm font-semibold text-white hover:bg-teal-600 border-l border-teal-500/30 transition"
            >
              ⚙️
            </button>
          </div>
          <button
            onClick={() => setShowVoiceModal(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:brightness-110 transition"
          >
            <Mic className="h-4 w-4" /> Lançar por Voz (IA)
          </button>
          <button
            onClick={() => { setTitleModalType('PAYABLE'); setShowTitleModal(true); }}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-rose-500 transition"
          >
            <Plus className="h-4 w-4" /> Novo Título A Pagar
          </button>
          <button
            onClick={() => { setTitleModalType('RECEIVABLE'); setShowTitleModal(true); }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 transition"
          >
            <Plus className="h-4 w-4" /> Novo Título A Receber
          </button>
        </div>
      </div>

      {/* KPI TOP CARDS (ESTILO CONTA AZUL) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Saldo em Contas */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo em Contas</span>
            <Wallet className="h-5 w-5 text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">{accounts.length} conta(s) bancária(s) ativas</p>
        </div>

        {/* Contas a Receber */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">A Receber (Aberto)</span>
            <TrendingUp className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            R$ {openReceivablesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">{receivablesList.filter(t => t.status !== 'PAID').length} título(s) a receber</p>
        </div>

        {/* Contas a Pagar */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">A Pagar (Aberto)</span>
            <TrendingDown className="h-5 w-5 text-rose-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-400">
            R$ {openPayablesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-500 mt-1">{payablesList.filter(t => t.status !== 'PAID').length} título(s) a pagar</p>
        </div>

        {/* Score de Saúde */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Saúde Financeira</span>
            <ShieldCheck className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold text-indigo-300">{healthScore?.score || 85}/100</span>
            <span className="text-xs font-bold text-emerald-400">{healthScore?.statusLabel || 'BOM'}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Calculado por liquidez e pontualidade</p>
        </div>
      </div>

      {/* ALERTA DE COMPROMISSOS DO DIA */}
      {(dueTodayPayables.length > 0 || overduePayables.length > 0) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />
            <div>
              <p className="font-semibold text-sm">
                Atenção aos vencimentos! {dueTodayPayables.length > 0 && `${dueTodayPayables.length} conta(s) vencem hoje.`} {overduePayables.length > 0 && `${overduePayables.length} conta(s) estão em atraso.`}
              </p>
              <p className="text-xs text-amber-300/80">Evite juros efetuando as baixas até o fim do expediente.</p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('payables')}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shrink-0"
          >
            Ver Títulos A Pagar
          </button>
        </div>
      )}

      {/* ABAS ERP */}
      <div className="border-b border-slate-800 flex overflow-x-auto gap-2 pb-1 scrollbar-none">
        {[
          { id: 'dashboard', label: '📊 Dashboard ERP' },
          { id: 'payables', label: `📥 Contas a Pagar (${payablesList.filter(t => t.status !== 'PAID').length})` },
          { id: 'receivables', label: `📤 Contas a Receber (${receivablesList.filter(t => t.status !== 'PAID').length})` },
          { id: 'entities', label: `🏢 Fornecedores & Clientes (${entities.length})` },
          { id: 'costCenters', label: `💼 Centros de Custo (${costCenters.length})` },
          { id: 'accounts', label: `🏦 Contas & Cartões (${accounts.length + creditCards.length})` },
          { id: 'transactions', label: '📋 Extrato' },
          { id: 'reports', label: '📈 DRE & Relatórios' },
          { id: 'calendar', label: '📅 Calendário' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold rounded-t-lg transition ${
              activeTab === tab.id
                ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: DASHBOARD ERP */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Fluxo de Caixa Projetado (Gráfico Dual) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" /> Fluxo de Caixa Projetado (Próximos 30 Dias)
                </h3>
                <p className="text-xs text-slate-400">Previsão baseada em títulos a vencer e liquidez atual</p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Saldo Final Projetado: R$ {cashFlowData?.projectedEndBalance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </span>
            </div>

            <div className="h-48 w-full flex items-end gap-1 pt-6 pb-2 px-2 border-b border-slate-800">
              {cashFlowData?.timeline?.slice(0, 15).map((item: any, idx: number) => {
                const maxVal = Math.max(...cashFlowData.timeline.map((t: any) => Math.max(t.inflow, t.outflow, 100)));
                const inHeight = (item.inflow / maxVal) * 100;
                const outHeight = (item.outflow / maxVal) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-800 text-xs p-2 rounded shadow-xl border border-slate-700 z-10 whitespace-nowrap">
                      <span className="text-slate-300 font-bold">{item.date}</span>
                      <span className="text-emerald-400">+ Entradas: R$ {item.inflow.toFixed(2)}</span>
                      <span className="text-rose-400">- Saídas: R$ {item.outflow.toFixed(2)}</span>
                      <span className="text-blue-400">Saldo: R$ {item.projectedBalance.toFixed(2)}</span>
                    </div>

                    <div className="w-full flex items-end justify-center gap-0.5 h-36">
                      <div style={{ height: `${Math.max(4, inHeight)}%` }} className="w-1/2 bg-emerald-500 rounded-t" />
                      <div style={{ height: `${Math.max(4, outHeight)}%` }} className="w-1/2 bg-rose-500 rounded-t" />
                    </div>
                    <span className="text-[10px] text-slate-500 truncate w-full text-center">{item.date.split('-')[2]}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Entradas Projetadas</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-rose-500" /> Saídas Projetadas</span>
            </div>
          </div>

          {/* DRE RESUMO POR COMPETÊNCIA */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-bold text-slate-100 mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" /> DRE do Mês (Regime de Competência)
              </h3>
              <p className="text-xs text-slate-400 mb-4">Mapeado rigorosamente por data de competência dos títulos</p>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm py-1 border-b border-slate-800">
                  <span className="text-slate-300">Receita Bruta</span>
                  <span className="font-bold text-emerald-400">R$ {dreData?.summary?.grossRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                </div>
                <div className="flex justify-between items-center text-sm py-1 border-b border-slate-800">
                  <span className="text-slate-300">Custos & Despesas</span>
                  <span className="font-bold text-rose-400">- R$ {dreData?.summary?.grossExpense?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                </div>
                <div className="flex justify-between items-center text-base font-bold py-2 bg-slate-800/50 px-3 rounded-lg">
                  <span className="text-slate-100">Resultado Líquido do Mês</span>
                  <span className={(dreData?.summary?.netIncome || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    R$ {dreData?.summary?.netIncome?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </span>
                </div>
              </div>
            </div>

            {/* DICAS IA & INSIGHTS */}
            <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-slate-900 p-5">
              <h3 className="font-bold text-indigo-300 mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" /> Recomendações Financeiras da IA
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-indigo-500/10">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Sua liquidez cobre os compromissos dos próximos 15 dias com folga de 28%.</span>
                </li>
                <li className="flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-indigo-500/10">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Há 2 títulos sem Centro de Custo atribuído. Categorizar melhora a acurácia do DRE.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CONTAS A PAGAR / CONTAS A RECEBER */}
      {(activeTab === 'payables' || activeTab === 'receivables') && (
        <div className="space-y-4">
          {/* BARRA DE PESQUISA & AÇÕES EM LOTE */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por descrição, fornecedor ou nº doc..."
                value={titleSearch}
                onChange={(e) => setTitleSearch(e.target.value)}
                className="bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none w-full sm:w-80"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              {['ALL', 'OPEN', 'DUE_TODAY', 'OVERDUE', 'PAID'].map((st) => (
                <button
                  key={st}
                  onClick={() => setTitleStatusFilter(st)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                    titleStatusFilter === st ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {st === 'ALL' ? 'Todos' : st === 'OPEN' ? 'Em Aberto' : st === 'DUE_TODAY' ? 'Vence Hoje' : st === 'OVERDUE' ? 'Atrasado' : 'Quitado'}
                </button>
              ))}

              {selectedTitleIds.length > 0 && (
                <button
                  onClick={handleBatchPay}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition"
                >
                  <CheckSquare className="h-3.5 w-3.5" /> Baixar Selecionados ({selectedTitleIds.length})
                </button>
              )}
            </div>

            <div className="flex bg-slate-800 rounded-lg p-1 shrink-0">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 ${viewMode === 'TABLE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                📋 Tabela
              </button>
              <button
                onClick={() => setViewMode('KANBAN')}
                className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 ${viewMode === 'KANBAN' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                📊 Kanban
              </button>
            </div>
          </div>

          {/* TABELA DE TÍTULOS */}
          {viewMode === 'TABLE' ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          const currentList = activeTab === 'payables' ? payablesList : receivablesList;
                          if (e.target.checked) setSelectedTitleIds(currentList.map(t => t.id));
                          else setSelectedTitleIds([]);
                        }}
                      />
                    </th>
                    <th className="p-4">Descrição / Doc</th>
                    <th className="p-4">{activeTab === 'payables' ? 'Fornecedor' : 'Cliente'}</th>
                    <th className="p-4">Vencimento</th>
                    <th className="p-4">Competência</th>
                    <th className="p-4">Valor Original</th>
                    <th className="p-4">Valor Pago</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(activeTab === 'payables' ? payablesList : receivablesList)
                    .filter((t) => {
                      if (titleStatusFilter !== 'ALL' && t.status !== titleStatusFilter) return false;
                      if (titleSearch && !t.description.toLowerCase().includes(titleSearch.toLowerCase()) && !t.entityName?.toLowerCase().includes(titleSearch.toLowerCase())) return false;
                      return true;
                    })
                    .map((title) => (
                      <tr key={title.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedTitleIds.includes(title.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedTitleIds([...selectedTitleIds, title.id]);
                              else setSelectedTitleIds(selectedTitleIds.filter(id => id !== title.id));
                            }}
                          />
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-100">{title.description}</p>
                          {title.documentNumber && <span className="text-xs text-slate-500">Doc: {title.documentNumber}</span>}
                        </td>
                        <td className="p-4 text-slate-300">{title.entityName || title.entity?.name || '-'}</td>
                        <td className="p-4 text-slate-300">{new Date(title.dueDate).toLocaleDateString('pt-BR')}</td>
                        <td className="p-4 text-slate-400 text-xs">{new Date(title.competenceDate).toLocaleDateString('pt-BR')}</td>
                        <td className="p-4 font-semibold text-slate-100">R$ {title.originalAmount.toFixed(2)}</td>
                        <td className="p-4 text-emerald-400">R$ {title.paidAmount.toFixed(2)}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            title.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            title.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                            title.status === 'DUE_TODAY' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            {title.status === 'PAID' ? 'QUITADO' : title.status === 'OVERDUE' ? 'ATRASADO' : title.status === 'DUE_TODAY' ? 'VENCE HOJE' : 'ABERTO'}
                          </span>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                          {title.status !== 'PAID' && (
                            <button
                              onClick={() => {
                                setSelectedTitleForPay(title);
                                setPayForm({ ...payForm, amount: (title.originalAmount - title.paidAmount).toString() });
                                setShowPayModal(true);
                              }}
                              className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500"
                            >
                              Baixar
                            </button>
                          )}
                          <button
                            onClick={() => setShowDetailDrawer(title)}
                            className="rounded bg-slate-800 p-1.5 text-slate-400 hover:text-slate-200"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start overflow-x-auto pb-4">
              {['OPEN', 'DUE_TODAY', 'OVERDUE', 'PAID'].map(colStatus => {
                const colTitles = (activeTab === 'payables' ? payablesList : receivablesList).filter(t => {
                  if (titleStatusFilter !== 'ALL' && t.status !== titleStatusFilter) return false;
                  if (t.status !== colStatus) return false;
                  if (titleSearch && !t.description.toLowerCase().includes(titleSearch.toLowerCase()) && !t.entityName?.toLowerCase().includes(titleSearch.toLowerCase())) return false;
                  return true;
                });
                return (
                  <div key={colStatus} className="bg-slate-900 rounded-xl border border-slate-800 p-3 flex flex-col gap-3 min-w-[280px]">
                    <h4 className="font-bold text-slate-100 flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                      {colStatus === 'OPEN' ? 'Em Aberto' : colStatus === 'DUE_TODAY' ? 'Vence Hoje' : colStatus === 'OVERDUE' ? 'Atrasado' : 'Pago'}
                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">{colTitles.length}</span>
                    </h4>
                    {colTitles.map(title => (
                      <div key={title.id} className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-2 hover:border-blue-500/50 transition cursor-pointer">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs text-slate-400 truncate flex-1">{title.entityName || title.entity?.name || '-'}</span>
                          <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">{new Date(title.dueDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="font-semibold text-slate-100 text-sm">{title.description}</p>
                        <p className={`font-bold ${title.status === 'PAID' ? 'text-emerald-400' : 'text-slate-100'}`}>R$ {title.originalAmount.toFixed(2)}</p>
                        <div className="flex gap-2 pt-2 border-t border-slate-700/50">
                          {title.status !== 'PAID' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTitleForPay(title);
                                setPayForm({ ...payForm, amount: (title.originalAmount - title.paidAmount).toString() });
                                setShowPayModal(true);
                              }}
                              className="flex-1 rounded bg-emerald-600/20 text-emerald-400 py-1.5 text-[11px] font-bold hover:bg-emerald-600 hover:text-white transition"
                            >
                              Baixar
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDetailDrawer(title);
                            }}
                            className="flex-1 rounded bg-slate-700 text-slate-300 py-1.5 text-[11px] font-bold hover:bg-slate-600 transition"
                          >
                            Detalhes
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: FORNECEDORES & CLIENTES (CRM BÁSICO) */}
      {activeTab === 'entities' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-400" /> Cadastro de Fornecedores e Clientes
            </h3>
            <button
              onClick={() => setShowEntityModal(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 transition"
            >
              <Plus className="h-4 w-4" /> Novo Cadastro
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entities.map((entity) => (
              <div key={entity.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    entity.type === 'SUPPLIER' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {entity.type === 'SUPPLIER' ? 'FORNECEDOR' : 'CLIENTE'}
                  </span>
                  <span className="text-xs text-slate-500">{entity._count?.titles || 0} título(s)</span>
                </div>
                <h4 className="font-bold text-slate-100">{entity.name}</h4>
                {entity.document && <p className="text-xs text-slate-400">Doc: {entity.document}</p>}
                {entity.email && <p className="text-xs text-slate-400">Email: {entity.email}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CENTROS DE CUSTO */}
      {activeTab === 'costCenters' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-400" /> Cadastro de Centros de Custo
            </h3>
            <button
              onClick={() => setShowCostCenterModal(true)}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 transition"
            >
              <Plus className="h-4 w-4" /> Novo Centro de Custo
            </button>
          </div>

          {costCenters.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {costCenters.map((cc) => (
                <div key={cc.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cc.color || '#3b82f6' }} />
                        <h4 className="font-bold text-slate-100">{cc.name}</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${cc.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                        {cc.isActive ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button className="text-slate-400 hover:text-blue-400"><Edit3 className="w-4 h-4" /></button>
                    <button className="text-slate-400 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Nenhum centro de custo cadastrado</p>
              <p className="text-xs mt-1">Crie centros de custo para categorizar melhor suas receitas e despesas.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: CONTAS & CARTÕES */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <Landmark className="h-5 w-5 text-blue-400" /> Contas Bancárias & Cartões
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAccountModal(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 transition"
              >
                <Plus className="h-4 w-4" /> Nova Conta
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3 hover:border-blue-500/30 transition">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (acc as any).bankColor || '#3b82f6' }}>
                      <Landmark className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{acc.name}</h4>
                      <p className="text-[10px] text-slate-400">{(acc as any).bankName || 'Banco'} · {acc.accountType}</p>
                    </div>
                  </div>
                  {(acc as any).openFinanceProvider && (
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">OPEN FINANCE</span>
                  )}
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-slate-400">Saldo Atual</p>
                    <p className={`text-xl font-bold ${acc.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {(acc as any).lastSyncedAt && (
                    <p className="text-[10px] text-slate-500">Sync: {new Date((acc as any).lastSyncedAt).toLocaleString('pt-BR')}</p>
                  )}
                </div>
              </div>
            ))}
            {creditCards.map((card: any) => (
              <div key={card.id} className="rounded-xl border border-purple-500/20 bg-slate-900 p-5 space-y-3 hover:border-purple-500/40 transition">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                    <CreditCardIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">{card.name}</h4>
                    <p className="text-[10px] text-slate-400">Cartão de Crédito</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Limite</p>
                  <p className="text-lg font-bold text-purple-400">
                    R$ {(card.limit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {accounts.length === 0 && creditCards.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Landmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Nenhuma conta cadastrada</p>
              <p className="text-xs mt-1">Clique em "Nova Conta" ou conecte pelo Open Finance (Pluggy).</p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: EXTRATO */}
      {activeTab === 'transactions' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-400" /> Extrato de Transações
              </h3>
              <p className="text-xs text-slate-400">{transactions.length} lançamento(s)</p>
            </div>
            <button
              onClick={handleSyncAllOpenFinance}
              disabled={syncingOpenFinance}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-lg shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${syncingOpenFinance ? 'animate-spin' : ''}`} />
              {syncingOpenFinance ? 'Sincronizando Transações...' : 'Sincronizar Open Finance'}
            </button>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <label className="text-xs text-slate-400">Buscar</label>
              <div className="flex items-center gap-2 rounded bg-slate-800 p-2 text-sm border border-slate-700">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por descrição ou categoria..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400">Tipo</label>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
              >
                <option value="ALL">Todos</option>
                <option value="INCOME">Entradas</option>
                <option value="EXPENSE">Saídas</option>
                <option value="TRANSFER">Transferências</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Conta / Cartão</label>
              <select
                value={txAccountFilter}
                onChange={(e) => setTxAccountFilter(e.target.value)}
                className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
              >
                <option value="">Todas</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Data Inicial</label>
              <input
                type="date"
                value={txStartDate}
                onChange={(e) => setTxStartDate(e.target.value)}
                className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Data Final</label>
              <input
                type="date"
                value={txEndDate}
                onChange={(e) => setTxEndDate(e.target.value)}
                className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
              />
            </div>
          </div>

          {transactions.filter(tx => {
            if (txSearch && !tx.description.toLowerCase().includes(txSearch.toLowerCase()) && !tx.category?.toLowerCase().includes(txSearch.toLowerCase())) return false;
            if (txTypeFilter !== 'ALL' && tx.type !== txTypeFilter) return false;
            if (txAccountFilter && tx.paymentAccountId !== txAccountFilter) return false;
            if (txStartDate && new Date(tx.date) < new Date(txStartDate)) return false;
            if (txEndDate && new Date(tx.date) > new Date(txEndDate)) return false;
            return true;
          }).length > 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400">
                    <th className="text-left p-3">Data</th>
                    <th className="text-left p-3">Descrição</th>
                    <th className="text-left p-3">Categoria</th>
                    <th className="text-left p-3">Conta / Banco</th>
                    <th className="text-left p-3">Tipo</th>
                    <th className="text-right p-3">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.filter(tx => {
                    if (txSearch && !tx.description.toLowerCase().includes(txSearch.toLowerCase()) && !tx.category?.toLowerCase().includes(txSearch.toLowerCase())) return false;
                    if (txTypeFilter !== 'ALL' && tx.type !== txTypeFilter) return false;
                    if (txAccountFilter && tx.paymentAccountId !== txAccountFilter) return false;
                    if (txStartDate && new Date(tx.date) < new Date(txStartDate)) return false;
                    if (txEndDate && new Date(tx.date) > new Date(txEndDate)) return false;
                    return true;
                  }).slice(0, 100).map((tx: any) => (
                    <tr key={tx.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                      <td className="p-3 text-xs text-slate-300">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                      <td className="p-3 text-slate-100 font-medium">{tx.description}</td>
                      <td className="p-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {tx.category || 'Outros'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-300">
                        {tx.bank || 'Conta Bancária'}
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          tx.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {tx.type === 'INCOME' ? 'ENTRADA' : 'SAÍDA'}
                        </span>
                      </td>
                      <td className={`p-3 text-right font-bold ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'} R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Nenhuma transação encontrada</p>
              <p className="text-xs mt-1">As transações aparecerão aqui quando sincronizadas pelo Open Finance ou lançadas manualmente.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: DRE & RELATÓRIOS */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-400" /> Relatórios e Indicadores
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Regime:</span>
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setDreRegime('COMPETENCE')}
                  className={`px-3 py-1 text-xs font-bold rounded ${dreRegime === 'COMPETENCE' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Competência
                </button>
                <button
                  onClick={() => setDreRegime('CASH')}
                  className={`px-3 py-1 text-xs font-bold rounded ${dreRegime === 'CASH' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Caixa
                </button>
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* DRE */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" /> DRE do Mês (Regime de {dreRegime === 'COMPETENCE' ? 'Competência' : 'Caixa'})
              </h3>
              <p className="text-[10px] text-slate-500">
                {dreRegime === 'COMPETENCE' ? 'Mapeado rigorosamente por data de competência dos títulos' : 'Mapeado pelo dinheiro que efetivamente entrou e saiu da conta'}
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-300">Receita Bruta</span>
                  <span className="text-emerald-400 font-bold">R$ {dreData?.summary?.grossRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-300">Custos & Despesas</span>
                  <span className="text-rose-400 font-bold">- R$ {dreData?.summary?.grossExpense?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-blue-500/30">
                  <span className="font-bold text-slate-100">Resultado Líquido do Mês</span>
                  <span className={`font-bold text-lg ${(dreData?.summary?.netIncome || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    R$ {dreData?.summary?.netIncome?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Score de Saúde Financeira */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" /> Score de Saúde Financeira
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-5xl font-black text-emerald-400">{healthScore?.score || 95}</div>
                <div>
                  <p className="font-bold text-emerald-300 text-lg">{healthScore?.statusLabel || 'EXCELENTE'}</p>
                  <p className="text-xs text-slate-400">Calculado por liquidez e pontualidade</p>
                </div>
              </div>
            </div>
            
            {/* Aging de Títulos */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3 lg:col-span-2">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <PieChart className="h-5 w-5 text-amber-400" /> Aging de Títulos (A Pagar)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                {[
                  { label: 'A Vencer', value: agingData?.upToDate?.total || 0 },
                  { label: '1-30 dias', value: agingData?.overdue1to30?.total || 0 },
                  { label: '31-60 dias', value: agingData?.overdue31to60?.total || 0 },
                  { label: '61-90 dias', value: agingData?.overdue61to90?.total || 0 },
                  { label: '90+ dias', value: agingData?.overdue90Plus?.total || 0 },
                ].map((item, idx) => (
                  <div key={idx} className="bg-slate-800 p-3 rounded-lg text-center border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                    <p className="font-bold text-slate-100">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CALENDÁRIO */}
      {activeTab === 'calendar' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="font-bold text-slate-100 flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-blue-400" /> Calendário Financeiro
          </h3>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="p-2 font-bold text-slate-400">{d}</div>
            ))}
            {Array.from({ length: 35 }, (_, i) => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              const dayOffset = firstDay.getDay();
              const dayNum = i - dayOffset + 1;
              const dateObj = new Date(today.getFullYear(), today.getMonth(), dayNum);
              const isCurrentMonth = dateObj.getMonth() === today.getMonth();
              const isToday = dateObj.toDateString() === today.toDateString();
              const dueTitles = titles.filter(t => {
                const d = new Date(t.dueDate);
                return d.toDateString() === dateObj.toDateString() && t.status !== 'PAID';
              });
              
              const dayData = calendarData.find(c => c.date === dateObj.toISOString().split('T')[0]);

              return (
                <div
                  key={i}
                  onClick={() => {
                    if (isCurrentMonth) {
                      setSelectedCalendarDate(dateObj);
                      setCalendarDayModal(true);
                    }
                  }}
                  className={`p-2 rounded-lg text-xs min-h-[64px] flex flex-col items-center justify-between gap-1 transition-all ${
                    isCurrentMonth ? 'cursor-pointer hover:border-blue-500 border border-transparent' : ''
                  } ${
                    isToday ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300 font-bold' :
                    isCurrentMonth ? 'bg-slate-800/40 text-slate-300 hover:bg-slate-800' : 'text-slate-600 bg-slate-900/50'
                  }`}
                >
                  <span className="font-bold">{isCurrentMonth ? dayNum : ''}</span>
                  {dayData && (dayData.inflows > 0 || dayData.outflows > 0) && (
                    <div className="flex flex-col gap-0.5 w-full">
                      {dayData.inflows > 0 && <span className="text-[9px] text-emerald-400 bg-emerald-400/10 rounded px-1 truncate">+{dayData.inflows.toFixed(0)}</span>}
                      {dayData.outflows > 0 && <span className="text-[9px] text-rose-400 bg-rose-400/10 rounded px-1 truncate">-{dayData.outflows.toFixed(0)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: NOVO TÍTULO */}
      {showTitleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-100">
                {titleModalType === 'PAYABLE' ? 'Novo Título A Pagar (Despesa)' : 'Novo Título A Receber (Receita)'}
              </h3>
              <button onClick={() => setShowTitleModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveTitle} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Descrição</label>
                <input
                  type="text"
                  required
                  value={titleForm.description}
                  onChange={(e) => setTitleForm({ ...titleForm, description: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                  placeholder="Ex: Conta de Luz de Agosto"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Valor Original (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={titleForm.originalAmount}
                    onChange={(e) => setTitleForm({ ...titleForm, originalAmount: e.target.value })}
                    className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Nº do Documento / NF</label>
                  <input
                    type="text"
                    value={titleForm.documentNumber}
                    onChange={(e) => setTitleForm({ ...titleForm, documentNumber: e.target.value })}
                    className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={titleForm.dueDate}
                    onChange={(e) => setTitleForm({ ...titleForm, dueDate: e.target.value })}
                    className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-amber-400">Data de Competência * (DRE)</label>
                  <input
                    type="date"
                    required
                    value={titleForm.competenceDate}
                    onChange={(e) => setTitleForm({ ...titleForm, competenceDate: e.target.value })}
                    className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-amber-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Fornecedor / Cliente</label>
                  <select
                    value={titleForm.entityId}
                    onChange={(e) => setTitleForm({ ...titleForm, entityId: e.target.value })}
                    className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                  >
                    <option value="">Selecione...</option>
                    {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Centro de Custo</label>
                  <select
                    value={titleForm.costCenterId}
                    onChange={(e) => setTitleForm({ ...titleForm, costCenterId: e.target.value })}
                    className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                  >
                    <option value="">Selecione...</option>
                    {costCenters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Forma de Pagamento</label>
                  <select
                    value={titleForm.paymentMethod}
                    onChange={(e) => setTitleForm({ ...titleForm, paymentMethod: e.target.value })}
                    className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                  >
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="TED">TED</option>
                    <option value="CREDIT_CARD">Cartão de Crédito</option>
                    <option value="CASH">Dinheiro</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Conta Bancária Vincular</label>
                  <select
                    value={titleForm.paymentAccountId}
                    onChange={(e) => setTitleForm({ ...titleForm, paymentAccountId: e.target.value })}
                    className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                  >
                    <option value="">Nenhuma / A Definir</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Código de Barras / Linha Digitável</label>
                <input
                  type="text"
                  value={titleForm.barcode}
                  onChange={(e) => setTitleForm({ ...titleForm, barcode: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Observações</label>
                <textarea
                  rows={2}
                  value={titleForm.notes}
                  onChange={(e) => setTitleForm({ ...titleForm, notes: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                  placeholder="Opcional"
                />
              </div>

              <button type="submit" className="w-full rounded-lg bg-blue-600 p-3 font-bold text-white hover:bg-blue-500">
                Salvar Título
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BAIXA DE TÍTULO */}
      {showPayModal && selectedTitleForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-100">Baixar Título</h3>
              <button onClick={() => setShowPayModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <p className="text-xs text-slate-400">{selectedTitleForPay.description}</p>

            <form onSubmit={handlePayTitle} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Valor Pago (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Conta Bancária Debitada/Creditada</label>
                <select
                  value={payForm.paymentAccountId}
                  onChange={(e) => setPayForm({ ...payForm, paymentAccountId: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                >
                  <option value="">Selecione a conta...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Saldo: R${a.balance})</option>)}
                </select>
              </div>

              <button type="submit" className="w-full rounded-lg bg-emerald-600 p-3 font-bold text-white hover:bg-emerald-500">
                Confirmar Baixa
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IA POR VOZ */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-purple-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-purple-300 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" /> Lançamento por Voz (IA)
              </h3>
              <button onClick={() => setShowVoiceModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <textarea
              rows={3}
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              placeholder="Digite ou fale ex: 'Lançar conta de luz de 150 reais com vencimento dia 20 de agosto'..."
              className="w-full rounded-lg bg-slate-800 p-3 text-sm text-slate-100 border border-slate-700 focus:outline-none"
            />

            <button
              onClick={() => handleParseVoice(voiceText)}
              disabled={voiceParsing}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 p-3 font-bold text-white hover:brightness-110 flex items-center justify-center gap-2"
            >
              {voiceParsing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Analisar Comando com IA'}
            </button>

            {voiceDraft && (
              <div className="bg-slate-800/80 p-4 rounded-lg border border-purple-500/20 space-y-2 text-xs text-slate-200">
                <p><strong>Tipo:</strong> {voiceDraft.type === 'PAYABLE' ? 'A PAGAR' : 'A RECEBER'}</p>
                <p><strong>Descrição:</strong> {voiceDraft.description}</p>
                <p><strong>Valor:</strong> R$ {voiceDraft.originalAmount}</p>
                <p><strong>Vencimento:</strong> {voiceDraft.dueDate}</p>
                <p><strong>Competência:</strong> {voiceDraft.competenceDate}</p>
                <p><strong>Categoria Sugerida:</strong> {voiceDraft.categoryName}</p>
                <button
                  onClick={handleConfirmVoiceDraft}
                  className="w-full mt-2 rounded bg-emerald-600 p-2 font-bold text-white hover:bg-emerald-500"
                >
                  Confirmar e Salvar Título
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO DE ENTIDADE (FORNECEDOR/CLIENTE) */}
      {showEntityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-100">Novo Fornecedor ou Cliente</h3>
              <button onClick={() => { setShowEntityModal(false); setCnpjStatus(null); }}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveEntity} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Tipo</label>
                <select
                  value={entityForm.type}
                  onChange={(e) => setEntityForm({ ...entityForm, type: e.target.value as any })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                >
                  <option value="SUPPLIER">Fornecedor</option>
                  <option value="CLIENT">Cliente</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 flex justify-between items-center mb-1">
                  <span>CPF / CNPJ</span>
                  {cnpjStatus && <span className="text-[10px] font-semibold text-emerald-400">{cnpjStatus}</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={entityForm.document}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEntityForm({ ...entityForm, document: val });
                      const clean = val.replace(/\D/g, '');
                      if (clean.length === 14 && !loadingCnpj) {
                        handleLookupCNPJ(val);
                      }
                    }}
                    className="flex-1 rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleLookupCNPJ()}
                    disabled={loadingCnpj}
                    title="Consultar CNPJ na Receita Federal"
                    className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition shrink-0"
                  >
                    {loadingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Consultar
                  </button>
                </div>
                {loadingCnpj && (
                  <p className="text-[11px] text-blue-400 mt-1 flex items-center gap-1 animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" /> Consultando dados na Receita Federal...
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400">Nome / Razão Social</label>
                <input
                  type="text"
                  required
                  placeholder="Razão Social ou Nome Fantasia"
                  value={entityForm.name}
                  onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">E-mail</label>
                  <input
                    type="email"
                    placeholder="contato@empresa.com"
                    value={entityForm.email}
                    onChange={(e) => setEntityForm({ ...entityForm, email: e.target.value })}
                    className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Telefone</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={entityForm.phone}
                    onChange={(e) => setEntityForm({ ...entityForm, phone: e.target.value })}
                    className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Observações / Endereço</label>
                <textarea
                  rows={2}
                  placeholder="Endereço, notas ou observações..."
                  value={entityForm.notes}
                  onChange={(e) => setEntityForm({ ...entityForm, notes: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                />
              </div>

              <button type="submit" className="w-full rounded-lg bg-blue-600 p-3 font-bold text-white hover:bg-blue-500">
                Salvar Cadastramento
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA CONTA BANCÁRIA */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-100">Nova Conta Bancária</h3>
              <button onClick={() => setShowAccountModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Nome da Conta *</label>
                <input
                  type="text"
                  required
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Nome do Banco</label>
                <input
                  type="text"
                  value={accountForm.bankName}
                  onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Tipo de Conta</label>
                <select
                  value={accountForm.accountType}
                  onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                >
                  <option value="CHECKING">Conta Corrente</option>
                  <option value="SAVINGS">Poupança</option>
                  <option value="INVESTMENT">Investimento</option>
                  <option value="DIGITAL_WALLET">Carteira Digital</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Saldo Inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={accountForm.balance}
                  onChange={(e) => setAccountForm({ ...accountForm, balance: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Cor do Banco</label>
                <div className="flex gap-2 mt-1">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAccountForm({ ...accountForm, bankColor: color })}
                      className={`w-8 h-8 rounded-full ${accountForm.bankColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full rounded-lg bg-blue-600 p-3 font-bold text-white hover:bg-blue-500">
                Salvar Conta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO CENTRO DE CUSTO */}
      {showCostCenterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-100">Novo Centro de Custo</h3>
              <button onClick={() => setShowCostCenterModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveCostCenter} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Nome do Centro de Custo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Marketing, Engenharia"
                  value={costCenterForm.name}
                  onChange={(e) => setCostCenterForm({ ...costCenterForm, name: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Cor</label>
                <div className="flex gap-2 mt-1">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCostCenterForm({ ...costCenterForm, color: color })}
                      className={`w-8 h-8 rounded-full ${costCenterForm.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full rounded-lg bg-blue-600 p-3 font-bold text-white hover:bg-blue-500">
                Salvar Centro de Custo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHAVES INDIVIDUAIS PLUGGY (BYOK PER-USER) */}
      {showPluggyKeysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-emerald-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-emerald-300 flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-emerald-400" /> Minhas Chaves Pluggy (Gratuito)
              </h3>
              <button onClick={() => setShowPluggyKeysModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <p className="text-xs text-slate-300">
              Cole aqui o <strong>Client ID</strong> e <strong>Client Secret</strong> da sua conta gratuita em <a href="https://dashboard.pluggy.ai" target="_blank" rel="noreferrer" className="text-blue-400 underline">dashboard.pluggy.ai</a> para conectar seus bancos sem custo de empresa.
            </p>

            <form onSubmit={handleSavePluggyKeys} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Meu Client ID</label>
                <input
                  type="text"
                  required
                  placeholder="ex: 4bb19c37-a618-4d44-86b8-0a22246ddea2"
                  value={pluggyKeysForm.clientId}
                  onChange={(e) => setPluggyKeysForm({ ...pluggyKeysForm, clientId: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-xs text-slate-100 border border-slate-700 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Meu Client Secret</label>
                <input
                  type="password"
                  required
                  placeholder="ex: Kc1ryqjZ_QNyTzZ0Cq..."
                  value={pluggyKeysForm.clientSecret}
                  onChange={(e) => setPluggyKeysForm({ ...pluggyKeysForm, clientSecret: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-xs text-slate-100 border border-slate-700 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={savingPluggyKeys}
                className="w-full rounded-lg bg-emerald-600 p-3 font-bold text-white hover:bg-emerald-500 flex items-center justify-center gap-2"
              >
                {savingPluggyKeys ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Salvar e Conectar Banco'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES DO DIA DO CALENDÁRIO */}
      {calendarDayModal && selectedCalendarDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-400" /> 
                Compromissos para {selectedCalendarDate.toLocaleDateString('pt-BR')}
              </h3>
              <button onClick={() => setCalendarDayModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {titles.filter(t => new Date(t.dueDate).toDateString() === selectedCalendarDate.toDateString() && t.status !== 'PAID').length > 0 ? (
                titles.filter(t => new Date(t.dueDate).toDateString() === selectedCalendarDate.toDateString() && t.status !== 'PAID').map(t => (
                  <div key={t.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.type === 'RECEIVABLE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {t.type === 'RECEIVABLE' ? 'RECEBER' : 'PAGAR'}
                        </span>
                        <span className="font-bold text-slate-200 text-sm">{t.description}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{t.entityName || t.entity?.name || '-'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-slate-100">R$ {t.originalAmount.toFixed(2)}</span>
                      <button
                        onClick={() => {
                          setCalendarDayModal(false);
                          setSelectedTitleForPay(t);
                          setPayForm({ ...payForm, amount: (t.originalAmount - t.paidAmount).toString() });
                          setShowPayModal(true);
                        }}
                        className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-500"
                      >
                        Baixar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-500">
                  <Check className="h-8 w-8 mx-auto mb-2 text-emerald-500/50" />
                  <p className="font-semibold">Nenhum compromisso pendente!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PLUGGY CONNECT WIDGET (SDK OFICIAL) */}
      {showPluggyWidget && pluggyConnectToken && (
        <PluggyConnect
          connectToken={pluggyConnectToken}
          includeSandbox={false}
          onSuccess={async (data: { item: { id: string } }) => {
            setShowPluggyWidget(false);
            setPluggyConnectToken(null);
            try {
              await authFetch('/api/finance/open-finance/connect', {
                method: 'POST',
                body: JSON.stringify({ itemId: data.item.id }),
              });
              fetchData();
            } catch (err) {
              console.error('Erro ao registrar conexão:', err);
            }
          }}
          onError={(error: { message?: string; data?: { item?: { id: string } } }) => {
            console.error('Erro Pluggy Connect:', error);
          }}
          onClose={() => {
            setShowPluggyWidget(false);
            setPluggyConnectToken(null);
          }}
        />
      )}

      {/* FAB: Voice Microphone */}
      <button
        onClick={toggleVoiceRecognition}
        title="Lançar por Voz"
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all z-40 ${
          isListening ? 'bg-rose-500 animate-pulse scale-110 shadow-rose-500/50' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105 hover:shadow-purple-500/50'
        } text-white flex items-center justify-center`}
      >
        {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
      </button>

      {/* SLIDE-OVER DETAIL DRAWER */}
      {showDetailDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowDetailDrawer(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="font-bold text-lg text-slate-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" /> Detalhes do Título
              </h3>
              <button onClick={() => setShowDetailDrawer(null)} className="p-1 text-slate-400 hover:text-white rounded bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    showDetailDrawer.type === 'RECEIVABLE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {showDetailDrawer.type === 'RECEIVABLE' ? 'A RECEBER' : 'A PAGAR'}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    showDetailDrawer.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                    showDetailDrawer.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400' :
                    showDetailDrawer.status === 'DUE_TODAY' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {showDetailDrawer.status === 'PAID' ? 'QUITADO' : showDetailDrawer.status === 'OVERDUE' ? 'ATRASADO' : showDetailDrawer.status === 'DUE_TODAY' ? 'VENCE HOJE' : 'ABERTO'}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-100">{showDetailDrawer.description}</h2>
                <p className="text-sm text-slate-400">{showDetailDrawer.entityName || showDetailDrawer.entity?.name || 'Sem entidade vinculada'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Valor Original</p>
                  <p className="font-bold text-slate-200">R$ {showDetailDrawer.originalAmount.toFixed(2)}</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Valor Pago</p>
                  <p className="font-bold text-emerald-400">R$ {showDetailDrawer.paidAmount.toFixed(2)}</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Vencimento</p>
                  <p className="font-semibold text-slate-200">{new Date(showDetailDrawer.dueDate).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                  <p className="text-xs text-slate-500 mb-1">Competência</p>
                  <p className="font-semibold text-slate-200">{new Date(showDetailDrawer.competenceDate).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-sm text-slate-300 border-b border-slate-800 pb-1">Mais Informações</h4>
                <div className="text-sm space-y-2">
                  <p className="flex justify-between"><span className="text-slate-500">Documento / NF:</span> <span className="text-slate-200">{showDetailDrawer.documentNumber || '-'}</span></p>
                  <p className="flex justify-between"><span className="text-slate-500">Método de Pagamento:</span> <span className="text-slate-200">{showDetailDrawer.paymentMethod || '-'}</span></p>
                  <p className="flex justify-between"><span className="text-slate-500">Código de Barras:</span> <span className="text-slate-200 truncate ml-4" title={showDetailDrawer.barcode}>{showDetailDrawer.barcode || '-'}</span></p>
                  <p className="flex flex-col gap-1 mt-2">
                    <span className="text-slate-500">Observações:</span>
                    <span className="text-slate-300 bg-slate-800/30 p-2 rounded text-xs min-h-[40px]">{showDetailDrawer.notes || '-'}</span>
                  </p>
                </div>
              </div>

              {showDetailDrawer.payments && showDetailDrawer.payments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-300 border-b border-slate-800 pb-1">Histórico de Pagamentos</h4>
                  <div className="space-y-2">
                    {showDetailDrawer.payments.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-slate-800/50 rounded border border-slate-800 text-xs">
                        <div>
                          <p className="font-semibold text-slate-200">{new Date(p.paymentDate).toLocaleDateString('pt-BR')}</p>
                          <p className="text-slate-500">{p.paymentMethod}</p>
                        </div>
                        <span className="font-bold text-emerald-400">R$ {p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-800 bg-slate-900 flex gap-3">
              {showDetailDrawer.status !== 'PAID' && showDetailDrawer.status !== 'CANCELLED' && (
                <button
                  onClick={() => {
                    setSelectedTitleForPay(showDetailDrawer);
                    setPayForm({ ...payForm, amount: (showDetailDrawer.originalAmount - showDetailDrawer.paidAmount).toString() });
                    setShowPayModal(true);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-sm transition"
                >
                  Quitar / Baixar Título
                </button>
              )}
              <button
                onClick={async () => {
                  if (confirm('Tem certeza que deseja cancelar este título?')) {
                    try {
                      await authFetch(`/api/finance/titles/${showDetailDrawer.id}`, { method: 'DELETE' });
                      setShowDetailDrawer(null);
                      fetchData();
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }}
                className="bg-slate-800 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 font-bold py-2.5 px-4 rounded-lg text-sm transition border border-rose-500/20"
                title="Cancelar Título"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
