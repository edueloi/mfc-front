import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, Filter, TrendingUp, Users, Wallet, Layers, Target, BarChart3, AreaChart as AreaIcon, Search } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { api } from '../api';
import { BaseTeam } from '../types';

const monthOptions = [
  { v: '01', l: 'Janeiro' }, { v: '02', l: 'Fevereiro' }, { v: '03', l: 'Março' },
  { v: '04', l: 'Abril' }, { v: '05', l: 'Maio' }, { v: '06', l: 'Junho' },
  { v: '07', l: 'Julho' }, { v: '08', l: 'Agosto' }, { v: '09', l: 'Setembro' },
  { v: '10', l: 'Outubro' }, { v: '11', l: 'Novembro' }, { v: '12', l: 'Dezembro' }
];

const Reports: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState('06');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [summary, setSummary] = useState<any>({ stats: {}, barData: [], trendData: [], pieData: [] });
  const [teams, setTeams] = useState<BaseTeam[]>([]);

  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'high' | 'risk'>('all');
  const [minimumGoal, setMinimumGoal] = useState(0);
  const [searchTeam, setSearchTeam] = useState('');
  const [viewType, setViewType] = useState<'bar' | 'trend'>('bar');

  useEffect(() => {
    api.getDashboardSummary(selectedMonth, selectedYear)
      .then(setSummary)
      .catch(() => setSummary({ stats: {}, barData: [], trendData: [], pieData: [] }));
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    api.getTeams().then(setTeams).catch(() => setTeams([]));
  }, []);

  const teamPerformanceData = useMemo(() => {
    const source = summary.barData || [];
    return source
      .filter((team: any) => selectedTeamId === 'all' || team.id === selectedTeamId)
      .filter((team: any) => (team.value || 0) >= minimumGoal)
      .filter((team: any) => {
        if (statusFilter === 'high') return (team.value || 0) >= 70;
        if (statusFilter === 'risk') return (team.value || 0) < 70;
        return true;
      })
      .filter((team: any) => team.name?.toLowerCase().includes(searchTeam.toLowerCase()));
  }, [summary, selectedTeamId, minimumGoal, statusFilter, searchTeam]);

  const topTeams = useMemo(() => {
    return [...teamPerformanceData]
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
      .slice(0, 5);
  }, [teamPerformanceData]);

  const trendData = useMemo(() => {
    const data = summary.trendData || [];
    return data.map((point: any, index: number) => ({
      ...point,
      meta: Math.min(100, (point.value || 0) + (index % 2 === 0 ? 5 : 2))
    }));
  }, [summary]);

  const performanceAvg = Math.round(
    (teamPerformanceData.reduce((acc: number, item: any) => acc + (item.value || 0), 0) / Math.max(teamPerformanceData.length, 1))
  );

  const reportCards = [
    { label: 'Membros ativos', value: summary?.stats?.activeMembers || 0, icon: Users, accent: 'text-blue-600 bg-blue-50' },
    { label: 'Equipes analisadas', value: teamPerformanceData.length || 0, icon: Layers, accent: 'text-emerald-600 bg-emerald-50' },
    { label: 'Performance média', value: `${performanceAvg}%`, icon: Wallet, accent: 'text-violet-600 bg-violet-50' },
    { label: 'Acima da meta (70%)', value: teamPerformanceData.filter((team: any) => (team.value || 0) >= 70).length, icon: TrendingUp, accent: 'text-amber-600 bg-amber-50' }
  ];

  const exportCsv = () => {
    const rows = [
      ['Equipe', 'Arrecadacao(%)', 'Status'],
      ...teamPerformanceData.map((team: any) => [team.name, String(team.value || 0), (team.value || 0) >= 70 ? 'Meta atingida' : 'Em risco'])
    ];

    const csvContent = rows.map((row) => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-mfc-${selectedMonth}-${selectedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <section className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Central de Relatórios</h2>
            <p className="text-sm text-blue-100 mt-2">Mais funcional: filtre equipes, foque em risco e exporte rapidamente para prestação de contas.</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-blue-100" />
              <select className="bg-transparent text-xs font-bold uppercase tracking-widest" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {monthOptions.map((month) => <option key={month.v} value={month.v} className="text-slate-900">{month.l}</option>)}
              </select>
              <select className="bg-transparent text-xs font-bold uppercase tracking-widest" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                <option value="2024" className="text-slate-900">2024</option>
                <option value="2023" className="text-slate-900">2023</option>
                <option value="2022" className="text-slate-900">2022</option>
              </select>
            </div>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="space-y-2 xl:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Layers className="w-3.5 h-3.5" /> Equipe</label>
            <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-600" value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)}>
              <option value="all">Todas as equipes</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Filter className="w-3.5 h-3.5" /> Status</label>
            <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-600" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
              <option value="all">Todos</option>
              <option value="high">Meta atingida (70%+)</option>
              <option value="risk">Em risco (&lt;70%)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Search className="w-3.5 h-3.5" /> Buscar</label>
            <input value={searchTeam} onChange={(e) => setSearchTeam(e.target.value)} placeholder="Nome da equipe" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-600" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><Target className="w-3.5 h-3.5" /> Meta mínima: {minimumGoal}%</label>
            <input type="range" min={0} max={100} value={minimumGoal} onChange={(e) => setMinimumGoal(Number(e.target.value))} className="w-full accent-blue-600 mt-2" />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {reportCards.map((card) => (
          <div key={card.label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">{card.label}</p>
              <div className={`p-2 rounded-xl ${card.accent}`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm min-h-[360px]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-black text-slate-900">Performance financeira</h3>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">Visão comparativa e tendência</p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button onClick={() => setViewType('bar')} className={`p-2 rounded-lg ${viewType === 'bar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><BarChart3 className="w-4 h-4" /></button>
              <button onClick={() => setViewType('trend')} className={`p-2 rounded-lg ${viewType === 'trend' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><AreaIcon className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="h-72 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              {viewType === 'bar' ? (
                <BarChart data={teamPerformanceData} margin={{ top: 8, left: -10, right: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Arrecadação']} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {teamPerformanceData.map((item: any, index: number) => <Cell key={`cell-${index}`} fill={(item.value || 0) >= 70 ? '#16a34a' : '#f59e0b'} />)}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="reportTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fill="url(#reportTrend)" />
                  <Area type="monotone" dataKey="meta" stroke="#22c55e" strokeWidth={2} fillOpacity={0} strokeDasharray="6 4" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-900">Distribuição geral</h3>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">Status por equipe</p>
          <div className="h-56 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.pieData || []} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={5}>
                  {(summary.pieData || []).map((slice: any, index: number) => <Cell key={`slice-${index}`} fill={slice.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {(summary.pieData || []).map((item: any) => (
              <div key={item.name} className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-bold text-slate-600 uppercase tracking-wider">{item.name}</span>
                </div>
                <span className="font-black text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-900">Top equipes por resultado</h3>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">Ranking de arrecadação</p>
          <div className="h-64 mt-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTeams} margin={{ top: 8, left: -10, right: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${value}%`, 'Arrecadação']} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm overflow-hidden">
          <h3 className="text-lg font-black text-slate-900">Lista operacional de equipes</h3>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">Para ação rápida da coordenação</p>
          <div className="mt-5 max-h-64 overflow-y-auto no-scrollbar divide-y divide-slate-100">
            {teamPerformanceData.map((team: any, index: number) => (
              <div key={team.id || `${team.name}-${index}`} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-900">{team.name}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${(team.value || 0) >= 70 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {(team.value || 0) >= 70 ? 'Meta atingida' : 'Precisa de apoio'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-slate-900">{team.value || 0}%</p>
                  <p className="text-[10px] text-slate-400 font-bold">arrecadação</p>
                </div>
              </div>
            ))}

            {teamPerformanceData.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-sm font-semibold">
                Nenhuma equipe encontrada com os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Reports;
