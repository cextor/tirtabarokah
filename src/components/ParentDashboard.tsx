/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Coach, Member, TrainingProgress } from '../types';
import { 
  Phone, User, Calendar, Award, CheckCircle, Clock, BookOpen, DollarSign, 
  Download, RefreshCw, Send, AlertCircle, FileText
} from 'lucide-react';
import { api } from '../api';

interface ParentDashboardProps {
  coaches: Coach[];
  members: Member[];
  onUpdateMembers: (members: Member[]) => void;
}

export default function ParentDashboard({ coaches, members, onUpdateMembers }: ParentDashboardProps) {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [localMembers, setLocalMembers] = useState<Member[]>([]);

  // Reschedule form states
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [rescheduleDay, setRescheduleDay] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [rescheduleSuccess, setRescheduleSuccess] = useState<string | null>(null);

  // Receipt popup state
  const [activeReceiptMember, setActiveReceiptMember] = useState<Member | null>(null);

  // Demo shortcut login helper
  const handleDemoLogin = async (phone: string) => {
    setPhoneNumber(phone);
    try {
      setLoginError(null);
      const res = await api.parentLogin(phone);
      if (res.status === 'success' && res.members) {
        setLocalMembers(res.members);
        setIsLoggedIn(true);
        setLoginError(null);
      } else {
        setLoginError('Gagal masuk demo.');
      }
    } catch (err) {
      setLoginError('Gagal masuk demo.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone) return;

    try {
      setLoginError(null);
      const res = await api.parentLogin(cleanPhone);
      if (res.status === 'success' && res.members) {
        setLocalMembers(res.members);
        setIsLoggedIn(true);
        setLoginError(null);
      } else {
        setLoginError('Nomor HP tidak terdaftar sebagai orang tua member.');
      }
    } catch (err) {
      setLoginError('Nomor HP tidak terdaftar sebagai orang tua member.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPhoneNumber('');
    setSelectedStudentId('');
    setLocalMembers([]);
    setRescheduleSuccess(null);
  };

  // Find all children belonging to logged-in parent
  const parentStudents = isLoggedIn ? localMembers : [];

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !rescheduleDay || !rescheduleTime) return;

    const child = localMembers.find(m => m.id === selectedStudentId);
    if (!child) return;

    try {
      await api.requestReschedule({
        memberId: selectedStudentId,
        requestedDay: rescheduleDay,
        requestedTime: rescheduleTime,
        reason: rescheduleReason
      });

      // Refresh local children data
      const res = await api.parentLogin(phoneNumber.trim());
      if (res.status === 'success' && res.members) {
        setLocalMembers(res.members);
      }

      setRescheduleSuccess(`Jadwal ${child.student.fullName} berhasil dipindahkan ke hari ${rescheduleDay} pukul ${rescheduleTime} WIB!`);
    } catch (err) {
      console.error(err);
      setRescheduleSuccess('Gagal mengajukan reschedule. Silakan coba lagi.');
    }
    
    // reset reschedule form
    setRescheduleDay('');
    setRescheduleTime('');
    setRescheduleReason('');
    setTimeout(() => setRescheduleSuccess(null), 5000);
  };

  return (
    <div className="space-y-8">
      {/* 1. LOGIN SCREEN */}
      {!isLoggedIn ? (
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto text-cyan-600">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Login Portal Orang Tua</h3>
            <p className="text-xs text-slate-500 leading-normal">Masukkan nomor HP aktif Anda yang terdaftar pada sistem saat pendaftaran siswa.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">No. HP Orang Tua</label>
              <input
                type="tel"
                placeholder="Contoh: 081234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-sm text-slate-800 font-mono"
                required
              />
            </div>

            {loginError && (
              <p className="text-xs text-rose-600 font-semibold text-center">{loginError}</p>
            )}

            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              Masuk Portal
            </button>
          </form>

          {/* Shortcuts for evaluation */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Akun Demo Orang Tua (Klik Instan)</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleDemoLogin('081234567890')}
                className="bg-slate-50 border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/20 p-2.5 rounded-xl text-left text-xs transition"
              >
                <span className="font-bold text-slate-700 block">Bapak Rudi</span>
                <span className="text-[9px] text-slate-400 font-mono">081234567890 (Ortu Aldi)</span>
              </button>
              <button
                onClick={() => handleDemoLogin('082198765432')}
                className="bg-slate-50 border border-slate-200 hover:border-cyan-300 hover:bg-cyan-50/20 p-2.5 rounded-xl text-left text-xs transition"
              >
                <span className="font-bold text-slate-700 block">Ibu Maya</span>
                <span className="text-[9px] text-slate-400 font-mono">082198765432 (Ortu Bima)</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* 2. AUTHENTICATED PARENT VIEW */
        <div className="space-y-8">
          {/* Welcome / Header */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest">Portal Orang Tua</span>
              <h3 className="text-lg font-black">Selamat Datang, Wali Siswa</h3>
              <p className="text-slate-300 text-xs">Simulasi No. HP: <span className="font-mono text-cyan-300 font-bold">{phoneNumber}</span></p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-slate-800 border border-slate-700 hover:bg-slate-700 transition px-4 py-2 rounded-xl text-xs font-bold"
            >
              Keluar Portal
            </button>
          </div>

          {/* Children List Grid */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Children details & attendance */}
            <div className="lg:col-span-2 space-y-6">
              {parentStudents.map(child => {
                const coach = coaches.find(c => c.id === child.coachId);
                const isExpiring = child.sessionsLeft <= 2;
                return (
                  <div key={child.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                    {/* Top Child Card Header */}
                    <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-slate-100 pb-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center font-black">
                          {child.student.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-base text-slate-800">{child.student.fullName}</h4>
                          <span className="text-[10px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                            {child.student.gender} • {child.student.age} Tahun
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Sisa Pertemuan Kelas</span>
                        <span className={`text-base font-black ${isExpiring ? 'text-rose-600' : 'text-slate-800'}`}>
                          {child.sessionsLeft} <span className="text-xs text-slate-400 font-normal">dari {child.sessionsTotal} sesi</span>
                        </span>
                      </div>
                    </div>

                    {/* Coach & Schedule Block */}
                    <div className="grid md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                          <img src={coach?.photo} alt={coach?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Pelatih Pembimbing</span>
                          <span className="font-bold text-slate-800 text-sm">{coach?.name}</span>
                          <p className="text-[10px] text-slate-500 leading-tight">{coach?.experience}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex items-center gap-3">
                        <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Jadwal Kelas Rutin</span>
                          <span className="font-black text-slate-800 text-sm">Setiap {child.scheduleDay}</span>
                          <span className="font-mono text-cyan-800 font-bold block">Pukul {child.scheduleTime} WIB</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline Progress logs */}
                    <div className="space-y-4">
                      <h5 className="font-bold text-xs uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-cyan-600" /> Catatan Riwayat Latihan & Perkembangan
                      </h5>

                      {child.progress.length === 0 ? (
                        <div className="bg-slate-50 text-slate-500 text-xs p-5 rounded-xl italic text-center">
                          Belum ada aktivitas latihan terekam. Jadwal pertama Anda akan dimulai pada waktu yang ditentukan.
                        </div>
                      ) : (
                        <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4">
                          {child.progress.map((prog, index) => (
                            <div key={prog.id} className="relative">
                              {/* Dot pointer indicator */}
                              <span className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                                prog.attendance === 'Hadir' ? 'bg-emerald-500' : 'bg-rose-500'
                              }`} />
                              <div className="space-y-1 bg-slate-50/40 p-3 rounded-lg border border-slate-150/50">
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="font-bold text-slate-600">{prog.date}</span>
                                  <span className={`px-2 py-0.5 rounded-full font-bold ${
                                    prog.attendance === 'Hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {prog.attendance}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                                  "{prog.note}"
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Payment History & Receipt Download */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold uppercase block text-[9px] mb-0.5">Status Pembayaran Terakhir</span>
                        <span className="font-black text-slate-700 block">Nominal Paket: Rp {child.payment.amount.toLocaleString('id-ID')} ({child.payment.method})</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-700 font-bold">Lunas (Terkonfirmasi Kasir)</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveReceiptMember(child)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-3.5 rounded-lg flex items-center gap-1 shadow-sm text-xs transition shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" /> Cetak Kwitansi
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Reschedule request portal */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-cyan-600" /> Ajukan Reschedule Kelas
                </h4>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Berhalangan hadir latihan? Anda dapat memindahkan hari latihan dengan coach yang sama ke slot kosong lainnya di bawah ini.
                </p>

                {rescheduleSuccess && (
                  <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-3 rounded-lg text-[10px] font-semibold leading-normal">
                    {rescheduleSuccess}
                  </div>
                )}

                <form onSubmit={handleRescheduleSubmit} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Pilih Siswa</label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 font-bold"
                      required
                    >
                      <option value="">-- Pilih Siswa --</option>
                      {parentStudents.map(c => (
                        <option key={c.id} value={c.id}>{c.student.fullName}</option>
                      ))}
                    </select>
                  </div>

                  {selectedStudentId && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Pilih Hari Baru</label>
                        <select
                          value={rescheduleDay}
                          onChange={(e) => setRescheduleDay(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 font-semibold"
                          required
                        >
                          <option value="">-- Pilih Hari --</option>
                          <option value="Senin">Senin</option>
                          <option value="Selasa">Selasa</option>
                          <option value="Rabu">Rabu</option>
                          <option value="Kamis">Kamis</option>
                          <option value="Jumat">Jumat</option>
                          <option value="Sabtu">Sabtu</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Pilih Jam Kelas Baru</label>
                        <select
                          value={rescheduleTime}
                          onChange={(e) => setRescheduleTime(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-700 font-semibold"
                          required
                        >
                          <option value="">-- Pilih Jam --</option>
                          <option value="08.00">08.00 WIB</option>
                          <option value="09.00">09.00 WIB</option>
                          <option value="10.00">10.00 WIB</option>
                          <option value="15.00">15.00 WIB</option>
                          <option value="16.00">16.00 WIB</option>
                          <option value="17.00">17.00 WIB</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Alasan Reschedule</label>
                        <textarea
                          placeholder="Alasan pemindahan jadwal (cth: Ada acara keluarga / anak kurang enak badan)"
                          value={rescheduleReason}
                          onChange={(e) => setRescheduleReason(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-200 p-2 text-xs text-slate-800"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" /> Kirim Pengajuan Reschedule
                      </button>
                    </>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* simulated downloadable invoice popup receipt */}
      {activeReceiptMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-6 relative border border-slate-100 shadow-2xl">
            <button
              onClick={() => setActiveReceiptMember(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-1.5 border-b border-dashed border-slate-200 pb-4">
              <div className="w-10 h-10 bg-cyan-50 text-cyan-600 rounded-full flex items-center justify-center mx-auto text-sm font-black">
                TB
              </div>
              <h4 className="font-extrabold text-sm text-slate-800">TIRTA BAROKAH PALEMBANG</h4>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">Kwitansi Pembayaran Resmi</p>
            </div>

            {/* Receipt Details */}
            <div className="space-y-2.5 text-xs font-mono text-slate-700">
              <div className="flex justify-between">
                <span>No. Kwitansi:</span>
                <span className="font-bold text-slate-900">#INV-REN-{activeReceiptMember.id.substring(7, 11).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Tanggal Bayar:</span>
                <span className="font-bold text-slate-900">
                  {new Date(activeReceiptMember.payment.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pembayar (Ortu):</span>
                <span className="font-bold text-slate-900">{activeReceiptMember.parent.fatherMotherName}</span>
              </div>
              <div className="flex justify-between">
                <span>Nama Siswa:</span>
                <span className="font-bold text-slate-900">{activeReceiptMember.student.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelatih Utama:</span>
                <span className="font-bold text-slate-900">
                  {coaches.find(c => c.id === activeReceiptMember.coachId)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Paket Sesi:</span>
                <span className="font-bold text-slate-900">{activeReceiptMember.sessionsTotal}x Pertemuan</span>
              </div>
              <div className="border-t border-dashed border-slate-200 my-2 pt-2 flex justify-between text-sm font-bold">
                <span className="text-slate-800 font-extrabold">TOTAL BAYAR:</span>
                <span className="text-cyan-700 font-black">Rp {activeReceiptMember.payment.amount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Sign stamp */}
            <div className="flex justify-between items-center text-[10px] pt-2 border-t border-slate-100">
              <div className="text-slate-400">
                Metode: <strong className="text-slate-700 font-mono">{activeReceiptMember.payment.method}</strong>
              </div>
              <div className="text-center">
                <p className="text-slate-400">Kasir Tirta Barokah</p>
                <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-mono mt-1 rotate-[-3deg]">
                  ✓ PAID / LUNAS
                </div>
              </div>
            </div>

            {/* Print button */}
            <button
              onClick={() => {
                window.print();
              }}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Cetak Kwitansi PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// X icon helper in case lucide is not pre-registered
function X(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
