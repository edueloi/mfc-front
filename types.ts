
export enum MemberStatus {
  ATIVO = 'Ativo',
  INATIVO = 'Inativo',
  PENDENTE = 'Pendente',
  CONVIDADO = 'Convidado',
  AGUARDANDO = 'Aguardando'
}

export enum UserRoleType {
  ADMIN = 'Administrador',
  COORD_CIDADE = 'Coordenador Cidade',
  COORD_ESTADO = 'Coordenador Estado',
  SEC_COM_CIDADE = 'Secretário Comunicação Cidade',
  SEC_COM_ESTADO = 'Secretário Comunicação Estado',
  COORD_CONDIR = 'Coordenador Condir',
  COORD_EQUIPE_BASE = 'Coordenador Equipe Base',
  VICE_COORD = 'Vice Coordenador',
  TESOUREIRO = 'Tesoureiro',
  USUARIO = 'Usuário'
}

export type ModuleAction = 'view' | 'create' | 'edit' | 'delete' | 'launch';

export interface City {
  id: string;
  name: string;
  uf: string;
  mfcSince?: string;
  active?: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  cityId: string;
  role: UserRoleType;
  teamId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventTeamQuota {
  teamId: string;
  quotaValue: number;
}

export interface EventExpense {
  id: string;
  description: string;
  amount: number;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  costValue: number; // Agora é a soma das expenses
  goalValue: number;
  cityId: string;
  isActive: boolean;
  showOnDashboard: boolean;
  teamQuotas: EventTeamQuota[];
  // Novos Campos
  ticketQuantity?: number;
  ticketValue?: number;
  expenses: EventExpense[];
}

export interface EventSale {
  id: string;
  eventId: string;
  teamId: string;
  memberId: string; // Vendedor
  buyerName: string;
  amount: number;
  status: 'Pago' | 'Pendente';
  date: string;
}

export interface Payment {
  id: string;
  memberId: string;
  teamId: string;
  amount: number;
  date: string;
  referenceMonth: string;
  status: 'Pago' | 'Pendente' | 'Isento';
  launchedBy: string;
}

export interface FinancialEntity {
  id: string;
  name: string;
  year: number;
  createdBy: string;
  observations?: string;
  initialBalance: number;
}

export interface Member {
  id: string;
  name: string;
  nickname: string;
  dob: string;
  rg: string;
  cpf: string;
  bloodType: string;
  gender: string;
  maritalStatus: string;
  spouseName?: string;
  spouseCpf?: string;
  marriageDate?: string;
  mfcDate: string;
  phone: string;
  emergencyPhone: string;
  status: MemberStatus;
  teamId?: string;
  street: string;
  number: string;
  neighborhood: string;
  zip: string;
  complement?: string;
  city: string;
  state: string;
  condir: string;
  naturalness: string;
  father: string;
  mother: string;
  smoker: boolean;
  mobilityIssue: string;
  healthPlan: string;
  diet: string;
  medication: string;
  allergy: string;
  pcd: boolean;
  pcdDescription?: string;
  profession: string;
  religion: string;
  education: string;
  movementRoles: string[];
  createdAt: string;
  updatedAt: string;
  isPaymentInactive?: boolean;
}

export interface BaseTeam {
  id: string;
  name: string;
  city: string;
  state: string;
  isYouth: boolean;
  createdAt: string;
  memberCount: number;
}
