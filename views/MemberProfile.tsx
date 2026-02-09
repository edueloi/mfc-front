
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Heart,
  Briefcase,
  Award,
  History,
  ShieldAlert,
  Edit,
  UserCheck
} from 'lucide-react';
import { api } from '../api';
import { Member, BaseTeam } from '../types';
const MemberProfile: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
    const [member, setMember] = useState<Member | null>(null);
  const [teams, setTeams] = useState<BaseTeam[]>([]);
  const [activeTab, setActiveTab] = useState<'pessoal' | 'endereco' | 'saude' | 'historico' | 'acesso'>('pessoal');

  const loadData = () => {
    api.getMembers()
      .then((items: Member[]) => {
        const found = items.find(m => m.id === memberId) || null;
        setMember(found);
      })
      .catch(() => setMember(null));

    api.getTeams()
      .then((items: BaseTeam[]) => setTeams(items))
      .catch(() => setTeams([]));
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
  }, [memberId]);

  if (!member) return <div>Membro Não encontrado</div>;

  const teamName = teams.find(t => t.id === member.teamId)?.name || 'Sem equipe';

  const tabs = [
    { id: 'pessoal', label: 'Dados Pessoais', icon: UserCheck },
    { id: 'endereco', label: 'EndereÃ§o', icon: MapPin },
    { id: 'saude', label: 'Outros / SaÃºde', icon: Heart },
    { id: 'historico', label: 'HistÃ³rico / Cargos', icon: Award },
    { id: 'acesso', label: 'Dados Acesso', icon: History },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-3 sm:gap-4">
        <button onClick={() => navigate('/mfcistas')} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
        </button>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Perfil do MFCista</h2>
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-24 sm:h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
        <div className="px-5 sm:px-8 pb-6 sm:pb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-4 sm:gap-6 -mt-10 sm:-mt-12">
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-2xl bg-white p-1 shadow-lg flex-shrink-0">
              <div className="w-full h-full bg-blue-100 rounded-xl flex items-center justify-center text-blue-700 text-2xl sm:text-3xl font-bold uppercase">
                {member.name.substring(0, 2)}
              </div>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{member.name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium self-start ${member.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {member.status}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {member.phone}</div>
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> MFCista desde {member.mfcDate}</div>
                <div className="flex items-center gap-1.5"><LayersIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Equipe: {teamName}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg active:scale-95">
                <Edit className="w-4 h-4" /> <span>Editar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
        {/* Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            {activeTab === 'pessoal' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  <InfoItem label="Nome Completo" value={member.name} />
                  <InfoItem label="Nome Crachá" value={member.nickname} />
                  <InfoItem label="Data Nascimento" value={member.dob} />
                  <InfoItem label="Sexo" value={member.gender} />
                  <InfoItem label="RG" value={member.rg} />
                  <InfoItem label="CPF" value={member.cpf} />
                  <InfoItem label="Tipo SanguÃ­neo" value={member.bloodType} />
                  <InfoItem label="Estado Civil" value={member.maritalStatus} />
                  {member.spouseName && <InfoItem label="Cônjuge" value={member.spouseName} />}
                  {member.marriageDate && <InfoItem label="Data Casamento" value={member.marriageDate} />}
                </div>
              </div>
            )}

            {activeTab === 'endereco' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  <InfoItem label="Logradouro" value={member.street} />
                  <InfoItem label="NÃºmero" value={member.number} />
                  <InfoItem label="Bairro" value={member.neighborhood} />
                  <InfoItem label="CEP" value={member.zip} />
                  <InfoItem label="Cidade" value={member.city} />
                  <InfoItem label="Estado" value={member.state} />
                  <InfoItem label="Naturalidade" value={member.naturalness} />
                  <InfoItem label="Condir" value={member.condir} />
                </div>
              </div>
            )}

            {activeTab === 'saude' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  <InfoItem label="Pai" value={member.father} />
                  <InfoItem label="MÃ£e" value={member.mother} />
                  <InfoItem label="Fuma?" value={member.smoker ? 'Sim' : 'Não'} />
                  <InfoItem label="Dificuldade de LocomoÃ§Ã£o" value={member.mobilityIssue} />
                  <InfoItem label="Plano de SaÃºde" value={member.healthPlan} />
                  <InfoItem label="PCD?" value={member.pcd ? 'Sim' : 'Não'} />
                  {member.pcdDescription && <InfoItem label="DescriÃ§Ã£o DeficiÃªncia" value={member.pcdDescription} />}
                  <InfoItem label="ReligiÃ£o" value={member.religion} />
                  <InfoItem label="ProfissÃ£o" value={member.profession} />
                  <InfoItem label="Escolaridade" value={member.education} />
                </div>
              </div>
            )}

            {activeTab === 'historico' && (
              <div className="space-y-8">
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Cargos Atuais no Movimento</h4>
                    <p className="text-sm text-blue-700">Responsabilidades exercidas neste perÃ­odo.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {member.movementRoles.map(role => (
                    <span key={role} className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                      {role}
                    </span>
                  ))}
                  {member.movementRoles.length === 0 && <p className="text-gray-500 italic">Nenhum cargo atribuÃ­do. Membro comum.</p>}
                </div>
              </div>
            )}

            {activeTab === 'acesso' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  <InfoItem label="UsuÃ¡rio Sistema" value="alziraloretti" />
                  <InfoItem label="E-mail Acesso" value="farahalziraloretti@gmail.com" />
                  <InfoItem label="Data Cadastro no Sistema" value={member.createdAt} />
                  <InfoItem label="Ãšltima AtualizaÃ§Ã£o" value={member.updatedAt} />
                </div>
                <div className="flex gap-4">
                  <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Redefinir Senha</button>
                  <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Alterar E-mail</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
    <p className="text-sm font-medium text-gray-900">{value || '---'}</p>
  </div>
);

const LayersIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

export default MemberProfile;



