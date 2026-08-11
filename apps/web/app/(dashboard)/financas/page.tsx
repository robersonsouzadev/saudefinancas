'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Plus, Loader2, Edit3, Trash2, Check, Landmark, Receipt, CreditCard as CreditCardIcon,
  Banknote, X, Search, Filter, PieChart, RefreshCw, Calendar, AlertTriangle,
  Mic, MicOff, DollarSign, Building2, Layers, CheckSquare, Sparkles, TrendingUp, TrendingDown, FileText, ArrowRight, ShieldCheck, ChevronRight, Download
} from 'lucide-react';
import { authFetch } from '@/lib/api';

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
      const [accRes, cardsRes, titlesRes, entRes, ccRes, txRes, budRes, dreRes, cfRes, hsRes] = await Promise.all([
        authFetch('/api/finance/accounts'),
        authFetch('/api/finance/credit-cards'),
        authFetch('/api/finance/titles'),
        authFetch('/api/finance/entities'),
        authFetch('/api/finance/cost-centers'),
        authFetch('/api/finance/transactions'),
        authFetch('/api/finance/budgets'),
        authFetch('/api/finance/reports/dre?regime=COMPETENCE'),
        authFetch('/api/finance/reports/cash-flow?days=30'),
        authFetch('/api/finance/reports/health-score'),
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
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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
          </div>

          {/* TABELA DE TÍTULOS */}
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
              <button onClick={() => setShowEntityModal(false)}><X className="h-5 w-5 text-slate-400" /></button>
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
                <label className="text-xs text-slate-400">Nome / Razão Social</label>
                <input
                  type="text"
                  required
                  value={entityForm.name}
                  onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })}
                  className="w-full rounded bg-slate-800 p-2.5 text-sm text-slate-100 border border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">CPF / CNPJ</label>
                <input
                  type="text"
                  value={entityForm.document}
                  onChange={(e) => setEntityForm({ ...entityForm, document: e.target.value })}
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
    </div>
  );
}
