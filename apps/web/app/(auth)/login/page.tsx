'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@saudefinancas.com');
  const [password, setPassword] = useState('123456');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 mx-auto mb-3 flex items-center justify-center font-bold text-2xl text-slate-950">
            SF
          </div>
          <h1 className="text-2xl font-bold text-white">Saúde & Finanças</h1>
          <p className="text-slate-400 text-sm mt-1">Acesse sua conta para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500" 
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-sky-500" 
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-sky-500 to-emerald-500 text-slate-950 py-3 rounded-xl font-bold hover:opacity-95 transition shadow-lg shadow-sky-500/20"
          >
            Entrar no Sistema
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Não tem uma conta? <Link href="/register" className="text-sky-400 hover:underline font-medium">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
