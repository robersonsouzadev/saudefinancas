import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './providers/AuthProvider';

export const metadata: Metadata = {
  title: 'Saúde & Finanças',
  description: 'Sistema Integrado de Saúde, Longevidade e Gestão Financeira',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased bg-[#080a0c] text-[#f7f8f8]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}



