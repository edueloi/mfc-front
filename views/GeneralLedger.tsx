
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  ArrowLeft, 
  Download, 
  Printer, 
  Calendar, 
  User, 
  FileText, 
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Save,
  X,
  Check,
  ChevronDown,
  Info,
  Layers,
  MoreVertical,
  Briefcase,
  ArrowRightLeft
} from 'lucide-react';
import { api } from '../api';
import { FinancialEntity } from '../types';

const GeneralLedger: React.FC = () => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [entitySearch, setEntitySearch] = useState('');
  const [entityYearFilter, setEntityYearFilter] = useState<'all' | number>('all');

  const [entities, setEntities] = useState<FinancialEntity[]>([]);

  useEffect(() => {
    api.getLedgerEntities()
      .then(setEntities)
      .catch(() => setEntities([]));
  }, []);

  const [newEntity, setNewEntity] = useState({
    name: '',
    year: new Date().getFullYear(),
    observations: '',
    initialBalance: ''
  });

  const [launchForm, setLaunchForm] = useState({
    type: 'Receita' as 'Receita' | 'Despesa',
    category: '',
    amount: '',
    description: '',
    months: [] as number[]
  });

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const categories = {
    Receita: [
      { id: '1.1.1', label: 'Receitas de Vendas - Dinheiro' },
      { id: '1.1.2', label: 'Receitas de Vendas - PIX' },
      { id: '1.1.3', label: 'Receitas de Vendas - Cartão' },
      { id: '1.1.4', label: 'Outros' },
    ],
    Despesa: [
      { id: '2.1.1', label: 'Ajuda de Custos a Colaboradores' },
      { id: '2.1.2', label: 'Material Acervo Literário' },
      { id: '2.1.3', label: 'Telefone / Internet' },
      { id: '2.1.7', label: 'INSS / DARF' },
      { id: '2.1.11', label: 'Salário / M.O' },
      { id: '2.1.15', label: 'Tarifa Maquininha' },
    ]
  };

  const filteredEntities = useMemo(() => {
    return entities
      .filter((entity) =>
        entity.name.toLowerCase().includes(entitySearch.toLowerCase()) ||
        String(entity.year).includes(entitySearch)
      )
      .filter((entity) => (entityYearFilter === 'all' ? true : entity.year === entityYearFilter))
      .sort((a, b) => b.year - a.year);
  }, [entities, entitySearch, entityYearFilter]);

  const listStats = useMemo(() => {
    return filteredEntities.reduce((acc, entity) => {
      acc.total += 1;
      acc.balance += Number(entity.initialBalance) || 0;
      return acc;
    }, { total: 0, balance: 0 });
  }, [filteredEntities]);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCreateEntity = () => {
    if (!newEntity.name || !newEntity.initialBalance) {
      alert("Por favor, preencha o nome e o saldo inicial.");
      return;
    }

    api.createLedgerEntity({
      name: newEntity.name,
      year: newEntity.year,
      createdBy: 'Admin',
      observations: newEntity.observations,
      initialBalance: parseFloat(newEntity.initialBalance)
    })
      .then((entity: FinancialEntity) => {
        setEntities([entity, ...entities]);
        setShowEntityModal(false);
        setNewEntity({ name: '', year: new Date().getFullYear(), observations: '', initialBalance: '' });
        notify("Novo Livro Caixa criado com sucesso!");
      })
      .catch(() => {
        setShowEntityModal(false);
      });
  };

  const toggleMonthSelection = (idx: number) => {
    setLaunchForm(prev => ({
      ...prev,
      months: prev.months.includes(idx) 
        ? prev.months.filter(m => m !== idx) 
        : [...prev.months, idx]
    }));
  };

  const handleLaunchSubmit = () => {
    if (launchForm.months.length === 0 || !launchForm.amount || !launchForm.category) {
      alert("Por favor, preencha o valor, categoria e selecione ao menos um mês.");
      return;
    }
    notify(`Lançamentos de ${launchForm.type} realizados com sucesso!`);
    setShowLaunchModal(false);
    setLaunchForm({ type: 'Receita', category: '', amount: '', description: '', months: [] });
  };

  const selectedEntity = entities.find(e => e.id === selectedEntityId);
  const monthlyRevenueValue = 7100;
  const monthlyExpenseValue = 850;
  const annualRevenueTotal = categories.Receita.length * monthlyRevenueValue * 12;
  const annualExpenseTotal = categories.Despesa.length * monthlyExpenseValue * 12;
  const estimatedResult = annualRevenueTotal - annualExpenseTotal + Number(selectedEntity?.initialBalance || 0);

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const spreadsheetScrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [focusedMonthIndex, setFocusedMonthIndex] = useState<number | null>(null);

  const updateScrollHints = () => {
    const el = spreadsheetScrollRef.current;
    if (!el) return;
    const maxScrollLeft = Math.max(el.scrollWidth - el.clientWidth, 1);
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    setScrollProgress(Math.min(100, Math.max(0, (el.scrollLeft / maxScrollLeft) * 100)));
  };

  const handleLedgerHorizontalScroll = (direction: 'left' | 'right') => {
    const el = spreadsheetScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'right' ? 380 : -380, behavior: 'smooth' });
  };

  const handleLedgerScrollToEdge = (direction: 'start' | 'end') => {
    const el = spreadsheetScrollRef.current;
    if (!el) return;
    el.scrollTo({ left: direction === 'end' ? el.scrollWidth : 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (view !== 'detail') return;
    const el = spreadsheetScrollRef.current;
    if (!el) return;
    updateScrollHints();
    el.addEventListener('scroll', updateScrollHints);
    window.addEventListener('resize', updateScrollHints);
    return () => {
      el.removeEventListener('scroll', updateScrollHints);
      window.removeEventListener('resize', updateScrollHints);
    };
  }, [view, selectedEntityId]);

  const handleExportSpreadsheetCsv = () => {
    if (!selectedEntity) return;

    const headers = ['Item de Controle', ...monthNames, 'Total Anual'];
    const rows: string[][] = [];

    rows.push(['1. RECEITAS', ...Array(12).fill(''), '']);
    categories.Receita.forEach((acc) => {
      const monthlyValues = Array(12).fill(monthlyRevenueValue);
      rows.push([`${acc.id} ${acc.label}`, ...monthlyValues.map((value) => formatCurrency(value)), formatCurrency(monthlyValues.reduce((a, b) => a + b, 0))]);
    });

    rows.push(['2. DESPESAS', ...Array(12).fill(''), '']);
    categories.Despesa.forEach((acc) => {
      const monthlyValues = Array(12).fill(monthlyExpenseValue);
      rows.push([`${acc.id} ${acc.label}`, ...monthlyValues.map((value) => formatCurrency(value)), formatCurrency(monthlyValues.reduce((a, b) => a + b, 0))]);
    });

    rows.push(['Saldo Final', ...Array(12).fill(''), formatCurrency(estimatedResult)]);

    const csv = [headers, ...rows]
      .map((cols) => cols.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `livro-caixa-${selectedEntity.name.toLowerCase().replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify('CSV do Livro Caixa exportado com sucesso!');
  };

  const renderList = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Gestão de Livro Caixa</h2>
          <p className="text-gray-500 font-medium">Controle financeiro detalhado de entradas e saídas da unidade.</p>
        </div>
        <button 
          onClick={() => setShowEntityModal(true)}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          Novo Livro Caixa
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Livros filtrados</p>
          <p className="text-3xl font-black text-gray-900 mt-2">{listStats.total}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Saldo inicial consolidado</p>
          <p className="text-3xl font-black text-blue-600 mt-2">R$ {listStats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Média por livro</p>
          <p className="text-3xl font-black text-emerald-600 mt-2">R$ {(listStats.balance / Math.max(listStats.total, 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
              placeholder="Buscar por nome ou exercício..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold"
            />
          </div>
          <select
            value={entityYearFilter}
            onChange={(e) => setEntityYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-black uppercase tracking-wider text-gray-600"
          >
            <option value="all">Todos os anos</option>
            {Array.from(new Set(entities.map((entity) => entity.year))).sort((a, b) => b - a).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredEntities.map(entity => (
          <div 
            key={entity.id} 
            onClick={() => { setSelectedEntityId(entity.id); setView('detail'); }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group flex flex-col overflow-hidden relative"
          >
            <div className="p-10 flex-1 relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                  <Briefcase className="w-7 h-7" />
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg uppercase tracking-widest">{entity.year}</span>
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">{entity.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-8 font-medium italic">
                {entity.observations || 'Sem observações.'}
              </p>
              <div className="flex items-center gap-6 pt-6 border-t border-gray-50">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Saldo Inicial</p>
                  <p className="text-sm font-black text-blue-600">R$ {entity.initialBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
            <div className="px-10 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-blue-600 font-bold text-[10px] uppercase tracking-widest group-hover:bg-blue-50 transition-colors">
              Explorar Balancete
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      {filteredEntities.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-400 font-semibold">
          Nenhum livro encontrado com os filtros atuais.
        </div>
      )}
    </div>
  );

  const renderSpreadsheet = () => (
    <div className="space-y-6 animate-in slide-in-from-right duration-500 flex flex-col h-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('list')}
            className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 text-gray-400 hover:text-blue-600 transition-all shadow-sm"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedEntity?.name}</h2>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Unidade Tatuí/SP • Movimento Familiar Cristão</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSpreadsheetCsv}
            className="px-5 py-3 bg-white border border-gray-100 text-gray-600 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <button className="px-5 py-3 bg-white border border-gray-100 text-gray-600 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button 
            onClick={() => setShowLaunchModal(true)}
            className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95"
          >
            <DollarSign className="w-4 h-4" /> Novo Lançamento
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl flex-1 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100 bg-gray-50/60 grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Saldo inicial</p>
            <p className="text-2xl font-black text-blue-600 mt-1">R$ {Number(selectedEntity?.initialBalance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Receita projetada</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">R$ {formatCurrency(annualRevenueTotal)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Despesa projetada</p>
            <p className="text-2xl font-black text-red-500 mt-1">R$ {formatCurrency(annualExpenseTotal)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Resultado estimado</p>
            <p className="text-2xl font-black text-purple-600 mt-1">R$ {formatCurrency(estimatedResult)}</p>
          </div>
        </div>

        <div className="px-6 py-5 border-b border-gray-100 bg-white">
          <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-3">Evolução mensal (visual rápido)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
            {[42, 58, 51, 64, 60, 74, 68, 80, 73, 88, 91, 95].map((value, idx) => (
              <div key={monthNames[idx]} className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{monthNames[idx].slice(0, 3)}</p>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-700" style={{ width: `${value}%` }} />
                </div>
                <p className="mt-1 text-[10px] font-black text-gray-600">{value}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50/70 via-white to-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              Arraste para os lados para ver todos os meses e o total anual
            </div>
            <div className="w-56 h-1.5 rounded-full bg-blue-100 overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
            </div>
            <p className="text-[10px] font-bold text-blue-700">
              Navegação horizontal: {scrollProgress.toFixed(0)}%
              {focusedMonthIndex !== null ? ` • Foco: ${monthNames[focusedMonthIndex]}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleLedgerScrollToEdge('start')}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50"
            >
              Janeiro
            </button>
            <button
              type="button"
              onClick={() => handleLedgerHorizontalScroll('left')}
              disabled={!canScrollLeft}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Ver início
            </button>
            <button
              type="button"
              onClick={() => handleLedgerHorizontalScroll('right')}
              disabled={!canScrollRight}
              className="px-3 py-2 rounded-xl border border-blue-200 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Ver direita →
            </button>
            <button
              type="button"
              onClick={() => handleLedgerScrollToEdge('end')}
              className="px-3 py-2 rounded-xl border border-blue-200 bg-white text-[10px] font-black uppercase tracking-widest text-blue-700 hover:bg-blue-50"
            >
              Dezembro
            </button>
          </div>
        </div>

        <div ref={spreadsheetScrollRef} tabIndex={0} onKeyDown={(e) => { if (e.key === 'ArrowRight') handleLedgerHorizontalScroll('right'); if (e.key === 'ArrowLeft') handleLedgerHorizontalScroll('left'); }} className="overflow-x-auto overflow-y-auto relative flex-1 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300">
          {canScrollRight && (
            <div className="pointer-events-none absolute right-0 top-0 z-20 h-full w-10 bg-gradient-to-l from-white via-white/80 to-transparent" />
          )}
          {canScrollLeft && (
            <div className="pointer-events-none absolute left-0 top-0 z-20 h-full w-10 bg-gradient-to-r from-white via-white/80 to-transparent" />
          )}
          <table className="w-full text-left border-separate border-spacing-0 min-w-[1760px]">
            <thead className="sticky top-0 z-30">
              <tr className="bg-slate-50">
                <th className="sticky left-0 top-0 z-40 bg-slate-50 px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-b border-gray-100 min-w-[320px] shadow-[2px_0_5px_rgba(0,0,0,0.01)]">
                  Item de Controle
                </th>
                {monthNames.map((m, monthIdx) => (
                  <th
                    key={m}
                    onClick={() => setFocusedMonthIndex(monthIdx)}
                    className={`px-4 py-5 text-[10px] font-black uppercase text-center border-r border-b border-gray-100 min-w-[120px] cursor-pointer transition-colors ${focusedMonthIndex === monthIdx ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-gray-400 hover:bg-blue-50'}`}
                  >
                    {m}
                  </th>
                ))}
                <th className="px-6 py-5 text-[10px] font-black text-blue-600 uppercase text-center bg-blue-50/30 border-b border-gray-100 min-w-[140px]">Total Anual</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              <tr className="bg-blue-600 text-white">
                <td colSpan={14} className="sticky left-0 z-20 bg-blue-600 px-8 py-3 font-black uppercase tracking-widest text-[10px]">1. RECEITAS</td>
              </tr>
              {categories.Receita.map((acc, idx) => (
                <tr key={acc.id} className="hover:bg-blue-50/10">
                  <td className="sticky left-0 z-10 bg-white px-8 py-4 border-r border-b border-gray-50 font-semibold text-gray-700 shadow-[2px_0_5px_rgba(0,0,0,0.01)]">
                    <span className="text-blue-500 mr-2 font-black">{acc.id}</span> {acc.label}
                  </td>
                  {monthNames.map((_, i) => (
                    <td key={i} className={`px-4 py-4 text-right border-r border-b border-gray-50 font-bold tabular-nums ${focusedMonthIndex === i ? 'bg-blue-50/60 text-blue-700' : 'text-green-600'}`}>{formatCurrency(monthlyRevenueValue)}</td>
                  ))}
                  <td className="px-6 py-4 text-right bg-blue-50/10 border-b border-gray-50 font-black text-blue-700 tabular-nums">{formatCurrency(monthlyRevenueValue * 12)}</td>
                </tr>
              ))}
              <tr className="bg-slate-800 text-white">
                <td colSpan={14} className="sticky left-0 z-20 bg-slate-800 px-8 py-3 font-black uppercase tracking-widest text-[10px]">2. DESPESAS</td>
              </tr>
              {categories.Despesa.map((acc, idx) => (
                <tr key={acc.id} className="hover:bg-red-50/10">
                  <td className="sticky left-0 z-10 bg-white px-8 py-4 border-r border-b border-gray-50 font-semibold text-gray-700 shadow-[2px_0_5px_rgba(0,0,0,0.01)]">
                    <span className="text-red-500 mr-2 font-black">{acc.id}</span> {acc.label}
                  </td>
                  {monthNames.map((_, i) => (
                    <td key={i} className={`px-4 py-4 text-right border-r border-b border-gray-50 font-medium tabular-nums ${focusedMonthIndex === i ? 'bg-red-50/70 text-red-700' : 'text-red-500'}`}>{formatCurrency(monthlyExpenseValue)}</td>
                  ))}
                  <td className="px-6 py-4 text-right bg-gray-50/50 border-b border-gray-50 font-black text-red-700 tabular-nums">{formatCurrency(monthlyExpenseValue * 12)}</td>
                </tr>
              ))}
              <tr className="bg-blue-600 text-white">
                <td className="sticky left-0 z-20 bg-blue-700 px-8 py-6 border-r border-blue-800 font-black uppercase text-[10px] tracking-widest shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Saldo Final</td>
                <td colSpan={13} className="px-10 py-6 text-right font-black text-2xl tracking-tight pr-16 italic">R$ {formatCurrency(estimatedResult)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 pb-10">
      {notification && (
        <div className="fixed top-24 right-10 z-[300] bg-green-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-right duration-500 border border-green-500">
          <div className="bg-white/20 p-1.5 rounded-lg"><Check className="w-4 h-4" /></div>
          <span className="font-bold text-xs uppercase tracking-widest">{notification}</span>
        </div>
      )}

      {view === 'list' ? renderList() : renderSpreadsheet()}

      {/* MODAL NOVO LIVRO CAIXA */}
      {showEntityModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
           <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                       <Layers className="w-6 h-6" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-gray-900 leading-none mb-1">Novo Livro</h3>
                       <p className="text-xs text-gray-400 font-medium">Controle de balancete por Exercício.</p>
                    </div>
                 </div>
                 <button onClick={() => setShowEntityModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400"><X className="w-6 h-6" /></button>
              </div>
              <div className="p-8 space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Título</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 font-bold text-gray-700 focus:ring-4 focus:ring-blue-100 transition-all outline-none" value={newEntity.name} onChange={e => setNewEntity({...newEntity, name: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Ano</label>
                       <input type="number" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 font-bold text-gray-700 outline-none" value={newEntity.year} onChange={e => setNewEntity({...newEntity, year: parseInt(e.target.value)})} />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Saldo Inicial</label>
                       <input type="number" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 font-black text-gray-900 outline-none" value={newEntity.initialBalance} onChange={e => setNewEntity({...newEntity, initialBalance: e.target.value})} />
                    </div>
                 </div>
                 <button onClick={handleCreateEntity} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">Criar Livro</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL DE LANÇAMENTO EM LOTE - REDESENHADO (SOFISTICADO & COMPACTO) */}
      {showLaunchModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-400 border border-gray-100">
            
            {/* Header Reduzido */}
            <div className="p-6 sm:p-8 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md ${launchForm.type === 'Receita' ? 'bg-green-500' : 'bg-red-500'}`}>
                  {launchForm.type === 'Receita' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1">Lançamento em Lote</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{selectedEntity?.name}</p>
                </div>
              </div>
              <button onClick={() => setShowLaunchModal(false)} className="p-2 hover:bg-gray-50 rounded-xl transition-all text-gray-300 hover:text-gray-500 active:scale-90"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="p-6 sm:p-8 space-y-8 flex-1">
              
              {/* Toggle Tipo (Mais Clean) */}
              <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100/50">
                <button 
                  onClick={() => setLaunchForm({...launchForm, type: 'Receita', category: ''})}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${launchForm.type === 'Receita' ? 'bg-white text-green-600 shadow-sm border border-gray-100/50' : 'text-gray-400'}`}
                >
                  <TrendingUp className="w-4 h-4" /> Receita
                </button>
                <button 
                  onClick={() => setLaunchForm({...launchForm, type: 'Despesa', category: ''})}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${launchForm.type === 'Despesa' ? 'bg-white text-red-500 shadow-sm border border-gray-100/50' : 'text-gray-400'}`}
                >
                  <TrendingDown className="w-4 h-4" /> Despesa
                </button>
              </div>

              {/* Grid de Inputs (Compacto) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-gray-300 uppercase mb-2 tracking-widest ml-1">Conta Contábil</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all appearance-none font-bold text-gray-600 outline-none text-sm"
                      value={launchForm.category}
                      onChange={e => setLaunchForm({...launchForm, category: e.target.value})}
                    >
                      <option value="">Selecione uma conta...</option>
                      {categories[launchForm.type].map(c => <option key={c.id} value={c.label}>{c.id} - {c.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none w-5 h-5" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-300 uppercase mb-2 tracking-widest ml-1">Valor Unitário</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">R$</span>
                    <input 
                      type="number" 
                      placeholder="0,00" 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-11 pr-5 py-3.5 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all font-black text-gray-900 outline-none text-base tabular-nums" 
                      value={launchForm.amount} 
                      onChange={e => setLaunchForm({...launchForm, amount: e.target.value})} 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-300 uppercase mb-2 tracking-widest ml-1">Exercício</label>
                  <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 flex items-center gap-3 text-gray-400 font-bold text-sm">
                    <Calendar className="w-4 h-4" /> {selectedEntity?.year}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black text-gray-300 uppercase mb-2 tracking-widest ml-1">Histórico / Descrição</label>
                  <input 
                    type="text" 
                    placeholder="Descrição opcional do lançamento..." 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3.5 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all font-semibold text-gray-600 outline-none text-sm" 
                    value={launchForm.description} 
                    onChange={e => setLaunchForm({...launchForm, description: e.target.value})} 
                  />
                </div>
              </div>

              {/* Seletor de Meses (Mais Compacto) */}
              <div className="space-y-4 pt-2">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm"></div>
                      <label className="block text-[10px] font-black text-gray-800 uppercase tracking-widest">Aplicar nos meses:</label>
                    </div>
                    <div className="flex gap-4">
                       <button onClick={() => setLaunchForm({...launchForm, months: Array.from({length: 12}, (_, i) => i)})} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">Todos</button>
                       <button onClick={() => setLaunchForm({...launchForm, months: []})} className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:underline">Limpar</button>
                    </div>
                 </div>
                 <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                   {monthNames.map((name, idx) => (
                     <button 
                       key={name}
                       onClick={() => toggleMonthSelection(idx)}
                       className={`py-2.5 text-[9px] font-black rounded-xl border transition-all uppercase tracking-tighter ${launchForm.months.includes(idx) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-blue-100 hover:bg-gray-50'}`}
                     >
                       {name.substring(0, 3)}
                     </button>
                   ))}
                 </div>
              </div>
            </div>

            {/* Footer Refinado */}
            <div className="p-6 sm:p-8 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
               <button 
                onClick={handleLaunchSubmit}
                className={`flex-[2] py-4 rounded-2xl font-black transition-all shadow-lg flex items-center justify-center gap-3 text-sm uppercase tracking-widest ${launchForm.type === 'Receita' ? 'bg-green-600 shadow-green-100 hover:bg-green-700' : 'bg-red-500 shadow-red-100 hover:bg-red-600'} text-white active:scale-95`}
               >
                 <Save className="w-4 h-4" /> Processar Lançamentos
               </button>
               <button onClick={() => setShowLaunchModal(false)} className="flex-1 py-4 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-gray-600 transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneralLedger;


