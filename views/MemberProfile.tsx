import React, { useState, useEffect } from 'react';
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
  Cigarette,
  Accessibility,
  BookOpen,
  Briefcase,
} from 'lucide-react';
import { api } from '../api';
import { Member, BaseTeam } from '../types';
import {
  PageWrapper,
  SectionTitle,
  ContentCard,
  Button,
  Badge,
  Divider,
  PanelCard,
} from '../components/ui';

// ── InfoItem ──────────────────────────────────────────────────────────────────

const InfoItem = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-semibold text-zinc-900">{value?.trim() || <span className="text-zinc-300 italic">—</span>}</p>
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

  const loadData = () => {
    Promise.all([api.getMembers(), api.getTeams()])
      .then(([members, ts]) => {
        setMember(members.find((m: Member) => m.id === memberId) || null);
        setTeams(ts);
      })
      .catch(() => { setMember(null); setTeams([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    window.addEventListener('focus', loadData);
    const iv = setInterval(loadData, 30000);
    return () => { window.removeEventListener('focus', loadData); clearInterval(iv); };
  }, [memberId]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageWrapper>
    );
  }

  if (!member) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-zinc-400 font-bold text-sm uppercase tracking-widest">MFCista não encontrado</p>
          <Button variant="outline" size="sm" iconLeft={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/mfcistas')}>
            Voltar
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const teamName = teams.find(t => t.id === member.teamId)?.name || 'Sem equipe';

  const calcYears = (d: string) => {
    if (!d) return 0;
    const today = new Date();
    const dt = new Date(d);
    let y = today.getFullYear() - dt.getFullYear();
    const m = today.getMonth() - dt.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dt.getDate())) y--;
    return y;
  };

  const TABS = [
    { id: 'pessoal',   label: 'Dados Pessoais',   icon: UserCheck },
    { id: 'endereco',  label: 'Endereço',          icon: MapPin },
    { id: 'saude',     label: 'Outros / Saúde',    icon: Heart },
    { id: 'historico', label: 'Cargos',            icon: Award },
    { id: 'acesso',    label: 'Acesso',            icon: History },
  ] as const;

  return (
    <PageWrapper>
      <div className="space-y-6">

        {/* Back + title */}
        <SectionTitle
          title="Perfil do MFCista"
          icon={UserCheck}
          action={
            <Button variant="ghost" size="sm" iconLeft={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/mfcistas')}>
              Voltar
            </Button>
          }
        />

        {/* Hero card */}
        <ContentCard padding="none" className="overflow-hidden">
          {/* Banner */}
          <div className="h-28 sm:h-36 bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900" />

          <div className="px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-10 sm:-mt-14">
              {/* Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1 shadow-xl shrink-0 border-2 border-white">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className={`w-full h-full rounded-xl flex items-center justify-center text-2xl font-black ${member.gender === 'Masculino' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                    {member.name.substring(0, 2)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-2 mt-2 md:mt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">{member.name}</h2>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    member.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' :
                    member.status === 'Aguardando' ? 'bg-amber-100 text-amber-700' :
                    'bg-zinc-100 text-zinc-500'}`}>
                    {member.status}
                  </span>
                  {member.nickname && (
                    <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-500">
                      "{member.nickname}"
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-zinc-500 font-semibold">
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{member.phone || '—'}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />MFCista há {calcYears(member.mfcDate)} anos</span>
                  <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />{teamName}</span>
                  {member.dob && <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{calcYears(member.dob)} anos</span>}
                </div>
              </div>

              {/* Ação */}
              <Button variant="primary" size="sm" iconLeft={<Edit className="w-3.5 h-3.5" />}
                onClick={() => navigate('/mfcistas', { state: { editId: member.id } })}>
                Editar
              </Button>
            </div>
          </div>
        </ContentCard>

        {/* Layout: nav lateral + conteúdo */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Nav */}
          <div className="lg:col-span-1 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all w-full ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                    : 'bg-white text-zinc-500 hover:bg-zinc-50 border border-zinc-200'
                }`}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          <div className="lg:col-span-3">
            <ContentCard padding="lg">

              {activeTab === 'pessoal' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                    <InfoItem label="Nome Completo" value={member.name} />
                    <InfoItem label="Nome Crachá" value={member.nickname} />
                    <InfoItem label="Data de Nascimento" value={member.dob} />
                    <InfoItem label="Sexo" value={member.gender} />
                    <InfoItem label="RG" value={member.rg} />
                    <InfoItem label="CPF" value={member.cpf} />
                    <InfoItem label="Tipo Sanguíneo" value={member.bloodType} />
                    <InfoItem label="Estado Civil" value={member.maritalStatus} />
                    {member.spouseName && <InfoItem label="Cônjuge" value={member.spouseName} />}
                    {member.spouseCpf && <InfoItem label="CPF do Cônjuge" value={member.spouseCpf} />}
                    {member.marriageDate && <InfoItem label="Data do Casamento" value={member.marriageDate} />}
                    <InfoItem label="MFCista Desde" value={member.mfcDate} />
                    <InfoItem label="Equipe Base" value={teamName} />
                    <InfoItem label="Profissão" value={member.profession} />
                    <InfoItem label="Religião" value={member.religion} />
                    <InfoItem label="Escolaridade" value={member.education} />
                    <InfoItem label="Condir" value={member.condir} />
                  </div>
                </div>
              )}

              {activeTab === 'endereco' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Endereço</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                    <InfoItem label="CEP" value={member.zip} />
                    <InfoItem label="Logradouro" value={member.street} />
                    <InfoItem label="Número" value={member.number} />
                    <InfoItem label="Complemento" value={member.complement} />
                    <InfoItem label="Bairro" value={member.neighborhood} />
                    <InfoItem label="Cidade" value={member.city} />
                    <InfoItem label="Estado" value={member.state} />
                    <InfoItem label="Naturalidade" value={member.naturalness} />
                  </div>
                </div>
              )}

              {activeTab === 'saude' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Família e Saúde</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                    <InfoItem label="Pai" value={member.father} />
                    <InfoItem label="Mãe" value={member.mother} />
                    <Divider className="sm:col-span-2" />
                    <InfoItem label="Fumante" value={member.smoker ? 'Sim' : 'Não'} />
                    <InfoItem label="PCD" value={member.pcd ? 'Sim' : 'Não'} />
                    {member.pcdDescription && <InfoItem label="Descrição PCD" value={member.pcdDescription} />}
                    <InfoItem label="Dificuldade de Locomoção" value={member.mobilityIssue} />
                    <InfoItem label="Plano de Saúde" value={member.healthPlan} />
                    <InfoItem label="Restrição Alimentar" value={member.diet} />
                    <InfoItem label="Medicação em Uso" value={member.medication} />
                    <InfoItem label="Alergia" value={member.allergy} />
                  </div>
                </div>
              )}

              {activeTab === 'historico' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Cargos no Movimento</h3>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-amber-900">Responsabilidades atuais</p>
                      <p className="text-xs text-amber-700 mt-0.5">Cargos exercidos neste período no Movimento.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(member.movementRoles || []).length > 0
                      ? member.movementRoles.map(role => (
                          <span key={role} className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 rounded-lg text-xs font-bold">
                            {role}
                          </span>
                        ))
                      : <p className="text-sm text-zinc-400 italic">Nenhum cargo atribuído. Membro comum.</p>
                    }
                  </div>
                </div>
              )}

              {activeTab === 'acesso' && (
                <div className="space-y-6">
                  <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">Dados de Acesso</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                    <InfoItem label="Data de Cadastro" value={member.createdAt ? new Date(member.createdAt).toLocaleDateString('pt-BR') : undefined} />
                    <InfoItem label="Última Atualização" value={member.updatedAt ? new Date(member.updatedAt).toLocaleDateString('pt-BR') : undefined} />
                  </div>
                  <Divider />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm">Redefinir Senha</Button>
                    <Button variant="outline" size="sm">Alterar E-mail</Button>
                  </div>
                </div>
              )}

            </ContentCard>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
};

export default MemberProfile;
