
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
  Settings as SettingsIcon,
  UserPlus,
  Edit,
  Briefcase,
  Cake,
  ChevronDown,
  ChevronUp
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
  const [activeTab, setActiveTab] = useState<'membros' | 'familias' | 'mensalidades' | 'eventos' | 'historico'>('familias');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [editingFamily, setEditingFamily] = useState<{name: string, memberIds: string[], relationships: {[memberId: string]: string}} | null>(null);
  const [defaultMonthlyAmount, setDefaultMonthlyAmount] = useState(50.00);
  
  // Zé, inicia sempre em 2026
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  
  const [selectedForPayment, setSelectedForPayment] = useState<{memberIds: string[], displayName: string, amountPerPerson: number, payingMembers: Member[]} | null>(null);
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

    // Calcular pendências considerando sistema de famílias
    let pendingAmount = 0;
    const payingMembers = membersState.filter(m => m.paysMonthly !== false);
    
    payingMembers.forEach(m => {
      // Verifica se o membro está em um casal (para dividir o valor)
      const isInCouple = payingMembers.some(other => 
        other.id !== m.id && 
        other.familyName === m.familyName && 
        other.familyName && 
        ((m.relationshipType === 'Titular' && other.relationshipType === 'Cônjuge') ||
         (m.relationshipType === 'Cônjuge' && other.relationshipType === 'Titular'))
      );
      
      const amountPerMonth = isInCouple ? defaultMonthlyAmount / 2 : defaultMonthlyAmount;
      
      for(let mIdx = 1; mIdx <= viewMonth; mIdx++) {
        if(!localPayments.some(p => p.memberId === m.id && p.referenceMonth === `${mIdx}/${viewYear}`)) {
          pendingAmount += amountPerMonth;
        }
      }
    });

    return { monthlyTotal, yearlyTotal, pendingAmount };
  }, [localPayments, viewMonth, viewYear, membersState, defaultMonthlyAmount]);

  // Agrupamento por FAMÍLIAS (novo sistema)
  const groupedMembers = useMemo(() => {
    const familyGroups = new Map<string, Member[]>();
    
    // Agrupar APENAS membros com family_name definido
    membersState.forEach(member => {
      if (member.familyName && member.familyName.trim() !== '') {
        const familyKey = member.familyName;
        if (!familyGroups.has(familyKey)) {
          familyGroups.set(familyKey, []);
        }
        familyGroups.get(familyKey)!.push(member);
      }
    });

    const groups: any[] = [];

    familyGroups.forEach((familyMembers, familyName) => {
      // Ordenar: Titular primeiro, depois Cônjuge, depois outros
      const sortedMembers = familyMembers.sort((a, b) => {
        const order = { 'Titular': 1, 'Cônjuge': 2, 'Filho(a)': 3, 'Pai/Mãe': 4, 'Outro': 5 };
        return (order[a.relationshipType || 'Titular'] || 5) - (order[b.relationshipType || 'Titular'] || 5);
      });

      // Identificar quem paga
      const payingMembers = sortedMembers.filter(m => m.paysMonthly !== false);
      const titular = sortedMembers.find(m => m.relationshipType === 'Titular') || sortedMembers[0];
      const spouse = sortedMembers.find(m => m.relationshipType === 'Cônjuge');
      
      // Calcular valor por pessoa (se tem casal pagante, divide por 2)
      const isCouplePayment = payingMembers.length >= 2 && spouse && spouse.paysMonthly !== false;
      const amountPerPerson = isCouplePayment ? defaultMonthlyAmount / 2 : defaultMonthlyAmount;

      const getStatusForMonth = (member: Member, month: number) => {
        if (member.paysMonthly === false) return true; // Quem não paga sempre está "ok"
        return localPayments.some(p => p.memberId === member.id && p.referenceMonth === `${month}/${viewYear}`);
      };

      // Status de cada mês (todos os pagantes precisam ter pago)
      const monthsStatus = Array.from({length: 12}, (_, i) => {
        const mIdx = i + 1;
        return payingMembers.every(m => getStatusForMonth(m, mIdx));
      });

      const atrasos = monthsStatus.slice(0, viewMonth).filter(s => !s).length;

      // Nome para exibição
      let displayName = `Família ${familyName}`;
      
      if (spouse) {
        displayName = `${titular.nickname || titular.name.split(' ')[0]} & ${spouse.nickname || spouse.name.split(' ')[0]}`;
      }

      groups.push({ 
        type: isCouplePayment ? 'couple' : 'single',
        members: sortedMembers,
        payingMembers,
        displayName, 
        monthsStatus, 
        atrasos,
        amountPerPerson,
        familyName
      });
    });

    return groups.sort((a, b) => b.atrasos - a.atrasos);
  }, [membersState, localPayments, viewYear, viewMonth, defaultMonthlyAmount]);

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Próximos aniversariantes (30 dias)
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    return membersState
      .filter(m => m.dob)
      .map(m => {
        const birthDate = new Date(m.dob!);
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        
        // Se já passou este ano, considera ano que vem
        if (thisYearBirthday < today) {
          thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }

        const daysUntil = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const age = calculateAge(m.dob!) || 0;

        return {
          member: m,
          date: thisYearBirthday,
          daysUntil,
          age: age + 1, // Idade que vai fazer
          isToday: daysUntil === 0
        };
      })
      .filter(b => b.daysUntil >= 0 && b.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [membersState]);

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

  // Funções de gerenciamento de famílias
  const availableMembers = useMemo(() => {
    return membersState.filter(m => !m.familyName || m.familyName === '');
  }, [membersState]);

  const handleCreateFamily = () => {
    setEditingFamily({ name: '', memberIds: [], relationships: {} });
    setShowFamilyModal(true);
  };

  const handleSaveFamily = async () => {
    if (!editingFamily || !editingFamily.name || editingFamily.memberIds.length === 0) {
      alert('Preencha o nome da família e selecione pelo menos 1 membro');
      return;
    }

    try {
      // Atualizar cada membro selecionado com o nome da família
      const updates = editingFamily.memberIds.map((memberId, index) => {
        const member = membersState.find(m => m.id === memberId);
        if (!member) return Promise.resolve();
        
        return api.updateMember(memberId, {
          ...member,
          familyName: editingFamily.name,
          relationshipType: editingFamily.relationships[memberId] || (index === 0 ? 'Titular' : 'Outro'),
          paysMonthly: true
        });
      });

      await Promise.all(updates);
      toast.success(`Família "${editingFamily.name}" criada com sucesso!`);
      loadData();
      setShowFamilyModal(false);
      setEditingFamily(null);
    } catch (error) {
      toast.error('Erro ao criar família');
      console.error(error);
    }
  };

  const handleDeleteFamily = async (familyName: string, memberIds: string[]) => {
    if (!confirm(`Tem certeza que deseja excluir a família "${familyName}"? Os membros não serão excluídos, apenas desvinculados da família.`)) {
      return;
    }

    try {
      // Remove family_name de todos os membros
      const updates = memberIds.map(memberId => {
        const member = membersState.find(m => m.id === memberId);
        if (!member) return Promise.resolve();
        
        return api.updateMember(memberId, {
          ...member,
          familyName: '',
          relationshipType: 'Titular',
          paysMonthly: true
        });
      });

      await Promise.all(updates);
      toast.success(`Família "${familyName}" excluída com sucesso!`);
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir família');
      console.error(error);
    }
  };

  const handleLaunchMultiPayment = () => {
    if (!selectedForPayment || paymentForm.months.length === 0) return;

    const newPayments: Payment[] = [];
    // Apenas os membros que pagam recebem lançamentos
    const payingMemberIds = selectedForPayment.payingMembers.map(m => m.id);
    
    payingMemberIds.forEach(mId => {
      paymentForm.months.forEach(mIdx => {
        newPayments.push({
          id: '',
          memberId: mId,
          teamId: teamId,
          amount: selectedForPayment.amountPerPerson, // Usa o valor correto (dividido se for casal)
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
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500 pb-12 md:pb-20 px-2 md:px-0">
      {/* HEADER DINÂMICO */}
      <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="flex flex-col gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-6">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-white shadow-2xl rotate-2">
              <Users className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-black text-gray-900 tracking-tighter leading-none mb-1">{team.name}</h2>
              <p className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-wider md:tracking-[0.2em] flex items-center gap-1 md:gap-2">
                <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-500" /> {team.city} • {team.state}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 scrollbar-hide">
            <div className="flex flex-row flex-nowrap content-center justify-center bg-gray-50 p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-gray-100 gap-1 min-w-max md:min-w-0">
            {[
              { id: 'familias', label: 'Famílias', icon: Heart },
              { id: 'membros', label: 'Membros', icon: Users },
              { id: 'mensalidades', label: 'Mensalidades', icon: DollarSign },
              { id: 'eventos', label: 'Metas Equipe', icon: Ticket },
              { id: 'historico', label: 'Extrato', icon: History }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-shrink-0 px-3 md:px-5 py-2 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest transition-all flex items-center justify-center gap-1 md:gap-2 ${activeTab === tab.id ? 'bg-white shadow-xl text-blue-600 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" /> 
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          </div>
        </div>
      </div>

      {/* ABA FAMILIAS */}
      {activeTab === 'familias' && (
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-xl md:text-2xl font-black text-gray-900">Famílias da Equipe</h2>
            {groupedMembers.length > 0 && (
              <button
                onClick={handleCreateFamily}
                className="w-full sm:w-auto px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden xs:inline">Criar Nova Família</span>
                <span className="xs:hidden">Nova Família</span>
              </button>
            )}
          </div>

          {/* PRÓXIMOS ANIVERSARIANTES */}
          {upcomingBirthdays.length > 0 && (
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200 rounded-2xl md:rounded-3xl p-4 md:p-6">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl md:rounded-2xl flex items-center justify-center">
                  <Cake className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black text-gray-900">🎉 Próximos Aniversariantes</h3>
                  <p className="text-[10px] md:text-xs text-gray-600 font-bold">Nos próximos 30 dias</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                {upcomingBirthdays.map(birthday => (
                  <div 
                    key={birthday.member.id}
                    className={`bg-white rounded-xl md:rounded-2xl p-3 md:p-4 border-2 transition-all hover:shadow-lg cursor-pointer ${
                      birthday.isToday ? 'border-pink-400 shadow-lg' : 'border-pink-100'
                    }`}
                    onClick={() => navigate(`/mfcistas/${birthday.member.id}`)}
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 text-white flex items-center justify-center font-black text-base md:text-lg flex-shrink-0">
                        {birthday.member.name.substring(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 leading-tight truncate">
                          {birthday.member.name}
                        </p>
                        <p className="text-xs font-bold text-gray-600">
                          {birthday.isToday ? (
                            <span className="text-pink-600">🎂 Hoje! {birthday.age} anos</span>
                          ) : birthday.daysUntil === 1 ? (
                            <span className="text-purple-600">🎈 Amanhã - {birthday.age} anos</span>
                          ) : (
                            <span className="text-gray-600">
                              {birthday.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {birthday.age} anos
                            </span>
                          )}
                        </p>
                        {birthday.daysUntil > 1 && (
                          <p className="text-[10px] font-bold text-gray-400">
                            {birthday.daysUntil} dias
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ESTADO VAZIO - SEM FAMÍLIAS */}
          {groupedMembers.length === 0 && (
            <div className="flex items-center justify-center min-h-[500px]">
              <div className="text-center max-w-2xl px-8">
                <div className="mb-8 relative">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center animate-pulse">
                    <Heart className="w-16 h-16 text-purple-400" />
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-purple-200 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                </div>
                
                <h3 className="text-3xl font-black text-gray-900 mb-4">
                  👨‍👩‍👧‍👦 Nenhuma Família Criada
                </h3>
                
                <p className="text-gray-600 mb-3 text-lg leading-relaxed">
                  As famílias ajudam a organizar os membros da sua equipe por núcleo familiar.
                </p>
                
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                  {availableMembers.length > 0 ? (
                    <>
                      Você tem <span className="font-black text-purple-600">{availableMembers.length} membro(s)</span> disponível(is) para criar sua primeira família!
                      <br />
                      <span className="text-xs text-gray-400 mt-2 block">
                        Vincule membros do mesmo núcleo familiar (esposos, filhos) para facilitar o controle de mensalidades e eventos.
                      </span>
                    </>
                  ) : (
                    <>
                      Todos os membros da equipe já estão vinculados a famílias.
                      <br />
                      <span className="text-xs text-gray-400 mt-2 block">
                        Cadastre novos membros para criar mais famílias.
                      </span>
                    </>
                  )}
                </p>

                {availableMembers.length > 0 && (
                  <button
                    onClick={handleCreateFamily}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-black text-base uppercase tracking-wider shadow-2xl hover:shadow-3xl hover:scale-105 transition-all active:scale-95 flex items-center gap-3 mx-auto"
                  >
                    <UserPlus className="w-6 h-6" />
                    Criar Primeira Família
                  </button>
                )}

                {availableMembers.length === 0 && (
                  <button
                    onClick={() => navigate('/mfcistas')}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-base uppercase tracking-wider shadow-2xl hover:shadow-3xl hover:scale-105 transition-all active:scale-95 flex items-center gap-3 mx-auto"
                  >
                    <Users className="w-6 h-6" />
                    Cadastrar Novos Membros
                  </button>
                )}
              </div>
            </div>
          )}

          {/* LISTA DE FAMÍLIAS */}
          {groupedMembers.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
              {groupedMembers.map((group, idx) => {
              const progressPercent = Math.round((group.monthsStatus.filter((s: boolean) => s).length / viewMonth) * 100);
              const isLate = group.atrasos > 0;
              const isExpanded = expandedFamily === group.familyName || expandedFamily === `group_${idx}`;
              const familyKey = group.familyName || `group_${idx}`;

              return (
                <div
                  key={idx}
                  className={`bg-white rounded-2xl md:rounded-[2.5rem] p-4 md:p-6 lg:p-8 border-2 transition-all ${
                    isLate ? 'border-red-100 hover:border-red-300' : 'border-emerald-100 hover:border-emerald-300'
                  } ${isExpanded ? 'shadow-2xl' : 'hover:shadow-2xl'}`}
                >
                  {/* HEADER DA FAMÍLIA - CLICÁVEL */}
                  <div onClick={() => setExpandedFamily(isExpanded ? null : familyKey)} className="cursor-pointer">
                    <div className="flex items-start justify-between mb-4 md:mb-6 gap-2">
                      <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
                          isLate ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {group.type === 'couple' ? <Heart className="w-6 h-6 md:w-8 md:h-8" /> : <Users className="w-6 h-6 md:w-8 md:h-8" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base md:text-xl font-black text-gray-900 leading-none mb-1 md:mb-2 truncate">{group.displayName}</h3>
                          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                            {group.familyName && !group.familyName.startsWith('sem_familia_') && (
                              <span className="text-[10px] md:text-xs font-black text-purple-600 bg-purple-50 px-2 md:px-3 py-1 rounded-full whitespace-nowrap">
                                👨‍👩‍👧‍👦 Família {group.familyName}
                              </span>
                            )}
                            <span className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                              {group.members.length} {group.members.length === 1 ? 'membro' : 'membros'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2 md:gap-3 flex-shrink-0">
                        <div className="hidden sm:block">
                          <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Progresso {viewYear}</p>
                          <p className={`text-2xl md:text-3xl font-black ${
                            progressPercent === 100 ? 'text-emerald-600' : progressPercent >= 75 ? 'text-blue-600' : progressPercent >= 50 ? 'text-amber-600' : 'text-red-600'
                          }`}>{progressPercent}%</p>
                        </div>
                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center transition-all ${
                          isExpanded ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isExpanded ? <ChevronUp className="w-4 h-4 md:w-5 md:h-5" /> : <ChevronDown className="w-4 h-4 md:w-5 md:h-5" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MEMBROS DA FAMÍLIA - VERSÃO RESUMIDA */}
                  {!isExpanded && (
                  <div className="bg-gray-50 rounded-xl md:rounded-2xl p-3 md:p-6 mb-4 md:mb-6 space-y-2 md:space-y-3">
                    <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 md:mb-3">Membros da Família</p>
                    {group.members.map((member: Member) => (
                      <div key={member.id} className="flex items-center justify-between bg-white rounded-lg md:rounded-xl p-2 md:p-3 hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-black text-xs md:text-sm flex-shrink-0">
                            {member.name.substring(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs md:text-sm font-bold text-gray-900 truncate">{member.nickname || member.name.split(' ')[0]}</p>
                            <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                              {member.relationshipType || 'Titular'}
                            </p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {member.paysMonthly === false ? (
                            <span className="text-[8px] font-black px-3 py-1 rounded-full bg-gray-100 text-gray-500">Isento</span>
                          ) : (
                            <span className="text-[8px] font-black px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                              R$ {group.amountPerPerson.toFixed(2)}/mês
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  )}

                  {/* CONTEÚDO EXPANDIDO - DETALHES COMPLETOS */}
                  {isExpanded && (
                    <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t-2 border-gray-100 animate-in slide-in-from-top duration-300">
                      <div className="mb-3 md:mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <h4 className="text-xs md:text-sm font-black text-gray-700 uppercase tracking-wider">📋 Informações Detalhadas</h4>
                        <div className="flex items-center gap-1.5 md:gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const relationships: {[key: string]: string} = {};
                              group.members.forEach((m: Member) => {
                                relationships[m.id] = m.relationshipType || 'Outro';
                              });
                              setEditingFamily({
                                name: group.familyName || '',
                                memberIds: group.members.map((m: Member) => m.id),
                                relationships
                              });
                              setShowFamilyModal(true);
                            }}
                            className="px-2.5 md:px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold hover:bg-purple-200 transition-all flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            <span className="hidden xs:inline">Editar</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFamily(group.familyName, group.members.map((m: Member) => m.id));
                            }}
                            className="px-2.5 md:px-3 py-1.5 bg-red-100 text-red-700 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold hover:bg-red-200 transition-all flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            <span className="hidden xs:inline">Excluir</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 md:gap-4 mb-4 md:mb-6">
                        {group.members.map((member: Member) => {
                          const age = calculateAge(member.dob || '');
                          const maritalStatusText = {
                            'Solteiro(a)': '💙 Solteiro(a)',
                            'Casado(a)': '💍 Casado(a)',
                            'Divorciado(a)': '📋 Divorciado(a)',
                            'Viúvo(a)': '🕊️ Viúvo(a)'
                          }[member.maritalStatus || ''] || '❓ Não informado';

                          return (
                            <div 
                              key={member.id} 
                              className="bg-gradient-to-br from-white to-gray-50 rounded-xl md:rounded-2xl p-3 md:p-5 border-2 border-gray-100 hover:border-purple-200 transition-all hover:shadow-lg cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/mfcistas/${member.id}`);
                              }}
                            >
                              <div className="flex items-start gap-2 md:gap-4">
                                {/* Avatar Grande */}
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-black text-lg md:text-2xl shadow-lg flex-shrink-0">
                                  {member.name.substring(0, 1)}
                                </div>
                                
                                {/* Informações Principais */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2 md:mb-3">
                                    <div className="min-w-0 flex-1">
                                      <h5 className="text-sm md:text-lg font-black text-gray-900 leading-none mb-1 truncate">
                                        {member.name}
                                      </h5>
                                      <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                                        <span className="text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg bg-purple-100 text-purple-700">
                                          {member.relationshipType || 'Titular'}
                                        </span>
                                        {member.nickname && (
                                          <span className="text-[10px] md:text-xs text-gray-500 truncate">
                                            "{member.nickname}"
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Grid de Informações Compacto */}
                                  <div className="grid grid-cols-2 gap-1.5 md:gap-2 text-[10px] md:text-xs">
                                    {age !== null && (
                                      <div className="flex items-center gap-1 md:gap-2">
                                        <Cake className="w-3 h-3 md:w-3.5 md:h-3.5 text-pink-500 flex-shrink-0" />
                                        <span className="font-bold text-gray-700">{age} anos</span>
                                      </div>
                                    )}
                                    
                                    {member.profession && (
                                      <div className="flex items-center gap-1 md:gap-2">
                                        <Briefcase className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-500 flex-shrink-0" />
                                        <span className="font-bold text-gray-700 truncate">{member.profession}</span>
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center gap-1 md:gap-2 col-span-2">
                                      <span className="text-sm md:text-base flex-shrink-0">💕</span>
                                      <span className="font-bold text-gray-700 truncate">{maritalStatusText}</span>
                                    </div>
                                    
                                    {member.paysMonthly === false ? (
                                      <div className="col-span-2 flex items-center gap-1 md:gap-2 bg-gray-50 rounded-md md:rounded-lg px-1.5 md:px-2 py-1">
                                        <span>🎓</span>
                                        <span className="font-black text-gray-600">Isento de Pagamento</span>
                                      </div>
                                    ) : (
                                      <div className="col-span-2 flex items-center gap-1 md:gap-2 bg-emerald-50 rounded-md md:rounded-lg px-1.5 md:px-2 py-1">
                                        <span>💳</span>
                                        <span className="font-black text-emerald-700">R$ {group.amountPerPerson.toFixed(2)}/mês</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* BARRA DE PROGRESSO MENSAL */}
                  <div className="mb-4 md:mb-6">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">Pagamentos por Mês</p>
                      <p className="text-[8px] md:text-[9px] font-black text-gray-600">
                        {group.monthsStatus.slice(0, viewMonth).filter((s: boolean) => s).length}/{viewMonth} meses
                      </p>
                    </div>
                    <div className="grid grid-cols-12 gap-0.5 md:gap-1">
                      {group.monthsStatus.map((isPaid: boolean, mIdx: number) => {
                        const monthNum = mIdx + 1;
                        const isFuture = monthNum > viewMonth;
                        
                        let bgColor = 'bg-gray-100';
                        if (isPaid) bgColor = 'bg-emerald-400';
                        else if (!isFuture) bgColor = 'bg-red-400';
                        
                        return (
                          <div key={mIdx} className="relative group/month">
                            <div className={`h-6 md:h-8 rounded-md md:rounded-lg ${bgColor} transition-all hover:scale-110 cursor-pointer`}></div>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] font-bold px-2 py-1 rounded opacity-0 group-hover/month:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][mIdx]} {viewYear}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ESTATÍSTICAS E AÇÕES */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 md:pt-6 border-t-2 border-gray-100">
                    <div className="flex flex-wrap gap-3 md:gap-6">
                      <div>
                        <p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor Mensal</p>
                        <p className="text-base md:text-lg font-black text-blue-600">
                          R$ {(group.amountPerPerson * group.payingMembers.length).toFixed(2)}
                        </p>
                      </div>
                      {isLate && (
                        <div>
                          <p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Pendências</p>
                          <p className="text-base md:text-lg font-black text-red-600">{group.atrasos} {group.atrasos === 1 ? 'mês' : 'meses'}</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentForm({ ...paymentForm, year: viewYear, months: [viewMonth], amountPerMonth: group.amountPerPerson, observation: '' });
                        setSelectedForPayment({
                          memberIds: group.members.map((m: Member) => m.id),
                          displayName: group.displayName,
                          amountPerPerson: group.amountPerPerson,
                          payingMembers: group.payingMembers
                        });
                        setShowPayModal(true);
                      }}
                      className="w-full sm:w-auto px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-wider shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3 md:w-4 md:h-4" /> <span>Lançar</span>
                    </button>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'membros' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {membersState.map(m => (
            <div key={m.id} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer group" onClick={() => navigate(`/mfcistas/${m.id}`)}>
              <div className="flex items-center gap-2 md:gap-4 mb-4 md:mb-6">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg md:text-xl group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0">
                  {m.name.substring(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-gray-900 leading-tight text-sm md:text-base truncate">{m.name}</h4>
                  <p className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest truncate">{m.nickname || 'Membro'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-gray-50 gap-2">
                  <span className="text-[8px] md:text-[9px] font-black text-gray-300 uppercase tracking-widest italic truncate">{m.movementRoles[0] || 'Ativo'}</span>
                  <span className={`px-2 md:px-4 py-1 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest flex-shrink-0 ${m.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'mensalidades' && (
        <div className="space-y-4 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          {/* AVISO DE CONFIGURAÇÃO - Somente para Admins */}
          {userRole === UserRoleType.ADMIN && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl md:rounded-2xl p-3 md:p-4 flex items-start gap-2 md:gap-3">
              <SettingsIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs md:text-sm font-black text-blue-900">Valor Padrão da Mensalidade</h4>
                <p className="text-[10px] md:text-xs text-blue-700 mt-1">
                  O valor atual é <span className="font-black">R$ {defaultMonthlyAmount.toFixed(2)}</span> por mês. 
                  Você pode alterar este valor nas <span className="font-black">Configurações do Sistema</span> (menu lateral → Configurações → Financeiro).
                </p>
              </div>
            </div>
          )}

          {/* RESUMO E FILTROS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
             <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4 md:space-y-6">
                <h3 className="text-base md:text-xl font-black text-gray-900 tracking-tight">Filtro de Visão</h3>
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Ano Exercício</label>
                    <select className="w-full bg-gray-50 border border-gray-100 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 text-[10px] md:text-xs font-black outline-none" value={viewYear} onChange={(e) => setViewYear(parseInt(e.target.value))}>
                      {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">mês Atual</label>
                    <select className="w-full bg-gray-50 border border-gray-100 rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 text-[10px] md:text-xs font-black outline-none" value={viewMonth} onChange={(e) => setViewMonth(parseInt(e.target.value))}>
                      {monthNames.map((n, i) => <option key={i} value={i+1}>{n}</option>)}
                    </select>
                  </div>
                </div>
                <div className="p-3 md:p-4 bg-blue-50 rounded-xl md:rounded-2xl border border-blue-100 flex items-center justify-between gap-2">
                    <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                    <div className="text-right min-w-0">
                        <p className="text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">Esperado no mês</p>
                        <p className="text-base md:text-lg font-black text-blue-700">
                          R$ {(() => {
                            const payingMembers = membersState.filter(m => m.paysMonthly !== false);
                            let total = 0;
                            payingMembers.forEach(m => {
                              const isInCouple = payingMembers.some(other => 
                                other.id !== m.id && 
                                other.familyName === m.familyName && 
                                other.familyName && 
                                ((m.relationshipType === 'Titular' && other.relationshipType === 'Cônjuge') ||
                                 (m.relationshipType === 'Cônjuge' && other.relationshipType === 'Titular'))
                              );
                              total += isInCouple ? defaultMonthlyAmount / 2 : defaultMonthlyAmount;
                            });
                            return total.toFixed(2);
                          })()}
                        </p>
                    </div>
                </div>
             </div>

             <div className="bg-emerald-600 p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
                <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 md:w-32 md:h-32 opacity-10 group-hover:scale-110 transition-transform" />
                <p className="text-[9px] md:text-[10px] font-black text-emerald-200 uppercase tracking-[0.2em] mb-1">Arrecadado em {monthNames[viewMonth-1]}</p>
                <h3 className="text-2xl md:text-4xl font-black tracking-tighter leading-none">R$ {financeStats.monthlyTotal.toFixed(2)}</h3>
                <div className="mt-4 md:mt-8 pt-3 md:pt-6 border-t border-emerald-500/30 flex items-center justify-between">
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Total {viewYear}:</span>
                    <span className="text-base md:text-xl font-black">R$ {financeStats.yearlyTotal.toFixed(2)}</span>
                </div>
             </div>

             <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-red-100 shadow-xl shadow-red-50 relative overflow-hidden group">
                <AlertTriangle className="absolute -right-4 -bottom-4 w-24 h-24 md:w-32 md:h-32 text-red-500 opacity-5 group-hover:scale-110 transition-transform" />
                <p className="text-[9px] md:text-[10px] font-black text-red-400 uppercase tracking-[0.2em] mb-1">Pendências Acumuladas</p>
                <h3 className="text-2xl md:text-4xl font-black text-red-600 tracking-tighter leading-none">R$ {financeStats.pendingAmount.toFixed(2)}</h3>
                <p className="mt-3 md:mt-4 text-[8px] md:text-[9px] font-bold text-gray-400 italic">Zé, esse é o valor que ainda falta entrar no caixa este ano.</p>
             </div>
          </div>

          {/* LISTA DE MENSALIDADES COM TIMELINE */}
          <div className="bg-white rounded-2xl md:rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
             <header className="p-4 md:p-8 border-b border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/20">
                <div>
                   <h3 className="text-base md:text-xl font-black text-gray-900 tracking-tight">Fluxo de Caixa da Equipe</h3>
                   <p className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Legenda: <span className="text-emerald-500">● Pago</span> | <span className="text-red-500">● Atraso</span> | <span className="text-gray-300">○ Futuro</span></p>
                </div>
                <div className="px-3 md:px-4 py-1.5 md:py-2 bg-white rounded-lg md:rounded-xl border border-gray-100 text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest shadow-sm">
                   {groupedMembers.length} Unidades Familiares
                </div>
             </header>

             <div className="divide-y divide-gray-50">
                {groupedMembers.map((group, idx) => (
                  <div key={idx} className="p-4 md:p-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-8 hover:bg-gray-50/50 transition-all">
                    <div className="flex items-center gap-3 md:gap-6 min-w-0">
                      <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${group.atrasos === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {group.type === 'couple' ? <Heart className="w-5 h-5 md:w-7 md:h-7" /> : <Users className="w-5 h-5 md:w-7 md:h-7" />}
                      </div>
                      <div className="space-y-1 md:space-y-2 min-w-0 flex-1">
                        <div>
                          <h4 className="text-sm md:text-lg font-black text-gray-900 leading-none truncate">{group.displayName}</h4>
                          {group.familyName && (
                            <p className="text-[8px] md:text-[9px] font-black text-purple-600 uppercase tracking-widest mt-1">
                              👨‍👩‍👧‍👦 Família {group.familyName}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 md:gap-2 flex-wrap">
                          {group.members.map((member: Member) => (
                            <span 
                              key={member.id} 
                              className={`text-[8px] font-bold px-2 py-1 rounded-lg ${
                                member.paysMonthly === false 
                                  ? 'bg-gray-100 text-gray-500' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {member.nickname || member.name.split(' ')[0]} 
                              {member.relationshipType && member.relationshipType !== 'Titular' && ` (${member.relationshipType})`}
                              {member.paysMonthly === false && ' - Isento'}
                            </span>
                          ))}
                        </div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          {group.atrasos === 0 ? '✅ Em dia' : `⚠️ ${group.atrasos} meses pendentes`}
                          {' • '}
                          <span className="text-blue-600">
                            R$ {group.amountPerPerson.toFixed(2)}/mês
                            {group.type === 'couple' && ' (cada)'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* LINHA DO TEMPO JAN-DEZ */}
                    <div className="flex-1 overflow-x-auto no-scrollbar">
                      <div className="flex items-center gap-1 md:gap-2 min-w-[400px]">
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
                              <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[7px] md:text-[8px] font-black uppercase transition-all shadow-sm ${bgColor} ${textColor}`}>
                                {shortMonths[mIdx]}
                              </div>
                              <div className={`w-1 h-1 rounded-full ${isPaid ? 'bg-emerald-400' : isFuture ? 'bg-gray-200' : 'bg-red-400 animate-pulse'}`}></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                      <button 
                        onClick={() => {
                          setPaymentForm({ ...paymentForm, year: viewYear, months: [viewMonth], amountPerMonth: group.amountPerPerson, observation: '' });
                          setSelectedForPayment({ 
                            memberIds: group.members.map(m => m.id), 
                            displayName: group.displayName,
                            amountPerPerson: group.amountPerPerson,
                            payingMembers: group.payingMembers
                          });
                          setShowPayModal(true);
                        }}
                        className="w-full sm:w-auto px-4 md:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden xs:inline">Lançar Pagamento</span><span className="xs:hidden">Lançar</span>
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'eventos' && (
        <div className="space-y-4 md:space-y-8 animate-in slide-in-from-right-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            {events.map(event => {
               const teamQuota = event.teamQuotas.find(q => q.teamId === teamId);
               const teamSales = localSales.filter(s => s.eventId === event.id).reduce((acc, s) => acc + s.amount, 0);
               const progress = teamQuota ? (teamSales / teamQuota.quotaValue) * 100 : 0;

               return (
                 <div key={event.id} className="bg-white p-4 md:p-8 rounded-2xl md:rounded-[3rem] border border-gray-100 shadow-sm space-y-4 md:space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
                             <Ticket className="w-5 h-5 md:w-6 md:h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                             <h3 className="text-sm md:text-lg font-black text-gray-900 leading-tight truncate">{event.name}</h3>
                             <p className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-widest">Meta da nossa equipe</p>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                       <div className="p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100">
                          <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Cota Equipe</p>
                          <p className="text-base md:text-xl font-black text-gray-900">R$ {teamQuota?.quotaValue.toFixed(2)}</p>
                       </div>
                       <div className="p-3 md:p-4 bg-blue-50 rounded-xl md:rounded-2xl border border-blue-100">
                          <p className="text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">já Vendido</p>
                          <p className="text-base md:text-xl font-black text-blue-700">R$ {teamSales.toFixed(2)}</p>
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
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-5 rounded-xl border-2 border-blue-100 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Unidade Familiar</p>
                            <p className="text-base font-black text-gray-800">{selectedForPayment.displayName}</p>
                            <div className="flex gap-2 flex-wrap mt-2">
                              {selectedForPayment.payingMembers.map((member: Member) => (
                                <span 
                                  key={member.id} 
                                  className="text-[8px] font-bold px-2 py-1 rounded-lg bg-blue-500 text-white"
                                >
                                  {member.nickname || member.name.split(' ')[0]}
                                  {member.relationshipType && ` (${member.relationshipType})`}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Valor por Pessoa</p>
                            <p className="text-lg font-black text-blue-600">R$ {selectedForPayment.amountPerPerson.toFixed(2)}</p>
                            {selectedForPayment.payingMembers.length > 1 && (
                              <p className="text-[8px] font-semibold text-blue-500 mt-1">
                                Total: R$ {(selectedForPayment.amountPerPerson * selectedForPayment.payingMembers.length).toFixed(2)}/mês
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center">
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Total a Lançar</p>
                          <p className="text-2xl font-black text-emerald-600">
                            R$ {(paymentForm.months.length * selectedForPayment.amountPerPerson * selectedForPayment.payingMembers.length).toFixed(2)}
                          </p>
                          <p className="text-[9px] font-semibold text-gray-500 mt-1">
                            {paymentForm.months.length} {paymentForm.months.length === 1 ? 'mês' : 'meses'} × {selectedForPayment.payingMembers.length} {selectedForPayment.payingMembers.length === 1 ? 'pessoa' : 'pessoas'}
                          </p>
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

      {/* MODAL DE CRIAÇÃO/EDIÇÃO DE FAMÍLIAS */}
      {showFamilyModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border-2 border-purple-100 animate-in zoom-in-95 duration-500">
            <div className="p-8 border-b-2 border-purple-100 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl flex items-center justify-center shadow-xl">
                    <Heart className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Criar Nova Família</h3>
                    <p className="text-xs text-purple-600 font-bold uppercase tracking-wider mt-1">Organize os membros em unidades familiares</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowFamilyModal(false);
                    setEditingFamily(null);
                  }}
                  className="w-10 h-10 rounded-xl bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Nome da Família */}
              <div>
                <label className="block text-sm font-black text-gray-700 uppercase tracking-wider mb-3">
                  Nome da Família *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Silva, Santos, Oliveira..."
                  value={editingFamily?.name || ''}
                  onChange={(e) => setEditingFamily(prev => prev ? {...prev, name: e.target.value} : {name: e.target.value, memberIds: []})}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-6 py-4 text-lg font-bold text-gray-800 focus:ring-4 focus:ring-purple-100 focus:border-purple-400 transition-all outline-none"
                />
              </div>

              {/* Seleção de Membros */}
              <div>
                <label className="block text-sm font-black text-gray-700 uppercase tracking-wider mb-3">
                  Membros da Família * ({editingFamily?.memberIds.length || 0} selecionados)
                </label>
                
                {availableMembers.length === 0 ? (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                    <p className="text-sm font-bold text-amber-800">Todos os membros já estão em famílias</p>
                    <p className="text-xs text-amber-600 mt-1">Edite os membros existentes para removê-los de suas famílias atuais</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
                      {availableMembers.map(member => {
                        const isSelected = editingFamily?.memberIds.includes(member.id);
                        return (
                          <div
                            key={member.id}
                            onClick={() => {
                              setEditingFamily(prev => {
                                if (!prev) return {name: '', memberIds: [member.id], relationships: {[member.id]: 'Titular'}};
                                const newIds = isSelected 
                                  ? prev.memberIds.filter(id => id !== member.id)
                                  : [...prev.memberIds, member.id];
                                const newRelationships = {...prev.relationships};
                                if (isSelected) {
                                  delete newRelationships[member.id];
                                } else {
                                  newRelationships[member.id] = newIds.length === 1 ? 'Titular' : 'Outro';
                                }
                                return {...prev, memberIds: newIds, relationships: newRelationships};
                              });
                            }}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                              isSelected 
                                ? 'bg-purple-50 border-purple-400 shadow-lg' 
                                : 'bg-white border-gray-200 hover:border-purple-200 hover:shadow-md'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-all ${
                              isSelected 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {isSelected ? <Check className="w-6 h-6" /> : member.name.substring(0, 1)}
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500 font-semibold mt-1">
                                {member.maritalStatus} • {member.gender}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Relacionamentos dos membros selecionados */}
                    {editingFamily?.memberIds && editingFamily.memberIds.length > 0 && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5">
                        <h4 className="text-sm font-black text-blue-900 mb-4 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Definir Vínculos Familiares
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {editingFamily.memberIds.map(memberId => {
                            const member = membersState.find(m => m.id === memberId);
                            if (!member) return null;
                            return (
                              <div key={memberId} className="bg-white rounded-xl p-3 border border-blue-100">
                                <label className="block text-xs font-bold text-gray-600 mb-2">
                                  {member.name.split(' ')[0]}
                                </label>
                                <select
                                  value={editingFamily.relationships[memberId] || 'Outro'}
                                  onChange={(e) => {
                                    setEditingFamily(prev => {
                                      if (!prev) return prev;
                                      return {
                                        ...prev,
                                        relationships: {
                                          ...prev.relationships,
                                          [memberId]: e.target.value
                                        }
                                      };
                                    });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all outline-none"
                                >
                                  <option value="Titular">Titular</option>
                                  <option value="Cônjuge">Cônjuge</option>
                                  <option value="Filho(a)">Filho(a)</option>
                                  <option value="Irmão/Irmã">Irmão/Irmã</option>
                                  <option value="Neto(a)">Neto(a)</option>
                                  <option value="Amigo(a)">Amigo(a)</option>
                                  <option value="Primo(a)">Primo(a)</option>
                                  <option value="Tio/Tia">Tio/Tia</option>
                                  <option value="Sobrinho(a)">Sobrinho(a)</option>
                                  <option value="Avô/Avó">Avô/Avó</option>
                                  <option value="Sogro(a)">Sogro(a)</option>
                                  <option value="Outro">Outro</option>
                                </select>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
                <p className="text-xs text-blue-800 font-semibold leading-relaxed">
                  <strong>💡 Dica:</strong> Selecione os membros da família e defina o vínculo de cada um (Titular, Cônjuge, Filho(a), etc). 
                  O vínculo ajuda a organizar e identificar os membros dentro da família.
                </p>
              </div>
            </div>

            <div className="p-6 border-t-2 border-gray-100 bg-gray-50 flex gap-4">
              <button
                onClick={handleSaveFamily}
                disabled={!editingFamily?.name || (editingFamily?.memberIds.length || 0) === 0}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl hover:shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
              >
                <Save className="w-5 h-5" />
                Criar Família
              </button>
              <button
                onClick={() => {
                  setShowFamilyModal(false);
                  setEditingFamily(null);
                }}
                className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider text-gray-600 hover:bg-gray-200 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTeamView;



