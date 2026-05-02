import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Layers,
  Baby,
  PersonStanding,
  BarChart3,
  TrendingUp,
  Check,
  X,
  Sparkles,
  SlidersHorizontal,
  CircleDollarSign,
  ChevronDown,
  Search,
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
import {
  PageWrapper,
  SectionTitle,
  StatGrid,
  StatCard,
  ContentCard,
  Button,
  FilterLineSegmented,
  Select,
} from '../components/ui';

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
    { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' }, { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' }, { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' }
  ];

  const yearOptions = [
    { value: '2024', label: '2024' },
    { value: '2023', label: '2023' },
    { value: '2022', label: '2022' },
  ];

  const toggleTeamSelection = (id: string) => {
    setSelectedTeamIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const removeTeamTag = (id: string) => {
    setSelectedTeamIds((prev) => prev.filter((item) => item !== id));
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <SectionTitle
          title="Dashboard Inteligente da Unidade"
          description="Visão executiva com filtros avançados, tendências e alertas de performance."
          icon={BarChart3}
          action={
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Sparkles className="w-3.5 h-3.5" />}
              onClick={() => navigate('/relatorios')}
            >
              Abrir relatórios
            </Button>
          }
        />

        {/* Stats */}
        <StatGrid cols={4}>
          <StatCard
            title="Total MFCistas"
            value={summary.stats.totalMembers || 0}
            icon={Users}
            color="info"
            description="Membros totais"
            delay={0}
          />
          <StatCard
            title="Jovens e Crianças"
            value={(summary.stats.children || 0) + (summary.stats.youth || 0)}
            icon={Baby}
            color="purple"
            description="Base do Movimento"
            delay={0.05}
          />
          <StatCard
            title="3ª Idade"
            value={summary.stats.elderly || 0}
            icon={PersonStanding}
            color="danger"
            description="Nossa Fortaleza"
            delay={0.1}
          />
          <StatCard
            title="Equipes Base"
            value={summary.stats.teamsCount || 0}
            icon={Layers}
            color="success"
            description="Ativas na Unidade"
            delay={0.15}
          />
        </StatGrid>

        {/* Filtros */}
        <ContentCard padding="md">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-5">
            <div>
              <h3 className="text-base font-black text-zinc-800">Filtros avançados de análise</h3>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Personalize visualização por data e desempenho</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterLineSegmented<'bar' | 'trend'>
                value={chartType}
                onChange={setChartType}
                options={[
                  { value: 'bar', label: 'Barras', icon: <BarChart3 className="w-3.5 h-3.5" /> },
                  { value: 'trend', label: 'Tendência', icon: <TrendingUp className="w-3.5 h-3.5" /> },
                ]}
                size="sm"
              />

              <Select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                options={months}
                size="sm"
                wrapperClassName="w-auto"
              />

              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                options={yearOptions}
                size="sm"
                wrapperClassName="w-auto"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Team filter dropdown */}
            <div className="xl:col-span-2 relative" ref={teamFilterRef}>
              <div
                className="flex flex-wrap items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl min-h-[44px] cursor-text focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-500/10 transition-all"
                onClick={() => setIsTeamFilterOpen(true)}
              >
                <Search className="w-4 h-4 text-zinc-400 ml-1 shrink-0" />
                {selectedTeamIds.length === 0 ? (
                  <span className="text-sm font-semibold text-zinc-400">Filtrar por equipes específicas...</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTeamIds.map((id) => {
                      const team = teams.find((t) => t.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-1 bg-amber-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          {team?.name}
                          <button onClick={(e) => { e.stopPropagation(); removeTeamTag(id); }} className="hover:bg-white/20 rounded-full p-0.5 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="ml-auto pr-1">
                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isTeamFilterOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {isTeamFilterOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-xl z-50 p-3 animate-in fade-in duration-200">
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Pesquisar equipe..."
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/10 focus:bg-white transition-all"
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    <button
                      onClick={() => setSelectedTeamIds([])}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 transition-colors flex items-center justify-between"
                    >
                      Mostrar todas as equipes
                      {selectedTeamIds.length === 0 && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div className="h-px bg-zinc-100 my-1.5" />
                    {filteredTeamsForSelect.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => toggleTeamSelection(team.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${selectedTeamIds.includes(team.id) ? 'bg-amber-50 text-amber-700' : 'text-zinc-600 hover:bg-zinc-50'}`}
                      >
                        {team.name}
                        {selectedTeamIds.includes(team.id) && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Performance slider */}
            <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-4">
              <div className="flex items-center gap-2 text-zinc-500 mb-3">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Desempenho mínimo</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={minimumPerformance}
                onChange={(e) => setMinimumPerformance(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="mt-2 flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                <span>0%</span>
                <span className="text-amber-600">{minimumPerformance}%+</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </ContentCard>

        {/* Charts */}
        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6">
          <ContentCard padding="md" className="2xl:col-span-2 min-h-[430px]">
            <h3 className="text-base font-black text-zinc-800 tracking-tight">Saúde das Equipes Base</h3>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Análise visual melhorada</p>
            <div className="h-80 w-full mt-5">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }} domain={[0, 100]} />
                    <Tooltip
                      cursor={{ fill: '#fafafa' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '12px' }}
                      formatter={(value: number) => [`${value}%`, 'Arrecadação']}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={22}>
                      {barData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.value >= 100 ? '#10b981' : entry.value >= 70 ? '#f59e0b' : '#f87171'} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 'bold', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                    <Area type="monotone" dataKey="projecao" stroke="#10b981" strokeWidth={2} strokeDasharray="6 4" fillOpacity={0} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </ContentCard>

          <div className="space-y-5">
            <ContentCard padding="md">
              <h3 className="text-base font-black text-zinc-800 tracking-tight mb-1">Frequência Financeira</h3>
              <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-5">Consolidado das equipes</p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} innerRadius={44} outerRadius={68} paddingAngle={6} dataKey="value" stroke="none">
                      {pieData.map((entry: any, index: number) => (
                        <Cell key={`slice-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-3">
                {pieData.map((item: any) => (
                  <div key={item.name} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{item.name}</span>
                    </div>
                    <span className="text-sm font-black text-zinc-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </ContentCard>

            <ContentCard padding="md" className="bg-zinc-900 border-zinc-800">
              <div className="flex items-center gap-2 mb-3">
                <CircleDollarSign className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Insight rápido</h4>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {barData.length > 0
                  ? `Você tem ${barData.filter((item: any) => item.value >= 70).length} equipes com desempenho acima de 70%. Use os filtros para priorizar apoio às equipes com menor percentual.`
                  : 'Sem dados para os filtros selecionados. Ajuste o período ou reduza o desempenho mínimo.'}
              </p>
            </ContentCard>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Dashboard;
