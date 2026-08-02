/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { Coach, Member, TrainingProgress, CoachAbsence } from '../types';
import { api, getMediaUrl } from '../api';
import { 
  Award, Users, Calendar, CheckSquare, PlusCircle, Clock, BookOpen, AlertCircle, Phone
} from 'lucide-react';

interface CoachDashboardProps {
  coaches: Coach[];
  members: Member[];
  absences: CoachAbsence[];
  onReloadData: () => void;
  onUpdateMembers: (members: Member[]) => void;
  loggedCoachId?: string;
}

export default function CoachDashboard({ coaches, members, absences, onReloadData, onUpdateMembers, loggedCoachId }: CoachDashboardProps) {
  // Simulate Coach Login
  const [selectedCoachId, setSelectedCoachId] = useState<string>(loggedCoachId || 'coach-rian');
  const [selectedStudentForNote, setSelectedStudentForNote] = useState<string>('');
  const [newProgressNote, setNewProgressNote] = useState<string>('');
  const [newProgressAttendance, setNewProgressAttendance] = useState<'Hadir' | 'Absen' | 'Izin'>('Hadir');

  // State for absence report
  const [absenceDate, setAbsenceDate] = useState<string>('');
  const [absenceScheduleIndex, setAbsenceScheduleIndex] = useState<string>('');
  const [absenceReason, setAbsenceReason] = useState<string>('');
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState<boolean>(false);

  React.useEffect(() => {
    if (loggedCoachId) {
      setSelectedCoachId(loggedCoachId);
    }
  }, [loggedCoachId]);

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

  const coachSlots = currentCoach ? currentCoach.schedule.flatMap(day => 
    day.timeSlots.map(slot => ({
      day: day.day,
      time: slot.time
    }))
  ) : [];

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

  // 1. ACTION: RECORD ATTENDANCE AND SUBMIT DEVELOPING NOTE
  const handleAddProgressRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForNote || !newProgressNote) return;

    const updated = members.map(m => {
      if (m.id === selectedStudentForNote) {
        // deduct 1 session if attended
        const isHadir = newProgressAttendance === 'Hadir';
        const newSessionsLeft = isHadir ? Math.max(0, m.sessionsLeft - 1) : m.sessionsLeft;
        
        // update status to expired if 0
        let newStatus = m.status;
        if (newSessionsLeft === 0) {
          newStatus = 'Selesai';
        } else if (newSessionsLeft <= 2) {
          newStatus = 'Paket Hampir Habis';
        }

        const newRecord: TrainingProgress = {
          id: `prog-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
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
    
    // reset form
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
      date: new Date().toISOString().split('T')[0],
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

  return (
    <div className="space-y-8">
      {/* Simulation Selector Bar */}
      {!loggedCoachId && (
        <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-5 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-600 rounded-xl text-white">
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
            className="bg-white border border-cyan-200 text-xs font-bold rounded-xl px-4 py-3 text-cyan-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          >
            {coaches.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {currentCoach && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT: COACH SCHEDULE & STATS */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-slate-100 rounded-full overflow-hidden mx-auto border-2 border-cyan-500/30">
                  <img src={getMediaUrl(currentCoach.photo)} alt={currentCoach.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <h4 className="font-bold text-base text-slate-800">{currentCoach.name}</h4>
                <p className="text-xs text-slate-500 italic max-w-xs mx-auto">"{currentCoach.experience}"</p>
                
                {/* Referral Info box */}
                <div className="bg-cyan-50/50 p-2.5 rounded-xl border border-cyan-100 text-xs mt-1 space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kode Referral Saya:</p>
                  <p className="font-mono font-black text-cyan-900 text-sm select-all">{currentCoach.referralCode}</p>
                  <p className="text-[10px] text-slate-600">Total Reward Bonus: <strong className="text-emerald-700">Rp {(currentCoach.referralBonus || 0).toLocaleString('id-ID')}</strong></p>
                  <p className="text-[9px] text-slate-400 italic">Dapatkan bonus Rp 50.000 cash dari Admin untuk setiap pendaftaran baru menggunakan kode Anda.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-center">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-semibold text-slate-500 block uppercase">Total Siswa</span>
                  <span className="text-base font-black text-slate-800">{coachStudents.length}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-semibold text-slate-500 block uppercase">Kuota Aktif</span>
                  <span className="text-base font-black text-slate-800">{coachStudents.length} / {currentCoach.maxQuota}</span>
                </div>
              </div>
            </div>

            {/* Teaching Schedule */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-cyan-600" /> Jadwal Mengajar Rutin
              </h4>
              <div className="space-y-3">
                {currentCoach.schedule.map(day => (
                  <div key={day.day} className="border-b border-slate-100 last:border-transparent pb-2 last:pb-0 space-y-1">
                    <span className="text-xs font-bold text-slate-700 block">{day.day}</span>
                    <div className="grid grid-cols-2 gap-2">
                      {day.timeSlots.map(slot => {
                        const studentsCount = members.filter(
                          m => m.coachId === currentCoach.id && m.scheduleDay === day.day && m.scheduleTime === slot.time && m.status !== 'Selesai'
                        ).length;
                        return (
                          <div key={slot.time} className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex flex-col justify-between">
                            <span className="font-mono text-xs font-bold text-slate-800">{slot.time} WIB</span>
                            <span className="text-[10px] text-slate-400 mt-1">{studentsCount} Siswa Terdaftar</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Lapor Absen Pelatih */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-500" /> Laporkan Absen Mengajar
              </h4>
              <p className="text-[10px] text-slate-400 leading-normal">
                Jika Anda berhalangan hadir mengajar, mohon kirimkan tanggal dan alasan absen ke Admin agar dapat diproses (transfer murid / reschedule kelas).
              </p>
              
              <form onSubmit={handleReportAbsence} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Jadwal yang Ingin Diliburkan</label>
                  <select
                    value={absenceScheduleIndex}
                    onChange={(e) => setAbsenceScheduleIndex(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none"
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
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Alasan Berhalangan Hadir</label>
                  <textarea
                    placeholder="Contoh: Sedang sakit medis, ada urusan darurat keluarga, dinas luar..."
                    value={absenceReason}
                    onChange={(e) => setAbsenceReason(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs text-slate-800 focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAbsence}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAbsence ? 'Mengirim...' : 'Kirim Laporan Absen'}
                </button>
              </form>
            </div>

            {/* Riwayat Absen Pelatih */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Riwayat Pengajuan Absen Saya
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {absences.filter(a => a.coachId === selectedCoachId).length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-2">Belum ada riwayat pengajuan absen.</p>
                ) : (
                  absences.filter(a => a.coachId === selectedCoachId).map(a => {
                    const replacement = coaches.find(c => c.id === a.replacementCoachId);
                    return (
                      <div key={a.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-150 text-[10px] space-y-1 text-left">
                        <div className="flex justify-between font-bold text-slate-700">
                          <span>{a.date} (Hari {a.day})</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-widest ${
                            a.status === 'Menunggu' ? 'bg-amber-100 text-amber-800' :
                            a.status === 'Transfer' ? 'bg-indigo-100 text-indigo-800' :
                            a.status === 'Reschedule' ? 'bg-cyan-100 text-cyan-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                        <p className="text-slate-500">Jam: {a.time} WIB</p>
                        <p className="text-slate-600 italic">" {a.reason} "</p>
                        {a.status === 'Transfer' && replacement && (
                          <p className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded mt-1">
                            Digantikan: Coach {replacement.name}
                          </p>
                        )}
                        {a.status === 'Reschedule' && (
                          <p className="text-cyan-700 font-semibold bg-cyan-50 px-1.5 py-0.5 rounded mt-1">
                            Reschedule: Sesi diundur ke minggu depan
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: STUDENT ROSTER, ATTENDANCE & DEVELOPMENT NOTES */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* RECORD FORM */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <BookOpen className="w-4 h-4 text-cyan-600" /> Catat Presensi & Perkembangan Siswa
              </h3>
              
              <form onSubmit={handleAddProgressRecord} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Pilih Siswa</label>
                    <select
                      value={selectedStudentForNote}
                      onChange={(e) => setSelectedStudentForNote(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none"
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
                    <div className="grid grid-cols-3 gap-1">
                      {(['Hadir', 'Absen', 'Izin'] as const).map(att => (
                        <button
                          type="button"
                          key={att}
                          onClick={() => setNewProgressAttendance(att)}
                          className={`py-2 text-xs rounded-xl font-bold border transition ${
                            newProgressAttendance === att
                              ? 'bg-cyan-600 text-white border-transparent'
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
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white text-xs text-slate-800 focus:outline-none"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!selectedStudentForNote || !newProgressNote}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2.5 text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" /> Simpan Catatan Siswa
                  </button>
                </div>
              </form>
            </div>

            {/* STUDENTS LIST WITH PROGRESS */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Users className="w-4.5 h-4.5 text-cyan-600" /> Siswa Binaan {currentCoach.name} ({allStudents.length})
              </h3>

              {allStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  Belum ada siswa aktif terdaftar di jadwal Coach {currentCoach.name}.
                </div>
              ) : (
                <div className="space-y-4">
                  {allStudents.map(member => {
                    const isExpiring = member.sessionsLeft <= 2;
                    return (
                      <div key={member.id} className="border border-slate-150 hover:border-cyan-200 transition rounded-xl p-4 space-y-3.5 text-left">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                              {member.student.fullName}
                              {member.isTransfer && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-205 border-amber-200 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                                  Siswa Transfer (Sesi Ini)
                                </span>
                              )}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Siswa {member.student.gender} • Lahir: {member.student.dob} • Penyakit: <span className="font-bold text-slate-700">{member.student.illnessHistory || 'Tidak ada'}</span>
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[11px] text-slate-400 block font-semibold">Sisa Kelas Latihan:</span>
                            <span className={`text-sm font-black ${isExpiring ? 'text-rose-600' : 'text-slate-800'}`}>
                              {member.sessionsLeft} / {member.sessionsTotal} Sesi
                            </span>
                          </div>
                        </div>

                        {/* Quick Presensi Actions Row */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-1 text-slate-500 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Jadwal: {member.scheduleDay} pukul {member.scheduleTime} WIB</span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleQuickAttendance(member.id, 'Hadir')}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer"
                            >
                              ✓ Hadir
                            </button>
                            <button
                              onClick={() => handleQuickAttendance(member.id, 'Absen')}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer"
                            >
                              ✗ Absen
                            </button>
                            <button
                              onClick={() => handleQuickAttendance(member.id, 'Izin')}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2.5 py-1 rounded-lg text-[10px] cursor-pointer"
                            >
                              - Izin
                            </button>
                          </div>
                        </div>

                        {/* Display Latest Progress Note */}
                        <div className="space-y-1 bg-cyan-50/20 border border-cyan-100/50 p-3 rounded-xl">
                          <div className="flex justify-between text-[10px] text-cyan-800 font-bold">
                            <span>Perkembangan Terakhir:</span>
                            <span>{member.progress[0]?.date || 'Belum ada latihan'}</span>
                          </div>
                          {member.progress.length > 0 ? (
                            <p className="text-xs text-slate-700 leading-normal font-medium italic">
                              "{member.progress[0].note}" 
                              <span className={`inline-block ml-2 px-1 rounded text-[9px] font-bold ${
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
          </div>
        </div>
      )}
    </div>
  );
}
