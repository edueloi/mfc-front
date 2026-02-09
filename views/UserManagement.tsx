
import React, { useState, useMemo, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  MoreVertical, 
  Shield, 
  X, 
  Check, 
  Key, 
  Mail, 
  User as UserIcon,
  ShieldCheck,
  ChevronDown,
  Save,
  Trash2,
  Edit,
  Users as UsersIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../api';
import { UserRoleType, User as UserType, Member, City } from '../types';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'mfcista'>('mfcista');
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; userId: string; userName: string }>({ show: false, userId: '', userName: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: UserRoleType.USUARIO,
    cityId: '1'
  });
  const [members, setMembers] = useState<Member[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  useEffect(() => {
    api.getUsers().then(setUsers).catch(() => setUsers([]));
    api.getMembers().then(setMembers).catch(() => setMembers([]));
    api.getCities().then(setCities).catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (cities.length > 0) {
      setFormData(prev => ({ ...prev, cityId: prev.cityId || cities[0].id }));
    }
  }, [cities]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleLinkMember = (member: any) => {
    setFormData({
      ...formData,
      name: member.name,
      email: member.email || '',
      username: member.nickname?.toLowerCase().replace(/\s/g, '') || member.name.split(' ')[0].toLowerCase()
    });
    setActiveTab('manual');
  };

  const handleSave = () => {
    if (!formData.username || !formData.name || (!editingUserId && !formData.password)) {
      alert("Por favor, preencha os campos obrigatorios.");
      return;
    }

    if (editingUserId) {
      // Atualizar usuário existente
      const payload: any = {
        name: formData.name,
        email: formData.email,
        username: formData.username,
        role: formData.role,
        cityId: formData.cityId
      };
      
      // Só inclui senha se foi preenchida (para permitir atualizar sem mudar senha)
      if (formData.password) {
        payload.password = formData.password;
      }

      api.updateUser(editingUserId, payload)
        .then((updated: UserType) => {
          setUsers(users.map(u => u.id === editingUserId ? updated : u));
          setShowModal(false);
          setFormData({ name: '', email: '', username: '', password: '', role: UserRoleType.USUARIO, cityId: formData.cityId });
          setEditingUserId(null);
        })
        .catch(() => {
          alert('Erro ao atualizar usuário');
        });
    } else {
      // Criar novo usuário
      api.createUser({
        name: formData.name,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        role: formData.role,
        cityId: formData.cityId
      })
        .then((newUser: UserType) => {
          setUsers([newUser, ...users]);
          setShowModal(false);
          setFormData({ name: '', email: '', username: '', password: '', role: UserRoleType.USUARIO, cityId: formData.cityId });
        })
        .catch(() => {
          alert('Erro ao criar usuário');
        });
    }
  };

  const handleEdit = (user: UserType) => {
    setFormData({
      name: user.name,
      email: user.email,
      username: user.username,
      password: '', // Deixa vazio ao editar
      role: user.role,
      cityId: user.cityId
    });
    setEditingUserId(user.id);
    setActiveTab('manual');
    setShowModal(true);
  };

  const handleDelete = (user: UserType) => {
    setDeleteConfirm({ show: true, userId: user.id, userName: user.name });
  };

  const confirmDelete = () => {
    api.deleteUser(deleteConfirm.userId)
      .then(() => {
        setUsers(users.filter(u => u.id !== deleteConfirm.userId));
        setDeleteConfirm({ show: false, userId: '', userName: '' });
      })
      .catch((error) => {
        console.error('Erro ao deletar usuário:', error);
        setDeleteConfirm({ show: false, userId: '', userName: '' });
      });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Usuários do Sistema</h2>
          <p className="text-gray-500 font-medium">Gerencie quem pode acessar e administrar a plataforma.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-2xl shadow-blue-100 active:scale-95 group"
        >
          <UserPlus className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-50 bg-gray-50/30">
          <div className="relative max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por nome, e-mail ou usuário..."
              className="w-full pl-11 pr-6 py-3.5 bg-white border border-gray-100 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-400 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identificação</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nível de Acesso</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unidade / Cidade</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-10 py-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-blue-50/20 transition-all group">
                  <td className="px-10 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black uppercase shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {user.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 leading-tight">{user.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold tracking-tight">@{user.username} • {user.email || 'Sem e-mail'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-5">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-100/50 px-3 py-1.5 rounded-lg w-fit">
                      <Shield className="w-3.5 h-3.5 text-blue-500" />
                      {user.role}
                    </div>
                  </td>
                  <td className="px-10 py-5 text-sm font-bold text-gray-500">
                    {cities.find(c => c.id === user.cityId)?.name || 'Tatuí'} - SP
                  </td>
                  <td className="px-10 py-5 text-center">
                    <span className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest bg-green-100 text-green-700 rounded-xl shadow-sm">Ativo</span>
                  </td>
                  <td className="px-10 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(user)} className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(user)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <p className="text-sm font-black text-gray-300 uppercase tracking-widest">Nenhum usuário encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVO USUÁRIO */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-hidden animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-500 overflow-hidden border border-gray-100">
            
            <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100"><UserPlus className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">
                    {editingUserId ? 'Editar Usuário' : 'Novo Acesso'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    {editingUserId ? 'Atualizar credenciais de acesso' : 'Criar credenciais de acesso ao sistema'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setEditingUserId(null); setFormData({ name: '', email: '', username: '', password: '', role: UserRoleType.USUARIO, cityId: formData.cityId }); }} className="p-2 hover:bg-gray-50 rounded-xl transition-all text-gray-300 hover:text-gray-500 active:scale-90"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex bg-gray-50/50 p-2 m-6 rounded-2xl border border-gray-100">
              <button 
                onClick={() => setActiveTab('mfcista')}
                disabled={!!editingUserId}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${editingUserId ? 'opacity-50 cursor-not-allowed' : ''} ${activeTab === 'mfcista' ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <UsersIcon className="w-4 h-4" /> Vincular MFCista
              </button>
              <button 
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Edit className="w-4 h-4" /> Cadastro Direto
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8 no-scrollbar">
              {activeTab === 'mfcista' ? (
                <div className="space-y-4 animate-in fade-in duration-400">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-4 mb-6">
                    <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0" />
                    <p className="text-[10px] text-blue-700 font-black leading-relaxed uppercase">
                      Selecione um membro da lista para criar seu acesso automaticamente. Isso evita erros de digitação e mantém os dados integrados.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {members.map(member => (
                      <button 
                        key={member.id}
                        onClick={() => handleLinkMember(member)}
                        className="flex items-center justify-between p-4 bg-gray-50 border border-gray-50 rounded-2xl hover:bg-white hover:border-blue-200 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-xs font-black text-blue-600 uppercase shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                            {member.name.substring(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 leading-none mb-1">{member.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{member.phone}</p>
                          </div>
                        </div>
                        <Check className="w-5 h-5 text-transparent group-hover:text-blue-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-400">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-600 transition-colors" />
                        <input 
                          type="text" 
                          placeholder="Ex: João da Silva"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all outline-none"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">E-mail</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                          type="email" 
                          placeholder="exemplo@mfc.org"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Usuário (Username)</label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-black text-xs">@</span>
                        <input 
                          type="text" 
                          placeholder="joao.silva"
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none"
                          value={formData.username}
                          onChange={(e) => setFormData({...formData, username: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="relative group">
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                        Senha de Acesso {editingUserId && <span className="text-blue-500">(Opcional - deixe vazio para não alterar)</span>}
                      </label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                          type={showPassword ? 'text' : 'password'}
                          placeholder={editingUserId ? "Deixe vazio para manter a senha atual" : "••••••••"}
                          className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                        />
                        <button 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-blue-500 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nível de Acesso</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <select 
                          className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none appearance-none"
                          value={formData.role}
                          onChange={(e) => setFormData({...formData, role: e.target.value as UserRoleType})}
                        >
                          {Object.values(UserRoleType).map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-white border-t border-gray-50 flex items-center justify-end gap-4 z-20">
              <button 
                onClick={() => setShowModal(false)}
                className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
                disabled={activeTab === 'mfcista'}
              >
                <Save className="w-5 h-5" /> Salvar Usuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl animate-in slide-in-from-bottom-5 duration-400 overflow-hidden border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Excluir Usuário</h3>
                  <p className="text-xs text-gray-500 font-semibold mt-1">Esta ação não pode ser desfeita</p>
                </div>
              </div>
            </div>
            <div className="px-8 py-6">
              <p className="text-sm text-gray-600 font-medium">
                Tem certeza que deseja excluir o usuário <span className="font-black text-gray-900">{deleteConfirm.userName}</span>? 
                Todas as credenciais de acesso serão permanentemente removidas.
              </p>
            </div>
            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm({ show: false, userId: '', userName: '' })}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;




