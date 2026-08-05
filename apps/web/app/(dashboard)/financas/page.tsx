'use client';

import { useState, useEffect } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownRight, CreditCard, ShieldCheck } from 'lucide-react';

interface TransactionItem {
  id: string;
  date: string;
  description: string;
  category: string;
  categoryColor: string;
  type: 'EXPENSE' | 'INCOME';
  amount: number;
  user: string;
}

export default function FinancasPage() {
  const [viewMode, setViewMode] = useState<'individual' | 'family'>('individual');
  const [userRole, setUserRole] = useState<'ADMIN' | 'MEMBER'>('ADMIN');
  const [showModal, setShowModal] = useState(false);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const newTx: TransactionItem = {
      id: String(Date.now()),
      date: new Date().toLocaleDateString('pt-BR'),
      description,
      category,
      categoryColor: type === 'INCOME' ? '#4ade80' : '#5e6ad2',
      type,
      amount: parseFloat(amount),
      user: 'Você'
    };

    setTransactions([newTx, ...transactions]);
    setDescription('');
    setAmount('');
    setShowModal(false);
  };

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-12">
      
      {/* Linear Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#22c55e]">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">Gestão Financeira & Orçamento</h1>
            <p className="text-xs text-[#8a8f98]">Controle de contas, orçamentos e auto-categorização</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Toggle Button */}
          <div className="bg-[#0f1115] p-1 border border-[#ffffff12] rounded-md flex items-center space-x-1">
            <button 
              onClick={() => setViewMode('individual')}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                viewMode === 'individual' 
                  ? 'bg-[#16191e] text-[#f7f8f8]' 
                  : 'text-[#8a8f98] hover:text-[#f7f8f8]'
              }`}
            >
              👤 Meus Gastos
            </button>

            <button 
              onClick={() => setViewMode('family')}
              className={`px-3 py-1 rounded text-xs font-medium transition flex items-center space-x-1 ${
                viewMode === 'family' 
                  ? 'bg-[#16191e] text-[#f7f8f8]' 
                  : 'text-[#8a8f98] hover:text-[#f7f8f8]'
              }`}
            >
              <span>👨‍👩‍👧‍👦 Família</span>
            </button>
          </div>

          <button 
            onClick={() => setShowModal(true)}
            className="h-8 px-3 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Transação</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="linear-card p-4 space-y-2">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Saldo Líquido</span>
          <div className="text-3xl font-bold font-mono text-[#f7f8f8]">
            R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#8a8f98] block">Entradas - Saídas</span>
        </div>

        <div className="linear-card p-4 space-y-2">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Entradas</span>
          <div className="text-3xl font-bold font-mono text-[#4ade80]">
            R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#8a8f98] block">Receitas acumuladas</span>
        </div>

        <div className="linear-card p-4 space-y-2">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Saídas</span>
          <div className="text-3xl font-bold font-mono text-[#f87171]">
            R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#8a8f98] block">Despesas acumuladas</span>
        </div>
      </div>

      {/* Transactions Table / Production Empty State */}
      <div className="linear-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#f7f8f8] border-b border-[#ffffff0e] pb-3">
          Extrato de Transações
        </h3>

        {transactions.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-[#ffffff0a] rounded-md">
            <CreditCard className="w-8 h-8 text-[#575c66] mx-auto" />
            <h4 className="text-xs font-semibold text-[#f7f8f8]">Nenhuma transação registrada ainda</h4>
            <p className="text-[11px] text-[#8a8f98] max-w-sm mx-auto">
              Clique em "+ Nova Transação" ou envie um áudio / foto de comprovante para a IA cadastrar automaticamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[#575c66] border-b border-[#ffffff0e] uppercase font-semibold text-[10px]">
                <tr>
                  <th className="pb-3">Data</th>
                  <th className="pb-3">Descrição</th>
                  <th className="pb-3">Usuário</th>
                  <th className="pb-3">Categoria</th>
                  <th className="pb-3 text-right">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff0a]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#16191e] transition">
                    <td className="py-3 text-[#8a8f98] font-mono">{tx.date}</td>
                    <td className="py-3 font-medium text-[#f7f8f8]">{tx.description}</td>
                    <td className="py-3 text-[#8a8f98]">{tx.user}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#16191e] border border-[#ffffff08] text-[#8a8f98]">
                        {tx.category}
                      </span>
                    </td>
                    <td className={`py-3 text-right font-mono font-bold ${tx.type === 'INCOME' ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-lg p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
              <h3 className="font-semibold text-sm text-[#f7f8f8]">Nova Transação</h3>
              <button onClick={() => setShowModal(false)} className="text-[#8a8f98] hover:text-[#f7f8f8] text-xs">✕</button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Descrição</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex: Mercado, Combustível, Salário"
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]" 
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Tipo</label>
                  <select 
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none"
                  >
                    <option value="EXPENSE">Despesa (-)</option>
                    <option value="INCOME">Receita (+)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Categoria</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none"
                >
                  <option value="Alimentação">Alimentação</option>
                  <option value="Moradia">Moradia</option>
                  <option value="Transporte">Combustível & Transporte</option>
                  <option value="Vestuário">Vestuário</option>
                  <option value="Educação">Educação</option>
                  <option value="Lazer">Lazer</option>
                  <option value="Saúde">Saúde & Farmácia</option>
                  <option value="Salário">Salário / Entradas</option>
                  <option value="Investimentos">Investimentos</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="h-8 px-3 rounded bg-[#16191e] text-[#8a8f98] hover:text-[#f7f8f8] border border-[#ffffff0a]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="h-8 px-4 rounded bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium shadow-sm"
                >
                  Salvar Transação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
