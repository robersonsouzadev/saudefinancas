'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../providers/AuthProvider';
import { setAuthToken, authFetch } from '../../../../lib/api';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    const err = searchParams.get('error');

    if (err || !token) {
      setError('Falha ao autenticar com a conta Google. Tente novamente.');
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    // Save token in cookie & localStorage
    setAuthToken(token);

    // Fetch user profile
    authFetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) throw new Error('Não foi possível carregar o perfil.');
        const user = await res.json();
        login(token, user);
      })
      .catch(() => {
        setError('Erro ao concluir autenticação.');
        setTimeout(() => router.push('/login'), 3000);
      });
  }, [searchParams, login, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080a0c] text-[#f7f8f8] p-4 font-sans">
      <div className="w-full max-w-sm bg-[#0f1115] border border-[#ffffff12] rounded-lg p-6 space-y-4 text-center shadow-2xl">
        <div className="w-10 h-10 rounded-md bg-[#5e6ad2] mx-auto flex items-center justify-center font-bold text-lg text-white animate-pulse shadow-sm">
          SF
        </div>
        {error ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-400">{error}</p>
            <p className="text-xs text-[#8a8f98]">Redirecionando para a página de login...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-base font-semibold text-[#f7f8f8]">Autenticando...</h2>
            <p className="text-xs text-[#8a8f98]">Conectando com sua conta Google, aguarde um instante.</p>
            <div className="w-6 h-6 border-2 border-[#5e6ad2] border-t-transparent rounded-full animate-spin mx-auto mt-4" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#080a0c] text-[#f7f8f8]">
        <div className="w-6 h-6 border-2 border-[#5e6ad2] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
