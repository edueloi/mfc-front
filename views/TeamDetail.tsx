
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Users, Calendar, MapPin, Search, Trash2, Edit } from 'lucide-react';
import { api } from '../api';
import { MemberStatus, Member, BaseTeam } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const TeamDetail: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
    const [team, setTeam] = useState<BaseTeam | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);

  const loadData = () => {
    api.getTeams()
      .then((items: BaseTeam[]) => {
        const found = items.find(t => t.id === teamId) || null;
        setTeam(found);
      })
      .catch(() => setTeam(null));

    api.getMembers()
      .then(setMembers)
      .catch(() => setMembers([]));
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
  }, [teamId]);

  const teamMembers = members.filter(m => m.teamId === teamId);
  const waitingMembers = members.filter(m => m.status === MemberStatus.AGUARDANDO && !m.teamId);

  const handleAttachMember = (member: Member) => {
    if (!teamId) return;
    api.updateMember(member.id, { ...member, teamId })
      .then((updated: Member) => {
        console.log('Membro vinculado com sucesso:', updated);
        setMembers(prev => prev.map(m => (m.id === updated.id ? updated : m)));
        // Força reload dos dados para garantir sincronização
        setTimeout(() => loadData(), 500);
      })
      .catch((error) => {
        console.error('Erro ao vincular membro:', error);
      });
  };

  const ageData = [
    { name: '0-20', value: 2 },
    { name: '21-40', value: 5 },
    { name: '41-60', value: 3 },
    { name: '60+', value: 2 },
  ];

  const birthdayData = [
    { month: 'Jan', count: 1 },
    { month: 'Fev', count: 0 },
    { month: 'Mar', count: 2 },
    { month: 'Abr', count: 1 },
    { month: 'Mai', count: 0 },
    { month: 'Jun', count: 3 },
  ];

  if (!team) return <div>Equipe não encontrada</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/equipes')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{team.name}</h2>
            <p className="text-gray-500">Fundada em {team.createdAt}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddMember(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700">
            <UserPlus className="w-4 h-4" /> Adicionar Membro
          </button>
          <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"><Edit className="w-5 h-5 text-gray-600" /></button>
          <button className="p-2 border border-red-100 rounded-lg hover:bg-red-50"><Trash2 className="w-5 h-5 text-red-500" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Statistics */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">Faixa Etária</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height={192}>
                <PieChart>
                  <Pie data={ageData} dataKey="value" innerRadius={40} outerRadius={60}>
                    {ageData.map((_, i) => <Cell key={i} fill={['#3b82f6', '#6366f1', '#a855f7', '#ec4899'][i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4">Aniversariantes (Próximos Meses)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height={192}>
                <BarChart data={birthdayData}>
                  <XAxis dataKey="month" hide />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Member List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Membros da Equipe ({teamMembers.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {teamMembers.map(member => (
              <div 
                key={member.id} 
                className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/mfcistas/${member.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    {member.name.substring(0, 1)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                   <span className="text-xs font-medium text-gray-400">Desde {member.mfcDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Adicionar Membro à Equipe</h3>
              <button onClick={() => setShowAddMember(false)}><XIcon className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-500 mb-4">Apenas membros com status <strong>Aguardando</strong> estão disponíveis para vinculação.</p>
              <div className="space-y-2">
                {waitingMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-blue-50 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-bold uppercase">
                        {member.name.substring(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.phone}</p>
                      </div>
                    </div>
                    <button onClick={() => handleAttachMember(member)} className="text-blue-600 text-sm font-bold hover:underline">Vincular</button>
                  </div>
                ))}
                {waitingMembers.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 italic">Nenhum membro aguardando vinculação.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const XIcon = ({ className }: { className: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default TeamDetail;



