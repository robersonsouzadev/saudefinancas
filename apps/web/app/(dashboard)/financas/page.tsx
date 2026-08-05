'use client';

import { useState } from 'react';

const mockTransactionsIndividual = [
  { id: '1', date: '05 Ago 2026', description: 'Supermercado Carrefour (PIX)', category: 'Alimentação', categoryColor: '#0EA5E9', type: 'EXPENSE', amount: 450.00, user: 'Roberson Souza' },
  { id: '2', date: '04 Ago 2026', description: 'Pagamento de Salário', category: 'Salário', categoryColor: '#10B981', type: 'INCOME', amount: 5500.00, user: 'Roberson Souza' },
  { id: '3', date: '03 Ago 2026', description: 'Farmácia São Paulo', category: 'Saúde', categoryColor: '#EC4899', type: 'EXPENSE', amount: 128.50, user: 'Roberson Souza' },
  { id: '4', date: '02 Ago 2026', description: 'Combustível Posto Shell', category: 'Transporte', categoryColor: '#F59E0B', type: 'EXPENSE', amount: 220.00, user: 'Roberson Souza' },
  { id: '5', date: '01 Ago 2026', description: 'Assinatura Spotify & Netflix', category: 'Lazer', categoryColor: '#8B5CF6', type: 'EXPENSE', amount: 89.90, user: 'Roberson Souza' },
];

const mockTransactionsFamily = [
  ...mockTransactionsIndividual,
  { id: '6', date: '05 Ago 2026', description: 'Feira Hortifruti (Mariana)', category: 'Alimentação', categoryColor: '#0EA5E9', type: 'EXPENSE', amount: 280.00, user: 'Mariana Souza (Esposa)' },
  { id: '7', date: '04 Ago 2026', description: 'Mensalidade Faculdade (Lucas)', category: 'Educação', categoryColor: '#3B82F6', type: 'EXPENSE', amount: 800.00, user: 'Lucas Souza (Filho)' },
  { id: '8', date: '03 Ago 2026', description: 'Salário Mariana (Esposa)', category: 'Salário', categoryColor: '#10B981', type: 'INCOME', amount: 4200.00, user: 'Mariana Souza (Esposa)' },
];

const familyBudgetCategories = [
  { category: 'Alimentação', icon: '🍔', percentage: 30, allocated: 2400, spent: 730 },
  { category: 'Moradia', icon: '🏠', percentage: 20, allocated: 1600, spent: 1600 },
  { category: 'Combustível & Transporte', icon: '⛽', percentage: 15, allocated: 1200, spent: 220 },
  { category: 'Vestuário', icon: '👕', percentage: 10, allocated: 800, spent: 0 },
  { category: 'Educação', icon: '📚', percentage: 10, allocated: 800, spent: 800 },
  { category: 'Lazer & Entretenimento', icon: '🎮', percentage: 8, allocated: 640, spent: 89.90 },
  { category: 'Saúde & Farmácia', icon: '💊', percentage: 7, allocated: 560, spent: 128.50 },
];

