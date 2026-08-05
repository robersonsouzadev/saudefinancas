'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080a0c] text-[#f7f8f8] p-4 font-sans">
      <div className="w-full max-w-sm bg-[#0f1115] border border-[#ffffff12] rounded-lg p-6 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-md bg-[#5e6ad2] mx-auto flex items-center justify-center font-bold text-lg text-white shadow-sm">
            SF
          </div>
          <h1 className="text-lg font-semibold text-[#f7f8f8] tracking-tight">Criar Nova Conta</h1>
          <p className="text-xs text-[#8a8f98]">Preencha seus dados para começar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider mb-1">Nome Completo</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Roberson Souza"
              className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]" 
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]" 
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#8a8f98] uppercase tracking-wider mb-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-9 px-3 rounded bg-[#16191e] border border-[#ffffff12] text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]" 
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full h-9 bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-medium rounded text-xs transition shadow-sm"
          >
            Cadastrar no Sistema
          </button>
        </form>

        <p className="text-center text-[11px] text-[#8a8f98]">
          Já tem uma conta? <Link href="/login" className="text-[#5e6ad2] hover:underline font-medium">Faça login</Link>
        </p>
      </div>
    </div>
  );
}
