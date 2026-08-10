'use client';

import { useState, useEffect } from 'react';
import { UserCheck, Plus, BarChart, Users, Check, Trash2, RefreshCw, UserPlus } from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  Input,
  Modal,
  EmptyState,
  Badge,
} from '../../../components/ui';
import { authFetch, parseJsonResponse } from '@/lib/api';

interface GroupMember {
  id: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    name: string;
    email: string;
    whatsappPhone?: string;
    role: string;
    avatarUrl?: string;
  };
}

interface AuthorizedUser {
  id: string;
  name?: string;
  email: string;
  whatsappPhone?: string;
  role: string;
  isActive: boolean;
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
  const [groupId, setGroupId] = useState<string>('');
  const [groupName, setGroupName] = useState('Grupo Familiar');
  const [totalBudget, setTotalBudget] = useState(5000);
  const [categories, setCategories] = useState<CategoryAllocation[]>(defaultCategories);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  
  // Modals
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  
  // Form State
  const [selectedPresetUser, setSelectedPresetUser] = useState<string>('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const totalPercentage = categories.reduce((sum, c) => sum + Number(c.percentage || 0), 0);
  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.1;

  useEffect(() => {
    loadFamilyGroup();
    loadAuthorizedUsers();
  }, []);

  const loadFamilyGroup = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/family/my-group');
      if (res.ok) {
        const data = await parseJsonResponse(res);
        if (data.id) {
          setGroupId(data.id);
          setGroupName(data.name || 'Grupo Familiar');
          if (data.members) {
            setMembers(data.members);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar grupo familiar:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuthorizedUsers = async () => {
    try {
      const res = await authFetch('/api/users');
      if (res.ok) {
        const list = await parseJsonResponse(res);
        setAuthorizedUsers(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários autorizados:', err);
    }
  };

  const handleSelectPresetUser = (userId: string) => {
    setSelectedPresetUser(userId);
    const found = authorizedUsers.find(u => u.id === userId);
    if (found) {
      setNewMemberName(found.name || '');
      setNewMemberEmail(found.email || '');
      setNewMemberPhone(found.whatsappPhone || '');
    }
  };

  const handlePercentageChange = (categoryId: string, val: number) => {
    setCategories(prev => prev.map(c => c.categoryId === categoryId ? { ...c, percentage: val } : c));
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail) return;

    try {
      setSubmitting(true);
      if (!groupId) {
        alert('Grupo familiar não inicializado.');
        return;
      }

      const res = await authFetch(`/api/family/groups/${groupId}/members/by-email`, {
        method: 'POST',
        body: JSON.stringify({
          email: newMemberEmail,
          name: newMemberName,
          whatsappPhone: newMemberPhone,
        }),
      });

      if (res.ok) {
        setNewMemberEmail('');
        setNewMemberName('');
        setNewMemberPhone('');
        setSelectedPresetUser('');
        setShowMemberModal(false);
        await loadFamilyGroup();
      } else {
        const errData = await parseJsonResponse(res);
        alert(`⚠️ ${errData.message || 'Erro ao adicionar integrante ao grupo familiar'}`);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar integrante');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Deseja realmente remover este integrante do Grupo Familiar?')) return;

    try {
      const res = await authFetch(`/api/family/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadFamilyGroup();
      } else {
        alert('Erro ao remover integrante do grupo');
      }
    } catch (err) {
      alert('Erro ao excluir integrante do grupo');
    }
  };

  // Filtrar usuários cadastrados em /usuarios que ainda NAO estao no grupo familiar
  const availableUsersToSelect = authorizedUsers.filter(
    (u) => !members.some((m) => m.userId === u.id || m.user?.email === u.email)
  );

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12 text-[#f7f8f8]">
      {/* Design System Page Header */}
      <PageHeader
        icon={<UserCheck className="w-5 h-5 text-[#f97316]" />}
        title={groupName}
        subtitle="Orçamento familiar unificado e integração biológica compartilhada com membros autorizados"
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
            {members.length} Integrante{members.length === 1 ? '' : 's'}
          </div>
          <span className="text-xs text-[#a1a1aa] font-medium block mt-1">Visão financeira e de saúde compartilhada</span>
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
          <div>
            <h3 className="text-base font-bold text-primary">Membros do Grupo Familiar</h3>
            <p className="text-xs text-[#a1a1aa] mt-0.5">Integrantes vinculados no banco de dados do sistema</p>
          </div>
          <Badge variant="neutral">{members.length} vinculados</Badge>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#a1a1aa] flex items-center justify-center space-x-2 font-mono">
            <RefreshCw className="w-4 h-4 animate-spin text-[#f97316]" />
            <span>Carregando grupo familiar...</span>
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6 text-tertiary" />}
            title="Nenhum membro adicionado ao grupo"
            description="Clique em '+ Adicionar Membro' para vincular os usuários cadastrados em '/usuarios' para a gestão financeira e biológica conjunta."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
            {members.map((m) => {
              const uName = m.user?.name || m.user?.email || 'Integrante';
              const uEmail = m.user?.email || '';
              const uPhone = m.user?.whatsappPhone || 'Sem WhatsApp';

              return (
                <div key={m.id} className="p-4 bg-surface border border-subtle rounded-xl flex justify-between items-start text-xs space-x-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-bold text-sm text-primary truncate">{uName}</h4>
                      {m.role === 'ADMIN' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#f9731615] text-[#f97316] border border-[#f9731630] rounded">
                          ADMIN
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#cbd5e1] font-mono block truncate font-medium">{uEmail}</span>
                    <span className="text-[11px] font-mono text-[#38bdf8] block">{uPhone}</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(m.userId)}
                    className="text-error hover:text-error hover:bg-error-subtle h-7 px-2 text-xs font-semibold shrink-0"
                    title="Remover do Grupo Familiar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
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
              </div>
            );
          })}
        </div>
      </Card>

      {/* Member Modal com Seleção 1-Clique de Usuários Autorizados */}
      <Modal
        isOpen={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        title="Adicionar Membro ao Grupo Familiar"
        description="Selecione um usuário já cadastrado em /usuarios ou preencha os dados do novo integrante."
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          
          {/* Seletor de usuarios cadastrados */}
          {availableUsersToSelect.length > 0 && (
            <div className="p-3 rounded-lg bg-[#5e6ad210] border border-[#5e6ad230] space-y-2">
              <label className="block text-xs font-semibold text-[#5e6ad2] uppercase font-mono flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Selecionar Usuário Já Cadastrado em /usuarios
              </label>
              <select
                value={selectedPresetUser}
                onChange={(e) => handleSelectPresetUser(e.target.value)}
                className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] text-xs focus:outline-none focus:border-[#5e6ad2]"
              >
                <option value="">-- Selecione para preenchimento automático --</option>
                {availableUsersToSelect.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="NOME DO MEMBRO"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="ex: Davi Antonio Souza"
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
            label="📱 WHATSAPP DA IA / NOTIFICAÇÕES"
            value={newMemberPhone}
            onChange={(e) => setNewMemberPhone(e.target.value)}
            placeholder="5567999887766"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-subtle">
            <Button variant="secondary" onClick={() => setShowMemberModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Viculando...' : 'Adicionar ao Grupo'}
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

          <div className="flex justify-end gap-2 pt-2 border-t border-subtle">
            <Button variant="secondary" onClick={() => setShowBudgetModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={!isPercentageValid}
              onClick={() => setShowBudgetModal(false)}
            >
              Salvar Orçamento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
