import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Trash2, 
  Calendar,
  Layers,
  Search,
  AlertCircle
} from 'lucide-react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface DailyEntry {
  id: string;
  date: string;
  cost_center: string;
  synthetic: string;
  analytic: string;
  amount: number;
  account: string;
  observation: string;
}

interface Stats {
  summary: {
    total_income: number;
    total_expenses: number;
    balance: number;
  };
  byCostCenter: { cost_center: string; total: number }[];
  byMonth: { month: string; total: number }[];
}

const DailyEntries: React.FC = () => {
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesData, statsData] = await Promise.all([
        api.getDailyEntries(),
        api.getDailyStats()
      ]);
      setEntries(entriesData);
      setStats(statsData);
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      await api.importDailyEntries(file);
      toast.success('Planilha importada com sucesso!');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao importar: ' + error.message);
    } finally {
      setImporting(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Tem certeza que deseja apagar todos os lançamentos? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await api.clearDailyEntries();
      toast.success('Lançamentos removidos.');
      fetchData();
    } catch (error: any) {
      toast.error('Erro ao limpar dados: ' + error.message);
    }
  };

  const filteredEntries = entries.filter(e => 
    e.cost_center?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.observation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.account?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.analytic?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lançamentos Diários 2026</h1>
          <p className="text-slate-500 font-medium">Gestão e acompanhamento da planilha financeira 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-50 transition-all"
          >
            <Trash2 className="w-5 h-5" />
            Limpar Dados
          </button>
          <label className={`flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 cursor-pointer hover:scale-105 transition-all ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload className="w-5 h-5" />
            {importing ? 'Importando...' : 'Importar Planilha'}
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={importing} />
          </label>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Total Entradas</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(stats?.summary.total_income || 0)}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
            <TrendingDown className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Total Saídas</p>
            <h3 className="text-2xl font-black text-slate-900">{formatCurrency(Math.abs(stats?.summary.total_expenses || 0))}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <DollarSign className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Saldo Atual</p>
            <h3 className={`text-2xl font-black ${stats?.summary.balance && stats.summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(stats?.summary.balance || 0)}
            </h3>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
            <Layers className="w-6 h-6 text-blue-500" />
            Por Centro de Custo
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.byCostCenter || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="total"
                  nameKey="cost_center"
                >
                  {(stats?.byCostCenter || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
            <Calendar className="w-6 h-6 text-blue-500" />
            Evolução Mensal
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.byMonth || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600 }} tickFormatter={(value) => `v${value}`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {(stats?.byMonth || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-blue-500" />
            Histórico de Lançamentos
          </h3>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por descrição, conta, categoria..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-400">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="font-bold">Carregando lançamentos...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-400 italic">
              <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-bold">Nenhum lançamento encontrado.</p>
              <p className="text-sm">Importe uma planilha para começar.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">C. Custo / Sintético</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Analítico / Obs</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Conta</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">
                        {new Date(entry.date).toLocaleDateString('pt-BR')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">{entry.cost_center}</span>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{entry.synthetic}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-xs">
                        <span className="text-sm font-bold text-slate-700">{entry.analytic}</span>
                        <span className="text-xs text-slate-400 italic truncate" title={entry.observation}>
                          {entry.observation || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">
                        {entry.account}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`text-sm font-black ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(entry.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyEntries;
