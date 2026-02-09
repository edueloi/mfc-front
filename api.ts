const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const request = async (path: string, options: RequestInit = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });

  if (!res.ok) {
    let message = 'Erro de requisicao.';
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch (_) {
      // ignore
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
};

export const api = {
  login: (username: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  getCities: () => request('/cities'),
  createCity: (data: any) => request('/cities', { method: 'POST', body: JSON.stringify(data) }),
  updateCity: (id: string, data: any) => request(`/cities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleCity: (id: string, active: boolean) =>
    request(`/cities/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }),
  deleteCity: (id: string) => request(`/cities/${id}`, { method: 'DELETE' }),

  getRoles: () => request('/roles'),
  createRole: (data: any) => request('/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: string, data: any) => request(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id: string) => request(`/roles/${id}`, { method: 'DELETE' }),

  getTeams: () => request('/teams'),
  createTeam: (data: any) => request('/teams', { method: 'POST', body: JSON.stringify(data) }),
  updateTeam: (id: string, data: any) => request(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeam: (id: string) => request(`/teams/${id}`, { method: 'DELETE' }),

  getMembers: () => request('/members'),
  createMember: (data: any) => request('/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id: string, data: any) => request(`/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id: string) => request(`/members/${id}`, { method: 'DELETE' }),

  getUsers: () => request('/users'),
  createUser: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) => request(`/users/${id}`, { method: 'DELETE' }),

  getEvents: () => request('/events'),
  createEvent: (data: any) => request('/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: string, data: any) => request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getEventSales: () => request('/event-sales'),
  createEventSale: (data: any) => request('/event-sales', { method: 'POST', body: JSON.stringify(data) }),

  getPayments: () => request('/payments'),
  createPayment: (data: any) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),

  getLedger: () => request('/ledger'),
  createLedger: (data: any) => request('/ledger', { method: 'POST', body: JSON.stringify(data) }),
  getLedgerEntities: () => request('/ledger-entities'),
  createLedgerEntity: (data: any) => request('/ledger-entities', { method: 'POST', body: JSON.stringify(data) }),
  updateLedgerEntity: (id: string, data: any) => request(`/ledger-entities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLedgerEntity: (id: string) => request(`/ledger-entities/${id}`, { method: 'DELETE' }),

  getDashboardSummary: (month: string, year: string) => request(`/dashboard/summary?month=${month}&year=${year}`),

  // APIs externas (CEP e localidades)
  buscarCEP: (cep: string) => request(`/api/cep/${cep}`),
  getEstados: () => request('/api/estados'),
  getCidadesPorEstado: (uf: string) => request(`/api/estados/${uf}/cidades`),
  getTodasCidades: () => request('/api/cidades')
};
