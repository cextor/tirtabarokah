/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Coach, Member, EventItem } from './types';
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
  const [activeRole, setActiveRole] = useState<'member' | 'admin' | 'coach' | 'parent'>('member');

  // Load from database on mount
  const loadAllData = async () => {
    try {
      const [coachesData, membersData, eventsData] = await Promise.all([
        api.getCoaches(),
        api.getMembers(),
        api.getEvents()
      ]);
      setCoaches(coachesData);
      setMembers(membersData);
      setEvents(eventsData);
    } catch (e) {
      console.error("Failed to load data from MariaDB backend", e);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Sync to database on updates (Coaches)
  const updateCoachesState = async (newCoaches: Coach[]) => {
    setCoaches(newCoaches);
    try {
      if (newCoaches.length > coaches.length) {
        const added = newCoaches.find(nc => !coaches.some(c => c.id === nc.id));
        if (added) {
          const price4 = added.packages.find(p => p.sessions === 4)?.price || 250000;
          const price8 = added.packages.find(p => p.sessions === 8)?.price || 450000;
          const price12 = added.packages.find(p => p.sessions === 12)?.price || 600000;
          await api.addCoach({
            name: added.name,
            experience: added.experience,
            photo: added.photo,
            maxQuota: added.maxQuota,
            price4,
            price8,
            price12
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
          const price4 = updated.packages.find(p => p.sessions === 4)?.price || 250000;
          const price8 = updated.packages.find(p => p.sessions === 8)?.price || 450000;
          const price12 = updated.packages.find(p => p.sessions === 12)?.price || 600000;
          await api.updateCoach({
            id: updated.id,
            name: updated.name,
            experience: updated.experience,
            photo: updated.photo,
            maxQuota: updated.maxQuota,
            price4,
            price8,
            price12
          });
        }
      }
    } catch (e) {
      console.error("Failed to update coach:", e);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏊‍♂️</span>
              <div>
                <h1 className="text-sm font-black text-slate-800 tracking-tight">TIRTA BAROKAH</h1>
                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 font-semibold">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Palembang • Sandbox
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-8">
        <div className="space-y-6">
          {coaches.length > 0 && members.length > 0 ? (
            activeRole === 'member' ? (
              <MainPortal 
                coaches={coaches} 
                members={members} 
                events={events}
                onRegister={handleRegisterMember} 
                onUpdateEvents={updateEventsState}
              />
            ) : activeRole === 'admin' ? (
              <AdminDashboard 
                coaches={coaches} 
                members={members}
                events={events}
                onUpdateCoaches={updateCoachesState}
                onUpdateMembers={updateMembersState}
                onUpdateEvents={updateEventsState}
              />
            ) : activeRole === 'coach' ? (
              <CoachDashboard 
                coaches={coaches} 
                members={members} 
                onUpdateMembers={updateMembersState} 
              />
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

      {/* Floating Sandbox Portal Selector */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white rounded-2xl p-3 shadow-2xl flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider font-black text-cyan-400 px-1.5 py-1 bg-cyan-950 rounded-lg">Simulasi</span>
          <select
            value={activeRole}
            onChange={(e) => setActiveRole(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-hidden cursor-pointer"
          >
            <option value="member">Landing & Daftar</option>
            <option value="admin">Dashboard Admin</option>
            <option value="coach">Portal Pelatih</option>
            <option value="parent">Portal Orang Tua</option>
          </select>
        </div>
      </div>
    </div>
  );
}
