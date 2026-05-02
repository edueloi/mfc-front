
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
  AlertCircle,
  CalendarDays,
  Plus
} from 'lucide-react';
import { api } from '../api';
import toast from 'react-hot-toast';
import { PageWrapper, SectionTitle, StatGrid, ContentCard, Button, Input } from '../components/ui';
import { StatCard } from '../components/ui/StatCard';
import { cn } from '../src/lib/utils';
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
    <PageWrapper>
      <SectionTitle 
        title="Lançamentos Diários 2026"
        description="Gestão e acompanhamento da planilha financeira 2026"
        icon={FileSpreadsheet}
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              iconLeft={<Trash2 className="w-4 h-4" />}
              className="text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700"
            >
              Limpar Dados
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Upload className="w-4 h-4" />}
              loading={importing}
              onClick={() => document.getElementById('import-file')?.click()}
            >
              {importing ? 'Importando...' : 'Importar Planilha'}
              <input 
                id="import-file"
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls" 
                onChange={handleFileUpload} 
                disabled={importing} 
              />
            </Button>
          </div>
        }
      />

      <StatGrid cols={3} className="mt-8">
        <StatCard 
          title="Total Entradas"
          value={formatCurrency(stats?.summary.total_income || 0)}
          icon={TrendingUp}
          color="success"
          delay={0}
        />
        <StatCard 
          title="Total Saídas"
          value={formatCurrency(Math.abs(stats?.summary.total_expenses || 0))}
          icon={TrendingDown}
          color="danger"
          delay={0.1}
        />
        <StatCard 
          title="Saldo Atual"
          value={formatCurrency(stats?.summary.balance || 0)}
          icon={DollarSign}
          color={stats?.summary.balance && stats.summary.balance >= 0 ? "info" : "danger"}
          delay={0.2}
        />
      </StatGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <ContentCard>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
            <Layers className="w-5 h-5 text-blue-500" />
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
        </ContentCard>

        <ContentCard>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-blue-500" />
            Evolução Mensal
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.byMonth || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={32}>
                  {(stats?.byMonth || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.total >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ContentCard>
      </div>

      <ContentCard padding="none" className="mt-8 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
            Histórico de Lançamentos
          </h3>
          <Input 
            iconLeft={<Search className="w-4 h-4 text-slate-400" />}
            placeholder="Buscar por descrição, conta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            wrapperClassName="w-full md:w-96"
          />
        </div>

        <div className="overflow-x-auto no-scrollbar">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-400">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-[10px] font-black uppercase tracking-widest">Carregando lançamentos...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-slate-400">
              <AlertCircle className="w-12 h-12 mb-4 opacity-20 text-slate-300" />
              <p className="text-[10px] font-black uppercase tracking-widest mb-1">Nenhum lançamento encontrado.</p>
              <p className="text-xs font-bold text-slate-300">Importe uma planilha para começar.</p>
            </div>
          ) : (
            <table className="w-full text-left">
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
                      <p className="text-sm font-black text-slate-900">
                        {new Date(entry.date).toLocaleDateString('pt-BR')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900">{entry.cost_center}</span>
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{entry.synthetic}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-xs">
                        <span className="text-sm font-black text-slate-700">{entry.analytic}</span>
                        <span className="text-[10px] text-slate-400 font-bold italic truncate" title={entry.observation}>
                          {entry.observation || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200/50">
                        {entry.account}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={cn(
                        "text-sm font-black",
                        entry.amount >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {formatCurrency(entry.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </ContentCard>
    </PageWrapper>
  );
};

export default DailyEntries;
