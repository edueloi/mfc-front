import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search,
  Plus,
  X,
  MapPin,
  Save,
  Heart,
  UserPlus,
  Users,
  Baby,
  PersonStanding,
  UserRound,
  VenetianMask,
  TrendingUp,
  Clock,
  Trash2,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  Shield,
  PieChart as PieIcon,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { api } from '../api';
import { MemberStatus, UserRoleType, Member, City } from '../types';
import { maskCPF, maskPhone, maskCEP, maskRG, unmask } from '../utils/masks';
import {
  PageWrapper,
  SectionTitle,
  StatGrid,
  StatCard,
  ContentCard,
  Button,
  IconButton,
  Input,
  Select,
  Switch,
  Modal,
  ModalFooter,
  ConfirmModal,
  EmptyState,
  Badge,
  StatusBadge,
  FilterLine,
  FilterLineSection,
  FilterLineItem,
  FilterLineSearch,
  FilterLineSegmented,
  GridTable,
  usePagination,
} from '../components/ui';
import type { Column } from '../components/ui';
import { MemberForm } from '../components/MemberForm';

// ── Helpers ──────────────────────────────────────────────────────────────────

function calcYears(dateStr: string) {
  if (!dateStr) return 0;
  const today = new Date();
  const d = new Date(dateStr);
  let y = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) y--;
  return y;
}

// ── Formulário: campo reutilizável ────────────────────────────────────────────

const FormInput = ({ label, value, onChange, type = 'text', placeholder = '', mask, colSpan = 1 }: any) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = mask ? mask(e.target.value) : e.target.value;
    onChange(v);
  };
  return (
    <div className={colSpan === 2 ? 'sm:col-span-2' : ''}>
      <Input label={label} type={type} placeholder={placeholder} value={value} onChange={handleChange} />
    </div>
  );
};

const FormSelect = ({ label, value, onChange, options, colSpan = 1 }: any) => (
  <div className={colSpan === 2 ? 'sm:col-span-2' : ''}>
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}
      options={options.map((o: string) => ({ value: o, label: o }))} />
  </div>
);

const FormCheck = ({ label, checked, onChange }: any) => (
  <label className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 cursor-pointer hover:border-amber-400 transition-all">
    <Switch checked={checked} onCheckedChange={onChange} size="sm" />
    <span className="text-xs font-black text-zinc-600 uppercase tracking-widest">{label}</span>
  </label>
);

// ── Componente principal ──────────────────────────────────────────────────────

