'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Servidor indisponível no momento. Verifique a conexão e tente novamente.');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'E-mail ou senha incorretos.');
      }

      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
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
          <h1 className="text-lg font-semibold text-[#f7f8f8] tracking-tight">Saúde & Finanças</h1>
          <p className="text-xs text-[#8a8f98]">Entre na sua conta para continuar</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-[#8a8f98] tracking-wider uppercase block">
              EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-[#16191e] border border-[#ffffff12] rounded-md px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#575c66] focus:outline-none focus:border-[#5e6ad2] transition"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-[#8a8f98] tracking-wider uppercase block">
              SENHA
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#16191e] border border-[#ffffff12] rounded-md px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#575c66] focus:outline-none focus:border-[#5e6ad2] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-sm font-medium transition shadow-sm disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="text-center text-xs text-[#8a8f98]">
          Não tem uma conta?{' '}
          <Link href="/register" className="text-[#5e6ad2] hover:underline font-medium">
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  );
}
