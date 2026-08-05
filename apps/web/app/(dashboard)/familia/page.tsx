'use client';

import { useState, useEffect } from 'react';
import { UserCheck, Plus, BarChart, Users, Check, AlertCircle } from 'lucide-react';

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
  percentage: number;
}

const defaultCategories: CategoryAllocation[] = [
  { categoryId: '1', categoryName: 'Alimentação', percentage: 30 },
  { categoryId: '2', categoryName: 'Moradia', percentage: 20 },
  { categoryId: '3', categoryName: 'Combustível & Transporte', percentage: 15 },
  { categoryId: '4', categoryName: 'Vestuário', percentage: 10 },
  { categoryId: '5', categoryName: 'Educação', percentage: 10 },
  { categoryId: '6', categoryName: 'Lazer & Entretenimento', percentage: 8 },
  { categoryId: '7', categoryName: 'Saúde & Farmácia', percentage: 7 },
];

export default function FamiliaPage() {
  const [groupName, setGroupName] = useState('Grupo Familiar');
  const [totalBudget, setTotalBudget] = useState(5000);
  const [categories, setCategories] = useState<CategoryAllocation[]>(defaultCategories);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:3001');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'app.robersonsouza.com.br' || hostname.includes('robersonsouza.com.br')) {
        setApiBaseUrl('https://app.robersonsouza.com.br');
      } else {
        setApiBaseUrl(`http://${hostname}:3001`);
      }
    }
  }, []);

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
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-12">
      
      {/* Linear Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#f97316]">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">{groupName}</h1>
            <p className="text-xs text-[#8a8f98]">Orçamento familiar unificado com divisão percentual por categoria</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowBudgetModal(true)}
            className="h-8 px-3 rounded-md bg-[#16191e] hover:bg-[#1d2127] border border-[#ffffff12] text-xs font-medium text-[#f7f8f8] flex items-center space-x-1.5 transition"
          >
            <BarChart className="w-3.5 h-3.5 text-[#f97316]" />
            <span>Configurar Orçamento (%)</span>
          </button>
          <button 
            onClick={() => setShowMemberModal(true)}
            className="h-8 px-3 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar Membro</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="linear-card p-4 space-y-2">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Teto Orçamentário Familiar</span>
          <div className="text-3xl font-bold font-mono text-[#f7f8f8]">
            R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-[#8a8f98] block">Mês Vigente</span>
        </div>

        <div className="linear-card p-4 space-y-2">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Membros no Grupo</span>
          <div className="text-3xl font-bold font-mono text-[#f97316]">
            {members.length} Integrantes
          </div>
          <span className="text-[11px] text-[#8a8f98] block">Visão financeira compartilhada</span>
        </div>

        <div className="linear-card p-4 space-y-2">
          <span className="text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider">Distribuição Orçamentária</span>
          <div className={`text-3xl font-bold font-mono ${isPercentageValid ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
            {totalPercentage}% / 100%
          </div>
          <span className="text-[11px] text-[#8a8f98] block">
            {isPercentageValid ? '✓ Alocação 100% calibrada' : '⚠️ Ajuste a soma dos percentuais'}
          </span>
        </div>
      </div>

      {/* Members Section */}
      <div className="linear-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
          <h3 className="text-sm font-semibold text-[#f7f8f8]">Membros do Grupo Familiar</h3>
          <span className="text-[11px] font-mono text-[#8a8f98]">{members.length} cadastrados</span>
        </div>

        {members.length === 0 ? (
          <div className="py-8 text-center space-y-2 border border-dashed border-[#ffffff0a] rounded-md">
            <Users className="w-8 h-8 text-[#575c66] mx-auto" />
            <h4 className="text-xs font-semibold text-[#f7f8f8]">Nenhum membro adicionado ao grupo</h4>
            <p className="text-[11px] text-[#8a8f98] max-w-sm mx-auto">
              Clique em "+ Adicionar Membro" para convidar familiares para a gestão financeira conjunta.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {members.map((m) => (
              <div key={m.id} className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-medium text-[#f7f8f8]">{m.name}</h4>
                  <span className="text-[10px] text-[#8a8f98] font-mono block">{m.email}</span>
                </div>

                <button 
                  onClick={() => handleRemoveMember(m.id)}
                  className="text-[10px] text-[#f87171] hover:underline"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budget Allocation */}
      <div className="linear-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
          <h3 className="text-sm font-semibold text-[#f7f8f8]">Teto por Categoria em Percentual (%)</h3>
          <button onClick={() => setShowBudgetModal(true)} className="text-xs text-[#5e6ad2] hover:underline">
            Editar Percentuais
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((c) => {
            const allocated = (totalBudget * c.percentage) / 100;
            return (
              <div key={c.categoryId} className="p-3 bg-[#16191e] border border-[#ffffff0a] rounded-md space-y-2 text-xs">
                <div className="flex justify-between items-center font-medium">
                  <span className="text-[#f7f8f8]">{c.categoryName}</span>
                  <span className="font-mono text-[#f97316]">{c.percentage}%</span>
                </div>

                <div className="flex justify-between text-[11px] font-mono text-[#8a8f98]">
                  <span>Teto: R$ {allocated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="w-full bg-[#080a0c] h-1.5 rounded-full overflow-hidden border border-[#ffffff0a]">
                  <div className="bg-[#f97316] h-full rounded-full" style={{ width: `${c.percentage}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-lg p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
              <h3 className="font-semibold text-sm text-[#f7f8f8]">Adicionar Membro ao Grupo</h3>
              <button onClick={() => setShowMemberModal(false)} className="text-[#8a8f98] hover:text-[#f7f8f8] text-xs">✕</button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Nome do Membro</label>
                <input 
                  type="text" 
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="ex: Carlos Souza"
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none" 
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Email</label>
                <input 
                  type="email" 
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="membro@email.com"
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none" 
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">📱 WhatsApp da IA</label>
                <input 
                  type="text" 
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="5567999887766"
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none" 
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowMemberModal(false)}
                  className="h-8 px-3 rounded bg-[#16191e] text-[#8a8f98] hover:text-[#f7f8f8] border border-[#ffffff0a]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="h-8 px-4 rounded bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium shadow-sm"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-lg p-6 w-full max-w-lg space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
              <h3 className="font-semibold text-sm text-[#f7f8f8]">Configurar Orçamento Familiar</h3>
              <button onClick={() => setShowBudgetModal(false)} className="text-[#8a8f98] hover:text-[#f7f8f8] text-xs">✕</button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Valor Total Mensal (R$)</label>
                <input 
                  type="number" 
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono font-bold text-sm focus:outline-none" 
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-[#8a8f98]">Categorias</span>
                  <span className={isPercentageValid ? 'text-[#4ade80]' : 'text-[#f87171]'}>
                    Soma: {totalPercentage}% {isPercentageValid ? '✓' : '(deve dar 100%)'}
                  </span>
                </div>

                {categories.map((c) => (
                  <div key={c.categoryId} className="flex items-center justify-between p-2 rounded bg-[#16191e] border border-[#ffffff0a]">
                    <span className="text-[#f7f8f8]">{c.categoryName}</span>
                    <div className="flex items-center space-x-1">
                      <input 
                        type="number" 
                        value={c.percentage}
                        onChange={(e) => handlePercentageChange(c.categoryId, Number(e.target.value))}
                        className="w-14 h-7 bg-[#080a0c] border border-[#ffffff10] rounded text-center text-xs font-mono font-bold text-[#f97316]"
                      />
                      <span className="text-[#8a8f98]">%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  disabled={!isPercentageValid}
                  onClick={() => setShowBudgetModal(false)}
                  className="h-8 px-4 rounded bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium shadow-sm disabled:opacity-40"
                >
                  Salvar Orçamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
