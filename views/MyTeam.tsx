
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
  ChevronRight,
  Filter,
  Search,
  Calendar,
  CreditCard,
  UserPlus,
  ArrowRight,
  TrendingUp,
  Info,
  BadgeDollarSign,
  Phone,
  Home,
  UserCheck,
  Trash2,
  Baby,
  Eye,
  ExternalLink,
  PhoneCall,
  LayoutGrid,
  Zap,
  Clock
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
  IconButton,
  Modal,
  ModalFooter,
  EmptyState,
  Divider,
  Badge,
  ConfirmModal,
  StatGrid,
  StatCard,
  Combobox
} from '../components/ui';
import { cn } from '../src/lib/utils';
import toast from 'react-hot-toast';

interface MyTeamViewProps {
  teamId: string;
  userId: string;
  userRole: UserRoleType;
}

const TABS = [
  { id: 'familias',    label: 'Famílias',      icon: Heart },
  { id: 'membros',     label: 'Membros',        icon: Users },
  { id: 'mensalidades',label: 'Mensalidades',   icon: BadgeDollarSign },
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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<any>(null);
  
  const [editingFamily, setEditingFamily] = useState<{ name: string; memberIds: string[]; relationships: { [id: string]: string } } | null>(null);
  const [defaultMonthlyAmount, setDefaultMonthlyAmount] = useState(50.00);

  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);

  const [selectedForPayment, setSelectedForPayment] = useState<{
    memberIds: string[]; displayName: string; amountPerPerson: number; payingMembers: Member[];
  } | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    months: [] as number[], year: 2026, amountPerMonth: 50.00, observation: '', method: 'pix'
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
    const iv = setInterval(loadData, 60000);
    return () => { window.removeEventListener('focus', loadData); clearInterval(iv); };
  }, [teamId]);

  useEffect(() => {
    api.getFinancialConfig()
      .then((config: any) => { if (config?.monthlyPaymentAmount) { const v = parseFloat(config.monthlyPaymentAmount); setDefaultMonthlyAmount(isNaN(v) ? 50 : v); } })
      .catch(() => {});
  }, []);

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
      groups.push({ 
        type: isCouple ? 'couple' : 'single', 
        members: sortedMembers, 
        payingMembers: paying, 
        displayName, 
        monthsStatus, 
        atrasos, 
        amountPerPerson: amtPerPerson, 
        familyName,
        titular,
        spouse,
        children: sortedMembers.filter(m => m.relationshipType?.includes('Filho'))
      });
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

  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    return membersState.filter(m => m.dob).map(m => {
      const bd = new Date(m.dob!);
      const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      const daysUntil = Math.ceil((next.getTime() - today.getTime()) / 86400000);
      const age = bd.getFullYear() ? (today.getFullYear() - bd.getFullYear()) : 0;
      return { member: m, date: next, daysUntil, age, isToday: daysUntil === 0 };
    }).filter(b => b.daysUntil >= 0 && b.daysUntil <= 30).sort((a, b) => a.daysUntil - b.daysUntil);
  }, [membersState]);

  const availableMembers = useMemo(() => membersState.filter(m => !m.familyName || m.familyName === ''), [membersState]);

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

  const toggleMonthInForm = (mIdx: number) => {
    if (!selectedForPayment) return;
    const alreadyPaid = selectedForPayment.memberIds.some(id => localPayments.some(p => p.memberId === id && p.referenceMonth === `${mIdx}/${paymentForm.year}`));
    if (alreadyPaid) return;
    setPaymentForm(prev => ({ ...prev, months: prev.months.includes(mIdx) ? prev.months.filter(m => m !== mIdx) : [...prev.months, mIdx] }));
  };

  const handleSaveFamily = async () => {
    if (!editingFamily || !editingFamily.name || editingFamily.memberIds.length === 0) return;
    toast.promise(
      Promise.all(editingFamily.memberIds.map((memberId, idx) => {
        const member = membersState.find(m => m.id === memberId);
        if (!member) return Promise.resolve();
        return api.updateMember(memberId, { ...member, familyName: editingFamily.name, relationshipType: editingFamily.relationships[memberId] || (idx === 0 ? 'Titular' : 'Outro'), paysMonthly: true });
      })).then(() => {
        loadData();
        setShowFamilyModal(false);
        setEditingFamily(null);
      }),
      {
        loading: 'Salvando família...',
        success: 'Família atualizada com sucesso! ❤️',
        error: 'Erro ao salvar família.'
      }
    );
  };

  const handleLaunchMultiPayment = () => {
    if (!selectedForPayment || paymentForm.months.length === 0) return;
    const pays: Payment[] = [];
    selectedForPayment.payingMembers.forEach(m => {
      paymentForm.months.forEach(mIdx => {
        pays.push({ 
          id: '', 
          memberId: m.id, 
          teamId, 
          amount: selectedForPayment.amountPerPerson, 
          date: new Date().toISOString().split('T')[0], 
          referenceMonth: `${mIdx}/${paymentForm.year}`, 
          status: 'Pago', 
          launchedBy: userId,
          observation: paymentForm.observation,
          method: paymentForm.method
        });
      });
    });
    
    toast.promise(
      Promise.all(pays.map(p => api.createPayment(p)))
        .then((created: Payment[]) => { 
          setLocalPayments(prev => [...created, ...prev]); 
          setTimeout(loadData, 500); 
          setShowPayModal(false); 
          setPaymentForm({ months: [], year: 2026, amountPerMonth: 50, observation: '', method: 'pix' }); 
        }),
      {
        loading: 'Lançando pagamentos...',
        success: 'Recebimento confirmado com sucesso! 💰',
        error: 'Erro ao lançar pagamentos.'
      }
    );
  };

  const getMemberAge = (dob?: string) => {
    if (!dob) return null;
    const bd = new Date(dob);
    const today = new Date();
    let y = today.getFullYear() - bd.getFullYear();
    const diff = today.getMonth() - bd.getMonth();
    if (diff < 0 || (diff === 0 && today.getDate() < bd.getDate())) y--;
    return y;
  };

  return (
    <PageWrapper>
      {/* Team Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-5 sm:p-6 rounded-none sm:rounded-[2rem] border-y sm:border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl" />
          
          <div className="flex items-center gap-5 relative">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">{team?.name}</h1>
                <Badge color="info" size="sm">Equipe Base</Badge>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-blue-500" /> {team?.city} • {team?.state}
                </p>
                <div className="w-1 h-1 bg-slate-200 rounded-full" />
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Heart className="w-3 h-3 text-rose-500" /> {groupedMembers.length} Famílias
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 relative">
             <div className="hidden xl:block w-64">
                <Combobox 
                  placeholder="Busca rápida..."
                  options={groupedMembers.map(g => ({
                    value: g.familyName,
                    label: g.displayName,
                    subtitle: `Família ${g.familyName}`,
                    badge: g.atrasos > 0 ? `${g.atrasos}m` : 'OK',
                    badgeColor: g.atrasos > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }))}
                  onChange={(val) => {
                    const family = groupedMembers.find(g => g.familyName === val);
                    if (family) { setSelectedFamily(family); setShowDetailModal(true); }
                  }}
                />
             </div>
            <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/60">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    activeTab === tab.id 
                      ? "bg-white text-blue-600 shadow-sm border border-slate-100" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        {/* ── TAB FAMÍLIAS ──────────────────────────────────────────────────── */}
        {activeTab === 'familias' && (
          <div className="space-y-4">
            <FilterLine>
               <FilterLineSection grow>
                  <FilterLineItem grow>
                     <FilterLineSearch 
                        value={familySearch}
                        onChange={setFamilySearch}
                        placeholder="Pesquisar famílias ou membros..."
                     />
                  </FilterLineItem>
                  <FilterLineItem minWidth={280}>
                     <FilterLineSegmented 
                        value={familyStatusFilter}
                        onChange={(val) => setFamilyStatusFilter(val as string)}
                        options={[
                           { value: 'all', label: 'Todas', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                           { value: 'pendente', label: 'Pendentes', icon: <Clock className="w-3.5 h-3.5" /> },
                           { value: 'em_dia', label: 'Em Dia', icon: <CheckCircle2 className="w-3.5 h-3.5" /> }
                        ]}
                     />
                  </FilterLineItem>
               </FilterLineSection>
               <FilterLineSection align="right" grow>
                  <Button 
                    fullWidth
                    size="sm"
                    onClick={() => { setEditingFamily({ name: '', memberIds: [], relationships: {} }); setShowFamilyModal(true); }}
                    iconLeft={<Plus className="w-4 h-4" />}
                  >
                    Nova Família
                  </Button>
               </FilterLineSection>
            </FilterLine>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
              {filteredGroupedMembers.map((group, idx) => {
                const progressPercent = Math.round((group.monthsStatus.filter((s: boolean) => s).length / viewMonth) * 100);
                const isLate = group.atrasos > 0;
                
                return (
                  <ContentCard key={idx} padding="none" className={cn(
                    "group transition-all hover:shadow-xl overflow-hidden flex flex-col h-full border-slate-100",
                    isLate && "border-rose-100 shadow-rose-100/10"
                  )}>
                    <div className={cn(
                      "p-5 flex flex-col gap-4 flex-1",
                      isLate ? "bg-rose-50/10" : "bg-white"
                    )}>
                      <div className="flex items-start justify-between">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-inner border",
                          isLate ? "bg-rose-100 text-rose-600 border-rose-200" : "bg-slate-50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500"
                        )}>
                          {group.type === 'couple' ? <Heart className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                           <Badge color={isLate ? 'danger' : 'success'} dot size="sm">
                            {isLate ? `${group.atrasos} meses` : 'Em Dia'}
                          </Badge>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{progressPercent}% Adimplência</p>
                        </div>
                      </div>
                      
                      <div className="cursor-pointer" onClick={() => { setSelectedFamily(group); setShowDetailModal(true); }}>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors leading-tight">{group.displayName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {group.members.length} {group.members.length === 1 ? 'Membro' : 'Membros'} 
                           </span>
                           <div className="w-1 h-1 bg-slate-200 rounded-full" />
                           <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">
                             R$ {(group.amountPerPerson * group.payingMembers.length).toFixed(2)}/mês
                           </span>
                        </div>
                      </div>

                      <div className="flex -space-x-1.5 overflow-hidden">
                        {group.members.map((m: Member) => (
                          <div key={m.id} className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 text-slate-400 flex items-center justify-center font-black text-[9px] uppercase shadow-sm" title={m.name}>
                            {m.name[0]}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-12 gap-0.5 mt-auto">
                        {group.monthsStatus.map((isPaid: boolean, mIdx: number) => {
                          const isFuture = mIdx + 1 > viewMonth;
                          return (
                            <div 
                              key={mIdx} 
                              className={cn(
                                "h-2.5 rounded-[3px] border transition-all",
                                isPaid ? "bg-emerald-500 border-emerald-500" : isFuture ? "bg-slate-100 border-slate-100" : "bg-rose-500 border-rose-500 shadow-inner"
                              )} 
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center gap-2">
                      <Button 
                        variant="primary" 
                        size="xs" 
                        className="flex-1 text-[9px] h-8"
                        iconLeft={<CreditCard className="w-3 h-3" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPaymentForm({ ...paymentForm, year: viewYear, months: [viewMonth], amountPerMonth: group.amountPerPerson, observation: '', method: 'pix' });
                          setSelectedForPayment({ memberIds: group.members.map((m: Member) => m.id), displayName: group.displayName, amountPerPerson: group.amountPerPerson, payingMembers: group.payingMembers });
                          setShowPayModal(true);
                        }}
                      >
                        Lançar Recebimento
                      </Button>
                      <IconButton 
                        variant="ghost" 
                        size="xs"
                        className="w-8 h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFamily(group);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </IconButton>
                    </div>
                  </ContentCard>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB MENSALIDADES ─────────────────────────────────────────────────── */}
        {activeTab === 'mensalidades' && (
          <div className="space-y-6">
            <StatGrid cols={3}>
              <StatCard title={`Arrecadado (${monthNames[viewMonth-1]})`} value={`R$ ${financeStats.monthlyTotal.toFixed(2)}`} icon={TrendingUp} color="success" />
              <StatCard title="Pendências Acumuladas" value={`R$ ${financeStats.pendingAmount.toFixed(2)}`} icon={AlertCircle} color="danger" />
              <StatCard title={`Total Acumulado ${viewYear}`} value={`R$ ${financeStats.yearlyTotal.toFixed(2)}`} icon={BarChart3} color="info" />
            </StatGrid>

            <ContentCard title="Controle Financeiro" className="overflow-hidden">
               <div className="flex flex-col md:flex-row gap-5">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Select
                      label="Ano"
                      value={String(viewYear)}
                      size="sm"
                      onChange={e => setViewYear(parseInt(e.target.value))}
                      options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))}
                    />
                    <Select
                      label="Mês de Visão"
                      value={String(viewMonth)}
                      size="sm"
                      onChange={e => setViewMonth(parseInt(e.target.value))}
                      options={monthNames.map((n, i) => ({ value: String(i + 1), label: n }))}
                    />
                  </div>
                  <div className="md:w-56 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex flex-col justify-center">
                     <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Expectativa Mensal</p>
                     <p className="text-xl font-black text-blue-700 tracking-tight">
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

            <ContentCard padding="none">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky left-0 bg-slate-50 z-20">Unidade Familiar</th>
                      {shortMonths.map((m, idx) => (
                        <th key={m} className={cn(
                          "px-3 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center",
                          idx + 1 === viewMonth && "bg-blue-50 text-blue-600"
                        )}>{m}</th>
                      ))}
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {groupedMembers.map((group, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/10 transition-colors group">
                        <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-white z-10 border-r border-slate-50">
                           <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-100",
                                group.atrasos > 0 ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"
                              )}>
                                 {group.type === 'couple' ? <Heart className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                              </div>
                              <p className="text-xs font-black text-slate-800 tracking-tight truncate max-w-[140px]">{group.displayName}</p>
                           </div>
                        </td>
                        {group.monthsStatus.map((isPaid: boolean, mIdx: number) => {
                          const isFuture = mIdx + 1 > viewMonth;
                          return (
                            <td key={mIdx} className={cn("px-1.5 py-4 text-center", mIdx + 1 === viewMonth && "bg-blue-50/30")}>
                               <div className={cn(
                                 "w-5 h-5 rounded-md mx-auto flex items-center justify-center transition-all",
                                 isPaid ? "bg-emerald-500 text-white shadow-md shadow-emerald-100" : 
                                 isFuture ? "bg-slate-50 text-slate-200 border border-slate-100" : 
                                 "bg-rose-500 text-white shadow-md shadow-rose-100"
                               )}>
                                 {isPaid ? <Check className="w-2.5 h-2.5" /> : isFuture ? null : <X className="w-2.5 h-2.5" />}
                               </div>
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-center">
                          <IconButton 
                            variant="primary" 
                            size="xs" 
                            className="w-7 h-7"
                            onClick={() => {
                              setPaymentForm({ ...paymentForm, year: viewYear, months: [viewMonth], amountPerMonth: group.amountPerPerson, observation: '', method: 'pix' });
                              setSelectedForPayment({ memberIds: group.members.map((m: Member) => m.id), displayName: group.displayName, amountPerPerson: group.amountPerPerson, payingMembers: group.payingMembers });
                              setShowPayModal(true);
                            }}
                          >
                             <Plus className="w-3.5 h-3.5" />
                          </IconButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ContentCard>
          </div>
        )}

        {/* ── TAB METAS EVENTOS ────────────────────────────────────────────── */}
        {activeTab === 'eventos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map(event => {
              const teamQuota = event.teamQuotas.find(q => q.teamId === teamId);
              const teamSales = localSales.filter(s => s.eventId === event.id).reduce((acc, s) => acc + s.amount, 0);
              const progress = teamQuota ? (teamSales / teamQuota.quotaValue) * 100 : 0;
              
              return (
                <ContentCard key={event.id} padding="none" className="overflow-hidden">
                  <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                           <Ticket className="w-5 h-5 text-white" />
                        </div>
                        <div>
                           <h4 className="text-base font-black tracking-tight">{event.name}</h4>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Meta Coletiva</p>
                        </div>
                     </div>
                     <Badge color="warning" size="sm">Ativa</Badge>
                  </div>
                  <div className="p-6 space-y-5">
                     <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Cota Equipe</p>
                           <p className="text-xl font-black text-slate-900">R$ {teamQuota?.quotaValue.toFixed(2) || '0.00'}</p>
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                           <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Realizado</p>
                           <p className="text-xl font-black text-emerald-600">R$ {teamSales.toFixed(2)}</p>
                        </div>
                     </div>
                     <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-black uppercase text-slate-400">
                          <span>Progresso da Campanha</span>
                          <span className="text-blue-600">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(progress, 100)}%` }} />
                        </div>
                     </div>
                  </div>
                </ContentCard>
              );
            })}
          </div>
        )}

        {/* ── TAB HISTÓRICO ─────────────────────────────────────────────────── */}
        {activeTab === 'historico' && (
          <ContentCard padding="none">
            <div className="p-6 border-b border-slate-50">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Extrato Recente</h3>
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5 italic">Últimos lançamentos realizados.</p>
            </div>
            <div className="overflow-x-auto no-scrollbar">
               <table className="w-full text-left border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap sticky left-0 bg-slate-50 z-20">MFCista</th>
                      <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">Referência</th>
                      <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">Data</th>
                      <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">Valor</th>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center whitespace-nowrap">Forma</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {localPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30).map(p => {
                      const member = membersState.find(m => m.id === p.memberId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-3 sticky left-0 bg-white group-hover:bg-white z-10 border-r border-slate-50">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-black text-xs shrink-0 uppercase">
                                {member?.name[0] || '?'}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-800 tracking-tight whitespace-nowrap">{member?.name || 'Membro'}</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase whitespace-nowrap">{p.familyName || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap"><Badge color="default" size="sm">{p.referenceMonth}</Badge></td>
                          <td className="px-4 py-3 text-[10px] font-bold text-slate-400 whitespace-nowrap">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                          <td className="px-4 py-3 text-xs font-black text-slate-900 whitespace-nowrap">R$ {p.amount.toFixed(2)}</td>
                          <td className="px-8 py-3 text-center">
                             <Badge color="info" dot size="sm">{p.method || 'Pix'}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
               </table>
            </div>
          </ContentCard>
        )}

        {/* ── TAB MEMBROS ─────────────────────────────────────────────────── */}
        {activeTab === 'membros' && (
          <div className="space-y-4">
            <FilterLine>
               <FilterLineSection grow>
                  <FilterLineItem grow>
                     <FilterLineSearch 
                        value={memberSearch}
                        onChange={setMemberSearch}
                        placeholder="Pesquisar MFCistas..."
                     />
                  </FilterLineItem>
                  <FilterLineItem minWidth={280}>
                     <FilterLineSegmented 
                        value={memberStatusFilter}
                        onChange={(val) => setMemberStatusFilter(val as string)}
                        options={[
                           { value: 'all', label: 'Todos', icon: <Users className="w-3.5 h-3.5" /> },
                           { value: 'Ativo', label: 'Ativos', icon: <UserCheck className="w-3.5 h-3.5" /> },
                           { value: 'Inativo', label: 'Inativos', icon: <Zap className="w-3.5 h-3.5" /> }
                        ]}
                     />
                  </FilterLineItem>
               </FilterLineSection>
            </FilterLine>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-2">
              {filteredTeamMembers.map(m => (
                <ContentCard key={m.id} padding="none" className="cursor-pointer group hover:shadow-lg hover:-translate-y-1 transition-all" onClick={() => navigate(`/mfcistas/${m.id}`)}>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner shrink-0 border border-blue-100">
                      {m.name[0]}
                    </div>
                    <div className="min-w-0">
                       <h4 className="text-xs font-black text-slate-900 tracking-tight truncate">{m.name}</h4>
                       <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5 truncate">{m.nickname || 'MFCista'}</p>
                    </div>
                  </div>
                  <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
                    <Badge color={m.status === 'Ativo' ? 'success' : 'warning'} size="sm">{m.status}</Badge>
                    <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </ContentCard>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}

      {/* MODAL DETALHES FAMÍLIA (DRAWER) */}
      <Modal
        isOpen={showDetailModal && !!selectedFamily}
        onClose={() => setShowDetailModal(false)}
        title={selectedFamily?.displayName}
        size="lg"
        position="right"
      >
        {selectedFamily && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            {/* Family Header */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-xl shadow-blue-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
               <div className="flex flex-col gap-4 relative">
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-sm shrink-0">
                        {selectedFamily.type === 'couple' ? <Heart className="w-8 h-8" /> : <Users className="w-8 h-8" />}
                     </div>
                     <div>
                        <h3 className="text-xl font-black tracking-tight leading-tight">{selectedFamily.displayName}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 opacity-80">
                           <p className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                             <Home className="w-3 h-3" /> Família {selectedFamily.familyName}
                           </p>
                           <div className="w-0.5 h-0.5 bg-white/30 rounded-full" />
                           <p className="text-[9px] font-black uppercase tracking-wider">Desde {selectedFamily.titular.mfcDate?.split('-')[0] || '?'}</p>
                        </div>
                     </div>
                  </div>
                  <Divider className="border-white/10" />
                  <div className="flex items-center justify-between">
                     <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest">Mensalidade Total</p>
                     <p className="text-2xl font-black">R$ {(selectedFamily.amountPerPerson * selectedFamily.payingMembers.length).toFixed(2)}</p>
                  </div>
               </div>
            </div>

            {/* Address & Contact */}
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100">
               <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-slate-100">
                     <MapPin className="w-4 h-4" />
                  </div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização e Contato</h4>
               </div>
               <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5 flex items-center gap-1.5"><Home className="w-3 h-3" /> Endereço</p>
                     <p className="text-xs font-black text-slate-700 leading-relaxed">
                        {selectedFamily.titular.street}, {selectedFamily.titular.number} • {selectedFamily.titular.neighborhood}<br />
                        {selectedFamily.titular.city}-{selectedFamily.titular.state}
                     </p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                     <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                           <PhoneCall className="w-4 h-4 text-emerald-500" />
                           <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Titular</p>
                              <p className="text-xs font-black text-slate-800 tracking-tight">{selectedFamily.titular.phone || 'N/I'}</p>
                           </div>
                        </div>
                        <IconButton variant="ghost" size="sm" className="w-8 h-8" onClick={() => window.open(`tel:${selectedFamily.titular.phone}`, '_blank')}><ExternalLink className="w-3.5 h-3.5" /></IconButton>
                     </div>
                     {selectedFamily.spouse && (
                        <div className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100">
                           <div className="flex items-center gap-3">
                              <PhoneCall className="w-4 h-4 text-emerald-500" />
                              <div>
                                 <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Cônjuge</p>
                                 <p className="text-xs font-black text-slate-800 tracking-tight">{selectedFamily.spouse.phone || 'N/I'}</p>
                              </div>
                           </div>
                           <IconButton variant="ghost" size="sm" className="w-8 h-8" onClick={() => window.open(`tel:${selectedFamily.spouse.phone}`, '_blank')}><ExternalLink className="w-3.5 h-3.5" /></IconButton>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* Members List */}
            <div className="space-y-3">
               <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Composição Familiar</h4>
                  <IconButton variant="ghost" size="xs" className="w-7 h-7" onClick={() => {
                     const rel: any = {}; selectedFamily.members.forEach((m: Member) => { rel[m.id] = m.relationshipType || 'Outro'; });
                     setEditingFamily({ name: selectedFamily.familyName || '', memberIds: selectedFamily.members.map((m: Member) => m.id), relationships: rel });
                     setShowFamilyModal(true);
                  }}><Edit className="w-3.5 h-3.5" /></IconButton>
               </div>
               
               <div className="space-y-2">
                  {selectedFamily.members.map((m: Member) => {
                     const age = getMemberAge(m.dob);
                     return (
                        <div key={m.id} className="p-3 rounded-2xl bg-white border border-slate-100 flex items-center gap-3 hover:border-blue-300 transition-all group">
                           <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center font-black text-lg group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                              {m.name[0]}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                 <p className="text-xs font-black text-slate-800 truncate">{m.name}</p>
                                 <IconButton variant="ghost" size="xs" className="w-6 h-6" onClick={() => navigate(`/mfcistas/${m.id}`)}><ArrowRight className="w-3 h-3" /></IconButton>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                 <Badge color="info" size="sm" className="text-[8px] px-1.5">{m.relationshipType || 'Titular'}</Badge>
                                 {age !== null && <Badge color="default" size="sm" className="text-[8px] px-1.5" icon={<Cake className="w-2.5 h-2.5" />}>{age} anos</Badge>}
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>

            {/* Children Tag Section */}
            {selectedFamily.children.length > 0 && (
              <div className="p-5 rounded-3xl bg-amber-50/50 border border-amber-100">
                 <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Baby className="w-3.5 h-3.5" /> Filhos no MFC</p>
                 <div className="flex flex-wrap gap-2">
                    {selectedFamily.children.map((child: Member) => (
                       <div key={child.id} className="px-3 py-1.5 bg-white rounded-xl border border-amber-100 text-[10px] font-black text-slate-700 flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-600 flex items-center justify-center text-[8px]">{child.name[0]}</div>
                          {child.name}
                       </div>
                    ))}
                 </div>
              </div>
            )}
          </div>
        )}
        <ModalFooter align="between" className="border-t border-slate-100 mt-6 bg-white sticky bottom-0 -mx-5 -mb-5 p-5">
          <Button variant="ghost" size="sm" onClick={() => setShowDetailModal(false)}>Fechar</Button>
          <Button variant="primary" size="sm" className="px-6" iconLeft={<CreditCard className="w-4 h-4" />} onClick={() => {
             setPaymentForm({ ...paymentForm, year: viewYear, months: [viewMonth], amountPerMonth: selectedFamily.amountPerPerson, observation: '', method: 'pix' });
             setSelectedForPayment({ memberIds: selectedFamily.members.map((m: Member) => m.id), displayName: selectedFamily.displayName, amountPerPerson: selectedFamily.amountPerPerson, payingMembers: selectedFamily.payingMembers });
             setShowPayModal(true);
          }}>Lançar Mensalidade</Button>
        </ModalFooter>
      </Modal>

      {/* MODAL PAGAMENTO */}
      <Modal
        isOpen={showPayModal && !!selectedForPayment}
        onClose={() => setShowPayModal(false)}
        title="Confirmar Recebimento"
        size="md"
      >
        {selectedForPayment && (
          <div className="space-y-5">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
               <div className="flex items-start justify-between relative">
                  <div>
                    <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-0.5">Unidade Familiar</p>
                    <h4 className="text-lg font-black tracking-tight leading-tight">{selectedForPayment.displayName}</h4>
                    <div className="flex gap-1 flex-wrap mt-2.5">
                      {selectedForPayment.payingMembers.map((m: Member) => (
                        <span key={m.id} className="text-[8px] font-black px-2 py-0.5 rounded-lg bg-white/10 border border-white/20 uppercase">
                          {m.nickname || m.name.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-0.5">Por Pessoa</p>
                    <p className="text-xl font-black text-white">R$ {selectedForPayment.amountPerPerson.toFixed(2)}</p>
                  </div>
               </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between">
               <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Valor Total</p>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    R$ {(paymentForm.months.length * selectedForPayment.amountPerPerson * selectedForPayment.payingMembers.length).toFixed(2)}
                  </p>
               </div>
               <Badge color="success" size="md" pill>
                 {paymentForm.months.length} {paymentForm.months.length === 1 ? 'Mês' : 'Meses'}
               </Badge>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center justify-between px-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Referência</p>
                <div className="flex items-center gap-2">
                  <Select
                    value={String(paymentForm.year)}
                    onChange={e => setPaymentForm({ ...paymentForm, year: parseInt(e.target.value) })}
                    options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))}
                    size="sm"
                    wrapperClassName="w-24"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {monthNames.map((_m, i) => {
                  const mIdx = i + 1;
                  const isSelected = paymentForm.months.includes(mIdx);
                  const isPaid = selectedForPayment.memberIds.some(id => localPayments.some(p => p.memberId === id && p.referenceMonth === `${mIdx}/${paymentForm.year}`));
                  return (
                    <button 
                      key={mIdx} 
                      disabled={isPaid} 
                      onClick={() => toggleMonthInForm(mIdx)}
                      className={cn(
                        "h-11 rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 text-[8px] font-black uppercase tracking-widest",
                        isPaid ? "bg-emerald-50 border-emerald-100 text-emerald-600 cursor-not-allowed opacity-60" :
                        isSelected ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" :
                        "bg-white border-slate-100 text-slate-400 hover:border-blue-300"
                      )}
                    >
                      {shortMonths[i]}
                      {isPaid ? <CheckCircle2 className="w-3 h-3" /> : isSelected ? <Check className="w-3 h-3" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               <Select 
                label="Forma"
                value={paymentForm.method}
                size="sm"
                onChange={e => setPaymentForm({ ...paymentForm, method: e.target.value })}
                options={[
                  { value: 'pix', label: 'Pix' },
                  { value: 'cash', label: 'Dinheiro' },
                  { value: 'card', label: 'Cartão' },
                  { value: 'transfer', label: 'Transf.' }
                ]}
              />
               <Input 
                label="Obs."
                placeholder="Opcional..."
                size="sm"
                value={paymentForm.observation}
                onChange={e => setPaymentForm({...paymentForm, observation: e.target.value})}
              />
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={() => setShowPayModal(false)}>Cancelar</Button>
          <Button 
            variant="primary" 
            size="sm"
            disabled={paymentForm.months.length === 0} 
            iconLeft={<Save className="w-4 h-4" />} 
            onClick={handleLaunchMultiPayment}
          >
            Confirmar Recebimento
          </Button>
        </ModalFooter>
      </Modal>

      {/* MODAL GESTÃO FAMÍLIA */}
      <Modal
        isOpen={showFamilyModal}
        onClose={() => { setShowFamilyModal(false); setEditingFamily(null); }}
        title="Configurar Unidade Familiar"
        size="lg"
      >
        <div className="space-y-6">
          <Input
            label="Nome da Família *"
            placeholder="Ex: Família Silva"
            size="sm"
            value={editingFamily?.name || ''}
            onChange={e => setEditingFamily(prev => prev ? { ...prev, name: e.target.value } : { name: e.target.value, memberIds: [], relationships: {} })}
            iconLeft={<Heart className="w-4 h-4 text-rose-400" />}
          />

          <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Adicionar Membros</h4>
                <Badge color="info" size="sm">{editingFamily?.memberIds.length || 0} Selecionados</Badge>
             </div>
             
             <Combobox 
                multiple
                placeholder="Pesquisar e adicionar MFCistas..."
                searchPlaceholder="Digite o nome..."
                options={membersState.map(m => ({
                  value: m.id,
                  label: m.name,
                  subtitle: m.familyName ? `Família: ${m.familyName}` : 'Sem Família',
                  badge: m.status,
                  badgeColor: m.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-zinc-50 text-zinc-500 border-zinc-200'
                }))}
                value={editingFamily?.memberIds || []}
                onChange={(ids) => {
                  const newIds = ids as string[];
                  setEditingFamily(prev => {
                    if (!prev) return null;
                    const newRel = { ...prev.relationships };
                    newIds.forEach((id, idx) => {
                      if (!newRel[id]) newRel[id] = newIds.length === 1 ? 'Titular' : 'Outro';
                    });
                    return { ...prev, memberIds: newIds, relationships: newRel };
                  });
                }}
             />

             <div className="space-y-2 mt-4">
                {editingFamily?.memberIds.map(id => {
                   const m = membersState.find(x => x.id === id);
                   if (!m) return null;
                   return (
                      <div key={id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
                         <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0">{m.name[0]}</div>
                            <div className="min-w-0">
                               <p className="text-[11px] font-black text-slate-800 truncate">{m.name}</p>
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">{m.nickname || 'MFCista'}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2 shrink-0">
                            <Select 
                               value={editingFamily.relationships[id] || 'Outro'}
                               size="sm"
                               className="w-32"
                               onChange={e => setEditingFamily({ ...editingFamily, relationships: { ...editingFamily.relationships, [id]: e.target.value } })}
                               options={['Titular','Cônjuge','Filho(a)','Pai/Mãe','Irmão/Irmã','Neto(a)','Sogro(a)','Outro'].map(v => ({ value: v, label: v }))}
                            />
                            <IconButton variant="ghost" size="xs" className="w-7 h-7" onClick={() => setEditingFamily(prev => {
                               if (!prev) return null;
                               const newIds = prev.memberIds.filter(mid => mid !== id);
                               const newRel = { ...prev.relationships }; delete newRel[id];
                               return { ...prev, memberIds: newIds, relationships: newRel };
                            })}><X className="w-3.5 h-3.5 text-rose-400" /></IconButton>
                         </div>
                      </div>
                   );
                })}
                {(editingFamily?.memberIds.length || 0) === 0 && (
                  <div className="p-10 rounded-3xl bg-slate-50/50 border-2 border-dashed border-slate-200 text-center">
                     <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum membro selecionado</p>
                  </div>
                )}
             </div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={() => { setShowFamilyModal(false); setEditingFamily(null); }}>Cancelar</Button>
          <Button 
            variant="primary" 
            size="sm"
            disabled={!editingFamily?.name || (editingFamily?.memberIds.length || 0) === 0} 
            iconLeft={<Save className="w-4 h-4" />} 
            onClick={handleSaveFamily}
          >
            Salvar Família
          </Button>
        </ModalFooter>
      </Modal>

    </PageWrapper>
  );
};

export default MyTeamView;