export default function FinancasPage() {
  const [viewMode, setViewMode] = useState<'individual' | 'family'>('family');
  const [userRole, setUserRole] = useState<'ADMIN' | 'MEMBER'>('ADMIN');
  const [showModal, setShowModal] = useState(false);
  const [transactions, setTransactions] = useState(mockTransactionsIndividual);
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  const currentTransactions = viewMode === 'family' ? mockTransactionsFamily : transactions;

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const newTx = {
      id: String(Date.now()),
      date: 'Hoje',
      description,
      category,
      categoryColor: type === 'INCOME' ? '#10B981' : '#0EA5E9',
      type,
      amount: parseFloat(amount),
      user: 'Roberson Souza'
    };

    setTransactions([newTx, ...transactions]);
    setDescription('');
    setAmount('');
    setShowModal(false);
  };

  const totalIncome = currentTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = currentTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Header with View Mode Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold">Gestão Financeira & Orçamento</h1>
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-[10px] font-bold uppercase">
              {userRole === 'ADMIN' ? '👑 Admin do Grupo' : '👤 Membro'}
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            {viewMode === 'family' 
              ? '👨‍👩‍👧‍👦 Exibindo gastos consolidados da Família Souza (Todas as contas unificadas)' 
              : '👤 Exibindo apenas seus gastos e contas individuais'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Toggle Button */}
          <div className="bg-slate-900 p-1 border border-slate-800 rounded-xl flex items-center space-x-1">
            <button 
              onClick={() => setViewMode('individual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'individual' 
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👤 Meus Gastos
            </button>

            <button 
              onClick={() => setViewMode('family')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                viewMode === 'family' 
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>👨‍👩‍👧‍👦</span>
              <span>Família Souza</span>
            </button>
          </div>

          <button 
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl font-bold hover:opacity-95 transition shadow-lg shadow-sky-500/20 text-xs"
          >
            + Nova Transação
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {viewMode === 'family' ? 'Saldo Geral da Família' : 'Meu Saldo Disponível'}
          </span>
          <h2 className="text-3xl font-black mt-2 text-white">
            R$ {netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <span className="text-[11px] text-emerald-400 font-semibold mt-2 inline-block">
            ↑ Receita Líquida no Mês
          </span>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entradas ({viewMode === 'family' ? 'Família' : 'Você'})</span>
          <h2 className="text-3xl font-black mt-2 text-emerald-400">
            R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <span className="text-[11px] text-slate-500 mt-2 inline-block">Salários e Entradas Registradas</span>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saídas Totais</span>
          <h2 className="text-3xl font-black mt-2 text-rose-400">
            R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h2>
          <span className="text-[11px] text-slate-500 mt-2 inline-block">Despesas e Compras da Casa</span>
        </div>
      </div>

      {/* Family Budget Categories Percentage Bar (Visible in Family Mode) */}
      {viewMode === 'family' && (
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>📊</span> Orçamento Familiar por Categoria (Teto Estipulado: R$ 8.000,00)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Alocação percentual para garantir 100% de controle sobre os gastos familiares</p>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              100% Calibrado
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {familyBudgetCategories.map((c) => {
              const usagePercent = Math.min(100, Math.round((c.spent / c.allocated) * 100));
              const isWarning = usagePercent >= 80;
              const isExceeded = usagePercent >= 100;

              return (
                <div key={c.category} className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="flex items-center gap-1.5">
                      <span>{c.icon}</span>
                      <span>{c.category}</span>
                    </span>
                    <span className="text-amber-400 font-mono">{c.percentage}%</span>
                  </div>

                  <div className="flex justify-between items-baseline text-[11px]">
                    <span className="text-slate-400">Gasto: R$ {c.spent.toFixed(2)}</span>
                    <span className="text-slate-300 font-semibold">Teto: R$ {c.allocated}</span>
                  </div>

                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500">{usagePercent}% utilizado</span>
                    {isExceeded ? (
                      <span className="text-rose-400 font-bold">⚠️ Esgotado</span>
                    ) : isWarning ? (
                      <span className="text-amber-400 font-bold">⚡ Alerta (80%+)</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">✓ Dentro do limite</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Account Visibility Banner for Role */}
      {viewMode === 'family' && (
        <div className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
          userRole === 'ADMIN' 
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
            : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
        }`}>
          <div className="flex items-center space-x-2">
            <span>{userRole === 'ADMIN' ? '👑' : '🔒'}</span>
            <span>
              {userRole === 'ADMIN' 
                ? 'Modo Admin Ativo: Você possui permissão para visualizar todas as contas bancárias e transações detalhadas dos membros da família.' 
                : 'Modo Membro Ativo: Você consegue visualizar o total consolidado da família e seu orçamento, mas suas contas individuais permanecem privadas.'}
            </span>
          </div>
          <button 
            onClick={() => setUserRole(userRole === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
            className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-800 text-white transition"
          >
            Simular {userRole === 'ADMIN' ? 'Visão Membro' : 'Visão Admin'}
          </button>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl space-y-4">
        <h3 className="font-bold text-base text-white">
          Extrato de Transações ({viewMode === 'family' ? 'Consolidado da Família' : 'Meus Gastos'})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 uppercase font-semibold text-[10px]">
              <tr>
                <th className="pb-3">Data</th>
                <th className="pb-3">Descrição</th>
                <th className="pb-3">Quem Gastou</th>
                <th className="pb-3">Categoria</th>
                <th className="pb-3 text-right">Valor (R$)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {currentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 text-slate-400 font-mono text-[11px]">{tx.date}</td>
                  <td className="py-3.5 font-semibold text-white">{tx.description}</td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-md text-[10px] font-semibold text-slate-300">
                      👤 {tx.user}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold border border-slate-700/50 bg-slate-950" style={{ color: tx.categoryColor }}>
                      {tx.category}
                    </span>
                  </td>
                  <td className={`py-3.5 text-right font-bold ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">Nova Transação</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Descrição</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex: Mercado, Posto de Gasolina"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Tipo</label>
                  <select 
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                  >
                    <option value="EXPENSE">Despesa (-)</option>
                    <option value="INCOME">Receita (+)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Categoria</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                >
                  <option value="Alimentação">Alimentação (30%)</option>
                  <option value="Moradia">Moradia (20%)</option>
                  <option value="Transporte">Combustível & Transporte (15%)</option>
                  <option value="Vestuário">Vestuário (10%)</option>
                  <option value="Educação">Educação (10%)</option>
                  <option value="Lazer">Lazer (8%)</option>
                  <option value="Saúde">Saúde & Farmácia (7%)</option>
                  <option value="Salário">Salário / Entradas</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:opacity-95 transition"
              >
                Salvar Transação
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
