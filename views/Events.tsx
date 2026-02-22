
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Ticket, 
  Plus, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  X, 
  Save, 
  Search, 
  ChevronRight, 
  Edit3, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  PieChart,
  DollarSign,
  AlertCircle,
  Receipt,
  ShoppingCart,
  Percent,
  Calculator,
  MapPin,
  User,
  RefreshCw
} from 'lucide-react';
import { api } from '../api';
import { Event, EventExpense, BaseTeam, EventSale, Member } from '../types';

const EventsView: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [teams, setTeams] = useState<BaseTeam[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [eventSales, setEventSales] = useState<EventSale[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'expenses' | 'goals'>('basic');
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedEventForSale, setSelectedEventForSale] = useState<Event | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    description: '',
    responsible: '',
    goalValue: 0,
    showOnDashboard: true,
    ticketQuantity: 0,
    ticketValue: 0,
    expenses: [] as EventExpense[],
    teamQuotas: []
  });

  const [saleForm, setSaleForm] = useState({
    teamId: '',
    memberId: '',
    buyerName: '',
    quantity: 1,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    status: 'Pago' as 'Pago' | 'Pendente'
  });

  const [newExpense, setNewExpense] = useState({ description: '', amount: 0 });

  const loadData = () => {
    api.getEvents().then(setEvents).catch(() => setEvents([]));
    api.getTeams().then(setTeams).catch(() => setTeams([]));
    api.getMembers().then(setMembers).catch(() => setMembers([]));
    api.getEventSales().then(setEventSales).catch(() => setEventSales([]));
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

  useEffect(() => {
    if (teams.length > 0 && formData.teamQuotas.length === 0) {
      setFormData(prev => ({
        ...prev,
        teamQuotas: teams.map(t => ({ teamId: t.id, quotaValue: 0 }))
      }));
    }
  }, [teams]);

  const teamMembersForSale = useMemo(() => {
    if (!saleForm.teamId) return [];
    return members.filter(m => m.teamId === saleForm.teamId);
  }, [members, saleForm.teamId]);

  useEffect(() => {
    if (teamMembersForSale.length > 0 && !teamMembersForSale.some(m => m.id === saleForm.memberId)) {
      setSaleForm(prev => ({ ...prev, memberId: teamMembersForSale[0].id }));
    }
  }, [teamMembersForSale, saleForm.memberId]);

  const totalExpenses = useMemo(() => {
    return formData.expenses.reduce((acc, exp) => acc + exp.amount, 0);
  }, [formData.expenses]);

  const potentialRevenue = useMemo(() => {
    return (formData.ticketQuantity || 0) * (formData.ticketValue || 0);
  }, [formData.ticketQuantity, formData.ticketValue]);

  const isSalePaid = (status: string) => String(status || '').toLowerCase() === 'pago';

  const getEventStats = (event: Event) => {
    const sales = eventSales.filter(s => s.eventId === event.id);
    const paidSales = sales.filter(s => isSalePaid(s.status));
    const raised = paidSales.reduce((acc, s) => acc + s.amount, 0);
    const progress = event.goalValue > 0 ? (raised / event.goalValue) * 100 : 0;
    const netProfit = raised - event.costValue;
    const ticketsSold = paidSales.length;
    const totalTickets = Number(event.ticketQuantity) || 0;
    const ticketsRemaining = totalTickets > 0 ? Math.max(totalTickets - ticketsSold, 0) : null;
    return { raised, progress, netProfit, ticketsSold, totalTickets, ticketsRemaining };
  };

  const handleOpenSaleModal = (event: Event) => {
    const defaultTeam = teams[0];
    const defaultMember = members.find(m => m.teamId === defaultTeam?.id);

    setSelectedEventForSale(event);
    setSaleForm({
      teamId: defaultTeam?.id || '',
      memberId: defaultMember?.id || '',
      buyerName: '',
      quantity: 1,
      amount: Number(event.ticketValue) || 0,
      date: new Date().toISOString().split('T')[0],
      status: 'Pago'
    });
    setShowSaleModal(true);
  };

  const handleCreateSale = async () => {
    if (!selectedEventForSale) return;

    if (!saleForm.teamId || !saleForm.memberId) {
      alert('Selecione equipe e vendedor.');
      return;
    }

    if (saleForm.quantity <= 0 || saleForm.amount < 0) {
      alert('Informe quantidade e valor validos.');
      return;
    }

    try {
      const requests = Array.from({ length: saleForm.quantity }).map(() =>
        api.createEventSale({
          eventId: selectedEventForSale.id,
          teamId: saleForm.teamId,
          memberId: saleForm.memberId,
          buyerName: saleForm.buyerName || 'Ingressos avulsos',
          amount: saleForm.amount,
          status: saleForm.status,
          date: saleForm.date
        })
      );

      await Promise.all(requests);
      loadData();
      setShowSaleModal(false);
      setSelectedEventForSale(null);
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      alert('Erro ao registrar venda.');
    }
  };

  const handleAddExpense = () => {
    if (!newExpense.description || newExpense.amount <= 0) return;
    setFormData({
      ...formData,
      expenses: [...formData.expenses, { id: Math.random().toString(36).substr(2, 9), ...newExpense }]
    });
    setNewExpense({ description: '', amount: 0 });
  };

  const handleRemoveExpense = (id: string) => {
    setFormData({
      ...formData,
      expenses: formData.expenses.filter(e => e.id !== id)
    });
  };

  const handleSave = () => {
    const costValue = totalExpenses;
    const payload: Event = {
      id: editingEventId || '',
      ...formData,
      costValue,
      cityId: '1',
      isActive: true
    } as Event;

    if (editingEventId) {
      api.updateEvent(editingEventId, payload)
        .then((updated: Event) => {
          console.log('Evento atualizado com sucesso:', updated);
          setEvents(events.map(e => e.id === updated.id ? updated : e));
          // Forca reload dos dados para garantir sincronizacao
          setTimeout(() => loadData(), 500);
        })
        .catch((error) => {
          console.error('Erro ao atualizar evento:', error);
        });
    } else {
      api.createEvent(payload)
        .then((created: Event) => {
          console.log('Evento criado com sucesso:', created);
          setEvents([created, ...events]);
          // Forca reload dos dados para garantir sincronizacao
          setTimeout(() => loadData(), 500);
        })
        .catch((error) => {
          console.error('Erro ao criar evento:', error);
        });
    }

    setShowModal(false);
    setEditingEventId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2 lg:px-0">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Gestao de Eventos</h2>
          <p className="text-gray-500 font-medium">Controle de arrecadacao, ingressos e despesas detalhadas.</p>
        </div>
        <button 
          onClick={() => {
            setEditingEventId(null);
            setActiveTab('basic');
            setFormData({
                name: '',
                date: new Date().toISOString().split('T')[0],
                location: '',
                description: '',
                responsible: '',
                goalValue: 0,
                showOnDashboard: true,
                ticketQuantity: 0,
                ticketValue: 0,
                expenses: [],
                teamQuotas: []
            });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 group shrink-0"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          Novo Evento
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-2 lg:px-0">
        {events.map(event => {
          const stats = getEventStats(event);
          return (
            <div key={event.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all border-l-8 border-l-blue-600">
              <div className="p-8 space-y-6 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <Ticket className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 leading-tight">{event.name}</h3>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(event.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-300 hover:text-blue-600 transition-colors"><Edit3 className="w-5 h-5" /></button>
                    <button className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-gray-50">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Gasto Real</p>
                    <p className="text-sm font-black text-red-500">R$ {event.costValue.toFixed(2)}</p>
                  </div>
                  <div className="text-center border-x border-gray-50 px-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Meta Bruta</p>
                    <p className="text-sm font-black text-blue-600">R$ {event.goalValue.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ingressos</p>
                    <p className="text-sm font-black text-gray-700">{stats.ticketsSold} / {stats.totalTickets || "âˆž"}</p>
                    {stats.ticketsRemaining !== null && (
                      <p className="text-[10px] font-black text-amber-600">Restantes: {stats.ticketsRemaining}</p>
                    )}
                  </div>
                   <div className="text-center border-l border-gray-50">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Margem</p>
                    <p className={`text-sm font-black ${stats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>R$ {stats.netProfit.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-gray-400">Arrecadado vs Meta</span>
                    <span className="text-blue-600">R$ {stats.raised.toFixed(2)} ({stats.progress.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all duration-1000 ${stats.progress >= 100 ? 'bg-emerald-500 shadow-emerald-200' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min(stats.progress, 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${event.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{event.isActive ? 'Evento Ativo' : 'Finalizado'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="w-3.5 h-3.5 text-gray-300" />
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Dash: {event.showOnDashboard ? 'Sim' : 'Nao'}</span>
                        </div>
                    </div>
                </div>
              </div>
              <button className="w-full py-4 bg-gray-50 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border-t border-gray-50 flex items-center justify-center gap-2">
                 Ver Detalhamento de Equipes <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {showSaleModal && selectedEventForSale && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">Adicionar venda</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{selectedEventForSale.name}</p>
              </div>
              <button onClick={() => setShowSaleModal(false)} className="p-2 text-gray-400 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Equipe</label>
                <select
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                  value={saleForm.teamId}
                  onChange={(e) => {
                    const teamId = e.target.value;
                    const firstMember = members.find(m => m.teamId === teamId);
                    setSaleForm(prev => ({ ...prev, teamId, memberId: firstMember?.id || '' }));
                  }}
                >
                  <option value="">Selecione</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Vendedor</label>
                <select
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                  value={saleForm.memberId}
                  onChange={(e) => setSaleForm(prev => ({ ...prev, memberId: e.target.value }))}
                >
                  <option value="">Selecione</option>
                  {teamMembersForSale.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Quantidade</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                  value={saleForm.quantity}
                  onChange={(e) => setSaleForm(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Valor unitario (R$)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                  value={saleForm.amount}
                  onChange={(e) => setSaleForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Comprador</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                  value={saleForm.buyerName}
                  onChange={(e) => setSaleForm(prev => ({ ...prev, buyerName: e.target.value }))}
                  placeholder="Nome do comprador"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Data</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                  value={saleForm.date}
                  onChange={(e) => setSaleForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Total da operacao</p>
                <p className="text-2xl font-black text-blue-700">R$ {(saleForm.quantity * saleForm.amount).toFixed(2)}</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <button onClick={() => setShowSaleModal(false)} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500">Cancelar</button>
              <button
                onClick={handleCreateSale}
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Salvar Venda
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL NOVO EVENTO / EDICAO - VERSAO MELHORADA COM TABS */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-500 max-h-[95vh]">
            
            {/* Header */}
            <div className="px-6 sm:px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Ticket className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-gray-900">{editingEventId ? 'Editar Evento' : 'Novo Evento'}</h3>
                  <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest">Configure todos os detalhes</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white rounded-xl transition-all text-gray-400 hover:text-red-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-100 bg-gray-50 px-6 sm:px-8 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setActiveTab('basic')}
                className={`px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === 'basic' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Dados Basicos
              </button>
              <button 
                onClick={() => setActiveTab('expenses')}
                className={`px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === 'expenses' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Gastos
              </button>
              <button 
                onClick={() => setActiveTab('goals')}
                className={`px-4 sm:px-6 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${activeTab === 'goals' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Metas
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1">
              
              {/* ABA: DADOS BASICOS */}
              {activeTab === 'basic' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Nome do Evento *</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Galinhada Beneficente 2024" 
                        className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Data do Evento *</label>
                      <input 
                        type="date" 
                        className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Local do Evento</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Ex: Salao Paroquial" 
                          className="w-full pl-11 pr-4 py-3 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                          value={formData.location} 
                          onChange={e => setFormData({...formData, location: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Descricao</label>
                      <textarea 
                        placeholder="Descreva o evento, objetivo, programacao..." 
                        className="w-full px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" 
                        rows={3}
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Responsavel</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Nome do coordenador" 
                          className="w-full pl-11 pr-4 py-3 sm:py-4 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                          value={formData.responsible} 
                          onChange={e => setFormData({...formData, responsible: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 sm:p-5 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex-1">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Exibir no Dashboard</span>
                        <span className="text-[9px] text-blue-500 font-medium">Visivel na pagina inicial</span>
                      </div>
                      <button 
                        onClick={() => setFormData({...formData, showOnDashboard: !formData.showOnDashboard})} 
                        className="transition-all"
                      >
                        {formData.showOnDashboard ? 
                          <ToggleRight className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600" /> : 
                          <ToggleLeft className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300" />
                        }
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-6 mt-6">
                    <h4 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" /> Ingressos
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 sm:p-5 bg-blue-50 rounded-xl border border-blue-100">
                        <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Quantidade</label>
                        <input 
                          type="number" 
                          placeholder="0" 
                          className="w-full px-4 py-3 bg-white border border-blue-200 rounded-lg text-sm font-black text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                          value={formData.ticketQuantity}
                          onChange={e => setFormData({...formData, ticketQuantity: parseInt(e.target.value) || 0})}
                        />
                      </div>

                      <div className="p-4 sm:p-5 bg-blue-50 rounded-xl border border-blue-100">
                        <label className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Valor Unit.</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 font-black text-xs">R$</span>
                          <input 
                            type="number" 
                            placeholder="0.00" 
                            className="w-full pl-9 pr-4 py-3 bg-white border border-blue-200 rounded-lg text-sm font-black text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                            value={formData.ticketValue}
                            onChange={e => setFormData({...formData, ticketValue: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 bg-blue-600 rounded-xl flex flex-col justify-center">
                        <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest mb-1">Receita Potencial</p>
                        <p className="text-xl sm:text-2xl font-black text-white">R$ {potentialRevenue.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA: GASTOS */}
              {activeTab === 'expenses' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-gray-800">Detalhamento de Custos</h4>
                    <div className="px-4 py-2 bg-red-50 rounded-xl border border-red-100">
                      <span className="text-[10px] font-black text-red-600 uppercase">Total: R$ {totalExpenses.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:gap-4">
                      <div className="sm:col-span-6">
                        <input 
                          type="text" 
                          placeholder="Descricao do gasto..." 
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                          value={newExpense.description}
                          onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input 
                          type="number" 
                          placeholder="Valor R$" 
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                          value={newExpense.amount}
                          onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <button 
                          onClick={handleAddExpense}
                          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
                        >
                          <Plus className="w-4 h-4" /> Adicionar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[320px] overflow-y-auto">
                      {formData.expenses.map(exp => (
                        <div key={exp.id} className="flex items-center justify-between p-3 sm:p-4 bg-white rounded-lg border border-gray-100 group">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                              <Receipt className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 truncate">{exp.description}</span>
                          </div>
                          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                            <span className="text-sm font-black text-red-500">R$ {exp.amount.toFixed(2)}</span>
                            <button onClick={() => handleRemoveExpense(exp.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {formData.expenses.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                          <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                          <p className="text-xs text-gray-400 font-bold">Nenhum gasto cadastrado</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA: METAS */}
              {activeTab === 'goals' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl border border-emerald-100">
                    <label className="block text-xs font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4" /> Meta Total de Arrecadação (Bruto)
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-lg">R$</span>
                      <input 
                        type="number" 
                        className="w-full pl-14 pr-6 py-4 sm:py-5 bg-white border-2 border-emerald-200 rounded-xl text-xl sm:text-2xl font-black text-emerald-700 outline-none focus:ring-4 focus:ring-emerald-100 transition-all"
                        value={formData.goalValue}
                        onChange={e => setFormData({...formData, goalValue: parseFloat(e.target.value) || 0})}
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-[10px] text-emerald-600 font-medium mt-3 px-1">
                      Sua meta deve cobrir os gastos (R$ {totalExpenses.toFixed(2)}) e gerar lucro!
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-gray-800 mb-4">Distribuição por Equipe Base</h4>
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                      {formData.teamQuotas.map((quota, idx) => {
                        const team = teams.find(t => t.id === quota.teamId);
                        return (
                          <div key={quota.teamId} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 transition-all">
                            <span className="text-sm font-bold text-gray-700 flex-1">{team?.name}</span>
                            <div className="relative w-32">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-black text-[10px]">R$</span>
                              <input 
                                type="number" 
                                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                                value={quota.quotaValue}
                                onChange={(e) => {
                                  const newQuotas = [...formData.teamQuotas];
                                  newQuotas[idx].quotaValue = parseFloat(e.target.value) || 0;
                                  setFormData({...formData, teamQuotas: newQuotas});
                                }}
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 sm:px-8 py-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button 
                onClick={() => setShowModal(false)} 
                className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors order-2 sm:order-1"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                disabled={!formData.name || formData.goalValue <= 0}
                className="w-full sm:w-auto bg-blue-600 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
              >
                <Save className="w-4 h-4" /> {editingEventId ? 'Salvar' : 'Criar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsView;





