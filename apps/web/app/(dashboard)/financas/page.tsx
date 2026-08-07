'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Plus, Loader2, Edit3, Trash2, Check, Landmark, Receipt, CreditCard,
  Smartphone, Banknote, X, PiggyBank, Search, Filter, PieChart, RefreshCw, Calendar, AlertTriangle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { authFetch } from '@/lib/api';

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

interface Boleto {
  id: string;
  description: string;
  dueDate: string;
  barcode?: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

interface TransactionItem {
  id: string;
  date: string;
  description: string;
  category: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BOLETO';
  amount: number;
  user: string;
  method?: string;
  bank?: string;
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

interface RecurringRule {
  id: string;
  description: string;
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  frequency: string;
  dayOfMonth?: number;
  paymentAccount?: { name: string };
  category?: { name: string };
}

export default function FinancasPage() {
  const [activeTab, setActiveTab] = useState<'extrato' | 'boletos' | 'contas' | 'orcamentos' | 'recorrencias'>('extrato');

  // Data States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardItem[]>([]);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [overview, setOverview] = useState({ totalIncome: 0, totalExpenses: 0, netBalance: 0 });
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1));
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));

  // Modal Controls
  const [showTxModal, setShowTxModal] = useState(false);
  const [showQuitarModal, setShowQuitarModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  // Edit Account / Card States
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCardItem | null>(null);

  // Transaction Modal State
  const [txType, setTxType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BOLETO'>('EXPENSE');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txCategory, setTxCategory] = useState('Alimentação');
  const [txMethod, setTxMethod] = useState('CRÉDITO');
  const [txBank, setTxBank] = useState('');
  const [txAccount, setTxAccount] = useState('');
  const [txCard, setTxCard] = useState('');
  const [txInstallments, setTxInstallments] = useState('1');
  const [txDueDate, setTxDueDate] = useState('');
  const [submittingTx, setSubmittingTx] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);

  // Quitar Boleto Modal State
  const [selectedBoleto, setSelectedBoleto] = useState<Boleto | null>(null);
  const [quitarDate, setQuitarDate] = useState('');
  const [quitarAmount, setQuitarAmount] = useState('');
  const [quitarMethod, setQuitarMethod] = useState('PIX');
  const [quitarAccount, setQuitarAccount] = useState('');
  const [submittingQuitar, setSubmittingQuitar] = useState(false);

  // Account Modal State
  const [accName, setAccName] = useState('');
  const [accBank, setAccBank] = useState('Nubank');
  const [accType, setAccType] = useState('CHECKING');
  const [accBalance, setAccBalance] = useState('0');

  // Card Modal State
  const [cardName, setCardName] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardClosing, setCardClosing] = useState('1');
  const [cardDue, setCardDue] = useState('10');
  const [cardAccount, setCardAccount] = useState('');

  // Budget Modal State
  const [budCategory, setBudCategory] = useState('Alimentação');
  const [budLimit, setBudLimit] = useState('');

  // Recurring Modal State
  const [recDesc, setRecDesc] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recType, setRecType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [recFreq, setRecFreq] = useState('MONTHLY');
  const [recDay, setRecDay] = useState('5');

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (filterCategory !== 'ALL') queryParams.append('categoryId', filterCategory);
      if (filterMonth && filterYear) {
        queryParams.append('month', filterMonth);
        queryParams.append('year', filterYear);
      }

      const [accRes, ccRes, bolRes, txRes, ovRes, budRes, recRes] = await Promise.all([
        authFetch('/api/finance/accounts').catch(() => ({ ok: false, json: async () => [] })),
        authFetch('/api/finance/credit-cards').catch(() => ({ ok: false, json: async () => [] })),
        authFetch('/api/finance/boletos').catch(() => ({ ok: false, json: async () => [] })),
        authFetch(`/api/finance/transactions?${queryParams.toString()}`).catch(() => ({ ok: false, json: async () => [] })),
        authFetch('/api/finance/overview').catch(() => ({ ok: false, json: async () => ({ totalIncome: 0, totalExpenses: 0, netBalance: 0 }) })),
        authFetch('/api/finance/budgets').catch(() => ({ ok: false, json: async () => [] })),
        authFetch('/api/finance/recurring').catch(() => ({ ok: false, json: async () => [] }))
      ]);

      if (accRes.ok) setAccounts(await accRes.json());
      if (ccRes.ok) setCreditCards(await ccRes.json());
      if (bolRes.ok) setBoletos(await bolRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
      if (ovRes.ok) setOverview(await ovRes.json());
      if (budRes.ok) setBudgets(await budRes.json());
      if (recRes.ok) setRecurringRules(await recRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCategory, filterMonth, filterYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Handlers for Accounts
  const handleOpenAccountModal = (acc?: Account) => {
    if (acc) {
      setEditingAccount(acc);
      setAccName(acc.name);
      setAccBank(acc.bankName || 'Nubank');
      setAccType(acc.accountType || 'CHECKING');
      setAccBalance(String(acc.balance));
    } else {
      setEditingAccount(null);
      setAccName('');
      setAccBank('Nubank');
      setAccType('CHECKING');
      setAccBalance('0');
    }
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = editingAccount ? `/api/finance/accounts/${editingAccount.id}` : '/api/finance/accounts';
      const method = editingAccount ? 'PUT' : 'POST';
      await authFetch(endpoint, {
        method,
        body: JSON.stringify({
          name: accName,
          bankName: accBank,
          accountType: accType,
          balance: parseFloat(accBalance || '0')
        })
      });
      setShowAccountModal(false);
      fetchAll();
    } catch (err) { console.error(err); }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Excluir esta conta bancária?')) return;
    try {
      await authFetch(`/api/finance/accounts/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (err) { console.error(err); }
  };

  // Handlers for Cards
  const handleOpenCardModal = (card?: CreditCardItem) => {
    if (card) {
      setEditingCard(card);
      setCardName(card.name);
      setCardLimit(String(card.creditLimit));
      setCardClosing(String(card.closingDay));
      setCardDue(String(card.dueDay));
      setCardAccount(accounts[0]?.id || '');
    } else {
      setEditingCard(null);
      setCardName('');
      setCardLimit('');
      setCardClosing('1');
      setCardDue('10');
      setCardAccount(accounts[0]?.id || '');
    }
    setShowCardModal(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = editingCard ? `/api/finance/credit-cards/${editingCard.id}` : '/api/finance/credit-cards';
      const method = editingCard ? 'PUT' : 'POST';
      await authFetch(endpoint, {
        method,
        body: JSON.stringify({
          paymentAccountId: cardAccount || undefined,
          name: cardName,
          creditLimit: parseFloat(cardLimit || '0'),
          closingDay: parseInt(cardClosing, 10),
          dueDay: parseInt(cardDue, 10)
        })
      });
      setShowCardModal(false);
      fetchAll();
    } catch (err) { console.error(err); }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Excluir este cartão de crédito?')) return;
    try {
      await authFetch(`/api/finance/credit-cards/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (err) { console.error(err); }
  };

  // Handlers for Transactions
  const handleOpenTx = (tx?: TransactionItem) => {
    if (tx) {
      setEditingTx(tx);
      setTxType(tx.type || 'EXPENSE');
      setTxAmount(String(tx.amount));
      setTxDescription(tx.description);
      setTxCategory(tx.category || 'Alimentação');
      setTxMethod(tx.method || 'CRÉDITO');
      setTxBank(tx.bank || '');
    } else {
      setEditingTx(null);
      setTxType('EXPENSE');
      setTxAmount('');
      setTxDescription('');
      setTxCategory('Alimentação');
      setTxMethod('CRÉDITO');
      setTxBank('');
      setTxAccount(accounts[0]?.id || '');
      setTxCard(creditCards[0]?.id || '');
      setTxInstallments('1');
      setTxDueDate('');
    }
    setShowTxModal(true);
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTx(true);
    try {
      const endpoint = editingTx ? `/api/finance/transactions/${editingTx.id}` : '/api/finance/transactions';
      const method = editingTx ? 'PUT' : 'POST';
      await authFetch(endpoint, {
        method,
        body: JSON.stringify({
          type: txType,
          amount: parseFloat(txAmount),
          description: txDescription,
          category: txCategory,
          paymentMethod: txMethod === 'CRÉDITO' ? 'CREDIT_CARD' : txMethod === 'DÉBITO' ? 'DEBIT_CARD' : txMethod,
          paymentAccountId: txAccount || undefined,
          creditCardId: txCard || undefined,
          installments: parseInt(txInstallments),
          dueDate: txDueDate
        })
      });
      setShowTxModal(false);
      fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingTx(false);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authFetch('/api/finance/budgets', {
        method: 'POST',
        body: JSON.stringify({
          category: budCategory,
          amount: parseFloat(budLimit)
        })
      });
      setShowBudgetModal(false);
      setBudLimit('');
      fetchAll();
    } catch (err) { console.error(err); }
  };

  const handleSaveRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authFetch('/api/finance/recurring', {
        method: 'POST',
        body: JSON.stringify({
          description: recDesc,
          amount: parseFloat(recAmount),
          type: recType,
          frequency: recFreq,
          dayOfMonth: parseInt(recDay, 10)
        })
      });
      setShowRecurringModal(false);
      setRecDesc('');
      setRecAmount('');
      fetchAll();
    } catch (err) { console.error(err); }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Remover orçamento?')) return;
    try {
      await authFetch(`/api/finance/budgets/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (err) {}
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!confirm('Remover conta recorrente?')) return;
    try {
      await authFetch(`/api/finance/recurring/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (err) {}
  };

  const handleOpenQuitar = (boleto: Boleto) => {
    setSelectedBoleto(boleto);
    setQuitarDate(new Date().toISOString().split('T')[0]);
    setQuitarAmount(String(boleto.amount));
    setQuitarMethod('PIX');
    setQuitarAccount(accounts[0]?.id || '');
    setShowQuitarModal(true);
  };

  const handleQuitarBoleto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBoleto) return;
    setSubmittingQuitar(true);
    try {
      await authFetch(`/api/finance/boletos/${selectedBoleto.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          paymentDate: quitarDate,
          amountPaid: parseFloat(quitarAmount),
          method: quitarMethod,
          accountId: quitarAccount
        })
      });
      setShowQuitarModal(false);
      fetchAll();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingQuitar(false);
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Excluir transação?')) return;
    try {
      await authFetch(`/api/finance/transactions/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (err) {}
  };

  const bankColors: Record<string, string> = {
    'Nubank': '#820ad1',
    'Itaú': '#ec7000',
    'Bradesco': '#cc092f',
    'Santander': '#cc0000',
    'XP': '#000000',
    'Carteira': '#22c55e'
  };

  const categoryIcons: Record<string, string> = {
    'Alimentação': '🍔', 'Moradia': '🏠', 'Transporte': '🚗', 'Saúde': '🏥',
    'Lazer': '🎉', 'Salário': '💰', 'Investimentos': '📈', 'Outros': '📦'
  };

  const getBankColor = (b?: string) => b ? bankColors[b] || '#5e6ad2' : '#5e6ad2';

  const pendingBoletosCount = boletos.filter(b => b.status === 'PENDING').length;

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#22c55e]">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">Finanças Avançadas</h1>
            <p className="text-xs text-[#8a8f98]">Gestão completa: Contas, Cartões, Orçamentos, Boletos e Recorrências</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => handleOpenTx()} className="h-8 px-4 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Transação Rápida</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0f1115] border border-[#ffffff14] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#8a8f98] font-bold uppercase tracking-wider">Saldo Líquido em Contas</span>
            <div className="text-2xl font-bold font-mono text-[#f7f8f8] mt-1">{formatBRL(overview.netBalance)}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center text-[#22c55e]">
            <Landmark className="w-5 h-5" />
          </div>
        </div>
        <div className="p-4 bg-[#0f1115] border border-[#ffffff14] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#8a8f98] font-bold uppercase tracking-wider">Entradas no Mês</span>
            <div className="text-2xl font-bold font-mono text-[#4ade80] mt-1 flex items-center">
              <ArrowUpRight className="w-4 h-4 mr-1" /> {formatBRL(overview.totalIncome)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/20 flex items-center justify-center text-[#4ade80]">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="p-4 bg-[#0f1115] border border-[#ffffff14] rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-[#8a8f98] font-bold uppercase tracking-wider">Saídas no Mês</span>
            <div className="text-2xl font-bold font-mono text-[#f87171] mt-1 flex items-center">
              <ArrowDownRight className="w-4 h-4 mr-1" /> {formatBRL(overview.totalExpenses)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-[#f87171]/10 border border-[#f87171]/20 flex items-center justify-center text-[#f87171]">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TOP CAROUSEL: Minhas Contas & Cartões */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold flex items-center"><Landmark className="w-4 h-4 mr-2 text-[#8a8f98]"/> Minhas Contas & Cartões</h2>
          <div className="flex space-x-2">
            <button onClick={() => handleOpenAccountModal()} className="text-[11px] text-[#5e6ad2] hover:underline font-medium flex items-center">
              + Nova Conta
            </button>
            <span className="text-[#8a8f98]">•</span>
            <button onClick={() => handleOpenCardModal()} className="text-[11px] text-[#5e6ad2] hover:underline font-medium flex items-center">
              + Novo Cartão
            </button>
          </div>
        </div>
        <div className="flex space-x-4 overflow-x-auto pb-4 hide-scrollbar">
          {/* Accounts */}
          {accounts.map(acc => (
            <div key={acc.id} className="min-w-[210px] flex-shrink-0 p-4 rounded-xl border border-[#ffffff14] bg-[#0f1115] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: getBankColor(acc.bankName) }} />
              <div className="flex justify-between items-start mb-3 pl-2">
                <div>
                  <span className="text-xs font-semibold block">{acc.name}</span>
                  <span className="text-[10px] text-[#8a8f98]">{acc.bankName || 'Banco'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button onClick={() => handleOpenAccountModal(acc)} className="text-[#8a8f98] hover:text-[#5e6ad2] p-1"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteAccount(acc.id)} className="text-[#8a8f98] hover:text-[#f87171] p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="pl-2">
                <span className="text-[10px] text-[#8a8f98] uppercase font-bold">Saldo Disponível</span>
                <div className="text-lg font-bold font-mono text-[#f7f8f8]">{formatBRL(acc.balance)}</div>
              </div>
            </div>
          ))}
          {/* Credit Cards */}
          {creditCards.map(cc => (
            <div key={cc.id} className="min-w-[210px] flex-shrink-0 p-4 rounded-xl border border-[#ffffff14] bg-[#0f1115] relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: getBankColor(cc.name) }} />
              <div className="flex justify-between items-start mb-3 pl-2">
                <div>
                  <span className="text-xs font-semibold block">{cc.name}</span>
                  <span className="text-[10px] text-[#8a8f98]">Venc. dia {cc.dueDay}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button onClick={() => handleOpenCardModal(cc)} className="text-[#8a8f98] hover:text-[#5e6ad2] p-1"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDeleteCard(cc.id)} className="text-[#8a8f98] hover:text-[#f87171] p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="pl-2">
                <span className="text-[10px] text-[#8a8f98] uppercase font-bold">Fatura Atual</span>
                <div className="text-lg font-bold font-mono text-[#f87171]">{formatBRL(cc.usedLimit || 0)}</div>
                <div className="text-[10px] text-[#8a8f98] mt-1">Limite Livre: {formatBRL(cc.availableLimit || 0)}</div>
              </div>
            </div>
          ))}
          <button onClick={() => handleOpenAccountModal()} className="min-w-[150px] flex-shrink-0 p-4 rounded-xl border border-dashed border-[#ffffff20] flex flex-col items-center justify-center text-[#8a8f98] hover:text-[#f7f8f8] hover:border-[#ffffff40] transition">
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">+ Adicionar</span>
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex space-x-1 border-b border-[#ffffff14] overflow-x-auto hide-scrollbar">
        <button onClick={() => setActiveTab('extrato')} className={`px-4 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap ${activeTab === 'extrato' ? 'border-[#5e6ad2] text-[#f7f8f8]' : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8]'}`}>
          Extrato de Transações
        </button>
        <button onClick={() => setActiveTab('boletos')} className={`px-4 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap flex items-center ${activeTab === 'boletos' ? 'border-[#5e6ad2] text-[#f7f8f8]' : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8]'}`}>
          📄 Boletos a Pagar
          {pendingBoletosCount > 0 && <span className="ml-2 bg-[#f87171] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">{pendingBoletosCount}</span>}
        </button>
        <button onClick={() => setActiveTab('contas')} className={`px-4 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap ${activeTab === 'contas' ? 'border-[#5e6ad2] text-[#f7f8f8]' : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8]'}`}>
          🏦 Contas & Cartões
        </button>
        <button onClick={() => setActiveTab('orcamentos')} className={`px-4 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap ${activeTab === 'orcamentos' ? 'border-[#5e6ad2] text-[#f7f8f8]' : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8]'}`}>
          📊 Orçamentos por Categoria
        </button>
        <button onClick={() => setActiveTab('recorrencias')} className={`px-4 py-2 text-xs font-medium border-b-2 transition whitespace-nowrap ${activeTab === 'recorrencias' ? 'border-[#5e6ad2] text-[#f7f8f8]' : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8]'}`}>
          🔄 Contas Recorrentes
        </button>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
         <div className="py-12 flex justify-center items-center text-xs text-[#8a8f98]"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...</div>
      ) : (
        <>
          {/* EXTRATO DE TRANSAÇÕES */}
          {activeTab === 'extrato' && (
            <div className="space-y-4 pt-2">
              {/* Filter Controls Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0f1115] p-3 rounded-lg border border-[#ffffff14]">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8a8f98]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar transação..."
                    className="w-full h-9 pl-9 pr-3 bg-[#16191e] border border-[#ffffff14] rounded-md text-xs focus:outline-none focus:border-[#5e6ad2] placeholder-[#575c66]"
                  />
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md text-xs focus:outline-none"
                  >
                    <option value="ALL">Todas as Categorias</option>
                    {Object.keys(categoryIcons).map(c => <option key={c} value={c}>{categoryIcons[c]} {c}</option>)}
                  </select>
                  <select
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    className="h-9 px-2 bg-[#16191e] border border-[#ffffff14] rounded-md text-xs focus:outline-none"
                  >
                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, idx) => (
                      <option key={idx} value={String(idx + 1)}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                    className="h-9 px-2 bg-[#16191e] border border-[#ffffff14] rounded-md text-xs focus:outline-none"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-[#0f1115] border border-[#ffffff14] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#16191e] border-b border-[#ffffff14] text-[#8a8f98] font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Descrição</th>
                      <th className="p-3">Categoria</th>
                      <th className="p-3">Método / Conta</th>
                      <th className="p-3 text-right">Valor</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ffffff0a]">
                    {transactions.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-[#8a8f98]">Nenhuma transação encontrada para este filtro.</td></tr>
                    ) : transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-[#16191e] transition">
                        <td className="p-3 font-mono text-[#8a8f98]">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-3 font-medium">{tx.description}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#16191e] border border-[#ffffff0a] text-[11px]">
                            <span className="mr-1">{categoryIcons[tx.category] || '📦'}</span>
                            {tx.category}
                          </span>
                        </td>
                        <td className="p-3 flex items-center space-x-2">
                          <span className="text-[10px] uppercase font-bold text-[#8a8f98] flex items-center">
                            {tx.method === 'CREDIT_CARD' || tx.method === 'CRÉDITO' ? <CreditCard className="w-3 h-3 mr-1"/> : null}
                            {tx.method === 'DEBIT_CARD' || tx.method === 'DÉBITO' ? <Landmark className="w-3 h-3 mr-1"/> : null}
                            {tx.method === 'PIX' ? <Smartphone className="w-3 h-3 mr-1"/> : null}
                            {tx.method === 'BOLETO' ? <Receipt className="w-3 h-3 mr-1"/> : null}
                            {tx.method}
                          </span>
                          {tx.bank && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: getBankColor(tx.bank)+'33', color: getBankColor(tx.bank) }}>
                              {tx.bank}
                            </span>
                          )}
                        </td>
                        <td className={`p-3 text-right font-mono font-bold ${tx.type === 'INCOME' ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'} {formatBRL(tx.amount)}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button onClick={() => handleOpenTx(tx)} className="text-[#8a8f98] hover:text-[#5e6ad2]"><Edit3 className="w-3.5 h-3.5 inline" /></button>
                          <button onClick={() => handleDeleteTx(tx.id)} className="text-[#8a8f98] hover:text-[#f87171]"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BOLETOS A PAGAR */}
          {activeTab === 'boletos' && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[#0f1115] border border-[#ffffff14] rounded-lg">
                  <div className="text-[11px] text-[#8a8f98] uppercase font-semibold">Total Pendente</div>
                  <div className="text-2xl font-bold font-mono text-[#f7f8f8] mt-1">
                    {formatBRL(boletos.filter(b=>b.status==='PENDING').reduce((a,b)=>a+b.amount,0))}
                  </div>
                </div>
                <div className="p-4 bg-[#0f1115] border border-[#ffffff14] rounded-lg">
                  <div className="text-[11px] text-[#8a8f98] uppercase font-semibold">Vencendo Hoje</div>
                  <div className="text-2xl font-bold font-mono text-[#fbbf24] mt-1">
                    {boletos.filter(b=>b.status==='PENDING' && b.dueDate === new Date().toISOString().split('T')[0]).length}
                  </div>
                </div>
                <div className="p-4 bg-[#0f1115] border border-[#ffffff14] rounded-lg">
                  <div className="text-[11px] text-[#8a8f98] uppercase font-semibold">Atrasados</div>
                  <div className="text-2xl font-bold font-mono text-[#f87171] mt-1">
                    {boletos.filter(b=>b.status==='OVERDUE').length}
                  </div>
                </div>
              </div>

              <div className="bg-[#0f1115] border border-[#ffffff14] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#16191e] border-b border-[#ffffff14] text-[#8a8f98] font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Descrição</th>
                      <th className="p-3">Vencimento</th>
                      <th className="p-3">Cód. Barras</th>
                      <th className="p-3 text-right">Valor</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ffffff0a]">
                    {boletos.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-[#8a8f98]">Nenhum boleto registrado.</td></tr>
                    ) : boletos.map(b => (
                      <tr key={b.id} className="hover:bg-[#16191e] transition">
                        <td className="p-3 font-medium">{b.description}</td>
                        <td className="p-3 font-mono text-[#8a8f98]">{new Date(b.dueDate).toLocaleDateString('pt-BR')}</td>
                        <td className="p-3 font-mono text-[10px] text-[#575c66] truncate max-w-[150px]">{b.barcode || '—'}</td>
                        <td className="p-3 text-right font-mono font-bold">{formatBRL(b.amount)}</td>
                        <td className="p-3 text-center">
                          {b.status === 'PENDING' && <span className="px-2 py-0.5 rounded-full bg-[#fbbf24] text-black text-[10px] font-bold">PENDENTE 🟡</span>}
                          {b.status === 'PAID' && <span className="px-2 py-0.5 rounded-full bg-[#4ade80] text-black text-[10px] font-bold">PAGO 🟢</span>}
                          {b.status === 'OVERDUE' && <span className="px-2 py-0.5 rounded-full bg-[#f87171] text-white text-[10px] font-bold">ATRASADO 🔴</span>}
                        </td>
                        <td className="p-3 text-right">
                          {b.status !== 'PAID' && (
                            <button onClick={() => handleOpenQuitar(b)} className="px-3 py-1 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded text-[11px] font-bold transition flex items-center ml-auto">
                              <Check className="w-3 h-3 mr-1" /> Quitar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONTAS & CARTÕES */}
          {activeTab === 'contas' && (
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-[#f7f8f8]">Contas Bancárias & Carteiras</h3>
                <button onClick={() => handleOpenAccountModal()} className="px-3 py-1.5 bg-[#5e6ad2] text-white text-xs font-medium rounded-lg flex items-center">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Nova Conta
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {accounts.map(acc => (
                  <div key={acc.id} className="p-4 bg-[#0f1115] border border-[#ffffff14] rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">{acc.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#16191e] border border-[#ffffff14] text-[#8a8f98]">{acc.bankName || 'Banco'}</span>
                        <button onClick={() => handleOpenAccountModal(acc)} className="text-[#8a8f98] hover:text-[#5e6ad2] p-1"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteAccount(acc.id)} className="text-[#8a8f98] hover:text-[#f87171] p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#8a8f98] uppercase">Saldo Atual</div>
                      <div className="text-xl font-bold font-mono text-[#f7f8f8]">{formatBRL(acc.balance)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-4">
                <h3 className="text-sm font-bold text-[#f7f8f8]">Cartões de Crédito</h3>
                <button onClick={() => handleOpenCardModal()} className="px-3 py-1.5 bg-[#5e6ad2] text-white text-xs font-medium rounded-lg flex items-center">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Novo Cartão
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {creditCards.map(cc => (
                  <div key={cc.id} className="p-4 bg-[#0f1115] border border-[#ffffff14] rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">{cc.name}</span>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleOpenCardModal(cc)} className="text-[#8a8f98] hover:text-[#5e6ad2] p-1"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteCard(cc.id)} className="text-[#8a8f98] hover:text-[#f87171] p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] text-[#8a8f98] uppercase">Fatura Atual</div>
                        <div className="text-base font-bold font-mono text-[#f87171]">{formatBRL(cc.usedLimit || 0)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#8a8f98] uppercase">Limite Disponível</div>
                        <div className="text-base font-bold font-mono text-[#4ade80]">{formatBRL(cc.availableLimit || 0)}</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#8a8f98] border-t border-[#ffffff0a] pt-2 flex justify-between">
                      <span>Fechamento: dia {cc.closingDay}</span>
                      <span>Vencimento: dia {cc.dueDay}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ORÇAMENTOS POR CATEGORIA */}
          {activeTab === 'orcamentos' && (
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-[#f7f8f8]">Orçamentos de Gastos Mensais</h3>
                  <p className="text-xs text-[#8a8f98]">Defina limites por categoria e acompanhe o progresso em tempo real.</p>
                </div>
                <button onClick={() => setShowBudgetModal(true)} className="px-3 py-1.5 bg-[#5e6ad2] text-white text-xs font-medium rounded-lg flex items-center">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Definir Orçamento
                </button>
              </div>

              {budgets.length === 0 ? (
                <div className="p-8 text-center text-[#8a8f98] border border-dashed border-[#ffffff14] rounded-lg bg-[#0f1115]">
                  Nenhum orçamento cadastrado. Clique em "+ Definir Orçamento" para começar.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {budgets.map(b => (
                    <div key={b.id} className="p-4 bg-[#0f1115] border border-[#ffffff14] rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm flex items-center">
                          <span className="mr-2">{categoryIcons[b.category] || '📦'}</span>
                          {b.category}
                        </span>
                        <div className="flex items-center space-x-2">
                          {b.isExceeded && (
                            <span className="px-2 py-0.5 rounded bg-[#f87171]/20 text-[#f87171] text-[10px] font-bold flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Estourado
                            </span>
                          )}
                          <button onClick={() => handleDeleteBudget(b.id)} className="text-[#8a8f98] hover:text-[#f87171]">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span>{formatBRL(b.spent)} de {formatBRL(b.amount)}</span>
                          <span className={b.isExceeded ? 'text-[#f87171] font-bold' : 'text-[#8a8f98]'}>{b.percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#16191e] rounded-full overflow-hidden border border-[#ffffff0a]">
                          <div
                            className={`h-full rounded-full transition-all ${b.isExceeded ? 'bg-[#f87171]' : b.percentage > 80 ? 'bg-[#fbbf24]' : 'bg-[#22c55e]'}`}
                            style={{ width: `${Math.min(100, b.percentage)}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-[10px] text-[#8a8f98]">
                        {b.isExceeded
                          ? `Excedido em ${formatBRL(b.spent - b.amount)}`
                          : `Restante disponível: ${formatBRL(b.remaining)}`
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONTAS RECORRENTES */}
          {activeTab === 'recorrencias' && (
            <div className="space-y-6 pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-[#f7f8f8]">Contas Fixas & Assinaturas Recorrentes</h3>
                  <p className="text-xs text-[#8a8f98]">Controle despesas e receitas fixas automáticas (aluguel, internet, assinaturas).</p>
                </div>
                <button onClick={() => setShowRecurringModal(true)} className="px-3 py-1.5 bg-[#5e6ad2] text-white text-xs font-medium rounded-lg flex items-center">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Nova Recorrência
                </button>
              </div>

              {recurringRules.length === 0 ? (
                <div className="p-8 text-center text-[#8a8f98] border border-dashed border-[#ffffff14] rounded-lg bg-[#0f1115]">
                  Nenhuma regra de recorrência cadastrada.
                </div>
              ) : (
                <div className="bg-[#0f1115] border border-[#ffffff14] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#16191e] border-b border-[#ffffff14] text-[#8a8f98] font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Descrição</th>
                        <th className="p-3">Frequência</th>
                        <th className="p-3">Dia de Vencimento</th>
                        <th className="p-3 text-right">Valor</th>
                        <th className="p-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffffff0a]">
                      {recurringRules.map(r => (
                        <tr key={r.id} className="hover:bg-[#16191e] transition">
                          <td className="p-3 font-medium">{r.description}</td>
                          <td className="p-3 uppercase text-[10px] text-[#8a8f98] font-bold">{r.frequency}</td>
                          <td className="p-3">Dia {r.dayOfMonth || 1}</td>
                          <td className={`p-3 text-right font-mono font-bold ${r.type === 'INCOME' ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                            {r.type === 'INCOME' ? '+' : '-'} {formatBRL(r.amount)}
                          </td>
                          <td className="p-3 text-right">
                            <button onClick={() => handleDeleteRecurring(r.id)} className="text-[#8a8f98] hover:text-[#f87171]">
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* YNAB TRANSACTION MODAL */}
      {showTxModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setShowTxModal(false)} className="absolute top-4 right-4 text-[#8a8f98] hover:text-[#f7f8f8]"><X className="w-5 h-5"/></button>
            <h3 className="text-lg font-bold mb-4">{editingTx ? 'Editar Transação' : 'Nova Transação Rápida'}</h3>

            <form onSubmit={handleSaveTx} className="space-y-4">
              <div className="flex bg-[#16191e] rounded-lg p-1 border border-[#ffffff14]">
                {['EXPENSE', 'INCOME', 'TRANSFER', 'BOLETO'].map((t) => (
                  <button 
                    key={t} type="button" onClick={() => setTxType(t as any)}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition ${txType === t ? (t==='EXPENSE'||t==='BOLETO' ? 'bg-[#f87171] text-white' : t==='INCOME' ? 'bg-[#4ade80] text-black' : 'bg-[#5e6ad2] text-white') : 'text-[#8a8f98] hover:bg-[#ffffff0a]'}`}
                  >
                    {t==='EXPENSE' && '💸 Despesa'}
                    {t==='INCOME' && '💰 Receita'}
                    {t==='TRANSFER' && '↔️ Transf.'}
                    {t==='BOLETO' && '📄 Boleto'}
                  </button>
                ))}
              </div>

              <div className="bg-[#16191e] p-4 rounded-lg border border-[#ffffff14] space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-[#8a8f98]">R$</span>
                  <input type="number" step="0.01" value={txAmount} onChange={e=>setTxAmount(e.target.value)} placeholder="0.00" required
                    className="w-full bg-transparent text-4xl font-bold font-mono focus:outline-none placeholder-[#3a3f4a]" />
                </div>
                <input type="text" value={txDescription} onChange={e=>setTxDescription(e.target.value)} placeholder="O que foi isso? (Descrição)" required
                  className="w-full bg-transparent text-sm border-b border-[#ffffff14] pb-2 focus:outline-none focus:border-[#5e6ad2] placeholder-[#575c66]" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#8a8f98] mb-1">Categoria</label>
                  <select value={txCategory} onChange={e=>setTxCategory(e.target.value)} className="w-full h-10 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md text-xs focus:outline-none">
                    {Object.keys(categoryIcons).map(c => <option key={c} value={c}>{categoryIcons[c]} {c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#8a8f98] mb-1">Método de Pgto</label>
                  <select value={txMethod} onChange={e=>setTxMethod(e.target.value)} className="w-full h-10 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md text-xs focus:outline-none">
                    <option value="CRÉDITO">💳 Cartão de Crédito</option>
                    <option value="DÉBITO">💳 Cartão de Débito</option>
                    <option value="PIX">📱 PIX</option>
                    <option value="DINHEIRO">💵 Dinheiro em Espécie</option>
                    <option value="BOLETO">📄 Boleto</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#16191e] p-3 rounded-lg border border-[#ffffff14] grid grid-cols-2 gap-4">
                {txMethod === 'CRÉDITO' ? (
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-[#8a8f98] mb-1">Cartão de Crédito</label>
                    <select value={txCard} onChange={e=>setTxCard(e.target.value)} className="w-full h-9 px-2 bg-[#0f1115] border border-[#ffffff14] rounded text-xs focus:outline-none">
                      <option value="">Selecione o cartão...</option>
                      {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-[#8a8f98] mb-1">Conta Bancária</label>
                    <select value={txAccount} onChange={e=>setTxAccount(e.target.value)} className="w-full h-9 px-2 bg-[#0f1115] border border-[#ffffff14] rounded text-xs focus:outline-none">
                      <option value="">Selecione a conta...</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <button type="submit" disabled={submittingTx} className="w-full h-12 bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-bold rounded-lg shadow-lg flex items-center justify-center transition">
                {submittingTx ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingTx ? 'Salvar Alterações' : 'Lançar Transação')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ACCOUNT MODAL (CREATE & EDIT) */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowAccountModal(false)} className="absolute top-4 right-4 text-[#8a8f98] hover:text-[#f7f8f8]"><X className="w-5 h-5"/></button>
            <h3 className="text-base font-bold mb-4">{editingAccount ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</h3>

            <form onSubmit={handleSaveAccount} className="space-y-3 text-xs">
              <div>
                <label className="block uppercase font-bold text-[#8a8f98] mb-1">Nome da Conta</label>
                <input type="text" value={accName} onChange={e=>setAccName(e.target.value)} placeholder="Ex: Conta Corrente Principal" required className="w-full h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md focus:outline-none" />
              </div>
              <div>
                <label className="block uppercase font-bold text-[#8a8f98] mb-1">Instituição / Banco</label>
                <input type="text" value={accBank} onChange={e=>setAccBank(e.target.value)} placeholder="Ex: Nubank, Bradesco, Itaú" required className="w-full h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md focus:outline-none" />
              </div>
              <div>
                <label className="block uppercase font-bold text-[#8a8f98] mb-1">Saldo Atual (R$)</label>
                <input type="number" step="0.01" value={accBalance} onChange={e=>setAccBalance(e.target.value)} required className="w-full h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md font-mono font-bold focus:outline-none text-[#22c55e]" />
              </div>
              <button type="submit" className="w-full h-10 mt-2 bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-bold rounded-lg transition">
                {editingAccount ? 'Atualizar Saldo e Dados' : 'Criar Conta'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREDIT CARD MODAL (CREATE & EDIT) */}
      {showCardModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowCardModal(false)} className="absolute top-4 right-4 text-[#8a8f98] hover:text-[#f7f8f8]"><X className="w-5 h-5"/></button>
            <h3 className="text-base font-bold mb-4">{editingCard ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}</h3>

            <form onSubmit={handleSaveCard} className="space-y-3 text-xs">
              <div>
                <label className="block uppercase font-bold text-[#8a8f98] mb-1">Conta Vinculada</label>
                <select value={cardAccount} onChange={e=>setCardAccount(e.target.value)} required className="w-full h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md focus:outline-none">
                  <option value="">Selecione...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block uppercase font-bold text-[#8a8f98] mb-1">Nome do Cartão</label>
                <input type="text" value={cardName} onChange={e=>setCardName(e.target.value)} placeholder="Ex: Nubank Violeta" required className="w-full h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md focus:outline-none" />
              </div>
              <div>
                <label className="block uppercase font-bold text-[#8a8f98] mb-1">Limite Total (R$)</label>
                <input type="number" step="0.01" value={cardLimit} onChange={e=>setCardLimit(e.target.value)} required className="w-full h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md font-mono font-bold focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block uppercase font-bold text-[#8a8f98] mb-1">Dia Fechamento</label>
                  <input type="number" min="1" max="31" value={cardClosing} onChange={e=>setCardClosing(e.target.value)} required className="w-full h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md focus:outline-none" />
                </div>
                <div>
                  <label className="block uppercase font-bold text-[#8a8f98] mb-1">Dia Vencimento</label>
                  <input type="number" min="1" max="31" value={cardDue} onChange={e=>setCardDue(e.target.value)} required className="w-full h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md focus:outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full h-10 mt-2 bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-bold rounded-lg transition">
                {editingCard ? 'Salvar Alterações' : 'Criar Cartão'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BUDGET MODAL */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowBudgetModal(false)} className="absolute top-4 right-4 text-[#8a8f98] hover:text-[#f7f8f8]"><X className="w-5 h-5"/></button>
            <h3 className="text-base font-bold mb-4">Definir Orçamento Categoria</h3>

            <form onSubmit={handleSaveBudget} className="space-y-3 text-xs">
              <div>
                <label className="block uppercase font-bold text-[#8a8f98] mb-1">Categoria</label>
                <select value={budCategory} onChange={e=>setBudCategory(e.target.value)} className="w-full h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md focus:outline-none">
                  {Object.keys(categoryIcons).map(c => <option key={c} value={c}>{categoryIcons[c]} {c}</option>)}
                </select>
              </div>
              <div>
                <label className="block uppercase font-bold text-[#8a8f98] mb-1">Limite Mensal (R$)</label>
                <input type="number" step="0.01" value={budLimit} onChange={e=>setBudLimit(e.target.value)} placeholder="Ex: 1000.00" required className="w-full h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md font-mono font-bold focus:outline-none" />
              </div>
              <button type="submit" className="w-full h-10 mt-2 bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-bold rounded-lg transition">Salvar Orçamento</button>
            </form>
          </div>
        </div>
      )}

      {/* RECURRING MODAL */}
      {showRecurringModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowRecurringModal(false)} className="absolute top-4 right-4 text-[#8a8f98] hover:text-[#f7f8f8]"><X className="w-5 h-5"/></button>
            <h3 className="text-base font-bold mb-4">Nova Conta Recorrente</h3>

            <form onSubmit={handleSaveRecurring} className="space-y-3 text-xs">
              <div>
                <label className="block uppercase font-bold text-[#8a8f98] mb-1">Descrição</label>
                <input type="text" value={recDesc} onChange={e=>setRecDesc(e.target.value)} placeholder="Ex: Aluguel, Netflix, Salário" required className="w-full h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md focus:outline-none" />
              </div>
              <div>
                <label className="block uppercase font-bold text-[#8a8f98] mb-1">Valor (R$)</label>
                <input type="number" step="0.01" value={recAmount} onChange={e=>setRecAmount(e.target.value)} required className="w-full h-9 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md font-mono font-bold focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block uppercase font-bold text-[#8a8f98] mb-1">Tipo</label>
                  <select value={recType} onChange={e=>setRecType(e.target.value as any)} className="w-full h-9 px-2 bg-[#16191e] border border-[#ffffff14] rounded-md focus:outline-none">
                    <option value="EXPENSE">Despesa</option>
                    <option value="INCOME">Receita</option>
                  </select>
                </div>
                <div>
                  <label className="block uppercase font-bold text-[#8a8f98] mb-1">Dia do Mês</label>
                  <input type="number" min="1" max="31" value={recDay} onChange={e=>setRecDay(e.target.value)} required className="w-full h-9 px-2 bg-[#16191e] border border-[#ffffff14] rounded-md focus:outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full h-10 mt-2 bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-bold rounded-lg transition">Salvar Recorrência</button>
            </form>
          </div>
        </div>
      )}

      {/* QUICK DISCHARGE MODAL (Quitar Boleto) */}
      {showQuitarModal && selectedBoleto && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-xl p-6 w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowQuitarModal(false)} className="absolute top-4 right-4 text-[#8a8f98] hover:text-[#f7f8f8]"><X className="w-5 h-5"/></button>
            
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center mx-auto mb-2"><Check className="w-6 h-6" /></div>
              <h3 className="text-lg font-bold">Quitar Boleto</h3>
              <p className="text-xs text-[#8a8f98]">{selectedBoleto.description}</p>
            </div>

            <form onSubmit={handleQuitarBoleto} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#8a8f98] mb-1">Data do Pagamento</label>
                <input type="date" value={quitarDate} onChange={e=>setQuitarDate(e.target.value)} required className="w-full h-10 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md text-xs focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#8a8f98] mb-1">Valor Final Pago (R$)</label>
                <input type="number" step="0.01" value={quitarAmount} onChange={e=>setQuitarAmount(e.target.value)} required className="w-full h-10 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md text-sm font-bold font-mono focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#8a8f98] mb-1">Método</label>
                  <select value={quitarMethod} onChange={e=>setQuitarMethod(e.target.value)} className="w-full h-10 px-2 bg-[#16191e] border border-[#ffffff14] rounded-md text-xs focus:outline-none">
                    <option value="PIX">PIX</option>
                    <option value="DÉBITO">Débito</option>
                    <option value="DINHEIRO">Dinheiro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#8a8f98] mb-1">Conta de Saída</label>
                  <select value={quitarAccount} onChange={e=>setQuitarAccount(e.target.value)} required className="w-full h-10 px-2 bg-[#16191e] border border-[#ffffff14] rounded-md text-xs focus:outline-none">
                    <option value="">Selecione...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={submittingQuitar} className="w-full h-12 mt-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold rounded-lg shadow-lg flex items-center justify-center transition">
                {submittingQuitar ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar Pagamento ✅'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
