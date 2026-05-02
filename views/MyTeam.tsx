import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  DollarSign,
  History,
  Plus,
  CheckCircle2,
  MapPin,
  Heart,
  BarChart3,
  Ticket,
  Check,
  Settings as SettingsIcon,
  Edit,
  Briefcase,
  Cake,
  RotateCcw,
  AlertCircle,
  Save,
  X,
} from 'lucide-react';
import { api } from '../api';
import { Payment, Member, EventSale, Event, BaseTeam, UserRoleType } from '../types';
import {
  PageWrapper,
  ContentCard,
  FilterLine,
  FilterLineSection,
  FilterLineSearch,
  FilterLineItem,
  FilterLineSegmented,
  Select,
  Input,
  Button,
  Modal,
  ModalFooter,
  EmptyState,
  Divider,
} from '../components/ui';

interface MyTeamViewProps {
  teamId: string;
  userId: string;
  userRole: UserRoleType;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'familias',    label: 'Famílias',      icon: Heart },
  { id: 'membros',     label: 'Membros',        icon: Users },
  { id: 'mensalidades',label: 'Mensalidades',   icon: DollarSign },
  { id: 'eventos',     label: 'Metas Equipe',   icon: Ticket },
  { id: 'historico',   label: 'Extrato',        icon: History },
] as const;

type TabId = typeof TABS[number]['id'];

const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const shortMonths = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

