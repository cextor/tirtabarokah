/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { Coach, Member, EventItem, SiteSettings, ProgramLevel, CoachAbsence, AuditLog, EventCategory, SwimmingPool, PricingPackage } from './types';
import { api, API_BASE_URL, getMediaUrl } from './api';
import MainPortal from './components/MainPortal';
import AdminDashboard from './components/AdminDashboard';
import CoachDashboard from './components/CoachDashboard';
import ParentDashboard from './components/ParentDashboard';
import {
  Users, Shield, Award, UserCheck, RefreshCw,
  MapPin, Clock, Compass, BookOpen, Volume2, ShieldAlert, Menu, X,
  Key, LogOut, ChevronDown, Eye, EyeOff, User, Mail, Phone, ShieldCheck, ExternalLink
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const navigateTo = (path: string) => {
    setIsMobileMenuOpen(false);
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
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [hasInitialLoaded, setHasInitialLoaded] = useState<boolean>(false);
  const [isAdminLoggingIn, setIsAdminLoggingIn] = useState<boolean>(false);
  const [isCoachLoggingIn, setIsCoachLoggingIn] = useState<boolean>(false);

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

  // Profile Dropdown Menu & Change Password States
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);
  const [showProfileCardModal, setShowProfileCardModal] = useState<boolean>(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showOldPassword, setShowOldPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);

    if (!newPassword || newPassword.length < 4) {
      setChangePasswordError('Password baru minimal 4 karakter!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError('Konfirmasi password baru tidak cocok!');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.changePassword({
        oldPassword,
        newPassword
      });

      if (res.status === 'success' || res.message) {
        Swal.fire({
          title: 'Password Diperbarui!',
          text: 'Password akun Anda telah berhasil diubah. Gunakan password baru untuk login berikutnya.',
          icon: 'success',
          confirmButtonColor: '#06b6d4'
        });
        setShowChangePasswordModal(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setChangePasswordError(res.message || 'Gagal mengubah password.');
      }
    } catch (err: any) {
      console.error('Failed to change password:', err);
      setChangePasswordError(err.message || 'Password lama salah atau terjadi kesalahan.');
    } finally {
      setIsChangingPassword(false);
    }
  };

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
    setIsAdminLoggingIn(true);
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
        await loadTabData(res.user.role === 'operator' ? 'verifikasi' : 'dashboard');
      } else {
        setAdminLoginError('Username atau password Admin salah!');
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('Pelatih tidak dapat login')) {
        setAdminLoginError('Pelatih tidak dapat login di dashboard admin.');
      } else if (errMsg && !errMsg.startsWith('{') && !errMsg.startsWith('HTTP Error')) {
        setAdminLoginError(errMsg);
      } else {
        setAdminLoginError('Username atau password Admin salah!');
      }
    } finally {
      setIsAdminLoggingIn(false);
    }
  };

  const handleCoachLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachUsername) {
      setCoachLoginError('Silakan masukkan username Pelatih!');
      return;
    }
    setIsCoachLoggingIn(true);

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
        await loadTabData('students');
      } else {
        setCoachLoginError('Username atau password Pelatih salah!');
      }
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg && !errMsg.startsWith('{') && !errMsg.startsWith('HTTP Error')) {
        setCoachLoginError(errMsg);
      } else {
        setCoachLoginError('Username atau password Pelatih salah!');
      }
    } finally {
      setIsCoachLoggingIn(false);
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
    setHasInitialLoaded(false);

    if (roleBeforeLogout === 'admin' || roleBeforeLogout === 'operator') {
      navigateTo('/belakang');
    } else if (roleBeforeLogout === 'coach') {
      navigateTo('/coachs');
    } else {
      navigateTo('/');
    }

    loadTabData('public');
  };

  const pendingPromiseRef = useRef<Promise<void> | null>(null);

  // STRICT TARGETED FETCHING: Fetches ONLY the exact endpoints required for the current active page
  const loadTabData = async (tabNameOrForce?: string | boolean) => {
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('user_role');
    const path = window.location.pathname;

    const isUnauthAdmin = (path === '/belakang' || currentPath === '/belakang') && (!token || (role !== 'admin' && role !== 'operator'));
    const isUnauthCoach = (path === '/coachs' || currentPath === '/coachs') && (!token || role !== 'coach');

    if (isUnauthAdmin || isUnauthCoach) {
      setIsDataLoading(false);
      return;
    }

    const tabName = String(tabNameOrForce);

    // TAILORED FETCHING FOR COACH ROLE: Only fetch exact data required for CoachDashboard tabs
    if (role === 'coach') {
      try {
        switch (tabName) {
          case 'report_absence':
          case 'absence_history': {
            const [absencesData, coachesData] = await Promise.all([
              api.getCoachAbsences(),
              api.getCoaches()
            ]);
            setAbsences(absencesData || []);
            setCoaches(coachesData || []);
            break;
          }
          case 'schedule': {
            const [coachesData, membersData] = await Promise.all([
              api.getCoaches(),
              api.getMembers()
            ]);
            setCoaches(coachesData || []);
            setMembers(membersData || []);
            break;
          }
          case 'students':
          case 'laporan_coachs':
          default: {
            const [coachesData, membersData, absencesData] = await Promise.all([
              api.getCoaches(),
              api.getMembers(),
              api.getCoachAbsences()
            ]);
            setCoaches(coachesData || []);
            setMembers(membersData || []);
            setAbsences(absencesData || []);
            break;
          }
        }
      } catch (err) {
        console.error(`Failed to load coach tab data for ${tabName}:`, err);
      }
      return;
    }

    if (role !== 'admin' && role !== 'operator') {
      return;
    }
    try {
      switch (tabName) {
        case 'pelatih': {
          const [coachesData, membersData] = await Promise.all([
            api.getCoaches(),
            api.getMembers()
          ]);
          setCoaches(coachesData || []);
          setMembers(membersData || []);
          break;
        }
        case 'peserta': {
          const [membersData, coachesData, levelsData, packagesData, poolsData] = await Promise.all([
            api.getMembers(),
            api.getCoaches(),
            api.getLevels(),
            api.getPricingPackages(),
            api.getSwimmingPools()
          ]);
          setMembers(membersData || []);
          setCoaches(coachesData || []);
          setLevels(levelsData || []);
          setPricingPackages(packagesData || []);
          setSwimmingPools(poolsData || []);
          break;
        }
        case 'verifikasi': {
          const [membersData, packagesData, poolsData, coachesData] = await Promise.all([
            api.getMembers(),
            api.getPricingPackages(),
            api.getSwimmingPools(),
            api.getCoaches()
          ]);
          setMembers(membersData || []);
          setPricingPackages(packagesData || []);
          setSwimmingPools(poolsData || []);
          setCoaches(coachesData || []);
          break;
        }
        case 'absensi_coach': {
          const [absencesData, coachesData] = await Promise.all([
            api.getCoachAbsences(),
            api.getCoaches()
          ]);
          setAbsences(absencesData || []);
          setCoaches(coachesData || []);
          break;
        }
        case 'reminder':
        case 'jadwal_hari_ini': {
          const [membersData, coachesData, poolsData] = await Promise.all([
            api.getMembers(),
            api.getCoaches(),
            api.getSwimmingPools()
          ]);
          setMembers(membersData || []);
          setCoaches(coachesData || []);
          setSwimmingPools(poolsData || []);
          break;
        }
        case 'events': {
          const [eventsData, categoriesData] = await Promise.all([
            api.getEvents(),
            api.getEventCategories()
          ]);
          setEvents(eventsData || []);
          setEventCategories(categoriesData || []);
          break;
        }
        case 'kolam_renang': {
          const poolsData = await api.getSwimmingPools();
          setSwimmingPools(poolsData || []);
          break;
        }
        case 'laporan': {
          const [membersData, packagesData] = await Promise.all([
            api.getMembers(),
            api.getPricingPackages()
          ]);
          setMembers(membersData || []);
          setPricingPackages(packagesData || []);
          break;
        }
        case 'laporan_coachs': {
          const [coachesData, membersData, absencesData] = await Promise.all([
            api.getCoaches(),
            api.getMembers(),
            api.getCoachAbsences()
          ]);
          setCoaches(coachesData || []);
          setMembers(membersData || []);
          setAbsences(absencesData || []);
          break;
        }
        case 'audit_logs': {
          if (role === 'admin') {
            const logs = await api.getAuditLogs();
            setAuditLogs(logs || []);
          }
          break;
        }
        case 'pengaturan': {
          const [settingsData, levelsData] = await Promise.all([
            api.getSettings(),
            api.getLevels()
          ]);
          if (settingsData && settingsData.status === 'success') {
            setSettings(settingsData.settings);
          }
          setLevels(levelsData || []);
          break;
        }
        case 'paket_harga': {
          const [packagesData, coachesData] = await Promise.all([
            api.getPricingPackages(),
            api.getCoaches()
          ]);
          setPricingPackages(packagesData || []);
          setCoaches(coachesData || []);
          break;
        }
        case 'public': {
          const fetchFns: (() => Promise<any>)[] = [
            () => api.getCoaches(),
            () => api.getEvents(),
            () => api.getSettings(),
            () => api.getLevels(),
            () => api.getPricingPackages(),
            () => api.getSwimmingPools()
          ];
          const results: any[] = [];
          for (const fn of fetchFns) {
            results.push(await fn());
          }
          setCoaches(results[0] || []);
          setEvents(results[1] || []);
          if (results[2] && results[2].status === 'success') {
            setSettings(results[2].settings);
          }
          setLevels(results[3] || []);
          setPricingPackages(results[4] || []);
          setSwimmingPools(results[5] || []);
          setMembers([]);
          setAbsences([]);
          setAuditLogs([]);
          break;
        }
        case 'dashboard':
        default: {
          const [membersData, coachesData, packagesData, poolsData] = await Promise.all([
            api.getMembers(),
            api.getCoaches(),
            api.getPricingPackages(),
            api.getSwimmingPools()
          ]);
          setMembers(membersData || []);
          setCoaches(coachesData || []);
          setPricingPackages(packagesData || []);
          setSwimmingPools(poolsData || []);
          break;
        }
      }
    } catch (err) {
      console.error(`Failed to load tab data for ${tabName}:`, err);
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
    loadTabData('pengaturan');
  };

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    const path = window.location.pathname;
    if (path === '/belakang') {
      loadTabData(role === 'operator' ? 'verifikasi' : 'dashboard');
    } else if (path === '/coachs') {
      loadTabData('students');
    } else {
      loadTabData('public');
    }

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
    loadTabData('pelatih');
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
    loadTabData('peserta');
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
    loadTabData('events');
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
      loadTabData('verifikasi');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Simulation Header with Role Switchers */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs px-4 py-3 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          {/* Logo Brand & Mobile Header Row */}
          <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2.5 cursor-pointer select-none shrink-0" onClick={() => navigateTo('/')}>
              <img src="/images/logo.png" alt="Logo Private Renang Tirta Barokah" className="h-9 md:h-10 w-auto max-w-[110px] md:max-w-[120px] object-contain shrink-0 drop-shadow-xs" />
              <div>
                <h1 className="text-xs md:text-sm font-black text-slate-800 tracking-tight leading-tight">TIRTA BAROKAH</h1>
                <p className="text-[9px] md:text-[10px] text-slate-400 font-mono flex items-center gap-1 font-semibold">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Palembang
                </p>
              </div>
            </div>

            {/* Member Navigation: Mobile button beside logo + Desktop full navbar */}
            {activeRole === 'member' && (
              <div className="flex items-center gap-2">
                {/* Mobile View: Button beside logo + Hamburger Menu toggle */}
                <div className="md:hidden flex items-center gap-2">
                  {currentPath === '/daftar' ? (
                    <button
                      onClick={() => navigateTo('/')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer border border-slate-200 shrink-0"
                    >
                      ← Beranda
                    </button>
                  ) : (
                    <button
                      onClick={() => navigateTo('/daftar')}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer border-0 text-xs shrink-0"
                    >
                      Daftar Sekarang
                    </button>
                  )}

                  {currentPath !== '/daftar' && (
                    <button
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                      className="p-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition border border-slate-200"
                      aria-label="Toggle menu"
                    >
                      {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* Desktop View: Full Horizontal Navbar */}
                {currentPath === '/daftar' ? (
                  <button
                    onClick={() => navigateTo('/')}
                    className="hidden md:flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-750 font-bold px-3.5 py-1.5 rounded-lg text-xs transition cursor-pointer border border-slate-200 shrink-0"
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
                        const el = document.getElementById('swimming-pools-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-cyan-600 transition cursor-pointer bg-transparent border-0 p-0 font-bold text-xs"
                    >
                      Kolam Renang
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
                      className="hover:text-cyan-600 transition cursor-pointer bg-transparent border-0 p-0 font-bold text-xs"
                    >
                      Event & Berita
                    </button>
                    <button
                      onClick={() => navigateTo('/daftar')}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer border-0 text-xs"
                    >
                      Daftar Sekarang
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Collapsible Mobile Menu Drawer (shown when toggled on mobile HP) */}
          {activeRole === 'member' && currentPath !== '/daftar' && isMobileMenuOpen && (
            <div className="md:hidden flex flex-col gap-2 pt-3 pb-2 border-t border-slate-100 text-xs font-bold text-slate-700">
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  const el = document.getElementById('program-info');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-cyan-50 hover:text-cyan-600 transition"
              >
                📘 Kurikulum & Program
              </button>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  const el = document.getElementById('pricing-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-cyan-50 hover:text-cyan-600 transition"
              >
                🏷️ Paket & Biaya
              </button>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  const el = document.getElementById('swimming-pools-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-cyan-50 hover:text-cyan-600 transition"
              >
                🏊‍♂️ Kolam Renang
              </button>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  const el = document.getElementById('coaches-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-cyan-50 hover:text-cyan-600 transition"
              >
                🏅 Daftar Pelatih
              </button>
              <button 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  const el = document.getElementById('events-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-left px-3 py-2 rounded-lg bg-slate-50 hover:bg-cyan-50 hover:text-cyan-600 transition"
              >
                🎉 Event & Berita
              </button>
            </div>
          )}

            {activeRole !== 'member' && ((activeRole === 'admin' && isAdminLoggedIn) || (activeRole === 'coach' && isCoachLoggedIn)) && (() => {
              const currentLoggedCoach = coaches.find(c => c.id === loggedCoachId);
              const userName = localStorage.getItem('user_name') || (localStorage.getItem('user_role') === 'operator' ? 'Operator' : activeRole === 'admin' ? 'Admin Utama' : 'Pelatih');
              const userRoleLabel = localStorage.getItem('user_role') === 'operator' ? 'Operator Portal' : activeRole === 'admin' ? 'Administrator' : 'Pelatih Renang';

              return (
                <div className="relative ml-auto shrink-0 z-50" ref={profileMenuRef}>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition cursor-pointer shadow-2xs"
                  >
                    {/* User Avatar */}
                    <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white font-bold flex items-center justify-center overflow-hidden shrink-0 shadow-xs border border-cyan-500/30">
                      {activeRole === 'coach' && currentLoggedCoach?.photo ? (
                        <img src={getMediaUrl(currentLoggedCoach.photo)} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-black">
                          {userName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="text-left flex flex-col justify-center hidden sm:flex">
                      <span className="text-[11px] font-black text-slate-800 leading-tight">
                        {userName}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                        {userRoleLabel}
                      </span>
                    </div>

                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180 text-cyan-600' : ''}`} />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-50 py-2 text-xs text-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* User Profile Card Header */}
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 bg-slate-50/70 rounded-t-2xl">
                        <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white font-bold flex items-center justify-center overflow-hidden shrink-0 shadow-xs border border-cyan-500/30">
                          {activeRole === 'coach' && currentLoggedCoach?.photo ? (
                            <img src={getMediaUrl(currentLoggedCoach.photo)} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-black">
                              {userName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-extrabold text-slate-800 text-xs truncate">
                            {userName}
                          </h4>
                          <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">
                            {userRoleLabel}
                          </p>
                        </div>
                      </div>

                      {/* Menu Options */}
                      <div className="p-1.5 space-y-1">
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setShowProfileCardModal(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 font-bold transition text-left cursor-pointer"
                        >
                          <User className="w-4 h-4 text-cyan-600" />
                          <span>Profil Saya</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            setChangePasswordError(null);
                            setOldPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                            setShowChangePasswordModal(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 font-bold transition text-left cursor-pointer"
                        >
                          <Key className="w-4 h-4 text-cyan-600" />
                          <span>Ganti Password</span>
                        </button>

                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            handleLogout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition text-left cursor-pointer border-t border-slate-100 mt-1 pt-2"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span>Keluar Portal</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
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
                Aplikasi React tidak dapat mengambil data dari backend CodeIgniter 4 di <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-rose-600">{API_BASE_URL || 'http://localhost:8081 (via Vite Proxy)'}</code>.
              </p>
              <div className="bg-slate-900 text-rose-300 p-4 rounded-xl text-left text-xs font-mono overflow-auto max-h-40 border border-slate-800">
                Error: {error}
              </div>
              <p className="text-[11px] text-slate-505 leading-relaxed">
                Pastikan server backend PHP Anda sudah berjalan, terkonfigurasi dengan benar di hosting Anda, dan URL API di atas dapat diakses.
              </p>
              <button
                onClick={() => loadTabData('public')}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                Coba Hubungkan Kembali
              </button>
            </div>
          ) : activeRole === 'admin' && !isAdminLoggedIn ? (
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
                    disabled={isAdminLoggingIn}
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
                    disabled={isAdminLoggingIn}
                  />
                </div>

                {adminLoginError && (
                  <p className="text-xs text-rose-600 font-semibold text-center">{adminLoginError}</p>
                )}

                <button
                  type="submit"
                  disabled={isAdminLoggingIn}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isAdminLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Memproses Login...
                    </>
                  ) : (
                    'Masuk Administrator'
                  )}
                </button>
              </form>
            </div>
          ) : activeRole === 'coach' && !isCoachLoggedIn ? (
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
                    disabled={isCoachLoggingIn}
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
                    disabled={isCoachLoggingIn}
                  />
                </div>

                {coachLoginError && (
                  <p className="text-xs text-rose-600 font-semibold text-center">{coachLoginError}</p>
                )}

                <button
                  type="submit"
                  disabled={isCoachLoggingIn}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isCoachLoggingIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Memproses Login...
                    </>
                  ) : (
                    'Masuk Portal Pelatih'
                  )}
                </button>
              </form>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] text-slate-500 text-center">
                Demo Login: Username (<strong className="text-slate-700">ardi / hakim / ari</strong>) & Password: <strong className="text-slate-700">coach123</strong>
              </div>
            </div>
          ) : isDataLoading && !hasInitialLoaded ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-600 animate-pulse">Memuat data portal Tirta Barokah...</p>
            </div>
          ) : (
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
                onReloadData={loadTabData}
                onUpdateSettings={handleUpdateSettings}
                onUpdateLevels={handleUpdateLevels}
                onUpdateCoaches={updateCoachesState}
                onUpdateMembers={updateMembersState}
                onUpdateEvents={updateEventsState}
              />
            ) : activeRole === 'coach' ? (
              <CoachDashboard
                coaches={coaches}
                members={members}
                absences={absences}
                onReloadData={loadTabData}
                onUpdateMembers={updateMembersState}
                loggedCoachId={loggedCoachId}
              />
            ) : (
              <ParentDashboard
                coaches={coaches}
                members={members}
                onUpdateMembers={updateMembersState}
              />
            )
          )}
        </div>
      </main>

      {/* Footer information section */}
      <footer className="bg-slate-900 text-slate-300 pt-12 pb-6 border-t border-slate-800 text-xs mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-10">
          
          {/* Main Location & Contact Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Brand info & Contact details */}
            <div className="lg:col-span-5 space-y-5">
              <div className="flex items-center gap-3">
                <img src="/images/logo.png" alt="Tirta Barokah Logo" className="h-10 w-auto object-contain brightness-110" />
                <div>
                  <h3 className="font-extrabold text-white text-base tracking-wide uppercase">Private Renang Tirta Barokah</h3>
                  <p className="text-[11px] text-cyan-400 font-bold">Palembang, Sumatera Selatan</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Lembaga pelatihan les renang privat profesional di Palembang untuk anak-anak hingga dewasa dengan metode pelatihan yang ramah, aman, dan teruji.
              </p>

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-start gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
                  <MapPin className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">Alamat Kolam / Lokasi:</span>
                    <p className="text-slate-300 leading-normal">
                      Kompleks grand garden, Bukit Sangkal, Kec. Kalidoni, Kota Palembang, Sumatera Selatan 30163
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
                  <Phone className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold text-white block mb-0.5">No HP / WhatsApp:</span>
                    <a
                      href="https://wa.me/6282137161188"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      0821-3716-1188
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Interactive Google Maps Embed */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" /> Peta Lokasi Google Maps
                </h4>
                <a
                  href="https://www.google.com/maps/place/Privat+Renang+Tirta+Barokah+Palembang/@-2.945846,104.7868604,17z/data=!4m6!3m5!1s0x2e3b770d40744b59:0x53f9800cee282555!8m2!3d-2.9458411!4d104.7868668!16s%2Fg%2F11l2lj4bt_?hl=en&entry=ttu&g_ep=EgoyMDI2MDgwMi4wIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 bg-cyan-950/60 border border-cyan-800/60 px-3 py-1 rounded-xl transition"
                >
                  Buka Aplikasi Maps <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="w-full h-64 md:h-72 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-800 relative">
                <iframe
                  title="Lokasi Privat Renang Tirta Barokah Palembang"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3984.4485579979774!2d104.7868668!3d-2.9458411!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e3b770d40744b59%3A0x53f9800cee282555!2sPrivat%20Renang%20Tirta%20Barokah%20Palembang!5e0!3m2!1sid!2sid!4v1710000000000!5m2!1sid!2sid"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>

          </div>

          {/* Bottom Copyright */}
          <div className="border-t border-slate-800/80 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              © 2026 Tirta Barokah Academy. Semua Hak Dilindungi Undang-Undang.
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              Kompleks Grand Garden, Bukit Sangkal, Kec. Kalidoni, Kota Palembang
            </p>
          </div>

        </div>
      </footer>

      {/* User Profile Card Modal */}
      {showProfileCardModal && (() => {
        const currentLoggedCoach = coaches.find(c => c.id === loggedCoachId);
        const userRole = localStorage.getItem('user_role');
        const userName = localStorage.getItem('user_name') || (userRole === 'operator' ? 'Operator' : activeRole === 'admin' ? 'Admin Utama' : 'Pelatih');
        const userRoleLabel = userRole === 'operator' ? 'Operator Portal' : activeRole === 'admin' ? 'Administrator' : 'Pelatih Renang';
        const userEmail = currentLoggedCoach?.email || (userRole === 'coach' ? `${loggedCoachId}@tirtabarokah.com` : 'admin@tirtabarokah.com');
        const userPhone = currentLoggedCoach?.phone || '0812-3456-7890';

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              
              {/* Header Banner */}
              <div className="relative h-28 bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-700 p-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowProfileCardModal(false)}
                  className="w-8 h-8 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition backdrop-blur-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Card Body */}
              <div className="px-6 pb-6 pt-0 relative">
                {/* Avatar Badge */}
                <div className="relative -mt-14 mb-4 flex justify-between items-end">
                  <div className="w-24 h-24 rounded-2xl bg-white p-1.5 shadow-xl ring-4 ring-cyan-500/20 overflow-hidden shrink-0">
                    <div className="w-full h-full rounded-xl bg-cyan-600 text-white font-bold flex items-center justify-center overflow-hidden">
                      {activeRole === 'coach' && currentLoggedCoach?.photo ? (
                        <img src={getMediaUrl(currentLoggedCoach.photo)} alt={userName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-black">{userName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Akun Aktif
                  </span>
                </div>

                {/* Name & Role */}
                <div className="space-y-1 mb-5">
                  <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight">{userName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-md border border-cyan-100">
                      {userRoleLabel}
                    </span>
                    {activeRole === 'coach' && currentLoggedCoach?.referralCode && (
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        Kode: {currentLoggedCoach.referralCode}
                      </span>
                    )}
                  </div>
                </div>

                {/* Profile Details List */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <Mail className="w-3.5 h-3.5 text-cyan-600" /> Email Akun
                    </span>
                    <span className="font-bold text-slate-800">{userEmail}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5 text-cyan-600" /> No. Telepon / WA
                    </span>
                    <span className="font-bold text-slate-800">{userPhone}</span>
                  </div>

                  {activeRole === 'coach' && currentLoggedCoach && (
                    <>
                      <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 text-cyan-600" /> Kuota Siswa Active
                        </span>
                        <span className="font-bold text-slate-800">
                          {currentLoggedCoach.currentQuota} / {currentLoggedCoach.maxQuota} Kuota Siswa
                        </span>
                      </div>

                      <div className="py-1">
                        <span className="text-slate-500 flex items-center gap-1.5 font-medium mb-1">
                          <Award className="w-3.5 h-3.5 text-cyan-600" /> Pengalaman & Lisensi
                        </span>
                        <p className="text-[11px] text-slate-700 font-medium italic bg-white p-2.5 rounded-xl border border-slate-200">
                          "{currentLoggedCoach.experience || 'Pelatih Renang Profesional'}"
                        </p>
                      </div>

                      {currentLoggedCoach.certificateUrl && (
                        <div className="pt-1">
                          <a
                            href={getMediaUrl(currentLoggedCoach.certificateUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-700 hover:text-cyan-800 bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-xl transition border border-cyan-200"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Lihat Sertifikat Pelatih
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileCardModal(false);
                      setChangePasswordError(null);
                      setOldPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setShowChangePasswordModal(true);
                    }}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md shadow-cyan-600/10 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" /> Ganti Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileCardModal(false);
                      handleLogout();
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Keluar
                  </button>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Ganti Password Profil</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Ubah kata sandi akun Anda demi keamanan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {changePasswordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{changePasswordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Password Saat Ini (Lama)</label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 pr-9 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:outline-hidden transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Password Baru</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 pr-9 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:outline-hidden transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Konfirmasi Password Baru</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 pr-9 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:outline-hidden transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md shadow-cyan-600/10 cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
