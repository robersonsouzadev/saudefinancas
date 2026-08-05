'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Bot, BookOpen, Cpu, HeartPulse, 
  Apple, Wallet, Sparkles, Users, UserCheck, MessageSquare, 
  Settings, LogOut, ChevronDown, Search, Command
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  // Icon color mapping — ONLY the icon gets colored when the item is active!
  const getIconColor = (path: string, defaultColorClass: string, activeColorClass: string) => {
    return isActive(path) ? activeColorClass : defaultColorClass;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#080a0c] text-[#f7f8f8] font-sans antialiased">
      {/* Linear-Style Sleek Sidebar (220px width) */}
      <aside className="w-[220px] bg-[#0f1115] border-r border-[#ffffff12] flex flex-col flex-shrink-0 select-none">
        
        {/* Workspace Header */}
        <div className="h-12 px-3 flex items-center justify-between border-b border-[#ffffff0e]">
          <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition">
            <div className="w-5 h-5 rounded-md bg-[#5e6ad2] flex items-center justify-center font-bold text-white text-[10px] shadow-sm">
              SF
            </div>
            <span className="font-semibold text-xs text-[#f7f8f8] tracking-tight">Saúde & Finanças</span>
            <ChevronDown className="w-3 h-3 text-[#8a8f98]" />
          </div>

          <div className="flex items-center space-x-1 text-[#8a8f98]">
            <button className="p-1 hover:text-white rounded hover:bg-[#16191e] transition">
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto text-[13px]">
          
          {/* VISÃO GERAL */}
          <div>
            <div className="px-2 pb-1 text-[10px] font-semibold text-[#575c66] uppercase tracking-wider">
              Geral
            </div>
            <div className="space-y-0.5">
              <Link 
                href="/" 
                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-md font-medium transition ${
                  isActive('/') 
                    ? 'bg-[#16191e] text-[#f7f8f8]' 
                    : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 transition ${getIconColor('/', 'text-[#575c66]', 'text-[#f7f8f8]')}`} />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>

          {/* INTELIGÊNCIA */}
          <div>
            <div className="px-2 pb-1 text-[10px] font-semibold text-[#575c66] uppercase tracking-wider">
              Inteligência
            </div>
            <div className="space-y-0.5">
              <Link 
                href="/agentes" 
                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-md font-medium transition ${
                  isActive('/agentes') 
                    ? 'bg-[#16191e] text-[#f7f8f8]' 
                    : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
                }`}
              >
                <Bot className={`w-4 h-4 transition ${getIconColor('/agentes', 'text-[#575c66]', 'text-[#a855f7]')}`} />
                <span>Meus Agentes</span>
              </Link>

              <Link 
                href="/base-conhecimento" 
                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-md font-medium transition ${
                  isActive('/base-conhecimento') 
                    ? 'bg-[#16191e] text-[#f7f8f8]' 
                    : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
                }`}
              >
                <BookOpen className={`w-4 h-4 transition ${getIconColor('/base-conhecimento', 'text-[#575c66]', 'text-[#facc15]')}`} />
                <span>Base Conhecimento</span>
              </Link>

              <Link 
                href="/provedores-ia" 
                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-md font-medium transition ${
                  isActive('/provedores-ia') 
                    ? 'bg-[#16191e] text-[#f7f8f8]' 
                    : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
                }`}
              >
                <Cpu className={`w-4 h-4 transition ${getIconColor('/provedores-ia', 'text-[#575c66]', 'text-[#5e6ad2]')}`} />
                <span>Provedores IA</span>
              </Link>
            </div>
          </div>

          {/* BEM-ESTAR */}
          <div>
            <div className="px-2 pb-1 text-[10px] font-semibold text-[#575c66] uppercase tracking-wider">
              Bem-Estar
            </div>
            <div className="space-y-0.5">
              <Link 
                href="/saude" 
                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-md font-medium transition ${
                  isActive('/saude') 
                    ? 'bg-[#16191e] text-[#f7f8f8]' 
                    : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
                }`}
              >
                <HeartPulse className={`w-4 h-4 transition ${getIconColor('/saude', 'text-[#575c66]', 'text-[#f87171]')}`} />
                <span>Saúde & Hábitos</span>
              </Link>

              <Link 
                href="/saude/nutricao" 
                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-md font-medium transition ${
                  isActive('/saude/nutricao') 
                    ? 'bg-[#16191e] text-[#f7f8f8]' 
                    : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
                }`}
              >
                <Apple className={`w-4 h-4 transition ${getIconColor('/saude/nutricao', 'text-[#575c66]', 'text-[#4ade80]')}`} />
                <span>Nutrição</span>
              </Link>

              <Link 
                href="/financas" 
                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-md font-medium transition ${
                  isActive('/financas') 
                    ? 'bg-[#16191e] text-[#f7f8f8]' 
                    : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
                }`}
              >
                <Wallet className={`w-4 h-4 transition ${getIconColor('/financas', 'text-[#575c66]', 'text-[#22c55e]')}`} />
                <span>Finanças</span>
              </Link>

              <Link 
                href="/insights" 
                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-md font-medium transition ${
                  isActive('/insights') 
                    ? 'bg-[#16191e] text-[#f7f8f8]' 
                    : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
                }`}
              >
                <Sparkles className={`w-4 h-4 transition ${getIconColor('/insights', 'text-[#575c66]', 'text-[#eab308]')}`} />
                <span>Insights</span>
              </Link>
            </div>
          </div>

          {/* WORKSPACE & SISTEMA */}
          <div>
            <div className="px-2 pb-1 text-[10px] font-semibold text-[#575c66] uppercase tracking-wider">
              Workspace
            </div>
            <div className="space-y-0.5">
              <Link 
                href="/usuarios" 
                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-md font-medium transition ${
                  isActive('/usuarios') 
                    ? 'bg-[#16191e] text-[#f7f8f8]' 
                    : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
                }`}
              >
                <Users className={`w-4 h-4 transition ${getIconColor('/usuarios', 'text-[#575c66]', 'text-[#3b82f6]')}`} />
                <span>Usuários</span>
              </Link>

              <Link 
                href="/familia" 
                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-md font-medium transition ${
                  isActive('/familia') 
                    ? 'bg-[#16191e] text-[#f7f8f8]' 
                    : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
                }`}
              >
                <UserCheck className={`w-4 h-4 transition ${getIconColor('/familia', 'text-[#575c66]', 'text-[#f97316]')}`} />
                <span>Grupo Familiar</span>
              </Link>

              <Link 
                href="/chat" 
                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-md font-medium transition ${
                  isActive('/chat') 
                    ? 'bg-[#16191e] text-[#f7f8f8]' 
                    : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
                }`}
              >
                <MessageSquare className={`w-4 h-4 transition ${getIconColor('/chat', 'text-[#575c66]', 'text-[#c084fc]')}`} />
                <span>Chat Vita</span>
              </Link>

              <Link 
                href="/configuracoes" 
                className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-md font-medium transition ${
                  isActive('/configuracoes') 
                    ? 'bg-[#16191e] text-[#f7f8f8]' 
                    : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
                }`}
              >
                <Settings className={`w-4 h-4 transition ${getIconColor('/configuracoes', 'text-[#575c66]', 'text-[#a1a1aa]')}`} />
                <span>Configurações</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Footer Profile */}
        <div className="p-2 border-t border-[#ffffff0e] flex items-center justify-between">
          <div className="flex items-center space-x-2 px-1 py-1">
            <div className="w-6 h-6 rounded-full bg-[#1e2229] border border-[#ffffff12] flex items-center justify-center text-[10px] font-bold text-[#f7f8f8]">
              R
            </div>
            <span className="text-[12px] font-medium text-[#8a8f98] truncate max-w-[110px]">Roberson</span>
          </div>

          <Link href="/login" className="p-1 hover:text-rose-400 text-[#575c66] rounded transition" title="Sair">
            <LogOut className="w-3.5 h-3.5" />
          </Link>
        </div>
      </aside>

      {/* Main Container Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#080a0c]">
        {/* Minimal Linear Header Bar */}
        <header className="h-12 border-b border-[#ffffff0e] bg-[#0f1115]/50 backdrop-blur-md flex items-center justify-between px-4 flex-shrink-0 select-none">
          <div className="flex items-center space-x-2 text-[12px] font-medium text-[#8a8f98]">
            <span className="text-[#f7f8f8] font-semibold">Saúde & Finanças</span>
            <span>/</span>
            <span className="text-[#8a8f98] capitalize">{pathname === '/' ? 'Dashboard' : pathname.replace('/', '')}</span>
          </div>

          <div className="flex items-center space-x-3 text-[12px]">
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-[#4ade8015] border border-[#4ade8030] text-[#4ade80] text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span>
              <span>Vita Online</span>
            </div>

            <button className="flex items-center space-x-1 text-[#8a8f98] hover:text-[#f7f8f8] px-2 py-1 rounded hover:bg-[#16191e] transition text-[11px]">
              <Command className="w-3 h-3" />
              <span>K</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
