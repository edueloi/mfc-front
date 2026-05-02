import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  Users, 
  LayoutDashboard, 
  Layers, 
  UserCog, 
  Settings, 
  MapPin, 
  Menu, 
  X, 
  LogOut,
  UserCheck,
  DollarSign,
  BookOpen,
  Ticket,
  FileText,
  FileSpreadsheet,
  Bell,
  ChevronRight,
  Sparkles,
  Search,
  SlidersHorizontal
} from 'lucide-react';
import { UserRoleType, User as UserType, City } from '../types';
import { api } from '../api';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../src/lib/utils';

interface LayoutProps {
  currentUser: UserType;
  onLogout: () => void;
}

type NavItem = {
  name: string;
  icon: React.ElementType;
  path: string;
  roles?: UserRoleType[];
  checkSpecial?: (user: UserType) => boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const Layout: React.FC<LayoutProps> = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile drawer
  const [isCollapsed, setIsCollapsed] = useState(false); // Desktop collapse
  const [selectedCityId, setSelectedCityId] = useState<string>(currentUser.cityId);
  const [cities, setCities] = useState<City[]>([]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setSelectedCityId(currentUser.cityId);
  }, [currentUser]);

  useEffect(() => {
    api.getCities()
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  const currentCity = cities.find(c => c.id === selectedCityId) || cities[0] || { id: '0', name: 'Sem cidade', uf: '' };

  const navigationSections: NavSection[] = [
    {
      label: "Principal",
      items: [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { 
          name: 'MFCistas', 
          icon: Users, 
          path: '/mfcistas', 
          roles: [UserRoleType.ADMIN, UserRoleType.COORD_CIDADE, UserRoleType.TESOUREIRO, UserRoleType.COORD_ESTADO] 
        },
        { 
          name: 'Equipes Base', 
          icon: Layers, 
          path: '/equipes', 
          roles: [UserRoleType.ADMIN, UserRoleType.COORD_CIDADE] 
        },
        { 
          name: 'Minha Equipe', 
          icon: UserCheck, 
          path: '/minha-equipe', 
          roles: [UserRoleType.TESOUREIRO, UserRoleType.COORD_EQUIPE_BASE, UserRoleType.USUARIO] 
        },
      ]
    },
    {
      label: "Gestão & Finanças",
      items: [
        {
          name: 'Relatórios',
          icon: FileText,
          path: '/relatorios',
          roles: [UserRoleType.ADMIN, UserRoleType.COORD_CIDADE, UserRoleType.COORD_ESTADO, UserRoleType.TESOUREIRO]
        },
        { 
          name: 'Tesouraria Equipes', 
          icon: DollarSign, 
          path: '/financeiro', 
          roles: [UserRoleType.ADMIN, UserRoleType.COORD_CIDADE, UserRoleType.COORD_ESTADO, UserRoleType.TESOUREIRO], 
          checkSpecial: (user: UserType) => user.role !== UserRoleType.TESOUREIRO || !user.teamId 
        },
        { 
          name: 'Livro Caixa', 
          icon: BookOpen, 
          path: '/livro-caixa', 
          roles: [UserRoleType.ADMIN, UserRoleType.COORD_CIDADE, UserRoleType.COORD_ESTADO, UserRoleType.TESOUREIRO], 
          checkSpecial: (user: UserType) => user.role !== UserRoleType.TESOUREIRO || !user.teamId 
        },
        { 
          name: 'Lançamentos', 
          icon: FileSpreadsheet, 
          path: '/lancamentos', 
          roles: [UserRoleType.ADMIN, UserRoleType.COORD_CIDADE, UserRoleType.COORD_ESTADO, UserRoleType.TESOUREIRO], 
        },
      ]
    },
    {
      label: "Config",
      items: [
        { 
          name: 'Eventos/Metas', 
          icon: Ticket, 
          path: '/eventos', 
          roles: [UserRoleType.ADMIN, UserRoleType.COORD_CIDADE, UserRoleType.COORD_ESTADO] 
        },
        { 
          name: 'Usuários', 
          icon: UserCog, 
          path: '/usuarios', 
          roles: [UserRoleType.ADMIN] 
        },
        { 
          name: 'Ajustes', 
          icon: Settings, 
          path: '/configuracoes', 
          roles: [UserRoleType.ADMIN] 
        },
      ]
    }
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const sidebarWidth = isCollapsed ? "w-24" : "w-72";

  return (
    <div className="h-screen w-screen bg-[#f8fafc] flex font-sans overflow-hidden">
      {/* Overlay para mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}
      </AnimatePresence>
      
      {/* Sidebar Container */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200/60 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0 lg:static lg:h-full flex-shrink-0 flex flex-col",
          sidebarOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0",
          !sidebarOpen && sidebarWidth
        )}
      >
        {/* Logo Section */}
        <div className={cn(
          "p-6 flex items-center transition-all duration-500",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative w-11 h-11 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm">
                <img src="/imgs/mfc_logo01.png" alt="MFC" className="w-7 h-7 object-contain" />
              </div>
            </div>
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="whitespace-nowrap"
              >
                <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">MFC</h1>
                <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-0.5">Gestão de Unidade</p>
              </motion.div>
            )}
          </div>
          {!isCollapsed && (
            <button 
              className="lg:hidden p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400" 
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Desktop Collapse Toggle */}
        <div className="hidden lg:flex px-6 mb-4">
           <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full py-2 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all border border-slate-200/50"
           >
              <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }}>
                <ChevronRight size={16} />
              </motion.div>
           </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-8 overflow-y-auto no-scrollbar py-4">
          {navigationSections.map((section, sIdx) => {
            const filteredItems = section.items.filter(item => {
              const hasRole = !item.roles || item.roles.includes(currentUser.role);
              const passesSpecial = !item.checkSpecial || item.checkSpecial(currentUser);
              return hasRole && passesSpecial;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={section.label} className="space-y-2">
                {!isCollapsed && (
                  <h3 className="px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                    {section.label}
                  </h3>
                )}
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          if (window.innerWidth < 1024) setSidebarOpen(false);
                        }}
                        title={isCollapsed ? item.name : ''}
                        className={cn(
                          "w-full flex items-center rounded-2xl text-sm transition-all duration-300 group relative",
                          isCollapsed ? "justify-center p-3" : "px-4 py-3 gap-3.5 font-bold",
                          active
                            ? "text-amber-600 bg-amber-50 shadow-sm shadow-amber-200/20"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        )}
                      >
                        <item.icon 
                          className={cn(
                            "transition-all duration-300",
                            isCollapsed ? "w-6 h-6" : "w-5 h-5",
                            active
                              ? "text-amber-600"
                              : "text-slate-400 group-hover:text-amber-500 group-hover:scale-110"
                          )} 
                        />
                        {!isCollapsed && (
                          <span className="flex-1 text-left tracking-tight whitespace-nowrap">{item.name}</span>
                        )}
                        {active && !isCollapsed && (
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {isCollapsed && <div className="h-px bg-slate-100 mx-4 my-4" />}
              </div>
            );
          })}
        </nav>
        
        {/* User Card */}
        <div className="p-3 mt-auto">
          <div className={cn(
            "bg-slate-900 rounded-[2rem] transition-all duration-500 relative overflow-hidden group",
            isCollapsed ? "p-3" : "p-5"
          )}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -translate-y-12 translate-x-12 blur-3xl" />
            
            <div className={cn("flex items-center relative z-10", isCollapsed ? "flex-col gap-4" : "gap-4")}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black shadow-lg border border-white/10 shrink-0">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate leading-none mb-1">
                    {currentUser.name.split(' ')[0]}
                  </p>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest truncate">
                    {currentUser.role.split('_').pop()}
                  </p>
                </div>
              )}
              <button
                onClick={onLogout}
                className={cn(
                  "p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all",
                  isCollapsed && "mt-2"
                )}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Floating Navbar */}
        <header className="h-20 sm:h-24 flex items-center justify-between px-6 sm:px-8 flex-shrink-0 z-30">
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              className="lg:hidden p-3 bg-white hover:bg-slate-50 rounded-2xl transition-all shadow-sm border border-slate-200/60 active:scale-95"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            
            <div className="flex flex-col">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {getTimeGreeting()}, <span className="text-amber-600">{currentUser.name.split(' ')[0]}</span>
                <Sparkles size={16} className="text-amber-400 hidden sm:block animate-pulse" />
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-md border border-slate-200/50">
                  <MapPin size={10} className="text-amber-500" />
                  {currentCity.name}
                </div>
                <span className="hidden sm:inline text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/60 shadow-sm">
                <button className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all">
                  <Bell size={18} />
                </button>
                <button className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all">
                  <Search size={18} />
                </button>
            </div>
            
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200/60 flex items-center justify-center text-slate-400 shadow-sm sm:hidden">
               <Bell size={18} />
            </div>
          </div>
        </header>
        
        {/* Page Content Scroll Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-10">
          <div className="px-6 sm:px-8">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
