'use client';

import { useState, useEffect } from 'react';
import { UserCheck, Plus, BarChart, Users } from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Modal,
  EmptyState,
  Badge,
} from '../../../components/ui';

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
  const [groupName] = useState('Grupo Familiar');
  const [totalBudget, setTotalBudget] = useState(5000);
  const [categories, setCategories] = useState<CategoryAllocation[]>(defaultCategories);
  const [members, setMembers] = useState<GroupMember[]>([]);
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
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      {/* Design System Page Header */}
      <PageHeader
        icon={<UserCheck className="w-5 h-5 text-[#f97316]" />}
        title={groupName}
        subtitle="Orçamento familiar unificado com divisão percentual por categoria"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<BarChart className="w-3.5 h-3.5 text-[#f97316]" />}
              onClick={() => setShowBudgetModal(true)}
            >
              Configurar Orçamento (%)
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowMemberModal(true)}
            >
              Adicionar Membro
            </Button>
          </>
        }
      />

      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="standard">
          <span className="text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase tracking-wider block mb-1">
            Teto Orçamentário Familiar
          </span>
          <div className="text-2xl font-bold font-mono text-primary">
            R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-[#a1a1aa] font-medium block mt-1">Mês Vigente</span>
        </Card>

        <Card padding="standard">
          <span className="text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase tracking-wider block mb-1">
            Membros no Grupo
          </span>
          <div className="text-2xl font-bold font-mono text-[#f97316]">
            {members.length} Integrantes
          </div>
          <span className="text-xs text-[#a1a1aa] font-medium block mt-1">Visão financeira compartilhada</span>
        </Card>

        <Card padding="standard">
          <span className="text-xs sm:text-sm font-bold text-[#cbd5e1] uppercase tracking-wider block mb-1">
            Distribuição Orçamentária
          </span>
          <div className={`text-2xl font-bold font-mono ${isPercentageValid ? 'text-success' : 'text-error'}`}>
            {totalPercentage}% / 100%
          </div>
          <span className="text-xs text-[#a1a1aa] font-medium block mt-1">
            {isPercentageValid ? '✓ Alocação 100% calibrada' : '⚠️ Ajuste a soma dos percentuais'}
          </span>
        </Card>
      </div>

      {/* Members Section */}
      <Card padding="standard">
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <h3 className="text-base font-bold text-primary">Membros do Grupo Familiar</h3>
          <Badge variant="neutral">{members.length} cadastrados</Badge>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6 text-tertiary" />}
            title="Nenhum membro adicionado ao grupo"
            description="Clique em '+ Adicionar Membro' para convidar familiares para a gestão financeira conjunta."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {members.map((m) => (
              <div key={m.id} className="p-3.5 bg-surface border border-subtle rounded-lg flex justify-between items-center text-xs">
                <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                  <h4 className="font-bold text-sm text-primary truncate">{m.name}</h4>
                  <span className="text-xs text-[#cbd5e1] font-mono block truncate font-medium">{m.email}</span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMember(m.id)}
                  className="text-error hover:text-error hover:bg-error-subtle h-7 px-2.5 text-xs font-semibold"
                >
                  Remover
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Budget Allocation */}
      <Card padding="standard">
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <h3 className="text-base font-bold text-primary">Teto por Categoria em Percentual (%)</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowBudgetModal(true)}>
            Editar Percentuais
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          {categories.map((c) => {
            const allocated = (totalBudget * c.percentage) / 100;
            return (
              <div key={c.categoryId} className="p-3.5 bg-surface border border-subtle rounded-lg space-y-2.5 text-xs">
                <div className="flex justify-between items-center font-bold text-sm">
                  <span className="text-primary">{c.categoryName}</span>
                  <span className="font-mono text-[#f97316]">{c.percentage}%</span>
                </div>

                <div className="flex justify-between text-xs font-mono text-[#cbd5e1] font-semibold">
                  <span>Teto: R$ {allocated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="w-full bg-canvas h-2 rounded-full overflow-hidden border border-subtle">
                  <div className="bg-[#f97316] h-full rounded-full" style={{ width: `${c.percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Member Modal */}
      <Modal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        title="Adicionar Membro ao Grupo"
        description="Preencha os dados do familiar para incluir na divisão orçamentária."
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <Input
            label="NOME DO MEMBRO"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="ex: Carlos Souza"
            required
          />

          <Input
            label="EMAIL"
            type="email"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            placeholder="membro@email.com"
            required
          />

          <Input
            label="📱 WHATSAPP DA IA"
            value={newMemberPhone}
            onChange={(e) => setNewMemberPhone(e.target.value)}
            placeholder="5567999887766"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowMemberModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Adicionar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Budget Modal */}
      <Modal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        title="Configurar Orçamento Familiar"
        description="Defina o valor mensal total e a porcentagem atribuída a cada categoria."
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <Input
            label="VALOR TOTAL MENSAL (R$)"
            type="number"
            value={totalBudget}
            onChange={(e) => setTotalBudget(Number(e.target.value))}
            className="font-mono font-bold text-sm"
          />

          <div className="space-y-2">
            <div className="flex justify-between font-semibold">
              <span className="text-secondary">Categorias</span>
              <span className={isPercentageValid ? 'text-success' : 'text-error'}>
                Soma: {totalPercentage}% {isPercentageValid ? '✓' : '(deve dar 100%)'}
              </span>
            </div>

            {categories.map((c) => (
              <div key={c.categoryId} className="flex items-center justify-between p-2 rounded bg-surface border border-subtle">
                <span className="text-primary">{c.categoryName}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={c.percentage}
                    onChange={(e) => handlePercentageChange(c.categoryId, Number(e.target.value))}
                    className="w-14 h-7 bg-canvas border border-subtle rounded text-center text-xs font-mono font-bold text-[#f97316] focus:outline-none focus:border-accent"
                  />
                  <span className="text-secondary">%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              disabled={!isPercentageValid}
              onClick={() => setShowBudgetModal(false)}
              variant="primary"
            >
              Salvar Orçamento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

