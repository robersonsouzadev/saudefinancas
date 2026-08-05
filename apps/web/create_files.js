const fs = require('fs');
const path = require('path');

const rootDir = 'c:/Users/rober/.gemini/antigravity/scratch/SaudeFinancas/apps/web';

const files = {
  'package.json': `{
  "name": "web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "lucide-react": "^0.300.0",
    "next": "15.0.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "recharts": "^2.10.3"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "typescript": "^5"
  }
}
`,
  'next.config.mjs': `/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
`,
  'postcss.config.mjs': `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
`,
  'tailwind.config.ts': `import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [],
}
export default config
`,
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`,
  'app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #f8fafc;
  --foreground: #0f172a;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0f172a;
    --foreground: #f8fafc;
  }
}

body {
  color: var(--foreground);
  background: var(--background);
}

.glass-card {
  @apply bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-xl rounded-2xl;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.dark ::-webkit-scrollbar-thumb {
  background: #475569;
}
`,
  'app/layout.tsx': `import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Saúde e Finanças',
  description: 'App para gestão de saúde e finanças',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
`,
  'app/page.tsx': `import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
`,
  'app/(auth)/login/page.tsx': `import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-400 to-emerald-400 dark:from-slate-800 dark:to-slate-900 p-4">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center mb-6">Bem-vindo</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="w-full px-4 py-2 rounded-lg border bg-white/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input type="password" className="w-full px-4 py-2 rounded-lg border bg-white/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-sky-500" />
          </div>
          <button className="w-full bg-slate-900 dark:bg-sky-500 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition">Entrar</button>
        </form>
        <p className="mt-4 text-center text-sm">
          Não tem uma conta? <Link href="/register" className="text-sky-600 dark:text-sky-400 font-medium">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
`,
  'app/(auth)/register/page.tsx': `import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-500 to-cyan-400 dark:from-slate-800 dark:to-slate-900 p-4">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="text-3xl font-bold text-center mb-6">Criar Conta</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input type="text" className="w-full px-4 py-2 rounded-lg border bg-white/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="w-full px-4 py-2 rounded-lg border bg-white/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha</label>
            <input type="password" className="w-full px-4 py-2 rounded-lg border bg-white/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <button className="w-full bg-slate-900 dark:bg-violet-500 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition">Registrar</button>
        </form>
        <p className="mt-4 text-center text-sm">
          Já possui conta? <Link href="/login" className="text-violet-600 dark:text-violet-400 font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
`,
  'app/(dashboard)/layout.tsx': `import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden md:flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Vita</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link href="/dashboard" className="block px-4 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">Dashboard</Link>
          <Link href="/saude" className="block px-4 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">Saúde</Link>
          <Link href="/saude/nutricao" className="block px-4 py-2 rounded pl-8 text-sm hover:bg-slate-100 dark:hover:bg-slate-700">Nutrição</Link>
          <Link href="/financas" className="block px-4 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">Finanças</Link>
          <Link href="/insights" className="block px-4 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">Insights</Link>
          <Link href="/chat" className="block px-4 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">Chat Vita</Link>
          <Link href="/configuracoes" className="block px-4 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700">Configurações</Link>
        </nav>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
          <div className="text-lg font-semibold">Dashboard</div>
          <div className="flex items-center space-x-4">
            <input type="text" placeholder="Buscar..." className="px-4 py-1 rounded-full border dark:bg-slate-700 dark:border-slate-600" />
            <div className="w-8 h-8 rounded-full bg-emerald-500"></div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
`,
  'app/(dashboard)/page.tsx': `export default function DashboardHome() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Visão Geral</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-medium mb-2">Wellbeing Score</h3>
          <div className="text-4xl font-bold text-sky-500">85<span className="text-sm text-slate-500">/100</span></div>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-lg font-medium mb-2">Saúde</h3>
          <div className="text-4xl font-bold text-emerald-500">A</div>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-lg font-medium mb-2">Finanças</h3>
          <div className="text-4xl font-bold text-violet-500">R$ 2.450</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 min-h-[300px] flex items-center justify-center">
          <p className="text-slate-500">Expense Chart (Recharts Bar/Pie)</p>
        </div>
        <div className="glass-card p-6 min-h-[300px] flex items-center justify-center">
          <p className="text-slate-500">Calorie Tracker Gauge</p>
        </div>
      </div>
      
      <div className="glass-card p-6">
        <h3 className="text-lg font-medium mb-4">Insights Ativos</h3>
        <ul className="space-y-3">
          <li className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">Você gasta 30% a mais com fast food nos dias em que dorme menos de 6 horas.</li>
          <li className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg">Ótimo trabalho mantendo a hidratação esta semana!</li>
        </ul>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        <button className="w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg flex items-center justify-center hover:scale-105 transition">+</button>
      </div>
    </div>
  );
}
`,
  'app/(dashboard)/saude/page.tsx': `export default function SaudePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Diário de Saúde</h1>
      <div className="glass-card p-6">
        <h2 className="text-lg font-medium mb-4">Registro de Hoje</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Sono</h3>
            <p className="text-2xl mt-2">7h 30m</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Água</h3>
            <p className="text-2xl mt-2">1.5 L</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Humor</h3>
            <p className="text-2xl mt-2">😊 Bem</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Exercício</h3>
            <p className="text-2xl mt-2">45m Corrida</p>
          </div>
        </div>
      </div>
    </div>
  );
}
`,
  'app/(dashboard)/saude/nutricao/page.tsx': `export default function NutricaoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Diário Nutricional</h1>
      <div className="glass-card p-6">
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
          <p className="text-slate-500">Arraste uma foto da sua refeição ou clique para fazer upload</p>
        </div>
      </div>
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-medium">Progresso de Macros</h2>
        <div>
          <div className="flex justify-between text-sm mb-1"><span>Carboidratos</span><span>150g / 200g</span></div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div className="bg-sky-500 h-2.5 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1"><span>Proteínas</span><span>90g / 120g</span></div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1"><span>Gorduras</span><span>40g / 65g</span></div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div className="bg-amber-500 h-2.5 rounded-full" style={{ width: '61%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
`,
  'app/(dashboard)/financas/page.tsx': `export default function FinancasPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestão Financeira</h1>
        <button className="bg-violet-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-violet-600 transition">Nova Transação</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
          <h3 className="text-sm font-medium opacity-80">Saldo Atual</h3>
          <div className="text-3xl font-bold mt-2">R$ 12.450,00</div>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-slate-500">Receitas (Mês)</h3>
          <div className="text-2xl font-bold text-emerald-500 mt-2">R$ 15.000,00</div>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-medium text-slate-500">Despesas (Mês)</h3>
          <div className="text-2xl font-bold text-red-500 mt-2">R$ 2.550,00</div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-medium mb-4">Transações Recentes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b dark:border-slate-700 text-slate-500">
                <th className="pb-3 font-medium">Data</th>
                <th className="pb-3 font-medium">Descrição</th>
                <th className="pb-3 font-medium">Categoria</th>
                <th className="pb-3 font-medium text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-700">
              <tr>
                <td className="py-3">05 Ago 2026</td>
                <td className="py-3">Supermercado</td>
                <td className="py-3"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs">Alimentação</span></td>
                <td className="py-3 text-right text-red-500">- R$ 450,00</td>
              </tr>
              <tr>
                <td className="py-3">04 Ago 2026</td>
                <td className="py-3">Salário</td>
                <td className="py-3"><span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs">Renda</span></td>
                <td className="py-3 text-right text-emerald-500">+ R$ 15.000,00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
`,
  'app/(dashboard)/insights/page.tsx': `export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Insights e Correlações</h1>
      <p className="text-slate-500">Descubra como seus hábitos de saúde impactam suas finanças.</p>
      
      <div className="space-y-4">
        <div className="glass-card p-6 border-l-4 border-l-red-500">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold rounded mb-2">Crítico</span>
              <h3 className="text-lg font-medium">Gatilho de Estresse e Gastos</h3>
              <p className="text-slate-600 dark:text-slate-300 mt-1">Nos dias em que seu nível de estresse está acima de 8, seus gastos supérfluos aumentam em média 45%.</p>
            </div>
            <div className="flex space-x-2">
              <button className="text-slate-400 hover:text-emerald-500 transition">👍</button>
              <button className="text-slate-400 hover:text-red-500 transition">👎</button>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold rounded mb-2">Atenção</span>
              <h3 className="text-lg font-medium">Impacto do Sono na Alimentação</h3>
              <p className="text-slate-600 dark:text-slate-300 mt-1">Sua ingestão calórica excede a meta em dias após dormir menos de 6 horas.</p>
            </div>
            <div className="flex space-x-2">
              <button className="text-slate-400 hover:text-emerald-500 transition">👍</button>
              <button className="text-slate-400 hover:text-red-500 transition">👎</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`,
  'app/(dashboard)/chat/page.tsx': `export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-1 glass-card p-6 mb-4 overflow-y-auto space-y-4">
        <div className="flex items-start max-w-[80%]">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex-shrink-0 mr-3"></div>
          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border dark:border-slate-700 shadow-sm">
            <p>Olá! Sou o Vita. Notei que você gastou um pouco mais em alimentação fora hoje. Quer registrar isso?</p>
          </div>
        </div>
        <div className="flex items-start max-w-[80%] ml-auto justify-end">
          <div className="bg-sky-500 text-white p-3 rounded-2xl rounded-tr-none shadow-sm">
            <p>Sim, gastei R$ 120 no restaurante e comi um prato com bastante carboidrato.</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-300 flex-shrink-0 ml-3"></div>
        </div>
      </div>
      <div className="glass-card p-4 flex items-center space-x-4">
        <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition">
          🎤
        </button>
        <input type="text" placeholder="Fale com o Vita..." className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0" />
        <button className="bg-emerald-500 text-white p-2 rounded-full hover:bg-emerald-600 transition">
          ➤
        </button>
      </div>
    </div>
  );
}
`,
  'app/(dashboard)/configuracoes/page.tsx': `export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Configurações</h1>
      
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-medium border-b dark:border-slate-700 pb-2">Provedores LLM</h2>
        <div>
          <label className="block text-sm font-medium mb-1">OpenAI API Key</label>
          <input type="password" placeholder="sk-..." className="w-full px-4 py-2 rounded-lg border bg-white/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-slate-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Anthropic API Key</label>
          <input type="password" placeholder="sk-ant-..." className="w-full px-4 py-2 rounded-lg border bg-white/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-slate-500" />
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-medium border-b dark:border-slate-700 pb-2">Integrações</h2>
        <div>
          <label className="block text-sm font-medium mb-1">WhatsApp Uazapi Webhook</label>
          <input type="text" placeholder="https://..." className="w-full px-4 py-2 rounded-lg border bg-white/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-slate-500" />
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-medium border-b dark:border-slate-700 pb-2">Perfil de Usuário</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <input type="text" defaultValue="Usuário" className="w-full px-4 py-2 rounded-lg border bg-white/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" defaultValue="usuario@exemplo.com" className="w-full px-4 py-2 rounded-lg border bg-white/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-slate-500" />
          </div>
        </div>
      </div>
      
      <button className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition">Salvar Configurações</button>
    </div>
  );
}
`
};

Object.entries(files).forEach(([relPath, content]) => {
  const fullPath = path.join(rootDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log('Created:', fullPath);
});
