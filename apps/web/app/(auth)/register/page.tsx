'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Servidor indisponível no momento. Verifique a conexão e tente novamente.');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Erro ao realizar cadastro.');
      }

      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      router.push('/');
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('Tempo limite esgotado ao conectar ao servidor. Tente novamente.');
      } else {
        setError(err.message || 'Erro ao cadastrar usuário');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080a0c] text-[#f7f8f8] p-4 font-sans">
      <div className="w-full max-w-sm bg-[#0f1115] border border-[#ffffff12] rounded-lg p-6 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-md bg-[#5e6ad2] mx-auto flex items-center justify-center font-bold text-lg text-white shadow-sm">
            SF
          </div>
          <h1 className="text-lg sm:text-xl font-semibold text-[#f7f8f8] tracking-tight">Criar Conta</h1>
          <p className="text-xs sm:text-sm text-[#a1a1aa]">Preencha os dados abaixo para se cadastrar</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase block">
              NOME COMPLETO
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full bg-[#16191e] border border-[#ffffff12] rounded-md px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#71717a] focus:outline-none focus:border-[#5e6ad2] transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase block">
              EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-[#16191e] border border-[#ffffff12] rounded-md px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#71717a] focus:outline-none focus:border-[#5e6ad2] transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase block">
              SENHA
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#16191e] border border-[#ffffff12] rounded-md px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#71717a] focus:outline-none focus:border-[#5e6ad2] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-sm font-medium transition shadow-sm disabled:opacity-50"
          >
            {loading ? 'Cadastrando...' : 'Criar Conta'}
          </button>
        </form>

        <div className="text-center text-xs text-[#a1a1aa]">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-[#5e6ad2] hover:underline font-medium">
            Fazer Login
          </Link>
        </div>
      </div>
    </div>
  );
}
