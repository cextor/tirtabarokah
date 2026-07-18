/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Coach, Member, EventItem, SiteSettings, ProgramLevel } from './types';
import { api } from './api';
import MainPortal from './components/MainPortal';
import AdminDashboard from './components/AdminDashboard';
import CoachDashboard from './components/CoachDashboard';
import ParentDashboard from './components/ParentDashboard';
import { 
  Users, Shield, Award, UserCheck, RefreshCw, 
  MapPin, Clock, Compass, BookOpen, Volume2, ShieldAlert
} from 'lucide-react';

export default function App() {
  // Global States
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [levels, setLevels] = useState<ProgramLevel[]>([]);
  const [activeRole, setActiveRole] = useState<'member' | 'admin' | 'coach' | 'parent'>(() => {
    const path = window.location.pathname;
    if (path === '/belakang') return 'admin';
    if (path === '/coachs') return 'coach';
    if (path === '/ortu') return 'parent';
    return 'member';
  });
  const [error, setError] = useState<string | null>(null);

  // Auth States for Admin and Coach
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('user_role') === 'admin' && !!localStorage.getItem('auth_token');
  });
  const [adminUsername, setAdminUsername] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);

  const [isCoachLoggedIn, setIsCoachLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('user_role') === 'coach' && !!localStorage.getItem('auth_token');
  });
  const [loggedCoachId, setLoggedCoachId] = useState<string>(() => {
    return localStorage.getItem('logged_user_id') || '';
  });
  const [coachUsername, setCoachUsername] = useState<string>('');
  const [coachPassword, setCoachPassword] = useState<string>('');
  const [coachLoginError, setCoachLoginError] = useState<string | null>(null);

  // Reset login input fields when switching roles
  useEffect(() => {
    if (activeRole !== 'admin') {
      setAdminUsername('');
      setAdminPassword('');
      setAdminLoginError(null);
    }
    if (activeRole !== 'coach') {
      setCoachUsername('');
      setCoachPassword('');
      setCoachLoginError(null);
    }
  }, [activeRole]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAdminLoginError(null);
      const res = await api.login({
        username: adminUsername.trim(),
        password: adminPassword.trim(),
        role: 'admin'
      });
      if (res.status === 'success' && res.token) {
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('user_role', 'admin');
        localStorage.setItem('user_name', res.user.name);
        localStorage.setItem('logged_user_id', res.user.id);
        
        setIsAdminLoggedIn(true);
        setAdminLoginError(null);
        loadAllData();
      } else {
        setAdminLoginError('Username atau password Admin salah!');
      }
    } catch (err: any) {
      console.error(err);
      setAdminLoginError('Username atau password Admin salah!');
    }
  };

  const handleCoachLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachUsername) {
      setCoachLoginError('Silakan masukkan username Pelatih!');
      return;
    }
    
    try {
      setCoachLoginError(null);
      const res = await api.login({
        username: coachUsername.trim(),
        password: coachPassword.trim(),
        role: 'coach'
      });
      if (res.status === 'success' && res.token) {
        localStorage.setItem('auth_token', res.token);
        localStorage.setItem('user_role', 'coach');
        localStorage.setItem('user_name', res.user.name);
        localStorage.setItem('logged_user_id', res.user.id);
        
        setIsCoachLoggedIn(true);
        setLoggedCoachId(res.user.id);
        setCoachLoginError(null);
        loadAllData();
      } else {
        setCoachLoginError('Username atau password Pelatih salah!');
      }
    } catch (err: any) {
      console.error(err);
      setCoachLoginError('Username atau password Pelatih salah!');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error("Logout request failed:", e);
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('logged_user_id');

    setIsAdminLoggedIn(false);
    setIsCoachLoggedIn(false);
    setLoggedCoachId('');
    setActiveRole('member');
    loadAllData();
  };

  // Load from database on mount
  const loadAllData = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('auth_token');
      const role = localStorage.getItem('user_role');

      const fetchPromises: Promise<any>[] = [
        api.getCoaches(),
        api.getEvents(),
        api.getSettings(),
        api.getLevels()
      ];

      const canFetchMembers = token && (role === 'admin' || role === 'coach');
      if (canFetchMembers) {
        fetchPromises.push(api.getMembers());
      }

      const results = await Promise.all(fetchPromises);
      setCoaches(results[0]);
      setEvents(results[1]);
      if (results[2] && results[2].status === 'success') {
        setSettings(results[2].settings);
      }
      setLevels(results[3] || []);

      if (canFetchMembers) {
        setMembers(results[4]);
      } else {
        setMembers([]);
      }
    } catch (e: any) {
      console.error("Failed to load data from MariaDB backend", e);
      
      const errMsg = e.message || String(e);
      if (
        errMsg.includes('Token tidak valid') || 
        errMsg.includes('Token otentikasi diperlukan') || 
        errMsg.includes('Token telah kedaluwarsa')
      ) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_name');
        localStorage.removeItem('logged_user_id');
        setIsAdminLoggedIn(false);
        setIsCoachLoggedIn(false);
        setLoggedCoachId('');
        loadAllData();
        return;
      }
      
      setError(errMsg);
    }
  };

  const handleUpdateSettings = async (newSettings: SiteSettings) => {
    setSettings(newSettings);
    try {
      await api.updateSettings(newSettings);
    } catch (e) {
      console.error("Failed to update settings:", e);
    }
  };

  const handleUpdateLevels = async (newLevels: ProgramLevel[]) => {
    setLevels(newLevels);
    loadAllData();
  };

  useEffect(() => {
    loadAllData();

    // Listen to browser forward/back buttons
    const handlePopState = () => {
      const currentPath = window.location.pathname;
      if (currentPath === '/belakang') {
        setActiveRole('admin');
      } else if (currentPath === '/coachs') {
        setActiveRole('coach');
      } else if (currentPath === '/ortu') {
        setActiveRole('parent');
      } else {
        setActiveRole('member');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync browser URL pathname when activeRole changes
  useEffect(() => {
    const path = window.location.pathname;
    if (activeRole === 'admin' && path !== '/belakang') {
      window.history.pushState(null, '', '/belakang');
    } else if (activeRole === 'coach' && path !== '/coachs') {
      window.history.pushState(null, '', '/coachs');
    } else if (activeRole === 'parent' && path !== '/ortu') {
      window.history.pushState(null, '', '/ortu');
    } else if (activeRole === 'member' && path !== '/') {
      window.history.pushState(null, '', '/');
    }
  }, [activeRole]);

  // Sync to database on updates (Coaches)
  const updateCoachesState = async (newCoaches: Coach[]) => {
    setCoaches(newCoaches);
    try {
      if (newCoaches.length > coaches.length) {
        const added = newCoaches.find(nc => !coaches.some(c => c.id === nc.id));
        if (added) {
          await api.addCoach({
            name: added.name,
            experience: added.experience,
            photo: added.photo,
            maxQuota: added.maxQuota,
            packages: added.packages,
            schedule: added.schedule
          });
        }
      } else if (newCoaches.length < coaches.length) {
        const deleted = coaches.find(c => !newCoaches.some(nc => nc.id === c.id));
        if (deleted) {
          await api.deleteCoach(deleted.id);
        }
      } else {
        const updated = newCoaches.find(nc => {
          const old = coaches.find(c => c.id === nc.id);
          return old && JSON.stringify(old) !== JSON.stringify(nc);
        });
        if (updated) {
          await api.updateCoach({
            id: updated.id,
            name: updated.name,
            experience: updated.experience,
            photo: updated.photo,
            maxQuota: updated.maxQuota,
            isActive: updated.isActive,
            packages: updated.packages,
            schedule: updated.schedule
          });
        }
      }
    } catch (e: any) {
      console.error("Failed to sync coach update to backend", e);
      setError("Gagal mensinkronisasikan perubahan pelatih ke database: " + e.message);
    }
    loadAllData();
  };

  // Sync to database on updates (Members)
  const updateMembersState = async (newMembers: Member[]) => {
    setMembers(newMembers);
    try {
      if (newMembers.length > members.length) {
        const added = newMembers.find(nm => !members.some(m => m.id === nm.id));
        if (added) {
          await api.registerMember({
            parent: added.parent,
            student: added.student,
            coachId: added.coachId,
            packageId: added.packageId,
            scheduleFrequency: added.scheduleFrequency,
            scheduleDay: added.scheduleDay,
            scheduleTime: added.scheduleTime,
            scheduleDay2: added.scheduleDay2,
            scheduleTime2: added.scheduleTime2,
            coachType: added.coachType,
            sessionsLeft: added.sessionsLeft,
            sessionsTotal: added.sessionsTotal,
            payment: {
              amount: added.payment.amount,
              method: added.payment.method,
              proofUrl: added.payment.proofUrl,
              status: added.payment.status,
            },
            referralCodeUsed: added.referralCodeUsed
          });
        }
      } else if (newMembers.length < members.length) {
        const deleted = members.find(m => !newMembers.some(nm => nm.id === m.id));
        if (deleted) {
          await api.deleteMember(deleted.id);
        }
      } else {
        const updated = newMembers.find(nm => {
          const old = members.find(m => m.id === nm.id);
          return old && JSON.stringify(old) !== JSON.stringify(nm);
        });
        if (updated) {
          const old = members.find(m => m.id === updated.id)!;
          
          if (updated.progress.length > old.progress.length) {
            const newProgress = updated.progress[0];
            await api.addProgress({
              memberId: updated.id,
              attendance: newProgress.attendance,
              note: newProgress.note,
              date: newProgress.date
            });
          } else if (updated.scheduleDay !== old.scheduleDay || updated.scheduleTime !== old.scheduleTime) {
            const lastReq = updated.rescheduleRequests?.[updated.rescheduleRequests.length - 1];
            await api.requestReschedule({
              memberId: updated.id,
              requestedDay: updated.scheduleDay,
              requestedTime: updated.scheduleTime,
              reason: lastReq ? lastReq.reason : 'Reschedule kelas'
            });
          } else if (updated.payment.status === 'Pembayaran Berhasil' && old.payment.status !== 'Pembayaran Berhasil') {
            await api.verifyPayment(updated.id);
          } else {
            await api.updateMember(updated);
          }
        }
      }
    } catch (e) {
      console.error("Failed to update member:", e);
    }
    loadAllData();
  };

  // Sync to database on updates (Events)
  const updateEventsState = async (newEvents: EventItem[]) => {
    setEvents(newEvents);
    try {
      if (newEvents.length > events.length) {
        const added = newEvents.find(ne => !events.some(e => e.id === ne.id));
        if (added) {
          await api.addEvent(added);
        }
      } else if (newEvents.length < events.length) {
        const deleted = events.find(e => !newEvents.some(ne => ne.id === e.id));
        if (deleted) {
          await api.deleteEvent(deleted.id);
        }
      } else {
        const updated = newEvents.find(ne => {
          const old = events.find(e => e.id === ne.id);
          return old && JSON.stringify(old) !== JSON.stringify(ne);
        });
        if (updated) {
          await api.updateEvent(updated);
        }
      }
    } catch (e) {
      console.error("Failed to update event:", e);
    }
    loadAllData();
  };

  // Reset database info/notice
  const handleResetApp = () => {
    alert('Karena aplikasi sudah menggunakan basis data MariaDB nyata, proses reset data massal hanya dapat dilakukan dengan me-reimport berkas "backend/db_schema.sql" di phpMyAdmin Anda untuk mencegah kehilangan data secara tidak disengaja.');
  };

  // Registration callback
  const handleRegisterMember = async (newMemberData: Omit<Member, 'id' | 'registeredAt'>) => {
    try {
      await api.registerMember({
        parent: newMemberData.parent,
        student: newMemberData.student,
        coachId: newMemberData.coachId,
        packageId: newMemberData.packageId,
        scheduleFrequency: newMemberData.scheduleFrequency,
        scheduleDay: newMemberData.scheduleDay,
        scheduleTime: newMemberData.scheduleTime,
        scheduleDay2: newMemberData.scheduleDay2,
        scheduleTime2: newMemberData.scheduleTime2,
        coachType: newMemberData.coachType,
        sessionsLeft: newMemberData.sessionsLeft,
        sessionsTotal: newMemberData.sessionsTotal,
        payment: {
          amount: newMemberData.payment.amount,
          method: newMemberData.payment.method,
          proofUrl: newMemberData.payment.proofUrl,
          status: newMemberData.payment.status,
        },
        referralCodeUsed: newMemberData.referralCodeUsed
      });
      alert('Pendaftaran berhasil diajukan! Silakan hubungi admin untuk verifikasi pembayaran.');
    } catch (e) {
      console.error("Failed to register member via API", e);
      alert('Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
    }
    loadAllData();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Simulation Header with Role Switchers */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏊‍♂️</span>
              <div>
                <h1 className="text-sm font-black text-slate-800 tracking-tight">TIRTA BAROKAH</h1>
                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 font-semibold">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Palembang • Sandbox
                </p>
              </div>
            </div>
            {activeRole !== 'member' && (
              <button
                onClick={handleLogout}
                className="bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-200 transition cursor-pointer flex items-center gap-1"
              >
                🚪 Keluar Portal
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-8">
        <div className="space-y-6">
          {error ? (
            <div className="max-w-xl mx-auto my-12 bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">Gagal Terhubung ke Backend</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aplikasi React tidak dapat mengambil data dari backend CodeIgniter 4 di <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-rose-600">http://127.0.0.1:8081</code>.
              </p>
              <div className="bg-slate-900 text-rose-300 p-4 rounded-xl text-left text-xs font-mono overflow-auto max-h-40 border border-slate-800">
                Error: {error}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Pastikan server backend PHP Spark sudah berjalan di terminal Anda dan port <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">8081</code> terbuka serta tidak terhalang kebijakan CORS.
              </p>
              <button
                onClick={loadAllData}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Coba Hubungkan Kembali
              </button>
            </div>
          ) : coaches.length > 0 ? (
            activeRole === 'member' ? (
              <MainPortal 
                coaches={coaches} 
                members={members} 
                events={events}
                settings={settings}
                levels={levels}
                onRegister={handleRegisterMember} 
                onUpdateEvents={updateEventsState}
              />
            ) : activeRole === 'admin' ? (
              !isAdminLoggedIn ? (
                <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto text-cyan-600">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Login Portal Administrator</h3>
                    <p className="text-xs text-slate-505 leading-normal">Gunakan kredensial admin untuk mengakses sistem manajemen privat renang.</p>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Username</label>
                      <input
                        type="text"
                        placeholder="Username (admin)"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white text-sm text-slate-800"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Password</label>
                      <input
                        type="password"
                        placeholder="Password (admin123)"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white text-sm text-slate-800"
                        required
                      />
                    </div>

                    {adminLoginError && (
                      <p className="text-xs text-rose-600 font-semibold text-center">{adminLoginError}</p>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Masuk Administrator
                    </button>
                  </form>
                  
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] text-slate-500 text-center">
                    Demo Login: <strong className="text-slate-700">admin</strong> / <strong className="text-slate-700">admin123</strong>
                  </div>
                </div>
              ) : (
                <AdminDashboard 
                  coaches={coaches} 
                  members={members}
                  events={events}
                  settings={settings}
                  levels={levels}
                  onUpdateSettings={handleUpdateSettings}
                  onUpdateLevels={handleUpdateLevels}
                  onUpdateCoaches={updateCoachesState}
                  onUpdateMembers={updateMembersState}
                  onUpdateEvents={updateEventsState}
                />
              )
            ) : activeRole === 'coach' ? (
              !isCoachLoggedIn ? (
                <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto text-cyan-600">
                      <Award className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Login Portal Pelatih</h3>
                    <p className="text-xs text-slate-505 leading-normal">Silakan pilih identitas pelatih Anda dan masukkan password untuk mengelola murid.</p>
                  </div>

                  <form onSubmit={handleCoachLogin} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Username Pelatih</label>
                      <input
                        type="text"
                        placeholder="Username (rian, nisa, atau dika)"
                        value={coachUsername}
                        onChange={(e) => setCoachUsername(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white text-sm text-slate-800"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Password Pelatih</label>
                      <input
                        type="password"
                        placeholder="Password (coach123)"
                        value={coachPassword}
                        onChange={(e) => setCoachPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white text-sm text-slate-800"
                        required
                      />
                    </div>

                    {coachLoginError && (
                      <p className="text-xs text-rose-600 font-semibold text-center">{coachLoginError}</p>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Masuk Portal Pelatih
                    </button>
                  </form>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] text-slate-500 text-center">
                    Demo Login: Username (<strong className="text-slate-700">rian / nisa / dika</strong>) & Password: <strong className="text-slate-700">coach123</strong>
                  </div>
                </div>
              ) : (
                <CoachDashboard 
                  coaches={coaches} 
                  members={members} 
                  onUpdateMembers={updateMembersState} 
                  loggedCoachId={loggedCoachId}
                />
              )
            ) : (
              <ParentDashboard 
                coaches={coaches} 
                members={members} 
                onUpdateMembers={updateMembersState} 
              />
            )
          ) : (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </main>

      {/* Footer information section */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-xs mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center">
          <div>
            <p className="font-extrabold text-slate-300 tracking-wide text-[10px] uppercase">Private Renang Tirta Barokah Palembang</p>
            <p className="text-[10px] text-slate-500 mt-1">Sistem Informasi Pendaftaran, Penjadwalan & Multi-Dashboard Terpadu</p>
          </div>
          <p className="text-[10px] text-slate-500">© 2026 Tirta Barokah Academy. Semua Hak Dilindungi Undang-Undang.</p>
        </div>
      </footer>


    </div>
  );
}
