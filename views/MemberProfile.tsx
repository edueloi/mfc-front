
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Calendar,
  Heart,
  Award,
  History,
  ShieldAlert,
  UserCheck,
  Layers,
  Edit,
  Briefcase,
  Cake,
  Mail,
  User,
  Fingerprint,
  Users,
  Home,
  Stethoscope,
  Info,
  ExternalLink,
  PhoneCall,
  MessageCircle,
  MoreVertical,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  BookOpen
} from 'lucide-react';
import { api } from '../api';
import { Member, BaseTeam } from '../types';
import {
  PageWrapper,
  ContentCard,
  Button,
  Badge,
  Divider,
  IconButton,
  Modal
} from '../components/ui';
import { MemberForm } from '../components/MemberForm';
import { maskCPF, maskPhone, maskCEP, maskRG, unmask } from '../utils/masks';
import { cn } from '../src/lib/utils';
import toast from 'react-hot-toast';

// ── InfoBlock ──────────────────────────────────────────────────────────────────

const InfoBlock = ({ label, value, icon: Icon, className }: { label: string; value?: string | null; icon?: any; className?: string }) => (
  <div className={cn("p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-blue-200 transition-all group", className)}>
    <div className="flex items-center gap-2.5 mb-1.5">
      {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />}
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
    <p className="text-sm font-bold text-slate-900 tracking-tight">
      {value?.trim() || <span className="text-slate-300 italic font-normal">Não informado</span>}
    </p>
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────

const MemberProfile: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [teams, setTeams] = useState<BaseTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pessoal' | 'endereco' | 'saude' | 'historico' | 'acesso'>('pessoal');
  const [showEditModal, setShowEditModal] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getMembers(), api.getTeams()])
      .then(([members, ts]) => {
        const found = members.find((m: Member) => m.id === memberId);
        if (found) setMember(found);
        setTeams(ts);
      })
      .catch(() => { toast.error('Erro ao carregar dados do MFCista'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('focus', loadData);
    return () => window.removeEventListener('focus', loadData);
  }, [memberId]);

  const team = useMemo(() => teams.find(t => t.id === member?.teamId), [teams, member]);

  const age = useMemo(() => {
    if (!member?.dob) return null;
    const bd = new Date(member.dob);
    const today = new Date();
    let y = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) y--;
    return y;
  }, [member?.dob]);

  const mfcYears = useMemo(() => {
    if (!member?.mfcDate) return 0;
    const dt = new Date(member.mfcDate);
    const today = new Date();
    return today.getFullYear() - dt.getFullYear();
  }, [member?.mfcDate]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-100" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Sincronizando dados...</p>
        </div>
      </PageWrapper>
    );
  }

  if (!member) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center px-6">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center border border-rose-100">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">MFCista não encontrado</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-[280px]">O registro que você procura pode ter sido removido ou o ID é inválido.</p>
          </div>
          <Button variant="outline" size="sm" iconLeft={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
            Voltar para lista
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const TABS = [
    { id: 'pessoal',   label: 'Perfil',   icon: User },
    { id: 'endereco',  label: 'Moradia',  icon: Home },
    { id: 'saude',     label: 'Saúde',    icon: Stethoscope },
    { id: 'historico', label: 'Cargos',   icon: Award },
    { id: 'acesso',    label: 'Acesso',   icon: Zap },
  ] as const;

  return (
    <PageWrapper className="sm:py-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Action Bar */}
        <div className="flex items-center justify-between px-4 sm:px-0">
           <IconButton variant="ghost" size="sm" onClick={() => navigate(-1)} className="bg-white shadow-sm border border-slate-100">
              <ArrowLeft className="w-4 h-4" />
           </IconButton>
           <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-slate-200"
                iconLeft={<Edit className="w-3.5 h-3.5" />}
                onClick={() => setShowEditModal(true)}
              >
                Editar Perfil
              </Button>
           </div>
        </div>

        {/* Hero Section */}
        <div className="relative">
           <ContentCard padding="none" className="overflow-hidden border-none shadow-2xl shadow-slate-200/50 sm:rounded-[2.5rem]">
              {/* Cover */}
              <div className="h-32 sm:h-48 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 relative">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
                 <div className="absolute top-4 right-6 flex gap-2">
                    <Badge color={member.status === 'Ativo' ? 'success' : 'warning'} size="sm" pill dot className="bg-white/10 backdrop-blur-md border-white/20 text-white">
                       {member.status}
                    </Badge>
                 </div>
              </div>

              {/* Profile Bar */}
              <div className="px-6 sm:px-10 pb-8 relative">
                 <div className="flex flex-col sm:flex-row sm:items-end gap-6">
                    {/* Photo/Avatar */}
                    <div className="relative group -mt-12 sm:-mt-16">
                       <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-3xl bg-white p-1.5 shadow-2xl shrink-0 border-4 border-white overflow-hidden relative">
                          {member.photoUrl ? (
                            <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <div className={cn(
                              "w-full h-full rounded-2xl flex items-center justify-center text-4xl font-black shadow-inner border border-slate-100",
                              member.gender === 'Masculino' ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                            )}>
                              {member.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                       </div>
                       <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-lg border-2 border-slate-50 flex items-center justify-center text-blue-600">
                          <CheckCircle2 className="w-6 h-6 fill-current text-blue-600" />
                          <div className="absolute inset-0 bg-blue-600 rounded-2xl opacity-10 animate-ping" />
                       </div>
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 min-w-0 pb-2">
                       <div className="flex flex-col gap-1">
                          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                             {member.name}
                          </h2>
                          <div className="flex flex-wrap items-center gap-3">
                             <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-blue-500" /> {member.nickname || 'MFCista'}
                             </p>
                             <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                             <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-amber-500" /> {team?.name || 'Sem Equipe'}
                             </p>
                          </div>
                       </div>

                       <div className="flex flex-wrap gap-2 mt-4">
                          <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                             <Cake className="w-4 h-4 text-rose-500" />
                             <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Idade</p>
                                <p className="text-xs font-bold text-slate-800">{age ? `${age} anos` : 'N/I'}</p>
                             </div>
                          </div>
                          <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                             <Award className="w-4 h-4 text-blue-500" />
                             <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">No MFC há</p>
                                <p className="text-xs font-bold text-slate-800">{mfcYears} anos</p>
                             </div>
                          </div>
                          <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                             <MapPin className="w-4 h-4 text-emerald-500" />
                             <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Cidade</p>
                                <p className="text-xs font-bold text-slate-800">{member.city || 'N/I'}</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="flex sm:flex-col gap-2 shrink-0">
                       <Button 
                         variant="success" 
                         size="sm" 
                         className="flex-1 sm:w-full"
                         iconLeft={<MessageCircle className="w-4 h-4" />}
                         onClick={() => window.open(`https://wa.me/55${member.phone?.replace(/\D/g, '')}`, '_blank')}
                       >
                         WhatsApp
                       </Button>
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="flex-1 sm:w-full"
                         iconLeft={<PhoneCall className="w-4 h-4" />}
                         onClick={() => window.open(`tel:${member.phone}`, '_blank')}
                       >
                         Ligar
                       </Button>
                    </div>
                 </div>
              </div>
           </ContentCard>
        </div>

        {/* Layout: Content + Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
           
           {/* Sidebar Navigation */}
           <div className="lg:col-span-3 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar p-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-1 lg:w-full border",
                    activeTab === tab.id
                      ? "bg-blue-600 text-white border-blue-700 shadow-xl shadow-blue-100 translate-x-1 lg:translate-x-2"
                      : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50 hover:border-slate-200"
                  )}
                >
                  <tab.icon className={cn("w-4 h-4 shrink-0", activeTab === tab.id ? "text-white" : "text-slate-400")} />
                  {tab.label}
                </button>
              ))}
           </div>

           {/* Main Content Area */}
           <div className="lg:col-span-9 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <ContentCard className="border-none shadow-xl shadow-slate-200/50 sm:rounded-[2.5rem]" padding="lg">
                 
                 {activeTab === 'pessoal' && (
                    <div className="space-y-8">
                       <div className="flex items-center justify-between">
                          <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                             <User className="w-5 h-5 text-blue-600" /> Dados Pessoais
                          </h3>
                          <Badge color="info" size="sm">Informações de Registro</Badge>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <InfoBlock label="Nome Completo" value={member.name} icon={User} className="lg:col-span-2" />
                          <InfoBlock label="Nome Crachá" value={member.nickname} icon={Fingerprint} />
                          <InfoBlock label="Data de Nascimento" value={member.dob} icon={Cake} />
                          <InfoBlock label="Sexo" value={member.gender} icon={Users} />
                          <InfoBlock label="Estado Civil" value={member.maritalStatus} icon={Heart} />
                          <InfoBlock label="RG" value={member.rg} icon={Fingerprint} />
                          <InfoBlock label="CPF" value={member.cpf} icon={Fingerprint} />
                          <InfoBlock label="Tipo Sanguíneo" value={member.bloodType} icon={Heart} />
                          <InfoBlock label="Profissão" value={member.profession} icon={Briefcase} />
                          <InfoBlock label="Religião" value={member.religion} icon={Shield} />
                          <InfoBlock label="Escolaridade" value={member.education} icon={BookOpen} />
                          <InfoBlock label="Naturalidade" value={member.naturalness} icon={MapPin} />
                       </div>

                       {member.maritalStatus === 'Casado' && (
                          <div className="p-6 rounded-[2rem] bg-rose-50/50 border border-rose-100 mt-8">
                             <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Heart className="w-4 h-4" /> Dados do Casamento
                             </h4>
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <InfoBlock label="Cônjuge" value={member.spouseName} className="bg-white border-rose-100" />
                                <InfoBlock label="CPF Cônjuge" value={member.spouseCpf} className="bg-white border-rose-100" />
                                <InfoBlock label="Data Casamento" value={member.marriageDate} className="bg-white border-rose-100" />
                             </div>
                          </div>
                       )}
                    </div>
                 )}

                 {activeTab === 'endereco' && (
                    <div className="space-y-8">
                       <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                          <Home className="w-5 h-5 text-emerald-600" /> Endereço Residencial
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <InfoBlock label="CEP" value={member.zip} icon={MapPin} />
                          <InfoBlock label="Bairro" value={member.neighborhood} icon={MapPin} />
                          <InfoBlock label="Cidade" value={member.city} icon={MapPin} />
                          <InfoBlock label="Logradouro" value={member.street} icon={MapPin} className="lg:col-span-2" />
                          <InfoBlock label="Número" value={member.number} />
                          <InfoBlock label="Complemento" value={member.complement} />
                          <InfoBlock label="Estado" value={member.state} />
                       </div>
                       <div className="h-40 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 gap-3">
                          <MapPin className="w-8 h-8 opacity-20" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Mapa não disponível nesta versão</p>
                       </div>
                    </div>
                 )}

                 {activeTab === 'saude' && (
                    <div className="space-y-8">
                       <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                          <Stethoscope className="w-5 h-5 text-rose-600" /> Saúde e Cuidados
                       </h3>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Filiação</p>
                             <div className="space-y-4">
                                <InfoBlock label="Pai" value={member.father} icon={User} className="bg-white" />
                                <InfoBlock label="Mãe" value={member.mother} icon={User} className="bg-white" />
                             </div>
                          </div>
                          <div className="p-6 rounded-[2rem] bg-rose-50/30 border border-rose-100">
                             <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4">Alergias e Restrições</p>
                             <div className="space-y-4">
                                <InfoBlock label="Alergias" value={member.allergy} icon={ShieldAlert} className="bg-white border-rose-200" />
                                <InfoBlock label="Restrição Alimentar" value={member.diet} icon={ShieldAlert} className="bg-white border-rose-200" />
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                          <InfoBlock label="Fumante" value={member.smoker ? 'Sim' : 'Não'} />
                          <InfoBlock label="PCD" value={member.pcd ? 'Sim' : 'Não'} />
                          <InfoBlock label="Plano de Saúde" value={member.healthPlan} className="lg:col-span-2" />
                       </div>

                       <InfoBlock label="Medicação em Uso" value={member.medication} className="w-full" />
                    </div>
                 )}

                 {activeTab === 'historico' && (
                    <div className="space-y-8">
                       <div className="flex items-center justify-between">
                          <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                             <Award className="w-5 h-5 text-amber-600" /> Trajetória no MFC
                          </h3>
                          <Badge color="warning" size="sm">Histórico de Cargos</Badge>
                       </div>
                       
                       <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full -mr-16 -mt-16 opacity-20 blur-2xl" />
                          <div className="relative flex flex-col gap-6">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                                   <Zap className="w-6 h-6 text-amber-400" />
                                </div>
                                <div>
                                   <p className="text-xl font-black tracking-tight">MFCista Desde {member.mfcDate?.split('-')[0] || '?'}</p>
                                   <p className="text-xs text-slate-400">Tempo de caminhada e contribuição ao movimento.</p>
                                </div>
                             </div>
                             
                             <div className="space-y-3 mt-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Cargos Atuais e Anteriores</p>
                                <div className="flex flex-wrap gap-2">
                                   {(member.movementRoles || []).length > 0 ? (
                                     member.movementRoles.map((role, idx) => (
                                       <div key={idx} className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold hover:bg-white/10 transition-colors cursor-default">
                                          {role}
                                       </div>
                                     ))
                                   ) : (
                                     <div className="p-10 w-full rounded-[2rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 text-center">
                                        <Award className="w-8 h-8 mb-2 opacity-20" />
                                        <p className="text-xs font-bold">Nenhum cargo específico registrado.</p>
                                     </div>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 )}

                 {activeTab === 'acesso' && (
                    <div className="space-y-8">
                       <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                          <Zap className="w-5 h-5 text-indigo-600" /> Segurança e Acesso
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <InfoBlock label="Data de Cadastro" value={member.createdAt ? new Date(member.createdAt).toLocaleDateString('pt-BR') : '—'} icon={Calendar} />
                          <InfoBlock label="Última Atualização" value={member.updatedAt ? new Date(member.updatedAt).toLocaleDateString('pt-BR') : '—'} icon={Clock} />
                       </div>

                       <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                             <div className="space-y-1">
                                <p className="text-base font-black text-slate-900 tracking-tight">Gerenciamento de Conta</p>
                                <p className="text-xs text-slate-500 font-medium">Controle de acesso e credenciais do sistema.</p>
                             </div>
                             <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" className="bg-white">Redefinir Senha</Button>
                                <Button variant="outline" size="sm" className="bg-white">Alterar E-mail</Button>
                             </div>
                          </div>
                       </div>

                       <div className="p-6 rounded-[2rem] bg-rose-50/50 border border-rose-100 flex items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                                <ShieldAlert className="w-5 h-5" />
                             </div>
                             <div>
                                <p className="text-sm font-black text-slate-900">Desativar Cadastro</p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Membro ficará inativo no sistema</p>
                             </div>
                          </div>
                          <Button variant="danger" size="xs">Desativar</Button>
                       </div>
                    </div>
                 )}

              </ContentCard>
           </div>
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar MFCista"
        size="xl"
      >
        <MemberForm
          isEditing
          teams={teams}
          initialData={{
            ...member,
            rg: maskRG(member.rg || ''),
            cpf: maskCPF(member.cpf || ''),
            zip: maskCEP(member.zip || ''),
            phone: maskPhone(member.phone || ''),
            emergencyPhone: maskPhone(member.emergencyPhone || ''),
            spouseCpf: maskCPF(member.spouseCpf || ''),
          }}
          onCancel={() => setShowEditModal(false)}
          onSave={(data) => {
            const payload = {
              ...data,
              rg: unmask(data.rg),
              cpf: unmask(data.cpf),
              zip: unmask(data.zip),
              phone: unmask(data.phone),
              emergencyPhone: unmask(data.emergencyPhone),
              spouseCpf: unmask(data.spouseCpf),
            };
            toast.promise(
              api.updateMember(member.id, payload).then((u) => {
                setMember(u);
                setShowEditModal(false);
              }),
              { loading: 'Salvando...', success: 'Perfil atualizado! ✅', error: (e) => e.message }
            );
          }}
        />
      </Modal>
    </PageWrapper>
  );
};

export default MemberProfile;
