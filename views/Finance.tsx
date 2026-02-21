
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Wallet, 
  Search, 
  Filter, 
  ChevronRight, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  DollarSign,
  Printer
} from 'lucide-react';
import { api } from '../api';
import { MemberStatus, Member, BaseTeam, Payment } from '../types';

interface FinanceViewProps {
  cityId: string;
}

const FinanceView: React.FC<FinanceViewProps> = ({ cityId }) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teams, setTeams] = useState<BaseTeam[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [defaultMonthlyAmount, setDefaultMonthlyAmount] = useState(30);

  const loadData = () => {
    api.getTeams().then(setTeams).catch(() => setTeams([]));
    api.getMembers().then(setMembers).catch(() => setMembers([]));
    api.getPayments().then(setPayments).catch(() => setPayments([]));
    api.getFinancialConfig().then((config: any) => {
      if (config && config.monthlyPaymentAmount) {
        setDefaultMonthlyAmount(parseFloat(config.monthlyPaymentAmount));
      }
    }).catch(() => {});
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

  // Filtragem de equipes pela cidade
  const cityTeams = teams.filter(t => searchTerm === '' || t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getTeamStats = (teamId: string) => {
    const teamMembers = members.filter(m => m.teamId === teamId && m.status === 'Ativo');
    const teamPayments = payments.filter(p => {
      if (p.teamId !== teamId) return false;
      return p.referenceMonth === `${selectedMonth}/${selectedYear}`;
    });
    
    const paidMembers = new Set(teamPayments.map(p => p.memberId));
    const paidCount = paidMembers.size;
    const totalAmount = teamPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return {
      total: teamMembers.length,
      paid: paidCount,
      percent: teamMembers.length > 0 ? (paidCount / teamMembers.length) * 100 : 0,
      amount: totalAmount
    };
  };

  // Calcular valor esperado considerando sistema de famílias (mesmo cálculo do MyTeam)
  const calculateExpectedAmount = (activeMembers: Member[]) => {
    const payingMembers = activeMembers.filter(m => m.paysMonthly !== false);
    let total = 0;
    
    payingMembers.forEach(m => {
      // Verifica se o membro está em um casal (para dividir o valor)
      const isInCouple = payingMembers.some(other => 
        other.id !== m.id && 
        other.familyName === m.familyName && 
        other.familyName && 
        ((m.relationshipType === 'Titular' && other.relationshipType === 'Cônjuge') ||
         (m.relationshipType === 'Cônjuge' && other.relationshipType === 'Titular'))
      );
      
      total += isInCouple ? defaultMonthlyAmount / 2 : defaultMonthlyAmount;
    });
    
    return total;
  };

  // Calcular estatísticas gerais
  const allActiveMembers = members.filter(m => m.status === 'Ativo');
  const allPayments = payments.filter(p => {
    return p.referenceMonth === `${selectedMonth}/${selectedYear}`;
  });
  
  const totalArrecadado = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paidMembersSet = new Set(allPayments.map(p => p.memberId));
  const totalPago = paidMembersSet.size;
  const totalEsperado = calculateExpectedAmount(allActiveMembers);
  const pendente = totalEsperado - totalArrecadado;
  const equipesEmDia = cityTeams.filter(t => getTeamStats(t.id).percent === 100).length;
  
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const renderTeamList = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Wallet className="w-6 h-6" /></div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-wider">{monthNames[selectedMonth - 1]}/{selectedYear}</span>
          </div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Total Arrecadado</h3>
          <p className="text-3xl font-bold text-gray-900 mt-1">R$ {totalArrecadado.toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Clock className="w-6 h-6" /></div>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase tracking-wider">{totalEsperado > 0 ? Math.round((totalArrecadado / totalEsperado) * 100) : 0}% da Meta</span>
          </div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Pendente Geral</h3>
          <p className="text-3xl font-bold text-gray-900 mt-1">R$ {Math.max(0, pendente).toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl"><CheckCircle2 className="w-6 h-6" /></div>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg uppercase tracking-wider">{totalPago} Pagos</span>
          </div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Equipes em Dia</h3>
          <p className="text-3xl font-bold text-gray-900 mt-1">{equipesEmDia} / {cityTeams.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-gray-800">Status das Equipes Base</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar equipe..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">
              <Printer className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {cityTeams.map(team => {
            const stats = getTeamStats(team.id);
            return (
              <div 
                key={team.id} 
                onClick={() => setSelectedTeamId(team.id)}
                className="p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-blue-50/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${stats.percent === 100 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {team.name.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{team.name}</h4>
                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                      <Users className="w-3 h-3" /> {stats.total} Membros Ativos
                    </p>
                  </div>
                </div>

                <div className="mt-4 md:mt-0 md:px-12 flex-1 max-w-xs">
                  <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1.5">
                    <span>arrecadação</span>
                    <span>{stats.paid} / {stats.total}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${stats.percent === 100 ? 'bg-green-500' : stats.percent > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: `${stats.percent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 md:mt-0 flex items-center gap-6">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${stats.percent === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                      {stats.percent === 100 ? 'EM DIA' : 'PENDENTE'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold">R$ {stats.amount.toFixed(2)} arrecadado</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderTeamDetail = () => {
    const team = teams.find(t => t.id === selectedTeamId);
    const teamMembers = members.filter(m => m.teamId === selectedTeamId && m.status === 'Ativo');
    
    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-300">
        <button 
          onClick={() => setSelectedTeamId(null)}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-xl border border-gray-100"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para lista de equipes
        </button>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{team?.name}</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg uppercase">Equipe Base</span>
            </div>
            <p className="text-gray-500 text-sm font-medium">Lançamentos referentes ao mês de <strong>{monthNames[selectedMonth - 1]}/{selectedYear}</strong></p>
          </div>
          <div className="flex gap-3">
             <button className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
               Lançar Lote Completo
             </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">MFCista</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Status Pagamento</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Data Lançamento</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">Valor</th>
                <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {teamMembers.map(member => {
                const payment = payments.find(p => {
                  if (p.memberId !== member.id) return false;
                  return p.referenceMonth === `${selectedMonth}/${selectedYear}`;
                });
                
                // Calcular valor esperado para este membro específico
                const teamPayingMembers = teamMembers.filter(m => m.paysMonthly !== false);
                const isInCouple = teamPayingMembers.some(other => 
                  other.id !== member.id && 
                  other.familyName === member.familyName && 
                  other.familyName && 
                  ((member.relationshipType === 'Titular' && other.relationshipType === 'Cônjuge') ||
                   (member.relationshipType === 'Cônjuge' && other.relationshipType === 'Titular'))
                );
                const memberExpectedAmount = member.paysMonthly === false ? 0 : (isInCouple ? defaultMonthlyAmount / 2 : defaultMonthlyAmount);
                
                const isPaid = !!payment;
                const paymentAmount = payment?.amount || memberExpectedAmount;
                const paymentDate = payment?.date ? new Date(payment.date).toLocaleDateString('pt-BR') : '---';
                
                return (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs uppercase">
                          {member.name.substring(0, 1)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-800">{member.name}</span>
                            {member.relationshipType && member.relationshipType !== 'Titular' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                {member.relationshipType}
                              </span>
                            )}
                          </div>
                          {member.familyName && (
                            <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest">
                              👨‍👩‍👧‍👦 Família {member.familyName}
                            </span>
                          )}
                          {member.paysMonthly === false && (
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                              🎓 Isento de Pagamento
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        {member.paysMonthly === false ? (
                          <span className="flex items-center gap-1.5 text-gray-400 text-xs font-bold uppercase tracking-tight">
                            <CheckCircle2 className="w-4 h-4" /> Isento
                          </span>
                        ) : isPaid ? (
                          <span className="flex items-center gap-1.5 text-green-600 text-xs font-bold uppercase tracking-tight">
                            <CheckCircle2 className="w-4 h-4" /> Pago
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-500 text-xs font-bold uppercase tracking-tight">
                            <Clock className="w-4 h-4" /> Pendente
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-gray-500">
                      {paymentDate}
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-gray-900">
                      R$ {paymentAmount.toFixed(2)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      {member.paysMonthly === false ? (
                        <span className="text-[10px] font-bold text-gray-300 uppercase">—</span>
                      ) : isPaid ? (
                        <button className="text-[10px] font-bold text-gray-400 uppercase hover:text-red-500 transition-colors">Estornar</button>
                      ) : (
                        <button className="bg-green-50 text-green-700 px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-green-100 transition-all border border-green-100">
                          Confirmar Pago
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Tesouraria Geral</h2>
          <p className="text-gray-500 font-medium">Gestão financeira de todas as Equipes Bases.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
           <Calendar className="w-5 h-5 text-gray-400 ml-2" />
           <select 
            className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
           >
             {monthNames.map((month, index) => (
               <option key={index} value={index + 1}>{month}</option>
             ))}
           </select>
           <span className="text-gray-300">/</span>
           <select 
            className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
           >
             {[2024, 2025, 2026, 2027].map(year => (
               <option key={year} value={year}>{year}</option>
             ))}
           </select>
        </div>
      </div>

      {selectedTeamId ? renderTeamDetail() : renderTeamList()}
    </div>
  );
};

export default FinanceView;




