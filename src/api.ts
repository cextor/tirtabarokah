/**
 * API Service for communicating with CodeIgniter 4 Backend
 */

export const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl !== 'https://api.tirtabarokah.id' && envUrl !== 'https://apidemo.tirtabarokah.id') {
    return envUrl;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '';
    }
    if (hostname === 'demo.tirtabarokah.id') {
      return 'https://apidemo.tirtabarokah.id';
    }
    if (hostname === 'tirtabarokah.id' || hostname === 'www.tirtabarokah.id') {
      return 'https://api.tirtabarokah.id';
    }
    if (hostname.endsWith('tirtabarokah.id')) {
      const prefix = hostname.replace('.tirtabarokah.id', '').replace('www.', '');
      if (prefix && prefix !== 'tirtabarokah') {
        return `https://api${prefix}.tirtabarokah.id`;
      }
    }
  }
  return 'https://apidemo.tirtabarokah.id';
})();

export function getMediaUrl(url?: string | null): string {
  if (!url) return '/images/default_coach.jpg';
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  if (API_BASE_URL) {
    return `${API_BASE_URL}${cleanPath}`;
  }
  return cleanPath;
}

async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('auth_token');
  const clientKey = 'TirtaBarokahClientSecret2026';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

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
    signal: options.signal || controller.signal,
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.message === 'string' && parsed.message) {
            errorMsg = parsed.message;
          } else if (typeof parsed.messages === 'string' && parsed.messages) {
            errorMsg = parsed.messages;
          } else if (parsed.messages && typeof parsed.messages === 'object') {
            const msgs = Object.values(parsed.messages).filter((m: any) => typeof m === 'string' && m.trim().length > 0);
            if (msgs.length > 0) {
              errorMsg = msgs.join(', ');
            }
          } else if (typeof parsed.error === 'string' && parsed.error) {
            errorMsg = parsed.error;
          }
        }
      } catch {
        if (errorText && !errorText.startsWith('<html')) {
          errorMsg = errorText;
        }
      }
      const err: any = new Error(errorMsg);
      err.status = response.status;
      throw err;
    }
    // Handle empty response
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    const status = (error as any)?.status;
    if (!status || status >= 500) {
      console.error(`API Request failed for ${endpoint}:`, error);
    }
    throw error;
  }
}

export const api = {
  // Auth
  login: (data: any) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  parentLogin: (whatsapp: string) => request('/api/auth/parent-login', { method: 'POST', body: JSON.stringify({ whatsapp }) }),
  changePassword: (data: { oldPassword?: string; newPassword: string; targetUsername?: string }) => request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

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

  // Pricing Packages
  getPricingPackages: () => request('/api/pricing-packages'),
  addPricingPackage: (data: any) => request('/api/pricing-packages/add', { method: 'POST', body: JSON.stringify(data) }),
  updatePricingPackage: (data: any) => request('/api/pricing-packages/update', { method: 'POST', body: JSON.stringify(data) }),
  deletePricingPackage: (id: string) => request(`/api/pricing-packages/delete/${id}`, { method: 'DELETE' }),

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

  // Audit Logs
  getAuditLogs: () => request('/api/audit-logs'),

  // Event Categories
  getEventCategories: () => request('/api/event-categories'),
  addEventCategory: (name: string) => request('/api/event-categories/add', { method: 'POST', body: JSON.stringify({ name }) }),
  updateEventCategory: (id: string | number, name: string) => request('/api/event-categories/update', { method: 'POST', body: JSON.stringify({ id, name }) }),
  deleteEventCategory: (id: string | number) => request(`/api/event-categories/delete/${id}`, { method: 'DELETE' }),

  // Swimming Pools
  getSwimmingPools: () => request('/api/swimming-pools'),
  addSwimmingPool: (data: any) => request('/api/swimming-pools/add', { method: 'POST', body: JSON.stringify(data) }),
  updateSwimmingPool: (data: any) => request('/api/swimming-pools/update', { method: 'POST', body: JSON.stringify(data) }),
  deleteSwimmingPool: (id: string) => request(`/api/swimming-pools/delete/${id}`, { method: 'DELETE' }),
};
