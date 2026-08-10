'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../providers/AuthProvider';
import { setAuthToken } from '../../../lib/api';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetChannel, setResetChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [devCode, setDevCode] = useState('');

  useEffect(() => {
    const errParam = searchParams.get('error');
    if (errParam) {
      setError(errParam);
    }
  }, [searchParams]);

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
          <h1 className="text-lg sm:text-xl font-semibold text-[#f7f8f8] tracking-tight">Saúde & Finanças</h1>
          <p className="text-xs sm:text-sm text-[#a1a1aa]">Entre na sua conta para continuar</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs font-medium leading-relaxed">
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
              d="M5.3 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.6 7.4C.6 9.4 0 11.6 0 14s.6 4.6 1.6 6.6l3.7-2.9-1-2.9z"
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
          <span className="bg-[#0f1115] px-3 text-xs uppercase tracking-wider text-[#71717a] font-medium absolute">
            ou continue com email
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full bg-[#16191e] border border-[#ffffff12] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#71717a] focus:outline-none focus:border-[#5e6ad2] transition"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#a1a1aa] tracking-wider uppercase block">
                SENHA
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetStep(1);
                  setResetError('');
                  setResetSuccessMsg('');
                  setShowResetModal(true);
                }}
                className="text-xs text-[#818cf8] hover:text-white transition font-medium"
              >
                Primeiro Acesso / Esqueci a Senha
              </button>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#16191e] border border-[#ffffff12] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] placeholder:text-[#71717a] focus:outline-none focus:border-[#5e6ad2] transition"
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
      </div>

      {/* MODAL PRIMEIRO ACESSO / DEFINIR SENHA */}
      {showResetModal && (
        <div className="fixed inset-0 bg-[#080a0c]/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f1115] border border-[#ffffff14] rounded-xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#ffffff0e] pb-3">
              <h3 className="font-semibold text-sm text-[#f7f8f8]">
                {resetStep === 1 ? 'Primeiro Acesso / Definir Senha' : 'Digite o Código e sua Nova Senha'}
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-[#a1a1aa] hover:text-white text-xs">✕</button>
            </div>

            {resetError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                {resetError}
              </div>
            )}

            {resetSuccessMsg && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 text-xs">
                {resetSuccessMsg}
              </div>
            )}

            {resetStep === 1 ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!resetEmail) return;
                  setResetLoading(true);
                  setResetError('');
                  try {
                    const res = await fetch('/api/auth/forgot-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: resetEmail, channel: resetChannel }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Erro ao enviar código');
                    if (data.code) setDevCode(data.code);
                    setResetSuccessMsg(data.message || 'Código enviado!');
                    setResetStep(2);
                  } catch (err: any) {
                    setResetError(err.message || 'Erro ao enviar código de verificação');
                  } finally {
                    setResetLoading(false);
                  }
                }}
                className="space-y-4 text-xs"
              >
                <p className="text-[#a1a1aa] leading-relaxed">
                  Digite seu e-mail cadastrado. Enviaremos um código de 6 dígitos para você definir sua senha:
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a1a1aa] uppercase mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a1a1aa] uppercase mb-1">Enviar Código Via</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setResetChannel('whatsapp')}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition ${
                        resetChannel === 'whatsapp'
                          ? 'bg-[#22c55e15] border-[#22c55e40] text-[#4ade80]'
                          : 'bg-[#16191e] border-[#ffffff10] text-[#a1a1aa]'
                      }`}
                    >
                      📱 WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetChannel('email')}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition ${
                        resetChannel === 'email'
                          ? 'bg-[#5e6ad215] border-[#5e6ad240] text-[#818cf8]'
                          : 'bg-[#16191e] border-[#ffffff10] text-[#a1a1aa]'
                      }`}
                    >
                      ✉️ E-mail
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 rounded-lg bg-[#5e6ad2] hover:bg-[#6e7be2] text-white font-semibold text-xs transition shadow-sm disabled:opacity-50"
                >
                  {resetLoading ? 'Enviando Código...' : 'Enviar Código de Verificação'}
                </button>
              </form>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!resetCode || !newPassword) return;
                  setResetLoading(true);
                  setResetError('');
                  try {
                    const res = await fetch('/api/auth/reset-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.message || 'Erro ao redefinir senha');
                    
                    // Auto login after reset
                    setEmail(resetEmail);
                    setPassword(newPassword);
                    setShowResetModal(false);
                    alert('✅ Senha criada com sucesso! Você já pode entrar.');
                  } catch (err: any) {
                    setResetError(err.message || 'Erro ao redefinir senha');
                  } finally {
                    setResetLoading(false);
                  }
                }}
                className="space-y-4 text-xs"
              >
                {devCode && (
                  <div className="p-2 rounded bg-[#5e6ad215] border border-[#5e6ad230] text-[#818cf8] font-mono text-center">
                    Código de Teste: <strong>{devCode}</strong>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-[#a1a1aa] uppercase mb-1">Código de 6 dígitos</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] font-mono text-center tracking-widest focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#a1a1aa] uppercase mb-1">Crie sua Nova Senha</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Sua senha secreta (min. 6 caracteres)"
                    className="w-full bg-[#16191e] border border-[#ffffff12] rounded-lg px-3 py-2 text-sm text-[#f7f8f8] focus:outline-none focus:border-[#5e6ad2]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-2.5 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold text-xs transition shadow-sm disabled:opacity-50"
                >
                  {resetLoading ? 'Salvando...' : 'Salvar Senha e Entrar'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#080a0c] text-[#f7f8f8]">
        <div className="w-6 h-6 border-2 border-[#5e6ad2] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
