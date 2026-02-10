
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  DollarSign, 
  History, 
  Clock, 
  AlertCircle, 
  Plus, 
  X, 
  Calendar,
  Save,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Heart,
  BarChart3,
  Ticket,
  ChevronRight,
  ArrowRight,
  ShoppingCart,
  Receipt,
  Check,
  Settings as SettingsIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { api } from '../api';
import { Payment, Member, EventSale, Event, BaseTeam, UserRoleType } from '../types';

interface MyTeamViewProps {
  teamId: string;
  userId: string;
  userRole: UserRoleType;
}

const MyTeamView: React.FC<MyTeamViewProps> = ({ teamId, userId, userRole }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'membros' | 'mensalidades' | 'eventos' | 'historico'>('membros');
  const [showPayModal, setShowPayModal] = useState(false);
  const [defaultMonthlyAmount, setDefaultMonthlyAmount] = useState(50.00);
  
  // Zé, inicia sempre em 2026
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  
  const [selectedForPayment, setSelectedForPayment] = useState<{memberIds: string[], displayName: string} | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    months: [] as number[], // Agora aceita vários meses
    year: 2026,
    amountPerMonth: defaultMonthlyAmount,
    observation: ''
  });
  
    const [membersState, setMembersState] = useState<Member[]>([]);
  const [team, setTeam] = useState<BaseTeam | null>(null);
  const [localPayments, setLocalPayments] = useState<Payment[]>([]);
  const [localSales, setLocalSales] = useState<EventSale[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const loadData = () => {
    api.getMembers()
      .then((items: Member[]) => setMembersState(items.filter(m => m.teamId === teamId)))
      .catch(() => setMembersState([]));
    api.getTeams()
      .then((items: BaseTeam[]) => setTeam(items.find(t => t.id === teamId) || null))
      .catch(() => setTeam(null));
    api.getPayments()
      .then((items: Payment[]) => setLocalPayments(items.filter(p => p.teamId === teamId)))
      .catch(() => setLocalPayments([]));
    api.getEventSales()
      .then((items: EventSale[]) => setLocalSales(items.filter(s => s.teamId === teamId)))
      .catch(() => setLocalSales([]));
    api.getEvents()
      .then(setEvents)
      .catch(() => setEvents([]));
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
  }, [teamId]);

  // Carregar configuração financeira do backend
  useEffect(() => {
    api.getFinancialConfig()
      .then((config: any) => {
        if (config && config.monthlyPaymentAmount) {
          const value = parseFloat(config.monthlyPaymentAmount);
          setDefaultMonthlyAmount(isNaN(value) ? 50.00 : value);
        }
      })
      .catch(() => {
        console.error('Erro ao carregar config financeira, usando valor padrão');
        setDefaultMonthlyAmount(50.00);
      });
  }, []);

  // Atualizar paymentForm quando defaultMonthlyAmount mudar
  useEffect(() => {
    setPaymentForm(prev => ({
      ...prev,
      amountPerMonth: defaultMonthlyAmount
    }));
  }, [defaultMonthlyAmount]);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const shortMonths = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  // Estatísticas de Mensalidade
  const financeStats = useMemo(() => {
    const currentRef = `${viewMonth}/${viewYear}`;
    const monthlyTotal = localPayments.filter(p => p.referenceMonth === currentRef).reduce((acc, p) => acc + p.amount, 0);
    const yearlyTotal = localPayments.filter(p => p.referenceMonth.endsWith(`/${viewYear}`)).reduce((acc, p) => acc + p.amount, 0);

    let pendingAmount = 0;
    membersState.forEach(m => {
       for(let mIdx = 1; mIdx <= viewMonth; mIdx++) {
          if(!localPayments.some(p => p.memberId === m.id && p.referenceMonth === `${mIdx}/${viewYear}`)) pendingAmount += defaultMonthlyAmount;
       }
    });

    return { monthlyTotal, yearlyTotal, pendingAmount };
  }, [localPayments, viewMonth, viewYear, membersState]);

  // Agrupamento de Casais com Status de Jan a Dez
  const groupedMembers = useMemo(() => {
    const processed = new Set<string>();
    const groups: any[] = [];

    membersState.forEach(member => {
      if (processed.has(member.id)) return;
      const spouse = membersState.find(m => m.id !== member.id && (m.name === member.spouseName || m.spouseName === member.name));

      const getStatusForMonth = (mId: string, month: number) => {
        return localPayments.some(p => p.memberId === mId && p.referenceMonth === `${month}/${viewYear}`);
      };

      const monthsStatus = Array.from({length: 12}, (_, i) => {
        const mIdx = i + 1;
        const p1 = getStatusForMonth(member.id, mIdx);
        const p2 = spouse ? getStatusForMonth(spouse.id, mIdx) : true;
        return p1 && p2;
      });

      const atrasos = monthsStatus.slice(0, viewMonth).filter(s => !s).length;

      if (spouse) {
        groups.push({ type: 'couple', members: [member, spouse], displayName: `${member.nickname || member.name.split(' ')[0]} & ${spouse.nickname || spouse.name.split(' ')[0]}`, monthsStatus, atrasos });
        processed.add(member.id); processed.add(spouse.id);
      } else {
        groups.push({ type: 'single', members: [member], displayName: member.name, monthsStatus, atrasos });
        processed.add(member.id);
      }
    });

    return groups.sort((a, b) => b.atrasos - a.atrasos);
  }, [membersState, localPayments, viewYear, viewMonth]);

  const toggleMonthInForm = (mIdx: number) => {
    if (!selectedForPayment) return;
    
    // Trava: Não deixa selecionar mês que já está pago
    const alreadyPaid = selectedForPayment.memberIds.some(mId => 
      localPayments.some(p => p.memberId === mId && p.referenceMonth === `${mIdx}/${paymentForm.year}`)
    );
    if (alreadyPaid) return;

    setPaymentForm(prev => ({
      ...prev,
      months: prev.months.includes(mIdx) ? prev.months.filter(m => m !== mIdx) : [...prev.months, mIdx]
    }));
  };

  const handleLaunchMultiPayment = () => {
    if (!selectedForPayment || paymentForm.months.length === 0) return;

    const newPayments: Payment[] = [];
    selectedForPayment.memberIds.forEach(mId => {
      paymentForm.months.forEach(mIdx => {
        newPayments.push({
          id: '',
          memberId: mId,
          teamId: teamId,
          amount: paymentForm.amountPerMonth,
          date: new Date().toISOString().split('T')[0],
          referenceMonth: `${mIdx}/${paymentForm.year}`,
          status: 'Pago',
          launchedBy: userId
        });
      });
    });

    Promise.all(newPayments.map(p => api.createPayment(p)))
      .then((created: Payment[]) => {
        console.log('Pagamentos criados com sucesso:', created);
        setLocalPayments(prev => [...created, ...prev]);
        // Força reload dos dados para garantir sincronização
        setTimeout(() => loadData(), 500);
        setShowPayModal(false);
        setPaymentForm({ months: [], year: 2026, amountPerMonth: 50, observation: '' });
      })
      .catch((error) => {
        console.error('Erro ao criar pagamentos:', error);
        setShowPayModal(false);
      });
  };

  if (!teamId || teamId === 't1') {
    return (
      <div className="p-10 text-center space-y-4">
        <div className="text-xl font-black text-gray-800">⚠️ Você não está vinculado a uma equipe base</div>
        <p className="text-sm text-gray-600">Seu cadastro foi atualizado. Faça logout e login novamente.</p>
        <button 
          onClick={() => {
            localStorage.removeItem('mfc.currentUser');
            window.location.href = '/';
          }}
          className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
        >
          Fazer Logout Agora
        </button>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-10 text-center space-y-4">
        <div className="text-xl font-black text-gray-800">EQUIPE NÃO ENCONTRADA</div>
        <p className="text-sm text-gray-600">ID da equipe: {teamId}</p>
        <button 
          onClick={loadData}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
        >
          Recarregar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* HEADER DINÃ‚MICO */}
      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-2">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter leading-none mb-1">{team.name}</h2>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-500" /> {team.city} • UNIDADE {team.state}
              </p>
            </div>
          </div>
          <div className="flex bg-gray-50 p-2 rounded-2xl border border-gray-100 flex-wrap gap-1">
            {[
              { id: 'membros', label: 'Membros', icon: Users },
              { id: 'mensalidades', label: 'Mensalidades', icon: DollarSign },
              { id: 'eventos', label: 'Metas Equipe', icon: Ticket },
              { id: 'historico', label: 'Extrato', icon: History }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white shadow-xl text-blue-600 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <tab.icon className="w-4 h-4" /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'membros' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {membersState.map(m => (
            <div key={m.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer group" onClick={() => navigate(`/mfcistas/${m.id}`)}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {m.name.substring(0, 1)}
                </div>
                <div>
                  <h4 className="font-black text-gray-900 leading-tight">{m.name}</h4>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{m.nickname || 'Membro'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">{m.movementRoles[0] || 'Ativo'}</span>
                  <span className={`px-4 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${m.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'mensalidades' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* AVISO DE CONFIGURAÇÃO - Somente para Admins */}
          {userRole === UserRoleType.ADMIN && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
              <SettingsIcon className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-sm font-black text-blue-900">Valor Padrão da Mensalidade</h4>
                <p className="text-xs text-blue-700 mt-1">
                  O valor atual é <span className="font-black">R$ {defaultMonthlyAmount.toFixed(2)}</span> por mês. 
                  Você pode alterar este valor nas <span className="font-black">Configurações do Sistema</span> (menu lateral → Configurações → Financeiro).
                </p>
              </div>
            </div>
          )}

          {/* RESUMO E FILTROS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Filtro de Visão</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Ano Exercício</label>
                    <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-black outline-none" value={viewYear} onChange={(e) => setViewYear(parseInt(e.target.value))}>
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">mês Atual</label>
                    <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-black outline-none" value={viewMonth} onChange={(e) => setViewMonth(parseInt(e.target.value))}>
                      {monthNames.map((n, i) => <option key={i} value={i+1}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <div className="text-right">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">Esperado no mês</p>
                        <p className="text-lg font-black text-blue-700">R$ {(membersState.length * defaultMonthlyAmount).toFixed(2)}</p>
                    </div>
                </div>
             </div>

             <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
                <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
                <p className="text-[10px] font-black text-emerald-200 uppercase tracking-[0.2em] mb-1">Arrecadado em {monthNames[viewMonth-1]}</p>
                <h3 className="text-4xl font-black tracking-tighter leading-none">R$ {financeStats.monthlyTotal.toFixed(2)}</h3>
                <div className="mt-8 pt-6 border-t border-emerald-500/30 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest">Total {viewYear}:</span>
                    <span className="text-xl font-black">R$ {financeStats.yearlyTotal.toFixed(2)}</span>
                </div>
             </div>

             <div className="bg-white p-8 rounded-[2.5rem] border border-red-100 shadow-xl shadow-red-50 relative overflow-hidden group">
                <AlertTriangle className="absolute -right-4 -bottom-4 w-32 h-32 text-red-500 opacity-5 group-hover:scale-110 transition-transform" />
                <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-1">Pendências Acumuladas</p>
                <h3 className="text-4xl font-black text-red-600 tracking-tighter leading-none">R$ {financeStats.pendingAmount.toFixed(2)}</h3>
                <p className="mt-4 text-[9px] font-bold text-gray-400 italic">Zé, esse é o valor que ainda falta entrar no caixa este ano.</p>
             </div>
          </div>

          {/* LISTA DE MENSALIDADES COM TIMELINE */}
          <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
             <header className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/20">
                <div>
                   <h3 className="text-xl font-black text-gray-900 tracking-tight">Fluxo de Caixa da Equipe</h3>
                   <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Legenda: <span className="text-emerald-500">● Pago</span> | <span className="text-red-500">● Atraso</span> | <span className="text-gray-300">○ Futuro</span></p>
                </div>
                <div className="px-4 py-2 bg-white rounded-xl border border-gray-100 text-[9px] font-black text-gray-500 uppercase tracking-widest shadow-sm">
                   {groupedMembers.length} Unidades Familiares
                </div>
             </header>

             <div className="divide-y divide-gray-50">
                {groupedMembers.map((group, idx) => (
                  <div key={idx} className="p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-8 hover:bg-gray-50/50 transition-all">
                    <div className="flex items-center gap-6 min-w-[250px]">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${group.atrasos === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {group.type === 'couple' ? <Heart className="w-7 h-7" /> : <Users className="w-7 h-7" />}
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-lg font-black text-gray-900 leading-none">{group.displayName}</h4>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          {group.atrasos === 0 ? 'Em dia com a tesouraria' : `${group.atrasos} meses pendentes`}
                        </p>
                      </div>
                    </div>

                    {/* LINHA DO TEMPO JAN-DEZ */}
                    <div className="flex-1 overflow-x-auto no-scrollbar">
                      <div className="flex items-center gap-2 min-w-[400px]">
                        {group.monthsStatus.map((isPaid: boolean, mIdx: number) => {
                          const monthNum = mIdx + 1;
                          const isFuture = monthNum > viewMonth;
                          const isPast = monthNum < viewMonth;
                          
                          let bgColor = 'bg-gray-100';
                          let textColor = 'text-gray-400';
                          if (isPaid) { bgColor = 'bg-emerald-500'; textColor = 'text-white'; }
                          else if (!isFuture) { bgColor = 'bg-red-500'; textColor = 'text-white'; }

                          return (
                            <div key={mIdx} className="flex flex-col items-center gap-1 flex-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[8px] font-black uppercase transition-all shadow-sm ${bgColor} ${textColor}`}>
                                {shortMonths[mIdx]}
                              </div>
                              <div className={`w-1 h-1 rounded-full ${isPaid ? 'bg-emerald-400' : isFuture ? 'bg-gray-200' : 'bg-red-400 animate-pulse'}`}></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          setPaymentForm({ ...paymentForm, year: viewYear, months: [viewMonth], observation: '' });
                          setSelectedForPayment({ memberIds: group.members.map(m => m.id), displayName: group.displayName });
                          setShowPayModal(true);
                        }}
                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Lançar Pagamento
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'eventos' && (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map(event => {
               const teamQuota = event.teamQuotas.find(q => q.teamId === teamId);
               const teamSales = localSales.filter(s => s.eventId === event.id).reduce((acc, s) => acc + s.amount, 0);
               const progress = teamQuota ? (teamSales / teamQuota.quotaValue) * 100 : 0;

               return (
                 <div key={event.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                             <Ticket className="w-6 h-6" />
                          </div>
                          <div>
                             <h3 className="text-lg font-black text-gray-900 leading-tight">{event.name}</h3>
                             <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Meta da nossa equipe</p>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cota Equipe</p>
                          <p className="text-xl font-black text-gray-900">R$ {teamQuota?.quotaValue.toFixed(2)}</p>
                       </div>
                       <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">já Vendido</p>
                          <p className="text-xl font-black text-blue-700">R$ {teamSales.toFixed(2)}</p>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-gray-400">Progresso da Meta</span>
                          <span className="text-blue-600">{progress.toFixed(1)}%</span>
                       </div>
                       <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 transition-all duration-1000" style={{width: `${Math.min(progress, 100)}%`}}></div>
                       </div>
                    </div>

                    <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                       <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-300" />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{localSales.filter(s => s.eventId === event.id).length} Vendas Realizadas</span>
                       </div>
                    </div>
                 </div>
               );
            })}
          </div>
        </div>
      )}

      {activeTab === 'historico' && (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-left-4 duration-500">
           <header className="p-8 border-b border-gray-50 bg-gray-50/20">
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Extrato Detalhado</h3>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Ãšltimos 20 lanÃ§amentos da equipe</p>
           </header>
           <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                 <thead>
                    <tr className="bg-gray-50/50">
                       <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">MFCista</th>
                       <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Referência</th>
                       <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Lanç.</th>
                       <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                       <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {localPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(p => {
                       const member = membersState.find(m => m.id === p.memberId);
                       return (
                          <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                             <td className="px-8 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black">{member?.name.substring(0, 1)}</div>
                                   <span className="text-sm font-bold text-gray-800">{member?.name}</span>
                                </div>
                             </td>
                             <td className="px-8 py-4 text-sm font-black text-gray-500">{p.referenceMonth}</td>
                             <td className="px-8 py-4 text-sm font-medium text-gray-400">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                             <td className="px-8 py-4 text-sm font-black text-gray-900">R$ {p.amount.toFixed(2)}</td>
                             <td className="px-8 py-4 text-center">
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded-lg">Confirmado</span>
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* MODAL MULTI-MESES - ZÃ‰, AQUI Ã‰ ONDE VOCÃŠ MARCA TUDO DE UMA VEZ */}
      {showPayModal && selectedForPayment && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-500">
                <div className="p-5 border-b border-gray-50 bg-white text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">Confirmar Recebimento</h3>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">MARQUE OS MESES ABAIXO PARA LANÇAR EM LOTE</p>
                    </div>
                </div>
                
                <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh] no-scrollbar">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Membro/Casal</p>
                          <p className="text-base font-black text-gray-800">{selectedForPayment.displayName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total a Lançar</p>
                          <p className="text-lg font-black text-emerald-600">R$ {(paymentForm.months.length * paymentForm.amountPerMonth).toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex items-center justify-between px-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Selecione os Meses ({paymentForm.year})</label>
                          <select className="bg-transparent border-none text-[9px] font-black text-blue-600 outline-none" value={paymentForm.year} onChange={(e) => setPaymentForm({...paymentForm, year: parseInt(e.target.value)})}>
                             {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                       </div>
                       
                       <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {monthNames.map((m, i) => {
                            const mIdx = i + 1;
                            const isSelected = paymentForm.months.includes(mIdx);
                            const isPaid = selectedForPayment.memberIds.some(id => localPayments.some(p => p.memberId === id && p.referenceMonth === `${mIdx}/${paymentForm.year}`));

                            return (
                              <button 
                                key={mIdx}
                                disabled={isPaid}
                                onClick={() => toggleMonthInForm(mIdx)}
                                className={`relative group p-2.5 rounded-lg border transition-all flex flex-col items-center gap-0.5 ${isPaid ? 'bg-emerald-50 border-emerald-100 cursor-not-allowed grayscale' : isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-[1.02]' : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-white hover:border-blue-200'}`}
                              >
                                 <span className="text-[8px] font-black uppercase tracking-wider">{shortMonths[i]}</span>
                                 {isPaid ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : isSelected ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border-2 border-gray-200 group-hover:border-blue-300"></div>}
                                 {isPaid && <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[6px] font-black px-1 py-0.5 rounded-full shadow-lg">PAGO</span>}
                              </button>
                            );
                          })}
                       </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações (Opcional)</label>
                        <textarea 
                            rows={2}
                            placeholder="Zé, anote aqui se foi PIX ou dinheiro..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 outline-none focus:ring-2 focus:ring-blue-100 resize-none"
                            value={paymentForm.observation}
                            onChange={(e) => setPaymentForm({...paymentForm, observation: e.target.value})}
                        />
                    </div>
                </div>

                <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
                    <button 
                        onClick={handleLaunchMultiPayment}
                        disabled={paymentForm.months.length === 0}
                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                    >
                        <Save className="w-4 h-4" /> Confirmar Lançamento ({paymentForm.months.length} {paymentForm.months.length === 1 ? 'Mês' : 'Meses'})
                    </button>
                    <button 
                        onClick={() => setShowPayModal(false)}
                        className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors py-2"
                    >
                        CANCELAR OPERAÇÃO
                    </button>
                </div>
            </div>
          </div>
      )}
    </div>
  );
};

export default MyTeamView;