const MyTeamView: React.FC<MyTeamViewProps> = ({ teamId, userId, userRole }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('familias');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [editingFamily, setEditingFamily] = useState<{ name: string; memberIds: string[]; relationships: { [id: string]: string } } | null>(null);
  const [defaultMonthlyAmount, setDefaultMonthlyAmount] = useState(50.00);

  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);

  const [selectedForPayment, setSelectedForPayment] = useState<{
    memberIds: string[]; displayName: string; amountPerPerson: number; payingMembers: Member[];
  } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    months: [] as number[], year: 2026, amountPerMonth: 50.00, observation: '',
  });

  const [membersState, setMembersState] = useState<Member[]>([]);
  const [team, setTeam] = useState<BaseTeam | null>(null);
  const [localPayments, setLocalPayments] = useState<Payment[]>([]);
  const [localSales, setLocalSales] = useState<EventSale[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [familySearch, setFamilySearch] = useState('');
  const [familyStatusFilter, setFamilyStatusFilter] = useState('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('all');

  // ── data ────────────────────────────────────────────────────────────────────

  const loadData = () => {
    api.getMembers().then((items: Member[]) => setMembersState(items.filter(m => m.teamId === teamId))).catch(() => setMembersState([]));
    api.getTeams().then((items: BaseTeam[]) => setTeam(items.find(t => t.id === teamId) || null)).catch(() => setTeam(null));
    api.getPayments().then((items: Payment[]) => setLocalPayments(items.filter(p => p.teamId === teamId))).catch(() => setLocalPayments([]));
    api.getEventSales().then((items: EventSale[]) => setLocalSales(items.filter(s => s.teamId === teamId))).catch(() => setLocalSales([]));
    api.getEvents().then(setEvents).catch(() => setEvents([]));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('focus', loadData);
    const iv = setInterval(loadData, 30000);
    return () => { window.removeEventListener('focus', loadData); clearInterval(iv); };
  }, [teamId]);

  useEffect(() => {
    api.getFinancialConfig()
      .then((config: any) => { if (config?.monthlyPaymentAmount) { const v = parseFloat(config.monthlyPaymentAmount); setDefaultMonthlyAmount(isNaN(v) ? 50 : v); } })
      .catch(() => {});
  }, []);

  useEffect(() => { setPaymentForm(prev => ({ ...prev, amountPerMonth: defaultMonthlyAmount })); }, [defaultMonthlyAmount]);

  // ── computed ─────────────────────────────────────────────────────────────────

  const financeStats = useMemo(() => {
    const currentRef = `${viewMonth}/${viewYear}`;
    const monthlyTotal = localPayments.filter(p => p.referenceMonth === currentRef).reduce((acc, p) => acc + p.amount, 0);
    const yearlyTotal = localPayments.filter(p => p.referenceMonth.endsWith(`/${viewYear}`)).reduce((acc, p) => acc + p.amount, 0);
    let pendingAmount = 0;
    const payingMembers = membersState.filter(m => m.paysMonthly !== false);
    payingMembers.forEach(m => {
      const isInCouple = payingMembers.some(o =>
        o.id !== m.id && o.familyName === m.familyName && o.familyName &&
        ((m.relationshipType === 'Titular' && o.relationshipType === 'Cônjuge') ||
         (m.relationshipType === 'Cônjuge' && o.relationshipType === 'Titular'))
      );
      const amt = isInCouple ? defaultMonthlyAmount / 2 : defaultMonthlyAmount;
      for (let i = 1; i <= viewMonth; i++) {
        if (!localPayments.some(p => p.memberId === m.id && p.referenceMonth === `${i}/${viewYear}`)) pendingAmount += amt;
      }
    });
    return { monthlyTotal, yearlyTotal, pendingAmount };
  }, [localPayments, viewMonth, viewYear, membersState, defaultMonthlyAmount]);

  const groupedMembers = useMemo(() => {
    const map = new Map<string, Member[]>();
    membersState.forEach(m => {
      if (m.familyName?.trim()) {
        if (!map.has(m.familyName)) map.set(m.familyName, []);
        map.get(m.familyName)!.push(m);
      }
    });
    const groups: any[] = [];
    map.forEach((familyMembers, familyName) => {
      const sortedMembers = [...familyMembers].sort((a, b) => {
        const ord: Record<string, number> = { Titular: 1, 'Cônjuge': 2, 'Filho(a)': 3, 'Pai/Mãe': 4, Outro: 5 };
        return (ord[a.relationshipType || 'Outro'] || 5) - (ord[b.relationshipType || 'Outro'] || 5);
      });
      const paying = sortedMembers.filter(m => m.paysMonthly !== false);
      const titular = sortedMembers.find(m => m.relationshipType === 'Titular') || sortedMembers[0];
      const spouse = sortedMembers.find(m => m.relationshipType === 'Cônjuge');
      const isCouple = paying.length >= 2 && spouse && spouse.paysMonthly !== false;
      const amtPerPerson = isCouple ? defaultMonthlyAmount / 2 : defaultMonthlyAmount;
      const getStatus = (member: Member, month: number) =>
        member.paysMonthly === false || localPayments.some(p => p.memberId === member.id && p.referenceMonth === `${month}/${viewYear}`);
      const monthsStatus = Array.from({ length: 12 }, (_, i) => paying.every(m => getStatus(m, i + 1)));
      const atrasos = monthsStatus.slice(0, viewMonth).filter(s => !s).length;
      let displayName = `Família ${familyName}`;
      if (spouse) displayName = `${titular.nickname || titular.name.split(' ')[0]} & ${spouse.nickname || spouse.name.split(' ')[0]}`;
      groups.push({ type: isCouple ? 'couple' : 'single', members: sortedMembers, payingMembers: paying, displayName, monthsStatus, atrasos, amountPerPerson: amtPerPerson, familyName });
    });
    return groups.sort((a, b) => b.atrasos - a.atrasos);
  }, [membersState, localPayments, viewYear, viewMonth, defaultMonthlyAmount]);

  const filteredGroupedMembers = useMemo(() => groupedMembers
    .filter(g => familyStatusFilter === 'all' ? true : familyStatusFilter === 'pendente' ? g.atrasos > 0 : g.atrasos === 0)
    .filter(g => {
      if (!familySearch.trim()) return true;
      const q = familySearch.toLowerCase();
      return g.displayName.toLowerCase().includes(q) || String(g.familyName || '').toLowerCase().includes(q) || g.members.some((m: Member) => m.name.toLowerCase().includes(q));
    }), [groupedMembers, familySearch, familyStatusFilter]);

  const familyQuickStats = useMemo(() => ({
    total: groupedMembers.length,
    pending: groupedMembers.filter(g => g.atrasos > 0).length,
    upToDate: groupedMembers.filter(g => g.atrasos === 0).length,
  }), [groupedMembers]);

  const memberQuickStats = useMemo(() => ({
    total: membersState.length,
    active: membersState.filter(m => m.status === 'Ativo').length,
    inactive: membersState.filter(m => m.status !== 'Ativo').length,
  }), [membersState]);

  const filteredTeamMembers = useMemo(() =>
    membersState
      .filter(m => memberStatusFilter === 'all' ? true : m.status === memberStatusFilter)
      .filter(m => {
        if (!memberSearch.trim()) return true;
        const q = memberSearch.toLowerCase();
        return m.name.toLowerCase().includes(q) || String(m.nickname || '').toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    [membersState, memberSearch, memberStatusFilter]);

  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    return membersState.filter(m => m.dob).map(m => {
      const bd = new Date(m.dob!);
      const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      const daysUntil = Math.ceil((next.getTime() - today.getTime()) / 86400000);
      const age = (() => { let y = today.getFullYear() - bd.getFullYear(); const diff = today.getMonth() - bd.getMonth(); if (diff < 0 || (diff === 0 && today.getDate() < bd.getDate())) y--; return y + 1; })();
      return { member: m, date: next, daysUntil, age, isToday: daysUntil === 0 };
    }).filter(b => b.daysUntil >= 0 && b.daysUntil <= 30).sort((a, b) => a.daysUntil - b.daysUntil);
  }, [membersState]);

  const availableMembers = useMemo(() => membersState.filter(m => !m.familyName || m.familyName === ''), [membersState]);

  // ── actions ───────────────────────────────────────────────────────────────────

  const toggleMonthInForm = (mIdx: number) => {
    if (!selectedForPayment) return;
    const alreadyPaid = selectedForPayment.memberIds.some(id => localPayments.some(p => p.memberId === id && p.referenceMonth === `${mIdx}/${paymentForm.year}`));
    if (alreadyPaid) return;
    setPaymentForm(prev => ({ ...prev, months: prev.months.includes(mIdx) ? prev.months.filter(m => m !== mIdx) : [...prev.months, mIdx] }));
  };

  const handleSaveFamily = async () => {
    if (!editingFamily || !editingFamily.name || editingFamily.memberIds.length === 0) return;
    try {
      await Promise.all(editingFamily.memberIds.map((memberId, idx) => {
        const member = membersState.find(m => m.id === memberId);
        if (!member) return Promise.resolve();
        return api.updateMember(memberId, { ...member, familyName: editingFamily.name, relationshipType: editingFamily.relationships[memberId] || (idx === 0 ? 'Titular' : 'Outro'), paysMonthly: true });
      }));
      loadData();
      setShowFamilyModal(false);
      setEditingFamily(null);
    } catch (e) { console.error(e); }
  };

  const handleDeleteFamily = async (_familyName: string, memberIds: string[]) => {
    try {
      await Promise.all(memberIds.map(id => {
        const m = membersState.find(x => x.id === id);
        if (!m) return Promise.resolve();
        return api.updateMember(id, { ...m, familyName: '', relationshipType: 'Titular', paysMonthly: true });
      }));
      loadData();
    } catch (e) { console.error(e); }
  };

  const handleLaunchMultiPayment = () => {
    if (!selectedForPayment || paymentForm.months.length === 0) return;
    const pays: Payment[] = [];
    selectedForPayment.payingMembers.forEach(m => {
      paymentForm.months.forEach(mIdx => {
        pays.push({ id: '', memberId: m.id, teamId, amount: selectedForPayment.amountPerPerson, date: new Date().toISOString().split('T')[0], referenceMonth: `${mIdx}/${paymentForm.year}`, status: 'Pago', launchedBy: userId });
      });
    });
    Promise.all(pays.map(p => api.createPayment(p)))
      .then((created: Payment[]) => { setLocalPayments(prev => [...created, ...prev]); setTimeout(loadData, 500); setShowPayModal(false); setPaymentForm({ months: [], year: 2026, amountPerMonth: 50, observation: '' }); })
      .catch(console.error);
  };

  // ── guards ────────────────────────────────────────────────────────────────────

  if (!teamId || teamId === 't1') {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <p className="text-lg font-black text-zinc-800">Você não está vinculado a uma equipe base</p>
          <p className="text-sm text-zinc-500">Seu cadastro foi atualizado. Faça logout e login novamente.</p>
          <Button variant="danger" size="sm" onClick={() => { localStorage.removeItem('mfc.currentUser'); window.location.href = '/'; }}>
            Fazer Logout
          </Button>
        </div>
      </PageWrapper>
    );
  }

  if (!team) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <p className="text-lg font-black text-zinc-800">Equipe não encontrada</p>
          <Button variant="outline" size="sm" onClick={loadData}>Recarregar</Button>
        </div>
      </PageWrapper>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <PageWrapper>
      <div className="space-y-5">

        {/* Team header + tabs */}
        <ContentCard padding="lg">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-zinc-900 leading-none">{team.name}</h2>
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3 h-3 text-amber-500" /> {team.city} • {team.state}
                </p>
              </div>
            </div>

            {/* Tab nav */}
            <div className="flex gap-1 overflow-x-auto bg-zinc-50 p-1.5 rounded-xl border border-zinc-100">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-white text-amber-600 shadow-md border border-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </ContentCard>

        {/* ── ABA FAMÍLIAS ──────────────────────────────────────────────────── */}
        {activeTab === 'familias' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Famílias da Equipe</h3>
              {groupedMembers.length > 0 && (
                <Button variant="primary" size="sm" iconLeft={<Plus className="w-4 h-4" />}
                  onClick={() => { setEditingFamily({ name: '', memberIds: [], relationships: {} }); setShowFamilyModal(true); }}>
                  Nova Família
                </Button>
              )}
            </div>

            {/* Filter */}
            {groupedMembers.length > 0 && (
              <ContentCard padding="md">
                <FilterLine>
                  <FilterLineSection>
                    <FilterLineSearch value={familySearch} onChange={setFamilySearch} placeholder="Buscar família ou membro..." />
                  </FilterLineSection>
                  <FilterLineSection>
                    <FilterLineItem>
                      <FilterLineSegmented
                        value={familyStatusFilter}
                        onChange={setFamilyStatusFilter}
                        options={[
                          { value: 'all', label: 'Todas' },
                          { value: 'pendente', label: 'Pendentes' },
                          { value: 'em_dia', label: 'Em dia' },
                        ]}
                      />
                    </FilterLineItem>
                    {(familySearch || familyStatusFilter !== 'all') && (
                      <FilterLineItem>
                        <Button variant="ghost" size="sm" iconLeft={<RotateCcw className="w-3.5 h-3.5" />}
                          onClick={() => { setFamilySearch(''); setFamilyStatusFilter('all'); }}>
                          Limpar
                        </Button>
                      </FilterLineItem>
                    )}
                  </FilterLineSection>
                </FilterLine>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-zinc-400 uppercase">Total</p>
                    <p className="text-lg font-black text-zinc-900">{familyQuickStats.total}</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-red-400 uppercase">Pendentes</p>
                    <p className="text-lg font-black text-red-600">{familyQuickStats.pending}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-emerald-500 uppercase">Em dia</p>
                    <p className="text-lg font-black text-emerald-600">{familyQuickStats.upToDate}</p>
                  </div>
                </div>
              </ContentCard>
            )}

            {/* Birthdays */}
            {upcomingBirthdays.length > 0 && (
              <ContentCard padding="lg" className="border-pink-200 bg-gradient-to-br from-pink-50 to-violet-50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-violet-500 rounded-xl flex items-center justify-center">
                    <Cake className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-zinc-900">Próximos Aniversariantes</p>
                    <p className="text-[10px] text-zinc-500 font-bold">Nos próximos 30 dias</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {upcomingBirthdays.map(b => (
                    <div key={b.member.id} onClick={() => navigate(`/mfcistas/${b.member.id}`)}
                      className={`bg-white rounded-xl p-3 border-2 cursor-pointer hover:shadow-md transition-all ${b.isToday ? 'border-pink-400' : 'border-pink-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 text-white flex items-center justify-center font-black text-base shrink-0">
                          {b.member.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-zinc-900 truncate">{b.member.name}</p>
                          <p className="text-[10px] font-bold">
                            {b.isToday ? <span className="text-pink-600">Hoje! {b.age} anos</span>
                              : b.daysUntil === 1 ? <span className="text-violet-600">Amanhã — {b.age} anos</span>
                              : <span className="text-zinc-500">{b.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} — {b.age} anos</span>}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ContentCard>
            )}

            {/* Empty state */}
            {groupedMembers.length === 0 && (
              <EmptyState
                icon={Heart}
                title="Nenhuma Família Criada"
                description={availableMembers.length > 0
                  ? `Você tem ${availableMembers.length} membro(s) disponíveis para criar famílias.`
                  : 'Cadastre novos membros para criar famílias.'}
                action={availableMembers.length > 0 ? (
                  <Button variant="primary" size="sm" iconLeft={<Plus className="w-4 h-4" />}
                    onClick={() => { setEditingFamily({ name: '', memberIds: [], relationships: {} }); setShowFamilyModal(true); }}>
                    Criar Primeira Família
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" iconLeft={<Users className="w-4 h-4" />} onClick={() => navigate('/mfcistas')}>
                    Cadastrar Membros
                  </Button>
                )}
              />
            )}

            {groupedMembers.length > 0 && filteredGroupedMembers.length === 0 && (
              <ContentCard padding="lg" className="text-center">
                <p className="text-sm font-black text-zinc-500">Nenhuma família encontrada para os filtros atuais.</p>
              </ContentCard>
            )}

            {/* Family cards */}
            {filteredGroupedMembers.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredGroupedMembers.map((group, idx) => {
                  const progressPercent = Math.round((group.monthsStatus.filter((s: boolean) => s).length / viewMonth) * 100);
                  const isLate = group.atrasos > 0;
                  const isExpanded = expandedFamily === group.familyName || expandedFamily === `group_${idx}`;
                  const familyKey = group.familyName || `group_${idx}`;

                  return (
                    <ContentCard key={idx} padding="lg" className={`${isLate ? 'border-red-200' : 'border-emerald-200'}`}>
                      {/* Header clicável */}
                      <div onClick={() => setExpandedFamily(isExpanded ? null : familyKey)} className="cursor-pointer">
                        <div className="flex items-start justify-between mb-4 gap-2">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isLate ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                              {group.type === 'couple' ? <Heart className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-black text-zinc-900 leading-none mb-1 truncate">{group.displayName}</h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                {group.familyName && !group.familyName.startsWith('sem_familia_') && (
                                  <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                                    Família {group.familyName}
                                  </span>
                                )}
                                <span className="text-[9px] font-bold text-zinc-400 uppercase">
                                  {group.members.length} {group.members.length === 1 ? 'membro' : 'membros'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Progresso {viewYear}</p>
                            <p className={`text-2xl font-black ${progressPercent === 100 ? 'text-emerald-600' : progressPercent >= 75 ? 'text-blue-600' : progressPercent >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                              {progressPercent}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Membros resumidos */}
                      {!isExpanded && (
                        <div className="bg-zinc-50 rounded-xl p-3 mb-4 space-y-2">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Membros</p>
                          {group.members.map((m: Member) => (
                            <div key={m.id} className="flex items-center justify-between bg-white rounded-lg p-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs shrink-0">
                                  {m.name[0]}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-zinc-900">{m.nickname || m.name.split(' ')[0]}</p>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase">{m.relationshipType || 'Titular'}</p>
                                </div>
                              </div>
                              <span className={`text-[9px] font-black px-2.5 py-1 rounded-full ${m.paysMonthly === false ? 'bg-zinc-100 text-zinc-500' : 'bg-blue-100 text-blue-700'}`}>
                                {m.paysMonthly === false ? 'Isento' : `R$ ${group.amountPerPerson.toFixed(2)}/mês`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Conteúdo expandido */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-zinc-100">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-black text-zinc-600 uppercase tracking-widest">Informações Detalhadas</p>
                            <div className="flex gap-1.5">
                              <Button variant="ghost" size="xs"
                                onClick={e => { e.stopPropagation(); const rel: any = {}; group.members.forEach((m: Member) => { rel[m.id] = m.relationshipType || 'Outro'; }); setEditingFamily({ name: group.familyName || '', memberIds: group.members.map((m: Member) => m.id), relationships: rel }); setShowFamilyModal(true); }}>
                                <Edit className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Editar</span>
                              </Button>
                              <Button variant="ghost" size="xs"
                                onClick={e => { e.stopPropagation(); handleDeleteFamily(group.familyName, group.members.map((m: Member) => m.id)); }}>
                                <X className="w-3.5 h-3.5 text-red-400" /> <span className="hidden xs:inline text-red-400">Excluir</span>
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-3 mb-4">
                            {group.members.map((m: Member) => {
                              const age = (() => { if (!m.dob) return null; const bd = new Date(m.dob); const t = new Date(); let y = t.getFullYear() - bd.getFullYear(); const diff = t.getMonth() - bd.getMonth(); if (diff < 0 || (diff === 0 && t.getDate() < bd.getDate())) y--; return y; })();
                              return (
                                <div key={m.id} onClick={e => { e.stopPropagation(); navigate(`/mfcistas/${m.id}`); }}
                                  className="bg-zinc-50 rounded-xl p-3 border border-zinc-100 cursor-pointer hover:border-violet-200 transition-all">
                                  <div className="flex items-start gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-xl shrink-0">
                                      {m.name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-black text-zinc-900 truncate">{m.name}</p>
                                      <span className="text-[10px] font-black px-2 py-0.5 bg-violet-100 text-violet-700 rounded-md">
                                        {m.relationshipType || 'Titular'}
                                      </span>
                                      <div className="grid grid-cols-2 gap-1 mt-2 text-[10px]">
                                        {age !== null && <span className="flex items-center gap-1 text-zinc-600"><Cake className="w-3 h-3 text-pink-400" />{age} anos</span>}
                                        {m.profession && <span className="flex items-center gap-1 text-zinc-600"><Briefcase className="w-3 h-3 text-blue-400" />{m.profession}</span>}
                                        <span className={`col-span-2 font-bold px-2 py-1 rounded-md ${m.paysMonthly === false ? 'bg-zinc-100 text-zinc-500' : 'bg-emerald-50 text-emerald-700'}`}>
                                          {m.paysMonthly === false ? 'Isento' : `R$ ${group.amountPerPerson.toFixed(2)}/mês`}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Monthly progress bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Pagamentos por Mês</p>
                          <p className="text-[9px] font-black text-zinc-600">{group.monthsStatus.slice(0, viewMonth).filter((s: boolean) => s).length}/{viewMonth} meses</p>
                        </div>
                        <div className="grid grid-cols-12 gap-0.5">
                          {group.monthsStatus.map((isPaid: boolean, mIdx: number) => {
                            const isFuture = mIdx + 1 > viewMonth;
                            let bg = 'bg-zinc-100';
                            if (isPaid) bg = 'bg-emerald-400';
                            else if (!isFuture) bg = 'bg-red-400';
                            return <div key={mIdx} className={`h-7 rounded-md ${bg} transition-all`} title={shortMonths[mIdx]} />;
                          })}
                        </div>
                      </div>

                      {/* Footer stats + action */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100">
                        <div className="flex gap-4">
                          <div>
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Valor Mensal</p>
                            <p className="text-base font-black text-amber-600">R$ {(group.amountPerPerson * group.payingMembers.length).toFixed(2)}</p>
                          </div>
                          {isLate && (
                            <div>
                              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Pendências</p>
                              <p className="text-base font-black text-red-600">{group.atrasos} {group.atrasos === 1 ? 'mês' : 'meses'}</p>
                            </div>
                          )}
                        </div>
                        <Button variant="primary" size="sm" iconLeft={<Plus className="w-3.5 h-3.5" />}
                          onClick={e => {
                            e.stopPropagation();
                            setPaymentForm({ ...paymentForm, year: viewYear, months: [viewMonth], amountPerMonth: group.amountPerPerson, observation: '' });
                            setSelectedForPayment({ memberIds: group.members.map((m: Member) => m.id), displayName: group.displayName, amountPerPerson: group.amountPerPerson, payingMembers: group.payingMembers });
                            setShowPayModal(true);
                          }}>
                          Lançar
                        </Button>
                      </div>
                    </ContentCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ABA MEMBROS ─────────────────────────────────────────────────────── */}
        {activeTab === 'membros' && (
          <div className="space-y-4">
            <ContentCard padding="md">
              <FilterLine>
                <FilterLineSection>
                  <FilterLineSearch value={memberSearch} onChange={setMemberSearch} placeholder="Buscar membro por nome ou apelido..." />
                </FilterLineSection>
                <FilterLineSection>
                  <FilterLineItem>
                    <FilterLineSegmented
                      value={memberStatusFilter}
                      onChange={setMemberStatusFilter}
                      options={[
                        { value: 'all', label: 'Todos' },
                        { value: 'Ativo', label: 'Ativos' },
                        { value: 'Inativo', label: 'Inativos' },
                      ]}
                    />
                  </FilterLineItem>
                  {(memberSearch || memberStatusFilter !== 'all') && (
                    <FilterLineItem>
                      <Button variant="ghost" size="sm" iconLeft={<RotateCcw className="w-3.5 h-3.5" />}
                        onClick={() => { setMemberSearch(''); setMemberStatusFilter('all'); }}>
                        Limpar
                      </Button>
                    </FilterLineItem>
                  )}
                </FilterLineSection>
              </FilterLine>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] font-black text-zinc-400 uppercase">Total</p>
                  <p className="text-base font-black text-zinc-900">{memberQuickStats.total}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] font-black text-emerald-500 uppercase">Ativos</p>
                  <p className="text-base font-black text-emerald-700">{memberQuickStats.active}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-center">
                  <p className="text-[9px] font-black text-amber-500 uppercase">Inativos</p>
                  <p className="text-base font-black text-amber-700">{memberQuickStats.inactive}</p>
                </div>
              </div>
              <p className="mt-3 text-[11px] font-bold text-zinc-400">Exibindo {filteredTeamMembers.length} de {membersState.length} membros.</p>
            </ContentCard>

            {filteredTeamMembers.length === 0 ? (
              <EmptyState icon={Users} title="Nenhum membro encontrado" description="Tente ajustar os filtros." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeamMembers.map(m => (
                  <ContentCard key={m.id} padding="lg" className="cursor-pointer group hover:shadow-lg transition-all" onClick={() => navigate(`/mfcistas/${m.id}`)}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xl group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0">
                        {m.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-zinc-900 text-sm truncate">{m.name}</p>
                        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest truncate">{m.nickname || 'Membro'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                      <span className="text-[9px] font-black text-zinc-300 uppercase italic truncate">{m.movementRoles[0] || 'Ativo'}</span>
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase shrink-0 ${m.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {m.status}
                      </span>
                    </div>
                  </ContentCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA MENSALIDADES ─────────────────────────────────────────────────── */}
        {activeTab === 'mensalidades' && (
          <div className="space-y-5">
            {userRole === UserRoleType.ADMIN && (
              <ContentCard padding="md" className="border-blue-200 bg-blue-50">
                <div className="flex items-start gap-3">
                  <SettingsIcon className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-black text-blue-900">Valor Padrão da Mensalidade</p>
                    <p className="text-xs text-blue-700 mt-1">
                      O valor atual é <span className="font-black">R$ {defaultMonthlyAmount.toFixed(2)}</span> por mês.
                      Altere nas Configurações → Financeiro.
                    </p>
                  </div>
                </div>
              </ContentCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Filter card */}
              <ContentCard padding="lg">
                <p className="text-sm font-black text-zinc-800 mb-4">Filtro de Visão</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Select
                    label="Ano"
                    value={String(viewYear)}
                    onChange={e => setViewYear(parseInt(e.target.value))}
                    options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))}
                  />
                  <Select
                    label="Mês"
                    value={String(viewMonth)}
                    onChange={e => setViewMonth(parseInt(e.target.value))}
                    options={monthNames.map((n, i) => ({ value: String(i + 1), label: n }))}
                  />
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                  <BarChart3 className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="text-right">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Esperado no mês</p>
                    <p className="text-lg font-black text-blue-700">
                      R$ {(() => {
                        const paying = membersState.filter(m => m.paysMonthly !== false);
                        let total = 0;
                        paying.forEach(m => {
                          const isCouple = paying.some(o => o.id !== m.id && o.familyName === m.familyName && o.familyName && ((m.relationshipType === 'Titular' && o.relationshipType === 'Cônjuge') || (m.relationshipType === 'Cônjuge' && o.relationshipType === 'Titular')));
                          total += isCouple ? defaultMonthlyAmount / 2 : defaultMonthlyAmount;
                        });
                        return total.toFixed(2);
                      })()}
                    </p>
                  </div>
                </div>
              </ContentCard>

              {/* Arrecadado */}
              <ContentCard padding="lg" className="bg-emerald-600 border-emerald-600">
                <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1">
                  Arrecadado em {monthNames[viewMonth - 1]}
                </p>
                <p className="text-4xl font-black text-white tracking-tight">R$ {financeStats.monthlyTotal.toFixed(2)}</p>
                <Divider className="border-emerald-500/30 my-4" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-200 uppercase">Total {viewYear}:</span>
                  <span className="text-lg font-black text-white">R$ {financeStats.yearlyTotal.toFixed(2)}</span>
                </div>
              </ContentCard>

              {/* Pendências */}
              <ContentCard padding="lg" className="border-red-100">
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Pendências Acumuladas</p>
                <p className="text-4xl font-black text-red-600 tracking-tight">R$ {financeStats.pendingAmount.toFixed(2)}</p>
                <p className="text-[9px] font-bold text-zinc-400 italic mt-4">Valor pendente de entrada no caixa este ano.</p>
              </ContentCard>
            </div>

            {/* Fluxo de caixa */}
            <ContentCard padding="none">
              <div className="p-5 border-b border-zinc-100 bg-zinc-50/30 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-black text-zinc-900">Fluxo de Caixa da Equipe</p>
                  <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-0.5">
                    <span className="text-emerald-500">● Pago</span> | <span className="text-red-500">● Atraso</span> | <span className="text-zinc-300">○ Futuro</span>
                  </p>
                </div>
                <span className="px-3 py-1.5 bg-white border border-zinc-100 rounded-xl text-[9px] font-black text-zinc-500 uppercase">
                  {groupedMembers.length} Unidades Familiares
                </span>
              </div>

              <div className="divide-y divide-zinc-50">
                {groupedMembers.map((group, idx) => (
                  <div key={idx} className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-zinc-50/50 transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${group.atrasos === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {group.type === 'couple' ? <Heart className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="text-sm font-black text-zinc-900 truncate">{group.displayName}</p>
                        <div className="flex gap-1 flex-wrap">
                          {group.members.map((m: Member) => (
                            <span key={m.id} className={`text-[8px] font-bold px-2 py-0.5 rounded-lg ${m.paysMonthly === false ? 'bg-zinc-100 text-zinc-500' : 'bg-blue-100 text-blue-700'}`}>
                              {m.nickname || m.name.split(' ')[0]}{m.paysMonthly === false && ' - Isento'}
                            </span>
                          ))}
                        </div>
                        <p className="text-[9px] font-black text-zinc-400 uppercase">
                          {group.atrasos === 0 ? '✅ Em dia' : `⚠️ ${group.atrasos} meses pendentes`} •{' '}
                          <span className="text-amber-600">R$ {group.amountPerPerson.toFixed(2)}/mês</span>
                        </p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 overflow-x-auto">
                      <div className="flex items-center gap-1.5 min-w-[380px]">
                        {group.monthsStatus.map((isPaid: boolean, mIdx: number) => {
                          const isFuture = mIdx + 1 > viewMonth;
                          let bg = 'bg-zinc-100', text = 'text-zinc-400';
                          if (isPaid) { bg = 'bg-emerald-500'; text = 'text-white'; }
                          else if (!isFuture) { bg = 'bg-red-500'; text = 'text-white'; }
                          return (
                            <div key={mIdx} className="flex flex-col items-center gap-1 flex-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-black uppercase ${bg} ${text}`}>
                                {shortMonths[mIdx]}
                              </div>
                              <div className={`w-1 h-1 rounded-full ${isPaid ? 'bg-emerald-400' : isFuture ? 'bg-zinc-200' : 'bg-red-400 animate-pulse'}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Button variant="primary" size="sm" iconLeft={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setPaymentForm({ ...paymentForm, year: viewYear, months: [viewMonth], amountPerMonth: group.amountPerPerson, observation: '' });
                        setSelectedForPayment({ memberIds: group.members.map((m: Member) => m.id), displayName: group.displayName, amountPerPerson: group.amountPerPerson, payingMembers: group.payingMembers });
                        setShowPayModal(true);
                      }}>
                      Lançar
                    </Button>
                  </div>
                ))}
              </div>
            </ContentCard>
          </div>
        )}

        {/* ── ABA EVENTOS ──────────────────────────────────────────────────────── */}
        {activeTab === 'eventos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map(event => {
              const teamQuota = event.teamQuotas.find(q => q.teamId === teamId);
              const teamSales = localSales.filter(s => s.eventId === event.id).reduce((acc, s) => acc + s.amount, 0);
              const progress = teamQuota ? (teamSales / teamQuota.quotaValue) * 100 : 0;
              return (
                <ContentCard key={event.id} padding="lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-zinc-900 truncate">{event.name}</p>
                      <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Meta da nossa equipe</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                      <p className="text-[9px] font-black text-zinc-400 uppercase mb-1">Cota Equipe</p>
                      <p className="text-base font-black text-zinc-900">R$ {teamQuota?.quotaValue.toFixed(2) || '0.00'}</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-[9px] font-black text-amber-400 uppercase mb-1">Já Vendido</p>
                      <p className="text-base font-black text-amber-700">R$ {teamSales.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-zinc-400">Progresso da Meta</span>
                      <span className="text-amber-600">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-4 border-t border-zinc-100 mt-4">
                    <Users className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-[9px] font-black text-zinc-400 uppercase">{localSales.filter(s => s.eventId === event.id).length} Vendas Realizadas</span>
                  </div>
                </ContentCard>
              );
            })}
          </div>
        )}

        {/* ── ABA HISTÓRICO ────────────────────────────────────────────────────── */}
        {activeTab === 'historico' && (
          <ContentCard padding="none">
            <div className="p-5 border-b border-zinc-100 bg-zinc-50/20">
              <p className="text-sm font-black text-zinc-900">Extrato Detalhado</p>
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-0.5">Últimos 20 lançamentos da equipe</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50/50">
                    <th className="px-5 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">MFCista / Família</th>
                    <th className="px-5 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Referência</th>
                    <th className="px-5 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data Lanç.</th>
                    <th className="px-5 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor</th>
                    <th className="px-5 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {localPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20).map(p => {
                    const member = membersState.find(m => m.id === p.memberId);
                    return (
                      <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-[10px] font-black">{member?.name[0]}</div>
                            <div>
                              <span className="text-sm font-bold text-zinc-800 block">{member?.name}</span>
                              {p.familyName && <span className="text-[9px] font-black text-violet-600 uppercase">Família {p.familyName}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm font-black text-zinc-500">{p.referenceMonth}</td>
                        <td className="px-5 py-3.5 text-sm text-zinc-400">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-5 py-3.5 text-sm font-black text-zinc-900">R$ {p.amount.toFixed(2)}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-lg">Confirmado</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ContentCard>
        )}

      </div>

      {/* ── Modal Pagamento ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={showPayModal && !!selectedForPayment}
        onClose={() => setShowPayModal(false)}
        title="Confirmar Recebimento"
        size="md"
        footer={
          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setShowPayModal(false)}>Cancelar</Button>
            <Button variant="success" size="sm" disabled={paymentForm.months.length === 0} iconLeft={<Save className="w-4 h-4" />} onClick={handleLaunchMultiPayment}>
              Confirmar ({paymentForm.months.length} {paymentForm.months.length === 1 ? 'Mês' : 'Meses'})
            </Button>
          </ModalFooter>
        }
      >
        {selectedForPayment && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-violet-50 p-4 rounded-xl border border-blue-100 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Unidade Familiar</p>
                  <p className="text-base font-black text-zinc-800">{selectedForPayment.displayName}</p>
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {selectedForPayment.payingMembers.map((m: Member) => (
                      <span key={m.id} className="text-[8px] font-bold px-2 py-1 rounded-lg bg-blue-500 text-white">
                        {m.nickname || m.name.split(' ')[0]}{m.relationshipType && ` (${m.relationshipType})`}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-zinc-400 uppercase mb-1">Por Pessoa</p>
                  <p className="text-lg font-black text-blue-600">R$ {selectedForPayment.amountPerPerson.toFixed(2)}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <p className="text-[9px] font-black text-zinc-400 uppercase mb-1">Total a Lançar</p>
                <p className="text-2xl font-black text-emerald-600">
                  R$ {(paymentForm.months.length * selectedForPayment.amountPerPerson * selectedForPayment.payingMembers.length).toFixed(2)}
                </p>
                <p className="text-[9px] font-semibold text-zinc-400 mt-1">
                  {paymentForm.months.length} {paymentForm.months.length === 1 ? 'mês' : 'meses'} × {selectedForPayment.payingMembers.length} {selectedForPayment.payingMembers.length === 1 ? 'pessoa' : 'pessoas'}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Selecione os Meses</p>
                <Select
                  value={String(paymentForm.year)}
                  onChange={e => setPaymentForm({ ...paymentForm, year: parseInt(e.target.value) })}
                  options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))}
                />
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {monthNames.map((_m, i) => {
                  const mIdx = i + 1;
                  const isSelected = paymentForm.months.includes(mIdx);
                  const isPaid = selectedForPayment.memberIds.some(id => localPayments.some(p => p.memberId === id && p.referenceMonth === `${mIdx}/${paymentForm.year}`));
                  return (
                    <button key={mIdx} disabled={isPaid} onClick={() => toggleMonthInForm(mIdx)}
                      className={`relative p-2.5 rounded-lg border transition-all flex flex-col items-center gap-0.5 text-[8px] font-black uppercase ${
                        isPaid ? 'bg-emerald-50 border-emerald-100 cursor-not-allowed' :
                        isSelected ? 'bg-amber-500 border-amber-500 text-white shadow-md' :
                        'bg-zinc-50 border-zinc-100 text-zinc-500 hover:bg-white hover:border-amber-200'
                      }`}>
                      {shortMonths[i]}
                      {isPaid ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : isSelected ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border-2 border-zinc-200" />}
                      {isPaid && <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[6px] font-black px-1 py-0.5 rounded-full">PAGO</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Observações (Opcional)</label>
              <textarea rows={2} placeholder="PIX ou dinheiro..."
                className="ds-input w-full resize-none text-xs"
                value={paymentForm.observation}
                onChange={e => setPaymentForm({ ...paymentForm, observation: e.target.value })}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Família ────────────────────────────────────────────────────── */}
      <Modal
        isOpen={showFamilyModal}
        onClose={() => { setShowFamilyModal(false); setEditingFamily(null); }}
        title="Criar Nova Família"
        size="xl"
        footer={
          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => { setShowFamilyModal(false); setEditingFamily(null); }}>Cancelar</Button>
            <Button variant="primary" size="sm" disabled={!editingFamily?.name || (editingFamily?.memberIds.length || 0) === 0} iconLeft={<Save className="w-4 h-4" />} onClick={handleSaveFamily}>
              Criar Família
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-5">
          <Input
            label="Nome da Família *"
            placeholder="Ex: Silva, Santos, Oliveira..."
            value={editingFamily?.name || ''}
            onChange={e => setEditingFamily(prev => prev ? { ...prev, name: e.target.value } : { name: e.target.value, memberIds: [], relationships: {} })}
          />

          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">
              Membros da Família * ({editingFamily?.memberIds.length || 0} selecionados)
            </p>

            {availableMembers.length === 0 ? (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 text-center">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-amber-800">Todos os membros já estão em famílias</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                  {availableMembers.map(m => {
                    const isSelected = editingFamily?.memberIds.includes(m.id);
                    return (
                      <div key={m.id} onClick={() => setEditingFamily(prev => {
                        if (!prev) return { name: '', memberIds: [m.id], relationships: { [m.id]: 'Titular' } };
                        const newIds = isSelected ? prev.memberIds.filter(id => id !== m.id) : [...prev.memberIds, m.id];
                        const newRel = { ...prev.relationships };
                        if (isSelected) { delete newRel[m.id]; } else { newRel[m.id] = newIds.length === 1 ? 'Titular' : 'Outro'; }
                        return { ...prev, memberIds: newIds, relationships: newRel };
                      })}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${isSelected ? 'bg-violet-50 border-violet-400 shadow-md' : 'bg-white border-zinc-200 hover:border-violet-200'}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base transition-all ${isSelected ? 'bg-violet-500 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                          {isSelected ? <Check className="w-5 h-5" /> : m.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{m.name}</p>
                          <p className="text-[10px] text-zinc-400">{m.maritalStatus} • {m.gender}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(editingFamily?.memberIds.length || 0) > 0 && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-black text-blue-900 mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Definir Vínculos Familiares</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {editingFamily!.memberIds.map(memberId => {
                        const m = membersState.find(x => x.id === memberId);
                        if (!m) return null;
                        return (
                          <div key={memberId} className="bg-white rounded-xl p-3 border border-blue-100">
                            <p className="text-xs font-bold text-zinc-600 mb-2">{m.name.split(' ')[0]}</p>
                            <Select
                              value={editingFamily!.relationships[memberId] || 'Outro'}
                              onChange={e => setEditingFamily(prev => prev ? { ...prev, relationships: { ...prev.relationships, [memberId]: e.target.value } } : prev)}
                              options={['Titular','Cônjuge','Filho(a)','Irmão/Irmã','Neto(a)','Amigo(a)','Primo(a)','Tio/Tia','Sobrinho(a)','Avô/Avó','Sogro(a)','Outro'].map(v => ({ value: v, label: v }))}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-800 font-semibold">
              <strong>Dica:</strong> Selecione os membros e defina o vínculo de cada um (Titular, Cônjuge, Filho(a), etc).
            </p>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
};

export default MyTeamView;
