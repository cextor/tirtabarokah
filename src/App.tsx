/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Coach, Member, EventItem } from './types';
import { INITIAL_COACHES, INITIAL_MEMBERS, INITIAL_EVENTS } from './data';
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

  // Load from LocalStorage or seed defaults
  useEffect(() => {
    const cachedCoaches = localStorage.getItem('tirtabarokah_coaches');
    const cachedMembers = localStorage.getItem('tirtabarokah_members');
    const cachedEvents = localStorage.getItem('tirtabarokah_events');

    if (cachedCoaches && cachedMembers) {
      setCoaches(JSON.parse(cachedCoaches));
      setMembers(JSON.parse(cachedMembers));
    } else {
      setCoaches(INITIAL_COACHES);
      setMembers(INITIAL_MEMBERS);
    }

    if (cachedEvents) {
      setEvents(JSON.parse(cachedEvents));
    } else {
      setEvents(INITIAL_EVENTS);
    }
  }, []);

  // Sync to LocalStorage on updates
  const updateCoachesState = (newCoaches: Coach[]) => {
    setCoaches(newCoaches);
    localStorage.setItem('tirtabarokah_coaches', JSON.stringify(newCoaches));
  };

  const updateMembersState = (newMembers: Member[]) => {
    setMembers(newMembers);
    localStorage.setItem('tirtabarokah_members', JSON.stringify(newMembers));
  };

  const updateEventsState = (newEvents: EventItem[]) => {
    setEvents(newEvents);
    localStorage.setItem('tirtabarokah_events', JSON.stringify(newEvents));
  };

  // Reset demo environment
  const handleResetApp = () => {
    const reset = confirm('Kembalikan seluruh data simulasi ke setelan default awal?');
    if (reset) {
      setCoaches(INITIAL_COACHES);
      setMembers(INITIAL_MEMBERS);
      setEvents(INITIAL_EVENTS);
      localStorage.setItem('tirtabarokah_coaches', JSON.stringify(INITIAL_COACHES));
      localStorage.setItem('tirtabarokah_members', JSON.stringify(INITIAL_MEMBERS));
      localStorage.setItem('tirtabarokah_events', JSON.stringify(INITIAL_EVENTS));
      setActiveRole('member');
      alert('Data simulasi Tirta Barokah berhasil di-reset!');
    }
  };

  // Helper to append a newly registered member
  const handleRegisterMember = (newMemberData: Omit<Member, 'id' | 'registeredAt'>) => {
    const newId = `member-${Date.now().toString().slice(-6)}`;
    const newMember: Member = {
      ...newMemberData,
      id: newId,
      registeredAt: new Date().toISOString(),
      rescheduleRequests: [],
      referralCount: 0,
      referralBonus: 0
    };

    let updatedMembers = [...members];
    let updatedCoaches = [...coaches];

    // Handle Referral logic
    if (newMember.referralCodeUsed) {
      const code = newMember.referralCodeUsed.trim().toUpperCase();
      
      // 1. Is it a Coach referral code?
      const foundCoachIndex = coaches.findIndex(c => c.referralCode.toUpperCase() === code);
      if (foundCoachIndex !== -1) {
        updatedCoaches = coaches.map((c, idx) => {
          if (idx === foundCoachIndex) {
            return {
              ...c,
              referralBonus: (c.referralBonus || 0) + 50000 // Coach gets Rp 50.000 reward!
            };
          }
          return c;
        });
      } else {
        // 2. Is it a Member referral code / ID?
        const foundMemberIndex = members.findIndex(m => m.id.toUpperCase() === code || `MEMBER-${m.id.split('-')[1]}`.toUpperCase() === code || m.id.toUpperCase() === `MEMBER-${code}`);
        if (foundMemberIndex !== -1) {
          updatedMembers = members.map((m, idx) => {
            if (idx === foundMemberIndex) {
              return {
                ...m,
                referralCount: (m.referralCount || 0) + 1,
                referralBonus: (m.referralBonus || 0) + 25000 // Member gets Rp 25.000 discount/bonus!
              };
            }
            return m;
          });
        }
      }
    }

    // Append the new member
    updatedMembers = [...updatedMembers, newMember];

    // Now update quota for schedules
    updatedCoaches = updatedCoaches.map(c => {
      if (c.id === newMember.coachId) {
        // Find corresponding day and time slot to increase slot count
        const updatedSchedule = c.schedule.map(d => {
          let updatedSlots = d.timeSlots;
          
          if (d.day === newMember.scheduleDay) {
            updatedSlots = updatedSlots.map(ts => {
              if (ts.time === newMember.scheduleTime) {
                return {
                  ...ts,
                  currentSlots: ts.currentSlots + 1,
                  students: [...ts.students, newId]
                };
              }
              return ts;
            });
          }
          
          // Also handle schedule 2 if 2x seminggu
          if (newMember.scheduleFrequency === '2x Seminggu' && newMember.scheduleDay2 && d.day === newMember.scheduleDay2) {
            updatedSlots = updatedSlots.map(ts => {
              if (ts.time === newMember.scheduleTime2) {
                return {
                  ...ts,
                  currentSlots: ts.currentSlots + 1,
                  students: [...ts.students, newId]
                };
              }
              return ts;
            });
          }

          return {
            ...d,
            timeSlots: updatedSlots
          };
        });

        const activeSiswaCount = updatedSchedule.reduce(
          (sum, d) => sum + d.timeSlots.reduce((sSum, ts) => sSum + ts.students.length, 0), 0
        );

        return {
          ...c,
          schedule: updatedSchedule,
          currentQuota: activeSiswaCount,
          status: activeSiswaCount >= c.maxQuota ? 'Penuh' as const : 'Tersedia' as const
        };
      }
      return c;
    });

    updateMembersState(updatedMembers);
    updateCoachesState(updatedCoaches);
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
