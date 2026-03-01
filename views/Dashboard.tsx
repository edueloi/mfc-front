import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Layers,
  Baby,
  PersonStanding,
  ChevronDown,
  Calendar,
  BarChart3,
  TrendingUp,
  Filter,
  Search,
  Check,
  X,
  Sparkles,
  SlidersHorizontal,
  CircleDollarSign
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';
import { api } from '../api';
import { BaseTeam } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState('06');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [chartType, setChartType] = useState<'bar' | 'trend'>('bar');
  const [teams, setTeams] = useState<BaseTeam[]>([]);
  const [summary, setSummary] = useState<any>({
    stats: { totalMembers: 0, teamsCount: 0, male: 0, female: 0, activeMembers: 0, children: 0, youth: 0, adult: 0, elderly: 0 },
    barData: [],
    trendData: [],
    pieData: []
  });

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [isTeamFilterOpen, setIsTeamFilterOpen] = useState(false);
  const [minimumPerformance, setMinimumPerformance] = useState(0);
  const teamFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teamFilterRef.current && !teamFilterRef.current.contains(event.target as Node)) {
        setIsTeamFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadTeams = () => {
      api.getTeams().then(setTeams).catch(() => setTeams([]));
    };

    loadTeams();
    const handleFocus = () => loadTeams();
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(loadTeams, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const loadSummary = () => {
      api
        .getDashboardSummary(selectedMonth, selectedYear)
        .then(setSummary)
        .catch(() =>
          setSummary({
            stats: { totalMembers: 0, teamsCount: 0, male: 0, female: 0, activeMembers: 0, children: 0, youth: 0, adult: 0, elderly: 0 },
            barData: [],
            trendData: [],
            pieData: []
          })
        );
    };

    loadSummary();
    const handleFocus = () => loadSummary();
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(loadSummary, 30000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [selectedMonth, selectedYear]);

  const stats = [
    { label: 'Total MFCistas', value: String(summary.stats.totalMembers || 0), icon: Users, color: 'bg-blue-600', trend: 'Membros totais', view: 'mfcistas' },
    { label: 'Jovens e Crianças', value: String((summary.stats.children || 0) + (summary.stats.youth || 0)), icon: Baby, color: 'bg-indigo-600', trend: 'Base do Movimento' },
    { label: '3ª Idade', value: String(summary.stats.elderly || 0), icon: PersonStanding, color: 'bg-rose-600', trend: 'Nossa Fortaleza' },
    { label: 'Equipes Base', value: String(summary.stats.teamsCount || 0), icon: Layers, color: 'bg-emerald-600', trend: 'Ativas na Unidade', view: 'equipes' }
  ];

  const filteredTeamsForSelect = useMemo(
    () => teams.filter((team) => team.name.toLowerCase().includes(teamSearch.toLowerCase())),
    [teamSearch, teams]
  );

  const barData = useMemo(() => {
    const allData = summary.barData || [];
    const byTeam = selectedTeamIds.length === 0 ? allData : allData.filter((d: any) => selectedTeamIds.includes(d.id));
    return byTeam.filter((d: any) => (d.value || 0) >= minimumPerformance);
  }, [selectedTeamIds, summary, minimumPerformance]);

  const trendData = useMemo(() => {
    const raw = summary.trendData || [];
    return raw.map((item: any, index: number) => ({ ...item, projecao: Math.min(100, (item.value || 0) + (index % 2 === 0 ? 5 : 2)) }));
  }, [summary]);

  const pieData = summary.pieData || [];

  const months = [
    { v: '01', l: 'Janeiro' }, { v: '02', l: 'Fevereiro' }, { v: '03', l: 'Março' },
    { v: '04', l: 'Abril' }, { v: '05', l: 'Maio' }, { v: '06', l: 'Junho' },
    { v: '07', l: 'Julho' }, { v: '08', l: 'Agosto' }, { v: '09', l: 'Setembro' },
    { v: '10', l: 'Outubro' }, { v: '11', l: 'Novembro' }, { v: '12', l: 'Dezembro' }
  ];

  const toggleTeamSelection = (id: string) => {
    setSelectedTeamIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const removeTeamTag = (id: string) => {
    setSelectedTeamIds((prev) => prev.filter((item) => item !== id));
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-900 p-5 sm:p-8 shadow-2xl text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Dashboard Inteligente da Unidade</h2>
            <p className="text-blue-100 text-sm sm:text-base mt-2">Visão executiva com filtros avançados, tendências e alertas de performance.</p>
          </div>
          <button onClick={() => navigate('/relatorios')} className="inline-flex items-center gap-2 bg-white text-slate-900 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-xl transition-all">
            <Sparkles className="w-4 h-4" /> Abrir relatórios
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group" onClick={() => stat.view && navigate(`/${stat.view}`)}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className={`${stat.color} p-3 rounded-2xl text-white shadow-lg`}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg">MFC Tatuí</span>
            </div>
            <h3 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</h3>
            <p className="text-3xl font-black text-gray-900 mt-1 tracking-tighter">{stat.value}</p>
            <p className="text-[10px] font-bold text-gray-300 mt-2 uppercase tracking-wide">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-800">Filtros avançados de análise</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Personalize visualização por data e desempenho</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
              <button onClick={() => setChartType('bar')} className={`p-2 rounded-lg transition-all ${chartType === 'bar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`} title="Ver Barras">
                <BarChart3 className="w-4 h-4" />
              </button>
              <button onClick={() => setChartType('trend')} className={`p-2 rounded-lg transition-all ${chartType === 'trend' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`} title="Ver Tendência">
                <TrendingUp className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select className="bg-transparent text-[10px] font-black text-gray-600 uppercase border-none focus:ring-0 cursor-pointer" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {months.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
              <select className="bg-transparent text-[10px] font-black text-gray-600 uppercase border-none focus:ring-0 cursor-pointer" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-6">
          <div className="xl:col-span-2 relative" ref={teamFilterRef}>
            <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-2xl min-h-[56px] focus-within:ring-4 focus-within:ring-blue-50 transition-all cursor-text" onClick={() => setIsTeamFilterOpen(true)}>
              <Filter className="w-4 h-4 text-gray-400 ml-2" />
              {selectedTeamIds.length === 0 ? (
                <span className="text-sm font-semibold text-gray-400 ml-2">Filtrar por equipes específicas...</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedTeamIds.map((id) => {
                    const team = teams.find((t) => t.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        {team?.name}
                        <button onClick={(e) => { e.stopPropagation(); removeTeamTag(id); }} className="hover:bg-white/20 rounded-full p-0.5 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              <div className="ml-auto pr-2"><ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isTeamFilterOpen ? 'rotate-180' : ''}`} /></div>
            </div>

            {isTeamFilterOpen && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 p-4 animate-in fade-in duration-300">
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 w-4 h-4" />
                  <input type="text" placeholder="Pesquisar equipe..." className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-50 rounded-xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all" value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} autoFocus />
                </div>

                <div className="max-h-60 overflow-y-auto no-scrollbar space-y-1">
                  <button onClick={() => setSelectedTeamIds([])} className="w-full text-left px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-between">
                    Mostrar todas as equipes
                    {selectedTeamIds.length === 0 && <Check className="w-4 h-4" />}
                  </button>
                  <div className="w-full h-px bg-gray-50 my-2" />
                  {filteredTeamsForSelect.map((team) => (
                    <button key={team.id} onClick={() => toggleTeamSelection(team.id)} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${selectedTeamIds.includes(team.id) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {team.name}
                      {selectedTeamIds.includes(team.id) && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-3">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-[11px] font-black uppercase tracking-widest">Desempenho mínimo</span>
            </div>
            <input type="range" min={0} max={100} value={minimumPerformance} onChange={(e) => setMinimumPerformance(Number(e.target.value))} className="w-full accent-blue-600" />
            <div className="mt-3 flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>0%</span>
              <span className="text-blue-700">{minimumPerformance}%+</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6 sm:gap-8">
        <div className="2xl:col-span-2 bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-sm min-h-[430px]">
          <h3 className="text-base sm:text-lg font-black text-gray-800 tracking-tight">Saúde das Equipes Base</h3>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Análise visual melhorada</p>
          <div className="h-80 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} domain={[0, 100]} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 15px 20px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px' }} formatter={(value: number) => [`${value}%`, 'Arrecadação']} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={24}>
                    {barData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.value >= 100 ? '#059669' : entry.value >= 70 ? '#2563eb' : '#f59e0b'} />)}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 15px 20px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                  <Area type="monotone" dataKey="projecao" stroke="#22c55e" strokeWidth={2} strokeDasharray="6 4" fillOpacity={0} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-gray-800 tracking-tight mb-2">Frequência Financeira</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-6">Consolidado das equipes</p>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={48} outerRadius={72} paddingAngle={8} dataKey="value" stroke="none">
                    {pieData.map((entry: any, index: number) => <Cell key={`slice-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {pieData.map((item: any) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-cyan-300" />
              <h4 className="text-sm font-black uppercase tracking-widest">Insight rápido</h4>
            </div>
            <p className="mt-3 text-sm text-slate-200 leading-relaxed">
              {barData.length > 0
                ? `Você tem ${barData.filter((item: any) => item.value >= 70).length} equipes com desempenho acima de 70%. Use os filtros para priorizar apoio às equipes com menor percentual.`
                : 'Sem dados para os filtros selecionados. Ajuste o período ou reduza o desempenho mínimo.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
