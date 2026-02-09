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
  Ticket
} from 'lucide-react';
import { UserRoleType, User as UserType, City } from '../types';
import { api } from '../api';

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

const Layout: React.FC<LayoutProps> = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [selectedCityId, setSelectedCityId] = useState<string>(currentUser.cityId);
  const [cities, setCities] = useState<City[]>([]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
      else setSidebarOpen(false);
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

  const navigation: NavItem[] = [
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
    { 
      name: 'Eventos/Metas', 
      icon: Ticket, 
      path: '/eventos', 
      roles: [UserRoleType.ADMIN, UserRoleType.COORD_CIDADE, UserRoleType.COORD_ESTADO] 
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
      name: 'Usuários Sistema', 
      icon: UserCog, 
      path: '/usuarios', 
      roles: [UserRoleType.ADMIN] 
    },
    { 
      name: 'Configurações', 
      icon: Settings, 
      path: '/configuracoes', 
      roles: [UserRoleType.ADMIN] 
    },
  ];

  const filteredNav = navigation.filter(item => {
    const hasRole = !item.roles || item.roles.includes(currentUser.role);
    const passesSpecial = !item.checkSpecial || item.checkSpecial(currentUser);
    return hasRole && passesSpecial;
  });

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] flex font-sans overflow-hidden">
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 shadow-2xl lg:shadow-none transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:h-full flex-shrink-0`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-8 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-[1.2rem] flex items-center justify-center text-white font-black shadow-lg shadow-blue-100 rotate-3">
                M
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter">MFC Gestão</h1>
            </div>
            <button 
              className="lg:hidden p-2 hover:bg-slate-50 rounded-xl transition-colors" 
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar py-2">
            {filteredNav.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-5 py-3.5 rounded-[1.5rem] text-sm font-bold transition-all duration-200 group ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 scale-[1.02]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon 
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive(item.path)
                      ? 'text-white'
                      : 'text-slate-400 group-hover:scale-110 group-hover:text-blue-500'
                  }`} 
                />
                <span className="flex-1 text-left tracking-tight">{item.name}</span>
                {isActive(item.path) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
              </button>
            ))}
          </nav>
          
          {/* User Profile */}
          <div className="p-6 mt-auto flex-shrink-0">
            <div className="bg-slate-50 rounded-[2rem] p-4 border border-slate-100/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-blue-600 font-black">
                  {currentUser.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate leading-none mb-1">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest truncate">
                    {currentUser.role}
                  </p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 lg:px-10 flex-shrink-0 z-30">
          <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
            <button
              className="lg:hidden p-2 sm:p-3 bg-slate-50 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-all shadow-sm active:scale-95 flex-shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
            </button>
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2.5 px-3 py-2 sm:px-5 sm:py-2.5 bg-slate-50/50 text-slate-500 text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-[0.2em] rounded-xl sm:rounded-2xl border border-slate-100">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500 flex-shrink-0" />
                <span className="truncate">{currentCity.name} - {currentCity.uf}</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 no-scrollbar bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto pb-16 sm:pb-20">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
