
import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  MapPin, 
  Plus, 
  Trash2, 
  Search, 
  Lock, 
  Globe, 
  Settings as SettingsIcon, 
  Filter, 
  X, 
  Building2, 
  Save, 
  ChevronDown,
  Calendar,
  Gift,
  AlertTriangle,
  Users,
  Layers,
  Power,
  Edit3,
  Clock,
  History,
  CheckCircle2,
  ShieldCheck,
  Eye,
  Settings,
  DollarSign,
  UserCog,
  ChevronRight,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { api } from '../api';
import { UserRoleType, ModuleAction, City } from '../types';

const BRAZILIAN_STATES = [
  { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' }, { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' }, { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' }, { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' }, { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' }, { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'RondÃ´nia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' }
];

const MODULES = [
  { id: 'dashboard', name: 'Dashboard', icon: History },
  { id: 'mfcistas', name: 'Membros (MFCistas)', icon: Users },
  { id: 'equipes', name: 'Equipes Base', icon: Layers },
  { id: 'financeiro', name: 'Tesouraria de Equipes', icon: DollarSign },
  { id: 'livro-caixa', name: 'Livro Caixa Geral', icon: Building2 },
  { id: 'usuarios', name: 'Usuários do Sistema', icon: UserCog },
  { id: 'configuracoes', name: 'Configurações', icon: Settings },
];

const ACTIONS: { id: ModuleAction; name: string }[] = [
  { id: 'view', name: 'Visualizar' },
  { id: 'create', name: 'Criar' },
  { id: 'edit', name: 'Editar' },
  { id: 'delete', name: 'Excluir' },
  { id: 'launch', name: 'Lançar' },
];

interface RoleDefinition {
  id: string;
  name: string;
  isSystem?: boolean;
  permissions: {
    [moduleId: string]: {
      [actionId in ModuleAction]: boolean;
    };
  };
}

interface SettingsViewProps {
  initialTab: 'permissoes' | 'cidades';
}

const SettingsView: React.FC<SettingsViewProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [citySearch, setCitySearch] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  
  // State para Permissões
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  useEffect(() => {
    api.getCities().then(setCities).catch(() => setCities([]));
    api.getRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  // Modais Cidades
  const [showCityModal, setShowCityModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Estados de formulário Cidades
  const [editingCityId, setEditingCityId] = useState<string | null>(null);
  const [newCity, setNewCity] = useState({ name: '', uf: 'SP', mfcSince: new Date().toISOString().split('T')[0] });
  const [cityToDelete, setCityToDelete] = useState<City | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const filteredCities = cities.filter(c => 
    c.name.toLowerCase().includes(citySearch.toLowerCase()) || 
    c.uf.toLowerCase().includes(citySearch.toLowerCase())
  );

  const handleSaveRole = () => {
    if (!newRoleName.trim()) return;
    const newRole: RoleDefinition = {
      id: '',
      name: newRoleName,
      permissions: MODULES.reduce((acc, mod) => ({
        ...acc,
        [mod.id]: ACTIONS.reduce((actAcc, act) => ({ ...actAcc, [act.id]: false }), {})
      }), {})
    };

    api.createRole({ name: newRole.name, permissions: newRole.permissions })
      .then((created: RoleDefinition) => {
        setRoles([...roles, created]);
        setSelectedRoleId(created.id);
        setShowRoleModal(false);
        setNewRoleName('');
      })
      .catch(() => {
        setShowRoleModal(false);
      });
  };

  const togglePermission = (moduleId: string, actionId: ModuleAction) => {
    const role = roles.find(r => r.id === selectedRoleId);
    if (!role || role.isSystem) return;

    setRoles(roles.map(r => {
      if (r.id === selectedRoleId) {
        return {
          ...r,
          permissions: {
            ...r.permissions,
            [moduleId]: {
              ...r.permissions[moduleId],
              [actionId]: !r.permissions[moduleId][actionId]
            }
          }
        };
      }
      return r;
    }));
  };

  const handleSaveRolePermissions = () => {
    const role = roles.find(r => r.id === selectedRoleId);
    if (!role || role.isSystem) return;
    api.updateRole(role.id, { name: role.name, permissions: role.permissions })
      .then((updated: RoleDefinition) => {
        setRoles(roles.map(r => r.id === updated.id ? updated : r));
      })
      .catch(() => {});
  };

  const handleSaveCity = () => {
    const cityNameTrimmed = newCity.name.trim();
    if (!cityNameTrimmed) return;

    const isDuplicate = cities.some(c =>
      c.name.toLowerCase() === cityNameTrimmed.toLowerCase() &&
      c.id !== editingCityId
    );

    if (isDuplicate) {
      alert("Erro: Ja existe uma unidade cadastrada com este nome!");
      return;
    }

    if (editingCityId) {
      api.updateCity(editingCityId, { name: cityNameTrimmed, uf: newCity.uf, mfcSince: newCity.mfcSince })
        .then((updated: City) => {
          setCities(cities.map(c => c.id === editingCityId ? updated : c));
          setShowCityModal(false);
        })
        .catch(() => setShowCityModal(false));
    } else {
      api.createCity({ name: cityNameTrimmed, uf: newCity.uf, mfcSince: newCity.mfcSince })
        .then((created: City) => {
          setCities([...cities, created]);
          setShowCityModal(false);
        })
        .catch(() => setShowCityModal(false));
    }
  };

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 lg:pb-10">
      {/* Header Centralizado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2 lg:px-0">
        <div>
          <h2 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">Configurações</h2>
          <p className="text-gray-500 font-medium text-sm lg:text-base">Ajustes finos da plataforma MFC Gestão.</p>
        </div>

        <div className="flex bg-gray-100/80 p-1 rounded-2xl border border-gray-200/50 backdrop-blur-sm shadow-inner">
          <button onClick={() => setActiveTab('permissoes')} className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'permissoes' ? 'bg-white text-blue-600 shadow-xl shadow-gray-200/50 border border-gray-100' : 'text-gray-400'}`}>
            <Shield className="w-4 h-4" /> Níveis de Acesso
          </button>
          <button onClick={() => setActiveTab('cidades')} className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'cidades' ? 'bg-white text-blue-600 shadow-xl shadow-gray-200/50 border border-gray-100' : 'text-gray-400'}`}>
            <MapPin className="w-4 h-4" /> Unidades do MFC
          </button>
        </div>
      </div>

      {activeTab === 'permissoes' && (
        <div className="flex flex-col lg:flex-row gap-8 animate-in slide-in-from-left-4 duration-500">
          {/* Menu Lateral de Perfis */}
          <div className="lg:w-80 flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Perfis de Acesso</h3>
              <button 
                onClick={() => setShowRoleModal(true)}
                className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-3 space-y-2">
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all group ${selectedRoleId === role.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${selectedRoleId === role.id ? 'bg-white/20' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50'}`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-left truncate">{role.name}</span>
                  {selectedRoleId === role.id && <ChevronRight className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Matriz de Permissões */}
          <div className="flex-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Configurar: {selectedRole?.name}</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                  {selectedRole?.isSystem ? 'PERFIL DE SISTEMA (NÃO EDITÃVEL)' : 'MARQUE O QUE ESTE PERFIL PODE ACESSAR'}
                </p>
              </div>
              {!selectedRole?.isSystem && (
                <button className="text-red-500 p-3 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 sticky left-0 bg-gray-50/50 z-20">Módulo / Tela</th>
                    {ACTIONS.map(action => (
                      <th key={action.id} className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">{action.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MODULES.map(module => (
                    <tr key={module.id} className="hover:bg-blue-50/10 transition-colors group">
                      <td className="px-10 py-5 sticky left-0 bg-white group-hover:bg-blue-50/10 z-10 border-r border-gray-50 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center transition-colors group-hover:bg-blue-100 group-hover:text-blue-600">
                            <module.icon className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-black text-gray-700">{module.name}</span>
                        </div>
                      </td>
                      {ACTIONS.map(action => {
                        const isAllowed = selectedRole?.permissions[module.id]?.[action.id] || false;
                        return (
                          <td key={action.id} className="px-6 py-5 text-center">
                            <button 
                              disabled={selectedRole?.isSystem}
                              onClick={() => togglePermission(module.id, action.id)}
                              className={`p-2 rounded-xl transition-all ${isAllowed ? 'text-emerald-500 bg-emerald-50' : 'text-gray-200 bg-gray-50 hover:bg-gray-100'} ${selectedRole?.isSystem ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {isAllowed ? <CheckCircle2 className="w-6 h-6" /> : <X className="w-6 h-6" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {!selectedRole?.isSystem && (
              <div className="p-10 bg-gray-50/50 border-t border-gray-50 flex justify-end">
                <button onClick={handleSaveRolePermissions} className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3">
                  <Save className="w-5 h-5" /> Salvar Configurações
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aba de Cidades (Existente) */}
      {activeTab === 'cidades' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col lg:flex-row gap-4 px-2 lg:px-0">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar unidade..."
                className="w-full pl-11 pr-4 py-4 bg-white border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium text-sm shadow-sm"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
              />
            </div>
            <button 
              onClick={() => {
                setEditingCityId(null);
                setNewCity({ name: '', uf: 'SP', mfcSince: new Date().toISOString().split('T')[0] });
                setShowCityModal(true);
              }}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 group shrink-0"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              Nova Unidade
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 lg:gap-6 px-2 lg:px-0">
            {filteredCities.map(city => (
              <div 
                key={city.id} 
                className={`bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col group hover:shadow-xl transition-all relative overflow-hidden ${!city.active ? 'bg-gray-50/50' : ''}`}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-inner ${city.active ? 'bg-blue-50 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                    <MapPin className="w-7 h-7" />
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => {
                      api.toggleCity(city.id, !city.active)
                        .then((updated: City) => setCities(cities.map(c => c.id === city.id ? updated : c)))
                        .catch(() => {});
                    }}
                      className={`p-2.5 rounded-xl transition-colors ${city.active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-300 hover:bg-gray-100'}`}
                      title={city.active ? "Inativar" : "Ativar"}
                    >
                      <Power className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => { setCityToDelete(city); setShowDeleteModal(true); }}
                      className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className={`text-2xl font-black tracking-tight leading-tight ${!city.active ? 'text-gray-400' : 'text-gray-900'}`}>{city.name}</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Unidade {city.uf}</p>
                </div>
                <div className="mt-8 pt-5 border-t border-gray-50 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${city.active ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-gray-300'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${city.active ? 'text-emerald-600' : 'text-gray-400'}`}>
                        {city.active ? 'Ativo' : 'Inativo'}
                      </span>
                   </div>
                   <button 
                    onClick={() => {
                      setEditingCityId(city.id);
                      setNewCity({ name: city.name, uf: city.uf, mfcSince: city.mfcSince || '' });
                      setShowCityModal(true);
                    }}
                    className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all group/edit border border-transparent hover:border-blue-100"
                  >
                    <Edit3 className="w-3.5 h-3.5 group-hover/edit:rotate-12 transition-transform" /> Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL NOVO PERFIL / PERMISSÃO */}
      {showRoleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-500">
            <div className="p-10 border-b border-gray-50 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-xl mb-6">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 leading-tight mb-2">Novo Perfil</h3>
              <p className="text-sm text-gray-500 font-medium px-4">Defina um nome para o novo nível de acesso. Ele começará sem nenhuma permissão.</p>
            </div>
            <div className="p-10 space-y-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">NOME DO PERFIL</label>
                <input 
                  type="text" 
                  placeholder="Ex: Secretário, Auxiliar de Tesouraria..."
                  className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all outline-none"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleSaveRole}
                  disabled={!newRoleName.trim()}
                  className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                >
                  Criar e Configurar
                </button>
                <button onClick={() => setShowRoleModal(false)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CIDADE (CADASTRO / EDIÃ‡ÃO) */}
      {showCityModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-500">
            <div className="px-8 py-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 leading-none mb-1">{editingCityId ? 'Editar Unidade' : 'Nova Unidade'}</h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">DADOS DA CIDADE NO SISTEMA</p>
                </div>
              </div>
              <button onClick={() => setShowCityModal(false)} className="p-2 hover:bg-gray-50 rounded-xl transition-all text-gray-300 hover:text-red-500"><X className="w-7 h-7" /></button>
            </div>
            <div className="p-8 space-y-8">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">NOME DA UNIDADE</label>
                <input 
                  type="text" 
                  placeholder="Ex: Tatuí"
                  className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all outline-none"
                  value={newCity.name}
                  onChange={(e) => setNewCity({...newCity, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">ESTADO (UF)</label>
                  <div className="relative">
                    <select 
                      className="w-full pl-6 pr-12 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all outline-none appearance-none"
                      value={newCity.uf}
                      onChange={(e) => setNewCity({...newCity, uf: e.target.value})}
                    >
                      {BRAZILIAN_STATES.map(state => (
                        <option key={state.uf} value={state.uf}>{state.name} ({state.uf})</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">MFC DESDE</label>
                  <div className="relative">
                    <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                    <input 
                      type="date"
                      className="w-full pl-14 pr-6 py-5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all outline-none"
                      value={newCity.mfcSince}
                      onChange={(e) => setNewCity({...newCity, mfcSince: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-10 py-8 bg-white border-t border-gray-50 flex items-center justify-center gap-6">
              <button onClick={() => setShowCityModal(false)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors">CANCELAR</button>
              <button 
                onClick={handleSaveCity}
                disabled={!newCity.name}
                className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
              >
                <Save className="w-5 h-5" /> {editingCityId ? 'SALVAR ALTERAÃ‡Ã•ES' : 'ADICIONAR UNIDADE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUSÃO (BLINDADO) */}
      {showDeleteModal && cityToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-red-100 animate-in zoom-in-95 duration-500">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 leading-tight mb-2">Atenção Crítica!</h3>
                <p className="text-sm text-gray-500 font-medium">Você está prestes a excluir a unidade <span className="text-red-600 font-black">{cityToDelete.name}</span>.</p>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                  Para confirmar, digite o nome da cidade abaixo em <span className="text-red-500">CAIXA ALTA</span>:
                </p>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 bg-red-50/30 border border-red-100 rounded-2xl text-center font-black text-red-600 placeholder:text-red-200 focus:outline-none focus:ring-4 focus:ring-red-50 transition-all"
                  placeholder={cityToDelete.name.toUpperCase()}
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={() => {
                    if (deleteConfirmationText === cityToDelete.name.toUpperCase()) {
                      api.deleteCity(cityToDelete.id)
                        .then(() => {
                          setCities(cities.filter(c => c.id !== cityToDelete.id));
                          setShowDeleteModal(false);
                          setCityToDelete(null);
                        })
                        .catch(() => {});
                    }
                  }}
                  disabled={deleteConfirmationText !== cityToDelete.name.toUpperCase()}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
                >
                  Confirmar Exclusão Permanente
                </button>
                <button onClick={() => setShowDeleteModal(false)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">
                  DESISTIR E VOLTAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;





