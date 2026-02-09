
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Search, MapPin, Users, ChevronRight, X } from 'lucide-react';
import { api } from '../api';
import { BaseTeam, City } from '../types';

const Teams: React.FC = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; team: BaseTeam | null }>({ show: false, team: null });
  const [newTeam, setNewTeam] = useState({ name: '', city: 'Tatuí', state: 'SP', isYouth: false });
  const [teams, setTeams] = useState<BaseTeam[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const loadData = () => {
    console.log('Carregando equipes...');
    api.getTeams()
      .then((data) => {
        console.log('Equipes carregadas:', data);
        setTeams(data);
      })
      .catch(() => setTeams([]));
    api.getCities()
      .then((data) => {
        console.log('Cidades carregadas:', data);
        setCities(data);
      })
      .catch(() => setCities([]));
  };

  useEffect(() => {
    loadData();

    // Recarrega dados quando a aba volta ao foco
    const handleFocus = () => {
      console.log('Aba voltou ao foco, recarregando dados...');
      loadData();
    };

    window.addEventListener('focus', handleFocus);
    
    // Recarrega dados a cada 30 segundos
    const interval = setInterval(() => {
      console.log('Recarregamento automático de dados...');
      loadData();
    }, 30000);

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
    api.createTeam(newTeam)
      .then((created: BaseTeam) => {
        console.log('Equipe criada com sucesso:', created);
        setTeams(prev => [created, ...prev]);
        // Força reload dos dados para garantir sincronização
        setTimeout(() => loadData(), 500);
        
        if (!saveAndNew) setShowModal(false);
        setNewTeam({ name: '', city: newTeam.city, state: newTeam.state, isYouth: false });
      })
      .catch((error) => {
        console.error('Erro ao criar equipe:', error);
        if (!saveAndNew) setShowModal(false);
        setNewTeam({ name: '', city: newTeam.city, state: newTeam.state, isYouth: false });
      });
  };

  const handleDelete = (team: BaseTeam, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm({ show: true, team });
  };

  const confirmDelete = () => {
    if (!deleteConfirm.team) return;

    if (deleteConfirm.team.memberCount && deleteConfirm.team.memberCount > 0) {
      return; // Mantém o modal aberto mostrando o aviso
    }

    api.deleteTeam(deleteConfirm.team.id)
      .then(() => {
        console.log('Equipe deletada com sucesso');
        setTeams(prev => prev.filter(t => t.id !== deleteConfirm.team!.id));
        setTimeout(() => loadData(), 500);
        setDeleteConfirm({ show: false, team: null });
      })
      .catch((error) => {
        console.error('Erro ao deletar equipe:', error);
        setDeleteConfirm({ show: false, team: null });
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Equipes Base</h2>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Listagem de núcleos familiares do movimento.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Criar Equipe</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {teams.map((team) => (
          <div 
            key={team.id} 
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col"
            onClick={() => navigate(`/equipes/${team.id}`)}
          >
            <div className="p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${team.isYouth ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                  <Layers className="w-6 h-6" />
                </div>
                <div className="flex gap-2 items-center">
                  {team.isYouth && (
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-purple-50 text-purple-600 px-2 py-1 rounded">
                      MFC Jovem
                    </span>
                  )}
                  <button
                    onClick={(e) => handleDelete(team, e)}
                    className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{team.name}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  {team.city} - {team.state}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  {team.memberCount} Membros
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-50 rounded-b-xl flex items-center justify-between text-blue-600 text-sm font-medium group-hover:bg-blue-50">
              Ver Detalhes
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {/* Modal Criar Equipe */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Nova Equipe Base</h3>
              <button onClick={() => setShowModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Equipe</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Ex: Sagrada Família"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado (UF)</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-200 rounded-lg px-4 py-2"
                    value={newTeam.state}
                    onChange={(e) => setNewTeam({...newTeam, state: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                  <select 
                    className="w-full border border-gray-200 rounded-lg px-4 py-2"
                    value={newTeam.city}
                    onChange={(e) => setNewTeam({...newTeam, city: e.target.value})}
                  >
                    {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="isYouth" 
                  className="w-4 h-4 rounded text-blue-600"
                  checked={newTeam.isYouth}
                  onChange={(e) => setNewTeam({...newTeam, isYouth: e.target.checked})}
                />
                <label htmlFor="isYouth" className="text-sm text-gray-600">Equipe MFC Jovem?</label>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex flex-col sm:flex-row gap-2">
              <button 
                onClick={() => handleCreate(false)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Salvar
              </button>
              <button 
                onClick={() => handleCreate(true)}
                className="flex-1 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Salvar e Criar Outro
              </button>
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 text-gray-500 text-sm hover:underline"
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
                  <Layers className={`w-6 h-6 ${
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




