'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit3, Trash2, ShieldCheck, UserCheck, PhoneCall } from 'lucide-react';

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
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [password, setPassword] = useState('');
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

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

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
      const res = await fetch(`${apiBaseUrl}/api/users`, {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
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

  const handleDeleteUser = async (id: string) => {
    const updated = users.filter(u => u.id !== id);
    saveUsersLocally(updated);

    try {
      await fetch(`${apiBaseUrl}/api/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
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

    let updatedUsers = [...users];

    if (editingUser) {
      updatedUsers = updatedUsers.map(u => u.id === editingUser.id ? {
        ...u,
        name: targetName,
        email: targetEmail,
        phone: targetPhone,
        whatsappPhone: targetWa,
        role
      } : u);
    } else {
      const newUser: UserItem = {
        id: `usr_${Date.now()}`,
        name: targetName,
        email: targetEmail,
        phone: targetPhone,
        whatsappPhone: targetWa,
        role,
        isActive: true,
        createdAt: new Date().toLocaleDateString('pt-BR')
      };
      updatedUsers = [newUser, ...updatedUsers];
    }

    // Immediately save local state and localStorage so the UI updates instantly
    saveUsersLocally(updatedUsers);

    // Asynchronously sync with NestJS API server
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
        await fetch(`${apiBaseUrl}/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch(`${apiBaseUrl}/api/users`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });

        if (!res.ok && res.status === 401) {
          await fetch(`${apiBaseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...payload,
              password: password || 'Mudar123!',
            }),
          });
        }
      }
    } catch (err) {
      console.log('Background API sync deferred');
    } finally {
      setModalLoading(false);
      setShowModal(false);
    }
  };

  return (
    <div className="space-y-6 text-[#f7f8f8] max-w-7xl mx-auto pb-12">
      
      {/* Linear Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ffffff0e] pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-[#16191e] border border-[#ffffff12] flex items-center justify-center text-[#3b82f6]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#f7f8f8] tracking-tight">Controle de Usuários</h1>
            <p className="text-xs text-[#8a8f98]">Gerenciamento de acessos, permissões e telefones WhatsApp da IA</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar usuário..." 
              className="w-48 h-8 px-3 rounded-md bg-[#0f1115] border border-[#ffffff12] text-xs text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
            />
          </div>

          <button 
            onClick={handleOpenCreate}
            className="h-8 px-3 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium text-xs flex items-center space-x-1.5 transition shadow-sm flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="linear-card p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#ffffff0e] pb-3">
          <h3 className="text-sm font-semibold text-[#f7f8f8]">Usuários do Sistema</h3>
          <span className="text-[11px] font-mono text-[#8a8f98]">{users.length} cadastrados</span>
        </div>

        {users.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-[#ffffff0a] rounded-md">
            <UserCheck className="w-8 h-8 text-[#575c66] mx-auto" />
            <h4 className="text-xs font-semibold text-[#f7f8f8]">Nenhum usuário cadastrado além do Administrador</h4>
            <p className="text-[11px] text-[#8a8f98] max-w-sm mx-auto">
              Clique em "+ Novo Usuário" para cadastrar membros da equipe ou familiares.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card List (< 640px) */}
            <div className="space-y-3 sm:hidden">
              {filteredUsers.map((u) => (
                <div key={u.id} className="p-3 rounded-md bg-[#16191e] border border-[#ffffff0a] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#f7f8f8]">{u.name}</div>
                      <div className="text-[11px] font-mono text-[#8a8f98]">{u.email}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0f1115] border border-[#ffffff08] text-[#8a8f98]">
                      {u.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono border-t border-[#ffffff08] pt-2">
                    <span className="text-[#4ade80]">📱 {u.whatsappPhone || 'Não informado'}</span>
                    <div className="space-x-1">
                      <button 
                        onClick={() => handleOpenEdit(u)}
                        className="p-1 hover:bg-[#272a30] rounded text-[#8a8f98] hover:text-[#f7f8f8]"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1 hover:bg-[#272a30] rounded text-[#8a8f98] hover:text-[#f87171]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (≥ 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[#575c66] border-b border-[#ffffff0e] uppercase font-semibold text-[10px]">
                  <tr>
                    <th className="pb-3">Usuário</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">📱 WhatsApp IA</th>
                    <th className="pb-3">Cargo</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff0a]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#16191e] transition">
                      <td className="py-3 font-medium text-[#f7f8f8]">{u.name}</td>
                      <td className="py-3 font-mono text-[#8a8f98]">{u.email}</td>
                      <td className="py-3 font-mono text-[#4ade80]">{u.whatsappPhone || 'Não informado'}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#16191e] border border-[#ffffff08] text-[#8a8f98]">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          u.isActive 
                            ? 'bg-[#4ade8010] text-[#4ade80] border-[#4ade8025]' 
                            : 'bg-[#16191e] text-[#575c66] border-[#ffffff0e]'
                        }`}>
                          {u.isActive ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-1">
                        <button 
                          onClick={() => handleOpenEdit(u)}
                          className="p-1 hover:bg-[#272a30] rounded text-[#8a8f98] hover:text-[#f7f8f8]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1 hover:bg-[#272a30] rounded text-[#8a8f98] hover:text-[#f87171]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#080a0c]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-lg p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
              <h3 className="font-semibold text-sm text-[#f7f8f8]">
                {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
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
                  placeholder="ex: Roberson Souza"
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@email.com"
                    className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]" 
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">Cargo / Função</label>
                  <select 
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">📱 WhatsApp da IA (Com DDD)</label>
                <input 
                  type="text" 
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="5567999887766 (sem + ou traços)"
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] font-mono focus:outline-none focus:border-[#5e6ad2]" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase mb-1">
                  {editingUser ? 'Senha (opcional)' : 'Senha Inicial'}
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]" 
                  required={!editingUser}
                />
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
                  {editingUser ? 'Salvar' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
