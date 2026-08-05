import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-white font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-sky-500/20">
            SF
          </div>
          <div>
            <h2 className="font-bold text-base text-white leading-tight">Saúde & Finanças</h2>
            <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Vita Assistente Ativo
            </p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-4 overflow-y-auto text-xs font-semibold">
          {/* PRINCIPAL */}
          <div>
            <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Principal</div>
            <div className="space-y-1">
              <Link href="/" className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition">
                <span className="text-base">📊</span>
                <span>Dashboard</span>
              </Link>
              <Link href="/agentes" className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition">
                <span className="text-base">🤖</span>
                <span>Meus Agentes</span>
              </Link>
              <Link href="/base-conhecimento" className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition">
                <span className="text-base">📚</span>
                <span>Base de Conhecimento</span>
              </Link>
              <Link href="/provedores-ia" className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition">
                <span className="text-base">🔀</span>
                <span>Provedores de IA</span>
              </Link>
            </div>
          </div>

          {/* BEM-ESTAR */}
          <div>
            <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Bem-Estar Integrado</div>
            <div className="space-y-1">
              <Link href="/saude" className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition">
                <span className="text-base">🏥</span>
                <span>Saúde & Hábitos</span>
              </Link>
              <Link href="/saude/nutricao" className="flex items-center space-x-3 px-3 py-2 rounded-xl pl-8 text-[11px] text-sky-400 hover:bg-slate-800 hover:text-white transition">
                <span>🥗 Diário Nutricional</span>
              </Link>
              <Link href="/financas" className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition">
                <span className="text-base">💰</span>
                <span>Finanças & Contas</span>
              </Link>
              <Link href="/insights" className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition">
                <span className="text-base">🧠</span>
                <span>Insights IA</span>
              </Link>
            </div>
          </div>

          {/* SISTEMA */}
          <div>
            <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sistema</div>
            <div className="space-y-1">
              <Link href="/chat" className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition">
                <span className="text-base">💬</span>
                <span>Chat Conversacional</span>
              </Link>
              <Link href="/configuracoes" className="flex items-center space-x-3 px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition">
                <span className="text-base">⚙️</span>
                <span>Configurações</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link href="/login" className="flex items-center justify-center w-full py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition">
            🚪 Sair da Conta
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-6">
            <h1 className="text-base font-bold text-white">Painel Unificado</h1>
            {/* Top Quick Links */}
            <nav className="hidden lg:flex items-center space-x-1 text-xs font-medium">
              <Link href="/" className="px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">Dashboard</Link>
              <Link href="/agentes" className="px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">🤖 Meus Agentes</Link>
              <Link href="/base-conhecimento" className="px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">📚 Base de Conhecimento</Link>
              <Link href="/provedores-ia" className="px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">🔀 Provedores de IA</Link>
              <Link href="/saude" className="px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">Saúde</Link>
              <Link href="/financas" className="px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">Finanças</Link>
              <Link href="/chat" className="px-3 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition">Chat Vita</Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <Link href="/configuracoes" className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs" title="Configurações">
              ⚙️
            </Link>
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center font-bold text-xs text-slate-950 shadow-md">
                U
              </div>
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline">Usuário</span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950">
          {children}
        </div>
      </main>
    </div>
  );
}