const Members: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [genderFilter, setGenderFilter] = useState('Todos');
  const [ageGroupFilter, setAgeGroupFilter] = useState('Todos');
  const [mfcTimeFilter, setMfcTimeFilter] = useState('Todos');
  const [teamFilter, setTeamFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'mfc-desc' | 'age-desc'>('name-asc');
  const [showFilters, setShowFilters] = useState(false);

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: string; name: string }>({ show: false, id: '', name: '' });
  const [teamModal, setTeamModal] = useState<{ show: boolean; memberId: string; memberName: string; currentTeamId: string | null }>({ show: false, memberId: '', memberName: '', currentTeamId: null });

  // Dados
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [estados, setEstados] = useState<Array<{ id: number; sigla: string; nome: string }>>([]);
  const [cidadesPorEstado, setCidadesPorEstado] = useState<Array<{ id: number; nome: string }>>([]);

  // Form
  const [activeTab, setActiveTab] = useState<'pessoal' | 'familia' | 'contato' | 'endereco' | 'saude'>('pessoal');
  const [estadoBusca, setEstadoBusca] = useState('');
  const [cidadeBusca, setCidadeBusca] = useState('');

  const blank = {
    name: '', nickname: '', dob: '', rg: '', cpf: '', bloodType: 'O+', gender: 'Feminino',
    maritalStatus: 'Casado(a)', spouseName: '', spouseCpf: '', marriageDate: '',
    mfcDate: new Date().toISOString().split('T')[0], phone: '', emergencyPhone: '',
    street: '', number: '', neighborhood: '', zip: '', complement: '', city: 'Tatui',
    state: 'SP', condir: 'Sudeste', naturalness: '', father: '', mother: '', photoUrl: '',
    smoker: false, mobilityIssue: '', healthPlan: '', diet: '', medication: '',
    allergy: '', pcd: false, pcdDescription: '', profession: '', religion: 'Catolica',
    education: 'Superior completo', createAccess: false, email: '', username: '',
    password: '', role: UserRoleType.USUARIO, status: MemberStatus.AGUARDANDO, teamId: null as string | null,
    familyName: '', relationshipType: 'Titular', paysMonthly: true,
  };
  const [form, setForm] = useState(blank);
  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  // Carregamento
  const loadData = () => {
    api.getMembers().then(setMembers).catch(() => setMembers([]));
    api.getCities().then(setCities).catch(() => setCities([]));
    api.getTeams().then(setTeams).catch(() => setTeams([]));
  };

  useEffect(() => {
    loadData();
    api.getEstados().then(setEstados).catch(() => setEstados([]));
    window.addEventListener('focus', loadData);
    const iv = setInterval(loadData, 30000);
    return () => { window.removeEventListener('focus', loadData); clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (form.state?.length === 2) {
      api.getCidadesPorEstado(form.state).then(setCidadesPorEstado).catch(() => setCidadesPorEstado([]));
    }
  }, [form.state]);

  useEffect(() => {
    if (cities.length > 0) setForm(p => ({ ...p, city: p.city || cities[0].name, state: p.state || cities[0].uf }));
  }, [cities]);

  // Abre o modal de edição quando vindo do MemberProfile via navigate('/mfcistas', { state: { editId } })
  useEffect(() => {
    const editId = (location.state as any)?.editId;
    if (!editId || !members.length) return;
    const target = members.find(m => m.id === editId);
    if (!target) return;
    setForm({
      name: target.name, nickname: target.nickname || '', dob: target.dob || '',
      rg: maskRG(target.rg || ''), cpf: maskCPF(target.cpf || ''),
      bloodType: target.bloodType || 'O+', gender: target.gender || 'Feminino',
      maritalStatus: target.maritalStatus || 'Casado(a)', spouseName: target.spouseName || '',
      spouseCpf: maskCPF(target.spouseCpf || ''), marriageDate: target.marriageDate || '',
      mfcDate: target.mfcDate || new Date().toISOString().split('T')[0],
      phone: maskPhone(target.phone || ''), emergencyPhone: maskPhone(target.emergencyPhone || ''),
      street: target.street || '', number: target.number || '', neighborhood: target.neighborhood || '',
      zip: maskCEP(target.zip || ''), complement: target.complement || '', city: target.city || 'Tatui',
      state: target.state || 'SP', condir: target.condir || 'Sudeste', naturalness: target.naturalness || '',
      father: target.father || '', mother: target.mother || '', smoker: target.smoker || false,
      mobilityIssue: target.mobilityIssue || '', healthPlan: target.healthPlan || '', diet: target.diet || '',
      medication: target.medication || '', allergy: target.allergy || '', pcd: target.pcd || false,
      pcdDescription: target.pcdDescription || '', profession: target.profession || '',
      religion: target.religion || 'Catolica', education: target.education || 'Superior completo',
      createAccess: false, email: '', username: '', password: '', role: UserRoleType.USUARIO,
      status: target.status || MemberStatus.AGUARDANDO, teamId: target.teamId || null,
      photoUrl: target.photoUrl || '', familyName: target.familyName || '',
      relationshipType: target.relationshipType || 'Titular', paysMonthly: target.paysMonthly !== false,
    });
    setEditingId(target.id);
    setShowModal(true);
    setActiveTab('pessoal');
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, members]);

  // Stats
  const stats = useMemo(() => {
    const t = { total: members.length, male: 0, female: 0, children: 0, youth: 0, adult: 0, elderly: 0, active: 0 };
    members.forEach(m => {
      if (m.gender === 'Masculino') t.male++; else t.female++;
      if (m.status === MemberStatus.ATIVO) t.active++;
      const age = calcYears(m.dob);
      if (age <= 12) t.children++; else if (age <= 18) t.youth++; else if (age <= 59) t.adult++; else t.elderly++;
    });
    return t;
  }, [members]);

  // Filtros
  const filtered = useMemo(() => {
    const r = members.filter(m => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search);
      const matchStatus = statusFilter === 'Todos' || m.status === statusFilter;
      const matchGender = genderFilter === 'Todos' || m.gender === genderFilter;
      const age = calcYears(m.dob);
      let grp = 'Adulto';
      if (age <= 12) grp = 'Criança'; else if (age <= 18) grp = 'Jovem'; else if (age >= 60) grp = 'Idoso';
      const matchAge = ageGroupFilter === 'Todos' || grp === ageGroupFilter;
      const yMfc = calcYears(m.mfcDate);
      let tr = '0-5';
      if (yMfc > 25) tr = '25+'; else if (yMfc > 10) tr = '10-25'; else if (yMfc > 5) tr = '5-10';
      const matchMfc = mfcTimeFilter === 'Todos' || tr === mfcTimeFilter;
      const matchTeam = teamFilter === 'Todos' || m.teamId === teamFilter || (teamFilter === 'Sem equipe' && !m.teamId);
      return matchSearch && matchStatus && matchGender && matchAge && matchMfc && matchTeam;
    });
    return [...r].sort((a, b) => {
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'mfc-desc') return calcYears(b.mfcDate) - calcYears(a.mfcDate);
      if (sortBy === 'age-desc') return calcYears(b.dob) - calcYears(a.dob);
      return a.name.localeCompare(b.name);
    });
  }, [members, search, statusFilter, genderFilter, ageGroupFilter, mfcTimeFilter, teamFilter, sortBy]);

  const { page, pageSize, paginatedData, setPage, setPageSize } = usePagination(filtered, 15);

  const activeFiltersCount = [statusFilter !== 'Todos', genderFilter !== 'Todos', ageGroupFilter !== 'Todos', mfcTimeFilter !== 'Todos', teamFilter !== 'Todos'].filter(Boolean).length;

  const resetFilters = () => { setStatusFilter('Todos'); setGenderFilter('Todos'); setAgeGroupFilter('Todos'); setMfcTimeFilter('Todos'); setTeamFilter('Todos'); setSearch(''); setSortBy('name-asc'); };

  // Formulário
  const requiredFilled = [form.name, form.cpf, form.phone, form.dob, form.mfcDate, form.city, form.state].filter(v => String(v).trim()).length;
  const completion = Math.round((requiredFilled / 7) * 100);
  const canSave = form.name.trim() && form.phone.trim() && form.cpf.trim();

  const handleSave = (saveAndNew: boolean) => {
    if (!canSave) { toast.error('Preencha ao menos Nome, CPF e Telefone.'); return; }
    const payload: Partial<Member> = {
      ...form,
      rg: unmask(form.rg), cpf: unmask(form.cpf), spouseCpf: unmask(form.spouseCpf),
      phone: unmask(form.phone), emergencyPhone: unmask(form.emergencyPhone), zip: unmask(form.zip),
      movementRoles: [], updatedAt: new Date().toISOString(),
    };
    if (editingId) {
      toast.promise(api.updateMember(editingId, payload).then(u => {
        setMembers(p => p.map(m => m.id === editingId ? u : m));
        setShowModal(false); setForm(blank); setEditingId(null);
      }), { loading: 'Atualizando...', success: 'MFCista atualizado! ✅', error: (e) => e.message });
    } else {
      toast.promise(api.createMember({ ...payload, createdAt: new Date().toISOString() }).then(c => {
        setMembers(p => [c, ...p]);
        if (saveAndNew) setForm(blank); else { setShowModal(false); setForm(blank); }
      }), { loading: 'Criando...', success: 'MFCista criado! 🎉', error: (e) => e.message });
    }
  };

  const handleEdit = (m: Member) => {
    setForm({
      name: m.name, nickname: m.nickname || '', dob: m.dob || '', rg: maskRG(m.rg || ''),
      cpf: maskCPF(m.cpf || ''), bloodType: m.bloodType || 'O+', gender: m.gender || 'Feminino',
      maritalStatus: m.maritalStatus || 'Casado(a)', spouseName: m.spouseName || '',
      spouseCpf: maskCPF(m.spouseCpf || ''), marriageDate: m.marriageDate || '',
      mfcDate: m.mfcDate || new Date().toISOString().split('T')[0],
      phone: maskPhone(m.phone || ''), emergencyPhone: maskPhone(m.emergencyPhone || ''),
      street: m.street || '', number: m.number || '', neighborhood: m.neighborhood || '',
      zip: maskCEP(m.zip || ''), complement: m.complement || '', city: m.city || 'Tatui',
      state: m.state || 'SP', condir: m.condir || 'Sudeste', naturalness: m.naturalness || '',
      father: m.father || '', mother: m.mother || '', smoker: m.smoker || false,
      mobilityIssue: m.mobilityIssue || '', healthPlan: m.healthPlan || '', diet: m.diet || '',
      medication: m.medication || '', allergy: m.allergy || '', pcd: m.pcd || false,
      pcdDescription: m.pcdDescription || '', profession: m.profession || '',
      religion: m.religion || 'Catolica', education: m.education || 'Superior completo',
      createAccess: false, email: '', username: '', password: '', role: UserRoleType.USUARIO,
      status: m.status || MemberStatus.AGUARDANDO, teamId: m.teamId || null,
      photoUrl: m.photoUrl || '', familyName: m.familyName || '',
      relationshipType: m.relationshipType || 'Titular', paysMonthly: m.paysMonthly !== false,
    });
    setEditingId(m.id); setShowModal(true);
  };

  const confirmDelete = () => {
    toast.promise(api.deleteMember(deleteConfirm.id).then(() => {
      setMembers(p => p.filter(m => m.id !== deleteConfirm.id));
      setDeleteConfirm({ show: false, id: '', name: '' });
    }), { loading: 'Excluindo...', success: 'MFCista excluído! 🗑️', error: (e) => e.message });
  };

  const handleRemoveTeam = () => {
    toast.promise(api.updateMember(teamModal.memberId, { teamId: null }).then(u => {
      setMembers(p => p.map(m => m.id === teamModal.memberId ? u : m));
      setTeamModal({ show: false, memberId: '', memberName: '', currentTeamId: null });
    }), { loading: 'Desvinculando...', success: 'Membro desvinculado! ✅', error: (e) => e.message });
  };

  const handleTransferTeam = (teamId: string) => {
    toast.promise(api.updateMember(teamModal.memberId, { teamId }).then(u => {
      setMembers(p => p.map(m => m.id === teamModal.memberId ? u : m));
      setTeamModal({ show: false, memberId: '', memberName: '', currentTeamId: null });
    }), { loading: 'Transferindo...', success: 'Transferido! 🔄', error: (e) => e.message });
  };

  const handleCepChange = async (v: string) => {
    const masked = maskCEP(v);
    set('zip', masked);
    if (unmask(masked).length === 8) {
      toast.promise(api.buscarCEP(unmask(masked)).then(data => {
        if (data.erro) throw new Error('CEP não encontrado');
        setForm(p => ({ ...p, street: data.logradouro || p.street, neighborhood: data.bairro || p.neighborhood, city: data.localidade || p.city, state: data.uf || p.state }));
      }), { loading: 'Buscando endereço...', success: 'Endereço encontrado! 📍', error: 'CEP não encontrado' });
    }
  };

  // Colunas da tabela
  const columns: Column<Member>[] = [
    {
      header: 'MFCista',
      render: (m) => (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-[10px] sm:text-sm shrink-0 ${m.gender === 'Masculino' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
            {m.name.substring(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-900 truncate">{m.name}</p>
            <p className="text-[10px] text-zinc-400 font-semibold truncate">{m.phone}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Equipe',
      render: (m) => m.teamId
        ? <span className="text-sm font-semibold text-zinc-700">{teams.find(t => t.id === m.teamId)?.name || '—'}</span>
        : <span className="text-xs text-zinc-400 italic">Sem equipe</span>,
    },
    {
      header: 'Tempo MFC',
      render: (m) => (
        <div>
          <p className="text-sm font-bold text-zinc-800">{calcYears(m.mfcDate)} anos</p>
          <p className="text-[10px] text-zinc-400">desde {new Date(m.mfcDate).getFullYear()}</p>
        </div>
      ),
    },
    {
      header: 'Idade',
      render: (m) => (
        <div>
          <p className="text-sm font-bold text-zinc-800">{calcYears(m.dob)} anos</p>
          <p className="text-[10px] text-zinc-400">{m.gender === 'Masculino' ? 'Masculino' : 'Feminino'}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (m) => (
        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${
          m.status === MemberStatus.ATIVO ? 'bg-emerald-100 text-emerald-700' :
          m.status === MemberStatus.AGUARDANDO ? 'bg-amber-100 text-amber-700' :
          'bg-zinc-100 text-zinc-500'}`}>
          {m.status}
        </span>
      ),
    },
    {
      header: 'Ações',
      render: (m) => (
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {m.teamId && (
            <Button variant="ghost" size="xs" iconLeft={<Layers className="w-3.5 h-3.5" />}
              className="flex-1 sm:flex-initial"
              onClick={(e) => { e.stopPropagation(); setTeamModal({ show: true, memberId: m.id, memberName: m.name, currentTeamId: m.teamId || null }); }}>
              Equipe
            </Button>
          )}
          <Button variant="outline" size="xs" className="flex-1 sm:flex-initial" onClick={(e) => { e.stopPropagation(); handleEdit(m); }}>Editar</Button>
          <Button variant="danger" size="xs" className="flex-1 sm:flex-initial" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ show: true, id: m.id, name: m.name }); }}>Excluir</Button>
        </div>
      ),
    },
  ];

  // Tabs do modal
  const TABS = ['pessoal', 'familia', 'contato', 'endereco', 'saude'] as const;
  const tabIdx = TABS.indexOf(activeTab);

  const currentMonth = new Date().getMonth() + 1;
  const birthdays = filtered.filter(m => m.dob && new Date(m.dob).getMonth() + 1 === currentMonth)
    .sort((a, b) => new Date(a.dob).getDate() - new Date(b.dob).getDate());

  const MONTH_NAMES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <PageWrapper>
      <div className="space-y-6">

        {/* Header */}
        <SectionTitle
          title="Comunidade MFC"
          description="Gestão demográfica e administrativa de MFCistas"
          icon={Users}
          action={
            <Button variant="primary" size="md" iconLeft={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
              Novo MFCista
            </Button>
          }
        />

        {/* Stats */}
        <StatGrid cols={4}>
          <StatCard title="Total MFCistas" value={stats.total} icon={Users} color="info" description={`${stats.active} ativos`} delay={0} />
          <StatCard title="Jovens e Crianças" value={stats.children + stats.youth} icon={Baby} color="warning" description="Base do Movimento" delay={0.05} />
          <StatCard title="3ª Idade" value={stats.elderly} icon={PersonStanding} color="danger" description="Nossa Fortaleza" delay={0.1} />
          <StatCard title="Adultos" value={stats.adult} icon={UserRound} color="success" description="Força do MFC" delay={0.15} />
        </StatGrid>

        {/* Aniversariantes */}
        {birthdays.length > 0 && (
          <ContentCard padding="md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-pink-50 rounded-2xl flex items-center justify-center border border-pink-100">
                <span className="text-lg">🎂</span>
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900">Aniversariantes de {MONTH_NAMES[currentMonth]}</h3>
                <p className="text-xs text-zinc-400 font-semibold">{birthdays.length} {birthdays.length === 1 ? 'aniversariante' : 'aniversariantes'} este mês</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {birthdays.map(m => {
                const day = new Date(m.dob).getDate();
                const today = new Date().getDate();
                const isToday = day === today;
                return (
                  <div key={m.id} onClick={() => navigate(`/mfcistas/${m.id}`)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer hover:shadow-md transition-all ${isToday ? 'border-pink-400 bg-pink-50' : 'border-zinc-200 hover:border-amber-300'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${m.gender === 'Masculino' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                      {m.name.substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-zinc-900 text-sm truncate">{m.name}</p>
                      <p className="text-[10px] text-zinc-400 font-semibold">dia {day} · {calcYears(m.dob)} anos</p>
                    </div>
                    {isToday && <span className="text-lg">🎉</span>}
                  </div>
                );
              })}
            </div>
          </ContentCard>
        )}

        {/* Filtros */}
        <FilterLine>
          <FilterLineSection grow>
            <FilterLineItem grow>
              <FilterLineSearch value={search} onChange={setSearch} placeholder="Buscar por nome ou telefone..." />
            </FilterLineItem>
          </FilterLineSection>
          <FilterLineSection align="right">
            <div className="flex flex-wrap gap-1.5">
              {(['Todos', MemberStatus.ATIVO, MemberStatus.AGUARDANDO, 'Sem equipe'] as string[]).map(s => (
                <button key={s} onClick={() => s === 'Sem equipe' ? setTeamFilter(s) : setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                    (s === 'Sem equipe' ? teamFilter : statusFilter) === s
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
                  }`}>
                  {s === 'Todos' ? `Todos (${members.length})` :
                   s === MemberStatus.ATIVO ? `Ativos (${members.filter(m => m.status === MemberStatus.ATIVO).length})` :
                   s === MemberStatus.AGUARDANDO ? `Aguardando (${members.filter(m => m.status === MemberStatus.AGUARDANDO).length})` :
                   `Sem Equipe (${members.filter(m => !m.teamId).length})`}
                </button>
              ))}
            </div>
            <Button variant={showFilters ? 'primary' : 'outline'} size="sm"
              iconLeft={<Filter className="w-3.5 h-3.5" />}
              onClick={() => setShowFilters(v => !v)}>
              Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="danger" size="sm" iconLeft={<X className="w-3.5 h-3.5" />} onClick={resetFilters}>Limpar</Button>
            )}
          </FilterLineSection>
        </FilterLine>

        {/* Gaveta de filtros avançados */}
        {showFilters && (
          <ContentCard padding="md">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                options={[{ value: 'Todos', label: 'Todos os Status' }, ...Object.values(MemberStatus).map(s => ({ value: s, label: s }))]} />
              <Select label="Gênero" value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
                options={[{ value: 'Todos', label: 'Todos' }, { value: 'Masculino', label: 'Masculino' }, { value: 'Feminino', label: 'Feminino' }]} />
              <Select label="Faixa Etária" value={ageGroupFilter} onChange={e => setAgeGroupFilter(e.target.value)}
                options={[{ value: 'Todos', label: 'Todas' }, { value: 'Criança', label: 'Crianças (0-12)' }, { value: 'Jovem', label: 'Jovens (13-18)' }, { value: 'Adulto', label: 'Adultos (19-59)' }, { value: 'Idoso', label: 'Idosos (60+)' }]} />
              <Select label="Tempo MFC" value={mfcTimeFilter} onChange={e => setMfcTimeFilter(e.target.value)}
                options={[{ value: 'Todos', label: 'Qualquer' }, { value: '0-5', label: 'Novatos (0-5)' }, { value: '5-10', label: 'Integrados (5-10)' }, { value: '10-25', label: 'Experientes (10-25)' }, { value: '25+', label: 'Veteranos (25+)' }]} />
              <Select label="Equipe" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
                options={[{ value: 'Todos', label: 'Todas' }, { value: 'Sem equipe', label: 'Sem Equipe' }, ...teams.map(t => ({ value: t.id, label: t.name }))]} />
              <Select label="Ordenação" value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                options={[{ value: 'name-asc', label: 'Nome (A-Z)' }, { value: 'name-desc', label: 'Nome (Z-A)' }, { value: 'mfc-desc', label: 'Mais tempo MFC' }, { value: 'age-desc', label: 'Maior idade' }]} />
            </div>
          </ContentCard>
        )}

        {/* Tabela */}
        <ContentCard padding="none">
          <GridTable
            columns={columns}
            data={paginatedData}
            keyExtractor={(m) => m.id}
            onRowClick={(m) => navigate(`/mfcistas/${m.id}`)}
            noDesktopCard
            emptyMessage={
              <EmptyState icon={Users} title="Nenhum MFCista encontrado" description="Tente ajustar os filtros ou cadastre um novo membro."
                action={<Button variant="primary" size="sm" onClick={resetFilters}>Limpar Filtros</Button>} />
            }
            pagination={{ total: filtered.length, page, pageSize, onPageChange: setPage, onPageSizeChange: setPageSize }}
          />
        </ContentCard>

      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); setForm(blank); }}
        title={editingId ? 'Editar MFCista' : 'Novo MFCista'}
        size="xl"
      >
        <MemberForm
          isEditing={!!editingId}
          teams={teams}
          initialData={form}
          onCancel={() => { setShowModal(false); setEditingId(null); setForm(blank); }}
          onSave={(data) => {
            const payload: Partial<Member> = {
              ...data,
              rg: unmask(data.rg),
              cpf: unmask(data.cpf),
              spouseCpf: unmask(data.spouseCpf),
              phone: unmask(data.phone),
              emergencyPhone: unmask(data.emergencyPhone),
              zip: unmask(data.zip),
              movementRoles: [],
              updatedAt: new Date().toISOString(),
            };
            if (editingId) {
              toast.promise(api.updateMember(editingId, payload).then(u => {
                setMembers(p => p.map(m => m.id === editingId ? u : m));
                setShowModal(false); setForm(blank); setEditingId(null);
              }), { loading: 'Atualizando...', success: 'MFCista atualizado! ✅', error: (e) => e.message });
            } else {
              toast.promise(api.createMember({ ...payload, createdAt: new Date().toISOString() }).then(c => {
                setMembers(p => [c, ...p]);
                setShowModal(false); setForm(blank);
              }), { loading: 'Criando...', success: 'MFCista criado! 🎉', error: (e) => e.message });
            }
          }}
        />
      </Modal>

      {/* ── Confirmar Exclusão ────────────────────────────────────────────────── */}
      <ConfirmModal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({ show: false, id: '', name: '' })}
        onConfirm={confirmDelete}
        title="Excluir MFCista"
        message={`Tem certeza que deseja excluir ${deleteConfirm.name}? Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, Excluir"
        variant="danger"
      />

      {/* ── Modal Gerenciar Equipe ─────────────────────────────────────────────── */}
      <Modal
        isOpen={teamModal.show}
        onClose={() => setTeamModal({ show: false, memberId: '', memberName: '', currentTeamId: null })}
        title="Gerenciar Equipe"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-0.5">Equipe Atual</p>
            <p className="text-sm font-black text-zinc-900">
              {teamModal.currentTeamId ? teams.find(t => t.id === teamModal.currentTeamId)?.name || '—' : 'Sem equipe'}
            </p>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Transferir para:</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {teams.filter(t => t.id !== teamModal.currentTeamId).map(team => (
              <button key={team.id} onClick={() => handleTransferTeam(team.id)}
                className="w-full p-3 bg-zinc-50 hover:bg-amber-50 border border-zinc-200 hover:border-amber-300 rounded-xl text-left transition-all flex items-center justify-between group">
                <div>
                  <p className="text-sm font-bold text-zinc-900 group-hover:text-amber-700">{team.name}</p>
                  <p className="text-xs text-zinc-400">{team.city} - {team.state}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-amber-500" />
              </button>
            ))}
          </div>
          {teamModal.currentTeamId && (
            <button onClick={handleRemoveTeam}
              className="w-full p-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-left transition-all flex items-center gap-3">
              <X className="w-4 h-4 text-red-600" />
              <div>
                <p className="text-sm font-bold text-red-700">Remover da Equipe</p>
                <p className="text-xs text-red-400">O membro ficará sem equipe</p>
              </div>
            </button>
          )}
        </div>
        <ModalFooter>
          <div />
          <Button variant="outline" size="sm" onClick={() => setTeamModal({ show: false, memberId: '', memberName: '', currentTeamId: null })}>Fechar</Button>
        </ModalFooter>
      </Modal>

    </PageWrapper>
  );
};

export default Members;
