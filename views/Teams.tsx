
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Layers, 
  Plus, 
  Search, 
  MapPin, 
  Users, 
  ChevronRight, 
  X, 
  Edit2, 
  Trash2,
  UserPlus,
  Home,
  MapPinned,
  Filter,
  Crown,
  Baby,
  ChevronDown
} from 'lucide-react';
import { api } from '../api';
import { BaseTeam, City } from '../types';

const Teams: React.FC = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<BaseTeam | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; team: BaseTeam | null }>({ show: false, team: null });
  const [newTeam, setNewTeam] = useState({ name: '', city: 'Tatuí', state: 'SP', isYouth: false });
  const [teams, setTeams] = useState<BaseTeam[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'base' | 'youth'>('all');
  const [estados, setEstados] = useState<Array<{id: number, sigla: string, nome: string}>>([]);

  const loadData = () => {
    api.getTeams()
      .then(setTeams)
      .catch(() => setTeams([]));
    api.getCities()
      .then(setCities)
      .catch(() => setCities([]));
  };

  useEffect(() => {
    loadData();
    api.getEstados()
      .then(setEstados)
      .catch(() => setEstados([]));

    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);
    
    const interval = setInterval(loadData, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (cities.length > 0) {
      setNewTeam(prev => ({ ...prev, city: prev.city || cities[0].name, state: prev.state || cities[0].uf }));
    }
  }, [cities]);

  const handleCreate = (saveAndNew: boolean) => {
    const createPromise = api.createTeam(newTeam);

    toast.promise(createPromise, {
      loading: 'Criando equipe base...',
      success: 'Equipe criada com sucesso! 🎉',
      error: 'Erro ao criar equipe',
    });

    createPromise
      .then((created: BaseTeam) => {
        setTeams(prev => [created, ...prev]);
        if (!saveAndNew) {
          setShowModal(false);
          setEditingTeam(null);
        }
        setNewTeam({ name: '', city: newTeam.city, state: newTeam.state, isYouth: false });
      })
      .catch(() => {
        if (!saveAndNew) {
          setShowModal(false);
          setEditingTeam(null);
        }
      });
  };

  const handleUpdate = () => {
    if (!editingTeam) return;

    const updatePromise = api.updateTeam(editingTeam.id, newTeam);

    toast.promise(updatePromise, {
      loading: 'Atualizando equipe...',
      success: 'Equipe atualizada! ✅',
      error: 'Erro ao atualizar equipe',
    });

    updatePromise
      .then((updated: BaseTeam) => {
        setTeams(prev => prev.map(t => t.id === editingTeam.id ? updated : t));
        setShowModal(false);
        setEditingTeam(null);
        setNewTeam({ name: '', city: 'Tatuí', state: 'SP', isYouth: false });
      })
      .catch(() => {});
  };

  const handleEdit = (team: BaseTeam) => {
    setEditingTeam(team);
    setNewTeam({
      name: team.name,
      city: team.city,
      state: team.state,
      isYouth: team.isYouth || false,
    });
    setShowModal(true);
  };

  const handleDelete = (team: BaseTeam, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ show: true, team });
  };

  const confirmDelete = () => {
    if (!deleteConfirm.team) return;

    if (deleteConfirm.team.memberCount && deleteConfirm.team.memberCount > 0) {
      return;
    }

    const deletePromise = api.deleteTeam(deleteConfirm.team.id);

    toast.promise(deletePromise, {
      loading: 'Excluindo equipe...',
      success: 'Equipe excluída! 🗑️',
      error: 'Erro ao excluir equipe',
    });

    deletePromise
      .then(() => {
        setTeams(prev => prev.filter(t => t.id !== deleteConfirm.team!.id));
        setDeleteConfirm({ show: false, team: null });
      })
      .catch(() => {
        setDeleteConfirm({ show: false, team: null });
      });
  };

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'base' && !team.isYouth) ||
                         (filterType === 'youth' && team.isYouth);
    return matchesSearch && matchesFilter;
  });

  const baseTeams = teams.filter(t => !t.isYouth);
  const youthTeams = teams.filter(t => t.isYouth);
  const totalMembers = teams.reduce((acc, t) => acc + (t.memberCount || 0), 0);

  return (
    <div className="p-6 sm:p-8 space-y-6 min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header com Logo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg p-[3px]">
            <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
              <img src="/imgs/mfc_logo01.png" alt="MFC" className="w-10 h-10 object-contain" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Equipes Base</h1>
            <p className="text-sm text-gray-500 font-semibold mt-1">Gerencie as equipes do MFC</p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingTeam(null);
            setNewTeam({ name: '', city: cities[0]?.name || 'Tatuí', state: cities[0]?.uf || 'SP', isYouth: false });
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3.5 rounded-2xl font-black text-sm shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Nova Equipe Base
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Layers className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{baseTeams.length}</p>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Equipes Base</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Baby className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{youthTeams.length}</p>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">MFC Jovem</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{totalMembers}</p>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total MFCistas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-semibold text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                filterType === 'all' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterType('base')}
              className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                filterType === 'base' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Crown className="w-4 h-4 inline mr-1" />
              Base
            </button>
            <button
              onClick={() => setFilterType('youth')}
              className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                filterType === 'youth' 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Baby className="w-4 h-4 inline mr-1" />
              Jovem
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Equipes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map((team) => (
          <div
            key={team.id}
            onClick={() => navigate(`/equipes/${team.id}`)}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${
                team.isYouth 
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                  : 'bg-gradient-to-br from-blue-500 to-cyan-500'
              }`}>
                {team.isYouth ? (
                  <Baby className="w-7 h-7 text-white" />
                ) : (
                  <Crown className="w-7 h-7 text-white" />
                )}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(team);
                  }}
                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(team, e)}
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              {team.name}
            </h3>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-semibold">{team.city}, {team.state}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold">
                  {team.memberCount || 0} {team.memberCount === 1 ? 'membro' : 'membros'}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              {team.isYouth && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-black uppercase tracking-wide">
                  MFC Jovem
                </span>
              )}
              <div className={team.isYouth ? '' : 'w-full'}>
                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm ml-auto w-fit">
                  Ver detalhes
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Layers className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-lg font-bold text-gray-400 mb-2">Nenhuma equipe encontrada</p>
          <p className="text-sm text-gray-500">Tente ajustar os filtros ou criar uma nova equipe</p>
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-in slide-in-from-bottom-5 duration-400 overflow-hidden border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-50 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                  <img src="/imgs/mfc_logo01.png" alt="MFC" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                    {editingTeam ? 'Editar Equipe' : 'Nova Equipe Base'}
                  </h3>
                  <p className="text-xs text-gray-500 font-semibold mt-1">Preencha os dados da equipe</p>
                </div>
              </div>
            </div>
            <div className="px-8 py-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                  Nome da Equipe
                </label>
                <input
                  type="text"
                  placeholder="Ex: Equipe São José"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                  className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Estado
                  </label>
                  <div className="relative">
                    <select
                      value={newTeam.state}
                      onChange={(e) => setNewTeam({...newTeam, state: e.target.value})}
                      className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
                    >
                      {estados.map(e => <option key={e.id} value={e.sigla}>{e.sigla}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    Cidade
                  </label>
                  <div className="relative">
                    <select
                      value={newTeam.city}
                      onChange={(e) => setNewTeam({...newTeam, city: e.target.value})}
                      className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
                    >
                      {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-100 rounded-xl">
                <input
                  type="checkbox"
                  id="isYouth"
                  checked={newTeam.isYouth}
                  onChange={(e) => setNewTeam({...newTeam, isYouth: e.target.checked})}
                  className="w-5 h-5 rounded text-purple-600 border-2 border-purple-300 focus:ring-2 focus:ring-purple-500"
                />
                <label htmlFor="isYouth" className="text-sm font-bold text-purple-900 cursor-pointer">
                  <Baby className="w-4 h-4 inline mr-1" />
                  Esta é uma equipe MFC Jovem
                </label>
              </div>
            </div>
            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              {!editingTeam && (
                <button
                  onClick={() => handleCreate(true)}
                  className="flex-1 border-2 border-gray-200 text-gray-700 px-5 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all"
                >
                  Salvar e Criar Outra
                </button>
              )}
              <button
                onClick={editingTeam ? handleUpdate : () => handleCreate(false)}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition-all active:scale-95"
              >
                {editingTeam ? 'Atualizar Equipe' : 'Criar Equipe'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTeam(null);
                  setNewTeam({ name: '', city: 'Tatuí', state: 'SP', isYouth: false });
                }}
                className="text-gray-500 text-sm hover:underline font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirm.show && deleteConfirm.team && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl animate-in slide-in-from-bottom-5 duration-400 overflow-hidden border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  deleteConfirm.team.memberCount && deleteConfirm.team.memberCount > 0
                    ? 'bg-amber-100'
                    : 'bg-red-100'
                }`}>
                  <Trash2 className={`w-6 h-6 ${
                    deleteConfirm.team.memberCount && deleteConfirm.team.memberCount > 0
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">
                    {deleteConfirm.team.memberCount && deleteConfirm.team.memberCount > 0
                      ? 'Não é Possível Excluir'
                      : 'Excluir Equipe'}
                  </h3>
                  <p className="text-xs text-gray-500 font-semibold mt-1">
                    {deleteConfirm.team.memberCount && deleteConfirm.team.memberCount > 0
                      ? 'Ainda há membros vinculados'
                      : 'Esta ação não pode ser desfeita'}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-8 py-6">
              {deleteConfirm.team.memberCount && deleteConfirm.team.memberCount > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 font-medium">
                    A equipe <span className="font-black text-gray-900">{deleteConfirm.team.name}</span> possui{' '}
                    <span className="font-black text-amber-600">{deleteConfirm.team.memberCount} membro(s)</span> vinculado(s).
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs text-amber-800 font-semibold">
                      💡 Remova todos os membros da equipe antes de excluí-la.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 font-medium">
                  Tem certeza que deseja excluir a equipe <span className="font-black text-gray-900">{deleteConfirm.team.name}</span>?
                  Todos os dados serão permanentemente removidos do sistema.
                </p>
              )}
            </div>
            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              {deleteConfirm.team.memberCount && deleteConfirm.team.memberCount > 0 ? (
                <button
                  onClick={() => setDeleteConfirm({ show: false, team: null })}
                  className="px-6 py-2.5 bg-gray-600 text-white font-bold text-sm rounded-xl hover:bg-gray-700 transition-all"
                >
                  Entendido
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setDeleteConfirm({ show: false, team: null })}
                    className="px-5 py-2.5 text-gray-600 font-bold text-sm rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-6 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 active:scale-95"
                  >
                    Sim, Excluir
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
