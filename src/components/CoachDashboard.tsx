/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { Coach, Member, TrainingProgress, CoachAbsence } from '../types';
import { api, getMediaUrl } from '../api';
import { 
  Award, Users, Calendar, CheckSquare, PlusCircle, Clock, BookOpen, AlertCircle, Phone, UserCheck, Filter, FileSpreadsheet
} from 'lucide-react';
import { exportCoachScheduleToExcel } from '../utils/excelExport';

interface CoachDashboardProps {
  coaches: Coach[];
  members: Member[];
  absences: CoachAbsence[];
  onReloadData: (tabName?: string | boolean) => void;
  onUpdateMembers: (members: Member[]) => void;
  loggedCoachId?: string;
}

type CoachTab = 'students' | 'add_progress' | 'schedule' | 'laporan_coachs' | 'report_absence' | 'absence_history';

// Helper to get Indonesian Day name from date string (YYYY-MM-DD)
const getIndonesianDay = (dateStr?: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
};

export default function CoachDashboard({ coaches, members, absences, onReloadData, onUpdateMembers, loggedCoachId }: CoachDashboardProps) {
  // Simulate Coach Login
  const [selectedCoachId, setSelectedCoachId] = useState<string>(loggedCoachId || 'coach-ardi');
  const [activeTab, setActiveTab] = useState<CoachTab>('students');
  const [selectedStudentForNote, setSelectedStudentForNote] = useState<string>('');
  const [newProgressNote, setNewProgressNote] = useState<string>('');
  const [newProgressAttendance, setNewProgressAttendance] = useState<'Hadir' | 'Absen' | 'Izin'>('Hadir');

  // State for Date Filter in Siswa tab (defaults to today's date YYYY-MM-DD)
  const [studentFilterDate, setStudentFilterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showAllStudents, setShowAllStudents] = useState<boolean>(false);

  // State for absence report
  const [absenceDate, setAbsenceDate] = useState<string>('');
  const [absenceScheduleIndex, setAbsenceScheduleIndex] = useState<string>('');
  const [absenceReason, setAbsenceReason] = useState<string>('');
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState<boolean>(false);

  React.useEffect(() => {
    if (loggedCoachId && coaches.some(c => c.id === loggedCoachId)) {
      setSelectedCoachId(loggedCoachId);
    } else if (coaches.length > 0 && !coaches.some(c => c.id === selectedCoachId)) {
      setSelectedCoachId(coaches[0].id);
    }
  }, [loggedCoachId, coaches]);

  React.useEffect(() => {
    if (onReloadData) {
      onReloadData(activeTab);
    }
  }, [activeTab]);

  const currentCoach = coaches.find(c => c.id === selectedCoachId);
  
  // Coach only sees their own assigned active students
  const coachStudents = members.filter(
    m => m.coachId === selectedCoachId && m.isActive !== false && (m.status === 'Aktif' || m.status === 'Paket Hampir Habis')
  );

  // Siswa transfer yang dialihkan sementara ke pelatih ini
  const transferredStudents = members.filter(m => {
    if (m.status !== 'Aktif' && m.status !== 'Paket Hampir Habis') return false;
    return absences.some(a => {
      const isReplacement = a.status === 'Transfer' && a.replacementCoachId === selectedCoachId;
      if (!isReplacement) return false;
      const isOriginalStudent = m.coachId === a.coachId;
      const matchesSchedule = (m.scheduleDay === a.day && m.scheduleTime === a.time) ||
                              (m.scheduleDay2 === a.day && m.scheduleTime2 === a.time);
      return isOriginalStudent && matchesSchedule;
    });
  }).map(m => ({
    ...m,
    isTransfer: true
  }));

  const allStudents = [...coachStudents, ...transferredStudents];

  // Target day name derived from selected filter date (e.g. 'Rabu')
  const targetDayName = getIndonesianDay(studentFilterDate);

  // Filter students based on selected date / schedule day
  const filteredStudents = allStudents.filter(m => {
    if (showAllStudents) return true;
    if (m.isTransfer) return true;
    const dayMatches = (m.scheduleDay === targetDayName) || (m.scheduleDay2 === targetDayName) || 
                       (m.schedules && Array.isArray(m.schedules) && m.schedules.some((s: any) => s.day === targetDayName));
    return dayMatches;
  });

  const coachSlots = currentCoach ? currentCoach.schedule.flatMap(day => 
    day.timeSlots.map(slot => ({
      day: day.day,
      time: slot.time
    }))
  ) : [];

  const coachAbsencesList = absences.filter(a => a.coachId === selectedCoachId);

  // Submit absence report
  const handleReportAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!absenceDate || !absenceScheduleIndex || !absenceReason.trim()) {
      Swal.fire('Data Belum Lengkap', 'Silakan lengkapi semua field.', 'warning');
      return;
    }

    const slot = coachSlots[parseInt(absenceScheduleIndex)];
    if (!slot) return;

    try {
      setIsSubmittingAbsence(true);
      await api.reportCoachAbsence({
        coachId: selectedCoachId,
        day: slot.day,
        time: slot.time,
        date: absenceDate,
        reason: absenceReason.trim()
      });
      
      Swal.fire({
        title: 'Berhasil!',
        text: 'Laporan ketidakhadiran berhasil dikirim ke Admin.',
        icon: 'success',
        confirmButtonColor: '#06b6d4'
      });
      
      setAbsenceDate('');
      setAbsenceScheduleIndex('');
      setAbsenceReason('');
      onReloadData();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Gagal', 'Terjadi kesalahan: ' + (err.message || err), 'error');
    } finally {
      setIsSubmittingAbsence(false);
    }
  };

  // ACTION: RECORD ATTENDANCE AND SUBMIT DEVELOPING NOTE
  const handleAddProgressRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForNote || !newProgressNote) return;

    const student = members.find(m => m.id === selectedStudentForNote);
    if (!student) return;

    const todayStr = new Date().toISOString().split('T')[0];
    if (student.progress.some(p => p.date === todayStr)) {
      Swal.fire({
        title: 'Presensi Sudah Ada',
        text: `Siswa ${student.student.fullName} sudah diabsen pada hari ini (${todayStr}). Presensi hanya dapat diisi 1 kali dalam sehari.`,
        icon: 'warning',
        confirmButtonColor: '#06b6d4'
      });
      return;
    }

    const updated = members.map(m => {
      if (m.id === selectedStudentForNote) {
        const isHadir = newProgressAttendance === 'Hadir';
        const newSessionsLeft = isHadir ? Math.max(0, m.sessionsLeft - 1) : m.sessionsLeft;
        
        let newStatus = m.status;
        if (newSessionsLeft === 0) {
          newStatus = 'Selesai';
        } else if (newSessionsLeft <= 2) {
          newStatus = 'Paket Hampir Habis';
        }

        const newRecord: TrainingProgress = {
          id: `prog-${Date.now()}`,
          date: todayStr,
          attendance: newProgressAttendance,
          note: newProgressNote
        };

        return {
          ...m,
          sessionsLeft: newSessionsLeft,
          status: newStatus,
          progress: [newRecord, ...m.progress]
        };
      }
      return m;
    });

    onUpdateMembers(updated);
    
    setNewProgressNote('');
    setSelectedStudentForNote('');
    Swal.fire({
      title: 'Berhasil!',
      text: 'Catatan perkembangan & presensi berhasil disimpan!',
      icon: 'success',
      confirmButtonColor: '#06b6d4'
    });
  };

  // Quick Attendance deduction (alternative shorthand)
  const handleQuickAttendance = (memberId: string, attendanceStatus: 'Hadir' | 'Absen' | 'Izin') => {
    const student = members.find(m => m.id === memberId);
    if (!student) return;

    const todayStr = new Date().toISOString().split('T')[0];
    if (student.progress.some(p => p.date === todayStr)) {
      Swal.fire({
        title: 'Presensi Sudah Ada',
        text: `Siswa ${student.student.fullName} sudah diabsen pada hari ini (${todayStr}). Presensi hanya dapat diisi 1 kali dalam sehari.`,
        icon: 'warning',
        confirmButtonColor: '#06b6d4'
      });
      return;
    }

    const isHadir = attendanceStatus === 'Hadir';
    const newSessionsLeft = isHadir ? Math.max(0, student.sessionsLeft - 1) : student.sessionsLeft;
    
    let newStatus = student.status;
    if (newSessionsLeft === 0) {
      newStatus = 'Selesai';
    } else if (newSessionsLeft <= 2) {
      newStatus = 'Paket Hampir Habis';
    }

    const defaultNotes = {
      Hadir: 'Menyelesaikan sesi latihan rutin dengan baik. Fokus gerakan hari ini tercapai.',
      Absen: 'Siswa absen tanpa keterangan pada jadwal latihan rutin.',
      Izin: 'Siswa berhalangan hadir dengan izin tertulis / pemberitahuan sebelumnya.'
    };

    const newRecord: TrainingProgress = {
      id: `prog-${Date.now()}`,
      date: todayStr,
      attendance: attendanceStatus,
      note: defaultNotes[attendanceStatus]
    };

    const updated = members.map(m => {
      if (m.id === memberId) {
        return {
          ...m,
          sessionsLeft: newSessionsLeft,
          status: newStatus,
          progress: [newRecord, ...m.progress]
        };
      }
      return m;
    });

    onUpdateMembers(updated);
    Swal.fire({
      title: 'Presensi Disimpan!',
      text: `Presensi "${attendanceStatus}" disimpan untuk ${student.student.fullName}. Sisa sesi sekarang: ${newSessionsLeft}`,
      icon: 'success',
      confirmButtonColor: '#06b6d4'
    });
  };

  const [laporanStartDate, setLaporanStartDate] = useState<string>(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    return startOfWeek.toISOString().split('T')[0];
  });
  const [laporanEndDate, setLaporanEndDate] = useState<string>(() => {
    const today = new Date();
    const endOfWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? 0 : 7);
    endOfWeek.setDate(diff);
    return endOfWeek.toISOString().split('T')[0];
  });

  const sidebarTabs: { id: CoachTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'students', label: 'Siswa', icon: <Users className="w-4 h-4" />, badge: filteredStudents.length },
    { id: 'add_progress', label: 'Catat Perkembangan', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'schedule', label: 'Jadwal Mengajar', icon: <Calendar className="w-4 h-4" />, badge: coachSlots.length },
    { id: 'report_absence', label: 'Lapor Absen Mengajar', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'absence_history', label: 'Riwayat Absen Saya', icon: <Clock className="w-4 h-4" />, badge: coachAbsencesList.length },
    { id: 'laporan_coachs', label: 'Laporan Coachs', icon: <FileSpreadsheet className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Simulation Selector Bar */}
      {!loggedCoachId && (
        <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-600 rounded-xl text-white shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-cyan-950">Portal Login Pelatih</h3>
              <p className="text-xs text-cyan-800">Simulasikan masuk sebagai pelatih yang berbeda untuk melihat siswa binaan masing-masing.</p>
            </div>
          </div>
          
          <select
            value={selectedCoachId}
            onChange={(e) => {
              setSelectedCoachId(e.target.value);
              setSelectedStudentForNote('');
            }}
            className="bg-white border border-cyan-200 text-xs font-bold rounded-xl px-4 py-2.5 text-cyan-900 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 cursor-pointer shadow-2xs"
          >
            {coaches.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {currentCoach && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* SIDEBAR NAVIGATION MENU */}
          <aside className="lg:col-span-3 space-y-4 sticky top-20">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 space-y-1.5">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Menu Portal Pelatih</span>
                <span className="text-xs font-extrabold text-slate-800 truncate block">{currentCoach.name}</span>
              </div>

              {sidebarTabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                        : 'text-slate-650 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className={isActive ? 'text-white' : 'text-cyan-600'}>
                        {tab.icon}
                      </span>
                      <span className="truncate">{tab.label}</span>
                    </div>

                    {tab.badge !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ml-1 shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="pt-2 border-t border-slate-100 mt-2">
                <button
                  onClick={() => exportCoachScheduleToExcel(coaches, members, currentCoach.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/70 transition cursor-pointer"
                  title="Download Rekapan Excel Seminggu"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export Excel Seminggu</span>
                </button>
              </div>
            </div>
          </aside>

          {/* MAIN TAB CONTENT PANEL */}
          <main className="lg:col-span-9 space-y-6">
            
            {/* TAB 1: SISWA & QUICK ATTENDANCE */}
            {activeTab === 'students' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                      <Users className="w-5 h-5 text-cyan-600" /> Daftar Siswa Binaan {currentCoach.name}
                    </h3>
                    <p className="text-xs text-slate-500">Kelola presensi cepat dan tinjau sisa paket latihan siswa binaan Anda.</p>
                  </div>
                  <span className="bg-cyan-50 text-cyan-800 border border-cyan-200 px-3 py-1 rounded-full text-xs font-black self-start sm:self-auto">
                    {filteredStudents.length} Siswa Terdaftar
                  </span>
                </div>

                {/* DATE FILTER & DAY TOGGLE BAR */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="font-extrabold text-slate-700 text-xs flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-cyan-600" /> Filter Tanggal Latihan:
                      </label>
                      <input
                        type="date"
                        value={studentFilterDate}
                        onChange={(e) => setStudentFilterDate(e.target.value)}
                        className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-cyan-500/20 shadow-2xs cursor-pointer"
                      />
                    </div>

                    <span className="bg-cyan-100/70 text-cyan-900 border border-cyan-200 px-3 py-1 rounded-xl text-xs font-black">
                      Hari {targetDayName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAllStudents(false)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                        !showAllStudents ? 'bg-cyan-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      📆 Jadwal {targetDayName} ({filteredStudents.length})
                    </button>
                    <button
                      onClick={() => setShowAllStudents(true)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                        showAllStudents ? 'bg-cyan-600 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      👥 Semua Siswa ({allStudents.length})
                    </button>
                  </div>
                </div>

                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium italic">
                      Tidak ada siswa yang dijadwalkan latihan pada hari <strong className="text-slate-700">{targetDayName}</strong> ({studentFilterDate}).
                    </p>
                    <button
                      onClick={() => setShowAllStudents(true)}
                      className="text-xs font-bold text-cyan-700 hover:underline cursor-pointer pt-1"
                    >
                      Tampilkan semua {allStudents.length} siswa binaan
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredStudents.map(member => {
                      const isExpiring = member.sessionsLeft <= 2;
                      return (
                        <div key={member.id} className="border border-slate-200/80 hover:border-cyan-300 transition rounded-2xl p-4.5 space-y-3.5 text-left bg-slate-50/30">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                {member.student.fullName}
                                {member.isTransfer && (
                                  <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                                    Siswa Transfer (Sesi Ini)
                                  </span>
                                )}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                Siswa {member.student.gender} • Lahir: {member.student.dob} • Penyakit: <span className="font-bold text-slate-700">{member.student.illnessHistory || 'Tidak ada'}</span>
                              </p>
                            </div>
                            
                            <div className="text-right shrink-0">
                              <span className="text-[11px] text-slate-400 block font-semibold">Sisa Kelas Latihan:</span>
                              <span className={`text-sm font-black ${isExpiring ? 'text-rose-600' : 'text-slate-800'}`}>
                                {member.sessionsLeft} / {member.sessionsTotal} Sesi
                              </span>
                            </div>
                          </div>

                          {/* Quick Presensi Actions Row */}
                          {(() => {
                            const todayStr = studentFilterDate || new Date().toISOString().split('T')[0];
                            const todayLog = member.progress.find(p => p.date === todayStr);
                            if (todayLog) {
                              return (
                                <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                                    <span>✓ Presensi Tanggal {todayStr}: Status <span className="underline uppercase">{todayLog.attendance}</span></span>
                                  </div>
                                  <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2.5 py-0.5 rounded-md">
                                    Sudah Diabsen
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-2xs">
                                <div className="flex items-center gap-1 text-slate-500 font-semibold">
                                  <Clock className="w-3.5 h-3.5 text-cyan-600" />
                                  <span>Jadwal: {member.scheduleDay} pukul {member.scheduleTime} WIB</span>
                                </div>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleQuickAttendance(member.id, 'Hadir')}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-3 py-1.5 rounded-xl text-[10px] transition cursor-pointer"
                                  >
                                    ✓ Hadir
                                  </button>
                                  <button
                                    onClick={() => handleQuickAttendance(member.id, 'Absen')}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold px-3 py-1.5 rounded-xl text-[10px] transition cursor-pointer"
                                  >
                                    ✗ Absen
                                  </button>
                                  <button
                                    onClick={() => handleQuickAttendance(member.id, 'Izin')}
                                    className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold px-3 py-1.5 rounded-xl text-[10px] transition cursor-pointer"
                                  >
                                    - Izin
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Display Latest Progress Note */}
                          <div className="space-y-1 bg-cyan-50/30 border border-cyan-100/70 p-3 rounded-xl">
                            <div className="flex justify-between text-[10px] text-cyan-800 font-bold">
                              <span>Perkembangan Terakhir:</span>
                              <span>{member.progress[0]?.date || 'Belum ada latihan'}</span>
                            </div>
                            {member.progress.length > 0 ? (
                              <p className="text-xs text-slate-700 leading-normal font-medium italic">
                                "{member.progress[0].note}" 
                                <span className={`inline-block ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  member.progress[0].attendance === 'Hadir' 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {member.progress[0].attendance}
                                </span>
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 italic">Belum ada catatan pertemuan yang terekam.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: ADD PROGRESS & NOTES */}
            {activeTab === 'add_progress' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-cyan-600" /> Catat Presensi & Perkembangan Siswa
                  </h3>
                  <p className="text-xs text-slate-500">Tuliskan ringkasan materi, teknik yang dipelajari, dan status presensi siswa.</p>
                </div>
                
                <form onSubmit={handleAddProgressRecord} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Pilih Siswa</label>
                      <select
                        value={selectedStudentForNote}
                        onChange={(e) => setSelectedStudentForNote(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20"
                        required
                      >
                        <option value="">-- Pilih Siswa Anda --</option>
                        {allStudents.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.student.fullName} {s.isTransfer ? '(Siswa Transfer)' : `(Sisa: ${s.sessionsLeft})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Status Kehadiran Hari Ini</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['Hadir', 'Absen', 'Izin'] as const).map(att => (
                          <button
                            type="button"
                            key={att}
                            onClick={() => setNewProgressAttendance(att)}
                            className={`py-2 text-xs rounded-xl font-bold border transition cursor-pointer ${
                              newProgressAttendance === att
                                ? 'bg-cyan-600 text-white border-transparent shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {att}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Catatan Perkembangan Materi & Keterampilan</label>
                      {newProgressAttendance === 'Hadir' && (
                        <span className="text-[10px] text-rose-600 font-bold">* Mengurangi sisa paket sebanyak 1 sesi</span>
                      )}
                    </div>
                    <textarea
                      placeholder="Contoh: Sudah mulai berani meluncur mandiri sejauh 3 meter, gerakan kaki sudah mulai stabil dan konstan..."
                      value={newProgressNote}
                      onChange={(e) => setNewProgressNote(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20"
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={!selectedStudentForNote || !newProgressNote}
                      className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 text-xs rounded-xl transition shadow-md shadow-cyan-600/10 flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" /> Simpan Catatan Siswa
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: TEACHING SCHEDULE WITH STUDENT LIST PER SLOT */}
            {activeTab === 'schedule' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-cyan-600" /> Jadwal Mengajar Rutin {currentCoach.name}
                    </h3>
                    <p className="text-xs text-slate-500">Rincian hari, slot jam mengajar, dan daftar siswa terdaftar di setiap jadwal.</p>
                  </div>
                  <button
                    onClick={() => exportCoachScheduleToExcel(coaches, members, currentCoach.id)}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-700/10 cursor-pointer whitespace-nowrap"
                    title="Download Rekapan Excel Seminggu"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Export Rekapan Excel
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {currentCoach.schedule.map(day => (
                    <div key={day.day} className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">Hari {day.day}</span>
                        <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-100">
                          {day.timeSlots.length} Slot Jam
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {day.timeSlots.map(slot => {
                          // Find all active students in this specific day & time slot
                          const slotStudents = members.filter(m => 
                            (m.coachId === currentCoach.id || (m as any).isTransfer) &&
                            m.isActive !== false &&
                            m.status !== 'Selesai' &&
                            (
                              (m.scheduleDay === day.day && m.scheduleTime === slot.time) ||
                              (m.scheduleDay2 === day.day && m.scheduleTime2 === slot.time) ||
                              (m.schedules && Array.isArray(m.schedules) && m.schedules.some((s: any) => s.day === day.day && s.time === slot.time))
                            )
                          );

                          return (
                            <div key={slot.time} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5 text-xs shadow-2xs">
                              <div className="flex justify-between items-center">
                                <span className="font-mono font-extrabold text-slate-800 flex items-center gap-1.5 text-xs">
                                  <Clock className="w-3.5 h-3.5 text-cyan-600" /> {slot.time} WIB
                                </span>
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                  slotStudents.length >= (slot.maxSlots || 6)
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : 'bg-cyan-50 text-cyan-800 border border-cyan-100'
                                }`}>
                                  {slotStudents.length} / {slot.maxSlots || 6} Siswa
                                </span>
                              </div>

                              {/* Student Names in this Slot */}
                              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daftar Siswa Terdaftar:</span>
                                {slotStudents.length === 0 ? (
                                  <span className="text-[11px] text-slate-400 italic block py-0.5">Belum ada siswa terdaftar di slot ini.</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {slotStudents.map(student => (
                                      <div key={student.id} className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-200 px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-800 transition">
                                        <UserCheck className="w-3 h-3 text-cyan-600 shrink-0" />
                                        <span>{student.student.fullName}</span>
                                        <span className="text-[9px] text-slate-500 font-mono">({student.sessionsLeft} sesi)</span>
                                        {(student as any).isTransfer && (
                                          <span className="text-[8px] bg-amber-100 text-amber-800 px-1 rounded font-extrabold">TF</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: LAPORAN COACHS */}
            {activeTab === 'laporan_coachs' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Laporan Coachs - Rekapan Mengajar Saya
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Unduh rekapan jadwal mengajar Anda ({currentCoach.name}) berdasarkan rentang tanggal tertentu beserta daftar nama siswa ke berkas Excel (.csv).</p>
                  </div>
                  <button
                    onClick={() => exportCoachScheduleToExcel(coaches, members, currentCoach.id, laporanStartDate, laporanEndDate)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition cursor-pointer whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Download Excel (.csv)
                  </button>
                </div>

                {/* Filter Date Range Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Tanggal Mulai</label>
                    <input
                      type="date"
                      value={laporanStartDate}
                      onChange={(e) => setLaporanStartDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Tanggal Selesai</label>
                    <input
                      type="date"
                      value={laporanEndDate}
                      onChange={(e) => setLaporanEndDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Quick Preset Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold text-slate-500">Preset Tanggal:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const startOfWeek = new Date(today);
                      const day = today.getDay();
                      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                      startOfWeek.setDate(diff);
                      const endOfWeek = new Date(today);
                      endOfWeek.setDate(today.getDate() - day + (day === 0 ? 0 : 7));
                      setLaporanStartDate(startOfWeek.toISOString().split('T')[0]);
                      setLaporanEndDate(endOfWeek.toISOString().split('T')[0]);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded-lg text-[11px] transition cursor-pointer border border-slate-200"
                  >
                    Minggu Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                      setLaporanStartDate(firstDay.toISOString().split('T')[0]);
                      setLaporanEndDate(lastDay.toISOString().split('T')[0]);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded-lg text-[11px] transition cursor-pointer border border-slate-200"
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(end.getDate() - 30);
                      setLaporanStartDate(start.toISOString().split('T')[0]);
                      setLaporanEndDate(end.toISOString().split('T')[0]);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded-lg text-[11px] transition cursor-pointer border border-slate-200"
                  >
                    30 Hari Terakhir
                  </button>
                </div>

                {/* Table Preview */}
                <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200/80 flex justify-between items-center">
                    <span className="font-extrabold text-xs text-slate-800">Preview Data Excel</span>
                    <span className="text-[10px] font-bold text-slate-500">Periode: {laporanStartDate} s/d {laporanEndDate}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/60 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3">No</th>
                          <th className="px-5 py-3">Nama Pelatih</th>
                          <th className="px-5 py-3">Total Mengajar Periode Ini</th>
                          <th className="px-5 py-3">Tanggal & Hari</th>
                          <th className="px-5 py-3">Jam Latihan</th>
                          <th className="px-5 py-3">Nama Siswa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const DAYS_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                          const dateList: { dateStr: string; dayName: string; displayDate: string }[] = [];
                          if (laporanStartDate && laporanEndDate) {
                            let curr = new Date(laporanStartDate + 'T00:00:00');
                            const end = new Date(laporanEndDate + 'T00:00:00');
                            while (curr <= end) {
                              const year = curr.getFullYear();
                              const month = String(curr.getMonth() + 1).padStart(2, '0');
                              const dayNum = String(curr.getDate()).padStart(2, '0');
                              const dateStr = `${year}-${month}-${dayNum}`;
                              const dayName = DAYS_INDO[curr.getDay()];
                              const displayDate = `${dayNum}/${month}/${year} (${dayName})`;
                              dateList.push({ dateStr, dayName, displayDate });
                              curr.setDate(curr.getDate() + 1);
                            }
                          }

                          let count = 0;
                          let coachTotalSessionsInRange = 0;
                          const coachRows: any[] = [];

                          dateList.forEach(dateObj => {
                            const dayName = dateObj.dayName;
                            const displayDate = dateObj.displayDate;

                            const daySched = currentCoach.schedule ? currentCoach.schedule.find(d => d.day === dayName) : null;
                            const timeSlots = daySched ? daySched.timeSlots || [] : [];

                            timeSlots.forEach(slot => {
                              coachTotalSessionsInRange++;
                              const time = slot.time;

                              const slotStudents = members.filter(m => 
                                m.coachId === currentCoach.id &&
                                m.isActive !== false &&
                                (m.status === 'Aktif' || m.status === 'Paket Hampir Habis') &&
                                (
                                  (m.scheduleDay === dayName && m.scheduleTime === time) ||
                                  (m.scheduleDay2 === dayName && m.scheduleTime2 === time) ||
                                  (m.schedules && Array.isArray(m.schedules) && m.schedules.some((s: any) => s.day === dayName && s.time === time)) ||
                                  (slot.students && slot.students.includes(m.id))
                                )
                              );

                              if (slotStudents.length > 0) {
                                slotStudents.forEach(st => {
                                  count++;
                                  coachRows.push({
                                    no: count,
                                    coachName: currentCoach.name,
                                    displayDate,
                                    scheduleTime: time,
                                    studentName: st.student.fullName
                                  });
                                });
                              } else {
                                count++;
                                coachRows.push({
                                  no: count,
                                  coachName: currentCoach.name,
                                  displayDate,
                                  scheduleTime: time,
                                  studentName: '- (Kosong)'
                                });
                              }
                            });
                          });

                          const totalStr = `${coachTotalSessionsInRange} Sesi`;

                          if (coachRows.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="text-center py-6 text-slate-400 italic">Belum ada jadwal mengajar rutin pada rentang tanggal ini.</td>
                              </tr>
                            );
                          }

                          return coachRows.map((r) => (
                            <tr key={r.no} className="hover:bg-slate-50/80 transition">
                              <td className="px-5 py-2.5 font-mono font-bold text-slate-400">{r.no}</td>
                              <td className="px-5 py-2.5 font-extrabold text-slate-800">{r.coachName}</td>
                              <td className="px-5 py-2.5 font-bold text-emerald-700">
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[11px] font-black">
                                  {totalStr}
                                </span>
                              </td>
                              <td className="px-5 py-2.5 font-bold text-slate-700">{r.displayDate}</td>
                              <td className="px-5 py-2.5 font-bold text-cyan-700 bg-cyan-50/50 rounded-lg">{r.scheduleTime}</td>
                              <td className="px-5 py-2.5 font-bold text-slate-700">{r.studentName}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: REPORT ABSENCE */}
            {activeTab === 'report_absence' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-500" /> Laporkan Ketidakhadiran Mengajar
                  </h3>
                  <p className="text-xs text-slate-500">Kirim pemberitahuan ke Admin jika Anda berhalangan hadir mengajar pada tanggal tertentu.</p>
                </div>
                
                <form onSubmit={handleReportAbsence} className="space-y-4 text-xs">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Jadwal yang Ingin Diliburkan</label>
                      <select
                        value={absenceScheduleIndex}
                        onChange={(e) => setAbsenceScheduleIndex(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs text-slate-800 font-semibold focus:outline-hidden"
                        required
                      >
                        <option value="">-- Pilih Hari & Jam --</option>
                        {coachSlots.map((slot, index) => (
                          <option key={index} value={index}>
                            Hari {slot.day} @ {slot.time} WIB
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Tanggal Absen</label>
                      <input
                        type="date"
                        value={absenceDate}
                        onChange={(e) => setAbsenceDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-hidden"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Alasan Berhalangan Hadir</label>
                    <textarea
                      placeholder="Contoh: Sedang sakit medis, ada urusan darurat keluarga, dinas luar..."
                      value={absenceReason}
                      onChange={(e) => setAbsenceReason(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-800 focus:outline-hidden"
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingAbsence}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-6 py-3 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-rose-600/10"
                    >
                      {isSubmittingAbsence ? 'Mengirim...' : 'Kirim Laporan Absen ke Admin'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 5: ABSENCE HISTORY */}
            {activeTab === 'absence_history' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-cyan-600" /> Riwayat Pengajuan Absen Saya
                    </h3>
                    <p className="text-xs text-slate-500">Tinjau status pemrosesan izin mengajar dan pelatih pengganti dari Admin.</p>
                  </div>
                  <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                    {coachAbsencesList.length} Laporan
                  </span>
                </div>

                <div className="space-y-3">
                  {coachAbsencesList.length === 0 ? (
                    <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs italic">
                      Belum ada riwayat pengajuan absen mengajar.
                    </div>
                  ) : (
                    coachAbsencesList.map(a => {
                      const replacement = coaches.find(c => c.id === a.replacementCoachId);
                      return (
                        <div key={a.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 text-xs space-y-2 text-left shadow-2xs">
                          <div className="flex justify-between items-center font-bold text-slate-800">
                            <span className="text-sm font-extrabold">{a.date} (Hari {a.day})</span>
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-wider font-extrabold ${
                              a.status === 'Menunggu' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              a.status === 'Transfer' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              a.status === 'Reschedule' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {a.status}
                            </span>
                          </div>
                          <p className="text-slate-600 font-semibold">Jam Mengajar: {a.time} WIB</p>
                          <p className="text-slate-700 italic bg-white p-2.5 rounded-xl border border-slate-200">" {a.reason} "</p>
                          {a.status === 'Transfer' && replacement && (
                            <p className="text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl mt-2 flex items-center gap-1.5">
                              ✓ Pelatih Pengganti: <strong className="text-emerald-950">Coach {replacement.name}</strong>
                            </p>
                          )}
                          {a.status === 'Reschedule' && (
                            <p className="text-cyan-800 font-bold bg-cyan-50 border border-cyan-200 px-3 py-2 rounded-xl mt-2 flex items-center gap-1.5">
                              ℹ Sesi Diundur (Reschedule Kelas): Sesi diundur ke jadwal berikutnya
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </main>
        </div>
      )}
    </div>
  );
}
