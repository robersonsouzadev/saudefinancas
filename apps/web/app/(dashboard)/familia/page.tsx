'use client';

import { useState } from 'react';

interface GroupMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  whatsappPhone?: string;
}

interface CategoryAllocation {
  categoryId: string;
  categoryName: string;
  icon: string;
  percentage: number;
}

const defaultCategories: CategoryAllocation[] = [
  { categoryId: '1', categoryName: 'Alimentação', icon: '🍔', percentage: 30 },
  { categoryId: '2', categoryName: 'Moradia', icon: '🏠', percentage: 20 },
  { categoryId: '3', categoryName: 'Combustível & Transporte', icon: '⛽', percentage: 15 },
  { categoryId: '4', categoryName: 'Vestuário', icon: '👕', percentage: 10 },
  { categoryId: '5', categoryName: 'Educação', icon: '📚', percentage: 10 },
  { categoryId: '6', categoryName: 'Lazer & Entretenimento', icon: '🎮', percentage: 8 },
  { categoryId: '7', categoryName: 'Saúde & Farmácia', icon: '💊', percentage: 7 },
];

export default function FamiliaPage() {
  const [groupName, setGroupName] = useState('Família Souza');
  const [totalBudget, setTotalBudget] = useState(8000);
  const [categories, setCategories] = useState<CategoryAllocation[]>(defaultCategories);
  
  const [members, setMembers] = useState<GroupMember[]>([
    { id: 'usr_1', name: 'Roberson Souza', email: 'roberson@saudefinancas.com', role: 'ADMIN', whatsappPhone: '5567999887766' },
    { id: 'usr_2', name: 'Mariana Souza (Esposa)', email: 'mariana@saudefinancas.com', role: 'MEMBER', whatsappPhone: '5567988776655' },
    { id: 'usr_3', name: 'Lucas Souza (Filho)', email: 'lucas@saudefinancas.com', role: 'MEMBER', whatsappPhone: '5567977665544' },
  ]);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');

  const totalPercentage = categories.reduce((sum, c) => sum + Number(c.percentage || 0), 0);
  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.1;

  const handlePercentageChange = (categoryId: string, val: number) => {
    setCategories(prev => prev.map(c => c.categoryId === categoryId ? { ...c, percentage: val } : c));
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail || !newMemberName) return;

    const newM: GroupMember = {
      id: `usr_${Date.now()}`,
      name: newMemberName,
      email: newMemberEmail,
      role: 'MEMBER',
      whatsappPhone: newMemberPhone,
    };
    setMembers([...members, newM]);
    setNewMemberEmail('');
    setNewMemberName('');
    setNewMemberPhone('');
    setShowMemberModal(false);
  };

  const handleRemoveMember = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl text-amber-400">
              👨‍👩‍👧‍👦
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Grupo Familiar: {groupName}</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Gerencie os membros da família, orçamento unificado por percentuais e relatórios consolidados.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowBudgetModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-amber-500/20 text-xs flex items-center space-x-2"
          >
            <span>📊</span>
            <span>Configurar Orçamento (%)</span>
          </button>
          <button 
            onClick={() => setShowMemberModal(true)}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-sky-500/20 text-xs flex items-center space-x-2"
          >
            <span>+</span>
            <span>Adicionar Membro</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-1">
          <span className="text-xs text-slate-400 font-semibold uppercase">Orçamento Familiar Total</span>
          <div className="text-2xl font-black text-amber-400">
            R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500">Mês de Agosto / 2026</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-1">
          <span className="text-xs text-slate-400 font-semibold uppercase">Membros Conectados</span>
          <div className="text-2xl font-black text-sky-400">
            {members.length} Pessoas
          </div>
          <p className="text-[11px] text-slate-500">Visão financeira consolidada ativa</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-1">
          <span className="text-xs text-slate-400 font-semibold uppercase">Distribuição Orçamentária</span>
          <div className={`text-2xl font-black ${isPercentageValid ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPercentage}% / 100%
          </div>
          <p className="text-[11px] text-slate-500">
            {isPercentageValid ? '✓ Divisão 100% calibrada' : '⚠️ A soma deve dar 100%'}
          </p>
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <span>👥</span> Membros do Grupo Familiar
          </h3>
          <span className="text-xs text-slate-400">{members.length} cadastrados</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {members.map((m) => (
            <div key={m.id} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-sky-400">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">{m.name}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{m.email}</span>
                  {m.whatsappPhone && (
                    <span className="text-[10px] text-emerald-400 font-mono block">📱 {m.whatsappPhone}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                  m.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {m.role === 'ADMIN' ? '👑 ADMIN' : 'MEMBRO'}
                </span>
                {m.role !== 'ADMIN' && (
                  <button 
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Budget Allocation Breakdown Display */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>📊</span> Orçamento por Categoria (% Estipulado)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Calculado automaticamente sobre o valor total de R$ {totalBudget.toLocaleString('pt-BR')}</p>
          </div>
          <button 
            onClick={() => setShowBudgetModal(true)}
            className="text-xs text-sky-400 hover:underline font-semibold"
          >
            Editar Percentuais
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => {
            const allocated = (totalBudget * c.percentage) / 100;
            return (
              <div key={c.categoryId} className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <span>{c.icon}</span>
                    <span>{c.categoryName}</span>
                  </span>
                  <span className="text-amber-400">{c.percentage}%</span>
                </div>

                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-400 text-[11px]">Teto Orçado:</span>
                  <span className="font-bold text-white">R$ {allocated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-gradient-to-r from-sky-500 to-amber-400 rounded-full" 
                    style={{ width: `${c.percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">Adicionar Membro ao Grupo</h3>
              <button onClick={() => setShowMemberModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nome do Membro</label>
                <input 
                  type="text" 
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="ex: Carlos Souza"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email</label>
                <input 
                  type="email" 
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="membro@email.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">📱 WhatsApp da IA</label>
                <input 
                  type="text" 
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="5567999887766"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs font-mono" 
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-sky-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-sky-400 transition"
              >
                Confirmar e Adicionar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Budget Setup Modal with Percentages */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-lg text-white">Configurar Orçamento Familiar</h3>
                <p className="text-xs text-slate-400">Defina o valor mensal e a divisão exata em % por categoria</p>
              </div>
              <button onClick={() => setShowBudgetModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Valor Total Mensal (R$)</label>
                <input 
                  type="number" 
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-amber-400 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-base" 
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-300 uppercase">Categorias & Percentuais</label>
                  <span className={`text-xs font-bold ${isPercentageValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                    Soma: {totalPercentage}% {isPercentageValid ? '✓ OK' : '(deve dar 100%)'}
                  </span>
                </div>

                {categories.map((c) => (
                  <div key={c.categoryId} className="flex items-center justify-between space-x-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-200 flex items-center gap-1.5 flex-1">
                      <span>{c.icon}</span>
                      <span>{c.categoryName}</span>
                    </span>

                    <div className="flex items-center space-x-2">
                      <input 
                        type="number" 
                        min="0" 
                        max="100" 
                        value={c.percentage}
                        onChange={(e) => handlePercentageChange(c.categoryId, Number(e.target.value))}
                        className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-center text-xs font-bold text-amber-400 focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                disabled={!isPercentageValid}
                onClick={() => setShowBudgetModal(false)}
                className="w-full py-3 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition disabled:opacity-40"
              >
                Salvar Orçamento (100%)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
