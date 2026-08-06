'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../providers/AuthProvider';
import { setAuthToken } from '../../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Servidor indisponível no momento. Verifique a conexão e tente novamente.');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'E-mail ou senha incorretos.');
      }

      if (data.access_token) {
        setAuthToken(data.access_token);
        login(data.access_token, data.user);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('Tempo limite esgotado ao conectar ao servidor. Tente novamente.');
      } else {
        setError(err.message || 'Erro ao realizar login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080a0c] text-[#f7f8f8] p-4 font-sans select-none">
      <div className="w-full max-w-sm bg-[#0f1115] border border-[#ffffff12] rounded-xl p-6 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-lg bg-[#5e6ad2] mx-auto flex items-center justify-center font-bold text-lg text-white shadow-sm">
            SF
          </div>
          <h1 className="text-lg font-semibold text-[#f7f8f8] tracking-tight">Saúde & Finanças</h1>
          <p className="text-xs text-[#8a8f98]">Entre na sua conta para continuar</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Google OAuth Login Button */}
        <button
          type="button"
          onClick={loginWithGoogle}
          className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-lg bg-[#16191e] hover:bg-[#1e2229] border border-[#ffffff14] text-[#f7f8f8] text-xs font-medium transition duration-150 active:scale-[0.99] shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.3 8.9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
            />
            <path
              fill="#FBBC05"
              d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 10.6 0 12s.6 2.6 1.6 4.6l3.7-2.8z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.3-6.7-5.3L1.6 15.9C3.5 19.7 7.4 23 12 23z"
            />
          </svg>
          <span>Entrar com a conta do Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#ffffff0e] w-full" />
          <span className="bg-[#0f1115] px-3 text-[10px] uppercase tracking-wider text-[#575c66] font-medium absolute">
            ou continue com email
          </span>
        </div>

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
              className="w-full bg-[#16191e] border border-[#ffffff12] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#575c66] focus:outline-none focus:border-[#5e6ad2] transition"
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
              className="w-full bg-[#16191e] border border-[#ffffff12] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#575c66] focus:outline-none focus:border-[#5e6ad2] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6e7be2] text-white text-sm font-medium transition shadow-sm disabled:opacity-50"
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
