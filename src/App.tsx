/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Coach, Member, EventItem, SiteSettings, ProgramLevel, CoachAbsence, AuditLog, EventCategory, SwimmingPool, PricingPackage } from './types';
import { api, API_BASE_URL } from './api';
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
  const [absences, setAbsences] = useState<CoachAbsence[]>([]);
  const [pricingPackages, setPricingPackages] = useState<PricingPackage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [eventCategories, setEventCategories] = useState<EventCategory[]>([]);
  const [swimmingPools, setSwimmingPools] = useState<SwimmingPool[]>([]);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeRole = (() => {
    if (currentPath === '/belakang') return 'admin';
    if (currentPath === '/coachs') return 'coach';
    if (currentPath === '/ortu') return 'parent';
    return 'member';
  })();
  const [error, setError] = useState<string | null>(null);

  // Auth States for Admin and Coach
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    const role = localStorage.getItem('user_role');
    return (role === 'admin' || role === 'operator') && !!localStorage.getItem('auth_token');
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
        localStorage.setItem('user_role', res.user.role || 'admin');
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
      const errMsg = err.message || '';
      if (errMsg.includes('Pelatih tidak dapat login')) {
        setAdminLoginError('Pelatih tidak dapat login di dashboard admin.');
      } else {
        setAdminLoginError('Username atau password Admin salah!');
      }
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
    const roleBeforeLogout = localStorage.getItem('user_role');

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

    if (roleBeforeLogout === 'admin' || roleBeforeLogout === 'operator') {
      navigateTo('/belakang');
    } else if (roleBeforeLogout === 'coach') {
      navigateTo('/coachs');
    } else {
      navigateTo('/');
    }

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
        api.getLevels(),
        api.getPricingPackages(),
        api.getEventCategories(),
        api.getSwimmingPools()
      ];

      const canFetchMembers = token && (role === 'admin' || role === 'operator' || role === 'coach');
      if (canFetchMembers) {
        fetchPromises.push(api.getMembers());
        fetchPromises.push(api.getCoachAbsences());
      }

      const results = await Promise.all(fetchPromises);
      setCoaches(results[0]);
      setEvents(results[1]);
      if (results[2] && results[2].status === 'success') {
        setSettings(results[2].settings);
      }
      setLevels(results[3] || []);
      setPricingPackages(results[4] || []);
      setEventCategories(results[5] || []);
      setSwimmingPools(results[6] || []);

      if (canFetchMembers) {
        setMembers(results[7]);
        setAbsences(results[8] || []);
      } else {
        setMembers([]);
        setAbsences([]);
      }

      if (token && role === 'admin') {
        try {
          const logs = await api.getAuditLogs();
          setAuditLogs(logs || []);
        } catch (err) {
          console.error("Failed to load audit logs:", err);
        }
      } else {
        setAuditLogs([]);
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
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
            schedule: added.schedule,
            username: added.username,
            password: added.password,
            email: added.email,
            phone: added.phone,
            certificateUrl: added.certificateUrl
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
            schedule: updated.schedule,
            username: updated.username,
            password: updated.password,
            email: updated.email,
            phone: updated.phone,
            certificateUrl: updated.certificateUrl
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
    console.log("DEBUG: updateMembersState called with", newMembers.length, "members");
    setMembers(newMembers);
    try {
      if (newMembers.length > members.length) {
        console.log("DEBUG: Member added");
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
            schedules: added.schedules,
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
        console.log("DEBUG: Member deleted");
        const deleted = members.find(m => !newMembers.some(nm => nm.id === m.id));
        if (deleted) {
          await api.deleteMember(deleted.id);
        }
      } else {
        console.log("DEBUG: Member modified check");
        await api.debugLog("DEBUG: Member modified check started");
        const updated = newMembers.find(nm => {
          const old = members.find(m => m.id === nm.id);
          const isDiff = old && JSON.stringify(old) !== JSON.stringify(nm);
          if (isDiff) {
            console.log("DEBUG: Diff found for member", nm.id);
          }
          return isDiff;
        });
        if (updated) {
          const old = members.find(m => m.id === updated.id)!;
          console.log("DEBUG: Updating member ID", updated.id);
          console.log("DEBUG: old.progress length:", old.progress.length, "updated.progress length:", updated.progress.length);
          await api.debugLog(`DEBUG: Updating member ID ${updated.id}. Old progress: ${old.progress.length}, New: ${updated.progress.length}`);

          if (updated.progress.length > old.progress.length) {
            const newProgress = updated.progress[0];
            console.log("DEBUG: Calling api.addProgress for", updated.id, newProgress);
            await api.debugLog(`DEBUG: Calling api.addProgress for ${updated.id} with note "${newProgress.note}"`);
            try {
              const res = await api.addProgress({
                memberId: updated.id,
                attendance: newProgress.attendance,
                note: newProgress.note,
                date: newProgress.date
              });
              console.log("DEBUG: api.addProgress response:", res);
              await api.debugLog(`DEBUG: api.addProgress response: ${JSON.stringify(res)}`);
            } catch (err: any) {
              await api.debugLog(`DEBUG: api.addProgress error: ${err.message || err}`);
              throw err;
            }
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
            console.log("DEBUG: Calling api.updateMember for generic changes");
            await api.debugLog("DEBUG: Calling api.updateMember for generic changes");
            await api.updateMember(updated);
          }
        } else {
          console.log("DEBUG: No updated member found in diff check!");
          await api.debugLog("DEBUG: No updated member found in diff check!");
        }
      }
    } catch (e: any) {
      console.error("DEBUG: Failed to update member:", e);
      await api.debugLog(`DEBUG: Failed to update member: ${e.message || e}`);
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
  const handleRegisterMember = async (newMemberData: Omit<Member, 'id' | 'registeredAt'>): Promise<string | null> => {
    try {
      const res = await api.registerMember({
        parent: newMemberData.parent,
        student: newMemberData.student,
        coachId: newMemberData.coachId,
        packageId: newMemberData.packageId,
        scheduleFrequency: newMemberData.scheduleFrequency,
        scheduleDay: newMemberData.scheduleDay,
        scheduleTime: newMemberData.scheduleTime,
        scheduleDay2: newMemberData.scheduleDay2,
        scheduleTime2: newMemberData.scheduleTime2,
        schedules: newMemberData.schedules,
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
      Swal.fire({
        title: 'Pendaftaran Diajukan!',
        text: 'Pendaftaran berhasil diajukan! Silakan hubungi admin untuk verifikasi pembayaran.',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0891b2'
      });
      return res.id || null;
    } catch (e) {
      console.error("Failed to register member via API", e);
      Swal.fire({
        title: 'Pendaftaran Gagal',
        text: 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.',
        icon: 'error',
        confirmButtonText: 'Coba Lagi',
        confirmButtonColor: '#e11d48'
      });
      return null;
    } finally {
      loadAllData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Simulation Header with Role Switchers */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          {/* Logo Brand & Navigation */}
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2 cursor-pointer select-none shrink-0" onClick={() => navigateTo('/')}>
              <span className="text-xl">🏊‍♂️</span>
              <div>
                <h1 className="text-sm font-black text-slate-800 tracking-tight leading-tight">TIRTA BAROKAH</h1>
                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 font-semibold">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Palembang
                </p>
              </div>
            </div>

            {/* Menu in the red box: only show for member role */}
            {activeRole === 'member' && (
              currentPath === '/daftar' ? (
                <button
                  onClick={() => navigateTo('/')}
                  className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer border border-slate-200 shrink-0"
                >
                  ← Kembali ke Beranda
                </button>
              ) : (
                <div className="hidden md:flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold text-slate-600">
                  <button 
                    onClick={() => {
                      const el = document.getElementById('program-info');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hover:text-cyan-600 transition cursor-pointer bg-transparent border-0 p-0 font-bold text-xs"
                  >
                    Kurikulum & Program
                  </button>
                  <button 
                    onClick={() => {
                      const el = document.getElementById('pricing-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hover:text-cyan-600 transition cursor-pointer bg-transparent border-0 p-0 font-bold text-xs"
                  >
                    Paket & Biaya
                  </button>
                  <button 
                    onClick={() => {
                      const el = document.getElementById('coaches-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hover:text-cyan-600 transition cursor-pointer bg-transparent border-0 p-0 font-bold text-xs"
                  >
                    Daftar Pelatih
                  </button>
                  <button 
                    onClick={() => {
                      const el = document.getElementById('events-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="hover:text-cyan-650 transition cursor-pointer bg-transparent border-0 p-0 font-bold text-xs"
                  >
                    Event & Berita
                  </button>
                  <button
                    onClick={() => navigateTo('/daftar')}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer border-0"
                  >
                    Daftar Sekarang
                  </button>
                </div>
              )
            )}

            {activeRole !== 'member' && (
              <div className="flex items-center gap-2.5 ml-auto shrink-0">
                <div className="text-right flex flex-col justify-center hidden sm:flex">
                  <span className="text-[11px] font-black text-slate-800 leading-tight">
                    {localStorage.getItem('user_name') || (localStorage.getItem('user_role') === 'operator' ? 'Operator' : 'Admin Utama')}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                    {localStorage.getItem('user_role') === 'operator' ? 'Operator Portal' : activeRole === 'admin' ? 'Administrator' : 'Pelatih'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-200 transition cursor-pointer flex items-center gap-1 shrink-0"
                >
                  🚪 Keluar Portal
                </button>
              </div>
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
              <p className="text-xs text-slate-605 leading-relaxed">
                Aplikasi React tidak dapat mengambil data dari backend CodeIgniter 4 di <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-rose-600">{API_BASE_URL || window.location.origin}</code>.
              </p>
              <div className="bg-slate-900 text-rose-300 p-4 rounded-xl text-left text-xs font-mono overflow-auto max-h-40 border border-slate-800">
                Error: {error}
              </div>
              <p className="text-[11px] text-slate-505 leading-relaxed">
                Pastikan server backend PHP Anda sudah berjalan, terkonfigurasi dengan benar di hosting Anda, dan URL API di atas dapat diakses.
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
                pricingPackages={pricingPackages}
                swimmingPools={swimmingPools}
                onRegister={handleRegisterMember}
                onUpdateEvents={updateEventsState}
                view={currentPath === '/daftar' ? 'register' : 'home'}
                navigateTo={navigateTo}
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
                </div>
              ) : (
                <AdminDashboard
                  coaches={coaches}
                  members={members}
                  events={events}
                  settings={settings}
                  levels={levels}
                  absences={absences}
                  pricingPackages={pricingPackages}
                  auditLogs={auditLogs}
                  eventCategories={eventCategories}
                  swimmingPools={swimmingPools}
                  userRole={localStorage.getItem('user_role') || 'admin'}
                  onReloadData={loadAllData}
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
                    <p className="text-xs text-slate-500 leading-normal">Silakan masukkan username dan password pelatih Anda untuk mengelola murid.</p>
                  </div>

                  <form onSubmit={handleCoachLogin} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Username Pelatih</label>
                      <input
                        type="text"
                        placeholder="Username"
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
                        placeholder="Password"
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
                  absences={absences}
                  onReloadData={loadAllData}
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
          </div>
          <p className="text-[10px] text-slate-500">© 2026 Tirta Barokah Academy. Semua Hak Dilindungi Undang-Undang.</p>
        </div>
      </footer>


    </div>
  );
}
