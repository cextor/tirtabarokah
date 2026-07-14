/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Coach, Member, ParentData, StudentData, Package, ScheduleDay, ScheduleTimeSlot, EventItem } from '../types';
import { 
  Award, Shield, Calendar, Users, CheckCircle, ArrowRight, ArrowLeft, 
  CreditCard, Clock, Phone, User, Compass, AlertCircle,
  Gift, Sparkles, Image as ImageIcon, Plus, HeartHandshake, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MainPortalProps {
  coaches: Coach[];
  members: Member[];
  events: EventItem[];
  onRegister: (newMember: Omit<Member, 'id' | 'registeredAt'>) => void;
  onUpdateEvents: (events: EventItem[]) => void;
}

export default function MainPortal({ coaches, members, events, onRegister, onUpdateEvents }: MainPortalProps) {
  // Navigation / Scroll helper
  const scrollToRegister = () => {
    const registerSection = document.getElementById('registration-section');
    if (registerSection) {
      registerSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const [eventCategoryFilter, setEventCategoryFilter] = useState<'Semua' | 'Fun Swimming' | 'Lomba' | 'Latihan Bersama' | 'Pengumuman'>('Semua');

  // State for Registration Funnel
  const [step, setStep] = useState<number>(1);
  const [parentData, setParentData] = useState<ParentData>({ fatherMotherName: '', whatsapp: '' });
  const [studentData, setStudentData] = useState<StudentData>({
    fullName: '',
    gender: 'Laki-laki',
    dob: '',
    age: 0,
    illnessHistory: '',
    hasSwumBefore: false
  });
  
  const [referralCodeUsed, setReferralCodeUsed] = useState<string>('');
  const [coachType, setCoachType] = useState<'Reguler' | 'Privat'>('Reguler');
  const [scheduleFrequency, setScheduleFrequency] = useState<'1x Seminggu' | '2x Seminggu'>('1x Seminggu');

  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  
  // Schedule Sesi 1
  const [selectedScheduleDay, setSelectedScheduleDay] = useState<string>('');
  const [selectedScheduleTime, setSelectedScheduleTime] = useState<string>('');
  
  // Schedule Sesi 2 (only for 2x Seminggu)
  const [selectedScheduleDay2, setSelectedScheduleDay2] = useState<string>('');
  const [selectedScheduleTime2, setSelectedScheduleTime2] = useState<string>('');

  const [paymentMethod, setPaymentMethod] = useState<'Transfer BNI' | 'Tunai di Kasir'>('Transfer BNI');
  const [createdMemberId, setCreatedMemberId] = useState<string | null>(null);

  // Auto calculate age
  useEffect(() => {
    if (studentData.dob) {
      const birthDate = new Date(studentData.dob);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      setStudentData(prev => ({ ...prev, age: Math.max(0, calculatedAge) }));
    }
  }, [studentData.dob]);

  const selectedCoach = coaches.find(c => c.id === selectedCoachId);
  const basePackage = selectedCoach?.packages.find(p => p.id === selectedPackageId);

  // Adjust price for Privat coach type
  const getPackagePrice = (pkg: Package | undefined) => {
    if (!pkg) return 0;
    // Private premium: extra Rp 100.000 for exclusive 1-on-1 lane
    return coachType === 'Privat' ? pkg.price + 100000 : pkg.price;
  };

  const finalPrice = getPackagePrice(basePackage);

  // Submit registration
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoach || !basePackage || !selectedScheduleDay || !selectedScheduleTime) return;

    // Generate unique ID
    const genId = `TB-${Math.floor(100000 + Math.random() * 900000)}`;

    onRegister({
      parent: parentData,
      student: studentData,
      coachId: selectedCoachId,
      packageId: selectedPackageId,
      scheduleFrequency,
      scheduleDay: selectedScheduleDay,
      scheduleTime: selectedScheduleTime,
      scheduleDay2: scheduleFrequency === '2x Seminggu' ? selectedScheduleDay2 : undefined,
      scheduleTime2: scheduleFrequency === '2x Seminggu' ? selectedScheduleTime2 : undefined,
      coachType,
      status: 'Menunggu Verifikasi', // default till checked by admin
      sessionsLeft: basePackage.sessions,
      sessionsTotal: basePackage.sessions,
      payment: {
        amount: finalPrice,
        method: paymentMethod,
        proofUrl: null, // Bukti bayar tidak perlu di upload, dikonfirmasi lewat WA manual
        status: 'Menunggu Verifikasi',
        date: new Date().toISOString()
      },
      progress: [],
      referralCodeUsed: referralCodeUsed ? referralCodeUsed.trim() : undefined
    });

    setCreatedMemberId(genId);
    setStep(6);
  };

  // Reset Form
  const handleResetForm = () => {
    setParentData({ fatherMotherName: '', whatsapp: '' });
    setStudentData({
      fullName: '',
      gender: 'Laki-laki',
      dob: '',
      age: 0,
      illnessHistory: '',
      hasSwumBefore: false
    });
    setReferralCodeUsed('');
    setCoachType('Reguler');
    setScheduleFrequency('1x Seminggu');
    setSelectedCoachId('');
    setSelectedPackageId('');
    setSelectedScheduleDay('');
    setSelectedScheduleTime('');
    setSelectedScheduleDay2('');
    setSelectedScheduleTime2('');
    setPaymentMethod('Transfer BNI');
    setCreatedMemberId(null);
    setStep(1);
  };

  // Helper: check schedule slot availability
  const getSlotDetails = (coach: Coach, dayName: string, timeStr: string) => {
    const day = coach.schedule.find(d => d.day === dayName);
    const slot = day?.timeSlots.find(ts => ts.time === timeStr);
    
    // Check standard members state for live changes
    const currentMembersInThisSlot = members.filter(
      m => m.coachId === coach.id && 
           ((m.scheduleDay === dayName && m.scheduleTime === timeStr) ||
            (m.scheduleFrequency === '2x Seminggu' && m.scheduleDay2 === dayName && m.scheduleTime2 === timeStr)) &&
           m.status !== 'Selesai'
    );

    const activeCount = Math.max(slot?.currentSlots || 0, currentMembersInThisSlot.length);
    const maxSlots = slot?.maxSlots || coach.maxQuota;
    const isFull = activeCount >= maxSlots;

    return {
      current: activeCount,
      max: maxSlots,
      isFull,
      remaining: maxSlots - activeCount
    };
  };

  // Helper: check coach overall status
  const getCoachOverallQuota = (coach: Coach) => {
    const activeStudents = members.filter(m => m.coachId === coach.id && m.status !== 'Selesai').length;
    const maxQuota = coach.maxQuota || 6;
    const isFull = activeStudents >= maxQuota;
    return {
      current: activeStudents,
      max: maxQuota,
      isFull,
      remaining: maxQuota - activeStudents
    };
  };

  // Generate WhatsApp text for payment confirmation
  const getWhatsAppMessage = () => {
    if (!selectedCoach || !basePackage) return '';
    const scheduleStr = scheduleFrequency === '2x Seminggu' 
      ? `1) ${selectedScheduleDay} @ ${selectedScheduleTime} WIB dan 2) ${selectedScheduleDay2} @ ${selectedScheduleTime2} WIB`
      : `${selectedScheduleDay} @ ${selectedScheduleTime} WIB`;

    const text = `Halo Admin Tirta Barokah,\nSaya ingin mengonfirmasi pembayaran pendaftaran siswa baru:\n\n` +
      `• Nama Wali: ${parentData.fatherMotherName}\n` +
      `• No. WhatsApp: ${parentData.whatsapp}\n` +
      `• Nama Anak: ${studentData.fullName}\n` +
      `• Tipe Latihan: ${coachType}\n` +
      `• Coach: ${selectedCoach.name}\n` +
      `• Paket: ${basePackage.name}\n` +
      `• Frekuensi: ${scheduleFrequency}\n` +
      `• Jadwal Kelas: ${scheduleStr}\n` +
      `• Total Tagihan: Rp ${finalPrice.toLocaleString('id-ID')}\n` +
      `• Metode Bayar: ${paymentMethod}\n\n` +
      `Mohon segera diverifikasi datanya. Terima kasih!`;
    return encodeURIComponent(text);
  };

  // Filter events
  const filteredEvents = events.filter(e => 
    eventCategoryFilter === 'Semua' ? true : e.category === eventCategoryFilter
  );

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-cyan-900 via-blue-950 to-indigo-950 rounded-3xl overflow-hidden shadow-2xl p-8 md:p-16 text-white">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=1600&fit=crop&q=60')] opacity-10 bg-cover bg-center pointer-events-none" />
            <div className="relative z-10 max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">
                🏊‍♂️ Premium Private Swimming Academy
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                Private Renang <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Tirta Barokah</span> Palembang
              </h1>
              <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl">
                Melatih anak dan dewasa belajar berenang dengan metode personal yang aman, profesional, dan menyenangkan. Pelatih bersertifikat langsung membimbing hingga mahir di kolam renang terpilih Palembang.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  onClick={scrollToRegister}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-3.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  Daftar Jadi Member <ArrowRight className="w-5 h-5" />
                </button>
                <a
                  href="#program-info"
                  className="bg-slate-800/80 hover:bg-slate-800 text-white font-medium border border-slate-700/80 px-6 py-3.5 rounded-xl transition flex items-center justify-center"
                >
                  Informasi Program
                </a>
              </div>
            </div>
          </section>

          {/* Program & Keunggulan Section */}
          <section id="program-info" className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">1-on-1 Eksklusif</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Satu pelatih hanya fokus mendampingi peserta. Metode disesuaikan dengan kenyamanan, usia, dan riwayat kesehatan siswa.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Pelatih Berpengalaman</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Daftar pelatih pria & wanita profesional dengan latar belakang atlet daerah dan sertifikasi resmi renang yang ramah anak.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Garansi & Fleksibilitas</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Pilihan paket variatif 4x, 8x, hingga 12x pertemuan. Ajukan reschedule latihan secara praktis melalui portal dashboard.
              </p>
            </div>
          </section>

          {/* Coaches Showcase Section */}
          <section className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">Daftar Pelatih Profesional Kami</h2>
              <p className="text-slate-500 text-sm">
                Setiap pelatih memiliki batas kuota maksimal 6 siswa aktif demi efektivitas pengajaran.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {coaches.map((coach) => {
                const quota = getCoachOverallQuota(coach);
                return (
                  <div 
                    key={coach.id} 
                    className={`bg-white rounded-2xl border transition overflow-hidden shadow-sm flex flex-col ${
                      quota.isFull ? 'border-slate-200 opacity-80' : 'border-slate-100 hover:border-cyan-300'
                    }`}
                  >
                    <div className="relative h-48 bg-slate-100">
                      <img 
                        src={coach.photo} 
                        alt={coach.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-md ${
                          quota.isFull 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {quota.isFull ? 'Kuota Penuh' : 'Tersedia'}
                        </span>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-bold text-lg text-slate-900">{coach.name}</h3>
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <Award className="w-4.5 h-4.5 text-cyan-600 flex-shrink-0" />
                          <span>{coach.experience}</span>
                        </p>
                        <p className="text-slate-400 text-[10px] font-semibold font-mono bg-slate-50 px-2 py-1 rounded w-max">
                          Referral Code: {coach.referralCode}
                        </p>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Kuota Terpakai:</span>
                          <span className="font-bold text-slate-800">{quota.current} / {quota.max} Siswa</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              quota.isFull ? 'bg-rose-500' : 'bg-cyan-500'
                            }`}
                            style={{ width: `${(quota.current / quota.max) * 100}%` }}
                          />
                        </div>
                        {quota.isFull ? (
                          <p className="text-rose-600 text-[10px] font-semibold text-center italic">Tidak menerima siswa baru sementara waktu</p>
                        ) : (
                          <p className="text-cyan-700 text-[10px] font-semibold text-center italic">Tersisa {quota.remaining} slot siswa aktif</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Event & Berita Kegiatan Section */}
          <section className="space-y-8 bg-slate-50/50 border border-slate-100 p-8 rounded-3xl">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mb-2">
                📢 Update Terkini
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Event & Berita Kegiatan</h2>
              <p className="text-slate-500 text-xs mt-1">Saksikan kegiatan seru seperti fun swimming, lomba internal, dan pengumuman kegiatan terbaru dari Tirta Barokah.</p>
            </div>

            {/* Event Filters */}
            <div className="flex flex-wrap gap-2">
              {(['Semua', 'Fun Swimming', 'Lomba', 'Latihan Bersama', 'Pengumuman'] as const).map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setEventCategoryFilter(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                    eventCategoryFilter === cat
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredEvents.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-8">
                {filteredEvents.map(event => (
                  <div key={event.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs flex flex-col hover:border-cyan-200 transition">
                    <div className="h-52 bg-slate-100 relative">
                      <img 
                        src={event.imageUrl} 
                        alt={event.title} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-4 left-4 bg-cyan-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg">
                        {event.category}
                      </span>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono">
                          <Calendar className="w-3.5 h-3.5" /> {new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <h3 className="text-base font-black text-slate-800 leading-snug">{event.title}</h3>
                        <p className="text-slate-600 text-xs leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400 mt-2 font-semibold">Belum ada kegiatan/berita kategori ini.</p>
              </div>
            )}
          </section>

          {/* General Schedule Grid */}
          <section className="bg-cyan-50/50 border border-cyan-100/50 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-600" />
              <h2 className="text-lg font-bold text-slate-900">Jadwal Kelas Aktif</h2>
            </div>
            <p className="text-slate-600 text-sm">
              Berikut adalah jadwal rutin yang dikelola oleh para pelatih di kolam renang. Anda dapat memilih salah satu hari dan jam yang tersedia saat melakukan pendaftaran.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {coaches.map((coach) => (
                <div key={coach.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
                  <h3 className="font-semibold text-sm text-cyan-800">{coach.name}</h3>
                  <div className="space-y-2.5">
                    {coach.schedule.map((day) => (
                      <div key={day.day} className="space-y-1">
                        <span className="text-xs font-semibold text-slate-700">{day.day}</span>
                        <div className="flex flex-wrap gap-1.5">
                          {day.timeSlots.map((slot) => {
                            const status = getSlotDetails(coach, day.day, slot.time);
                            return (
                              <span 
                                key={slot.time}
                                className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                                  status.isFull 
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 line-through' 
                                    : 'bg-cyan-50 text-cyan-800 border-cyan-100'
                                }`}
                              >
                                {slot.time} ({status.current}/{status.max})
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Registration Funnel Section */}
          <section id="registration-section" className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-indigo-600 p-6 md:p-8 text-white">
              <h2 className="text-2xl font-extrabold">Formulir Pendaftaran Member Baru</h2>
              <p className="text-cyan-100 text-sm mt-1">Lengkapi data pendaftaran, pilih jenis latihan, paket, serta pilih jadwal rutin mingguan.</p>
              
              {/* Step Indicator */}
              <div className="flex items-center gap-2 mt-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <React.Fragment key={i}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border transition-all ${
                      step === i 
                        ? 'bg-white text-cyan-700 border-white scale-110 shadow-lg' 
                        : step > i 
                        ? 'bg-cyan-500/50 text-white border-transparent' 
                        : 'bg-transparent text-cyan-200 border-cyan-400'
                    }`}>
                      {i}
                    </div>
                    {i < 5 && <div className={`h-0.5 flex-1 transition ${step > i ? 'bg-cyan-400' : 'bg-cyan-700'}`} />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                {/* STEP 1: Data Orang Tua & Anak */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <User className="w-5 h-5 text-cyan-600" /> Data Orang Tua / Wali
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 block">Nama Lengkap Ayah / Ibu</label>
                          <input
                            type="text"
                            placeholder="Contoh: Bapak Rudi / Ibu Siska"
                            value={parentData.fatherMotherName}
                            onChange={(e) => setParentData({ ...parentData, fatherMotherName: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-sm text-slate-800"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 block">No. WhatsApp Aktif</label>
                          <input
                            type="tel"
                            placeholder="Contoh: 081234567890"
                            value={parentData.whatsapp}
                            onChange={(e) => setParentData({ ...parentData, whatsapp: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-sm text-slate-800 font-mono"
                            required
                          />
                          <p className="text-[10px] text-slate-400">Digunakan untuk konfirmasi pembayaran, jadwal renang H-1, dan masa paket.</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Compass className="w-5 h-5 text-cyan-600" /> Data Calon Peserta Renang
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 block">Nama Lengkap Anak / Siswa</label>
                          <input
                            type="text"
                            placeholder="Nama lengkap anak"
                            value={studentData.fullName}
                            onChange={(e) => setStudentData({ ...studentData, fullName: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-sm text-slate-800"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 block">Jenis Kelamin</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setStudentData({ ...studentData, gender: 'Laki-laki' })}
                              className={`py-3 rounded-xl border text-sm font-semibold transition ${
                                studentData.gender === 'Laki-laki'
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-500'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Laki-laki
                            </button>
                            <button
                              type="button"
                              onClick={() => setStudentData({ ...studentData, gender: 'Perempuan' })}
                              className={`py-3 rounded-xl border text-sm font-semibold transition ${
                                studentData.gender === 'Perempuan'
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-500'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Perempuan
                            </button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 block">Tanggal Lahir</label>
                          <input
                            type="date"
                            value={studentData.dob}
                            onChange={(e) => setStudentData({ ...studentData, dob: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-sm text-slate-800"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-600 block">Umur (Kalkulasi Otomatis)</label>
                          <div className="bg-slate-100 border border-slate-200 px-4 py-3 rounded-xl text-sm font-mono text-slate-800">
                            {studentData.age} Tahun
                          </div>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-semibold text-slate-600 block">Riwayat Penyakit (Asma, Trauma Air, Cedera, dsb.)</label>
                          <input
                            type="text"
                            placeholder="Contoh: Asma ringan, trauma air sedang, atau 'Tidak ada'"
                            value={studentData.illnessHistory}
                            onChange={(e) => setStudentData({ ...studentData, illnessHistory: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-sm text-slate-800"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-semibold text-slate-600 block">Apakah Siswa Pernah Belajar Renang Sebelumnya?</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setStudentData({ ...studentData, hasSwumBefore: true })}
                              className={`py-3 rounded-xl border text-sm font-semibold transition ${
                                studentData.hasSwumBefore === true
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-500'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Ya, Pernah Belajar
                            </button>
                            <button
                              type="button"
                              onClick={() => setStudentData({ ...studentData, hasSwumBefore: false })}
                              className={`py-3 rounded-xl border text-sm font-semibold transition ${
                                studentData.hasSwumBefore === false
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-500'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Tidak, Belum Pernah
                            </button>
                          </div>
                        </div>

                        {/* Rreferral Code Input */}
                        <div className="space-y-1 md:col-span-2 bg-slate-50 p-4.5 rounded-xl border border-slate-200/80 mt-2">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <Gift className="w-4 h-4 text-cyan-600" /> Masukkan Kode Referral (Opsional)
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: COACH-RIAN atau ID member pemberi rekomendasi"
                            value={referralCodeUsed}
                            onChange={(e) => setReferralCodeUsed(e.target.value)}
                            className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-sm text-slate-800 uppercase font-mono"
                          />
                          <p className="text-[10px] text-slate-500 mt-1">Masukkan kode pelatih (cth: <strong>COACH-RIAN</strong>) atau ID member teman Anda untuk mengaktifkan bonus rewards bagi kedua pihak.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="button"
                        disabled={!parentData.fatherMotherName || !parentData.whatsapp || !studentData.fullName || !studentData.dob}
                        onClick={() => setStep(2)}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 shadow-md shadow-cyan-600/10"
                      >
                        Selanjutnya: Pilih Pelatih <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Pilih Pelatih & Tipe Latihan */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Pilih Tipe Latihan & Pelatih</h3>
                      <p className="text-slate-500 text-xs mt-1">Sesuaikan tipe bimbingan sesuai preferensi kenyamanan Anda.</p>
                    </div>

                    {/* Tipe Bimbingan Switch */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 block">Pilih Jenis Kelas / Coach</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setCoachType('Reguler')}
                          className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                            coachType === 'Reguler'
                              ? 'bg-cyan-50/50 border-cyan-500 ring-2 ring-cyan-500/10'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Users className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-black text-slate-800">Kelas Reguler</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">Satu pelatih melatih beberapa siswa di sesi yang sama (maksimal 6 anak). Pilihan ekonomis & interaktif.</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoachType('Privat')}
                          className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                            coachType === 'Privat'
                              ? 'bg-cyan-50/50 border-cyan-500 ring-2 ring-cyan-500/10'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Sparkles className="w-5 h-5 text-cyan-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-black text-slate-800">Kelas Privat</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">Pendampingan 1-on-1 eksklusif. Pelatih hanya membimbing 1 siswa di jalur lintasan khusus. (Premium +Rp 100.000)</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-slate-600 block">Pilih Pelatih / Coach Pembimbing</label>
                      <div className="grid md:grid-cols-3 gap-4">
                        {coaches.map((coach) => {
                          const status = getCoachOverallQuota(coach);
                          const isSelected = selectedCoachId === coach.id;
                          return (
                            <button
                              type="button"
                              key={coach.id}
                              disabled={status.isFull}
                              onClick={() => {
                                setSelectedCoachId(coach.id);
                                setSelectedPackageId(''); // reset downstream
                                setSelectedScheduleDay('');
                                setSelectedScheduleTime('');
                                setSelectedScheduleDay2('');
                                setSelectedScheduleTime2('');
                              }}
                              className={`w-full text-left rounded-xl border p-4 transition flex items-start gap-3 relative ${
                                status.isFull
                                  ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-cyan-50/50 border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                                <img src={coach.photo} alt={coach.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-bold text-sm text-slate-800">{coach.name}</h4>
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  status.isFull ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {status.isFull ? 'PENUH' : 'TERSEDIA'}
                                </span>
                                <p className="text-[10px] text-slate-500">Kuota: {status.current}/{status.max} siswa</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedCoach && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-cyan-50/30 rounded-xl border border-cyan-100 p-5 space-y-3"
                      >
                        <h4 className="font-bold text-sm text-cyan-900">Profil Pelatih Terpilih: {selectedCoach.name}</h4>
                        <div className="grid md:grid-cols-2 gap-4 text-xs text-slate-700">
                          <div>
                            <span className="font-semibold text-slate-500 block">Pengalaman:</span>
                            <span>{selectedCoach.experience}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-500 block">Sisa Slot Aktif:</span>
                            <span className="font-bold text-cyan-800">
                              {getCoachOverallQuota(selectedCoach).remaining} siswa lagi
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="border border-slate-300 text-slate-600 font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 hover:bg-slate-50"
                      >
                        <ArrowLeft className="w-4 h-4" /> Kembali
                      </button>
                      <button
                        type="button"
                        disabled={!selectedCoachId}
                        onClick={() => setStep(3)}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 shadow-md shadow-cyan-600/10"
                      >
                        Selanjutnya: Pilih Paket <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Pilih Paket */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Pilih Paket Latihan</h3>
                      <p className="text-slate-500 text-xs mt-1">Masing-masing paket memiliki jumlah pertemuan yang terstruktur.</p>
                    </div>

                    {selectedCoach && (
                      <div className="grid md:grid-cols-3 gap-4">
                        {selectedCoach.packages.map((pkg) => {
                          const isSelected = selectedPackageId === pkg.id;
                          const calculatedPrice = getPackagePrice(pkg);
                          return (
                            <button
                              type="button"
                              key={pkg.id}
                              onClick={() => {
                                setSelectedPackageId(pkg.id);
                              }}
                              className={`w-full text-left rounded-xl border p-5 transition flex flex-col justify-between h-44 ${
                                isSelected
                                  ? 'bg-cyan-50/50 border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div>
                                <span className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-600">Paket Belajar</span>
                                <h4 className="font-bold text-base text-slate-800 mt-1">{pkg.name}</h4>
                              </div>
                              <div>
                                <p className="text-xl font-extrabold text-slate-900">
                                  Rp {calculatedPrice.toLocaleString('id-ID')}
                                </p>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">{pkg.sessions} Kali Pertemuan Latihan</p>
                                {coachType === 'Privat' && (
                                  <p className="text-[9px] text-cyan-600 font-bold mt-1 italic">Termasuk Premium Privat 1-on-1</p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="border border-slate-300 text-slate-600 font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 hover:bg-slate-50"
                      >
                        <ArrowLeft className="w-4 h-4" /> Kembali
                      </button>
                      <button
                        type="button"
                        disabled={!selectedPackageId}
                        onClick={() => setStep(4)}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 shadow-md shadow-cyan-600/10"
                      >
                        Selanjutnya: Pilih Jadwal <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Pilih Jadwal Sesuai Frekuensi */}
                {step === 4 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Atur Jadwal Latihan Mingguan</h3>
                      <p className="text-slate-500 text-xs mt-1">Anda dapat memilih untuk berlatih 1 kali seminggu atau 2 kali seminggu.</p>
                    </div>

                    {/* Frekuensi Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 block">Frekuensi Latihan Rutin</label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleFrequency('1x Seminggu');
                            setSelectedScheduleDay2('');
                            setSelectedScheduleTime2('');
                          }}
                          className={`py-3.5 rounded-xl border text-sm font-bold transition text-center ${
                            scheduleFrequency === '1x Seminggu'
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-500'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          1 Minggu 1x Latihan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleFrequency('2x Seminggu');
                          }}
                          className={`py-3.5 rounded-xl border text-sm font-bold transition text-center ${
                            scheduleFrequency === '2x Seminggu'
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-500'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          1 Minggu 2x Latihan
                        </button>
                      </div>
                    </div>

                    {selectedCoach && (
                      <div className="space-y-6 border-t border-slate-100 pt-4">
                        {/* Jadwal Sesi 1 */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-cyan-600" />
                            {scheduleFrequency === '2x Seminggu' ? 'Pilih Jadwal Sesi Pertama (Sesi 1)' : 'Pilih Jadwal Latihan Mingguan'}
                          </h4>
                          {selectedScheduleDay && selectedScheduleTime && (
                            <p className="text-xs font-bold text-cyan-700">Terpilih Sesi 1: Hari {selectedScheduleDay} @ Pukul {selectedScheduleTime} WIB</p>
                          )}
                          <div className="space-y-3">
                            {selectedCoach.schedule.map((day) => (
                              <div key={day.day} className="space-y-1.5">
                                <span className="text-xs font-semibold text-slate-700">Hari {day.day}</span>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {day.timeSlots.map((slot) => {
                                    const details = getSlotDetails(selectedCoach, day.day, slot.time);
                                    const isSelected = selectedScheduleDay === day.day && selectedScheduleTime === slot.time;
                                    const isDisabled = details.isFull || (selectedScheduleDay2 === day.day && selectedScheduleTime2 === slot.time);
                                    return (
                                      <button
                                        type="button"
                                        key={slot.time}
                                        disabled={isDisabled}
                                        onClick={() => {
                                          setSelectedScheduleDay(day.day);
                                          setSelectedScheduleTime(slot.time);
                                        }}
                                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                                          isDisabled
                                            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                            : isSelected
                                            ? 'bg-cyan-50/50 border-cyan-500 ring-2 ring-cyan-500/20'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                      >
                                        <span className="text-xs font-mono font-bold">Pukul {slot.time}</span>
                                        <span className="text-[9px] mt-1 font-semibold">{details.isFull ? 'Penuh' : `Sisa ${details.remaining} Slot`}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Jadwal Sesi 2 (Hanya untuk 2x Seminggu) */}
                        {scheduleFrequency === '2x Seminggu' && (
                          <div className="space-y-4 border-t border-slate-100 pt-6">
                            <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-cyan-600" />
                              Pilih Jadwal Sesi Kedua (Sesi 2)
                            </h4>
                            {selectedScheduleDay2 && selectedScheduleTime2 && (
                              <p className="text-xs font-bold text-cyan-700">Terpilih Sesi 2: Hari {selectedScheduleDay2} @ Pukul {selectedScheduleTime2} WIB</p>
                            )}
                            <div className="space-y-3">
                              {selectedCoach.schedule.map((day) => (
                                <div key={day.day} className="space-y-1.5">
                                  <span className="text-xs font-semibold text-slate-700">Hari {day.day}</span>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {day.timeSlots.map((slot) => {
                                      const details = getSlotDetails(selectedCoach, day.day, slot.time);
                                      const isSelected = selectedScheduleDay2 === day.day && selectedScheduleTime2 === slot.time;
                                      const isDisabled = details.isFull || (selectedScheduleDay === day.day && selectedScheduleTime === slot.time);
                                      return (
                                        <button
                                          type="button"
                                          key={slot.time}
                                          disabled={isDisabled}
                                          onClick={() => {
                                            setSelectedScheduleDay2(day.day);
                                            setSelectedScheduleTime2(slot.time);
                                          }}
                                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                                            isDisabled
                                              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                              : isSelected
                                              ? 'bg-cyan-50/50 border-cyan-500 ring-2 ring-cyan-500/20'
                                              : 'bg-white border-slate-200 hover:border-slate-300'
                                          }`}
                                        >
                                          <span className="text-xs font-mono font-bold">Pukul {slot.time}</span>
                                          <span className="text-[9px] mt-1 font-semibold">{details.isFull ? 'Penuh' : `Sisa ${details.remaining} Slot`}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="border border-slate-300 text-slate-600 font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 hover:bg-slate-50"
                      >
                        <ArrowLeft className="w-4 h-4" /> Kembali
                      </button>
                      <button
                        type="button"
                        disabled={
                          !selectedScheduleDay || !selectedScheduleTime ||
                          (scheduleFrequency === '2x Seminggu' && (!selectedScheduleDay2 || !selectedScheduleTime2))
                        }
                        onClick={() => setStep(5)}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 shadow-md shadow-cyan-600/10"
                      >
                        Selanjutnya: Pembayaran <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 5: Invoice & WhatsApp Direct */}
                {step === 5 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Informasi Tagihan & Konfirmasi WhatsApp</h3>
                      <p className="text-slate-500 text-xs mt-1">Review detail tagihan. Klik tombol WhatsApp untuk mengirimkan rincian konfirmasi langsung ke Admin.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Tagihan Summary */}
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-150 space-y-4">
                        <h4 className="font-bold text-sm text-slate-800">Detail Invoice</h4>
                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Siswa / Peserta:</span>
                            <span className="font-bold text-slate-800">{studentData.fullName}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Pelatih:</span>
                            <span className="font-bold text-slate-800">{selectedCoach?.name}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Jenis Latihan:</span>
                            <span className="font-bold text-cyan-700 font-semibold">{coachType}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Paket Pilihan:</span>
                            <span className="font-bold text-slate-800">{basePackage?.name} ({basePackage?.sessions}x Sesi)</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Frekuensi:</span>
                            <span className="font-bold text-slate-800">{scheduleFrequency}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Jadwal Sesi 1:</span>
                            <span className="font-bold text-slate-800">{selectedScheduleDay} @ Pukul {selectedScheduleTime} WIB</span>
                          </div>
                          {scheduleFrequency === '2x Seminggu' && (
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                              <span className="text-slate-500">Jadwal Sesi 2:</span>
                              <span className="font-bold text-slate-800">{selectedScheduleDay2} @ Pukul {selectedScheduleTime2} WIB</span>
                            </div>
                          )}
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Kode Referral Digunakan:</span>
                            <span className="font-bold text-cyan-600 font-mono">{referralCodeUsed || '-'}</span>
                          </div>
                          <div className="flex justify-between text-sm pt-2">
                            <span className="font-bold text-slate-800">Total Tagihan:</span>
                            <span className="font-extrabold text-cyan-700">Rp {finalPrice.toLocaleString('id-ID')}</span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <label className="text-xs font-semibold text-slate-600 block">Metode Pembayaran Pilihan</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('Transfer BNI')}
                              className={`py-3 rounded-xl border text-xs font-semibold transition ${
                                paymentMethod === 'Transfer BNI'
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-500'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Transfer Bank BNI
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('Tunai di Kasir')}
                              className={`py-3 rounded-xl border text-xs font-semibold transition ${
                                paymentMethod === 'Tunai di Kasir'
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-500'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              Tunai di Kasir
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Payment Action: WhatsApp Direct Button */}
                      <div className="space-y-4 flex flex-col justify-center">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-3">
                          <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-emerald-600" /> Konfirmasi WhatsApp Manual
                          </h4>
                          <p className="text-slate-600 text-xs leading-relaxed">
                            Bukti bayar tidak perlu diunggah ke website. Anda cukup melakukan konfirmasi manual dengan klik tombol WhatsApp di bawah. Pesan berisi rincian pendaftaran dan nominal akan terisi otomatis untuk dikirim ke WhatsApp Admin Tirta Barokah.
                          </p>
                          {paymentMethod === 'Transfer BNI' && (
                            <div className="bg-white border border-emerald-100 rounded-xl p-3 text-xs text-slate-700 space-y-1">
                              <p className="font-bold text-[11px] text-slate-500 uppercase">Rekening Transfer BNI:</p>
                              <p className="font-mono text-sm font-bold text-cyan-900">123-456-7890</p>
                              <p className="font-semibold text-slate-800">a.n. Private Renang Tirta Barokah</p>
                            </div>
                          )}

                          <a
                            href={`https://wa.me/6281234567890?text=${getWhatsAppMessage()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-4 rounded-xl transition text-xs text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                          >
                            <Phone className="w-4.5 h-4.5" /> Kirim Konfirmasi ke WhatsApp Admin
                          </a>
                          <p className="text-[10px] text-emerald-700/80 text-center italic">Klik di atas untuk membuka chat WhatsApp baru berisi detail tagihan.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setStep(4)}
                        className="border border-slate-300 text-slate-600 font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 hover:bg-slate-50"
                      >
                        <ArrowLeft className="w-4 h-4" /> Kembali
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-8 py-3.5 rounded-xl transition flex items-center gap-2 shadow-lg shadow-cyan-600/20"
                      >
                        <CheckCircle className="w-5 h-5" /> Selesaikan Pendaftaran
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 6: Success Welcome Screen (Showing Member ID as Referral) */}
                {step === 6 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8 space-y-6 max-w-lg mx-auto"
                  >
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-slate-900">Selamat Bergabung!</h3>
                      <p className="text-slate-600 text-xs">
                        Pendaftaran Anda di <strong>Private Renang Tirta Barokah Palembang</strong> telah berhasil didaftarkan ke sistem kami.
                      </p>
                    </div>

                    {/* Member ID / Referral Code Display Box */}
                    <div className="bg-gradient-to-r from-cyan-600 to-indigo-600 p-6 rounded-2xl text-white space-y-2.5 shadow-md">
                      <span className="text-[10px] bg-white/20 text-white font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full">
                        KODE ID MEMBER / REFERRAL
                      </span>
                      <h4 className="text-3xl font-black font-mono tracking-widest bg-slate-950/25 py-2.5 rounded-xl">
                        {createdMemberId}
                      </h4>
                      <p className="text-[11px] text-cyan-100 max-w-xs mx-auto leading-normal">
                        Simpan Kode ID di atas! Gunakan kode ini sebagai <strong>Kode Referral</strong> untuk teman Anda agar mendapatkan bonus diskon saldo rewards latihan berikutnya.
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Nama Siswa:</span>
                        <span className="font-bold text-slate-800">{studentData.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Coach Pembimbing:</span>
                        <span className="font-bold text-slate-800">{selectedCoach?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Tipe Latihan:</span>
                        <span className="font-bold text-slate-800">{coachType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Frekuensi:</span>
                        <span className="font-bold text-slate-800">{scheduleFrequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Nominal:</span>
                        <span className="font-bold text-slate-800">Rp {finalPrice.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Status:</span>
                        <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                          Menunggu Verifikasi Admin
                        </span>
                      </div>
                    </div>

                    <div className="bg-blue-50 text-blue-800 p-3.5 rounded-lg border border-blue-100 text-[11px] leading-normal flex items-start gap-2 text-left">
                      <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Langkah Selanjutnya:</strong> Pastikan Anda telah mengirimkan rincian invoice ke WhatsApp Admin menggunakan tombol hijau di tahap sebelumnya. Admin akan memverifikasi pembayaran Anda di dashboard agar status akun Anda berubah menjadi <strong>"Aktif"</strong>.
                      </span>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={handleResetForm}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 px-4 rounded-xl transition text-sm cursor-pointer shadow-sm"
                      >
                        Daftar Siswa Baru Lainnya
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
    </div>
  );
}
