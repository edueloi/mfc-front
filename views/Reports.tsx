import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, Filter, TrendingUp, Users, Wallet } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { api } from '../api';

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

  useEffect(() => {
    api.getDashboardSummary(selectedMonth, selectedYear)
      .then(setSummary)
      .catch(() => setSummary({ stats: {}, barData: [], trendData: [], pieData: [] }));
  }, [selectedMonth, selectedYear]);

  const topTeams = useMemo(() => {
    return [...(summary.barData || [])]
      .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
      .slice(0, 5);
  }, [summary]);

  const reportCards = [
    { label: 'Membros ativos', value: summary?.stats?.activeMembers || 0, icon: Users, accent: 'text-blue-600 bg-blue-50' },
    { label: 'Equipes base', value: summary?.stats?.teamsCount || 0, icon: Filter, accent: 'text-emerald-600 bg-emerald-50' },
    { label: 'Arrecadação média', value: `${Math.round(((summary?.barData || []).reduce((acc: number, item: any) => acc + (item.value || 0), 0) / Math.max((summary?.barData || []).length || 1, 1)))}%`, icon: Wallet, accent: 'text-violet-600 bg-violet-50' },
    { label: 'Tendência mensal', value: `${summary?.trendData?.length || 0} pontos`, icon: TrendingUp, accent: 'text-amber-600 bg-amber-50' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
      <section className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Central de Relatórios</h2>
            <p className="text-sm text-blue-100 mt-2">Indicadores estratégicos para tomada de decisão e prestação de contas.</p>
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
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all">
              <Download className="w-4 h-4" /> Exportar resumo
            </button>
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
          <h3 className="text-lg font-black text-slate-900">Evolução da performance financeira</h3>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">Tendência por período</p>
          <div className="h-72 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.trendData || []}>
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
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-900">Distribuição geral</h3>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">Status por equipe</p>
          <div className="h-72 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.pieData || []} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={5}>
                  {(summary.pieData || []).map((slice: any, index: number) => <Cell key={`slice-${index}`} fill={slice.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-100 rounded-3xl p-4 sm:p-6 shadow-sm">
        <h3 className="text-lg font-black text-slate-900">Top equipes por resultado</h3>
        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mt-1">Ranking de arrecadação</p>
        <div className="h-72 mt-6">
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
      </section>
    </div>
  );
};

export default Reports;
