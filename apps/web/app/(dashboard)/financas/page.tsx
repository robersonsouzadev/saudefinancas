'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Plus, Loader2, Edit3, Trash2, Check, Landmark, Receipt, CreditCard as CardIcon, CreditCard,
  Smartphone, Banknote, X, PiggyBank
} from 'lucide-react';
import { authFetch } from '@/lib/api';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  bank?: string;
  color?: string;
}

interface CreditCardItem {
  id: string;
  name: string;
  limit: number;
  used: number;
  bank?: string;
  color?: string;
}

interface Boleto {
  id: string;
  description: string;
  dueDate: string;
  barcode: string;
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

export default function FinancasPage() {
  const [activeTab, setActiveTab] = useState<'extrato' | 'boletos' | 'contas'>('extrato');
  
  // Data States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardItem[]>([]);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [overview, setOverview] = useState({ totalIncome: 0, totalExpenses: 0, netBalance: 0 });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showTxModal, setShowTxModal] = useState(false);
  const [showQuitarModal, setShowQuitarModal] = useState(false);
  
  // Transaction Modal State
  const [txType, setTxType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BOLETO'>('EXPENSE');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txCategory, setTxCategory] = useState('Alimentação');
  const [txMethod, setTxMethod] = useState('CRÉDITO');
  const [txBank, setTxBank] = useState('');
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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, ccRes, bolRes, txRes, ovRes] = await Promise.all([
        authFetch('/api/finance/accounts').catch(() => ({ ok: false, json: () => [] })),
        authFetch('/api/finance/credit-cards').catch(() => ({ ok: false, json: () => [] })),
        authFetch('/api/finance/boletos').catch(() => ({ ok: false, json: () => [] })),
        authFetch('/api/finance/transactions').catch(() => ({ ok: false, json: () => [] })),
        authFetch('/api/finance/overview').catch(() => ({ ok: false, json: () => ({ totalIncome: 0, totalExpenses: 0, netBalance: 0 }) }))
      ]);

      if (accRes.ok) setAccounts(await accRes.json());
      if (ccRes.ok) setCreditCards(await ccRes.json());
      if (bolRes.ok) setBoletos(await bolRes.json());
      if (txRes.ok) setTransactions(await txRes.json());
      if (ovRes.ok) setOverview(await ovRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Handlers
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
          method: txMethod,
          bank: txBank,
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

  const handleOpenQuitar = (boleto: Boleto) => {
    setSelectedBoleto(boleto);
    setQuitarDate(new Date().toISOString().split('T')[0]);
    setQuitarAmount(String(boleto.amount));
    setQuitarMethod('PIX');
    setQuitarAccount('');
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
    if(!confirm('Excluir transação?')) return;
    try {
      await authFetch(`/api/finance/transactions/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch(err) {}
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
            <p className="text-xs text-[#8a8f98]">Gestão completa: Contas, Cartões, Boletos e Transações</p>
          </div>
        </div>
        <button onClick={() => handleOpenTx()} className="h-8 px-4 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm">
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Transação Rápida</span>
        </button>
      </div>

      {/* TOP CAROUSEL: Minhas Contas & Cartões */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center"><Landmark className="w-4 h-4 mr-2 text-[#8a8f98]"/> Minhas Contas & Cartões</h2>
        <div className="flex space-x-4 overflow-x-auto pb-4 hide-scrollbar">
          {/* Accounts */}
          {accounts.map(acc => (
            <div key={acc.id} className="min-w-[200px] flex-shrink-0 p-4 rounded-xl border border-[#ffffff14] bg-[#0f1115] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: getBankColor(acc.bank) }} />
              <div className="flex justify-between items-start mb-4 pl-2">
                <span className="text-xs font-semibold">{acc.name}</span>
                <PiggyBank className="w-4 h-4 text-[#8a8f98]" />
              </div>
              <div className="pl-2">
                <span className="text-[10px] text-[#8a8f98] uppercase">Saldo Disponível</span>
                <div className="text-lg font-bold font-mono">R$ {acc.balance.toFixed(2)}</div>
              </div>
            </div>
          ))}
          {/* Credit Cards */}
          {creditCards.map(cc => (
            <div key={cc.id} className="min-w-[200px] flex-shrink-0 p-4 rounded-xl border border-[#ffffff14] bg-[#0f1115] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: getBankColor(cc.bank) }} />
              <div className="flex justify-between items-start mb-4 pl-2">
                <span className="text-xs font-semibold">{cc.name}</span>
                <CreditCard className="w-4 h-4 text-[#8a8f98]" />
              </div>
              <div className="pl-2">
                <span className="text-[10px] text-[#8a8f98] uppercase">Fatura Atual</span>
                <div className="text-lg font-bold font-mono text-[#f87171]">R$ {cc.used.toFixed(2)}</div>
                <div className="text-[10px] text-[#8a8f98] mt-1">Limite Livre: R$ {(cc.limit - cc.used).toFixed(2)}</div>
              </div>
            </div>
          ))}
          <button className="min-w-[150px] flex-shrink-0 p-4 rounded-xl border border-dashed border-[#ffffff20] flex flex-col items-center justify-center text-[#8a8f98] hover:text-[#f7f8f8] hover:border-[#ffffff40] transition">
            <Plus className="w-5 h-5 mb-2" />
            <span className="text-xs font-medium">+ Nova Conta</span>
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex space-x-1 border-b border-[#ffffff14]">
        <button onClick={() => setActiveTab('extrato')} className={`px-4 py-2 text-xs font-medium border-b-2 transition ${activeTab === 'extrato' ? 'border-[#5e6ad2] text-[#f7f8f8]' : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8]'}`}>
          Extrato de Transações
        </button>
        <button onClick={() => setActiveTab('boletos')} className={`px-4 py-2 text-xs font-medium border-b-2 transition flex items-center ${activeTab === 'boletos' ? 'border-[#5e6ad2] text-[#f7f8f8]' : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8]'}`}>
          📄 Boletos a Pagar
          {pendingBoletosCount > 0 && <span className="ml-2 bg-[#f87171] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">{pendingBoletosCount}</span>}
        </button>
        <button onClick={() => setActiveTab('contas')} className={`px-4 py-2 text-xs font-medium border-b-2 transition ${activeTab === 'contas' ? 'border-[#5e6ad2] text-[#f7f8f8]' : 'border-transparent text-[#8a8f98] hover:text-[#f7f8f8]'}`}>
          🏦 Contas & Cartões
        </button>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
         <div className="py-12 flex justify-center items-center text-xs text-[#8a8f98]"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...</div>
      ) : (
        <>
          {/* EXTRATO DE TRANSAÇÕES */}
          {activeTab === 'extrato' && (
            <div className="space-y-4 pt-4">
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
                      <tr><td colSpan={6} className="p-8 text-center text-[#8a8f98]">Nenhuma transação encontrada.</td></tr>
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
                            {tx.method === 'CRÉDITO' && <CreditCard className="w-3 h-3 mr-1"/>}
                            {tx.method === 'DÉBITO' && <Landmark className="w-3 h-3 mr-1"/>}
                            {tx.method === 'PIX' && <Smartphone className="w-3 h-3 mr-1"/>}
                            {tx.method === 'DINHEIRO' && <Banknote className="w-3 h-3 mr-1"/>}
                            {tx.method === 'BOLETO' && <Receipt className="w-3 h-3 mr-1"/>}
                            {tx.method}
                          </span>
                          {tx.bank && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: getBankColor(tx.bank)+'33', color: getBankColor(tx.bank) }}>
                              {tx.bank}
                            </span>
                          )}
                        </td>
                        <td className={`p-3 text-right font-mono font-bold ${tx.type === 'INCOME' ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                          {tx.type === 'INCOME' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
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
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[#0f1115] border border-[#ffffff14] rounded-lg">
                  <div className="text-[11px] text-[#8a8f98] uppercase font-semibold">Total Pendente</div>
                  <div className="text-2xl font-bold font-mono text-[#f7f8f8] mt-1">
                    R$ {boletos.filter(b=>b.status==='PENDING').reduce((a,b)=>a+b.amount,0).toFixed(2)}
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

              {/* Table */}
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
                    {boletos.map(b => (
                      <tr key={b.id} className="hover:bg-[#16191e] transition">
                        <td className="p-3 font-medium">{b.description}</td>
                        <td className="p-3 font-mono text-[#8a8f98]">{new Date(b.dueDate).toLocaleDateString('pt-BR')}</td>
                        <td className="p-3 font-mono text-[10px] text-[#575c66] truncate max-w-[150px]">{b.barcode}</td>
                        <td className="p-3 text-right font-mono font-bold">R$ {b.amount.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          {b.status === 'PENDING' && <span className="px-2 py-0.5 rounded-full bg-[#fbbf24] text-black text-[10px] font-bold">PENDING 🟡</span>}
                          {b.status === 'PAID' && <span className="px-2 py-0.5 rounded-full bg-[#4ade80] text-black text-[10px] font-bold">PAID 🟢</span>}
                          {b.status === 'OVERDUE' && <span className="px-2 py-0.5 rounded-full bg-[#f87171] text-white text-[10px] font-bold">OVERDUE 🔴</span>}
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
             <div className="p-8 mt-4 text-center text-[#8a8f98] border border-dashed border-[#ffffff14] rounded-lg bg-[#0f1115]">
               Em breve: Gestão detalhada de faturas e reconciliação bancária.
             </div>
          )}
        </>
      )}

      {/* YNAB 3-SECOND TRANSACTION MODAL */}
      {showTxModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-xl p-6 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setShowTxModal(false)} className="absolute top-4 right-4 text-[#8a8f98] hover:text-[#f7f8f8]"><X className="w-5 h-5"/></button>
            <h3 className="text-lg font-bold mb-4">{editingTx ? 'Editar Transação' : 'Nova Transação Rápida'}</h3>

            <form onSubmit={handleSaveTx} className="space-y-4">
              {/* Type Selector */}
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

              {/* Amount & Description */}
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
                {/* Category */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-[#8a8f98] mb-1">Categoria</label>
                  <select value={txCategory} onChange={e=>setTxCategory(e.target.value)} className="w-full h-10 px-3 bg-[#16191e] border border-[#ffffff14] rounded-md text-xs focus:outline-none">
                    {Object.keys(categoryIcons).map(c => <option key={c} value={c}>{categoryIcons[c]} {c}</option>)}
                  </select>
                </div>
                {/* Method */}
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

              {/* Dynamic Context Fields */}
              <div className="bg-[#16191e] p-3 rounded-lg border border-[#ffffff14] grid grid-cols-2 gap-4">
                {(txMethod === 'CRÉDITO' || txMethod === 'DÉBITO' || txMethod === 'PIX') && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#8a8f98] mb-1">Banco / Cartão</label>
                    <select value={txBank} onChange={e=>setTxBank(e.target.value)} className="w-full h-9 px-2 bg-[#0f1115] border border-[#ffffff14] rounded text-xs focus:outline-none">
                      <option value="">Selecione...</option>
                      {txMethod === 'CRÉDITO' 
                        ? creditCards.map(c => <option key={c.id} value={c.bank}>{c.name}</option>)
                        : accounts.map(a => <option key={a.id} value={a.bank}>{a.name}</option>)
                      }
                    </select>
                  </div>
                )}
                {txMethod === 'CRÉDITO' && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-[#8a8f98] mb-1">Parcelas</label>
                    <select value={txInstallments} onChange={e=>setTxInstallments(e.target.value)} className="w-full h-9 px-2 bg-[#0f1115] border border-[#ffffff14] rounded text-xs focus:outline-none">
                      {[...Array(12)].map((_,i) => <option key={i+1} value={i+1}>{i+1}x</option>)}
                    </select>
                  </div>
                )}
                {txMethod === 'BOLETO' && (
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-[#8a8f98] mb-1">Data de Vencimento</label>
                    <input type="date" value={txDueDate} onChange={e=>setTxDueDate(e.target.value)} required className="w-full h-9 px-2 bg-[#0f1115] border border-[#ffffff14] rounded text-xs focus:outline-none" />
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
