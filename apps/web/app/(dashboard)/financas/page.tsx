'use client';

import { useState } from 'react';

const mockTransactions = [
  { id: '1', date: '05 Ago 2026', description: 'Supermercado Carrefour (PIX)', category: 'Alimentação', categoryColor: '#0EA5E9', type: 'EXPENSE', amount: 450.00 },
  { id: '2', date: '04 Ago 2026', description: 'Pagamento de Salário', category: 'Salário', categoryColor: '#10B981', type: 'INCOME', amount: 5500.00 },
  { id: '3', date: '03 Ago 2026', description: 'Farmácia São Paulo', category: 'Saúde', categoryColor: '#EC4899', type: 'EXPENSE', amount: 128.50 },
  { id: '4', date: '02 Ago 2026', description: 'Combustível Posto Shell', category: 'Transporte', categoryColor: '#F59E0B', type: 'EXPENSE', amount: 220.00 },
  { id: '5', date: '01 Ago 2026', description: 'Assinatura Spotify & Netflix', category: 'Lazer', categoryColor: '#8B5CF6', type: 'EXPENSE', amount: 89.90 },
];

export default function FinancasPage() {
  const [showModal, setShowModal] = useState(false);
  const [transactions, setTransactions] = useState(mockTransactions);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

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
      amount: parseFloat(amount)
    };

    setTransactions([newTx, ...transactions]);
    setDescription('');
    setAmount('');
    setShowModal(false);
  };

  return (
    <div className="space-y-6 text-white pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão Financeira Inteligente</h1>
          <p className="text-slate-400 text-xs mt-1">Controle de contas, orçamentos e auto-categorização por IA</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 px-5 py-2.5 rounded-xl font-bold hover:opacity-95 transition shadow-lg shadow-sky-500/20 text-xs"
        >
          + Nova Transação
        </button>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl"></div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saldo Geral Disponível</span>
          <div className="text-3xl font-extrabold text-white mt-2">R$ 12.450,00</div>
          <p className="text-xs text-emerald-400 mt-2">✔ Contas Itaú e Nubank sincronizadas</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Receitas (Mês)</span>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">+ R$ 5.500,00</div>
          <p className="text-xs text-slate-400 mt-2">100% da meta atingida</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Despesas (Mês)</span>
          <div className="text-3xl font-extrabold text-rose-400 mt-2">- R$ 3.050,00</div>
          <p className="text-xs text-slate-400 mt-2">Dentro do orçamento limite (R$ 3.500)</p>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Extrato de Transações</h2>
          <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full">{transactions.length} lançamentos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Data</th>
                <th className="pb-3">Descrição</th>
                <th className="pb-3">Categoria</th>
                <th className="pb-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 text-slate-400">{tx.date}</td>
                  <td className="py-3.5 font-medium text-white">{tx.description}</td>
                  <td className="py-3.5">
                    <span 
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold" 
                      style={{ backgroundColor: `${tx.categoryColor}20`, color: tx.categoryColor, border: `1px solid ${tx.categoryColor}40` }}
                    >
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">Nova Transação</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setType('EXPENSE')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${type === 'EXPENSE' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setType('INCOME')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${type === 'INCOME' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}
                >
                  Receita
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Descrição</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex: Mercado, Farmácia, Salário"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
                  required
                />
              </div>

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
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Categoria</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                >
                  <option>Alimentação</option>
                  <option>Moradia</option>
                  <option>Transporte</option>
                  <option>Saúde</option>
                  <option>Lazer</option>
                  <option>Salário</option>
                  <option>Investimento</option>
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
