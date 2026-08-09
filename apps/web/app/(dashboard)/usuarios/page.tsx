'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit3, Trash2, UserCheck, Send, Check, Copy, MessageSquare, Power } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';
import { authFetch } from '@/lib/api';

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsappPhone?: string;
  role: 'ADMIN' | 'MEMBER' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedInviteUser, setSelectedInviteUser] = useState<UserItem | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [password, setPassword] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:3001');

  useEffect(() => {
    setApiBaseUrl(getApiBaseUrl());
  }, []);

  // Load initial cached users from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sf_cached_users');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUsers(parsed);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

  const saveUsersLocally = (newList: UserItem[]) => {
    setUsers(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sf_cached_users', JSON.stringify(newList));
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await authFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((u: any) => ({
            id: u.id,
            name: u.name || u.email.split('@')[0],
            email: u.email,
            phone: u.phone || '',
            whatsappPhone: u.whatsappPhone || u.phone || '',
            role: u.role || 'MEMBER',
            isActive: u.isActive !== false,
            createdAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : 'Hoje'
          }));
          saveUsersLocally(mapped);
        }
      }
    } catch (e) {
      console.log('API offline or not reached yet, using local cache');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [apiBaseUrl]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.whatsappPhone && u.whatsappPhone.includes(searchTerm))
  );

  const handleOpenCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setWhatsappPhone('');
    setRole('MEMBER');
    setPassword('');
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (u: UserItem) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone || '');
    setWhatsappPhone(u.whatsappPhone || '');
    setRole(u.role);
    setPassword('');
    setModalError('');
    setShowModal(true);
  };

  const handleOpenInvite = (u: UserItem) => {
    setSelectedInviteUser(u);
    setCopied(false);
    setShowInviteModal(true);
  };

  const handleToggleStatus = async (user: UserItem) => {
    const updatedStatus = !user.isActive;
    const updatedList = users.map(u => u.id === user.id ? { ...u, isActive: updatedStatus } : u);
    saveUsersLocally(updatedList);

    try {
      await authFetch(`/api/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: updatedStatus }),
      });
    } catch (e) {
      // Keep local state
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Deseja inativar o acesso deste usuário?')) return;
    const updated = users.map(u => u.id === id ? { ...u, isActive: false } : u);
    saveUsersLocally(updated);

    try {
      await authFetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
    } catch (e) {
      // Keep local update
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    setModalLoading(true);
    setModalError('');

    const targetEmail = email.trim().toLowerCase();
    const targetName = name.trim();
    const targetPhone = phone.trim() || '';
    const targetWa = (whatsappPhone || phone).trim() || '';

    const newUserObj: UserItem = {
      id: editingUser ? editingUser.id : `usr_${Date.now()}`,
      name: targetName,
      email: targetEmail,
      phone: targetPhone,
      whatsappPhone: targetWa,
      role,
      isActive: true,
      createdAt: new Date().toLocaleDateString('pt-BR')
    };

    let updatedUsers = [...users];
    if (editingUser) {
      updatedUsers = updatedUsers.map(u => u.id === editingUser.id ? newUserObj : u);
    } else {
      updatedUsers = [newUserObj, ...updatedUsers];
    }

    saveUsersLocally(updatedUsers);

    try {
      const payload = {
        name: targetName,
        email: targetEmail,
        phone: targetPhone || undefined,
        whatsappPhone: targetWa || undefined,
        role,
        ...(password ? { password } : {}),
      };

      if (editingUser) {
        await authFetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await authFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      console.log('Background API sync deferred');
    } finally {
      setModalLoading(false);
      setShowModal(false);
      
      // If it was a new user, prompt the invite modal right away!
      if (!editingUser) {
        handleOpenInvite(newUserObj);
      }
    }
  };

  const getInviteText = (u: UserItem) => {
    return `Olá ${u.name}! Seu e-mail (${u.email}) foi autorizado a acessar o sistema Saúde & Finanças. Clique no link para entrar com sua conta Google:\nhttps://app.robersonsouza.com.br/login`;
  };

  const handleCopyInvite = (u: UserItem) => {
    navigator.clipboard.writeText(getInviteText(u));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = (u: UserItem) => {
    const text = encodeURIComponent(getInviteText(u));
    const phoneNum = (u.whatsappPhone || u.phone || '').replace(/\D/g, '');
    const waUrl = phoneNum ? `https://wa.me/${phoneNum}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-[1400px] mx-auto pb-12">
      
      {/* Linear Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#3b82f6]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#f7f8f8] tracking-tight">Controle de Usuários (Modo Restrito)</h1>
            <p className="text-sm text-[#8a8f98] mt-0.5">Autorize e-mails para acesso ao sistema e envie convites</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar e-mail ou nome..." 
              className="w-48 h-8 px-3 rounded-md bg-[#0f1115] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <button 
            onClick={handleOpenCreate}
            className="h-8 px-3 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Autorizar E-mail</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="linear-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
          <h3 className="text-base font-bold text-[#f7f8f8]">Usuários Autorizados no Sistema</h3>
          <span className="text-xs font-mono font-semibold text-[#cbd5e1]">{users.length} e-mails autorizados</span>
        </div>

        {users.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-[#ffffff0a] rounded-md">
            <UserCheck className="w-8 h-8 text-[#8a8f98] mx-auto" />
            <h4 className="text-sm font-bold text-[#f7f8f8]">Nenhum usuário cadastrado além de você</h4>
            <p className="text-xs text-[#cbd5e1] max-w-sm mx-auto">
              Clique em "+ Autorizar E-mail" para permitir que familiares ou membros acessem o sistema.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List (< 640px) */}
            <div className="space-y-3 sm:hidden">
              {filteredUsers.map((u) => (
                <div key={u.id} className="p-3.5 rounded-lg bg-[#16191e] border border-[#ffffff12] space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-[#f7f8f8]">{u.name}</div>
                      <div className="text-xs font-mono text-[#cbd5e1] font-medium">{u.email}</div>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                        u.isActive 
                          ? 'bg-[#4ade8010] text-[#4ade80] border-[#4ade8025]' 
                          : 'bg-[#16191e] text-[#a1a1aa] border-[#ffffff0e]'
                      }`}
                    >
                      {u.isActive ? 'ATIVO' : 'BLOQUEADO'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono border-t border-[#ffffff08] pt-2">
                    <span className="text-[#4ade80] font-semibold">📱 {u.whatsappPhone || 'Sem WhatsApp'}</span>
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={() => handleOpenInvite(u)}
                        className="px-2 py-1 bg-[#5e6ad2]/20 text-[#5e6ad2] rounded text-[10px] font-medium flex items-center space-x-1"
                        title="Enviar Convite"
                      >
                        <Send className="w-3 h-3" />
                        <span>Convite</span>
                      </button>
                      <button 
                        onClick={() => handleOpenEdit(u)}
                        className="p-1 hover:bg-[#272a30] rounded text-[#8a8f98] hover:text-[#f7f8f8]"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (≥ 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="text-[#cbd5e1] border-b border-[#ffffff12] uppercase font-bold text-xs sm:text-sm bg-[#0c0e12]">
                  <tr>
                    <th className="py-3 px-4">Usuário Autorizado</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">📱 WhatsApp IA</th>
                    <th className="py-3 px-4">Cargo</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações & Convite</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff0a]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#16191e] transition">
                      <td className="py-3.5 px-4 font-bold text-[#f7f8f8]">{u.name}</td>
                      <td className="py-3.5 px-4 font-mono text-[#cbd5e1] font-medium">{u.email}</td>
                      <td className="py-3.5 px-4 font-mono text-[#4ade80] font-semibold">{u.whatsappPhone || 'Não informado'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-[#16191e] border border-[#ffffff12] text-[#cbd5e1]">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border transition ${
                            u.isActive 
                              ? 'bg-[#4ade8010] text-[#4ade80] border-[#4ade8025] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20' 
                              : 'bg-[#16191e] text-[#a1a1aa] border-[#ffffff0e] hover:bg-[#4ade8010] hover:text-[#4ade80]'
                          }`}
                          title="Clique para Ativar ou Bloquear acesso"
                        >
                          {u.isActive ? 'ATIVO' : 'BLOQUEADO'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        <button 
                          onClick={() => handleOpenInvite(u)}
                          className="px-3 py-1.5 bg-[#5e6ad2]/20 hover:bg-[#5e6ad2]/30 text-[#818cf8] border border-[#5e6ad240] rounded-md text-xs font-semibold inline-flex items-center space-x-1.5 transition"
                          title="Enviar Convite de Acesso"
                        >
                          <Send className="w-3 h-3" />
                          <span>Enviar Convite</span>
                        </button>

                        <button 
                          onClick={() => handleOpenEdit(u)}
                          className="p-1 hover:bg-[#272a30] rounded text-[#8a8f98] hover:text-[#f7f8f8]"
                          title="Editar Dados"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1 hover:bg-[#272a30] rounded text-[#8a8f98] hover:text-[#f87171]"
                          title="Inativar Acesso"
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: Convidar / Cadastrar */}
      {showModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
              <h3 className="font-semibold text-sm text-[#f7f8f8]">
                {editingUser ? 'Editar Permissões do Usuário' : 'Autorizar Novo E-mail'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#8a8f98] hover:text-[#f7f8f8] text-xs">✕</button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs font-medium">
                  {modalError}
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Maria Silva"
                  className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]" 
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">E-mail do Google</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@gmail.com"
                    className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]" 
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Cargo / Função</label>
                  <select 
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">📱 WhatsApp para Mensagens/Assistente IA (opcional)</label>
                <input 
                  type="text" 
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="5567999887766 (sem + ou traços)"
                  className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">
                  {editingUser ? 'Alterar Senha (opcional)' : 'Senha de Acesso Direto (opcional)'}
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? 'Deixe em branco para manter a senha atual' : '••••••••'}
                  className="w-full h-9 px-3 rounded-lg bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]" 
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="h-9 px-4 rounded-lg bg-[#16191e] text-[#8a8f98] hover:text-[#f7f8f8] border border-[#ffffff0a]"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={modalLoading}
                  className="h-9 px-5 rounded-lg bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium shadow-sm disabled:opacity-50"
                >
                  {modalLoading ? 'Salvando...' : editingUser ? 'Salvar' : 'Autorizar e Gerar Convite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enviar Convite */}
      {showInviteModal && selectedInviteUser && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
              <div className="flex items-center space-x-2">
                <Send className="w-4 h-4 text-[#5e6ad2]" />
                <h3 className="font-semibold text-sm text-[#f7f8f8]">
                  Enviar Convite de Acesso
                </h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-[#8a8f98] hover:text-[#f7f8f8] text-xs">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#8a8f98]">
                O e-mail <strong className="text-[#f7f8f8]">{selectedInviteUser.email}</strong> foi autorizado no sistema. Envie o texto do convite para ele:
              </p>

              <div className="p-3 bg-[#16191e] border border-[#ffffff12] rounded-lg text-xs font-mono text-[#f7f8f8] whitespace-pre-wrap leading-relaxed">
                {getInviteText(selectedInviteUser)}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleCopyInvite(selectedInviteUser)}
                  className="py-2.5 px-3 rounded-lg bg-[#16191e] hover:bg-[#272a30] border border-[#ffffff14] text-[#f7f8f8] font-medium flex items-center justify-center space-x-2 transition"
                >
                  {copied ? <Check className="w-4 h-4 text-[#4ade80]" /> : <Copy className="w-4 h-4 text-[#8a8f98]" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(selectedInviteUser)}
                  className="py-2.5 px-3 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium flex items-center justify-center space-x-2 transition shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Enviar WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
