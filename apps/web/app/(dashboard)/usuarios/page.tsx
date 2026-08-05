'use client';

import { useState } from 'react';

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

const initialUsers: UserItem[] = [
  {
    id: 'usr_1',
    name: 'Roberson Souza',
    email: 'roberson@saudefinancas.com',
    phone: '5567999887766',
    whatsappPhone: '5567999887766',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-08-01'
  },
  {
    id: 'usr_2',
    name: 'Mariana Souza (Esposa)',
    email: 'mariana@saudefinancas.com',
    phone: '5567988776655',
    whatsappPhone: '5567988776655',
    role: 'MEMBER',
    isActive: true,
    createdAt: '2026-08-02'
  },
  {
    id: 'usr_3',
    name: 'Lucas Souza (Filho)',
    email: 'lucas@saudefinancas.com',
    phone: '5567977665544',
    whatsappPhone: '5567977665544',
    role: 'MEMBER',
    isActive: true,
    createdAt: '2026-08-03'
  }
];

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [password, setPassword] = useState('');

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
    setShowModal(true);
  };

  const handleToggleActive = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;

    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? {
        ...u,
        name,
        email,
        phone,
        whatsappPhone: whatsappPhone || phone,
        role
      } : u));
    } else {
      const newUser: UserItem = {
        id: `usr_${Date.now()}`,
        name,
        email,
        phone,
        whatsappPhone: whatsappPhone || phone,
        role,
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setUsers([newUser, ...users]);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6 text-white pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-xl text-sky-400">
              👥
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Controle de Usuários</h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Gerencie permissões, cargos e números de WhatsApp para envio de mensagens da IA.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, email ou WhatsApp..." 
              className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-white text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 w-64 sm:w-80"
            />
            <span className="absolute left-3 top-3 text-slate-500 text-xs">🔍</span>
          </div>

          <button 
            onClick={handleOpenCreate}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition shadow-lg shadow-sky-500/20 text-xs flex items-center space-x-2 flex-shrink-0"
          >
            <span>+</span>
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">📱 WhatsApp da IA</th>
                <th className="px-6 py-4">Cargo / Função</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4 flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sky-400 text-sm">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-white block">{u.name}</span>
                      <span className="text-[10px] text-slate-500">Cadastrado em {u.createdAt}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 font-mono text-slate-300">
                    {u.email}
                  </td>

                  <td className="px-6 py-4">
                    {u.whatsappPhone ? (
                      <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5 w-max">
                        <span>📱</span> {u.whatsappPhone}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Não informado</span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                      u.role === 'ADMIN' 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                        : u.role === 'MEMBER'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {u.role === 'ADMIN' ? '👑 ADMINISTRADOR' : u.role === 'MEMBER' ? '👤 MEMBRO' : '👁️ VISUALIZADOR'}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <button 
                      onClick={() => handleToggleActive(u.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition flex items-center gap-1.5 ${
                        u.isActive 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
                      {u.isActive ? 'ATIVO' : 'INATIVO'}
                    </button>
                  </td>

                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition text-xs"
                      title="Editar Perfil"
                    >
                      ✏️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">
                {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Nome Completo</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Roberson Souza"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email de Acesso</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Cargo / Função</label>
                  <select 
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs"
                  >
                    <option value="ADMIN">👑 Administrador</option>
                    <option value="MEMBER">👤 Membro</option>
                    <option value="VIEWER">👁️ Visualizador</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">📱 WhatsApp da IA (Com DDD)</label>
                <input 
                  type="text" 
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="5567999887766 (sem + ou traços)"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs font-mono" 
                />
                <p className="text-[10px] text-slate-500 mt-1">Este é o número que os agentes (Dra. Maya, Otávio, Nutri Bia) usam para enviar mensagens proativas.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  {editingUser ? 'Senha (Deixe em branco para manter)' : 'Senha Inicial'}
                </label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs" 
                  required={!editingUser}
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-sky-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-sky-400 transition"
              >
                {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
