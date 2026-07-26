/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Coach, Member, ParentData, StudentData, Package, ScheduleDay, ScheduleTimeSlot, EventItem, SiteSettings, ProgramLevel } from '../types';
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
  settings: SiteSettings;
  levels: ProgramLevel[];
  onRegister: (newMember: Omit<Member, 'id' | 'registeredAt'>) => Promise<string | null>;
  onUpdateEvents: (events: EventItem[]) => void;
  view?: 'home' | 'register';
  navigateTo?: (path: string) => void;
}

export default function MainPortal({ coaches, members, events, settings = {}, levels = [], onRegister, onUpdateEvents, view = 'home', navigateTo }: MainPortalProps) {
  const currentView = view;

  // Navigation / Scroll helper
  const scrollToRegister = (pkgId?: string) => {
    if (pkgId) {
      setSelectedPricingPackageId(pkgId);
    }
    if (navigateTo) {
      navigateTo('/daftar');
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
  const [selectedPricingPackageId, setSelectedPricingPackageId] = useState<string>('');
  
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

  // Load pricing packages list
  let packagesList: PricingPackage[] = [];
  if (settings.pricing_packages) {
    try {
      packagesList = JSON.parse(settings.pricing_packages);
    } catch (e) {}
  }
  if (!Array.isArray(packagesList) || packagesList.length === 0) {
    packagesList = [
      {
        id: 'pkg-promo',
        category: 'PROMO',
        name: 'Paket Reguler PROMO 5x latihan',
        price: 220000,
        sessions: 5,
        active_period: '1 Bulan',
        description: '1 pelatih mengajar 1-6 anak. Masa aktif 1 bulan, jika tidak habis maka hangus.'
      },
      {
        id: 'pkg-reguler',
        category: 'REGULER',
        name: 'Paket Reguler 5x latihan',
        price: 250000,
        sessions: 5,
        active_period: '3 Bulan',
        description: '1 pelatih mengajar 1-6 anak. Masa aktif 3 bulan, jika tidak habis maka hangus.'
      },
      {
        id: 'pkg-private-2',
        category: 'PRIVATE',
        name: 'Paket Private 2 anak',
        price: 1300000,
        sessions: 8,
        active_period: '2 Bulan',
        description: '1 pelatih KHUSUS mengajar 2 anak.'
      },
      {
        id: 'pkg-private-3',
        category: 'PRIVATE',
        name: 'Paket Private 3 anak',
        price: 1500000,
        sessions: 8,
        active_period: '2 Bulan',
        description: '1 pelatih KHUSUS mengajar 3 anak.'
      }
    ];
  }

  const selectedPricingPackage = packagesList.find(p => p.id === selectedPricingPackageId) || packagesList[0];

  const selectedCoach = coaches.find(c => c.id === selectedCoachId);
  const basePackage = selectedCoach?.packages.find(p => p.id === selectedPackageId);

  // Adjust price for Privat coach type
  const getPackagePrice = (pkg: Package | undefined) => {
    if (!pkg) return 0;
    // If explicit private package, do not add the 100k premium
    const isExplicitPrivatePkg = pkg.name.toLowerCase().includes('privat') || pkg.name.toLowerCase().includes('private');
    if (isExplicitPrivatePkg) {
      return pkg.price;
    }
    // Private premium: extra Rp 100.000 for exclusive 1-on-1 lane
    return coachType === 'Privat' ? pkg.price + 100000 : pkg.price;
  };

  const finalPrice = getPackagePrice(basePackage);

  const getDisplayPackages = () => {
    if (!selectedCoach) return [];
    return selectedCoach.packages || [];
  };

  // Auto-select coach package matching selected global package
  useEffect(() => {
    if (selectedCoach && selectedPricingPackage) {
      const matchedPkg = selectedCoach.packages.find(cp => cp.name.toLowerCase().trim() === selectedPricingPackage.name.toLowerCase().trim())
        || selectedCoach.packages.find(cp => cp.price === selectedPricingPackage.price)
        || selectedCoach.packages[0];

      if (matchedPkg) {
        setSelectedPackageId(matchedPkg.id);
        const isPriv = matchedPkg.name.toLowerCase().includes('privat') || matchedPkg.name.toLowerCase().includes('private') || selectedPricingPackage.category === 'PRIVATE';
        setCoachType(isPriv ? 'Privat' : 'Reguler');
      }
    } else {
      setSelectedPackageId('');
    }
  }, [selectedCoachId, selectedPricingPackageId]);

  // Submit registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoach || !basePackage || !selectedScheduleDay || !selectedScheduleTime) return;

    const schedules = [
      { coachId: selectedCoachId, day: selectedScheduleDay, time: selectedScheduleTime }
    ];
    if (scheduleFrequency === '2x Seminggu' && selectedScheduleDay2 && selectedScheduleTime2) {
      schedules.push({ coachId: selectedCoachId, day: selectedScheduleDay2, time: selectedScheduleTime2 });
    }

    try {
      const generatedId = await onRegister({
        parent: parentData,
        student: studentData,
        coachId: selectedCoachId,
        packageId: selectedPackageId,
        scheduleFrequency,
        scheduleDay: selectedScheduleDay,
        scheduleTime: selectedScheduleTime,
        scheduleDay2: scheduleFrequency === '2x Seminggu' ? selectedScheduleDay2 : undefined,
        scheduleTime2: scheduleFrequency === '2x Seminggu' ? selectedScheduleTime2 : undefined,
        schedules,
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

      if (generatedId) {
        setCreatedMemberId(generatedId);
      } else {
        setCreatedMemberId(`TB-${Math.floor(100000 + Math.random() * 900000)}`);
      }
      setStep(6);
    } catch (err) {
      console.error("Gagal melakukan pendaftaran:", err);
    }
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
    setCurrentView('home');
  };

  // Helper: check schedule slot availability
  const canNavigateToStep = (targetStep: number) => {
    if (targetStep === 1) return true;
    if (targetStep === 2) {
      // Step 2: Paket Latihan (needs parent and student data filled)
      return Boolean(parentData.fatherMotherName.trim() && parentData.whatsapp.trim() && studentData.fullName.trim() && studentData.dob);
    }
    if (targetStep === 3) {
      // Step 3: Pilih Pelatih (needs global package selected)
      return canNavigateToStep(2) && Boolean(selectedPricingPackageId);
    }
    if (targetStep === 4) {
      // Step 4: Jadwal (needs coach selected)
      return canNavigateToStep(3) && Boolean(selectedCoachId);
    }
    if (targetStep === 5) {
      // Step 5: Konfirmasi (needs schedule selected)
      const isSched1Valid = Boolean(selectedScheduleDay && selectedScheduleTime);
      const isSched2Valid = scheduleFrequency === '1x Seminggu' || Boolean(selectedScheduleDay2 && selectedScheduleTime2);
      return canNavigateToStep(4) && isSched1Valid && isSched2Valid;
    }
    return false;
  };

  const getSlotDetails = (coach: Coach, dayName: string, timeStr: string) => {
    const day = coach.schedule.find(d => d.day === dayName);
    const slot = day?.timeSlots.find(ts => ts.time === timeStr);
    
    // Check standard members state for live changes
    const currentMembersInThisSlot = members.filter(m => {
      if (m.status === 'Selesai') return false;
      const mSchedules = m.schedules && m.schedules.length > 0
        ? m.schedules
        : [{ coachId: m.coachId, day: m.scheduleDay, time: m.scheduleTime }];
      return mSchedules.some(s => s.coachId === coach.id && s.day === dayName && s.time === timeStr);
    });

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
    const activeStudents = members.length > 0 
      ? members.filter(m => {
          if (m.status === 'Selesai') return false;
          const mSchedules = m.schedules && m.schedules.length > 0
            ? m.schedules
            : [{ coachId: m.coachId, day: m.scheduleDay, time: m.scheduleTime }];
          return mSchedules.some(s => s.coachId === coach.id);
        }).length 
      : (coach.currentQuota || 0);
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
    if (!selectedCoach || !selectedPricingPackage) return '';
    const loc1 = selectedScheduleDay === 'Selasa' ? 'Kolam GHL' : 'Grand Garden';
    const loc2 = selectedScheduleDay2 === 'Selasa' ? 'Kolam GHL' : 'Grand Garden';
    const scheduleStr = scheduleFrequency === '2x Seminggu' 
      ? `1) Hari ${selectedScheduleDay} (${loc1}) @ ${selectedScheduleTime} WIB dan 2) Hari ${selectedScheduleDay2} (${loc2}) @ ${selectedScheduleTime2} WIB`
      : `Hari ${selectedScheduleDay} (${loc1}) @ ${selectedScheduleTime} WIB`;

    const text = `Halo Admin Tirta Barokah,\nSaya ingin mengonfirmasi pembayaran pendaftaran siswa baru:\n\n` +
      `• Nama Wali: ${parentData.fatherMotherName}\n` +
      `• No. WhatsApp: ${parentData.whatsapp}\n` +
      `• Nama Anak: ${studentData.fullName}\n` +
      `• Coach: ${selectedCoach.name}\n` +
      `• Paket: ${selectedPricingPackage.name}\n` +
      `• Frekuensi: ${scheduleFrequency}\n` +
      `• Jadwal Kelas: ${scheduleStr}\n` +
      `• Total Tagihan: Rp ${finalPrice.toLocaleString('id-ID')}\n` +
      `• Metode Bayar: ${paymentMethod}\n\n` +
      `Mohon segera diverifikasi datanya. Terima kasih!`;
    return encodeURIComponent(text);
  };

  // Filter events (Sorted by newest date first)
  const filteredEvents = events
    .filter(e => eventCategoryFilter === 'Semua' ? true : e.category === eventCategoryFilter)
    .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());

  return (
    <>
      {currentView === 'home' ? (
        <div className="space-y-12">
          {/* Grid Container for Hero and Profile side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        {/* Hero Section */}
        <section className="lg:col-span-3 relative bg-gradient-to-br from-cyan-900 via-blue-950 to-indigo-950 rounded-3xl overflow-hidden shadow-xl p-6 md:p-8 text-white flex flex-col justify-center">
          <div className="absolute inset-0 bg-[url('/images/hero_pool.png')] opacity-10 bg-cover bg-center pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              🏊‍♂️ Premium Private Swimming Academy
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
              Private Renang <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Tirta Barokah</span> Palembang
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Melatih anak dan dewasa belajar berenang dengan metode personal yang aman, profesional, dan menyenangkan. Pelatih bersertifikat langsung membimbing hingga mahir di kolam renang terpilih Palembang.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={scrollToRegister}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                Daftar Jadi Member <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#program-info"
                className="bg-slate-800/80 hover:bg-slate-800 text-white font-medium border border-slate-700/80 px-5 py-2.5 rounded-xl text-xs transition flex items-center justify-center"
              >
                Informasi Program
              </a>
            </div>
          </div>
        </section>

        {/* Profil Section */}
        <section className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-md flex flex-col justify-center space-y-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              ✨ Profil Lembaga
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">
              {settings.profile_heading || 'Profil Private Renang Tirta Barokah Palembang'}
            </h2>
            <div className="space-y-2 text-slate-600 text-xs md:text-sm leading-relaxed">
              <p>
                {settings.profile_text_1 || 'Private Renang Tirta Barokah Palembang adalah tempat latihan renang yang telah dipercaya masyarakat Palembang sejak tahun 2012.'}
              </p>
              <p>
                {settings.profile_text_2 || 'Metode latihan dirancang secara bertahap, sistematis, dan disesuaikan dengan usia, kemampuan, serta tujuan belajar masing-masing peserta.'}
              </p>
              <p>
                {settings.profile_text_3 || 'Didukung oleh tim pelatih berlisensi kepelatihan, memberikan pendampingan personal agar mendapat perhatian optimal.'}
              </p>
            </div>
          </div>
        </section>
      </div>

          {/* Mengapa Memilih Section */}
          <section className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl md:text-3xl font-black text-slate-800">
                {settings.why_choose_heading || 'Mengapa Memilih Private Renang Tirta Barokah Palembang?'}
              </h2>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { title: settings.why_choose_1_title || 'Berpengalaman Sejak 2012', desc: settings.why_choose_1_desc || 'Lebih dari satu dekade melayani renang private.' },
                { title: settings.why_choose_2_title || 'Pelatih Profesional', desc: settings.why_choose_2_desc || 'Berlisensi resmi, berpengalaman, dan komunikatif.' },
                { title: settings.why_choose_3_title || 'Pendekatan Personal', desc: settings.why_choose_3_desc || 'Setiap peserta memperoleh perhatian lebih intensif.' },
                { title: settings.why_choose_4_title || 'Aman & Menyenangkan', desc: settings.why_choose_4_desc || 'Membangun rasa percaya diri dengan pendekatan sabar.' }
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-2 hover:border-cyan-200 transition">
                  <h4 className="font-bold text-sm text-slate-800">{item.title}</h4>
                  <p className="text-slate-500 text-[11px] leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Kurikulum / Tingkatan Level Program Section */}
          <section id="program-info" className="space-y-8">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-cyan-50 text-cyan-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                🎓 Jenjang Latihan
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800">Kurikulum & Informasi Program</h2>
              <p className="text-slate-500 text-xs md:text-sm">Bimbingan belajar bertahap dari kemampuan nol (Level 1) hingga mandiri & pengembangan keterampilan (Level 9).</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {levels.map((lvl) => (
                <div key={lvl.id || lvl.level_number} className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-2.5 hover:border-cyan-200 hover:shadow-md transition flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">
                        LEVEL {lvl.level_number}
                      </span>
                    </div>
                    <h4 className="font-black text-slate-800 text-sm">{lvl.name}</h4>
                    
                    <div className="space-y-1.5 text-[11px] text-slate-600">
                      <div>
                        <strong className="text-slate-700 block">🎯 Target Pembelajaran:</strong>
                        <span>{lvl.target_learning}</span>
                      </div>
                      <div>
                        <strong className="text-slate-700 block">📚 Materi:</strong>
                        <span className="italic">{lvl.materials}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-100">
                    <strong className="text-[10px] text-emerald-700 uppercase tracking-wider block font-bold">🏁 Target Kelulusan:</strong>
                    <p className="text-xs text-slate-700 font-medium mt-0.5">{lvl.graduation_target}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Paket & Biaya Latihan Section */}
          <section id="pricing-section" className="space-y-8 bg-slate-50/50 rounded-3xl p-6 md:p-8 border border-slate-100">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                💰 Paket Pilihan & Biaya
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800">Paket & Biaya Latihan</h2>
              <p className="text-slate-500 text-xs md:text-sm">
                Investasi terbaik untuk masa depan buah hati Anda dengan belajar renang bersama kami.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(() => {
                let packagesList = [];
                if (settings.pricing_packages) {
                  try {
                    packagesList = JSON.parse(settings.pricing_packages);
                  } catch (e) {}
                }
                if (!Array.isArray(packagesList) || packagesList.length === 0) {
                  // Fallback defaults
                  packagesList = [
                    {
                      category: 'PROMO',
                      name: 'Paket Reguler PROMO 5x latihan',
                      price: 220000,
                      sessions: 5,
                      active_period: '1 Bulan',
                      description: '1 pelatih mengajar 1-6 anak. Masa aktif 1 bulan, jika tidak habis maka hangus.'
                    },
                    {
                      category: 'REGULER',
                      name: 'Paket Reguler 5x latihan',
                      price: 250000,
                      sessions: 5,
                      active_period: '3 Bulan',
                      description: '1 pelatih mengajar 1-6 anak. Masa aktif 3 bulan, jika tidak habis maka hangus.'
                    },
                    {
                      category: 'PRIVATE',
                      name: 'Paket Private 2 anak',
                      price: 1300000,
                      sessions: 8,
                      active_period: '2 Bulan',
                      description: '1 pelatih KHUSUS mengajar 2 anak.'
                    },
                    {
                      category: 'PRIVATE',
                      name: 'Paket Private 3 anak',
                      price: 1500000,
                      sessions: 8,
                      active_period: '2 Bulan',
                      description: '1 pelatih KHUSUS mengajar 3 anak.'
                    }
                  ];
                }

                return packagesList.map((pkg: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 flex flex-col justify-between hover:border-cyan-300 hover:shadow-md transition">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded ${
                          pkg.category === 'PROMO' ? 'bg-rose-100 text-rose-800' :
                          pkg.category === 'PRIVATE' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-cyan-100 text-cyan-800'
                        }`}>
                          {pkg.category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{pkg.active_period}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{pkg.name}</h4>
                      
                      <div className="space-y-1">
                        <p className="text-[10px] text-slate-400 font-semibold block uppercase">BIAYA LATIHAN</p>
                        <p className="text-xl font-black text-slate-900 leading-none">Rp {pkg.price.toLocaleString('id-ID')}</p>
                      </div>

                      <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-3 leading-relaxed">
                        <p>• <strong>{pkg.sessions}x</strong> Pertemuan Latihan</p>
                        {pkg.description && <p>• {pkg.description}</p>}
                      </div>
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={() => scrollToRegister(pkg.id)}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-4 rounded-xl transition text-xs shadow-sm cursor-pointer border-0"
                      >
                        Pilih Paket
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="bg-cyan-50/50 border border-cyan-100 p-4 rounded-2xl text-[11px] text-cyan-800 flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold">Informasi Tambahan Penting:</p>
                <p>• Biaya di atas hanya untuk <strong>biaya pelatihan saja</strong>, belum termasuk tiket masuk kolam renang peserta.</p>
                <p>• Untuk paket reguler, 1 pelatih dapat mengajar kelompok berisi 1-6 anak secara fleksibel.</p>
                <p>• Untuk paket private, pelatih bersifat eksklusif (khusus) mengajar jumlah anak sesuai paket pilihan Anda.</p>
              </div>
            </div>
          </section>

          {/* Coaches Showcase Section */}
          <section id="coaches-section" className="space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">Daftar Pelatih Profesional Kami</h2>
              <p className="text-slate-500 text-sm">
                Setiap pelatih memiliki batas kuota maksimal 6 siswa aktif demi efektivitas pengajaran.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {coaches.filter(c => c.isActive !== false).map((coach) => {
                const quota = getCoachOverallQuota(coach);
                return (
                  <div 
                    key={coach.id} 
                    className={`bg-white rounded-2xl border transition overflow-hidden shadow-sm flex flex-col sm:flex-row ${
                      quota.isFull ? 'border-slate-200 opacity-80' : 'border-slate-100 hover:border-cyan-300'
                    }`}
                  >
                    <div className="relative w-full sm:w-2/5 min-h-[200px] sm:min-h-full bg-slate-100 flex-shrink-0">
                      <img 
                        src={coach.photo} 
                        alt={coach.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {quota.isFull && (
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold shadow-md bg-rose-100 text-rose-800 border border-rose-200">
                            Kuota Penuh
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="font-bold text-base md:text-lg text-slate-900">{coach.name}</h3>
                        <p className="text-slate-500 text-xs flex items-start gap-1">
                          <Award className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                          <span>{coach.experience}</span>
                        </p>
                        {/* Referral jangan ditampilkan tapi jangan dihapus
                        <p className="text-slate-400 text-[10px] font-semibold font-mono bg-slate-50 px-2 py-1 rounded w-max">
                          Referral Code: {coach.referralCode}
                        </p>
                        */}
                      </div>
                      
                      {quota.isFull && (
                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-rose-600 text-[10px] font-semibold text-center italic">Tidak menerima siswa baru sementara waktu (Kuota Penuh)</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Event & Berita Kegiatan Section */}
          <section id="events-section" className="space-y-8 bg-slate-50/50 border border-slate-100 p-8 rounded-3xl">
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
              <div className="grid md:grid-cols-3 gap-6">
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
        </div>
      ) : (
        /* New Page/View for Registration Form */
        <div className="max-w-4xl mx-auto space-y-6">
          <button
            onClick={() => { setCurrentView('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-xs mb-2 transition cursor-pointer border-0 bg-transparent"
          >
            ← Kembali ke Beranda
          </button>

          {/* Registration Funnel Section */}
          <section id="registration-section" className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-600 to-indigo-600 p-6 md:p-8 text-white">
              <h2 className="text-2xl font-extrabold">Formulir Pendaftaran Member Baru</h2>
              <p className="text-cyan-100 text-sm mt-1">Lengkapi data pendaftaran, pilih jenis latihan, paket, serta pilih jadwal rutin mingguan.</p>
              
              {/* Step Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 mt-6 border-t border-white/20 pt-4">
                {[
                  { stepNum: 1, label: 'Data Peserta' },
                  { stepNum: 2, label: 'Paket Latihan' },
                  { stepNum: 3, label: 'Pilih Pelatih' },
                  { stepNum: 4, label: 'Jadwal' },
                  { stepNum: 5, label: 'Konfirmasi' }
                ].map(({ stepNum, label }, idx, arr) => {
                  const isNavigable = canNavigateToStep(stepNum);
                  const isCurrent = step === stepNum;
                  const isPassed = step > stepNum;
                  return (
                    <React.Fragment key={stepNum}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isNavigable) setStep(stepNum);
                        }}
                        disabled={!isNavigable}
                        title={isNavigable ? `Klik untuk berpindah ke Tahap ${stepNum}: ${label}` : `Lengkapi tahap sebelumnya dahulu`}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-white text-cyan-800 scale-105 shadow-md ring-2 ring-white/50'
                            : isPassed
                            ? 'bg-cyan-500/40 text-white hover:bg-cyan-500/70 cursor-pointer'
                            : isNavigable
                            ? 'bg-white/20 text-white hover:bg-white/30 cursor-pointer'
                            : 'bg-white/10 text-cyan-200/50 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                          isCurrent ? 'bg-cyan-600 text-white' : isPassed ? 'bg-white text-cyan-800' : 'bg-cyan-800/60 text-cyan-100'
                        }`}>
                          {isPassed ? '✓' : stepNum}
                        </span>
                        <span className="hidden sm:inline text-[11px] font-semibold">{label}</span>
                      </button>
                      {idx < arr.length - 1 && (
                        <div className={`h-0.5 flex-1 transition hidden md:block ${step > stepNum ? 'bg-cyan-300' : 'bg-cyan-700/60'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
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
                            onChange={(e) => setParentData({ ...parentData, whatsapp: e.target.value.replace(/[^0-9]/g, '') })}
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
                        {/* 
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-xs font-semibold text-slate-600 block flex items-center gap-1">
                            <Gift className="w-3.5 h-3.5 text-cyan-600" /> Kode Referral Pelatih / Teman (Opsional)
                          </label>
                          <input
                            type="text"
                            placeholder="Masukkan kode referral pelatih atau teman Anda jika ada (Contoh: COACH-ARDI)"
                            value={referralCodeUsed}
                            onChange={(e) => setReferralCodeUsed(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-sm text-slate-800 uppercase font-mono"
                          />
                          <p className="text-[10px] text-slate-400">Masukkan kode referral jika ada: Pelatih pendamping berhak mendapat Rp 50.000, atau Teman sesama member mendapat Rp 25.000.</p>
                        </div>
                        */}
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
                        
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (!parentData.fatherMotherName.trim()) {
                            Swal.fire({
                              title: 'Data Belum Lengkap',
                              text: 'Nama orang tua (Ayah/Ibu) wajib diisi.',
                              icon: 'warning',
                              confirmButtonText: 'Lengkapi Data',
                              confirmButtonColor: '#0891b2'
                            });
                            return;
                          }
                          if (!parentData.whatsapp.trim()) {
                            Swal.fire({
                              title: 'Data Belum Lengkap',
                              text: 'Nomor WhatsApp aktif wajib diisi.',
                              icon: 'warning',
                              confirmButtonText: 'Lengkapi Data',
                              confirmButtonColor: '#0891b2'
                            });
                            return;
                          }
                          const cleanWa = parentData.whatsapp.trim().replace(/[+\-\s()]/g, '');
                          if (!/^\d{9,15}$/.test(cleanWa)) {
                            Swal.fire({
                              title: 'Format WhatsApp Salah',
                              text: 'Nomor WhatsApp harus berupa angka dengan panjang 9-15 digit.',
                              icon: 'warning',
                              confirmButtonText: 'Perbaiki',
                              confirmButtonColor: '#0891b2'
                            });
                            return;
                          }
                          if (!studentData.fullName.trim()) {
                            Swal.fire({
                              title: 'Data Belum Lengkap',
                              text: 'Nama lengkap calon siswa wajib diisi.',
                              icon: 'warning',
                              confirmButtonText: 'Lengkapi Data',
                              confirmButtonColor: '#0891b2'
                            });
                            return;
                          }
                          if (!studentData.dob) {
                            Swal.fire({
                              title: 'Data Belum Lengkap',
                              text: 'Tanggal lahir calon siswa wajib diisi.',
                              icon: 'warning',
                              confirmButtonText: 'Lengkapi Data',
                              confirmButtonColor: '#0891b2'
                            });
                            return;
                          }
                          setStep(2);
                        }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2.5 text-xs md:px-6 md:py-3 md:text-sm rounded-xl transition flex items-center gap-2 shadow-md shadow-cyan-600/10 cursor-pointer"
                      >
                        Selanjutnya: Pilih Paket Latihan <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Pilih Paket Latihan */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Pilih Paket Latihan</h3>
                      <p className="text-slate-500 text-xs mt-1">Silakan pilih paket latihan yang Anda inginkan. Paket di bawah adalah biaya latihan saja.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="grid md:grid-cols-4 gap-4">
                        {packagesList.map((pkg) => {
                          const isSelected = selectedPricingPackageId === pkg.id;
                          return (
                            <button
                              type="button"
                              key={pkg.id}
                              onClick={() => {
                                setSelectedPricingPackageId(pkg.id);
                                // reset downstream selections
                                setSelectedCoachId('');
                                setSelectedPackageId('');
                                setSelectedScheduleDay('');
                                setSelectedScheduleTime('');
                                setSelectedScheduleDay2('');
                                setSelectedScheduleTime2('');
                              }}
                              className={`w-full text-left rounded-xl border p-5 transition flex flex-col justify-between h-48 cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-50/50 border-cyan-500 shadow-md ring-2 ring-cyan-500/20'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-1.5">
                                <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${
                                  pkg.category === 'PROMO' ? 'bg-rose-100 text-rose-700' :
                                  pkg.category === 'PRIVATE' ? 'bg-indigo-100 text-indigo-700' :
                                  'bg-cyan-100 text-cyan-700'
                                }`}>
                                  {pkg.category}
                                </span>
                                <h4 className="font-bold text-sm text-slate-800 mt-1 leading-snug">{pkg.name}</h4>
                              </div>
                              <div>
                                <p className="text-lg font-extrabold text-slate-900">
                                  Rp {pkg.price.toLocaleString('id-ID')}
                                </p>
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{pkg.sessions}x Pertemuan (Masa Aktif: {pkg.active_period})</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="border border-slate-300 text-slate-600 font-bold px-4 py-2.5 text-xs md:px-6 md:py-3 md:text-sm rounded-xl transition flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /> Kembali
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedPricingPackageId) {
                            Swal.fire({
                              title: 'Pilih Paket',
                              text: 'Silakan pilih salah satu paket latihan terlebih dahulu.',
                              icon: 'warning',
                              confirmButtonText: 'Pilih Paket',
                              confirmButtonColor: '#0891b2'
                            });
                            return;
                          }
                          setStep(3);
                        }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2.5 text-xs md:px-6 md:py-3 md:text-sm rounded-xl transition flex items-center gap-2 shadow-md shadow-cyan-600/10 cursor-pointer"
                      >
                        Selanjutnya: Pilih Pelatih <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Pilih Pelatih */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Pilih Pelatih / Coach Pembimbing</h3>
                      <p className="text-slate-500 text-xs mt-1">
                        Berikut adalah pelatih yang melayani paket <strong>{selectedPricingPackage?.name}</strong> (Rp {selectedPricingPackage?.price.toLocaleString('id-ID')}).
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="grid md:grid-cols-3 gap-4">
                        {(() => {
                          const matchingCoaches = coaches.filter(c => {
                            if (c.isActive === false) return false;
                            if (selectedPricingPackage?.coachIds && selectedPricingPackage.coachIds.length > 0) {
                              return selectedPricingPackage.coachIds.includes(c.id);
                            }
                            return (c.packages || []).some(cp => cp.price === selectedPricingPackage?.price);
                          });

                          if (matchingCoaches.length === 0) {
                            return (
                              <div className="col-span-3 text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                                Maaf, saat ini tidak ada pelatih yang tersedia untuk paket harga yang dipilih.
                              </div>
                            );
                          }

                          return matchingCoaches.map((coach) => {
                            const status = getCoachOverallQuota(coach);
                            const isSelected = selectedCoachId === coach.id;
                            return (
                              <button
                                type="button"
                                key={coach.id}
                                disabled={status.isFull}
                                onClick={() => {
                                  setSelectedCoachId(coach.id);
                                  setSelectedScheduleDay('');
                                  setSelectedScheduleTime('');
                                  setSelectedScheduleDay2('');
                                  setSelectedScheduleTime2('');
                                }}
                                className={`w-full text-left rounded-xl border p-4 transition flex items-start gap-3 relative cursor-pointer ${
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
                          });
                        })()}
                      </div>
                    </div>

                    {selectedCoach && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-cyan-50/30 rounded-xl border border-cyan-100 p-5 space-y-3"
                      >
                        <h4 className="font-bold text-sm text-cyan-900">Pelatih Terpilih: {selectedCoach.name}</h4>
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
                        onClick={() => setStep(2)}
                        className="border border-slate-300 text-slate-600 font-bold px-4 py-2.5 text-xs md:px-6 md:py-3 md:text-sm rounded-xl transition flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /> Kembali
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedCoachId) {
                            Swal.fire({
                              title: 'Pilih Pelatih',
                              text: 'Silakan pilih salah satu pelatih terlebih dahulu.',
                              icon: 'warning',
                              confirmButtonText: 'Pilih Pelatih',
                              confirmButtonColor: '#0891b2'
                            });
                            return;
                          }
                          setStep(4);
                        }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2.5 text-xs md:px-6 md:py-3 md:text-sm rounded-xl transition flex items-center gap-2 shadow-md shadow-cyan-600/10 cursor-pointer"
                      >
                        Selanjutnya: Atur Jadwal <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
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
                      <p className="text-slate-500 text-xs mt-1">Pilih frekuensi (1x atau 2x seminggu) serta tentukan hari dan jam yang Anda inginkan.</p>
                    </div>

                    {/* Step-by-step Helper Banner */}
                    <div className="bg-cyan-50/70 border border-cyan-200/80 rounded-2xl p-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center flex-shrink-0 font-black text-sm shadow-sm">
                        💡
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-xs text-slate-800">Petunjuk Pengisian Jadwal:</h4>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          1. Tentukan berapa kali anak berlatih dalam seminggu di bawah ini.<br />
                          2. Pilih <strong>Hari</strong> dan <strong>Jam</strong> yang masih tersedia (berwarna putih/cyan). Slot penuh berlabel merah tidak dapat dipilih.
                        </p>
                      </div>
                    </div>

                    {/* Langkah A: Frekuensi Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 block flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] flex items-center justify-center font-extrabold">A</span>
                        Berapa Kali Anak Berlatih dalam 1 Minggu?
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleFrequency('1x Seminggu');
                            setSelectedScheduleDay2('');
                            setSelectedScheduleTime2('');
                          }}
                          className={`p-4 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                            scheduleFrequency === '1x Seminggu'
                              ? 'bg-cyan-50/70 border-cyan-500 ring-2 ring-cyan-500/20'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <span className="text-sm font-black text-slate-800 block">1x Seminggu</span>
                            <span className="text-[10px] text-slate-500 font-medium">Contoh: Hanya berlatih hari Sabtu</span>
                          </div>
                          {scheduleFrequency === '1x Seminggu' && (
                            <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold">✓</span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleFrequency('2x Seminggu');
                          }}
                          className={`p-4 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                            scheduleFrequency === '2x Seminggu'
                              ? 'bg-cyan-50/70 border-cyan-500 ring-2 ring-cyan-500/20'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <span className="text-sm font-black text-slate-800 block">2x Seminggu</span>
                            <span className="text-[10px] text-slate-500 font-medium">Contoh: Berlatih hari Rabu & Sabtu</span>
                          </div>
                          {scheduleFrequency === '2x Seminggu' && (
                            <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-bold">✓</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Langkah B: Selection Slots */}
                    {selectedCoach && (
                      <div className="space-y-6 pt-2">
                        {/* SESI PERTAMA */}
                        <div className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-5 space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                            <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] flex items-center justify-center font-extrabold">B</span>
                              {scheduleFrequency === '2x Seminggu' ? 'Pilih Hari & Jam untuk Sesi PERTAMA (Sesi 1):' : 'Pilih Hari & Jam Latihan Rutin Mingguan:'}
                            </label>
                            {selectedScheduleDay && selectedScheduleTime && (
                              <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                                ✓ Terpilih: {selectedScheduleDay} ({selectedScheduleDay === 'Selasa' ? 'Kolam GHL' : 'Grand Garden'}) @ {selectedScheduleTime} WIB
                              </span>
                            )}
                          </div>

                          <div className="space-y-3">
                            {selectedCoach.schedule.map((day) => (
                              <div key={day.day} className="bg-white rounded-xl border border-slate-100 p-3 space-y-2">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                                  <span className="text-xs font-extrabold text-cyan-800 uppercase tracking-wider">
                                    📅 Hari {day.day}
                                  </span>
                                  <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-150">
                                    📍 {day.day === 'Selasa' ? 'Kolam GHL' : 'Grand Garden'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
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
                                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                                          isDisabled
                                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                            : isSelected
                                            ? 'bg-cyan-600 border-cyan-600 text-white shadow-md ring-2 ring-cyan-500/30 font-bold'
                                            : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-400 hover:bg-cyan-50/20'
                                        }`}
                                      >
                                        <div className="flex justify-between items-center w-full">
                                          <span className="text-xs font-mono font-extrabold">{slot.time} WIB</span>
                                          {isSelected && <span className="text-xs">✓</span>}
                                        </div>
                                        <span className={`text-[9px] mt-1.5 font-bold ${
                                          isSelected ? 'text-cyan-100' : details.isFull ? 'text-rose-600' : 'text-slate-500'
                                        }`}>
                                          {details.isFull ? '🚫 Penuh' : `Tersisa ${details.remaining} Slot`}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* SESI KEDUA (Hanya untuk 2x Seminggu) */}
                        {scheduleFrequency === '2x Seminggu' && (
                          <div className="bg-slate-50/60 rounded-2xl border border-slate-200/80 p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                              <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-extrabold">C</span>
                                Pilih Hari & Jam untuk Sesi KEDUA (Sesi 2):
                              </label>
                              {selectedScheduleDay2 && selectedScheduleTime2 && (
                                <span className="bg-indigo-100 border border-indigo-300 text-indigo-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1">
                                  ✓ Terpilih: {selectedScheduleDay2} ({selectedScheduleDay2 === 'Selasa' ? 'Kolam GHL' : 'Grand Garden'}) @ {selectedScheduleTime2} WIB
                                </span>
                              )}
                            </div>

                            <div className="space-y-3">
                              {selectedCoach.schedule.map((day) => (
                                <div key={day.day} className="bg-white rounded-xl border border-slate-100 p-3 space-y-2">
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                                    <span className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider">
                                      📅 Hari {day.day}
                                    </span>
                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-150">
                                      📍 {day.day === 'Selasa' ? 'Kolam GHL' : 'Grand Garden'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                    {day.timeSlots.map((slot) => {
                                      const details = getSlotDetails(selectedCoach, day.day, slot.time);
                                      const isSelected = selectedScheduleDay2 === day.day && selectedScheduleTime2 === slot.time;
                                      const isSameAsSesi1 = selectedScheduleDay === day.day && selectedScheduleTime === slot.time;
                                      const isDisabled = details.isFull || isSameAsSesi1;
                                      return (
                                        <button
                                          type="button"
                                          key={slot.time}
                                          disabled={isDisabled}
                                          onClick={() => {
                                            setSelectedScheduleDay2(day.day);
                                            setSelectedScheduleTime2(slot.time);
                                          }}
                                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                                            isDisabled
                                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                              : isSelected
                                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-2 ring-indigo-500/30 font-bold'
                                              : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/20'
                                          }`}
                                        >
                                          <div className="flex justify-between items-center w-full">
                                            <span className="text-xs font-mono font-extrabold">{slot.time} WIB</span>
                                            {isSelected && <span className="text-xs">✓</span>}
                                          </div>
                                          <span className={`text-[9px] mt-1.5 font-bold ${
                                            isSelected ? 'text-indigo-100' : isSameAsSesi1 ? 'text-amber-600 font-semibold' : details.isFull ? 'text-rose-600' : 'text-slate-500'
                                          }`}>
                                            {isSameAsSesi1 ? '⚠️ Dipilih di Sesi 1' : details.isFull ? '🚫 Penuh' : `Tersisa ${details.remaining} Slot`}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Summary Box */}
                        {selectedScheduleDay && selectedScheduleTime && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                              ✓ Ringkasan Jadwal Terpilih
                            </span>
                            <div className="pt-1 text-xs font-bold text-slate-800 space-y-1">
                              <p className="text-emerald-900">
                                📌 Sesi 1: <span className="underline">Hari {selectedScheduleDay}</span> (📍 {selectedScheduleDay === 'Selasa' ? 'Kolam GHL' : 'Grand Garden'}) Pukul <span className="font-mono">{selectedScheduleTime} WIB</span>
                              </p>
                              {scheduleFrequency === '2x Seminggu' && selectedScheduleDay2 && selectedScheduleTime2 && (
                                <p className="text-indigo-900">
                                  📌 Sesi 2: <span className="underline">Hari {selectedScheduleDay2}</span> (📍 {selectedScheduleDay2 === 'Selasa' ? 'Kolam GHL' : 'Grand Garden'}) Pukul <span className="font-mono">{selectedScheduleTime2} WIB</span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={() => setStep(3)}
                        className="border border-slate-300 text-slate-600 font-bold px-4 py-2.5 text-xs md:px-6 md:py-3 md:text-sm rounded-xl transition flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /> Kembali
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedScheduleDay || !selectedScheduleTime) {
                            Swal.fire({
                              title: 'Jadwal Belum Lengkap',
                              text: 'Silakan pilih hari dan jam untuk Jadwal Utama (Jadwal 1) Anda.',
                              icon: 'warning',
                              confirmButtonText: 'Pilih Jadwal',
                              confirmButtonColor: '#0891b2'
                            });
                            return;
                          }
                          if (scheduleFrequency === '2x Seminggu') {
                            if (!selectedScheduleDay2 || !selectedScheduleTime2) {
                              Swal.fire({
                                title: 'Jadwal Kedua Belum Lengkap',
                                text: 'Paket yang Anda pilih adalah 2x Seminggu. Silakan pilih hari dan jam untuk Jadwal Kedua Anda.',
                                icon: 'warning',
                                confirmButtonText: 'Pilih Jadwal 2',
                                confirmButtonColor: '#0891b2'
                              });
                              return;
                            }
                            if (selectedScheduleDay === selectedScheduleDay2 && selectedScheduleTime === selectedScheduleTime2) {
                              Swal.fire({
                                title: 'Jadwal Bentrok',
                                text: 'Jadwal Utama dan Jadwal Kedua tidak boleh berada di hari dan jam slot yang sama.',
                                icon: 'warning',
                                confirmButtonText: 'Ubah Jadwal',
                                confirmButtonColor: '#0891b2'
                              });
                              return;
                            }
                          }
                          setStep(5);
                        }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2.5 text-xs md:px-6 md:py-3 md:text-sm rounded-xl transition flex items-center gap-2 shadow-md shadow-cyan-600/10 cursor-pointer"
                      >
                        Selanjutnya: Pembayaran <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
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
                            <span className="font-bold text-slate-800">{selectedPricingPackage?.name} ({selectedPricingPackage?.sessions}x Sesi)</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Frekuensi:</span>
                            <span className="font-bold text-slate-800">{scheduleFrequency}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-200 pb-2">
                            <span className="text-slate-500">Jadwal Sesi 1:</span>
                            <span className="font-bold text-slate-800">Hari {selectedScheduleDay} ({selectedScheduleDay === 'Selasa' ? 'Kolam GHL' : 'Grand Garden'}) @ Pukul {selectedScheduleTime} WIB</span>
                          </div>
                          {scheduleFrequency === '2x Seminggu' && (
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                              <span className="text-slate-500">Jadwal Sesi 2:</span>
                              <span className="font-bold text-slate-800">Hari {selectedScheduleDay2} ({selectedScheduleDay2 === 'Selasa' ? 'Kolam GHL' : 'Grand Garden'}) @ Pukul {selectedScheduleTime2} WIB</span>
                            </div>
                          )}
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
                              Transfer Bank
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
                          {paymentMethod === 'Transfer BNI' && (() => {
                            let bankAccountsList = [];
                            if (settings.bank_accounts) {
                              try {
                                const parsed = JSON.parse(settings.bank_accounts);
                                if (Array.isArray(parsed)) {
                                  bankAccountsList = parsed;
                                }
                              } catch (e) {}
                            }
                            return (
                              <div className="space-y-2">
                                <p className="font-bold text-[11px] text-slate-500 uppercase">Rekening Transfer Pembayaran:</p>
                                {bankAccountsList.length === 0 ? (
                                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 italic">
                                    Belum ada rekening pembayaran aktif. Silakan hubungi Admin untuk konfirmasi pembayaran.
                                  </div>
                                ) : (
                                  bankAccountsList.map((acc) => (
                                    <div key={acc.id} className="bg-white border border-emerald-100 rounded-xl p-3 text-xs text-slate-700 space-y-1 shadow-xs">
                                      <p className="font-bold text-[10px] text-emerald-600 uppercase">{acc.bank_name}</p>
                                      <p className="font-mono text-sm font-bold text-cyan-900">{acc.account_number}</p>
                                      <p className="font-semibold text-slate-800">a.n. {acc.account_holder}</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            );
                          })()}

                          <a
                            href={`https://wa.me/${(settings.admin_whatsapp || '6281234567890').trim()}?text=${getWhatsAppMessage()}`}
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
                        className="border border-slate-300 text-slate-600 font-bold px-4 py-2.5 text-xs md:px-6 md:py-3 md:text-sm rounded-xl transition flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /> Kembali
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2.5 text-xs md:px-8 md:py-3.5 md:text-sm rounded-xl transition flex items-center gap-2 shadow-lg shadow-cyan-600/20 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5 md:w-5 md:h-5" /> Selesaikan Pendaftaran
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

                    {/* Member ID Display Box */}
                    <div className="bg-gradient-to-r from-cyan-600 to-indigo-600 p-6 rounded-2xl text-white space-y-2.5 shadow-md">
                      <span className="text-[10px] bg-white/20 text-white font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full">
                        KODE ID MEMBER BARU
                      </span>
                      <h4 className="text-3xl font-black font-mono tracking-widest bg-slate-950/25 py-2.5 rounded-xl">
                        {createdMemberId}
                      </h4>
                      <p className="text-[11px] text-cyan-100 max-w-xs mx-auto leading-normal">
                        Simpan Kode ID di atas sebagai bukti pendaftaran resmi.
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
      )}
    </>
  );
}
