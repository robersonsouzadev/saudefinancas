'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Bot, BookOpen, Cpu, HeartPulse, 
  Apple, Wallet, TrendingUp, Sparkles, Users, UserCheck, MessageSquare, 
  Settings, LogOut, ChevronDown, Search, Command, Menu, X, Pill, TestTube, Dumbbell, Ruler,
  PanelLeftClose, PanelLeft
} from 'lucide-react';
import MultimodalFAB from './components/MultimodalFAB';
import { useAuth } from '../providers/AuthProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Usuário';
  const initial = displayName.charAt(0).toUpperCase();

  const isActive = (path: string) => pathname === path;

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
    }
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, [isMobileMenuOpen]);

  // Icon color mapping — ONLY the icon gets colored when the item is active!
  const getIconColor = (path: string, defaultColorClass: string, activeColorClass: string) => {
    return isActive(path) ? activeColorClass : defaultColorClass;
  };

  const navContent = (collapsed: boolean = false) => (
    <>
      {/* VISÃO GERAL */}
      <div>
        {!collapsed && (
          <div className="px-2 pb-1 text-[10px] font-semibold text-[#575c66] uppercase tracking-wider">
            Geral
          </div>
        )}
        <div className="space-y-0.5">
          <Link 
            href="/" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Dashboard' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 shrink-0 transition ${getIconColor('/', 'text-[#575c66]', 'text-[#f7f8f8]')}`} />
            {!collapsed && <span>Dashboard</span>}
          </Link>
        </div>
      </div>

      {/* SAÚDE & BEM-ESTAR */}
      <div>
        {!collapsed && (
          <div className="px-2 pb-1 text-[10px] font-semibold text-[#575c66] uppercase tracking-wider">
            Saúde & Bem-Estar
          </div>
        )}
        <div className="space-y-0.5">
          <Link 
            href="/saude" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Saúde & Hábitos' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/saude') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <HeartPulse className={`w-4 h-4 shrink-0 transition ${getIconColor('/saude', 'text-[#575c66]', 'text-[#f87171]')}`} />
            {!collapsed && <span>Saúde & Hábitos</span>}
          </Link>

          <Link 
            href="/saude/treinos" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Treinos Físicos' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/saude/treinos') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <Dumbbell className={`w-4 h-4 shrink-0 transition ${getIconColor('/saude/treinos', 'text-[#575c66]', 'text-[#6366f1]')}`} />
            {!collapsed && <span>Treinos Físicos</span>}
          </Link>

          <Link 
            href="/medicamentos" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Medicamentos' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/medicamentos') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <Pill className={`w-4 h-4 shrink-0 transition ${getIconColor('/medicamentos', 'text-[#575c66]', 'text-[#f472b6]')}`} />
            {!collapsed && <span>Medicamentos</span>}
          </Link>

          <Link 
            href="/saude/nutricao" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Nutrição' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/saude/nutricao') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <Apple className={`w-4 h-4 shrink-0 transition ${getIconColor('/saude/nutricao', 'text-[#575c66]', 'text-[#4ade80]')}`} />
            {!collapsed && <span>Nutrição</span>}
          </Link>

          <Link 
            href="/exames" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Exames Lab' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/exames') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <TestTube className={`w-4 h-4 shrink-0 transition ${getIconColor('/exames', 'text-[#575c66]', 'text-[#c084fc]')}`} />
            {!collapsed && <span>Exames Lab</span>}
          </Link>

          <Link 
            href="/avaliacao-corporal" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Avaliação Corporal' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/avaliacao-corporal') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <Ruler className={`w-4 h-4 shrink-0 transition ${getIconColor('/avaliacao-corporal', 'text-[#575c66]', 'text-[#3b82f6]')}`} />
            {!collapsed && <span>Avaliação Corporal</span>}
          </Link>
        </div>
      </div>

      {/* FINANÇAS & PATRIMÔNIO */}
      <div>
        {!collapsed && (
          <div className="px-2 pb-1 text-[10px] font-semibold text-[#575c66] uppercase tracking-wider">
            Finanças & Patrimônio
          </div>
        )}
        <div className="space-y-0.5">
          <Link 
            href="/financas" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Finanças' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/financas') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <Wallet className={`w-4 h-4 shrink-0 transition ${getIconColor('/financas', 'text-[#575c66]', 'text-[#22c55e]')}`} />
            {!collapsed && <span>Finanças</span>}
          </Link>

          <Link 
            href="/investimentos" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Investimentos' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/investimentos') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <TrendingUp className={`w-4 h-4 shrink-0 transition ${getIconColor('/investimentos', 'text-[#575c66]', 'text-[#10b981]')}`} />
            {!collapsed && <span>Investimentos</span>}
          </Link>
        </div>
      </div>

      {/* INTELIGÊNCIA */}
      <div>
        {!collapsed && (
          <div className="px-2 pb-1 text-[10px] font-semibold text-[#575c66] uppercase tracking-wider">
            Inteligência
          </div>
        )}
        <div className="space-y-0.5">
          <Link 
            href="/insights" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Insights Bio-Financeiros' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/insights') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <Sparkles className={`w-4 h-4 shrink-0 transition ${getIconColor('/insights', 'text-[#575c66]', 'text-[#eab308]')}`} />
            {!collapsed && <span>Insights Bio-Financeiros</span>}
          </Link>

          <Link 
            href="/agentes" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Meus Agentes' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/agentes') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <Bot className={`w-4 h-4 shrink-0 transition ${getIconColor('/agentes', 'text-[#575c66]', 'text-[#a855f7]')}`} />
            {!collapsed && <span>Meus Agentes</span>}
          </Link>

          <Link 
            href="/base-conhecimento" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Base Conhecimento' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/base-conhecimento') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <BookOpen className={`w-4 h-4 shrink-0 transition ${getIconColor('/base-conhecimento', 'text-[#575c66]', 'text-[#facc15]')}`} />
            {!collapsed && <span>Base Conhecimento</span>}
          </Link>

          <Link 
            href="/provedores-ia" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Provedores IA' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/provedores-ia') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <Cpu className={`w-4 h-4 shrink-0 transition ${getIconColor('/provedores-ia', 'text-[#575c66]', 'text-[#5e6ad2]')}`} />
            {!collapsed && <span>Provedores IA</span>}
          </Link>
        </div>
      </div>

      {/* WORKSPACE & SISTEMA */}
      <div>
        {!collapsed && (
          <div className="px-2 pb-1 text-[10px] font-semibold text-[#575c66] uppercase tracking-wider">
            Workspace
          </div>
        )}
        <div className="space-y-0.5">
          <Link 
            href="/usuarios" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Usuários' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/usuarios') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <Users className={`w-4 h-4 shrink-0 transition ${getIconColor('/usuarios', 'text-[#575c66]', 'text-[#3b82f6]')}`} />
            {!collapsed && <span>Usuários</span>}
          </Link>

          <Link 
            href="/familia" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Grupo Familiar' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/familia') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <UserCheck className={`w-4 h-4 shrink-0 transition ${getIconColor('/familia', 'text-[#575c66]', 'text-[#f97316]')}`} />
            {!collapsed && <span>Grupo Familiar</span>}
          </Link>

          <Link 
            href="/chat" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Chat Vita' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/chat') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <MessageSquare className={`w-4 h-4 shrink-0 transition ${getIconColor('/chat', 'text-[#575c66]', 'text-[#c084fc]')}`} />
            {!collapsed && <span>Chat Vita</span>}
          </Link>

          <Link 
            href="/configuracoes" 
            onClick={() => setIsMobileMenuOpen(false)}
            title={collapsed ? 'Configurações' : undefined}
            className={`flex items-center space-x-2.5 px-2 py-2 rounded-md font-medium transition ${
              collapsed ? 'justify-center' : ''
            } ${
              isActive('/configuracoes') 
                ? 'bg-[#16191e] text-[#f7f8f8]' 
                : 'text-[#8a8f98] hover:bg-[#16191e] hover:text-[#f7f8f8]'
            }`}
          >
            <Settings className={`w-4 h-4 shrink-0 transition ${getIconColor('/configuracoes', 'text-[#575c66]', 'text-[#a1a1aa]')}`} />
            {!collapsed && <span>Configurações</span>}
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-[#080a0c] text-[#f7f8f8] font-sans antialiased">
      
      {/* Desktop Responsive & Collapsible Sidebar */}
      <aside 
        className={`hidden md:flex ${
          isSidebarCollapsed ? 'w-16' : 'w-[220px]'
        } bg-[#0f1115] border-r border-[#ffffff12] flex-col flex-shrink-0 select-none transition-all duration-200`}
      >
        <div className="h-12 px-3 flex items-center justify-between border-b border-[#ffffff0e]">
          <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition overflow-hidden">
            <div className="w-5 h-5 rounded-md bg-[#5e6ad2] flex items-center justify-center font-bold text-white text-[10px] shadow-sm shrink-0">
              SF
            </div>
            {!isSidebarCollapsed && (
              <>
                <span className="font-semibold text-xs text-[#f7f8f8] tracking-tight truncate">Saúde & Finanças</span>
                <ChevronDown className="w-3 h-3 text-[#8a8f98] shrink-0" />
              </>
            )}
          </div>

          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1 hover:text-white text-[#8a8f98] rounded hover:bg-[#16191e] transition shrink-0"
            title={isSidebarCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          >
            {isSidebarCollapsed ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto text-[13px] no-scrollbar">
          {navContent(isSidebarCollapsed)}
        </nav>

        <div className="p-2 border-t border-[#ffffff0e] flex items-center justify-between">
          <div className="flex items-center space-x-2 px-1 py-1 overflow-hidden">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={displayName} className="w-6 h-6 rounded-full object-cover border border-[#ffffff12] shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[#1e2229] border border-[#ffffff12] flex items-center justify-center text-[10px] font-bold text-[#f7f8f8] shrink-0">
                {initial}
              </div>
            )}
            {!isSidebarCollapsed && (
              <span className="text-[12px] font-medium text-[#8a8f98] truncate max-w-[110px]">{displayName}</span>
            )}
          </div>

          <button 
            onClick={logout} 
            className="p-1.5 hover:text-rose-400 text-[#575c66] rounded transition min-h-[36px] min-w-[36px] flex items-center justify-center" 
            title="Sair do Sistema"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay & Sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="fixed inset-0 bg-[#080a0c]/85 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <aside className="relative w-72 max-w-[85vw] bg-[#0f1115] border-r border-[#ffffff14] flex flex-col h-full z-10 shadow-2xl safe-pb">
            <div className="h-14 px-4 flex items-center justify-between border-b border-[#ffffff0e] safe-pt">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-md bg-[#5e6ad2] flex items-center justify-center font-bold text-white text-xs shadow-sm">
                  SF
                </div>
                <span className="font-semibold text-sm text-[#f7f8f8] tracking-tight">Saúde & Finanças</span>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md hover:bg-[#16191e] text-[#8a8f98] hover:text-[#f7f8f8]"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto text-sm">
              {navContent(false)}
            </nav>

            <div className="p-3 border-t border-[#ffffff0e] flex items-center justify-between bg-[#16191e]/50 safe-pb">
              <div className="flex items-center space-x-2 overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={displayName} className="w-7 h-7 rounded-full object-cover border border-[#ffffff12] shrink-0" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#1e2229] border border-[#ffffff12] flex items-center justify-center text-xs font-bold text-[#f7f8f8] shrink-0">
                    {initial}
                  </div>
                )}
                <span className="text-xs font-medium text-[#8a8f98] truncate max-w-[130px]">{displayName}</span>
              </div>

              <button 
                onClick={() => { setIsMobileMenuOpen(false); logout(); }} 
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:text-rose-400 text-[#575c66] rounded transition" 
                title="Sair do Sistema"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Container Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#080a0c]">
        {/* Minimal Linear Header Bar */}
        <header className="h-12 border-b border-[#ffffff0e] bg-[#0f1115]/50 backdrop-blur-md flex items-center justify-between px-3 md:px-4 flex-shrink-0 select-none safe-pt">
          <div className="flex items-center space-x-2 text-[12px] font-medium text-[#8a8f98] min-w-0 overflow-hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-[#8a8f98] hover:text-white hover:bg-[#16191e] transition shrink-0"
              aria-label="Abrir Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-[#f7f8f8] font-semibold hidden sm:inline shrink-0">Saúde & Finanças</span>
            <span className="hidden sm:inline shrink-0">/</span>
            <span className="text-[#8a8f98] capitalize truncate min-w-0">{pathname === '/' ? 'Dashboard' : pathname.replace('/', '').replace('-', ' ')}</span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 text-[12px] shrink-0">
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-[#4ade8015] border border-[#4ade8030] text-[#4ade80] text-[10px] sm:text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]"></span>
              <span>Vita Online</span>
            </div>

            <button className="hidden sm:flex items-center space-x-1 text-[#8a8f98] hover:text-[#f7f8f8] px-2 py-1 rounded hover:bg-[#16191e] transition text-[11px]">
              <Command className="w-3 h-3" />
              <span>K</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-3 sm:p-5 md:p-6 xl:p-8 2xl:p-10 safe-pb">
          {children}
        </div>
      </main>

      {/* Vita IA — Floating Action Button (Global, hidden when mobile menu open) */}
      {!isMobileMenuOpen && <MultimodalFAB />}
    </div>
  );
}
