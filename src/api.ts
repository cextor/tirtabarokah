/**
 * API Service for communicating with CodeIgniter 4 Backend
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('auth_token');
  const clientKey = 'TirtaBarokahClientSecret2026';

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Key': clientKey,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP Error ${response.status}`);
    }
    // Handle empty response
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error(`API Request failed for ${endpoint}:`, error);
    throw error;
  }
}

export const api = {
  // Auth
  login: (data: any) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  parentLogin: (whatsapp: string) => request('/api/auth/parent-login', { method: 'POST', body: JSON.stringify({ whatsapp }) }),

  // Coaches
  getCoaches: () => request('/api/coaches'),
  addCoach: (data: any) => request('/api/coaches/add', { method: 'POST', body: JSON.stringify(data) }),
  updateCoach: (data: any) => request('/api/coaches/update', { method: 'POST', body: JSON.stringify(data) }),
  deleteCoach: (id: string) => request(`/api/coaches/delete/${id}`, { method: 'DELETE' }),

  // Members
  getMembers: () => request('/api/members'),
  registerMember: (data: any) => request('/api/members/register', { method: 'POST', body: JSON.stringify(data) }),
  verifyPayment: (id: string) => request('/api/members/verify-payment', { method: 'POST', body: JSON.stringify({ id }) }),
  updateMember: (data: any) => request('/api/members/update', { method: 'POST', body: JSON.stringify(data) }),
  deleteMember: (id: string) => request(`/api/members/delete/${id}`, { method: 'DELETE' }),

  // Events
  getEvents: () => request('/api/events'),
  addEvent: (data: any) => request('/api/events/add', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (data: any) => request('/api/events/update', { method: 'POST', body: JSON.stringify(data) }),
  deleteEvent: (id: string) => request(`/api/events/delete/${id}`, { method: 'DELETE' }),

  // Progress
  addProgress: (data: { memberId: string; attendance: string; note: string; date?: string }) => 
    request('/api/progress/add', { method: 'POST', body: JSON.stringify(data) }),
  quickAttendance: (memberId: string, attendance: string) => 
    request('/api/progress/quick', { method: 'POST', body: JSON.stringify({ memberId, attendance }) }),

  // Reschedule
  requestReschedule: (data: { memberId: string; requestedDay: string; requestedTime: string; reason: string }) => 
    request('/api/reschedule/request', { method: 'POST', body: JSON.stringify(data) }),

  // Settings
  getSettings: () => request('/api/settings'),
  updateSettings: (data: any) => request('/api/settings', { method: 'POST', body: JSON.stringify(data) }),

  // Program Levels
  getLevels: () => request('/api/levels'),
  addLevel: (data: any) => request('/api/levels/add', { method: 'POST', body: JSON.stringify(data) }),
  updateLevel: (data: any) => request('/api/levels/update', { method: 'POST', body: JSON.stringify(data) }),
  deleteLevel: (id: string | number) => request(`/api/levels/delete/${id}`, { method: 'DELETE' }),
  debugLog: (message: string) => request('/api/debug/log', { method: 'POST', body: JSON.stringify({ message }) }),

  // Coach Absences
  getCoachAbsences: () => request('/api/absences'),
  reportCoachAbsence: (data: { coachId: string; day: string; time: string; date: string; reason: string }) =>
    request('/api/absences/report', { method: 'POST', body: JSON.stringify(data) }),
  processCoachAbsence: (data: { absenceId: string; status: 'Transfer' | 'Reschedule'; replacementCoachId?: string }) =>
    request('/api/absences/process', { method: 'POST', body: JSON.stringify(data) }),
};
