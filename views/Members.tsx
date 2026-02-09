
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Search, 
  Filter as FilterIcon, 
  Plus, 
  MoreVertical, 
  X, 
  MapPin, 
  Shield, 
  Save, 
  Heart, 
  ChevronDown,
  UserPlus,
  Users,
  Baby,
  PersonStanding,
  UserRound,
  VenetianMask,
  PieChart as PieIcon,
  TrendingUp,
  Clock,
  Trash2
} from 'lucide-react';
import { api } from '../api';
import { MemberStatus, UserRoleType, Member, City } from '../types';
import { maskCPF, maskPhone, maskCEP, maskRG, maskDate, unmask, dateToISO, dateFromISO } from '../utils/masks';

// Componentes de formulário movidos para fora para evitar perda de foco
const InputField = ({ label, field, type = 'text', placeholder = '', className = '', value, onChange, mask }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    if (mask) {
      newValue = mask(newValue);
    }
    onChange({ target: { value: newValue } });
  };

  return (
    <div className={className}>
      <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
      <input 
        type={type} 
        placeholder={placeholder}
        className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none" 
        value={value} 
        onChange={handleChange} 
      />
    </div>
  );
};

const SelectField = ({ label, field, options, className = '', value, onChange }: any) => (
  <div className={className}>
    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">{label}</label>
    <div className="relative">
      <select 
        className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
        value={value}
        onChange={onChange}
      >
        {options.map((opt: any) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  </div>
);

const CheckboxField = ({ label, field, className = '', checked, onChange }: any) => (
  <label className={`flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 cursor-pointer hover:border-blue-300 transition-all ${className}`}>
    <input
      type="checkbox"
      className="h-4 w-4 accent-blue-600"
      checked={checked}
      onChange={onChange}
    />
    <span className="text-xs font-black text-gray-600 uppercase tracking-widest">{label}</span>
  </label>
);

const Members: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [genderFilter, setGenderFilter] = useState<string>('Todos');
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>('Todos');
  const [mfcTimeFilter, setMfcTimeFilter] = useState<string>('Todos');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; memberId: string; memberName: string }>({ show: false, memberId: '', memberName: '' });
  
  const initialFormState = {
    name: '', nickname: '', dob: '', rg: '', cpf: '', bloodType: 'O+', gender: 'Feminino',
    maritalStatus: 'Casado(a)', spouseName: '', spouseCpf: '', marriageDate: '',
    mfcDate: new Date().toISOString().split('T')[0], phone: '', emergencyPhone: '',
    street: '', number: '', neighborhood: '', zip: '', complement: '', city: 'Tatui',
    state: 'SP', condir: 'Sudeste', naturalness: '', father: '', mother: '',
    smoker: false, mobilityIssue: '', healthPlan: '', diet: '', medication: '',
    allergy: '', pcd: false, pcdDescription: '', profession: '', religion: 'Catolica',
    education: 'Superior completo', createAccess: false, email: '', username: '',
    password: '', role: UserRoleType.USUARIO, status: MemberStatus.AGUARDANDO
  };
  
  const [formData, setFormData] = useState(initialFormState);
  const [members, setMembers] = useState<Member[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const loadData = () => {
    api.getMembers()
      .then(setMembers)
      .catch(() => setMembers([]));
    api.getCities()
      .then(setCities)
      .catch(() => setCities([]));
  };

  useEffect(() => {
    loadData();

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
      setFormData(prev => ({ ...prev, city: prev.city || cities[0].name, state: prev.state || cities[0].uf }));
    }
  }, [cities]);

  // Helper para cálculos de idade e tempo de MFC
  const calculateYears = (dateString: string) => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let years = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      years--;
    }
    return years;
  };

  // cálculos Estatísticos (Baseados no total da unidade)
  const stats = useMemo(() => {
    const totals = { total: members.length, male: 0, female: 0, children: 0, youth: 0, adult: 0, elderly: 0, active: 0 };
    members.forEach(m => {
      if (m.gender === 'Masculino') totals.male++; else totals.female++;
      if (m.status === MemberStatus.ATIVO) totals.active++;
      const age = calculateYears(m.dob);
      if (age <= 12) totals.children++;
      else if (age <= 18) totals.youth++;
      else if (age <= 59) totals.adult++;
      else totals.elderly++;
    });
    return totals;
  }, [members]);

  // Lógica de Filtragem Principal
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      // Busca por texto
      const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.phone.includes(searchTerm);
      
      // Filtro de Status
      const matchesStatus = statusFilter === 'Todos' || m.status === statusFilter;
      
      // Filtro de Gênero
      const matchesGender = genderFilter === 'Todos' || m.gender === genderFilter;
      
      // Filtro de Faixa Etária
      const age = calculateYears(m.dob);
      let group = 'Adulto';
      if (age <= 12) group = 'Criança';
      else if (age <= 18) group = 'Jovem';
      else if (age >= 60) group = 'Idoso';
      const matchesAgeGroup = ageGroupFilter === 'Todos' || group === ageGroupFilter;
      
      // Filtro de Tempo de MFC
      const yearsMfc = calculateYears(m.mfcDate);
      let timeRange = '0-5';
      if (yearsMfc > 25) timeRange = '25+';
      else if (yearsMfc > 10) timeRange = '10-25';
      else if (yearsMfc > 5) timeRange = '5-10';
      const matchesMfcTime = mfcTimeFilter === 'Todos' || timeRange === mfcTimeFilter;

      return matchesSearch && matchesStatus && matchesGender && matchesAgeGroup && matchesMfcTime;
    });
  }, [members, searchTerm, statusFilter, genderFilter, ageGroupFilter, mfcTimeFilter]);

  const activeFiltersCount = [
    statusFilter !== 'Todos',
    genderFilter !== 'Todos',
    ageGroupFilter !== 'Todos',
    mfcTimeFilter !== 'Todos'
  ].filter(Boolean).length;

  const resetFilters = () => {
    setStatusFilter('Todos');
    setGenderFilter('Todos');
    setAgeGroupFilter('Todos');
    setMfcTimeFilter('Todos');
    setSearchTerm('');
  };

  const handleSave = (saveAndNew: boolean) => {
    const payload: Partial<Member> = {
      name: formData.name,
      nickname: formData.nickname,
      dob: formData.dob,
      rg: unmask(formData.rg),
      cpf: unmask(formData.cpf),
      bloodType: formData.bloodType,
      gender: formData.gender,
      maritalStatus: formData.maritalStatus,
      spouseName: formData.spouseName,
      spouseCpf: unmask(formData.spouseCpf),
      marriageDate: formData.marriageDate,
      mfcDate: formData.mfcDate,
      phone: unmask(formData.phone),
      emergencyPhone: unmask(formData.emergencyPhone),
      status: formData.status,
      street: formData.street,
      number: formData.number,
      neighborhood: formData.neighborhood,
      zip: unmask(formData.zip),
      complement: formData.complement,
      city: formData.city,
      state: formData.state,
      condir: formData.condir,
      naturalness: formData.naturalness,
      father: formData.father,
      mother: formData.mother,
      smoker: formData.smoker,
      mobilityIssue: formData.mobilityIssue,
      healthPlan: formData.healthPlan,
      diet: formData.diet,
      medication: formData.medication,
      allergy: formData.allergy,
      pcd: formData.pcd,
      pcdDescription: formData.pcdDescription,
      profession: formData.profession,
      religion: formData.religion,
      education: formData.education,
      movementRoles: [],
      updatedAt: new Date().toISOString()
    };

    if (editingMemberId) {
      // Atualizar membro existente
      const updatePromise = api.updateMember(editingMemberId, payload);
      
      toast.promise(updatePromise, {
        loading: 'Atualizando MFCista...',
        success: 'MFCista atualizado com sucesso! ✅',
        error: (err) => `Erro ao atualizar: ${err.message}`,
      });

      updatePromise
        .then((updated: Member) => {
          setMembers(prev => prev.map(m => m.id === editingMemberId ? updated : m));
          setShowModal(false);
          setFormData(initialFormState);
          setEditingMemberId(null);
        })
        .catch(() => {
          // Erro já tratado pelo toast
        });
    } else {
      // Criar novo membro
      const createPayload = { ...payload, createdAt: new Date().toISOString() };
      const createPromise = api.createMember(createPayload);
      
      toast.promise(createPromise, {
        loading: 'Criando MFCista...',
        success: 'MFCista criado com sucesso! 🎉',
        error: (err) => `Erro ao criar: ${err.message}`,
      });

      createPromise
        .then((created: Member) => {
          setMembers(prev => [created, ...prev]);
          
          if (saveAndNew) {
            setFormData(initialFormState);
          } else {
            setShowModal(false);
            setFormData(initialFormState);
          }
        })
        .catch(() => {
          // Erro já tratado pelo toast
        });
    }
  };

  const handleEdit = (member: Member) => {
    setFormData({
      name: member.name,
      nickname: member.nickname || '',
      dob: member.dob || '',
      rg: maskRG(member.rg || ''),
      cpf: maskCPF(member.cpf || ''),
      bloodType: member.bloodType || 'O+',
      gender: member.gender || 'Feminino',
      maritalStatus: member.maritalStatus || 'Casado(a)',
      spouseName: member.spouseName || '',
      spouseCpf: maskCPF(member.spouseCpf || ''),
      marriageDate: member.marriageDate || '',
      mfcDate: member.mfcDate || new Date().toISOString().split('T')[0],
      phone: maskPhone(member.phone || ''),
      emergencyPhone: maskPhone(member.emergencyPhone || ''),
      street: member.street || '',
      number: member.number || '',
      neighborhood: member.neighborhood || '',
      zip: maskCEP(member.zip || ''),
      complement: member.complement || '',
      city: member.city || 'Tatui',
      state: member.state || 'SP',
      condir: member.condir || 'Sudeste',
      naturalness: member.naturalness || '',
      father: member.father || '',
      mother: member.mother || '',
      smoker: member.smoker || false,
      mobilityIssue: member.mobilityIssue || '',
      healthPlan: member.healthPlan || '',
      diet: member.diet || '',
      medication: member.medication || '',
      allergy: member.allergy || '',
      pcd: member.pcd || false,
      pcdDescription: member.pcdDescription || '',
      profession: member.profession || '',
      religion: member.religion || 'Catolica',
      education: member.education || 'Superior completo',
      createAccess: false,
      email: '',
      username: '',
      password: '',
      role: UserRoleType.USUARIO,
      status: member.status || MemberStatus.AGUARDANDO
    });
    setEditingMemberId(member.id);
    setShowModal(true);
  };

  const handleDelete = (member: Member) => {
    setDeleteConfirm({ show: true, memberId: member.id, memberName: member.name });
  };

  const confirmDelete = () => {
    const deletePromise = api.deleteMember(deleteConfirm.memberId);
    
    toast.promise(deletePromise, {
      loading: 'Excluindo MFCista...',
      success: 'MFCista excluído com sucesso! 🗑️',
      error: (err) => `Erro ao excluir: ${err.message}`,
    });

    deletePromise
      .then(() => {
        setMembers(prev => prev.filter(m => m.id !== deleteConfirm.memberId));
        setDeleteConfirm({ show: false, memberId: '', memberName: '' });
      })
      .catch(() => {
        setDeleteConfirm({ show: false, memberId: '', memberName: '' });
      });
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-700 pb-12 sm:pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">Comunidade MFC</h2>
          <p className="text-sm sm:text-base text-gray-500 font-medium mt-1">Gestão demográfica e administrativa de MFCistas.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg sm:shadow-2xl shadow-blue-100 active:scale-95 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span>Novo MFCista</span>
        </button>
      </div>

      {/* Estatísticas (Fixo para a Unidade) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] border border-gray-100 shadow-sm group">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Perfil por Gênero</h4>
          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-black text-pink-500"><VenetianMask className="w-3.5 h-3.5" /> Mulheres</span>
                <span className="text-sm font-black text-gray-900">{stats.female}</span>
             </div>
             <div className="h-1.5 w-full bg-pink-50 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500" style={{width: `${(stats.female/stats.total)*100}%`}}></div>
             </div>
             <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-black text-blue-500"><UserRound className="w-3.5 h-3.5" /> Homens</span>
                <span className="text-sm font-black text-gray-900">{stats.male}</span>
             </div>
             <div className="h-1.5 w-full bg-blue-50 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{width: `${(stats.male/stats.total)*100}%`}}></div>
             </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Base da Pirâmide</h4>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-amber-50 rounded-3xl border border-amber-100/50">
                <Baby className="w-5 h-5 text-amber-600 mb-2" />
                <p className="text-2xl font-black text-amber-700">{stats.children}</p>
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Crianças</p>
             </div>
             <div className="p-4 bg-indigo-50 rounded-3xl border border-indigo-100/50">
                <TrendingUp className="w-5 h-5 text-indigo-600 mb-2" />
                <p className="text-2xl font-black text-indigo-700">{stats.youth}</p>
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Jovens</p>
             </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm group">
          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Experiência</h4>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-emerald-50 rounded-3xl border border-emerald-100/50">
                <UserRound className="w-5 h-5 text-emerald-600 mb-2" />
                <p className="text-2xl font-black text-emerald-700">{stats.adult}</p>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Adultos</p>
             </div>
             <div className="p-4 bg-rose-50 rounded-3xl border border-rose-100/50">
                <PersonStanding className="w-5 h-5 text-rose-600 mb-2" />
                <p className="text-2xl font-black text-rose-700">{stats.elderly}</p>
                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Idosos</p>
             </div>
          </div>
        </div>

        <div className="bg-blue-600 p-6 rounded-[2.5rem] shadow-2xl shadow-blue-100 relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">
             <PieIcon className="w-32 h-32 text-white" />
          </div>
          <h4 className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-6">Status da Unidade</h4>
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-4xl font-black text-white">{stats.total}</span>
                <span className="text-xs font-bold text-blue-100 bg-white/10 px-3 py-1 rounded-full">Total Membros</span>
             </div>
             <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                   <p className="text-xl font-black text-white">{stats.active}</p>
                   <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest">Ativos</p>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white flex items-center justify-center text-[10px] font-black text-white">
                   {Math.round((stats.active/stats.total)*100)}%
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Painel de Filtros Avançados */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden transition-all duration-500">
        <div className="p-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone..."
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border border-transparent rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all border ${showFilters ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
            >
              <FilterIcon className="w-4 h-4" />
              Filtros Avançados
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 bg-white text-blue-600 rounded-full flex items-center justify-center text-[9px] animate-in zoom-in">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            {activeFiltersCount > 0 && (
              <button 
                onClick={resetFilters}
                className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-red-100"
                title="Limpar Filtros"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Gaveta de Filtros */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-6 pb-8 border-t border-gray-50 transition-all duration-500 ${showFilters ? 'max-h-96 opacity-100 py-8' : 'max-h-0 opacity-0 py-0 invisible'}`}>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Shield className="w-3 h-3" /> Status do Membro
            </label>
            <select 
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-600 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Todos">Todos os Status</option>
              {Object.values(MemberStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <UserRound className="w-3 h-3" /> Gênero
            </label>
            <select 
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-600 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
            >
              <option value="Todos">Todos Gêneros</option>
              <option value="Masculino">Homens</option>
              <option value="Feminino">Mulheres</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Baby className="w-3 h-3" /> Faixa Etária
            </label>
            <select 
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-600 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
              value={ageGroupFilter}
              onChange={(e) => setAgeGroupFilter(e.target.value)}
            >
              <option value="Todos">Todas as Idades</option>
              <option value="Criança">Crianças (0-12)</option>
              <option value="Jovem">Jovens (13-18)</option>
              <option value="Adulto">Adultos (19-59)</option>
              <option value="Idoso">Idosos (60+)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Tempo de MFC
            </label>
            <select 
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-600 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
              value={mfcTimeFilter}
              onChange={(e) => setMfcTimeFilter(e.target.value)}
            >
              <option value="Todos">Qualquer Tempo</option>
              <option value="0-5">Novatos (0-5 anos)</option>
              <option value="5-10">Integrados (5-10 anos)</option>
              <option value="10-25">Experientes (10-25 anos)</option>
              <option value="25+">Veteranos (25+ anos)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Membros - Versão Mobile (Cards) */}
      <div className="lg:hidden space-y-4">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm active:shadow-md transition-all cursor-pointer"
            onClick={() => navigate(`/mfcistas/${member.id}`)}
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 ${member.gender === 'Masculino' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                {member.name.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-black text-gray-900 truncate">{member.name}</h3>
                  <div className="flex gap-2 items-center flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight ${
                      member.status === MemberStatus.ATIVO ? 'bg-green-100 text-green-700' : 
                      member.status === MemberStatus.AGUARDANDO ? 'bg-amber-100 text-amber-700' : 
                      'bg-gray-100 text-gray-600'}`}>
                      {member.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 font-semibold mb-3">{member.phone}</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">{calculateYears(member.mfcDate)} anos MFC</p>
                      <p className="text-[9px] text-gray-400 font-semibold">Desde {new Date(member.mfcDate).getFullYear()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{calculateYears(member.dob)} anos</p>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase">{member.gender === 'Masculino' ? 'Masculino' : 'Feminino'}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(member); }}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(member); }}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredMembers.length === 0 && (
          <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-100 mb-4">
              <Users className="w-8 h-8 text-gray-200" />
            </div>
            <p className="text-sm font-black text-gray-300 uppercase tracking-widest mb-3">Nenhum MFCista encontrado</p>
            <button onClick={resetFilters} className="text-blue-600 font-bold text-xs uppercase tracking-widest hover:underline">Limpar Filtros</button>
          </div>
        )}
      </div>

      {/* Tabela de Membros - Versão Desktop */}
      <div className="hidden lg:block bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">MFCista</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dados MFC</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Idade</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredMembers.map((member) => (
                <tr 
                  key={member.id} 
                  className="hover:bg-blue-50/20 transition-all cursor-pointer group"
                  onClick={() => navigate(`/mfcistas/${member.id}`)}
                >
                  <td className="px-10 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all shadow-inner ${member.gender === 'Masculino' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 'bg-pink-50 text-pink-600 group-hover:bg-pink-600 group-hover:text-white'}`}>
                        {member.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{member.name}</p>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{member.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-2 mb-1">
                       <Clock className="w-3.5 h-3.5 text-blue-500" />
                       <span className="text-sm font-bold text-gray-700">{calculateYears(member.mfcDate)} anos</span>
                    </div>
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest italic">Desde {new Date(member.mfcDate).getFullYear()}</p>
                  </td>
                  <td className="px-10 py-5 whitespace-nowrap text-center">
                    <p className="text-sm font-black text-gray-900">{calculateYears(member.dob)} anos</p>
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{member.gender === 'Masculino' ? 'Masculino' : 'Feminino'}</p>
                  </td>
                  <td className="px-10 py-5 whitespace-nowrap text-center">
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight shadow-sm ${
                      member.status === MemberStatus.ATIVO ? 'bg-green-100 text-green-700' : 
                      member.status === MemberStatus.AGUARDANDO ? 'bg-amber-100 text-amber-700' : 
                      'bg-gray-100 text-gray-600'}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-10 py-5 whitespace-nowrap text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(member); }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(member); }}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="max-w-xs mx-auto space-y-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto border border-gray-100">
                        <Users className="w-8 h-8 text-gray-200" />
                      </div>
                      <p className="text-sm font-black text-gray-300 uppercase tracking-widest">Nenhum MFCista encontrado com estes filtros.</p>
                      <button onClick={resetFilters} className="text-blue-600 font-bold text-xs uppercase tracking-widest hover:underline">Limpar Filtros</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Membro (Existente) */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-hidden">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] sm:rounded-[2.5rem] shadow-2xl flex flex-col animate-in slide-in-from-bottom-5 duration-400 overflow-hidden border border-gray-100">
            <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between bg-white z-20">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-50"><UserPlus className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">
                    {editingMemberId ? 'Editar MFCista' : 'Novo MFCista'}
                  </h3>
                  <div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-blue-500" /><p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">Unidade: <span className="text-blue-600">{formData.city} - {formData.state}</span></p></div>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setEditingMemberId(null); setFormData(initialFormState); }} className="p-2 hover:bg-gray-50 rounded-xl transition-all text-gray-300 hover:text-gray-500 active:scale-90"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 no-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2"><div className="w-1 h-4 bg-blue-600 rounded-full"></div><h4 className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Dados Pessoais</h4></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Nome Completo" field="name" className="sm:col-span-2" value={formData.name} onChange={(e: any) => updateFormData('name', e.target.value)} />
                  <InputField label="Apelido / Cracha" field="nickname" value={formData.nickname} onChange={(e: any) => updateFormData('nickname', e.target.value)} />
                  <InputField label="Data de Nascimento" field="dob" type="date" value={formData.dob} onChange={(e: any) => updateFormData('dob', e.target.value)} />
                  <InputField label="RG" field="rg" value={formData.rg} onChange={(e: any) => updateFormData('rg', e.target.value)} mask={maskRG} />
                  <InputField label="CPF" field="cpf" value={formData.cpf} onChange={(e: any) => updateFormData('cpf', e.target.value)} mask={maskCPF} />
                  <SelectField label="Sexo" field="gender" options={['Feminino', 'Masculino', 'Outro']} value={formData.gender} onChange={(e: any) => updateFormData('gender', e.target.value)} />
                  <SelectField label="Tipo Sanguineo" field="bloodType" options={['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']} value={formData.bloodType} onChange={(e: any) => updateFormData('bloodType', e.target.value)} />
                  <InputField label="MFCista Desde" field="mfcDate" type="date" value={formData.mfcDate} onChange={(e: any) => updateFormData('mfcDate', e.target.value)} />
                  <SelectField label="Status" field="status" options={[MemberStatus.AGUARDANDO, MemberStatus.ATIVO, MemberStatus.INATIVO, MemberStatus.PENDENTE, MemberStatus.CONVIDADO]} value={formData.status} onChange={(e: any) => updateFormData('status', e.target.value)} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2"><div className="w-1 h-4 bg-rose-500 rounded-full"></div><h4 className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Familia e Historico</h4></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SelectField label="Estado Civil" field="maritalStatus" options={['Casado(a)', 'Solteiro(a)', 'Divorciado(a)', 'Viuvo(a)']} className="sm:col-span-2" value={formData.maritalStatus} onChange={(e: any) => updateFormData('maritalStatus', e.target.value)} />
                  <InputField label="Conjuge" field="spouseName" className="sm:col-span-2" value={formData.spouseName} onChange={(e: any) => updateFormData('spouseName', e.target.value)} />
                  <InputField label="CPF do Conjuge" field="spouseCpf" value={formData.spouseCpf} onChange={(e: any) => updateFormData('spouseCpf', e.target.value)} mask={maskCPF} />
                  <InputField label="Data Casamento" field="marriageDate" type="date" value={formData.marriageDate} onChange={(e: any) => updateFormData('marriageDate', e.target.value)} />
                  <InputField label="Nome do Pai" field="father" value={formData.father} onChange={(e: any) => updateFormData('father', e.target.value)} />
                  <InputField label="Nome da Mae" field="mother" value={formData.mother} onChange={(e: any) => updateFormData('mother', e.target.value)} />
                  <InputField label="Naturalidade" field="naturalness" value={formData.naturalness} onChange={(e: any) => updateFormData('naturalness', e.target.value)} />
                  <SelectField label="Condir" field="condir" options={['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul']} value={formData.condir} onChange={(e: any) => updateFormData('condir', e.target.value)} />
                  <InputField label="Profissao" field="profession" value={formData.profession} onChange={(e: any) => updateFormData('profession', e.target.value)} />
                  <InputField label="Religiao" field="religion" value={formData.religion} onChange={(e: any) => updateFormData('religion', e.target.value)} />
                  <InputField label="Escolaridade" field="education" className="sm:col-span-2" value={formData.education} onChange={(e: any) => updateFormData('education', e.target.value)} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2"><div className="w-1 h-4 bg-amber-500 rounded-full"></div><h4 className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Contato</h4></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Telefone" field="phone" value={formData.phone} onChange={(e: any) => updateFormData('phone', e.target.value)} mask={maskPhone} />
                  <InputField label="Telefone de Emergencia" field="emergencyPhone" value={formData.emergencyPhone} onChange={(e: any) => updateFormData('emergencyPhone', e.target.value)} mask={maskPhone} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2"><div className="w-1 h-4 bg-emerald-500 rounded-full"></div><h4 className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Endereco</h4></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Logradouro" field="street" className="sm:col-span-2" value={formData.street} onChange={(e: any) => updateFormData('street', e.target.value)} />
                  <InputField label="Numero" field="number" value={formData.number} onChange={(e: any) => updateFormData('number', e.target.value)} />
                  <InputField label="Bairro" field="neighborhood" value={formData.neighborhood} onChange={(e: any) => updateFormData('neighborhood', e.target.value)} />
                  <InputField label="CEP" field="zip" value={formData.zip} onChange={(e: any) => updateFormData('zip', e.target.value)} mask={maskCEP} />
                  <InputField label="Complemento" field="complement" value={formData.complement} onChange={(e: any) => updateFormData('complement', e.target.value)} />
                  <SelectField label="Cidade" field="city" options={(cities.length > 0 ? cities.map(c => c.name) : [''])} className="sm:col-span-2" value={formData.city} onChange={(e: any) => updateFormData('city', e.target.value)} />
                  <InputField label="Estado (UF)" field="state" value={formData.state} onChange={(e: any) => updateFormData('state', e.target.value)} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2"><div className="w-1 h-4 bg-violet-500 rounded-full"></div><h4 className="font-black text-gray-900 uppercase tracking-widest text-[10px]">Saude e Informacoes Gerais</h4></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <CheckboxField label="Fumante" field="smoker" checked={formData.smoker} onChange={(e: any) => updateFormData('smoker', e.target.checked)} />
                  <CheckboxField label="Pessoa com Deficiencia (PCD)" field="pcd" checked={formData.pcd} onChange={(e: any) => updateFormData('pcd', e.target.checked)} />
                  <InputField label="Dificuldade de Locomocao" field="mobilityIssue" value={formData.mobilityIssue} onChange={(e: any) => updateFormData('mobilityIssue', e.target.value)} />
                  <InputField label="Plano de Saude" field="healthPlan" value={formData.healthPlan} onChange={(e: any) => updateFormData('healthPlan', e.target.value)} />
                  <InputField label="Restricao Alimentar" field="diet" value={formData.diet} onChange={(e: any) => updateFormData('diet', e.target.value)} />
                  <InputField label="Uso de Medicacao" field="medication" value={formData.medication} onChange={(e: any) => updateFormData('medication', e.target.value)} />
                  <InputField label="Alergia" field="allergy" value={formData.allergy} onChange={(e: any) => updateFormData('allergy', e.target.value)} />
                  <InputField label="Descricao PCD" field="pcdDescription" className="sm:col-span-2" value={formData.pcdDescription} onChange={(e: any) => updateFormData('pcdDescription', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="px-8 py-5 bg-white border-t border-gray-50 flex flex-col sm:flex-row items-center justify-end gap-3 z-20">
              <button onClick={() => setShowModal(false)} className="order-3 sm:order-1 px-5 py-2 text-gray-400 font-black text-[9px] uppercase tracking-[0.2em] hover:text-red-500 transition-colors">Cancelar</button>
              <button onClick={() => handleSave(true)} className="order-2 w-full sm:w-auto bg-gray-50 border border-gray-100 text-gray-500 px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2">Salvar e Criar Outro</button>
              <button onClick={() => handleSave(false)} className="order-1 w-full sm:w-auto bg-blue-600 text-white px-10 py-2.5 rounded-xl font-black text-[10px] shadow-lg shadow-blue-50 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest"><Save className="w-4 h-4" /> Salvar Cadastro</button>
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
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Excluir MFCista</h3>
                  <p className="text-xs text-gray-500 font-semibold mt-1">Esta ação não pode ser desfeita</p>
                </div>
              </div>
            </div>
            <div className="px-8 py-6">
              <p className="text-sm text-gray-600 font-medium">
                Tem certeza que deseja excluir <span className="font-black text-gray-900">{deleteConfirm.memberName}</span>? 
                Todos os dados serão permanentemente removidos do sistema.
              </p>
            </div>
            <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm({ show: false, memberId: '', memberName: '' })}
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

export default Members;




