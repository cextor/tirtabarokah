/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Coach, Member, Package, ScheduleDay, EventItem, SiteSettings, ProgramLevel, CoachAbsence, BankAccount, PricingPackage, AuditLog, EventCategory, SwimmingPool } from '../types';
import { 
  Users, DollarSign, Award, Calendar, ShieldCheck, TrendingUp, AlertTriangle, 
  Plus, Edit, Trash, Check, X, Bell, BarChart2, PieChart as PieIcon, Settings, Phone, CheckSquare, Sparkles, Image as ImageIcon,
  LayoutDashboard, Gift, Eye, List, MapPin, RefreshCw, ChevronDown, ChevronRight, Key, CreditCard, FileText
} from 'lucide-react';
import { api } from '../api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { motion } from 'motion/react';
import { checkScheduleSlotConflict } from '../utils/scheduleValidation';

interface SearchableSelectProps {
  options: { value: string; label: string }[];
  placeholder: string;
  onSelect?: (value: string) => void;
  onChange?: (value: string) => void;
  value?: string;
  className?: string;
}

function SearchableSelect({ options, placeholder, onSelect, onChange, value, className }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOpt = options.find(o => o.value === value);
  const displayText = selectedOpt ? selectedOpt.label : placeholder;

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-left text-slate-800 font-semibold flex justify-between items-center cursor-pointer shadow-xs hover:border-slate-300 transition"
      >
        <span className="truncate">{displayText}</span>
        <span className="text-slate-400 text-[10px]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-[999] mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 space-y-2 max-h-60 flex flex-col">
          <input
            type="text"
            placeholder="Cari..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 transition"
            autoFocus
          />
          <div className="overflow-y-auto space-y-1 pr-1 flex-1">
            {filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-[10px] text-slate-400 italic">Tidak ada hasil ditemukan</div>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (onSelect) onSelect(opt.value);
                    if (onChange) onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    opt.value === value ? 'bg-cyan-50 text-cyan-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface AdminDashboardProps {
  coaches: Coach[];
  members: Member[];
  events: EventItem[];
  settings: SiteSettings;
  levels: ProgramLevel[];
  absences: CoachAbsence[];
  pricingPackages: PricingPackage[];
  auditLogs: AuditLog[];
  eventCategories?: EventCategory[];
  swimmingPools?: SwimmingPool[];
  userRole?: string;
  onReloadData: () => void;
  onUpdateSettings: (settings: SiteSettings) => void;
  onUpdateLevels: (levels: ProgramLevel[]) => void;
  onUpdateCoaches: (coaches: Coach[]) => void;
  onUpdateMembers: (members: Member[]) => void;
  onUpdateEvents: (events: EventItem[]) => void;
}

const getIndonesianDayName = (date: Date): string => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
};

const calculateAge = (dobString: string): number => {
  if (!dobString) return 0;
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
};

export default function AdminDashboard({ 
  coaches, 
  members, 
  events,
  settings,
  levels,
  absences,
  pricingPackages,
  auditLogs = [],
  eventCategories = [],
  swimmingPools = [],
  userRole = 'admin',
  onReloadData,
  onUpdateSettings,
  onUpdateLevels,
  onUpdateCoaches, 
  onUpdateMembers,
  onUpdateEvents
}: AdminDashboardProps) {
  const globalPricingPackages: PricingPackage[] = pricingPackages;

  const isOperator = userRole === 'operator';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'verifikasi' | 'peserta' | 'pelatih' | 'reminder' | 'events' | 'laporan' | 'pengaturan' | 'absensi_coach' | 'referral' | 'jadwal_hari_ini' | 'audit_logs' | 'kolam_renang'>(() => {
    return userRole === 'operator' ? 'verifikasi' : 'dashboard';
  });

  const [reminderSubTab, setReminderSubTab] = useState<'today' | 'tomorrow'>('today');
  const [isPelatihGroupOpen, setIsPelatihGroupOpen] = useState<boolean>(false);
  const [isKonfigurasiGroupOpen, setIsKonfigurasiGroupOpen] = useState<boolean>(false);

  useEffect(() => {
    if (activeTab === 'pelatih' || activeTab === 'absensi_coach') {
      setIsPelatihGroupOpen(true);
    }
    if (activeTab === 'pengaturan' || activeTab === 'kolam_renang' || activeTab === 'audit_logs') {
      setIsKonfigurasiGroupOpen(true);
    }
  }, [activeTab]);

  useEffect(() => {
    if (userRole === 'operator') {
      const allowedOperatorTabs = ['verifikasi', 'peserta', 'pelatih', 'absensi_coach', 'reminder', 'events', 'kolam_renang'];
      if (!allowedOperatorTabs.includes(activeTab)) {
        setActiveTab('verifikasi');
      }
    }
  }, [userRole, activeTab]);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const [selectedReplacementCoachId, setSelectedReplacementCoachId] = useState<Record<string, string>>({});
  const [selectedScheduleDayFilter, setSelectedScheduleDayFilter] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState<boolean>(false);
  const [registrationMode, setRegistrationMode] = useState<'baru' | 'lama'>('baru');
  const [selectedExistingMemberId, setSelectedExistingMemberId] = useState<string>('');

  const [showAttendanceModal, setShowAttendanceModal] = useState<boolean>(false);
  const [attendanceMember, setAttendanceMember] = useState<Member | null>(null);
  const [newAttendanceStatus, setNewAttendanceStatus] = useState<'Hadir' | 'Absen' | 'Izin'>('Hadir');
  const [newAttendanceNote, setNewAttendanceNote] = useState<string>('');

  const handleProcessCoachAbsence = async (absenceId: string, status: 'Transfer' | 'Reschedule') => {
    let replacementCoachId = undefined;
    if (status === 'Transfer') {
      replacementCoachId = selectedReplacementCoachId[absenceId];
      if (!replacementCoachId) {
        Swal.fire('Pilih Pelatih', 'Silakan pilih pelatih pengganti terlebih dahulu.', 'warning');
        return;
      }
    }

    try {
      await api.processCoachAbsence({
        absenceId,
        status,
        replacementCoachId
      });
      
      Swal.fire({
        title: 'Berhasil!',
        text: `Laporan ketidakhadiran berhasil diproses dengan opsi: ${status === 'Transfer' ? 'Ganti Pelatih (Transfer)' : 'Geser Jadwal (Reschedule)'}.`,
        icon: 'success',
        confirmButtonColor: '#06b6d4'
      });
      
      onReloadData();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Gagal', 'Terjadi kesalahan: ' + (err.message || err), 'error');
    }
  };

  // STATE FOR ADDING NEW COACH
  const [showAddCoachModal, setShowAddCoachModal] = useState<boolean>(false);
  const [newCoachName, setNewCoachName] = useState<string>('');
  const [newCoachExperience, setNewCoachExperience] = useState<string>('');
  const [newCoachPhoto, setNewCoachPhoto] = useState<string>('');
  const [newCoachCertificate, setNewCoachCertificate] = useState<string>('');
  const [newCoachQuota, setNewCoachQuota] = useState<number>(6);
  const [newCoachReferralCode, setNewCoachReferralCode] = useState<string>('');

  const [newCoachPackages, setNewCoachPackages] = useState<string[]>([]);

  const [selectedEditCoachId, setSelectedEditCoachId] = useState<string>('');
  const [expandedCoachScheduleId, setExpandedCoachScheduleId] = useState<string>('');
  const [showAddSlotModal, setShowAddSlotModal] = useState<boolean>(false);
  const [addSlotCoachId, setAddSlotCoachId] = useState<string>('');
  const [addSlotDayName, setAddSlotDayName] = useState<string>('');
  const [newSlotTime, setNewSlotTime] = useState<string>('');
  const [addSlotPoolId, setAddSlotPoolId] = useState<string>('');

  // Master Kolam Renang State
  const [showPoolModal, setShowPoolModal] = useState<boolean>(false);
  const [editingPool, setEditingPool] = useState<SwimmingPool | null>(null);
  const [poolName, setPoolName] = useState<string>('');
  const [poolDays, setPoolDays] = useState<string[]>([]);
  const [poolHours, setPoolHours] = useState<string[]>([]);
  const [newHourInput, setNewHourInput] = useState<string>('');
  const [poolDescription, setPoolDescription] = useState<string>('');
  const [editCoachName, setEditCoachName] = useState<string>('');
  const [editCoachExperience, setEditCoachExperience] = useState<string>('');
  const [editCoachPhoto, setEditCoachPhoto] = useState<string>('');
  const [editCoachCertificate, setEditCoachCertificate] = useState<string>('');
  const [editQuotaValue, setEditQuotaValue] = useState<number>(6);
  const [editPrice4, setEditPrice4] = useState<number>(250000);
  const [editPrice8, setEditPrice8] = useState<number>(450000);
  const [editPrice12, setEditPrice12] = useState<number>(600000);
  const [editCoachPackages, setEditCoachPackages] = useState<Package[]>([]);
  const [editCoachIsActive, setEditCoachIsActive] = useState<boolean>(true);
  const [editCoachReferralCode, setEditCoachReferralCode] = useState<string>('');
  const [previewCertUrl, setPreviewCertUrl] = useState<string | null>(null);

  // FILTERS FOR PARTICIPANTS
  const [pesertaFilter, setPesertaFilter] = useState<'semua' | 'aktif' | 'hampir-habis' | 'menunggu-verifikasi'>('semua');
  const [searchPeserta, setSearchPeserta] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'hari-ini' | 'seminggu' | 'sebulan' | 'setahun' | 'kustom' | 'semua'>('semua');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // FILTERS FOR REFERRALS
  const [refStartDate, setRefStartDate] = useState<string>('');
  const [refEndDate, setRefEndDate] = useState<string>('');

  // FILTERS FOR VERIFICATION
  const [verifyStartDate, setVerifyStartDate] = useState<string>('');
  const [verifyEndDate, setVerifyEndDate] = useState<string>('');

  // FILTERS FOR FINANCE REPORT
  const [financeStartDate, setFinanceStartDate] = useState<string>('');

  // FILTERS FOR AUDIT LOGS
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditActionFilter, setAuditActionFilter] = useState<'semua' | 'input' | 'edit' | 'hapus' | 'verifikasi'>('semua');
  const [auditStartDate, setAuditStartDate] = useState<string>('');
  const [auditEndDate, setAuditEndDate] = useState<string>('');
  const [financeEndDate, setFinanceEndDate] = useState<string>('');

  // FILTER FOR COACHES
  const [searchCoach, setSearchCoach] = useState<string>('');

  // FILTERS FOR PAYMENT HISTORY TABLE
  const [historyStartDate, setHistoryStartDate] = useState<string>('');
  const [historyEndDate, setHistoryEndDate] = useState<string>('');

  // STATE FOR ADD / EDIT STUDENT MODAL (CRUD)
  const [showStudentModal, setShowStudentModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Member | null>(null);

  // Student details form fields
  const [studentName, setStudentName] = useState<string>('');
  const [studentGender, setStudentGender] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [studentDob, setStudentDob] = useState<string>('2018-01-01');
  const [studentAge, setStudentAge] = useState<number>(8);
  const [studentIllness, setStudentIllness] = useState<string>('');
  const [studentHasSwum, setStudentHasSwum] = useState<boolean>(false);

  // Parent details form fields
  const [parentName, setParentName] = useState<string>('');
  const [parentWhatsapp, setParentWhatsapp] = useState<string>('');

  // Setup form fields
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [selectedCoachType, setSelectedCoachType] = useState<'Reguler' | 'Privat'>('Reguler');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [scheduleFreq, setScheduleFreq] = useState<'1x Seminggu' | '2x Seminggu'>('1x Seminggu');
  const [schDay1, setSchDay1] = useState<string>('Senin');
  const [schTime1, setSchTime1] = useState<string>('16.00');
  const [schDay2, setSchDay2] = useState<string>('Rabu');
  const [schTime2, setSchTime2] = useState<string>('16.00');
  const [sessLeft, setSessLeft] = useState<number>(4);
  const [sessTotal, setSessTotal] = useState<number>(4);
  const [studentStatus, setStudentStatus] = useState<Member['status']>('Aktif');
  const [memberIsActive, setMemberIsActive] = useState<boolean>(true);
  
  // Payment info
  const [payAmount, setPayAmount] = useState<number>(250000);
  const [payMethod, setPayMethod] = useState<'Transfer BNI' | 'Tunai di Kasir'>('Tunai di Kasir');
  const [payStatus, setPayStatus] = useState<Member['payment']['status']>('Pembayaran Berhasil');

  // Sync Coaches helper
  const syncCoachesSchedules = (currentCoaches: Coach[], currentMembers: Member[]): Coach[] => {
    return currentCoaches.map(c => {
      const updatedSchedule = c.schedule.map(d => {
        const updatedTimeSlots = d.timeSlots.map(ts => {
          const assignedStudents = currentMembers.filter(m => {
            if (m.coachId !== c.id) return false;
            const matchDay1 = m.scheduleDay === d.day && m.scheduleTime === ts.time;
            const matchDay2 = m.scheduleFrequency === '2x Seminggu' && m.scheduleDay2 === d.day && m.scheduleTime2 === ts.time;
            return matchDay1 || matchDay2;
          });
          const studentIds = assignedStudents.map(m => m.id);
          return {
            ...ts,
            currentSlots: studentIds.length,
            students: studentIds
          };
        });
        return { ...d, timeSlots: updatedTimeSlots };
      });
      const activeCount = updatedSchedule.reduce(
        (sum, d) => sum + d.timeSlots.reduce((sSum, ts) => sSum + ts.students.length, 0), 0
      );
      return {
        ...c,
        schedule: updatedSchedule,
        currentQuota: activeCount,
        status: activeCount >= c.maxQuota ? 'Penuh' as const : 'Tersedia' as const
      };
    });
  };

  const resetStudentForm = () => {
    setStudentName('');
    setStudentGender('Laki-laki');
    setStudentDob('2018-01-01');
    setStudentAge(8);
    setStudentIllness('');
    setStudentHasSwum(false);
    setParentName('');
    setParentWhatsapp('');
    setSelectedExistingMemberId('');
    setRegistrationMode('baru');
    setStudentSearchQuery('');
    if (coaches.length > 0) {
      setSelectedCoachId(coaches[0].id);
      setSelectedPackageId(coaches[0].packages[0]?.id || '');
      setPayAmount(coaches[0].packages[0]?.price || 250000);
      setSessLeft(coaches[0].packages[0]?.sessions || 4);
      setSessTotal(coaches[0].packages[0]?.sessions || 4);
      if (coaches[0].schedule.length > 0) {
        setSchDay1(coaches[0].schedule[0].day);
        if (coaches[0].schedule[0].timeSlots.length > 0) {
          setSchTime1(coaches[0].schedule[0].timeSlots[0].time);
        }
      }
    }
    setSelectedCoachType('Reguler');
    setScheduleFreq('1x Seminggu');
    setSchDay1('Senin');
    setSchTime1('16.00');
    setSchDay2('Rabu');
    setSchTime2('16.00');
    setStudentStatus('Aktif');
    setPayMethod('Tunai di Kasir');
    setPayStatus('Pembayaran Berhasil');
    setMemberIsActive(true);
  };

  const handleOpenEditModal = (member: Member) => {
    setEditingStudent(member);
    setStudentName(member.student.fullName);
    setStudentGender(member.student.gender);
    setStudentDob(member.student.dob);
    setStudentAge(member.student.age);
    setStudentIllness(member.student.illnessHistory || '');
    setStudentHasSwum(member.student.hasSwumBefore);
    setParentName(member.parent.fatherMotherName);
    setParentWhatsapp(member.parent.whatsapp);
    setSelectedCoachId(member.coachId);
    setSelectedCoachType(member.coachType);
    setSelectedPackageId(member.packageId);
    setScheduleFreq(member.scheduleFrequency);
    setSchDay1(member.scheduleDay);
    setSchTime1(member.scheduleTime);
    setSchDay2(member.scheduleDay2 || 'Rabu');
    setSchTime2(member.scheduleTime2 || '16.00');
    setSessLeft(member.sessionsLeft);
    setSessTotal(member.sessionsTotal);
    setStudentStatus(member.status);
    setPayAmount(member.payment.amount);
    setPayMethod(member.payment.method);
    setPayStatus(member.payment.status);
    setMemberIsActive(member.isActive !== false);
    setShowStudentModal(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !parentName || !parentWhatsapp) {
      Swal.fire({
        title: 'Perhatian!',
        text: 'Harap lengkapi Nama Siswa, Nama Orang Tua, dan WhatsApp!',
        icon: 'warning',
        confirmButtonColor: '#06b6d4'
      });
      return;
    }

    const ageVal = Number(studentAge) || 0;
    if (ageVal < 5) {
      Swal.fire({
        title: 'Usia Dibawah 5 Tahun Tidak Bisa Mendaftar',
        text: 'Mohon maaf, usia di bawah 5 tahun tidak bisa mendaftar.',
        icon: 'warning',
        confirmButtonColor: '#e11d48'
      });
      return;
    }

    // Validate category conflict (Reguler vs Privat) for Sesi 1
    const conflict1 = checkScheduleSlotConflict(
      members,
      selectedCoachId,
      schDay1,
      schTime1,
      selectedCoachType,
      editingStudent?.id
    );
    if (conflict1.isConflict) {
      Swal.fire({
        title: 'Jadwal Bentrok Jenis Paket!',
        text: `Jadwal Sesi 1 (Hari ${schDay1} jam ${schTime1} WIB) sudah terisi siswa paket ${conflict1.existingType}. Paket ${selectedCoachType} tidak dapat dipilih pada jam yang sama.`,
        icon: 'warning',
        confirmButtonColor: '#06b6d4'
      });
      return;
    }

    // Validate category conflict (Reguler vs Privat) for Sesi 2 if 2x seminggu
    if (scheduleFreq === '2x Seminggu') {
      const conflict2 = checkScheduleSlotConflict(
        members,
        selectedCoachId,
        schDay2,
        schTime2,
        selectedCoachType,
        editingStudent?.id
      );
      if (conflict2.isConflict) {
        Swal.fire({
          title: 'Jadwal Bentrok Jenis Paket!',
          text: `Jadwal Sesi 2 (Hari ${schDay2} jam ${schTime2} WIB) sudah terisi siswa paket ${conflict2.existingType}. Paket ${selectedCoachType} tidak dapat dipilih pada jam yang sama.`,
          icon: 'warning',
          confirmButtonColor: '#06b6d4'
        });
        return;
      }
    }

    if (editingStudent) {
      const updatedMember: Member = {
        ...editingStudent,
        student: {
          fullName: studentName,
          gender: studentGender,
          dob: studentDob,
          age: Number(studentAge) || 8,
          illnessHistory: studentIllness,
          hasSwumBefore: studentHasSwum
        },
        parent: {
          fatherMotherName: parentName,
          whatsapp: parentWhatsapp
        },
        coachId: selectedCoachId,
        coachType: selectedCoachType,
        packageId: selectedPackageId,
        scheduleFrequency: scheduleFreq,
        scheduleDay: schDay1,
        scheduleTime: schTime1,
        scheduleDay2: scheduleFreq === '2x Seminggu' ? schDay2 : undefined,
        scheduleTime2: scheduleFreq === '2x Seminggu' ? schTime2 : undefined,
        sessionsLeft: Number(sessLeft),
        sessionsTotal: Number(sessTotal),
        status: studentStatus,
        isActive: memberIsActive,
        payment: {
          ...editingStudent.payment,
          amount: Number(payAmount),
          method: payMethod,
          status: payStatus
        }
      };

      const updatedMembers = members.map(m => m.id === editingStudent.id ? updatedMember : m);
      const syncedCoaches = syncCoachesSchedules(coaches, updatedMembers);

      onUpdateMembers(updatedMembers);
      onUpdateCoaches(syncedCoaches);
      Swal.fire({
        title: 'Berhasil!',
        text: 'Data siswa berhasil diperbarui!',
        icon: 'success',
        confirmButtonColor: '#06b6d4'
      });
    } else {
      const isLama = registrationMode === 'lama';
      const newId = isLama ? selectedExistingMemberId : `member-${Date.now().toString().slice(-6)}`;
      const oldProgress = isLama ? (members.find(m => m.id === selectedExistingMemberId)?.progress || []) : [];
      const oldReschedules = isLama ? (members.find(m => m.id === selectedExistingMemberId)?.rescheduleRequests || []) : [];

      const newMember: Member = {
        id: newId,
        student: {
          fullName: studentName,
          gender: studentGender,
          dob: studentDob,
          age: Number(studentAge) || 8,
          illnessHistory: studentIllness,
          hasSwumBefore: studentHasSwum
        },
        parent: {
          fatherMotherName: parentName,
          whatsapp: parentWhatsapp
        },
        coachId: selectedCoachId,
        coachType: selectedCoachType,
        packageId: selectedPackageId,
        scheduleFrequency: scheduleFreq,
        scheduleDay: schDay1,
        scheduleTime: schTime1,
        scheduleDay2: scheduleFreq === '2x Seminggu' ? schDay2 : undefined,
        scheduleTime2: scheduleFreq === '2x Seminggu' ? schTime2 : undefined,
        sessionsLeft: Number(sessLeft),
        sessionsTotal: Number(sessTotal),
        status: studentStatus,
        isActive: memberIsActive,
        payment: {
          amount: Number(payAmount),
          method: payMethod,
          proofUrl: null,
          status: payStatus,
          date: new Date().toISOString().split('T')[0]
        },
        progress: oldProgress,
        registeredAt: new Date().toISOString(),
        rescheduleRequests: oldReschedules
      };

      let updatedMembers;
      if (isLama) {
        updatedMembers = members.map(m => m.id === selectedExistingMemberId ? newMember : m);
      } else {
        updatedMembers = [...members, newMember];
      }

      const syncedCoaches = syncCoachesSchedules(coaches, updatedMembers);

      onUpdateMembers(updatedMembers);
      onUpdateCoaches(syncedCoaches);
      Swal.fire({
        title: 'Berhasil!',
        text: isLama ? 'Daftar ulang siswa lama berhasil diproses!' : 'Siswa baru berhasil ditambahkan!',
        icon: 'success',
        confirmButtonColor: '#06b6d4'
      });
    }

    setShowStudentModal(false);
    resetStudentForm();
  };

  const [simulatedToday, setSimulatedToday] = useState<string>(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[new Date().getDay()];
  });

  // EVENT CONFIG STATE
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventCategory, setNewEventCategory] = useState<'Fun Swimming' | 'Lomba' | 'Latihan Bersama' | 'Pengumuman'>('Fun Swimming');
  const [newEventDate, setNewEventDate] = useState<string>('');
  const [newEventDescription, setNewEventDescription] = useState<string>('');
  const [newEventImageUrl, setNewEventImageUrl] = useState<string>('/images/event_fun.png');
  const [showEventModal, setShowEventModal] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  // Preset Unsplash images for quick click
  const presetImages = [
    { name: 'Fun Swimming', url: '/images/event_fun.png' },
    { name: 'Lomba Renang', url: '/images/event_lomba.png' },
    { name: 'Latihan Bersama', url: '/images/hero_pool.png' },
    { name: 'Pengumuman / Pool', url: '/images/hero_pool.png' }
  ];

  // CALCULATIONS FOR STATS CARDS
  const activeMembers = members.filter(m => m.status === 'Aktif' || m.status === 'Paket Hampir Habis');
  const pendingPayments = members.filter(m => m.status === 'Menunggu Verifikasi' || m.payment.status === 'Menunggu Verifikasi');
  const expiringMembers = members.filter(m => m.sessionsLeft <= 2 && m.status !== 'Menunggu Verifikasi');

  const totalRevenue = members
    .filter(m => m.payment.status === 'Pembayaran Berhasil')
    .reduce((sum, m) => sum + m.payment.amount, 0);

  // ACTION: VERIFY PAYMENT (WITH CONFIRMATION & NOTIF)
  const handleVerifyPayment = (memberId: string, isApproved: boolean) => {
    const memberObj = members.find(m => m.id === memberId);
    if (!memberObj) return;

    const studentName = memberObj.student?.fullName || memberId;

    Swal.fire({
      title: isApproved ? 'Setujui Pembayaran?' : 'Tolak Pembayaran?',
      text: isApproved 
        ? `Apakah Anda yakin ingin menyetujui & mengaktifkan pendaftaran siswa ${studentName}?`
        : `Apakah Anda yakin ingin menolak pembayaran pendaftaran siswa ${studentName}?`,
      icon: isApproved ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: isApproved ? '#0891b2' : '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: isApproved ? 'Ya, Setujui & Aktifkan!' : 'Ya, Tolak',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          const updated = members.map(m => {
            if (m.id === memberId) {
              const approvedStatus = isApproved ? 'Pembayaran Berhasil' : 'Pembayaran Gagal';
              const memberStatus = isApproved ? 'Aktif' : 'Menunggu Pembayaran';
              return {
                ...m,
                status: memberStatus as any,
                payment: {
                  ...m.payment,
                  status: approvedStatus as any
                }
              };
            }
            return m;
          });

          // Check if referral was used, and trigger reward calculation
          if (isApproved && memberObj.referralCodeUsed) {
            const code = memberObj.referralCodeUsed.toUpperCase();
            
            // 1. Is it a coach referral code?
            const targetCoach = coaches.find(c => c.referralCode && c.referralCode.toUpperCase() === code);
            if (targetCoach) {
              const updatedCoaches = coaches.map(c => {
                if (c.id === targetCoach.id) {
                  return {
                    ...c,
                    referralBonus: (c.referralBonus || 0) + 50000
                  };
                }
                return c;
              });
              onUpdateCoaches(updatedCoaches);
            } else {
              // 2. Is it a member referral?
              const targetMemberIndex = members.findIndex(m => m.id && m.id.toUpperCase() === code);
              if (targetMemberIndex !== -1) {
                const updatedWithReferral = updated.map(m => {
                  if (m.id && m.id.toUpperCase() === code) {
                    return {
                      ...m,
                      referralCount: (m.referralCount || 0) + 1,
                      referralBonus: (m.referralBonus || 0) + 25000,
                      sessionsLeft: m.sessionsLeft + 1
                    };
                  }
                  return m;
                });
                onUpdateMembers(updatedWithReferral);
                Swal.fire({
                  icon: 'success',
                  title: isApproved ? 'Berhasil Disetujui' : 'Berhasil Ditolak',
                  text: isApproved ? `Pendaftaran ${studentName} berhasil diaktifkan.` : `Pendaftaran ${studentName} telah ditolak.`,
                  timer: 2000,
                  showConfirmButton: false
                });
                return;
              }
            }
          }

          onUpdateMembers(updated);

          Swal.fire({
            icon: 'success',
            title: isApproved ? 'Berhasil Disetujui' : 'Berhasil Ditolak',
            text: isApproved ? `Pendaftaran ${studentName} berhasil diaktifkan!` : `Pendaftaran ${studentName} telah ditolak.`,
            timer: 2000,
            showConfirmButton: false
          });
        } catch (err: any) {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Memproses',
            text: err.message || 'Terjadi kesalahan saat memproses verifikasi.'
          });
        }
      }
    });
  };

  // ACTION: DELETE MEMBER (STOP TRAINING / EXPEL)
  const handleDeleteMember = (memberId: string) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: 'Apakah Anda yakin ingin menghentikan latihan siswa ini? Data pendaftaran akan dihapus dari sistem dan kuota pelatih akan otomatis dibebaskan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        const updatedMembers = members.filter(m => m.id !== memberId);
        const syncedCoaches = syncCoachesSchedules(coaches, updatedMembers);

        onUpdateCoaches(syncedCoaches);
        onUpdateMembers(updatedMembers);
        Swal.fire({
          title: 'Terhapus!',
          text: 'Data member berhasil dihapus dan slot pelatih dikosongkan.',
          icon: 'success',
          confirmButtonColor: '#06b6d4'
        });
      }
    });
  };

  // ACTION: ATTENDANCE LOG / OPEN MODAL WITH HISTORY
  const handleLogAttendance = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    setAttendanceMember(member);
    setNewAttendanceStatus('Hadir');
    setNewAttendanceNote('Menyelesaikan sesi latihan rutin dengan baik. Fokus gerakan hari ini tercapai.');
    setShowAttendanceModal(true);
  };

  // ACTION: SUBMIT ATTENDANCE LOG FROM INSIDE MODAL
  const submitAttendanceRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceMember) return;

    const member = attendanceMember;

    // sessionsLeft reduction happens for all presence statuses (Hadir, Absen, Izin)
    const newSessionsLeft = Math.max(0, member.sessionsLeft - 1);
    const isAlmostExpiring = newSessionsLeft <= 2;

    const newProgressRecord = {
      id: `prog-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      attendance: newAttendanceStatus,
      note: newAttendanceNote || (
        newAttendanceStatus === 'Hadir' 
          ? 'Menyelesaikan sesi latihan rutin dengan baik. Fokus gerakan hari ini tercapai.' 
          : newAttendanceStatus === 'Absen' 
          ? 'Siswa absen tanpa keterangan pada jadwal latihan rutin.' 
          : 'Siswa berhalangan hadir dengan izin tertulis / pemberitahuan sebelumnya.'
      )
    };

    const updated = members.map(m => {
      if (m.id === member.id) {
        return {
          ...m,
          sessionsLeft: newSessionsLeft,
          status: newSessionsLeft === 0 ? 'Selesai' as const : isAlmostExpiring ? 'Paket Hampir Habis' as const : m.status,
          progress: [newProgressRecord, ...m.progress]
        };
      }
      return m;
    });

    onUpdateMembers(updated);
    setShowAttendanceModal(false);

    // Show success prompt
    if (newSessionsLeft === 0) {
      Swal.fire({
        title: 'Selesai!',
        text: 'Latihan tercatat! Sesi latihan siswa sekarang HABIS (0). Silakan konfirmasi untuk perpanjangan atau stop latihan.',
        icon: 'info',
        confirmButtonColor: '#06b6d4'
      });
    } else if (isAlmostExpiring) {
      Swal.fire({
        title: 'Sesi Hampir Habis!',
        text: `Latihan tercatat! Sisa sesi siswa tinggal ${newSessionsLeft} sesi (Hampir Habis).`,
        icon: 'warning',
        confirmButtonColor: '#06b6d4'
      });
    } else {
      Swal.fire({
        title: 'Berhasil!',
        text: `Kehadiran berhasil dicatat! Sisa sesi: ${newSessionsLeft}.`,
        icon: 'success',
        confirmButtonColor: '#06b6d4'
      });
    }
  };


  // ACTION: ADD COACH
  const handleAddCoachSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoachName || !newCoachExperience) return;

    const defaultPhoto = newCoachPhoto || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop&q=80';
    const newId = `coach-${newCoachName.toLowerCase().replace(/\s+/g, '-')}`;

    // Load global packages to construct local packages
    let globalPricingPackages: PricingPackage[] = [];
    if (settings.pricing_packages) {
      try {
        globalPricingPackages = JSON.parse(settings.pricing_packages);
      } catch (err) {}
    }

    const selectedPkgs = globalPricingPackages.filter(p => newCoachPackages.includes(p.id));
    const coachPkgs = selectedPkgs.map(p => ({
      id: `pkg-${newId}-${p.id}`,
      name: p.name,
      price: p.price,
      sessions: p.sessions
    }));

    const newCoach: Coach = {
      id: newId,
      name: newCoachName,
      status: 'Tersedia',
      photo: defaultPhoto,
      certificateUrl: newCoachCertificate || undefined,
      experience: newCoachExperience,
      maxQuota: newCoachQuota,
      currentQuota: 0,
      referralCode: newCoachReferralCode.trim() ? newCoachReferralCode.trim().toUpperCase() : `COACH-${newCoachName.toUpperCase().replace(/\s+/g, '')}`,
      referralBonus: 0,
      packages: coachPkgs,
      schedule: [
        {
          day: 'Senin',
          timeSlots: [
            { time: '08.00', maxSlots: newCoachQuota, currentSlots: 0, students: [] },
            { time: '16.00', maxSlots: newCoachQuota, currentSlots: 0, students: [] }
          ]
        },
        {
          day: 'Rabu',
          timeSlots: [
            { time: '08.00', maxSlots: newCoachQuota, currentSlots: 0, students: [] },
            { time: '16.00', maxSlots: newCoachQuota, currentSlots: 0, students: [] }
          ]
        },
        {
          day: 'Jumat',
          timeSlots: [
            { time: '08.00', maxSlots: newCoachQuota, currentSlots: 0, students: [] },
            { time: '16.00', maxSlots: newCoachQuota, currentSlots: 0, students: [] }
          ]
        }
      ]
    };

    onUpdateCoaches([...coaches, newCoach]);

    // Sync to global settings coachIds
    if (globalPricingPackages.length > 0) {
      const updatedGlobalPkgs = globalPricingPackages.map(gp => {
        if (newCoachPackages.includes(gp.id)) {
          const currentIds = gp.coachIds || [];
          const newIds = currentIds.includes(newId) ? currentIds : [...currentIds, newId];
          return { ...gp, coachIds: newIds };
        }
        return gp;
      });
      const updatedSettings = { ...settings, pricing_packages: JSON.stringify(updatedGlobalPkgs) };
      try {
        await api.updateSettings(updatedSettings);
        onUpdateSettings(updatedSettings);
      } catch (err) {
        console.error("Failed to sync settings from coach save", err);
      }
    }
    
    // reset form
    setNewCoachName('');
    setNewCoachExperience('');
    setNewCoachPhoto('');
    setNewCoachCertificate('');
    setNewCoachQuota(6);
    setNewCoachReferralCode('');
    setNewCoachPackages([]);
    setShowAddCoachModal(false);

    Swal.fire({
      title: 'Berhasil!',
      text: 'Pelatih baru berhasil ditambahkan!',
      icon: 'success',
      confirmButtonColor: '#06b6d4'
    });
  };

  // ACTION: SAVE COACH SETTINGS
  const handleSaveCoachSettings = async (coachId: string) => {
    const updated = coaches.map(c => {
      if (c.id === coachId) {
        return {
          ...c,
          name: editCoachName,
          experience: editCoachExperience,
          photo: editCoachPhoto,
          certificateUrl: editCoachCertificate || undefined,
          maxQuota: editQuotaValue,
          packages: editCoachPackages,
          isActive: editCoachIsActive,
          referralCode: editCoachReferralCode.trim().toUpperCase()
        };
      }
      return c;
    });

    onUpdateCoaches(updated);

    setSelectedEditCoachId('');
    Swal.fire({
      title: 'Berhasil!',
      text: 'Profil & harga paket pelatih berhasil disimpan!',
      icon: 'success',
      confirmButtonColor: '#06b6d4'
    });
  };

  const handleEditCoachSettings = (coachId: string) => {
    const coach = coaches.find(c => c.id === coachId);
    if (!coach) return;
    
    setSelectedEditCoachId(coachId);
    setEditCoachName(coach.name);
    setEditCoachExperience(coach.experience);
    setEditCoachPhoto(coach.photo);
    setEditCoachCertificate(coach.certificateUrl || '');
    setEditQuotaValue(coach.maxQuota);
    setEditCoachPackages(coach.packages || []);
    setEditPrice4(coach.packages.find(p => p.sessions === 4)?.price || 250000);
    setEditPrice8(coach.packages.find(p => p.sessions === 8)?.price || 450000);
    setEditPrice12(coach.packages.find(p => p.sessions === 12)?.price || 600000);
    setEditCoachIsActive(coach.isActive !== false);
    setEditCoachReferralCode(coach.referralCode || '');
  };

  const handleAddEditPackage = () => {
    const newId = `pkg-${Date.now()}`;
    setEditCoachPackages(prev => [...prev, { id: newId, name: 'Paket Baru', sessions: 4, price: 250000 }]);
  };

  const handleDeleteEditPackage = (id: string) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: 'Apakah Anda yakin ingin menghapus paket belajar ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        setEditCoachPackages(prev => prev.filter(p => p.id !== id));
        Swal.fire({
          title: 'Terhapus!',
          text: 'Paket berhasil dihapus.',
          icon: 'success',
          confirmButtonColor: '#06b6d4'
        });
      }
    });
  };

  const handleUpdateEditPackageField = (id: string, field: keyof Package, value: any) => {
    setEditCoachPackages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleOpenAddSlotModal = (coachId: string, dayName: string) => {
    setAddSlotCoachId(coachId);
    setAddSlotDayName(dayName);
    setNewSlotTime('');
    setAddSlotPoolId(swimmingPools.length > 0 ? swimmingPools[0].id : '');
    setShowAddSlotModal(true);
  };

  const handleSaveScheduleSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotTime) {
      Swal.fire({
        title: 'Perhatian!',
        text: 'Harap masukkan waktu/jam latihan!',
        icon: 'warning',
        confirmButtonColor: '#06b6d4'
      });
      return;
    }
    // Replace colon (:) with dot (.) to match our database and application format
    const formattedTime = newSlotTime.replace(':', '.');
    handleAddScheduleSlot(addSlotCoachId, addSlotDayName, formattedTime, addSlotPoolId);
    setShowAddSlotModal(false);
  };

  // ACTION: ADD TIME SLOT TO SCHEDULE
  const handleAddScheduleSlot = (coachId: string, dayName: string, timeStr: string, poolId?: string) => {
    const updated = coaches.map(c => {
      if (c.id === coachId) {
        const dayExists = c.schedule.some(d => d.day === dayName);
        let baseSchedule = [...c.schedule];
        if (!dayExists) {
          baseSchedule.push({ day: dayName, timeSlots: [] });
        }

        return {
          ...c,
          schedule: baseSchedule.map(d => {
            if (d.day === dayName) {
              if (d.timeSlots.find(ts => ts.time === timeStr)) return d;
              return {
                ...d,
                timeSlots: [...d.timeSlots, { 
                  time: timeStr, 
                  maxSlots: c.maxQuota || 6, 
                  currentSlots: 0, 
                  students: [],
                  swimmingPoolId: poolId || undefined 
                }].sort((a, b) => a.time.localeCompare(b.time))
              };
            }
            return d;
          })
        };
      }
      return c;
    });

    const targetCoach = updated.find(c => c.id === coachId);
    if (targetCoach) {
      api.updateCoach(targetCoach).then(() => {
        onReloadData();
      });
    }

    onUpdateCoaches(updated);
    Swal.fire({
      title: 'Berhasil!',
      text: `Slot waktu ${timeStr} ditambahkan pada hari ${dayName}.`,
      icon: 'success',
      confirmButtonColor: '#06b6d4'
    });
  };

  // MASTER KOLAM RENANG HANDLERS
  const handleOpenAddPoolModal = () => {
    setEditingPool(null);
    setPoolName('');
    setPoolDays(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']);
    setPoolHours(['08:00 - 09:30', '10:00 - 11:30', '14:00 - 15:30', '16:00 - 17:30']);
    setNewHourInput('');
    setPoolDescription('');
    setShowPoolModal(true);
  };

  const handleOpenEditPoolModal = (pool: SwimmingPool) => {
    setEditingPool(pool);
    setPoolName(pool.name);
    setPoolDays(Array.isArray(pool.training_days) ? pool.training_days : []);
    setPoolHours(Array.isArray(pool.training_hours) ? pool.training_hours : []);
    setNewHourInput('');
    setPoolDescription(pool.description || '');
    setShowPoolModal(true);
  };

  const handleTogglePoolDay = (day: string) => {
    setPoolDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAddPoolHour = () => {
    if (!newHourInput.trim()) return;
    const formatted = newHourInput.trim();
    if (!poolHours.includes(formatted)) {
      setPoolHours(prev => [...prev, formatted]);
    }
    setNewHourInput('');
  };

  const handleRemovePoolHour = (hour: string) => {
    setPoolHours(prev => prev.filter(h => h !== hour));
  };

  const handleSavePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolName.trim()) {
      Swal.fire('Perhatian!', 'Nama kolam renang harus diisi!', 'warning');
      return;
    }

    try {
      const payload = {
        id: editingPool ? editingPool.id : undefined,
        name: poolName.trim(),
        training_days: poolDays,
        training_hours: poolHours,
        description: poolDescription.trim()
      };

      let res;
      if (editingPool) {
        res = await api.updateSwimmingPool(payload);
      } else {
        res = await api.addSwimmingPool(payload);
      }

      if (res) {
        Swal.fire({
          title: 'Berhasil!',
          text: editingPool ? 'Master data kolam renang berhasil diperbarui.' : 'Master data kolam renang baru berhasil disimpan.',
          icon: 'success',
          confirmButtonColor: '#06b6d4'
        });
        setShowPoolModal(false);
        onReloadData();
      }
    } catch (err: any) {
      Swal.fire('Gagal!', err.message || 'Gagal menyimpan data kolam renang.', 'error');
    }
  };

  const handleDeletePool = async (poolId: string) => {
    const result = await Swal.fire({
      title: 'Konfirmasi Hapus',
      text: 'Apakah Anda yakin ingin menghapus data master kolam renang ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f43f5e',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        await api.deleteSwimmingPool(poolId);
        Swal.fire('Berhasil!', 'Data kolam renang berhasil dihapus.', 'success');
        onReloadData();
      } catch (err: any) {
        Swal.fire('Gagal!', err.message || 'Gagal menghapus data kolam renang.', 'error');
      }
    }
  };

  const handleQuickAddCategory = async () => {
    const { value: categoryName } = await Swal.fire({
      title: 'Tambah Kategori Event Baru',
      input: 'text',
      inputLabel: 'Nama Kategori Event:',
      inputPlaceholder: 'Contoh: Workshop, Fun Swimming, dll.',
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#06b6d4',
      inputValidator: (value) => {
        if (!value) {
          return 'Nama kategori tidak boleh kosong!';
        }
      }
    });

    if (categoryName) {
      try {
        const res = await api.addEventCategory(categoryName);
        if (res) {
          Swal.fire('Berhasil!', `Kategori "${categoryName}" berhasil ditambahkan.`, 'success');
          onReloadData();
        }
      } catch (err: any) {
        Swal.fire('Gagal!', err.message || 'Gagal menambahkan kategori.', 'error');
      }
    }
  };

  // ACTION: UPDATE TIME SLOT MAX SLOTS
  const handleUpdateScheduleSlotMax = (coachId: string, dayName: string, timeStr: string, newMax: number) => {
    const updated = coaches.map(c => {
      if (c.id === coachId) {
        return {
          ...c,
          schedule: c.schedule.map(d => {
            if (d.day === dayName) {
              return {
                ...d,
                timeSlots: d.timeSlots.map(ts => {
                  if (ts.time === timeStr) {
                    return { ...ts, maxSlots: newMax };
                  }
                  return ts;
                })
              };
            }
            return d;
          })
        };
      }
      return c;
    });
    onUpdateCoaches(updated);
  };

  // ACTION: REMOVE SLOT
  const handleRemoveScheduleSlot = (coachId: string, dayName: string, timeStr: string) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: `Apakah Anda yakin ingin menghapus slot waktu ${timeStr} pada hari ${dayName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = coaches.map(c => {
          if (c.id === coachId) {
            return {
              ...c,
              schedule: c.schedule.map(d => {
                if (d.day === dayName) {
                  return {
                    ...d,
                    timeSlots: d.timeSlots.filter(ts => ts.time !== timeStr)
                  };
                }
                return d;
              })
            };
          }
          return c;
        });
        onUpdateCoaches(updated);
        Swal.fire({
          title: 'Terhapus!',
          text: 'Slot jadwal berhasil dihapus.',
          icon: 'success',
          confirmButtonColor: '#06b6d4'
        });
      }
    });
  };

  // ACTION: MANAGE EVENTS (ADD/EDIT/DELETE)
  const handleOpenAddEventModal = () => {
    setEditingEvent(null);
    setNewEventTitle('');
    setNewEventCategory('Fun Swimming');
    setNewEventDate('');
    setNewEventImageUrl('/images/event_fun.png');
    setNewEventDescription('');
    setShowEventModal(true);
  };

  const handleOpenEditEventModal = (event: EventItem) => {
    setEditingEvent(event);
    setNewEventTitle(event.title);
    setNewEventCategory(event.category);
    setNewEventDate(event.date);
    setNewEventImageUrl(event.imageUrl);
    setNewEventDescription(event.description);
    setShowEventModal(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate || !newEventDescription) {
      Swal.fire({
        title: 'Perhatian!',
        text: 'Harap lengkapi semua data event!',
        icon: 'warning',
        confirmButtonColor: '#06b6d4'
      });
      return;
    }

    if (editingEvent) {
      // Edit event
      const updated = events.map(ev => {
        if (ev.id === editingEvent.id) {
          return {
            ...ev,
            title: newEventTitle,
            category: newEventCategory,
            date: newEventDate,
            description: newEventDescription,
            imageUrl: newEventImageUrl
          };
        }
        return ev;
      });
      onUpdateEvents(updated);
      Swal.fire({
        title: 'Berhasil!',
        text: 'Event berhasil diperbarui!',
        icon: 'success',
        confirmButtonColor: '#06b6d4'
      });
    } else {
      // Add new event
      const newEvent: EventItem = {
        id: `event-${Date.now()}`,
        title: newEventTitle,
        category: newEventCategory,
        date: newEventDate,
        description: newEventDescription,
        imageUrl: newEventImageUrl
      };
      onUpdateEvents([...events, newEvent]);
      Swal.fire({
        title: 'Berhasil!',
        text: 'Event baru berhasil ditambahkan!',
        icon: 'success',
        confirmButtonColor: '#06b6d4'
      });
    }

    setShowEventModal(false);
  };

  const handleDeleteEvent = (eventId: string) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: 'Apakah Anda yakin ingin menghapus kegiatan/event ini dari website?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        onUpdateEvents(events.filter(e => e.id !== eventId));
        Swal.fire({
          title: 'Terhapus!',
          text: 'Event berhasil dihapus.',
          icon: 'success',
          confirmButtonColor: '#06b6d4'
        });
      }
    });
  };

  // GET H-1 SCHEDULE LIST BASED ON SELECTED DAY
  const getTomorrowDayName = (todayName: string) => {
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const idx = days.indexOf(todayName);
    return days[(idx + 1) % days.length];
  };

  const esokHari = getTomorrowDayName(simulatedToday);

  const membersScheduledTomorrow = members.filter(m => {
    if (m.status !== 'Aktif' && m.status !== 'Paket Hampir Habis') return false;
    
    const day1Match = m.scheduleDay === esokHari;
    const day2Match = m.scheduleFrequency === '2x Seminggu' && m.scheduleDay2 === esokHari;
    return day1Match || day2Match;
  });

  // GENERATE H-1 WHATSAPP LINK
  const getWhatsAppH1Link = (member: Member) => {
    const coach = coaches.find(c => c.id === member.coachId);
    const jam = member.scheduleDay === esokHari ? member.scheduleTime : member.scheduleTime2;
    const msg = `Halo Bapak/Ibu Wali dari ${member.student.fullName},\n\nKami dari *Private Renang Tirta Barokah* ingin mengingatkan bahwa besok (*Hari ${esokHari}*) anak Anda memiliki jadwal latihan rutin berenang bersama *Coach ${coach?.name || 'Latihan'}* pada pukul *${jam} WIB*.\n\nMohon hadir tepat waktu dengan membawa baju renang & perlengkapan. Sampai jumpa di kolam renang! 🏊‍♂️`;
    return `https://wa.me/${member.parent.whatsapp}?text=${encodeURIComponent(msg)}`;
  };

  // GENERATE EXPIRING PACKAGE WHATSAPP LINK
  const getWhatsAppExpiringLink = (member: Member) => {
    const msg = `Halo Bapak/Ibu Wali dari ${member.student.fullName},\n\nKami menginformasikan bahwa paket sesi latihan berenang anak Anda di *Private Renang Tirta Barokah* saat ini tinggal *${member.sessionsLeft} sesi*.\n\nApakah latihan ingin dilanjutkan dengan perpanjangan paket baru, atau ingin dihentikan dahulu? Harap konfirmasi agar kami dapat menyesuaikan slot kuota pendaftaran pelatih. Terima kasih!`;
    return `https://wa.me/${member.parent.whatsapp}?text=${encodeURIComponent(msg)}`;
  };

  // FILTERED STUDENT LIST
  const filteredPeserta = members.filter(m => {
    const coach = coaches.find(c => c.id === m.coachId);
    const coachName = coach ? coach.name : '';
    const matchesSearch = m.student.fullName.toLowerCase().includes(searchPeserta.toLowerCase()) || 
                          m.parent.fatherMotherName.toLowerCase().includes(searchPeserta.toLowerCase()) ||
                          m.parent.whatsapp.includes(searchPeserta) ||
                          m.id.toLowerCase().includes(searchPeserta.toLowerCase()) ||
                          coachName.toLowerCase().includes(searchPeserta.toLowerCase());
    
    if (pesertaFilter === 'semua') return matchesSearch;
    if (pesertaFilter === 'aktif') return matchesSearch && (m.status === 'Aktif' || m.status === 'Paket Hampir Habis');
    if (pesertaFilter === 'hampir-habis') return matchesSearch && m.sessionsLeft <= 2 && m.status !== 'Menunggu Verifikasi';
    if (pesertaFilter === 'menunggu-verifikasi') return matchesSearch && m.status === 'Menunggu Verifikasi';
    return matchesSearch;
  });

  // CHART DATA COMPILATION
  const revenueByCoachData = coaches.map(c => {
    const revenue = members
      .filter(m => m.coachId === c.id && m.payment.status === 'Pembayaran Berhasil')
      .reduce((sum, m) => sum + m.payment.amount, 0);
    return {
      name: c.name,
      pendapatan: revenue
    };
  });

  const memberGrowthData = [
    { bulan: 'Jan', member: 4 },
    { bulan: 'Feb', member: 6 },
    { bulan: 'Mar', member: 9 },
    { bulan: 'Apr', member: 11 },
    { bulan: 'Mei', member: 14 },
    { bulan: 'Jun', member: members.length + 3 },
    { bulan: 'Jul', member: members.length + 8 }
  ];

  // DATE FILTER UTILITY
  const isWithinDateFilter = (dateStr: string) => {
    if (dateFilter === 'semua') return true;
    if (!dateStr) return false;
    
    // Normalize date string for parsing
    const normalizedDate = dateStr.replace(' ', 'T');
    const date = new Date(normalizedDate);
    if (isNaN(date.getTime())) return false;
    
    const now = new Date();
    
    // Clear hours for day-based comparison
    const dateCopy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowCopy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = nowCopy.getTime() - dateCopy.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (dateFilter === 'hari-ini') {
      return dateCopy.getTime() === nowCopy.getTime();
    }
    if (dateFilter === 'seminggu') {
      return diffDays <= 7 && diffDays >= 0;
    }
    if (dateFilter === 'sebulan') {
      return diffDays <= 30 && diffDays >= 0;
    }
    if (dateFilter === 'setahun') {
      return diffDays <= 365 && diffDays >= 0;
    }
    if (dateFilter === 'kustom') {
      let isWithin = true;
      if (customStartDate) {
        const start = new Date(customStartDate);
        const startCopy = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        if (dateCopy.getTime() < startCopy.getTime()) {
          isWithin = false;
        }
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        const endCopy = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        if (dateCopy.getTime() > endCopy.getTime()) {
          isWithin = false;
        }
      }
      return isWithin;
    }
    return true;
  };

  // FILTERED DASHBOARD VARIABLES
  const activeMembersFiltered = members.filter(m => 
    (m.status === 'Aktif' || m.status === 'Paket Hampir Habis') && 
    isWithinDateFilter(m.registeredAt)
  );
  
  const pendingPaymentsFiltered = members.filter(m => 
    (m.status === 'Menunggu Verifikasi' || m.payment.status === 'Menunggu Verifikasi') && 
    isWithinDateFilter(m.registeredAt)
  );
  
  const expiringMembersFiltered = members.filter(m => 
    m.sessionsLeft <= 2 && 
    m.status !== 'Menunggu Verifikasi' && 
    isWithinDateFilter(m.registeredAt)
  );
  
  const totalRevenueFiltered = members
    .filter(m => m.payment.status === 'Pembayaran Berhasil' && isWithinDateFilter(m.payment.date))
    .reduce((sum, m) => sum + m.payment.amount, 0);

  const revenueByCoachDataFiltered = coaches.map(c => {
    const revenue = members
      .filter(m => m.coachId === c.id && m.payment.status === 'Pembayaran Berhasil' && isWithinDateFilter(m.payment.date))
      .reduce((sum, m) => sum + m.payment.amount, 0);
    return {
      name: c.name,
      pendapatan: revenue
    };
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative">
      {/* Floating Mobile Navigation Button (Always accessible regardless of scroll position) */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[99]">
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white font-extrabold px-4 py-3 rounded-full shadow-2xl flex items-center gap-2.5 ring-4 ring-cyan-500/20 transition cursor-pointer"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
          <span className="text-xs tracking-wider uppercase font-black">Menu</span>
        </button>
      </div>

      {/* Backdrop for Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-xs"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 lg:sticky lg:top-20 z-50 lg:z-10
        w-72 lg:w-64 bg-white p-5 rounded-r-2xl lg:rounded-2xl border-r lg:border border-slate-200/60 lg:border-slate-100 
        flex flex-col justify-between shadow-xl lg:shadow-sm
        transition-transform duration-300 ease-in-out h-dvh max-h-dvh overflow-y-auto lg:h-fit lg:max-h-[calc(100vh-6rem)]
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="space-y-6">
          {/* Mobile Drawer Header */}
          <div className="lg:hidden flex justify-between items-center pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-xs text-slate-800 tracking-wider uppercase">Menu {isOperator ? 'Operator' : 'Admin'}</h3>
                <p className="text-[10px] text-slate-400 font-semibold font-mono">TIRTA BAROKAH</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Desktop Sidebar Title */}
          <div className="hidden lg:flex items-center gap-2 pb-4 border-b border-slate-100">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-xs text-slate-800 tracking-wider uppercase">Menu {isOperator ? 'Operator' : 'Admin'}</h3>
              <p className="text-[10px] text-slate-400 font-semibold font-mono">TIRTA BAROKAH</p>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="space-y-1">
            {/* 1. Dashboard (Admin Only) */}
            {!isOperator && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dashboard');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer text-left ${
                  activeTab === 'dashboard'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10 font-black'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                  <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${activeTab === 'dashboard' ? 'bg-white/15 text-white' : 'text-cyan-600 bg-cyan-50'}`}>
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <span className="truncate text-xs leading-tight">Dashboard</span>
                </div>
              </button>
            )}

            {/* 2. Verifikasi Pembayaran */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('verifikasi');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer text-left ${
                activeTab === 'verifikasi'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10 font-black'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${activeTab === 'verifikasi' ? 'bg-white/15 text-white' : 'text-amber-600 bg-amber-50'}`}>
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="truncate text-xs leading-tight">Verifikasi Pembayaran</span>
              </div>
              {pendingPayments.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide font-mono shrink-0 ml-1.5 ${
                  activeTab === 'verifikasi' ? 'bg-white text-cyan-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {pendingPayments.length}
                </span>
              )}
            </button>

            {/* 3. Manajemen Siswa */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('peserta');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer text-left ${
                activeTab === 'peserta'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10 font-black'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${activeTab === 'peserta' ? 'bg-white/15 text-white' : 'text-cyan-600 bg-cyan-50'}`}>
                  <Users className="w-4 h-4" />
                </div>
                <span className="truncate text-xs leading-tight">Manajemen Siswa</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide font-mono shrink-0 ml-1.5 ${
                activeTab === 'peserta' ? 'bg-white text-cyan-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {members.length}
              </span>
            </button>

            {/* 4. Pelatih */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('pelatih');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer text-left ${
                activeTab === 'pelatih'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/10 font-black'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${activeTab === 'pelatih' ? 'bg-white/15 text-white' : 'text-teal-600 bg-teal-50'}`}>
                  <Award className="w-4 h-4" />
                </div>
                <span className="truncate text-xs leading-tight">Pelatih</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide font-mono shrink-0 ml-1.5 ${
                activeTab === 'pelatih' ? 'bg-white text-teal-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {coaches.length}
              </span>
            </button>

            {/* 5. Izin Pelatih */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('absensi_coach');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer text-left ${
                activeTab === 'absensi_coach'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/10 font-black'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${activeTab === 'absensi_coach' ? 'bg-white/15 text-white' : 'text-rose-600 bg-rose-50'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="truncate text-xs leading-tight">Izin Pelatih</span>
              </div>
              {absences.filter(a => a.status === 'Menunggu').length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide font-mono shrink-0 ml-1.5 ${
                  activeTab === 'absensi_coach' ? 'bg-white text-rose-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {absences.filter(a => a.status === 'Menunggu').length}
                </span>
              )}
            </button>

            {/* 6. Jadwal & Reminder */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('reminder');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer text-left ${
                activeTab === 'reminder'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10 font-black'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${activeTab === 'reminder' ? 'bg-white/15 text-white' : 'text-indigo-600 bg-indigo-50'}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <span className="truncate text-xs leading-tight">Jadwal & Reminder</span>
              </div>
            </button>

            {/* 7. Event & Berita */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('events');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer text-left ${
                activeTab === 'events'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10 font-black'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${activeTab === 'events' ? 'bg-white/15 text-white' : 'text-rose-600 bg-rose-50'}`}>
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="truncate text-xs leading-tight">Event/Berita</span>
              </div>
              {events.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide font-mono shrink-0 ml-1.5 ${
                  activeTab === 'events' ? 'bg-white text-cyan-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {events.length}
                </span>
              )}
            </button>

            {/* 8. Kolam Renang (Operator Allowed) */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('kolam_renang');
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer text-left ${
                activeTab === 'kolam_renang'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10 font-black'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${activeTab === 'kolam_renang' ? 'bg-white/15 text-white' : 'text-cyan-600 bg-cyan-50'}`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="truncate text-xs leading-tight">Kolam Renang</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide font-mono shrink-0 ml-1.5 ${
                activeTab === 'kolam_renang' ? 'bg-white text-cyan-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {swimmingPools.length}
              </span>
            </button>

            {/* 9. Laporan Keuangan (Admin Only) */}
            {!isOperator && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('laporan');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer text-left ${
                  activeTab === 'laporan'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10 font-black'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                  <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${activeTab === 'laporan' ? 'bg-white/15 text-white' : 'text-emerald-600 bg-emerald-50'}`}>
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <span className="truncate text-xs leading-tight">Laporan Keuangan</span>
                </div>
              </button>
            )}

            {/* 10. Log Aktivitas (Admin Only) */}
            {!isOperator && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('audit_logs');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer text-left ${
                  activeTab === 'audit_logs'
                    ? 'bg-slate-700 text-white shadow-md shadow-slate-700/10 font-black'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                  <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${activeTab === 'audit_logs' ? 'bg-white/15 text-white' : 'text-slate-600 bg-slate-100'}`}>
                    <List className="w-4 h-4" />
                  </div>
                  <span className="truncate text-xs leading-tight">Log Aktivitas</span>
                </div>
              </button>
            )}

            {/* 11. Kelola Profil & Level (Admin Only - At the very bottom) */}
            {!isOperator && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('pengaturan');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer text-left ${
                  activeTab === 'pengaturan'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/10 font-black'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5">
                  <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${activeTab === 'pengaturan' ? 'bg-white/15 text-white' : 'text-violet-600 bg-violet-50'}`}>
                    <Settings className="w-4 h-4" />
                  </div>
                  <span className="truncate text-xs leading-tight">Kelola Profil & Level</span>
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer info */}
        <div className="pt-4 border-t border-slate-100 mt-6 space-y-2">
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span>Mode: {isOperator ? 'Operator Sistem' : 'Administrator'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 space-y-8 min-w-0">

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        
        {/* TAB 0: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Dashboard Utama</h3>
                <p className="text-slate-500 text-xs">Informasi ringkas mengenai status keuangan, siswa, pelatih, dan aktivitas renang Tirta Barokah.</p>
              </div>
              
              {/* Date Filter Selector - Mobile Select & Desktop Pills */}
              <div className="sm:hidden w-full mt-2">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 font-bold text-xs text-slate-800 px-3 py-2.5 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 cursor-pointer"
                >
                  <option value="hari-ini">Rentang: Hari Ini</option>
                  <option value="seminggu">Rentang: Seminggu</option>
                  <option value="sebulan">Rentang: Sebulan</option>
                  <option value="setahun">Rentang: Setahun</option>
                  <option value="kustom">Rentang: Pilih Tanggal (Kustom)</option>
                  <option value="semua">Rentang: Semua Waktu</option>
                </select>
              </div>

              <div className="hidden sm:flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl shadow-xs border border-slate-200/50">
                {[
                  { id: 'hari-ini', label: 'Hari Ini' },
                  { id: 'seminggu', label: 'Seminggu' },
                  { id: 'sebulan', label: 'Sebulan' },
                  { id: 'setahun', label: 'Setahun' },
                  { id: 'kustom', label: 'Pilih Tanggal' },
                  { id: 'semua', label: 'Semua Waktu' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setDateFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      dateFilter === f.id
                        ? 'bg-white text-cyan-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Picker Range Input Box */}
            {dateFilter === 'kustom' && (
              <div className="flex flex-wrap items-center gap-3 bg-cyan-50/50 border border-cyan-100/80 p-3 rounded-2xl w-max">
                <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wide">Rentang Tanggal:</span>
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-hidden focus:border-cyan-500 font-mono font-bold text-slate-750"
                  />
                  <span className="text-slate-400 text-[10px]">s/d</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-hidden focus:border-cyan-500 font-mono font-bold text-slate-750"
                  />
                  {(customStartDate || customEndDate) && (
                    <button
                      onClick={() => {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="text-[10px] bg-cyan-100 hover:bg-cyan-200 text-cyan-800 font-black px-2 py-1 rounded-md transition cursor-pointer"
                      title="Reset Pilihan Tanggal"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 4 Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2.5 sm:gap-4 hover:shadow-md transition duration-200 min-w-0">
                <div className="p-2 sm:p-3 bg-cyan-50 rounded-xl text-cyan-600 shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-tight truncate">Total Pendapatan</p>
                  <h4 className="text-xs sm:text-lg font-black text-slate-800 truncate" title={`Rp ${totalRevenueFiltered.toLocaleString('id-ID')}`}>
                    Rp {totalRevenueFiltered.toLocaleString('id-ID')}
                  </h4>
                </div>
              </div>

              <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2.5 sm:gap-4 hover:shadow-md transition duration-200 min-w-0">
                <div className="p-2 sm:p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
                  <Users className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-tight truncate">Member Aktif</p>
                  <h4 className="text-xs sm:text-lg font-black text-slate-800 truncate">
                    {activeMembersFiltered.length} Anak
                  </h4>
                </div>
              </div>

              <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2.5 sm:gap-4 hover:shadow-md transition duration-200 text-left cursor-pointer min-w-0" onClick={() => setActiveTab('verifikasi')}>
                <div className="p-2 sm:p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-tight truncate">Butuh Verifikasi</p>
                  <h4 className="text-xs sm:text-lg font-black text-slate-800 truncate">
                    {pendingPaymentsFiltered.length} Akun
                  </h4>
                </div>
              </div>

              <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2.5 sm:gap-4 hover:shadow-md transition duration-200 text-left cursor-pointer min-w-0" onClick={() => { setActiveTab('peserta'); setPesertaFilter('hampir-habis'); }}>
                <div className="p-2 sm:p-3 bg-rose-50 rounded-xl text-rose-600 shrink-0">
                  <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-tight truncate">Paket Habis / Kurang</p>
                  <h4 className="text-xs sm:text-lg font-black text-slate-800 truncate">
                    {expiringMembersFiltered.length} Siswa
                  </h4>
                </div>
              </div>
            </div>

            {/* Quick overview of charts */}
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {/* Box 1: Revenue per coach */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1">
                  <PieIcon className="w-4 h-4 text-cyan-600" /> Distribusi Pendapatan per Pelatih
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByCoachDataFiltered}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => `Rp ${v.toLocaleString('id-ID')}`} />
                      <Bar dataKey="pendapatan" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Box 2: Member Growth */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-cyan-600" /> Tren Pertumbuhan Member Baru
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={memberGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="bulan" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="member" stroke="#4f46e5" fill="#e0e7ff" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Quick Lists / Overview */}
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              {/* Recent Pending Payments */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Persetujuan Pembayaran Terbaru</span>
                  <button onClick={() => setActiveTab('verifikasi')} className="text-[10px] text-cyan-600 hover:underline">Lihat Semua ({pendingPaymentsFiltered.length})</button>
                </h4>
                {pendingPaymentsFiltered.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">Tidak ada pembayaran tertunda pada periode ini.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingPaymentsFiltered.slice(0, 3).map(m => (
                      <div key={m.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                        <div>
                          <p className="font-bold text-xs text-slate-800">{m.student.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{m.id} • {m.payment.method}</p>
                        </div>
                        <span className="font-bold text-xs text-cyan-700">Rp {m.payment.amount.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expiring Sessions */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Sesi Paket Murid Hampir Habis</span>
                  <button onClick={() => { setActiveTab('peserta'); setPesertaFilter('hampir-habis'); }} className="text-[10px] text-cyan-600 hover:underline">Lihat Semua ({expiringMembersFiltered.length})</button>
                </h4>
                {expiringMembersFiltered.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">Semua murid memiliki sesi yang cukup pada periode ini.</p>
                ) : (
                  <div className="space-y-2">
                    {expiringMembersFiltered.slice(0, 3).map(m => (
                      <div key={m.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                        <div>
                          <p className="font-bold text-xs text-slate-800">{m.student.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{m.id}</p>
                        </div>
                        <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Sisa {m.sessionsLeft} Sesi
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}



        {/* TAB 1: VERIFIKASI PEMBAYARAN */}
        {activeTab === 'verifikasi' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Menunggu Verifikasi Pendaftaran & Pembayaran</h3>
              <p className="text-slate-500 text-xs">Peserta yang baru mendaftar atau memperpanjang paket lewat BNI harus diverifikasi oleh admin secara manual.</p>
            </div>

            {/* Filter Tanggal Verifikasi */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col md:flex-row items-end gap-3 text-xs text-slate-700">
              <div className="space-y-1 w-full md:w-auto">
                <label className="text-[10px] font-bold text-slate-500 block uppercase">Tanggal Daftar Mulai</label>
                <input
                  type="date"
                  value={verifyStartDate}
                  onChange={(e) => setVerifyStartDate(e.target.value)}
                  className="w-full md:w-44 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1 w-full md:w-auto">
                <label className="text-[10px] font-bold text-slate-500 block uppercase">Tanggal Daftar Selesai</label>
                <input
                  type="date"
                  value={verifyEndDate}
                  onChange={(e) => setVerifyEndDate(e.target.value)}
                  className="w-full md:w-44 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                />
              </div>
              {(verifyStartDate || verifyEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setVerifyStartDate('');
                    setVerifyEndDate('');
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-750 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {(() => {
              const filteredPending = pendingPayments.filter(m => {
                if (!m.registeredAt) return false;
                const regDate = m.registeredAt.substring(0, 10);
                if (verifyStartDate && regDate < verifyStartDate) return false;
                if (verifyEndDate && regDate > verifyEndDate) return false;
                return true;
              });

              return filteredPending.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 mt-2 font-semibold">Tidak ada pembayaran menunggu verifikasi pada rentang tanggal ini.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredPending.map((member) => {
                    const coach = coaches.find(c => c.id === member.coachId);
                    return (
                      <div key={member.id} className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-cyan-200 transition">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-800">{member.student.fullName}</span>
                            <span className="text-[10px] font-mono bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded font-bold">{member.id}</span>
                          </div>
                          <div className="text-xs text-slate-500 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                            <p>📅 Tgl Daftar: <strong className="text-slate-700 font-mono">{member.registeredAt ? member.registeredAt.substring(0, 16).replace('T', ' ') : '-'}</strong></p>
                            <p>👤 Wali: <strong className="text-slate-700">{member.parent.fatherMotherName}</strong></p>
                            <p>📱 WhatsApp: <strong className="text-slate-700 font-mono">{member.parent.whatsapp}</strong></p>
                            <p>🏊 Tipe: <strong className="text-cyan-700">{member.coachType}</strong></p>
                            <p>🏷️ Paket: <strong className="text-slate-700">{member.packageId}</strong></p>
                            <p>🗓️ Jadwal: <strong className="text-slate-700">{member.scheduleDay} @ {member.scheduleTime}</strong></p>
                            {member.scheduleFrequency === '2x Seminggu' && (
                              <p>🗓️ Jadwal 2: <strong className="text-slate-700">{member.scheduleDay2} @ {member.scheduleTime2}</strong></p>
                            )}
                          </div>
                          <div className="text-xs bg-cyan-50/50 text-cyan-800 p-2.5 rounded border border-cyan-100 flex items-center gap-1.5 w-max">
                            <DollarSign className="w-4 h-4 text-cyan-600" />
                            <span>Wajib Bayar: <strong>Rp {member.payment.amount.toLocaleString('id-ID')}</strong> ({member.payment.method})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <a 
                            href={`https://wa.me/${member.parent.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 md:flex-none border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-center font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Phone className="w-4 h-4" /> Hubungi Wali
                          </a>
                          <button
                            onClick={() => handleVerifyPayment(member.id, false)}
                            className="p-2.5 hover:bg-rose-50 text-rose-600 rounded-xl transition border border-slate-200"
                            title="Tolak Pembayaran"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleVerifyPayment(member.id, true)}
                            className="flex-1 md:flex-none bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-cyan-600/10"
                          >
                            <Check className="w-4 h-4" /> Setujui & Aktifkan
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 2: MANAJEMEN PESERTA */}
        {activeTab === 'peserta' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Daftar Anggota / Siswa Aktif</h3>
                <p className="text-slate-500 text-xs">Kelola kehadiran absensi, sisa sesi, dan perpanjangan atau stop paket latihan.</p>
              </div>

              {/* Action and Filter buttons */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto md:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingStudent(null);
                    resetStudentForm();
                    setShowStudentModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition shadow-md shadow-emerald-600/10 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Tambah Siswa Baru
                </button>

                <div className="flex flex-wrap gap-1.5">
                  {(['semua', 'aktif', 'hampir-habis', 'menunggu-verifikasi'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setPesertaFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                        pesertaFilter === filter
                          ? 'bg-cyan-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filter === 'semua' ? 'Semua' : filter === 'aktif' ? 'Aktif' : filter === 'hampir-habis' ? 'Sesi Hampir Habis' : 'Butuh Verifikasi'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari siswa berdasarkan nama atau nomor ID..."
                value={searchPeserta}
                onChange={(e) => setSearchPeserta(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-sm text-slate-800"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-3.5">ID & Nama Siswa</th>
                    <th className="p-3.5">Nama Orang Tua</th>
                    <th className="p-3.5">Coach & Sesi</th>
                    <th className="p-3.5">Sisa Paket</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPeserta.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium italic">Tidak ada siswa yang sesuai pencarian.</td>
                    </tr>
                  ) : (
                    filteredPeserta.map((member) => {
                      const coach = coaches.find(c => c.id === member.coachId);
                      const isExpiring = member.sessionsLeft <= 2;
                      return (
                        <tr key={member.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              {member.student.fullName}
                              {member.isActive === false && (
                                <span className="text-[8px] bg-rose-50 border border-rose-200 text-rose-600 px-1 py-0.5 rounded font-bold uppercase tracking-wider">Nonaktif</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[9.5px] text-slate-400">
                              <span>ID: {member.id}</span>
                              <span>•</span>
                              <span>Daftar: {member.registeredAt ? member.registeredAt.substring(0, 10) : '-'}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-700">{member.parent.fatherMotherName}</div>
                            <div className="font-mono text-[10px] text-slate-500 mt-0.5">{member.parent.whatsapp}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-cyan-800">{coach?.name || 'Latihan'}</div>
                            <div className="text-slate-500 mt-0.5">
                              {member.scheduleDay} @ {member.scheduleTime} WIB 
                              {member.scheduleFrequency === '2x Seminggu' && ` & ${member.scheduleDay2} @ ${member.scheduleTime2} WIB`}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1">
                              <span className={`font-black text-sm ${isExpiring ? 'text-rose-600' : 'text-slate-800'}`}>
                                {member.sessionsLeft}
                              </span>
                              <span className="text-slate-400">/ {member.sessionsTotal}</span>
                            </div>
                            {isExpiring && (
                              <span className="inline-block bg-rose-50 text-rose-700 border border-rose-100 text-[8px] px-1.5 py-0.5 rounded-sm font-semibold mt-1">
                                Perlu Perpanjang!
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              member.status === 'Aktif'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                : member.status === 'Paket Hampir Habis' || member.sessionsLeft <= 2
                                ? 'bg-rose-50 text-rose-800 border-rose-100'
                                : 'bg-amber-50 text-amber-800 border-amber-100'
                            }`}>
                              {member.sessionsLeft <= 2 && member.status !== 'Menunggu Verifikasi' ? 'Sesi Hampir Habis' : member.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-y-1">
                            <div className="flex gap-2 justify-end">
                              {/* EDIT ACTION (UPDATE) */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(member)}
                                className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
                                title="Edit Detail Siswa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* ATTENDANCE/HISTORY ACTION */}
                              {member.status !== 'Menunggu Verifikasi' && (
                                <button
                                  onClick={() => handleLogAttendance(member.id)}
                                  className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition cursor-pointer font-bold ${
                                    member.status !== 'Selesai' && member.sessionsLeft > 0 && member.isActive !== false
                                      ? 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                  title={member.status !== 'Selesai' && member.sessionsLeft > 0 && member.isActive !== false ? 'Log Hadir Siswa (Kurangi 1 Sesi)' : 'Lihat Riwayat Latihan'}
                                >
                                  {member.status !== 'Selesai' && member.sessionsLeft > 0 && member.isActive !== false ? (
                                    <>
                                      <CheckSquare className="w-3.5 h-3.5" /> Absen Sesi
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3.5 h-3.5" /> Lihat Riwayat
                                    </>
                                  )}
                                </button>
                              )}

                              {/* STOP PACKET / DELETE USER */}
                              <button
                                onClick={() => handleDeleteMember(member.id)}
                                className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                                title="Stop Latihan (Hapus Member)"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* CRUD Student Modal (Add/Edit) */}
            {showStudentModal && (
              <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="relative bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                      <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-cyan-600" />
                        {editingStudent ? `Edit Detail Siswa: ${editingStudent.student.fullName}` : 'Tambah Siswa / Anggota Baru'}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowStudentModal(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body / Scrollable Form */}
                  <form onSubmit={handleSaveStudent} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
                    {!editingStudent && (
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3.5 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <label className="font-extrabold text-slate-700 uppercase tracking-wide text-[10px]">Mode Pendaftaran:</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                              <input
                                type="radio"
                                name="regMode"
                                checked={registrationMode === 'baru'}
                                onChange={() => {
                                  setRegistrationMode('baru');
                                  resetStudentForm();
                                }}
                                className="text-cyan-600 focus:ring-cyan-500/20"
                              />
                              Siswa Baru / Anggota Baru
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                              <input
                                type="radio"
                                name="regMode"
                                checked={registrationMode === 'lama'}
                                onChange={() => {
                                  setRegistrationMode('lama');
                                  resetStudentForm();
                                  setRegistrationMode('lama');
                                }}
                                className="text-cyan-600 focus:ring-cyan-500/20"
                              />
                              Siswa Lama (Daftar Ulang)
                            </label>
                          </div>
                        </div>

                        {registrationMode === 'lama' && (
                          <div className="space-y-1.5 border-t border-slate-200 pt-3 relative">
                            <label className="font-bold text-slate-700 block">Pilih Siswa Lama <span className="text-rose-500">*</span></label>
                            <div 
                              onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                              className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl flex items-center justify-between cursor-pointer font-bold text-slate-800 text-xs"
                            >
                              <span>
                                {selectedExistingMemberId 
                                  ? (() => {
                                      const found = members.find(m => m.id === selectedExistingMemberId);
                                      return found 
                                        ? `${found.student.fullName} (Ortu: ${found.parent.fatherMotherName} - ${found.parent.whatsapp})` 
                                        : '-- Pilih Siswa --';
                                    })()
                                  : '-- Pilih Siswa --'}
                              </span>
                              <span className="text-slate-400">▼</span>
                            </div>

                            {isStudentDropdownOpen && (
                              <div className="absolute z-[60] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto p-2 space-y-2">
                                <input
                                  type="text"
                                  placeholder="Cari nama siswa, orang tua, atau ID..."
                                  value={studentSearchQuery}
                                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs focus:outline-hidden font-semibold"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="space-y-0.5">
                                  {(() => {
                                    const uniquePairs: { [key: string]: Member } = {};
                                    members.forEach(m => {
                                      const key = `${m.student.fullName.trim().toLowerCase()}|${m.parent.whatsapp.trim()}`;
                                      if (!uniquePairs[key]) {
                                        uniquePairs[key] = m;
                                      }
                                    });
                                    const sortedPairs = Object.values(uniquePairs)
                                      .sort((a, b) => a.student.fullName.localeCompare(b.student.fullName));
                                      
                                    const filtered = sortedPairs.filter(m => 
                                      m.student.fullName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                      m.parent.fatherMotherName.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                      m.id.toLowerCase().includes(studentSearchQuery.toLowerCase())
                                    );

                                    if (filtered.length === 0) {
                                      return <div className="text-center py-2 text-slate-400 italic">Siswa tidak ditemukan</div>;
                                    }

                                    return filtered.map(m => (
                                      <div
                                        key={m.id}
                                        onClick={() => {
                                          setSelectedExistingMemberId(m.id);
                                          setStudentName(m.student.fullName);
                                          setStudentGender(m.student.gender);
                                          setStudentDob(m.student.dob);
                                          setStudentAge(calculateAge(m.student.dob));
                                          setStudentIllness(m.student.illnessHistory || '');
                                          setStudentHasSwum(m.student.hasSwumBefore);
                                          setParentName(m.parent.fatherMotherName);
                                          setParentWhatsapp(m.parent.whatsapp);
                                          setIsStudentDropdownOpen(false);
                                          setStudentSearchQuery('');
                                        }}
                                        className={`px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 text-xs flex justify-between items-center ${
                                          selectedExistingMemberId === m.id ? 'bg-cyan-50 text-cyan-700 font-bold' : 'text-slate-700 font-medium'
                                        }`}
                                      >
                                        <span>{m.student.fullName} (Ortu: {m.parent.fatherMotherName})</span>
                                        <span className="font-mono text-[10px] text-slate-400">ID: {m.id}</span>
                                      </div>
                                    ));
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Data Orang Tua & Siswa (Text only for Siswa Lama, inputs for Siswa Baru or editing) */}
                    {registrationMode === 'lama' && !editingStudent ? (
                      selectedExistingMemberId && (
                        <div className="bg-slate-50 border border-slate-200/85 rounded-2xl p-5 space-y-5 shadow-xs">
                          <div className="border-b border-slate-200/60 pb-2.5 flex justify-between items-center">
                            <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1">
                              📋 Informasi Profil Siswa Terpilih
                            </span>
                            <span className="text-[10px] bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded font-black font-mono">
                              ID: {selectedExistingMemberId}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Data Orang Tua */}
                            <div className="space-y-3 bg-white border border-slate-100 p-4 rounded-xl">
                              <h6 className="font-extrabold text-cyan-700 uppercase tracking-wide border-b border-cyan-50 pb-1.5 text-[10px] flex items-center gap-1">
                                👤 Orang Tua / Wali
                              </h6>
                              <div className="grid grid-cols-1 gap-2.5 text-xs">
                                <div>
                                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Nama Lengkap Wali</span>
                                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{parentName}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Nomor WhatsApp Wali</span>
                                  <span className="font-bold font-mono text-slate-800 text-sm mt-0.5 block">{parentWhatsapp}</span>
                                </div>
                              </div>
                            </div>

                            {/* Data Siswa */}
                            <div className="space-y-3 bg-white border border-slate-100 p-4 rounded-xl">
                              <h6 className="font-extrabold text-cyan-700 uppercase tracking-wide border-b border-cyan-50 pb-1.5 text-[10px] flex items-center gap-1">
                                🏊‍♂️ Detail Siswa (Anak)
                              </h6>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                                <div className="col-span-2">
                                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Nama Lengkap Anak</span>
                                  <span className="font-bold text-slate-850 text-slate-800 text-sm mt-0.5 block">{studentName}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Jenis Kelamin</span>
                                  <span className="font-bold text-slate-800 mt-0.5 block">{studentGender}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Tanggal Lahir / Umur</span>
                                  <span className="font-bold text-slate-800 mt-0.5 block">{studentDob || '-'} ({studentAge} Tahun)</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Pernah Belajar Renang?</span>
                                  <span className="font-bold text-slate-800 mt-0.5 block">{studentHasSwum ? 'Ya, Sudah Pernah' : 'Belum Pernah'}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Riwayat Penyakit</span>
                                  <span className="font-bold text-slate-800 mt-0.5 block bg-slate-50 border border-slate-100 px-2 py-1.5 rounded-lg">
                                    {studentIllness || 'Tidak Ada / Bersih'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <>
                        {/* Section 1: Orang Tua */}
                        <div className="space-y-4">
                          <h5 className="font-extrabold text-xs text-cyan-700 uppercase tracking-wider border-b border-cyan-100 pb-1.5 flex items-center gap-1">
                            👤 Data Orang Tua / Wali
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="font-bold text-slate-600">Nama Lengkap Orang Tua <span className="text-rose-500">*</span></label>
                              <input
                                type="text"
                                required
                                placeholder="Contoh: Budi Santoso"
                                value={parentName}
                                onChange={(e) => setParentName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="font-bold text-slate-600">Nomor WhatsApp Wali <span className="text-rose-500">*</span></label>
                              <input
                                type="text"
                                required
                                placeholder="Format: 628xxxxxxxxxx / 08xxxxx"
                                value={parentWhatsapp}
                                onChange={(e) => setParentWhatsapp(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Data Siswa */}
                        <div className="space-y-4">
                          <h5 className="font-extrabold text-xs text-cyan-700 uppercase tracking-wider border-b border-cyan-100 pb-1.5 flex items-center gap-1">
                            🏊‍♂️ Data Siswa (Anak)
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                              <label className="font-bold text-slate-600">Nama Lengkap Anak <span className="text-rose-500">*</span></label>
                              <input
                                type="text"
                                required
                                placeholder="Contoh: Aldi Santoso"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="font-bold text-slate-600">Jenis Kelamin <span className="text-rose-500">*</span></label>
                              <select
                                value={studentGender}
                                onChange={(e) => setStudentGender(e.target.value as any)}
                                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                              >
                                <option value="Laki-laki">Laki-laki</option>
                                <option value="Perempuan">Perempuan</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="font-bold text-slate-600">Tanggal Lahir</label>
                              <input
                                type="date"
                                value={studentDob}
                                onChange={(e) => {
                                  const dob = e.target.value;
                                  setStudentDob(dob);
                                  setStudentAge(calculateAge(dob));
                                }}
                                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="font-bold text-slate-600 font-bold text-slate-800">Umur (Tahun)</label>
                              <input
                                type="text"
                                readOnly
                                value={studentAge}
                                className="w-full bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-500 cursor-not-allowed"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="font-bold text-slate-600">Pernah Belajar Renang?</label>
                              <select
                                value={studentHasSwum ? "Pernah" : "Belum Pernah"}
                                onChange={(e) => setStudentHasSwum(e.target.value === "Pernah")}
                                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                              >
                                <option value="Belum Pernah">Belum Pernah</option>
                                <option value="Pernah">Sudah Pernah</option>
                              </select>
                            </div>
                            <div className="md:col-span-3 space-y-1.5">
                              <label className="font-bold text-slate-600">Riwayat Penyakit / Catatan Medis (Opsional)</label>
                              <input
                                type="text"
                                placeholder="Contoh: Asma ringan, tidak ada alergi air dingin"
                                value={studentIllness}
                                onChange={(e) => setStudentIllness(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Section 3: Setup Latihan */}
                    <div className="space-y-4">
                      <h5 className="font-extrabold text-xs text-cyan-700 uppercase tracking-wider border-b border-cyan-100 pb-1.5 flex items-center gap-1">
                        🗓️ Pengaturan Latihan & Jadwal
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Pelatih (Coach)</label>
                          <select
                            value={selectedCoachId}
                            onChange={(e) => {
                              const cid = e.target.value;
                              setSelectedCoachId(cid);
                              const chosenCoach = coaches.find(c => c.id === cid);
                              if (chosenCoach) {
                                setSelectedPackageId(chosenCoach.packages[0]?.id || '');
                                setSessLeft(chosenCoach.packages[0]?.sessions || 4);
                                setSessTotal(chosenCoach.packages[0]?.sessions || 4);
                                setPayAmount(chosenCoach.packages[0]?.price || 250000);
                                if (chosenCoach.schedule.length > 0) {
                                  setSchDay1(chosenCoach.schedule[0].day);
                                  if (chosenCoach.schedule[0].timeSlots.length > 0) {
                                    setSchTime1(chosenCoach.schedule[0].timeSlots[0].time);
                                  }
                                }
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-hidden"
                          >
                            {coaches.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.currentQuota}/{c.maxQuota} Slot)</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Tipe Kelas</label>
                          <select
                            value={selectedCoachType}
                            onChange={(e) => setSelectedCoachType(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-hidden"
                          >
                            <option value="Reguler">Reguler (Grup kecil)</option>
                            <option value="Privat">Privat (1-on-1)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Paket Latihan</label>
                          <select
                            value={selectedPackageId}
                            onChange={(e) => {
                              const pkgId = e.target.value;
                              setSelectedPackageId(pkgId);
                              const currentCoach = coaches.find(c => c.id === selectedCoachId) || coaches[0];
                              const pkg = currentCoach?.packages.find(p => p.id === pkgId);
                              if (pkg) {
                                setSessLeft(pkg.sessions);
                                setSessTotal(pkg.sessions);
                                setPayAmount(pkg.price);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-hidden"
                          >
                            {(coaches.find(c => c.id === selectedCoachId) || coaches[0])?.packages.map(pkg => (
                              <option key={pkg.id} value={pkg.id}>{pkg.name} (Rp {pkg.price.toLocaleString('id-ID')})</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Frekuensi Latihan</label>
                          <select
                            value={scheduleFreq}
                            onChange={(e) => setScheduleFreq(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-hidden"
                          >
                            <option value="1x Seminggu">1x Seminggu</option>
                            <option value="2x Seminggu">2x Seminggu</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Sisa Sesi Latihan</label>
                          <input
                            type="number"
                            min={0}
                            max={50}
                            value={sessLeft}
                            onChange={(e) => setSessLeft(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono font-bold text-cyan-800"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Total Sesi Paket</label>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={sessTotal}
                            onChange={(e) => setSessTotal(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono"
                          />
                        </div>

                        {/* Schedule Day 1 & Time 1 */}
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Hari Latihan 1</label>
                          <select
                            value={schDay1}
                            onChange={(e) => {
                              const day = e.target.value;
                              setSchDay1(day);
                              const currentCoach = coaches.find(c => c.id === selectedCoachId) || coaches[0];
                              const daySched = currentCoach?.schedule.find(d => d.day === day);
                              if (daySched && daySched.timeSlots.length > 0) {
                                setSchTime1(daySched.timeSlots[0].time);
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-hidden"
                          >
                            {(coaches.find(c => c.id === selectedCoachId) || coaches[0])?.schedule.map(d => (
                              <option key={d.day} value={d.day}>{d.day}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Jam Latihan 1</label>
                          <select
                            value={schTime1}
                            onChange={(e) => setSchTime1(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-hidden"
                          >
                            {((coaches.find(c => c.id === selectedCoachId) || coaches[0])?.schedule.find(d => d.day === schDay1)?.timeSlots || []).map(ts => {
                              const conf = checkScheduleSlotConflict(members, selectedCoachId, schDay1, ts.time, selectedCoachType, editingStudent?.id);
                              return (
                                <option key={ts.time} value={ts.time} disabled={conf.isConflict}>
                                  {ts.time} WIB ({ts.currentSlots}/{ts.maxSlots} terisi){conf.isConflict ? ` 🚫 Bentrok Paket ${conf.existingType}` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600 font-bold text-slate-800">Status Keaktifan Siswa</label>
                          <select
                            value={studentStatus}
                            onChange={(e) => setStudentStatus(e.target.value as any)}
                            className="w-full bg-amber-50 border border-amber-200 px-3 py-2.5 rounded-xl text-xs focus:outline-hidden font-bold text-amber-900"
                          >
                            <option value="Aktif">Aktif</option>
                            <option value="Menunggu Pembayaran">Menunggu Pembayaran</option>
                            <option value="Menunggu Verifikasi">Menunggu Verifikasi (Butuh Verifikasi)</option>
                            <option value="Paket Hampir Habis">Paket Hampir Habis</option>
                            <option value="Selesai">Selesai / Lulus</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600 block">Status Akun Siswa</label>
                          <div className="flex items-center gap-2 mt-2.5">
                            <input 
                              type="checkbox" 
                              id="member-active-checkbox"
                              checked={memberIsActive} 
                              onChange={(e) => setMemberIsActive(e.target.checked)}
                              className="w-4 h-4 rounded text-cyan-600 border-slate-350 focus:ring-cyan-500 cursor-pointer" 
                            />
                            <label htmlFor="member-active-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                              {memberIsActive ? 'Akun Aktif (Dapat Mengikuti Kelas)' : 'Akun Nonaktif / Suspended'}
                            </label>
                          </div>
                        </div>

                        {/* Schedule Day 2 & Time 2 (only if 2x Seminggu) */}
                        {scheduleFreq === '2x Seminggu' && (
                          <>
                            <div className="space-y-1.5">
                              <label className="font-bold text-slate-600 text-cyan-800 font-bold">Hari Latihan 2 (Sesi 2)</label>
                              <select
                                value={schDay2}
                                onChange={(e) => {
                                  const day = e.target.value;
                                  setSchDay2(day);
                                  const currentCoach = coaches.find(c => c.id === selectedCoachId) || coaches[0];
                                  const daySched = currentCoach?.schedule.find(d => d.day === day);
                                  if (daySched && daySched.timeSlots.length > 0) {
                                    setSchTime2(daySched.timeSlots[0].time);
                                  }
                                }}
                                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-hidden"
                              >
                                {(coaches.find(c => c.id === selectedCoachId) || coaches[0])?.schedule.map(d => (
                                  <option key={d.day} value={d.day}>{d.day}</option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="font-bold text-slate-600 text-cyan-800 font-bold">Jam Latihan 2 (Sesi 2)</label>
                              <select
                                value={schTime2}
                                onChange={(e) => setSchTime2(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-hidden"
                              >
                                {((coaches.find(c => c.id === selectedCoachId) || coaches[0])?.schedule.find(d => d.day === schDay2)?.timeSlots || []).map(ts => {
                                  const conf = checkScheduleSlotConflict(members, selectedCoachId, schDay2, ts.time, selectedCoachType, editingStudent?.id);
                                  return (
                                    <option key={ts.time} value={ts.time} disabled={conf.isConflict}>
                                      {ts.time} WIB ({ts.currentSlots}/{ts.maxSlots} terisi){conf.isConflict ? ` 🚫 Bentrok Paket ${conf.existingType}` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </div>
                            <div></div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Section 4: Pembayaran */}
                    <div className="space-y-4">
                      <h5 className="font-extrabold text-xs text-cyan-700 uppercase tracking-wider border-b border-cyan-100 pb-1.5 flex items-center gap-1">
                        💵 Informasi Pembayaran Paket
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Nominal Pembayaran (Rp)</label>
                          <input
                            type="number"
                            min={0}
                            value={payAmount}
                            onChange={(e) => setPayAmount(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-emerald-800"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Metode Pembayaran</label>
                          <select
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-hidden"
                          >
                            <option value="Transfer BNI">Transfer BNI</option>
                            <option value="Tunai di Kasir">Tunai di Kasir</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Status Pembayaran</label>
                          <select
                            value={payStatus}
                            onChange={(e) => setPayStatus(e.target.value as any)}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-hidden"
                          >
                            <option value="Pembayaran Berhasil">Pembayaran Berhasil / Lunas</option>
                            <option value="Menunggu Verifikasi">Menunggu Verifikasi (Transfer Pending)</option>
                            <option value="Pembayaran Gagal">Pembayaran Gagal / Ditolak</option>
                          </select>
                        </div>
                      </div>
                    </div>

                  </form>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowStudentModal(false)}
                      className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-2.5 px-5 rounded-xl text-xs transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveStudent}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition shadow-md shadow-cyan-600/10 cursor-pointer"
                    >
                      {editingStudent ? 'Simpan Perubahan' : 'Daftarkan Siswa'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: JADWAL & REMINDER (COMBINED) */}
        {activeTab === 'reminder' && (
          <div className="space-y-6">
            {/* Header & Sub-Tab Switcher */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-cyan-600" /> Manajemen Jadwal Latihan & Reminder WhatsApp
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Pilih tab di sebelah kanan untuk beralih antara <strong>Jadwal Latihan Hari Ini</strong> dan <strong>Pengingat WhatsApp H-1 & Paket Expiring</strong>.
                </p>
              </div>

              {/* Sub-Tab Selector Pills */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setReminderSubTab('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    reminderSubTab === 'today'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Jadwal Hari Ini</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReminderSubTab('tomorrow')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                    reminderSubTab === 'tomorrow'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Reminder & Besok (H-1)</span>
                </button>
              </div>
            </div>

            {/* SUB-TAB 1: JADWAL HARI INI */}
            {reminderSubTab === 'today' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      Presensi & Jadwal Latihan Hari Ini ({selectedScheduleDayFilter || getIndonesianDayName(new Date())})
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Daftar murid aktif yang memiliki jadwal latihan renang pada hari terpilih.</p>
                  </div>
                  
                  {/* Day Selector */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-slate-600">Pilih Hari Latihan:</span>
                    <select
                      value={selectedScheduleDayFilter || getIndonesianDayName(new Date())}
                      onChange={(e) => setSelectedScheduleDayFilter(e.target.value)}
                      className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-slate-800 focus:outline-hidden"
                    >
                      {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(day => (
                        <option key={day} value={day}>{day} {day === getIndonesianDayName(new Date()) ? '(Hari Ini)' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Schedule List Table */}
                {(() => {
                  const targetDay = selectedScheduleDayFilter || getIndonesianDayName(new Date());
                  const scheduledToday = members.filter(m => {
                    if (m.isActive === false || m.sessionsLeft <= 0 || m.status === 'Selesai' || m.status === 'Menunggu Verifikasi') {
                      return false;
                    }
                    const mSchedules = m.schedules && m.schedules.length > 0
                      ? m.schedules
                      : [{ coachId: m.coachId, day: m.scheduleDay, time: m.scheduleTime }];
                    
                    return mSchedules.some(s => s.day === targetDay);
                  });

                  if (scheduledToday.length === 0) {
                    return (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="text-xs text-slate-400 mt-2 font-semibold">Tidak ada jadwal latihan renang pada hari {targetDay}.</p>
                      </div>
                    );
                  }

                  const sortedScheduled = scheduledToday.sort((a, b) => {
                    const getFirstTime = (m: Member) => {
                      const mSchedules = m.schedules && m.schedules.length > 0 ? m.schedules : [{ time: m.scheduleTime }];
                      const sched = mSchedules.find(s => s.day === targetDay);
                      return sched ? sched.time : '24:00';
                    };
                    return getFirstTime(a).localeCompare(getFirstTime(b));
                  });

                  return (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider">
                              <th className="p-3.5">Waktu Latihan</th>
                              <th className="p-3.5">Siswa (ID)</th>
                              <th className="p-3.5">Nama Orang Tua</th>
                              <th className="p-3.5">Pelatih / Coach</th>
                              <th className="p-3.5 text-center">Sisa Paket</th>
                              <th className="p-3.5 text-right">Aksi Presensi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sortedScheduled.map(member => {
                              const mSchedules = member.schedules && member.schedules.length > 0
                                ? member.schedules
                                : [{ coachId: member.coachId, day: member.scheduleDay, time: member.scheduleTime }];
                              const currentSched = mSchedules.find(s => s.day === targetDay);
                              const coach = coaches.find(c => c.id === currentSched?.coachId);

                              return (
                                <tr key={member.id} className="text-slate-700 hover:bg-slate-50/50 transition">
                                  <td className="p-3.5 font-bold font-mono text-cyan-700 text-sm">
                                    {currentSched?.time || member.scheduleTime} WIB
                                  </td>
                                  <td className="p-3.5">
                                    <span className="font-extrabold block text-slate-800">{member.student.fullName}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">ID: {member.id}</span>
                                  </td>
                                  <td className="p-3.5 font-medium">
                                    <div className="font-bold text-slate-700">{member.parent.fatherMotherName}</div>
                                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{member.parent.whatsapp}</div>
                                  </td>
                                  <td className="p-3.5">
                                    <span className="font-bold text-slate-800 bg-cyan-50/50 border border-cyan-100 text-cyan-800 px-2.5 py-1 rounded-lg">
                                      {coach ? coach.name : 'Belum Ditentukan'}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-center">
                                    <span className="font-bold text-slate-800 block">{member.sessionsLeft} Sesi</span>
                                    <span className="text-[9px] text-slate-400 block mt-0.5">dari {member.sessionsTotal} total</span>
                                  </td>
                                  <td className="p-3.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleLogAttendance(member.id)}
                                      className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl border border-transparent flex items-center gap-1 transition ml-auto shadow-xs cursor-pointer"
                                    >
                                      <CheckSquare className="w-3.5 h-3.5" /> Absen Sesi
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SUB-TAB 2: REMINDER & JADWAL BESOK (H-1) */}
            {reminderSubTab === 'tomorrow' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                  <div>
                    <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5 uppercase tracking-wider">
                      <Bell className="w-4 h-4 text-indigo-600" /> Simulasi Kirim Reminder WhatsApp H-1
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-0.5">Pilih hari kerja untuk menguji dan mengirim pesan otomatis H-1 ke WhatsApp wali murid.</p>
                  </div>

                  {/* Simulated Date Selector */}
                  <div className="flex items-center gap-2 text-xs w-full md:w-auto">
                    <label className="text-[10px] font-bold text-slate-500">Pilih Hari:</label>
                    <select 
                      value={simulatedToday} 
                      onChange={(e) => setSimulatedToday(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-hidden"
                    >
                      {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(d => (
                        <option key={d} value={d}>Hari {d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Box 1: H-1 Scheduled Latihan */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="font-black text-sm text-slate-800 flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-cyan-600" /> Jadwal Latihan Besok ({esokHari})
                      </h4>
                      <p className="text-[10px] text-slate-400">Daftar siswa aktif yang memiliki sesi latihan besok.</p>
                    </div>

                    {membersScheduledTomorrow.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-[11px] text-slate-400 font-semibold mt-1.5">Tidak ada jadwal latihan pada hari {esokHari}.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {membersScheduledTomorrow.map(member => {
                          const coach = coaches.find(c => c.id === member.coachId);
                          const jam = member.scheduleDay === esokHari ? member.scheduleTime : member.scheduleTime2;
                          return (
                            <div key={member.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center hover:border-cyan-200 transition">
                              <div>
                                <p className="font-bold text-xs text-slate-800">{member.student.fullName}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5"> Coach: {coach?.name} | Pukul: {jam} WIB</p>
                              </div>
                              <a
                                href={getWhatsAppH1Link(member)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-2 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                              >
                                <Phone className="w-3.5 h-3.5" /> Kirim H-1 WA
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Box 2: Expiring Members Reminder */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-2">
                      <h4 className="font-black text-sm text-slate-800 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-rose-500" /> Sisa Sesi Paket Hampir Habis (≤ 2 Sesi)
                      </h4>
                      <p className="text-[10px] text-slate-400">Kirim WhatsApp penawaran perpanjangan atau stop (hapus slot jika menolak).</p>
                    </div>

                    {expiringMembers.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                        <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-[11px] text-slate-400 font-semibold mt-1.5">Semua siswa memiliki sisa paket yang cukup.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                        {expiringMembers.map(member => {
                          return (
                            <div key={member.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5 hover:border-cyan-200 transition">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-xs text-slate-800">{member.student.fullName}</p>
                                  <p className="text-[10px] text-slate-500">Sisa Paket: <span className="font-black text-rose-600">{member.sessionsLeft} Sesi</span></p>
                                </div>
                                <span className="text-[9px] font-bold font-mono bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded border border-rose-200">SISA SEDIKIT</span>
                              </div>

                              <div className="flex gap-2.5">
                                <a
                                  href={getWhatsAppExpiringLink(member)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-2.5 py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Phone className="w-3.5 h-3.5" /> WA Perpanjangan
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    Swal.fire({
                                      title: 'Perpanjang Paket?',
                                      text: `Perpanjang paket siswa ${member.student.fullName}?`,
                                      icon: 'question',
                                      showCancelButton: true,
                                      confirmButtonColor: '#06b6d4',
                                      cancelButtonColor: '#64748b',
                                      confirmButtonText: 'Ya, Perpanjang!',
                                      cancelButtonText: 'Batal'
                                    }).then((result) => {
                                      if (result.isConfirmed) {
                                        const updated = members.map(m => {
                                          if (m.id === member.id) {
                                            return {
                                              ...m,
                                              sessionsLeft: m.sessionsTotal,
                                              status: 'Aktif' as any
                                            };
                                          }
                                          return m;
                                        });
                                        onUpdateMembers(updated);
                                        Swal.fire({
                                          title: 'Berhasil!',
                                          text: 'Paket berhasil diperpanjang!',
                                          icon: 'success',
                                          confirmButtonColor: '#06b6d4'
                                        });
                                      }
                                    });
                                  }}
                                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-2.5 py-1.5 rounded-lg text-[10px] cursor-pointer"
                                >
                                  Perpanjang
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(member.id)}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-2 py-1.5 rounded-lg text-[10px] border border-rose-200 cursor-pointer"
                                >
                                  Stop
                                </button>
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
        )}

        {/* TAB: KETIDAKHADIRAN PELATIH */}
        {activeTab === 'absensi_coach' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> Laporan Ketidakhadiran & Izin Pelatih (H-1)
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Proses laporan absen dari pelatih dengan memilih opsi: mengganti dengan pelatih lain (Transfer) atau meniadakan sesi dan mengundur jadwal (Reschedule).
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                Laporan Izin yang Masuk
              </h4>

              {absences.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <AlertTriangle className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 mt-2 font-semibold">Belum ada laporan ketidakhadiran pelatih.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {absences.map(absence => {
                    const coach = coaches.find(c => c.id === absence.coachId);
                    const replacement = coaches.find(c => c.id === absence.replacementCoachId);
                    const statusText = absence.status;
                    const isPending = absence.status === 'Menunggu';

                    // Cari murid yang terimbas jadwal ini
                    const affectedStudents = members.filter(m => {
                      if (m.status !== 'Aktif' && m.status !== 'Paket Hampir Habis') return false;
                      const isOriginalStudent = m.coachId === absence.coachId;
                      const matchesSchedule = (m.scheduleDay === absence.day && m.scheduleTime === absence.time) ||
                                              (m.scheduleDay2 === absence.day && m.scheduleTime2 === absence.time);
                      return isOriginalStudent && matchesSchedule;
                    });

                    return (
                      <div key={absence.id} className="p-5 rounded-2xl border border-slate-150 hover:border-cyan-200 transition bg-slate-50/50 space-y-4 text-left">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
                              <img src={coach?.photo || '/images/default_coach.jpg'} alt={coach?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                              <h5 className="font-extrabold text-sm text-slate-900">Coach {coach?.name || 'Pelatih'}</h5>
                              <p className="text-[10px] text-slate-500 font-medium">Melaporkan izin pada {absence.date} (Hari {absence.day} pukul {absence.time} WIB)</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              absence.status === 'Menunggu' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              absence.status === 'Transfer' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              absence.status === 'Reschedule' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' :
                              'bg-slate-200 text-slate-700'
                            }`}>
                              {statusText}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase">Alasan Pelatih:</span>
                          <p className="italic font-medium text-slate-800 font-sans">" {absence.reason} "</p>
                        </div>

                        <div className="text-xs text-slate-700 space-y-2">
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Murid Terjadwal yang Terdampak ({affectedStudents.length}):</span>
                          {affectedStudents.length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic">Tidak ada murid aktif pada jadwal ini.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {affectedStudents.map(student => (
                                <span key={student.id} className="bg-white px-2 py-1 rounded-md border border-slate-100 font-semibold text-[10px]">
                                  {student.student.fullName} (Sisa: {student.sessionsLeft} Sesi)
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {isPending && affectedStudents.length > 0 && (
                          <div className="pt-3 border-t border-slate-150 flex flex-col md:flex-row md:items-end justify-between gap-4">
                            {/* Opsi 1: Transfer */}
                            <div className="space-y-1.5 flex-1">
                              <label className="text-[9px] font-bold text-slate-500 uppercase block">Opsi 1: Ganti Pelatih (Pilih Coach Pengganti)</label>
                              <div className="flex gap-2">
                                <select
                                  value={selectedReplacementCoachId[absence.id] || ''}
                                  onChange={(e) => setSelectedReplacementCoachId({
                                    ...selectedReplacementCoachId,
                                    [absence.id]: e.target.value
                                  })}
                                  className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none flex-1 max-w-xs"
                                >
                                  <option value="">-- Pilih Coach Pengganti --</option>
                                  {coaches.filter(c => c.id !== absence.coachId).map(c => (
                                    <option key={c.id} value={c.id}>Coach {c.name}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleProcessCoachAbsence(absence.id, 'Transfer')}
                                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-3 py-2 rounded-xl text-xs whitespace-nowrap cursor-pointer shadow-sm"
                                >
                                  Konfirmasi Transfer
                                </button>
                              </div>
                            </div>

                            {/* Opsi 2: Reschedule */}
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => handleProcessCoachAbsence(absence.id, 'Reschedule')}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs cursor-pointer shadow-sm"
                              >
                                Opsi 2: Reschedule (Geser Jadwal)
                              </button>
                            </div>
                          </div>
                        )}

                        {!isPending && (
                          <div className="pt-3 border-t border-slate-150 text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                            {absence.status === 'Transfer' && replacement && (
                              <span className="text-indigo-800 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                                ✅ Diproses: Jadwal ditransfer sementara ke <strong>Coach {replacement.name}</strong>.
                              </span>
                            )}
                            {absence.status === 'Reschedule' && (
                              <span className="text-cyan-800 bg-cyan-50 border border-cyan-100 px-2.5 py-1 rounded-lg">
                                ✅ Diproses: Sesi ditiadakan dan jadwal digeser ke minggu berikutnya (Log pergeseran ditambahkan ke riwayat murid).
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: LAPORAN REFERRAL */}
        {activeTab === 'referral' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-650" /> Laporan & Statistik Referral
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Pantau kinerja promosi program rujukan (referral) dari Pelatih dan Member lainnya serta total reward bonus yang diperoleh.
              </p>
            </div>

            {/* Filter Tanggal Referral */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col md:flex-row items-end gap-3 text-xs text-slate-700">
              <div className="space-y-1 w-full md:w-auto">
                <label className="text-[10px] font-bold text-slate-500 block uppercase">Tanggal Mulai (Daftar)</label>
                <input
                  type="date"
                  value={refStartDate}
                  onChange={(e) => setRefStartDate(e.target.value)}
                  className="w-full md:w-44 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1 w-full md:w-auto">
                <label className="text-[10px] font-bold text-slate-500 block uppercase">Tanggal Selesai (Daftar)</label>
                <input
                  type="date"
                  value={refEndDate}
                  onChange={(e) => setRefEndDate(e.target.value)}
                  className="w-full md:w-44 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs"
                />
              </div>
              {(refStartDate || refEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setRefStartDate('');
                    setRefEndDate('');
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-750 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {(() => {
              const filteredMembersForReferral = members.filter(m => {
                if (!m.referralCodeUsed) return false;
                if (!m.registeredAt) return false;
                const regDate = m.registeredAt.substring(0, 10);
                if (refStartDate && regDate < refStartDate) return false;
                if (refEndDate && regDate > refEndDate) return false;
                return true;
              });

              const totalReferralsCount = filteredMembersForReferral.length;
              
              const coachReward = filteredMembersForReferral.reduce((sum, m) => {
                const isCoach = coaches.some(c => c.referralCode && c.referralCode.toUpperCase() === m.referralCodeUsed?.toUpperCase());
                return isCoach ? sum + 50000 : sum;
              }, 0);
              
              const memberReward = filteredMembersForReferral.reduce((sum, m) => {
                const isMember = members.some(mem => mem.id.toUpperCase() === m.referralCodeUsed?.toUpperCase());
                return isMember ? sum + 25000 : sum;
              }, 0);

              return (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-5 rounded-2xl border border-indigo-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-700 block uppercase tracking-wider">Total Rujukan Digunakan</span>
                        <span className="text-2xl font-black text-slate-800">
                          {totalReferralsCount} Siswa
                        </span>
                      </div>
                      <div className="p-3 bg-indigo-600 text-white rounded-xl">
                        <Users className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 p-5 rounded-2xl border border-cyan-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-cyan-700 block uppercase tracking-wider">Total Reward Pelatih</span>
                        <span className="text-2xl font-black text-slate-800">
                          Rp {coachReward.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="p-3 bg-cyan-600 text-white rounded-xl">
                        <Award className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5 rounded-2xl border border-emerald-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 block uppercase tracking-wider">Total Reward Member</span>
                        <span className="text-2xl font-black text-slate-800">
                          Rp {memberReward.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="p-3 bg-emerald-600 text-white rounded-xl">
                        <DollarSign className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Rekap Referral Pelatih - Full Width */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                    <h4 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-cyan-600" /> Rekap Referral Pelatih
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-slate-400 font-bold border-b border-slate-100">
                            <th className="pb-2">Nama Pelatih</th>
                            <th className="pb-2">Kode Referral</th>
                            <th className="pb-2 text-center">Siswa Dirujuk</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {coaches.map(coach => {
                            const count = filteredMembersForReferral.filter(m => m.referralCodeUsed && coach.referralCode && m.referralCodeUsed.toUpperCase() === coach.referralCode.toUpperCase()).length;
                            return (
                              <tr key={coach.id} className="text-slate-700">
                                <td className="py-2.5 font-bold">{coach.name}</td>
                                <td className="py-2.5 font-mono text-cyan-705 font-bold">{coach.referralCode || '-'}</td>
                                <td className="py-2.5 text-center font-bold text-cyan-800">{count} Siswa</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Riwayat Penggunaan Referral Terbaru */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                    <h4 className="font-extrabold text-sm text-slate-800 border-b border-slate-100 pb-2">
                      Riwayat Penggunaan Referral Pendaftar Baru
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="text-slate-400 font-bold border-b border-slate-100">
                            <th className="pb-2">Tanggal Daftar</th>
                            <th className="pb-2">Siswa</th>
                            <th className="pb-2">Kode Digunakan</th>
                            <th className="pb-2">Pengundang / Pemilik Kode</th>
                            <th className="pb-2">Status Pembayaran</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredMembersForReferral.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-4 text-center text-slate-400 italic">Belum ada penggunaan kode referral pada pendaftaran.</td>
                            </tr>
                          ) : (
                            filteredMembersForReferral.map(m => {
                              const code = m.referralCodeUsed?.toUpperCase();
                              const inviterCoach = coaches.find(c => c.referralCode && c.referralCode.toUpperCase() === code);
                              const inviterMember = members.find(mem => mem.id.toUpperCase() === code);
                              let inviterName = 'Tidak Valid / Tidak Ditemukan';
                              let inviterType = '';

                              if (inviterCoach) {
                                inviterName = `Coach ${inviterCoach.name}`;
                                inviterType = 'Pelatih (Rp 50k)';
                              } else if (inviterMember) {
                                inviterName = inviterMember.student.fullName;
                                inviterType = 'Member (Rp 25k)';
                              }

                              return (
                                <tr key={m.id} className="text-slate-700">
                                  <td className="py-2.5">{m.registeredAt ? m.registeredAt.substring(0, 10) : '-'}</td>
                                  <td className="py-2.5 font-bold">{m.student.fullName}</td>
                                  <td className="py-2.5 font-mono text-slate-800 font-bold">{m.referralCodeUsed}</td>
                                  <td className="py-2.5">
                                    <span className="font-semibold block">{inviterName}</span>
                                    {inviterType && (
                                      <span className="text-[9px] bg-slate-100 text-slate-650 px-1.5 py-0.5 rounded font-mono font-bold mt-0.5 inline-block">
                                        {inviterType}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                      m.status === 'Aktif' || m.status === 'Paket Hampir Habis' ? 'bg-emerald-100 text-emerald-800' :
                                      m.status === 'Menunggu Verifikasi' ? 'bg-amber-100 text-amber-800' :
                                      'bg-slate-100 text-slate-750'
                                    }`}>
                                      {m.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* TAB 4: EVENTS / KEGIATAN */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Manajemen Event & Berita Kegiatan</h3>
                <p className="text-slate-500 text-xs">Buat pengumuman fun swimming, lomba internal, atau berita terbaru yang tampil di halaman depan pendaftaran.</p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddEventModal}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/10 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Tambah Kegiatan Baru
              </button>
            </div>

            {/* Grid Event Aktif */}
            <div className="space-y-4">
              <h4 className="font-bold text-sm text-slate-800">Daftar Event / Pengumuman Terbit</h4>
              {events.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 mt-2 font-semibold">Belum ada pengumuman kegiatan yang diterbitkan.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(event => (
                    <div key={event.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-cyan-200 hover:shadow-md transition duration-200">
                      <div className="h-36 bg-slate-100 relative">
                        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                        <span className="absolute top-3 left-3 bg-cyan-600 text-white font-extrabold text-[8px] uppercase px-2 py-0.5 rounded shadow-sm">
                          {event.category}
                        </span>
                      </div>
                      <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] text-slate-400 font-mono block mb-1">{event.date}</span>
                          <h5 className="font-extrabold text-xs text-slate-800 line-clamp-1">{event.title}</h5>
                          <p className="text-[10px] text-slate-500 line-clamp-3 mt-1 leading-normal">{event.description}</p>
                        </div>
                        <div className="pt-3 flex justify-between items-center border-t border-slate-100/60 mt-3">
                          <button
                            onClick={() => handleOpenEditEventModal(event)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                          >
                            <Trash className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CRUD Event Modal (Add/Edit) */}
            {showEventModal && (
              <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                      <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-cyan-600" />
                        {editingEvent ? `Ubah Detail Kegiatan` : 'Tambah Kegiatan / Event Baru'}
                      </h4>
                      <p className="text-[10px] text-slate-500">Silakan isi informasi kegiatan di bawah ini dengan lengkap.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEventModal(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <form onSubmit={handleSaveEvent} className="p-6 space-y-4 text-xs text-slate-700">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">Judul Event / Kegiatan <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        placeholder="Contoh: Lomba Renang Antar Anggota"
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-600">Kategori Event <span className="text-rose-500">*</span></label>
                        <div className="flex gap-1.5">
                          <select
                            value={newEventCategory}
                            onChange={(e: any) => setNewEventCategory(e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                          >
                            {eventCategories.length > 0 ? (
                              eventCategories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                              ))
                            ) : (
                              <>
                                <option value="Fun Swimming">Fun Swimming</option>
                                <option value="Lomba">Lomba</option>
                                <option value="Latihan Bersama">Latihan Bersama</option>
                                <option value="Pengumuman">Pengumuman</option>
                              </>
                            )}
                          </select>
                          <button
                            type="button"
                            onClick={handleQuickAddCategory}
                            className="bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 text-cyan-700 font-bold px-3 py-2.5 rounded-xl text-xs flex items-center justify-center cursor-pointer transition shrink-0"
                            title="Tambah Kategori Event Baru"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-600">Tanggal Pelaksanaan <span className="text-rose-500">*</span></label>
                        <input
                          type="date"
                          value={newEventDate}
                          onChange={(e) => setNewEventDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600 block">Gambar Banner Kegiatan <span className="text-rose-500">*</span></label>
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                        <div className="w-12 h-12 bg-white rounded-lg overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center">
                          {newEventImageUrl ? (
                            <img src={newEventImageUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div className="space-y-1 flex-1">
                          <label className="cursor-pointer bg-white hover:bg-slate-150 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-[10px] border border-slate-200 transition inline-block">
                            📁 Unggah Gambar Banner
                            <input 
                              type="file" 
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (typeof reader.result === 'string') {
                                      setNewEventImageUrl(reader.result);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <p className="text-[9px] text-slate-400">Pilih file foto banner untuk kegiatan ini.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">Isi Pengumuman / Deskripsi Kegiatan <span className="text-rose-500">*</span></label>
                      <textarea
                        rows={4}
                        placeholder="Tuliskan detail pelaksanaan kegiatan seperti lokasi kolam, jam mulai, dan rincian acara..."
                        value={newEventDescription}
                        onChange={(e) => setNewEventDescription(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                        required
                      />
                    </div>

                    {/* Modal Footer Actions */}
                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 bg-white">
                      <button
                        type="button"
                        onClick={() => setShowEventModal(false)}
                        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-5 rounded-xl transition shadow-md shadow-cyan-600/10 cursor-pointer"
                      >
                        {editingEvent ? 'Simpan Perubahan' : 'Terbitkan Event'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: MASTER KOLAM RENANG */}
        {activeTab === 'kolam_renang' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-600" />
                  Master Data Kolam Renang
                </h3>
                <p className="text-slate-500 text-xs">Kelola tempat / lokasi kolam renang beserta pilihan hari dan jam latihan yang tersedia.</p>
              </div>
              <button
                type="button"
                onClick={handleOpenAddPoolModal}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/10 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Tambah Kolam Renang
              </button>
            </div>

            {/* List / Table Master Kolam Renang */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
              {swimmingPools.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 mt-2 font-semibold">Belum ada data kolam renang yang ditambahkan.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {swimmingPools.map(pool => (
                    <div key={pool.id} className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-xs hover:border-cyan-200 hover:shadow-md transition space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600 shrink-0">
                              <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-slate-800">{pool.name}</h4>
                              <p className="text-[10px] text-slate-400 font-mono">ID: {pool.id}</p>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        {pool.description && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl leading-relaxed">
                            {pool.description}
                          </p>
                        )}

                        {/* Training Days */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hari Latihan Disediakan:</p>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(pool.training_days) && pool.training_days.length > 0 ? (
                              pool.training_days.map(day => (
                                <span key={day} className="bg-cyan-50 text-cyan-700 font-bold text-[9px] px-2 py-0.5 rounded-md border border-cyan-100">
                                  {day}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum diatur</span>
                            )}
                          </div>
                        </div>

                        {/* Training Hours */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sesi Jam Latihan:</p>
                          <div className="flex flex-wrap gap-1">
                            {Array.isArray(pool.training_hours) && pool.training_hours.length > 0 ? (
                              pool.training_hours.map(hr => (
                                <span key={hr} className="bg-amber-50 text-amber-700 font-mono font-bold text-[9px] px-2 py-0.5 rounded-md border border-amber-100">
                                  {hr} WIB
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Belum diatur</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPoolModal(pool)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-600" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePool(pool.id)}
                          className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition"
                        >
                          <Trash className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL ADD/EDIT SWIMMING POOL */}
        {showPoolModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-600" />
                    {editingPool ? 'Edit Data Kolam Renang' : 'Tambah Master Kolam Renang Baru'}
                  </h4>
                  <p className="text-[10px] text-slate-500">Lengkapi nama, pilihan hari, dan sesi jam latihan kolam renang.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPoolModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSavePool} className="p-6 space-y-4 text-xs text-slate-700">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600">Nama Kolam Renang <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    placeholder="Contoh: Kolam Renang Tirta Barokah (Utama)"
                    value={poolName}
                    onChange={(e) => setPoolName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                    required
                  />
                </div>

                {/* Multiple Hari Latihan */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 block">Pilihan Hari Latihan (Multiple):</label>
                  <div className="flex flex-wrap gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(day => {
                      const isChecked = poolDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleTogglePoolDay(day)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                            isChecked
                              ? 'bg-cyan-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Multiple Jam Latihan */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 block">Sesi Jam Latihan (Multiple):</label>
                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Contoh: 08:00 - 09:30"
                        value={newHourInput}
                        onChange={(e) => setNewHourInput(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddPoolHour}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> Tambah Jam
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {poolHours.map(hr => (
                        <span key={hr} className="bg-white border border-slate-200 font-mono font-bold text-slate-700 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs">
                          {hr} WIB
                          <button
                            type="button"
                            onClick={() => handleRemovePoolHour(hr)}
                            className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Deskripsi */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600">Deskripsi / Alamat Kolam Renang</label>
                  <textarea
                    rows={3}
                    placeholder="Alamat lengkap, fasilitas, atau keterangan kolam..."
                    value={poolDescription}
                    onChange={(e) => setPoolDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                  />
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 bg-white">
                  <button
                    type="button"
                    onClick={() => setShowPoolModal(false)}
                    className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-5 rounded-xl transition shadow-md shadow-cyan-600/10 cursor-pointer"
                  >
                    {editingPool ? 'Simpan Perubahan' : 'Tambah Kolam Renang'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 5: MANAJEMEN PELATIH & JADWAL */}
        {activeTab === 'pelatih' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Manajemen Pelatih & Kuota Latihan</h3>
                <p className="text-slate-500 text-xs">Ubah kuota siswa maksimal, harga paket latihan 4x/8x/12x, dan kelola jam jadwal latihan pelatih.</p>
              </div>
              <button
                onClick={() => setShowAddCoachModal(true)}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-600/10 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> Tambah Pelatih Baru
              </button>
            </div>

            {/* Kolom Cari Nama Pelatih */}
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Cari nama pelatih..."
                value={searchCoach}
                onChange={(e) => setSearchCoach(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-slate-800 font-medium"
              />
            </div>

            {/* List of coaches settings */}
            <div className="space-y-6">
              {coaches
                .filter(c => c.name.toLowerCase().includes(searchCoach.toLowerCase()))
                .map((coach) => {
                const isEditing = selectedEditCoachId === coach.id;
                const activeCount = members.filter(m => m.coachId === coach.id && m.status !== 'Selesai').length;
                return (
                  <div key={coach.id} className="bg-slate-50/30 rounded-2xl p-5 border border-slate-200/60 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex gap-4 items-start">
                        <div className="w-14 h-14 bg-slate-200 rounded-xl overflow-hidden flex-shrink-0">
                          <img src={coach.photo} alt={coach.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                            {coach.name}
                            {coach.isActive === false ? (
                              <span className="text-[9px] bg-rose-50 border border-rose-200 text-rose-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Nonaktif</span>
                            ) : (
                              <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">Aktif</span>
                            )}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{coach.experience}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500">Kuota Max: <strong className="text-slate-800 font-extrabold">{coach.maxQuota} anak</strong></span>
                            
                            {/* Certificate Display Badge */}
                            {coach.certificateUrl ? (() => {
                              const isPdf = coach.certificateUrl.toLowerCase().includes('.pdf') || coach.certificateUrl.startsWith('data:application/pdf');
                              return (
                                <button
                                  type="button"
                                  onClick={() => setPreviewCertUrl(coach.certificateUrl!)}
                                  className="inline-flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-xl font-bold text-xs shadow-2xs hover:shadow-sm transition cursor-pointer"
                                  title="Klik untuk melihat Sertifikat Pelatih"
                                >
                                  <div className="w-5 h-5 rounded-md overflow-hidden border border-amber-400 shrink-0 bg-white flex items-center justify-center">
                                    {isPdf ? (
                                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                                    ) : (
                                      <img src={coach.certificateUrl} alt="Sertifikat" className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                  <span>{isPdf ? '📄 Sertifikat PDF' : '📜 Sertifikat Pelatih'}</span>
                                  <span className="text-[9px] bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded-md font-extrabold uppercase">Lihat</span>
                                </button>
                              );
                            })() : (
                              <button
                                type="button"
                                onClick={() => {
                                  handleEditCoachSettings(coach.id);
                                  setExpandedCoachScheduleId('');
                                }}
                                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 border border-dashed border-slate-300 px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer"
                                title="Klik untuk unggah sertifikat"
                              >
                                <Award className="w-3.5 h-3.5 text-slate-400" />
                                <span>+ Unggah Sertifikat</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isEditing && (
                          <button
                            onClick={() => setExpandedCoachScheduleId(prev => prev === coach.id ? '' : coach.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition ${
                              expandedCoachScheduleId === coach.id 
                                ? 'bg-cyan-600 text-white border border-cyan-600 hover:bg-cyan-500' 
                                : 'bg-white text-cyan-600 border border-cyan-150 hover:bg-cyan-50'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" /> {expandedCoachScheduleId === coach.id ? 'Tutup Jadwal' : 'Lihat Jadwal'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleEditCoachSettings(coach.id);
                            setExpandedCoachScheduleId('');
                          }}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 shadow-xs cursor-pointer transition"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-600" /> Edit Profil, Kuota & Harga
                        </button>
                      </div>
                    </div>

                    {/* Schedule manager inside coach card */}
                    {expandedCoachScheduleId === coach.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="border-t border-slate-200 pt-3 space-y-3"
                      >
                        <p className="text-[11px] font-bold text-slate-700">Waktu Jadwal & Pengisian Slot (7 Hari):</p>
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
                          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((dayName) => {
                            const dayObj = coach.schedule.find(d => d.day === dayName) || { day: dayName, timeSlots: [] };
                            return (
                              <div key={dayName} className="bg-white rounded-xl border border-slate-200/60 p-3 space-y-2">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                                  <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{dayName}</span>
                                  <button
                                    onClick={() => handleOpenAddSlotModal(coach.id, dayName)}
                                    className="text-[10px] font-bold text-cyan-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                                  >
                                    + Tambah Jam
                                  </button>
                                </div>

                                <div className="space-y-1.5">
                                  {dayObj.timeSlots.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 italic">Libur / Tidak ada kelas</p>
                                  ) : (
                                    dayObj.timeSlots.map((slot) => {
                                      // Live slot calculate
                                      const slotStudents = members.filter(m => 
                                        m.coachId === coach.id && 
                                        ((m.scheduleDay === dayName && m.scheduleTime === slot.time) || 
                                         (m.scheduleFrequency === '2x Seminggu' && m.scheduleDay2 === dayName && m.scheduleTime2 === slot.time)) && 
                                        m.status !== 'Selesai'
                                      );
                                      const usageCount = slotStudents.length;
                                      const isFull = usageCount >= slot.maxSlots;

                                      return (
                                        <div key={slot.time} className="flex flex-col gap-1 bg-slate-50 p-2 rounded-lg border border-slate-200/50">
                                          <div className="flex justify-between items-center">
                                            <div>
                                              <p className="font-mono text-xs font-bold text-slate-800">{slot.time} WIB</p>
                                              {slot.swimmingPoolId && (
                                                <p className="text-[9px] font-bold text-cyan-600 flex items-center gap-0.5 mt-0.5 truncate">
                                                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                  <span className="truncate">{swimmingPools.find(p => p.id === slot.swimmingPoolId)?.name || 'Kolam Renang'}</span>
                                                </p>
                                              )}
                                              <p className={`text-[9px] font-semibold ${isFull ? 'text-rose-600 font-extrabold' : 'text-slate-500'}`}>
                                                Slot: {usageCount} / {slot.maxSlots} {isFull ? '(PENUH)' : ''}
                                              </p>
                                            </div>
                                            <button
                                              onClick={() => handleRemoveScheduleSlot(coach.id, dayName, slot.time)}
                                              className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                              title="Hapus Slot Jam"
                                            >
                                              <Trash className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                          <div className="flex items-center justify-between gap-1.5 border-t border-slate-200/60 pt-1 mt-1">
                                            <span className="text-[8px] font-bold text-slate-400">Kuota Slot:</span>
                                            <input 
                                              type="number"
                                              value={slot.maxSlots}
                                              onChange={(e) => handleUpdateScheduleSlotMax(coach.id, dayName, slot.time, Number(e.target.value))}
                                              className="w-10 bg-white border border-slate-200 rounded px-1 py-0.5 text-[9px] font-mono text-center font-bold text-slate-800"
                                              title="Ubah kuota slot spesifik ini"
                                            />
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ADD COACH MODAL */}
            {showAddCoachModal && (
              <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                      <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-cyan-600" />
                        Tambah Pelatih Baru ke Tirta Barokah
                      </h4>
                      <p className="text-[10px] text-slate-500">Silakan masukkan data diri, kuota max, dan daftar harga paket pelatih baru.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddCoachModal(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <form onSubmit={handleAddCoachSubmit}>
                    <div className="p-6 space-y-4 text-xs text-slate-700 max-h-[70vh] overflow-y-auto">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Nama Lengkap Pelatih</label>
                          <input
                            type="text"
                            placeholder="Contoh: Coach Rian"
                            value={newCoachName}
                            onChange={(e) => setNewCoachName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Kuota Siswa Maksimal</label>
                          <input
                            type="number"
                            value={newCoachQuota}
                            onChange={(e) => setNewCoachQuota(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs rounded-xl font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Kode Referral (Opsional)</label>
                          <input
                            type="text"
                            placeholder="Contoh: COACH-RIAN"
                            value={newCoachReferralCode}
                            onChange={(e) => setNewCoachReferralCode(e.target.value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase())}
                            className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs rounded-xl font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 block">Foto Pelatih</label>
                        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                          <div className="w-14 h-14 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center">
                            {newCoachPhoto ? (
                              <img src={newCoachPhoto} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-6 h-6 text-slate-300" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="cursor-pointer bg-white hover:bg-slate-150 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-200 transition inline-block">
                              📁 Pilih & Upload Foto
                              <input 
                                type="file" 
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      if (typeof reader.result === 'string') {
                                        setNewCoachPhoto(reader.result);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <p className="text-[10px] text-slate-400 font-medium">Mendukung format PNG, JPG. Foto disimpan lokal.</p>
                          </div>
                        </div>
                      </div>

                      {/* Upload Sertifikat Pelatih */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 block">Sertifikat Pelatih (Gambar / PDF)</label>
                        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                          <div 
                            className="w-14 h-14 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center cursor-pointer relative group"
                            onClick={() => newCoachCertificate && setPreviewCertUrl(newCoachCertificate)}
                          >
                            {newCoachCertificate ? (
                              newCoachCertificate.toLowerCase().includes('.pdf') || newCoachCertificate.startsWith('data:application/pdf') ? (
                                <FileText className="w-7 h-7 text-rose-600" />
                              ) : (
                                <img src={newCoachCertificate} alt="Preview Sertifikat" className="w-full h-full object-cover" />
                              )
                            ) : (
                              <Award className="w-6 h-6 text-slate-300" />
                            )}
                          </div>
                          <div className="space-y-1">
                            <label className="cursor-pointer bg-white hover:bg-slate-150 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-200 transition inline-block">
                              📜 Upload Sertifikat (Gambar / PDF)
                              <input 
                                type="file" 
                                accept="image/*,.pdf,application/pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      if (typeof reader.result === 'string') {
                                        setNewCoachCertificate(reader.result);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <p className="text-[10px] text-slate-400 font-medium">Mendukung Format PNG, JPG, dan PDF. Tampil sebagai sertifikat resmi yang dapat diklik.</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-600">Pengalaman / Biografi Singkat</label>
                        <input
                          type="text"
                          placeholder="Contoh: Mantan atlet, 4 tahun pengalaman, dll."
                          value={newCoachExperience}
                          onChange={(e) => setNewCoachExperience(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                          required
                        />
                      </div>

                      <div className="space-y-3 border-t border-slate-150 pt-3">
                        <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Pilih Paket Latihan yang Disediakan</h5>
                        
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 block">Pilih Paket:</label>
                          <SearchableSelect
                            placeholder="-- Pilih Paket Untuk Ditambahkan --"
                            options={globalPricingPackages
                              .filter(gp => !newCoachPackages.includes(gp.id))
                              .map(gp => ({
                                value: gp.id,
                                label: `${gp.name} - Rp ${gp.price.toLocaleString('id-ID')} (${gp.sessions} Sesi)`
                              }))
                            }
                            onSelect={(pkgId) => {
                              if (!newCoachPackages.includes(pkgId)) {
                                setNewCoachPackages(prev => [...prev, pkgId]);
                              }
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 block">Daftar Paket Aktif Pelatih:</label>
                          {newCoachPackages.length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic">Belum ada paket belajar untuk pelatih ini.</p>
                          ) : (
                            newCoachPackages.map(pkgId => {
                              const pkg = globalPricingPackages.find(gp => gp.id === pkgId);
                              if (!pkg) return null;
                              return (
                                <div key={pkgId} className="flex justify-between items-center bg-cyan-50/20 p-2.5 rounded-xl border border-cyan-100">
                                  <div className="text-xs">
                                    <p className="font-bold text-slate-800">{pkg.name}</p>
                                    <p className="text-[10px] text-cyan-700 font-semibold mt-0.5">
                                      Rp {pkg.price.toLocaleString('id-ID')} ({pkg.sessions}x Pertemuan)
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setNewCoachPackages(prev => prev.filter(id => id !== pkgId))}
                                    className="text-slate-400 hover:text-rose-600 transition p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer border-0"
                                    title="Hapus Paket"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                      <button 
                        type="button" 
                        onClick={() => setShowAddCoachModal(false)} 
                        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button 
                        type="submit" 
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-5 rounded-xl transition shadow-md shadow-cyan-600/10 cursor-pointer"
                      >
                        Simpan Pelatih
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* EDIT COACH MODAL */}
            {selectedEditCoachId && (
              <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                      <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Edit className="w-4 h-4 text-cyan-600" />
                        Edit Profil & Paket Pelatih
                      </h4>
                      <p className="text-[10px] text-slate-500">Sesuaikan data profil, kuota siswa, dan harga paket dari pelatih.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEditCoachId('')}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-4 text-xs text-slate-700 max-h-[70vh] overflow-y-auto">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-600">Nama Pelatih</label>
                        <input 
                          type="text" 
                          value={editCoachName} 
                          onChange={(e) => setEditCoachName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition" 
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="font-bold text-slate-600">Pengalaman / Biografi Singkat</label>
                        <input 
                          type="text" 
                          value={editCoachExperience} 
                          onChange={(e) => setEditCoachExperience(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition" 
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-600 block">Status Pelatih</label>
                        <div className="flex items-center gap-2 mt-2">
                          <input 
                            type="checkbox" 
                            id="edit-coach-active-modal"
                            checked={editCoachIsActive} 
                            onChange={(e) => setEditCoachIsActive(e.target.checked)}
                            className="w-4 h-4 rounded text-cyan-600 border-slate-350 focus:ring-cyan-500 cursor-pointer" 
                          />
                          <label htmlFor="edit-coach-active-modal" className="text-xs font-bold text-slate-750 cursor-pointer select-none">
                            {editCoachIsActive ? 'Aktif (Dapat Mengajar)' : 'Nonaktif'}
                          </label>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-600">Maks Quota Siswa</label>
                        <input 
                          type="number" 
                          value={editQuotaValue} 
                          onChange={(e) => setEditQuotaValue(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition" 
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-600">Kode Referral</label>
                        <input 
                          type="text" 
                          value={editCoachReferralCode} 
                          onChange={(e) => setEditCoachReferralCode(e.target.value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase())}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600 block">Foto Pelatih</label>
                      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <div className="w-12 h-12 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center">
                          {editCoachPhoto ? (
                            <img src={editCoachPhoto} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="cursor-pointer bg-white hover:bg-slate-150 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-[10px] border border-slate-200 transition inline-block">
                            📁 Ganti & Upload Foto Baru
                            <input 
                              type="file" 
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (typeof reader.result === 'string') {
                                      setEditCoachPhoto(reader.result);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <p className="text-[10px] text-slate-400 font-medium">Unggah foto baru untuk mengganti foto pelatih ini.</p>
                        </div>
                      </div>
                    </div>

                    {/* Edit Sertifikat Pelatih */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600 block">Sertifikat Pelatih (Gambar / PDF)</label>
                      <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <div 
                          className="w-12 h-12 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center cursor-pointer relative group"
                          onClick={() => editCoachCertificate && setPreviewCertUrl(editCoachCertificate)}
                        >
                          {editCoachCertificate ? (
                            editCoachCertificate.toLowerCase().includes('.pdf') || editCoachCertificate.startsWith('data:application/pdf') ? (
                              <FileText className="w-6 h-6 text-rose-600" />
                            ) : (
                              <img src={editCoachCertificate} alt="Preview Sertifikat" className="w-full h-full object-cover" />
                            )
                          ) : (
                            <Award className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="cursor-pointer bg-white hover:bg-slate-150 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg text-[10px] border border-slate-200 transition inline-block">
                            📜 Upload / Ganti Sertifikat (Gambar / PDF)
                            <input 
                              type="file" 
                              accept="image/*,.pdf,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    if (typeof reader.result === 'string') {
                                      setEditCoachCertificate(reader.result);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <p className="text-[10px] text-slate-400 font-medium">Unggah sertifikat resmi pelatih (PNG, JPG, PDF) yang dapat diklik oleh pengguna.</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-150 space-y-3">
                      <div className="flex justify-between items-center">
                        <h5 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Kelola Paket Belajar Pelatih</h5>
                      </div>

                      {/* Dropdown to add package */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 block">Pilih Paket:</label>
                        <SearchableSelect
                          placeholder="-- Pilih Paket Untuk Ditambahkan --"
                          options={globalPricingPackages
                            .filter(gp => !editCoachPackages.some(ecp => ecp.name.toLowerCase().trim() === gp.name.toLowerCase().trim()))
                            .map(gp => ({
                              value: gp.id,
                              label: `${gp.name} - Rp ${gp.price.toLocaleString('id-ID')} (${gp.sessions} Sesi)`
                            }))
                          }
                          onSelect={(pkgId) => {
                            const selectedPkg = globalPricingPackages.find(p => p.id === pkgId);
                            if (selectedPkg) {
                              const alreadyAdded = editCoachPackages.some(ep => 
                                ep.name.toLowerCase().trim() === selectedPkg.name.toLowerCase().trim()
                              );
                              if (alreadyAdded) {
                                Swal.fire({
                                  title: 'Sudah Ada',
                                  text: 'Paket ini sudah terdaftar pada pelatih.',
                                  icon: 'info',
                                  confirmButtonColor: '#06b6d4'
                                });
                              } else {
                                const newId = `pkg-${selectedEditCoachId}-${selectedPkg.id}`;
                                setEditCoachPackages(prev => [...prev, {
                                  id: newId,
                                  name: selectedPkg.name,
                                  price: selectedPkg.price,
                                  sessions: selectedPkg.sessions
                                }]);
                              }
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 block">Daftar Paket Aktif Pelatih:</label>
                        {editCoachPackages.length === 0 ? (
                          <p className="text-[10px] text-slate-400 italic">Belum ada paket belajar untuk pelatih ini.</p>
                        ) : (
                          editCoachPackages.map((pkg, idx) => (
                            <div key={pkg.id || idx} className="flex justify-between items-center bg-cyan-50/20 p-2.5 rounded-xl border border-cyan-100">
                              <div className="text-xs">
                                <p className="font-bold text-slate-800">{pkg.name}</p>
                                <p className="text-[10px] text-cyan-700 font-semibold mt-0.5">
                                  Rp {pkg.price.toLocaleString('id-ID')} ({pkg.sessions}x Pertemuan)
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteEditPackage(pkg.id)}
                                className="text-slate-400 hover:text-rose-600 transition p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer border-0"
                                title="Hapus Paket"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedEditCoachId('')}
                      className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveCoachSettings(selectedEditCoachId)}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-5 rounded-xl transition shadow-md shadow-cyan-600/10 cursor-pointer"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ADD SLOT MODAL */}
            {showAddSlotModal && (
              <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <div>
                      <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-cyan-600" />
                        Tambah Slot Latihan
                      </h4>
                      <p className="text-[10px] text-slate-500">Hari {addSlotDayName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddSlotModal(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <form onSubmit={handleSaveScheduleSlot} className="p-6 space-y-4 text-xs text-slate-700">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">Jam Latihan (WIB) <span className="text-rose-500">*</span></label>
                      <input
                        type="time"
                        value={newSlotTime}
                        onChange={(e) => setNewSlotTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                        required
                        autoFocus
                      />
                      <p className="text-[9px] text-slate-400">Pilih jam dan menit menggunakan pemilih waktu.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600">Pilih Kolam Renang <span className="text-rose-500">*</span></label>
                      <SearchableSelect
                        options={swimmingPools.map(p => ({ value: p.id, label: p.name }))}
                        value={addSlotPoolId}
                        onChange={(val) => setAddSlotPoolId(val)}
                        placeholder="-- Pilih Kolam Renang --"
                      />
                    </div>

                    {/* Modal Footer Actions */}
                    <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 bg-white">
                      <button
                        type="button"
                        onClick={() => setShowAddSlotModal(false)}
                        className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-xl transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-5 rounded-xl transition shadow-md shadow-cyan-600/10 cursor-pointer"
                      >
                        Simpan Slot
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: LAPORAN KEUANGAN */}
        {activeTab === 'laporan' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Laporan Pendapatan & Grafik Perkembangan</h3>
              <p className="text-slate-500 text-xs">Visualisasi data pertumbuhan siswa aktif dan rincian omzet dana kas Tirta Barokah.</p>
            </div>

            {/* Filter Rentang Tanggal Laporan Keuangan */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-3 text-xs text-slate-700">
              <span className="font-extrabold text-[10px] text-slate-400 block uppercase tracking-wider">
                Filter Rentang Tanggal Transaksi Keuangan (Pembayaran)
              </span>
              <div className="flex flex-col md:flex-row items-end gap-3">
                <div className="space-y-1 w-full md:w-auto">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={financeStartDate}
                    onChange={(e) => setFinanceStartDate(e.target.value)}
                    className="w-full md:w-44 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium"
                  />
                </div>
                <div className="space-y-1 w-full md:w-auto">
                  <label className="text-[10px] font-bold text-slate-500 block uppercase">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={financeEndDate}
                    onChange={(e) => setFinanceEndDate(e.target.value)}
                    className="w-full md:w-44 bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-medium"
                  />
                </div>
                {(financeStartDate || financeEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFinanceStartDate('');
                      setFinanceEndDate('');
                    }}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-750 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {(() => {
              const filteredMembersForFinance = members.filter(m => {
                if (!m.payment || !m.payment.date) return false;
                const payDate = m.payment.date.substring(0, 10);
                if (financeStartDate && payDate < financeStartDate) return false;
                if (financeEndDate && payDate > financeEndDate) return false;
                return true;
              });

              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
              const currentYear = new Date().getFullYear();

              const monthlyRevenueData = months.map((mName, idx) => {
                const revenue = filteredMembersForFinance
                  .filter(m => {
                    if (m.payment.status !== 'Pembayaran Berhasil') return false;
                    if (!m.payment.date) return false;
                    const d = new Date(m.payment.date.replace(' ', 'T'));
                    return d.getFullYear() === currentYear && d.getMonth() === idx;
                  })
                  .reduce((sum, m) => sum + m.payment.amount, 0);

                return {
                  name: mName,
                  pendapatan: revenue
                };
              });

              const dynamicTotalRevenue = filteredMembersForFinance
                .filter(m => m.payment.status === 'Pembayaran Berhasil')
                .reduce((sum, m) => sum + m.payment.amount, 0);

              const dynamicActiveMembersCount = filteredMembersForFinance.filter(m => m.status === 'Aktif' || m.status === 'Paket Hampir Habis').length;

              const dynamicMemberGrowthData = months.map((mName, idx) => {
                const count = members.filter(m => {
                  if (!m.payment || !m.payment.date) return false;
                  const d = new Date(m.payment.date.replace(' ', 'T'));
                  return d.getFullYear() === currentYear && d.getMonth() <= idx && m.payment.status === 'Pembayaran Berhasil';
                }).length;
                return {
                  bulan: mName,
                  member: count + 2
                };
              });

              const filteredMembersForHistory = members.filter(m => {
                if (!m.payment || !m.payment.date) return false;
                const payDate = m.payment.date.substring(0, 10);
                if (historyStartDate && payDate < historyStartDate) return false;
                if (historyEndDate && payDate > historyEndDate) return false;
                return true;
              });

              return (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Box 1: Monthly Revenue */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60">
                      <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-cyan-600" /> Data Pendapatan per Bulan
                      </h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyRevenueData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v: any) => `Rp ${v.toLocaleString('id-ID')}`} />
                            <Bar dataKey="pendapatan" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Box 2: Member Growth */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60">
                      <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-cyan-600" /> Tren Pertumbuhan Member Baru
                      </h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dynamicMemberGrowthData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="bulan" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="member" stroke="#4f46e5" fill="#e0e7ff" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Income Statement Summary */}
                  <div className="bg-cyan-950 text-white rounded-2xl p-6 border border-cyan-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-cyan-400">Kas Pemasukan Berhasil Diverifikasi</h4>
                      <p className="text-2xl font-black font-mono">Rp {dynamicTotalRevenue.toLocaleString('id-ID')}</p>
                      <p className="text-[10px] text-cyan-300">Dana terkumpul dari transfer BNI dan Kasir Kolam renang yang sudah disetujui Admin pada periode ini.</p>
                    </div>
                    <div className="space-y-1 text-xs md:text-right">
                      <p>Total Transaksi Terfilter: <strong>{filteredMembersForFinance.length} Kali</strong></p>
                      <p>Status Aktif Terfilter: <strong>{dynamicActiveMembersCount} Siswa</strong></p>
                      <p>Tipe Privat 1-on-1: <strong>{filteredMembersForFinance.filter(m => m.coachType === 'Privat').length} Siswa</strong></p>
                    </div>
                  </div>

                  {/* Riwayat Pembayaran Table */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="w-5 h-5 text-cyan-600" /> Riwayat Lengkap Pembayaran
                        </h4>
                        <p className="text-slate-500 text-[11px] mt-0.5">Daftar transaksi pembayaran pendaftaran baru maupun perpanjangan paket murid.</p>
                      </div>

                      {/* Filter Tanggal Khusus Tabel Riwayat */}
                      <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 flex flex-col sm:flex-row items-end gap-2.5 text-[10px] text-slate-700 w-full lg:w-auto">
                        <span className="font-extrabold text-[9px] text-slate-400 block uppercase tracking-wider mb-1 sm:mb-0 mr-1 sm:self-center">
                          Rentang Tanggal Tabel:
                        </span>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-500 block uppercase">Mulai</label>
                          <input
                            type="date"
                            value={historyStartDate}
                            onChange={(e) => setHistoryStartDate(e.target.value)}
                            className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-[10px] font-medium"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[9px] font-bold text-slate-500 block uppercase">Selesai</label>
                          <input
                            type="date"
                            value={historyEndDate}
                            onChange={(e) => setHistoryEndDate(e.target.value)}
                            className="bg-white border border-slate-200 px-2 py-1 rounded-lg text-[10px] font-medium"
                          />
                        </div>
                        {(historyStartDate || historyEndDate) && (
                          <button
                            type="button"
                            onClick={() => {
                              setHistoryStartDate('');
                              setHistoryEndDate('');
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-750 font-bold px-2 py-1.5 rounded-lg text-[9px] transition cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="p-3">Tanggal</th>
                            <th className="p-3">Siswa (ID)</th>
                            <th className="p-3">Metode</th>
                            <th className="p-3">Nominal</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredMembersForHistory.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-slate-400 italic">Tidak ada transaksi pembayaran pada rentang tanggal ini.</td>
                            </tr>
                          ) : (
                            filteredMembersForHistory
                              .map(m => ({
                                memberId: m.id,
                                studentName: m.student.fullName,
                                amount: m.payment.amount,
                                method: m.payment.method,
                                status: m.payment.status,
                                date: m.payment.date
                              }))
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((p, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition">
                                  <td className="p-3 font-mono text-[10px] text-slate-500">
                                    {p.date ? p.date.substring(0, 16).replace('T', ' ') : '-'}
                                  </td>
                                  <td className="p-3">
                                    <span className="font-bold text-slate-700 block">{p.studentName}</span>
                                    <span className="text-[9px] font-mono text-slate-400">ID: {p.memberId}</span>
                                  </td>
                                  <td className="p-3 text-slate-650">{p.method}</td>
                                  <td className="p-3 font-bold font-mono text-cyan-900">
                                    Rp {p.amount.toLocaleString('id-ID')}
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                      p.status === 'Pembayaran Berhasil' 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : p.status === 'Pembayaran Gagal'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                                    }`}>
                                      {p.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* TAB 7: KELOLA PROFIL & LEVEL */}
        {activeTab === 'pengaturan' && (
          <SettingsAndLevelsTab 
            settings={settings}
            levels={levels}
            coaches={coaches}
            pricingPackages={pricingPackages}
            onUpdateSettings={onUpdateSettings}
            onUpdateLevels={onUpdateLevels}
            onReloadData={onReloadData}
          />
        )}

        {/* TAB 8: LOG AKTIVITAS / AUDIT LOGS */}
        {activeTab === 'audit_logs' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Log Aktivitas & Audit Sistem</h3>
                <p className="text-slate-500 text-xs">
                  Rekaman riwayat input, edit, hapus, dan verifikasi data yang dilakukan oleh administrator atau pelatih.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onReloadData()}
                className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-600 animate-spin-hover" /> Segarkan Log
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 space-y-4 shadow-xs">
              {/* Filter Rentang Tanggal Audit Log */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-600" /> Filter Rentang Tanggal Aktivitas
                  </span>
                  {(auditStartDate || auditEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuditStartDate('');
                        setAuditEndDate('');
                      }}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-500 underline cursor-pointer"
                    >
                      Reset Tanggal
                    </button>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="space-y-1 w-full sm:w-1/2 md:w-auto">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">Dari Tanggal</label>
                    <input
                      type="date"
                      value={auditStartDate}
                      onChange={(e) => setAuditStartDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-slate-700 cursor-pointer"
                    />
                  </div>
                  
                  <span className="text-slate-400 hidden sm:inline font-bold mt-4">-</span>

                  <div className="space-y-1 w-full sm:w-1/2 md:w-auto">
                    <label className="text-[10px] font-bold text-slate-500 block uppercase">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={auditEndDate}
                      onChange={(e) => setAuditEndDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-slate-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Search & Filter Aksi */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <input
                  type="text"
                  placeholder="Cari pelaku, deskripsi, atau tabel..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full md:max-w-md bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition font-medium"
                />
                
                <div className="flex gap-2 w-full md:w-auto">
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value as any)}
                    className="w-full md:w-48 bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 text-slate-700 font-bold"
                  >
                    <option value="semua">Semua Tipe Aksi</option>
                    <option value="input">Input / Tambah</option>
                    <option value="edit">Edit / Ubah</option>
                    <option value="hapus">Hapus</option>
                    <option value="verifikasi">Verifikasi</option>
                  </select>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto border border-slate-150 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-extrabold border-b border-slate-150">
                      <th className="px-4 py-3.5">Waktu</th>
                      <th className="px-4 py-3.5">Pengguna</th>
                      <th className="px-4 py-3.5">Aksi</th>
                      <th className="px-4 py-3.5">Kategori Data</th>
                      <th className="px-4 py-3.5">Keterangan Aktivitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
                    {(() => {
                      const filteredLogs = auditLogs.filter(log => {
                        const matchesSearch = 
                          log.username.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          (log.user_name || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.description.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          log.table_name.toLowerCase().includes(auditSearch.toLowerCase());
                        
                        const matchesAction = 
                          auditActionFilter === 'semua' || 
                          log.action_type === auditActionFilter;

                        const logDateStr = log.created_at ? log.created_at.substring(0, 10) : '';
                        const matchesStartDate = !auditStartDate || logDateStr >= auditStartDate;
                        const matchesEndDate = !auditEndDate || logDateStr <= auditEndDate;

                        return matchesSearch && matchesAction && matchesStartDate && matchesEndDate;
                      });

                      if (filteredLogs.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">
                              Tidak ada log aktivitas yang sesuai filter.
                            </td>
                          </tr>
                        );
                      }

                      return filteredLogs.map((log) => {
                        let actionBadge = '';
                        switch (log.action_type) {
                          case 'input':
                            actionBadge = 'bg-blue-50 border border-blue-200 text-blue-600';
                            break;
                          case 'edit':
                            actionBadge = 'bg-violet-50 border border-violet-200 text-violet-600';
                            break;
                          case 'hapus':
                            actionBadge = 'bg-rose-50 border border-rose-200 text-rose-600';
                            break;
                          case 'verifikasi':
                            actionBadge = 'bg-emerald-50 border border-emerald-200 text-emerald-600';
                            break;
                        }

                        // Map technical table names to friendly descriptions
                        const friendlyTable: Record<string, string> = {
                          'coaches': 'Profil Pelatih',
                          'members': 'Pendaftaran/Data Siswa',
                          'events': 'Event & Berita',
                          'site_settings': 'Pengaturan Website',
                          'program_levels': 'Tingkatan Level',
                          'pricing_packages': 'Paket Harga Global'
                        };

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition">
                            <td className="px-4 py-3.5 text-[11px] text-slate-500 font-mono">
                              {new Date(log.created_at).toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3.5">
                              <div>
                                <p className="font-bold text-slate-800">{log.user_name || log.username}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] text-slate-400 font-mono">@{log.username}</span>
                                  <span className={`text-[8px] px-1 rounded-sm font-bold uppercase ${
                                    log.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-655'
                                  }`}>
                                    {log.role}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${actionBadge}`}>
                                {log.action_type === 'input' ? 'tambah' : log.action_type}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-bold text-slate-600 text-[11px]">
                              {friendlyTable[log.table_name] || log.table_name}
                            </td>
                            <td className="px-4 py-3.5 text-slate-700 text-xs">
                              {log.description}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      {/* ATTENDANCE MODAL */}
      {showAttendanceModal && attendanceMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-cyan-600" />
                  Presensi & Riwayat Latihan: {attendanceMember.student.fullName}
                </h4>
                <p className="text-[10px] text-slate-500">Catat kehadiran latihan baru atau tinjau catatan log presensi sesi sebelumnya.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Two Column Layout */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs text-slate-700">
              
              {/* Left Column: Log Attendance Form (col-span-5) */}
              {!(attendanceMember.isActive === false || attendanceMember.sessionsLeft <= 0 || attendanceMember.status === 'Selesai') && (
                <div className="lg:col-span-5 space-y-4 border-r border-slate-150 lg:pr-6 pr-0 border-b lg:border-b-0 pb-6 lg:pb-0">
                  <h5 className="font-extrabold text-xs text-cyan-700 uppercase tracking-wider border-b border-cyan-100 pb-1.5">
                    📝 Catat Presensi Baru
                  </h5>

                  <form onSubmit={submitAttendanceRecord} className="space-y-4">
                    <div className="p-3.5 bg-cyan-50/50 border border-cyan-100 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-semibold block uppercase">Informasi Sesi Latihan:</span>
                      <div className="flex justify-between items-center text-slate-800 font-bold">
                        <span>Sisa Sesi:</span>
                        <span className="text-sm text-cyan-800 font-black">
                          {attendanceMember.sessionsLeft} / {attendanceMember.sessionsTotal} Sesi
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600 uppercase block text-[10px]">Status Kehadiran</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['Hadir', 'Absen', 'Izin'] as const).map(status => (
                          <button
                            type="button"
                            key={status}
                            onClick={() => {
                              setNewAttendanceStatus(status);
                              if (status === 'Hadir') {
                                setNewAttendanceNote('Menyelesaikan sesi latihan rutin dengan baik. Fokus gerakan hari ini tercapai.');
                              } else if (status === 'Absen') {
                                setNewAttendanceNote('Siswa absen tanpa keterangan pada jadwal latihan rutin.');
                              } else {
                                setNewAttendanceNote('Siswa berhalangan hadir dengan izin tertulis / pemberitahuan sebelumnya.');
                              }
                            }}
                            className={`py-2 text-xs rounded-xl font-bold border transition cursor-pointer ${
                              newAttendanceStatus === status
                                ? 'bg-cyan-600 text-white border-transparent shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {status === 'Hadir' ? '✓ Hadir' : status === 'Absen' ? '✗ Absen' : '- Izin'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-600 uppercase block text-[10px]">Catatan Latihan / Presensi</label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Contoh: Budi berlatih gerakan kayuhan tangan gaya bebas bolak-balik 10 meter dengan baik..."
                        value={newAttendanceNote}
                        onChange={(e) => setNewAttendanceNote(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:bg-white text-xs focus:ring-2 focus:ring-cyan-500/20 focus:outline-hidden transition"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/10 cursor-pointer"
                    >
                      <CheckSquare className="w-4 h-4" /> Simpan Presensi Baru
                    </button>
                  </form>
                </div>
              )}

              {/* Right Column: Attendance History List */}
              <div className={attendanceMember.isActive === false || attendanceMember.sessionsLeft <= 0 || attendanceMember.status === 'Selesai' ? "lg:col-span-12 space-y-4" : "lg:col-span-7 space-y-4"}>
                <h5 className="font-extrabold text-xs text-cyan-700 uppercase tracking-wider border-b border-cyan-100 pb-1.5">
                  ⏳ Riwayat Sesi Sebelumnya
                </h5>

                {attendanceMember.progress.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 italic">Belum ada riwayat presensi / latihan untuk siswa ini.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {attendanceMember.progress.map((log, index) => {
                      const coach = coaches.find(c => c.id === attendanceMember.coachId);
                      const startSessionNum = Math.max(attendanceMember.sessionsTotal - attendanceMember.sessionsLeft, attendanceMember.progress.length);
                      const sessionNum = startSessionNum - index;
                      return (
                        <div key={log.id} className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 space-y-2 hover:border-slate-300 transition">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                              Sesi Ke-{sessionNum}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                              log.attendance === 'Hadir'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : log.attendance === 'Absen'
                                ? 'bg-rose-50 border-rose-200 text-rose-700'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}>
                              {log.attendance === 'Hadir' ? '✓ Hadir' : log.attendance === 'Absen' ? '✗ Absen' : '- Izin'}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium leading-relaxed">{log.note}</p>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                            <span>📅 Waktu: {log.date}</span>
                            <span>👤 Pelatih: {coach?.name || 'Pelatih'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal Preview Sertifikat Pelatih (Gambar & PDF) */}
      {previewCertUrl && (() => {
        const isPdf = previewCertUrl.toLowerCase().includes('.pdf') || previewCertUrl.startsWith('data:application/pdf');
        let pdfTargetUrl = previewCertUrl;
        if (previewCertUrl.startsWith('data:application/pdf')) {
          try {
            const parts = previewCertUrl.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/pdf';
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            pdfTargetUrl = URL.createObjectURL(blob);
          } catch (e) {
            pdfTargetUrl = previewCertUrl;
          }
        }

        return (
          <div 
            className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md cursor-pointer"
            onClick={() => setPreviewCertUrl(null)}
          >
            <div className="relative bg-white rounded-3xl p-4 max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3 shrink-0">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                  {isPdf ? <FileText className="w-4 h-4 text-rose-600" /> : '📜'}
                  <span>{isPdf ? 'Dokumen Sertifikat Pelatih (PDF)' : 'Sertifikat Pelatih'}</span>
                </h4>
                <div className="flex items-center gap-2">
                  <a
                    href={pdfTargetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download="sertifikat_pelatih.pdf"
                    className="text-[11px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm"
                  >
                    ↗ Buka / Unduh PDF
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewCertUrl(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center bg-slate-900/5 rounded-2xl p-2">
                {isPdf ? (
                  <object 
                    data={pdfTargetUrl} 
                    type="application/pdf"
                    className="w-full h-[70vh] rounded-xl border border-slate-200 shadow-inner bg-white"
                  >
                    <iframe 
                      src={pdfTargetUrl} 
                      title="Sertifikat Pelatih PDF" 
                      className="w-full h-[70vh] rounded-xl border border-slate-200 shadow-inner bg-white"
                    />
                  </object>
                ) : (
                  <img 
                    src={previewCertUrl} 
                    alt="Sertifikat Pelatih" 
                    className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-200" 
                  />
                )}
              </div>
            </div>
          </div>
        );
      })()}

      </div>
    </div>
  </div>
  );
}

function SettingsAndLevelsTab({ 
  settings, 
  levels, 
  coaches,
  pricingPackages,
  onUpdateSettings, 
  onUpdateLevels,
  onReloadData
}: { 
  settings: SiteSettings; 
  levels: ProgramLevel[]; 
  coaches: Coach[];
  pricingPackages: PricingPackage[];
  onUpdateSettings: (settings: SiteSettings) => void;
  onUpdateLevels: (levels: ProgramLevel[]) => void;
  onReloadData: () => void;
}) {
  const [localSettings, setLocalSettings] = useState<SiteSettings>({ ...settings });
  
  // Levels states
  const [editingLevel, setEditingLevel] = useState<ProgramLevel | null>(null);
  const [isAddingLevel, setIsAddingLevel] = useState(false);
  const [levelForm, setLevelForm] = useState<ProgramLevel>({
    level_number: 1,
    name: '',
    target_learning: '',
    materials: '',
    graduation_target: ''
  });

  // Bank accounts states
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [bankForm, setBankForm] = useState<BankAccount>({
    id: '',
    bank_name: '',
    account_number: '',
    account_holder: ''
  });

  // Pricing packages states
  const [editingPricing, setEditingPricing] = useState<PricingPackage | null>(null);
  const [isAddingPricing, setIsAddingPricing] = useState(false);
  const [pricingForm, setPricingForm] = useState<PricingPackage>({
    id: '',
    category: 'REGULER',
    name: '',
    price: 0,
    sessions: 5,
    active_period: '',
    description: ''
  });

  // Password change modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordOld, setPasswordOld] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordOld) {
      Swal.fire({ title: 'Gagal', text: 'Password lama wajib diisi!', icon: 'error', confirmButtonColor: '#06b6d4' });
      return;
    }
    if (!passwordNew) {
      Swal.fire({ title: 'Gagal', text: 'Password baru wajib diisi!', icon: 'error', confirmButtonColor: '#06b6d4' });
      return;
    }
    if (passwordNew.length < 4) {
      Swal.fire({ title: 'Gagal', text: 'Password minimal 4 karakter!', icon: 'error', confirmButtonColor: '#06b6d4' });
      return;
    }
    if (passwordNew !== passwordConfirm) {
      Swal.fire({ title: 'Gagal', text: 'Konfirmasi password tidak cocok!', icon: 'error', confirmButtonColor: '#06b6d4' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res: any = await api.changePassword({
        oldPassword: passwordOld,
        newPassword: passwordNew
      });
      Swal.fire({
        title: 'Berhasil!',
        text: res.message || 'Password Admin berhasil diperbarui!',
        icon: 'success',
        confirmButtonColor: '#06b6d4'
      });
      setPasswordOld('');
      setPasswordNew('');
      setPasswordConfirm('');
      setShowPasswordModal(false);
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal!',
        text: err.message || 'Gagal mengubah password.',
        icon: 'error',
        confirmButtonColor: '#06b6d4'
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    setLocalSettings({ ...settings });
    
    // Load Bank Accounts
    if (settings.bank_accounts) {
      try {
        const parsed = JSON.parse(settings.bank_accounts);
        if (Array.isArray(parsed)) {
          setBankAccounts(parsed);
        }
      } catch (e) {}
    } else {
      setBankAccounts([]);
    }
  }, [settings]);

  const handleDeleteBank = (id: string) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: 'Ingin menghapus rekening ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const updated = bankAccounts.filter(b => b.id !== id);
        setBankAccounts(updated);
        const updatedSettings = { ...localSettings, bank_accounts: JSON.stringify(updated) };
        setLocalSettings(updatedSettings);
        try {
          await api.updateSettings(updatedSettings);
          onUpdateSettings(updatedSettings);
          Swal.fire({
            title: 'Terhapus!',
            text: 'Rekening berhasil dihapus!',
            icon: 'success',
            confirmButtonColor: '#06b6d4'
          });
        } catch (e) {
          Swal.fire({
            title: 'Gagal!',
            text: 'Gagal menghapus rekening: ' + e,
            icon: 'error',
            confirmButtonColor: '#06b6d4'
          });
        }
      }
    });
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    let updated: BankAccount[];
    if (isAddingBank) {
      const newAcc = { ...bankForm, id: 'bank-' + Date.now() };
      updated = [...bankAccounts, newAcc];
    } else {
      updated = bankAccounts.map(b => b.id === bankForm.id ? bankForm : b);
    }
    setBankAccounts(updated);
    setIsAddingBank(false);
    setEditingBank(null);
    const updatedSettings = { ...localSettings, bank_accounts: JSON.stringify(updated) };
    setLocalSettings(updatedSettings);
    try {
      await api.updateSettings(updatedSettings);
      onUpdateSettings(updatedSettings);
      Swal.fire({
        title: 'Berhasil!',
        text: 'Rekening berhasil disimpan!',
        icon: 'success',
        confirmButtonColor: '#06b6d4'
      });
    } catch (e) {
      Swal.fire({
        title: 'Gagal!',
        text: 'Gagal menyimpan rekening: ' + e,
        icon: 'error',
        confirmButtonColor: '#06b6d4'
      });
    }
  };

  const handleDeletePricing = (id: string) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: 'Ingin menghapus paket harga ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.deletePricingPackage(id);
          onReloadData();
          Swal.fire({
            title: 'Terhapus!',
            text: 'Paket harga berhasil dihapus!',
            icon: 'success',
            confirmButtonColor: '#06b6d4'
          });
        } catch (e) {
          Swal.fire({
            title: 'Gagal!',
            text: 'Gagal menghapus paket: ' + e,
            icon: 'error',
            confirmButtonColor: '#06b6d4'
          });
        }
      }
    });
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isAddingPricing) {
        const newPkg = { ...pricingForm, id: 'pricing-' + Date.now() };
        await api.addPricingPackage(newPkg);
      } else {
        await api.updatePricingPackage(pricingForm);
      }
      setIsAddingPricing(false);
      setEditingPricing(null);
      onReloadData();
      Swal.fire({
        title: 'Berhasil!',
        text: 'Paket harga berhasil disimpan!',
        icon: 'success',
        confirmButtonColor: '#06b6d4'
      });
    } catch (e) {
      Swal.fire({
        title: 'Gagal!',
        text: 'Gagal menyimpan paket: ' + e,
        icon: 'error',
        confirmButtonColor: '#06b6d4'
      });
    }
  };

  const handleSaveSettings = async () => {
    try {
      await api.updateSettings(localSettings);
      onUpdateSettings(localSettings);
      Swal.fire({
        title: 'Berhasil!',
        text: 'Pengaturan profil berhasil disimpan!',
        icon: 'success',
        confirmButtonColor: '#06b6d4'
      });
    } catch (e) {
      Swal.fire({
        title: 'Gagal!',
        text: 'Gagal menyimpan pengaturan: ' + e,
        icon: 'error',
        confirmButtonColor: '#06b6d4'
      });
    }
  };

  const handleEditLevelClick = (lvl: ProgramLevel) => {
    setEditingLevel(lvl);
    setLevelForm({ ...lvl });
  };

  const handleAddNewLevelClick = () => {
    setIsAddingLevel(true);
    const nextNumber = levels.length > 0 ? Math.max(...levels.map(l => l.level_number)) + 1 : 1;
    setLevelForm({
      level_number: nextNumber,
      name: '',
      target_learning: '',
      materials: '',
      graduation_target: ''
    });
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isAddingLevel) {
        await api.addLevel(levelForm);
        Swal.fire({
          title: 'Berhasil!',
          text: 'Level program baru berhasil ditambahkan!',
          icon: 'success',
          confirmButtonColor: '#06b6d4'
        });
      } else if (editingLevel) {
        await api.updateLevel(levelForm);
        Swal.fire({
          title: 'Berhasil!',
          text: 'Level program berhasil diperbarui!',
          icon: 'success',
          confirmButtonColor: '#06b6d4'
        });
      }
      setIsAddingLevel(false);
      setEditingLevel(null);
      
      const freshLevels = await api.getLevels();
      onUpdateLevels(freshLevels);
    } catch (e) {
      Swal.fire({
        title: 'Gagal!',
        text: 'Gagal menyimpan level: ' + e,
        icon: 'error',
        confirmButtonColor: '#06b6d4'
      });
    }
  };

  const handleDeleteLevel = async (id: number | string) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: 'Apakah Anda yakin ingin menghapus level program ini?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.deleteLevel(id);
          Swal.fire({
            title: 'Terhapus!',
            text: 'Level program berhasil dihapus!',
            icon: 'success',
            confirmButtonColor: '#06b6d4'
          });
          const freshLevels = await api.getLevels();
          onUpdateLevels(freshLevels);
        } catch (e) {
          Swal.fire({
            title: 'Gagal!',
            text: 'Gagal menghapus level: ' + e,
            icon: 'error',
            confirmButtonColor: '#06b6d4'
          });
        }
      }
    });
  };

  return (
    <div className="space-y-10">
      {/* SECTION 1: SETTINGS */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-600" /> Kelola Informasi Profil & Website
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Edit teks deskripsi profil lembaga, keunggulan why-choose, dan catatan paket di halaman depan.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-md shadow-violet-600/10 cursor-pointer shrink-0"
          >
            <Key className="w-4 h-4" /> Ganti Password
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-extrabold text-xs text-cyan-700 uppercase tracking-wider">Profil Tirta Barokah</h4>
            
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Judul Profil</label>
              <input
                type="text"
                value={localSettings.profile_heading || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, profile_heading: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-slate-800 font-bold"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Paragraf 1 (Pembuka)</label>
              <textarea
                rows={3}
                value={localSettings.profile_text_1 || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, profile_text_1: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-slate-805 leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Paragraf 2 (Kurikulum/Metode)</label>
              <textarea
                rows={3}
                value={localSettings.profile_text_2 || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, profile_text_2: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-slate-805 leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Paragraf 3 (Tim Pelatih & Goal)</label>
              <textarea
                rows={3}
                value={localSettings.profile_text_3 || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, profile_text_3: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-slate-805 leading-relaxed"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-extrabold text-xs text-cyan-700 uppercase tracking-wider">Mengapa Memilih (Why Choose Us)</h4>
            
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Judul Why Choose</label>
              <input
                type="text"
                value={localSettings.why_choose_heading || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, why_choose_heading: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-slate-800 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 border border-slate-105 p-3 rounded-xl bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-500 block">Kelebihan 1</span>
                <input
                  type="text"
                  placeholder="Judul"
                  value={localSettings.why_choose_1_title || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, why_choose_1_title: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold"
                />
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat"
                  value={localSettings.why_choose_1_desc || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, why_choose_1_desc: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-[10px]"
                />
              </div>

              <div className="space-y-2 border border-slate-105 p-3 rounded-xl bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-500 block">Kelebihan 2</span>
                <input
                  type="text"
                  placeholder="Judul"
                  value={localSettings.why_choose_2_title || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, why_choose_2_title: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold"
                />
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat"
                  value={localSettings.why_choose_2_desc || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, why_choose_2_desc: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-[10px]"
                />
              </div>

              <div className="space-y-2 border border-slate-105 p-3 rounded-xl bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-500 block">Kelebihan 3</span>
                <input
                  type="text"
                  placeholder="Judul"
                  value={localSettings.why_choose_3_title || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, why_choose_3_title: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold"
                />
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat"
                  value={localSettings.why_choose_3_desc || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, why_choose_3_desc: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-[10px]"
                />
              </div>

              <div className="space-y-2 border border-slate-105 p-3 rounded-xl bg-slate-50/50">
                <span className="text-[10px] font-bold text-slate-500 block">Kelebihan 4</span>
                <input
                  type="text"
                  placeholder="Judul"
                  value={localSettings.why_choose_4_title || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, why_choose_4_title: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold"
                />
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat"
                  value={localSettings.why_choose_4_desc || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, why_choose_4_desc: e.target.value })}
                  className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-lg text-[10px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 block">Catatan/Disclaimer Paket Pendaftaran</label>
              <textarea
                rows={2}
                value={localSettings.package_notes || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, package_notes: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-650 flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-100 flex-shrink-0">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.706 1.457h.006c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp Admin
                </span>
                Nomor WhatsApp Admin Konfirmasi <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: 6281234567890"
                value={localSettings.admin_whatsapp || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, admin_whatsapp: e.target.value.replace(/[^0-9]/g, '') })}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition text-slate-800 font-mono font-bold"
              />
              <p className="text-[10px] text-slate-400 font-medium">Nomor WhatsApp admin (tanpa tanda + atau 0 di depan, wajib diawali kode negara seperti 628xxxx) untuk menerima chat konfirmasi manual dari murid baru.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSaveSettings}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-md shadow-cyan-600/10 cursor-pointer"
          >
            Simpan Seluruh Pengaturan
          </button>
        </div>
      </div>

      {/* SECTION 1.5: BANK ACCOUNTS CRUD */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-650" /> Kelola Rekening Pembayaran (Transfer Bank)
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Kelola rekening bank yang tampil di formulir konfirmasi tagihan pendaftaran member baru.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAddingBank(true);
              setEditingBank(null);
              setBankForm({ id: '', bank_name: '', account_number: '', account_holder: '' });
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition shadow-md shadow-emerald-600/10"
          >
            <Plus className="w-4 h-4" /> Tambah Rekening
          </button>
        </div>

        {/* Bank accounts list */}
        {bankAccounts.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
            Belum ada rekening pembayaran yang didaftarkan. Formulir pendaftaran akan menggunakan rekening BNI default.
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {bankAccounts.map((acc) => (
              <div key={acc.id} className="border border-slate-200/70 p-4 rounded-xl bg-slate-50/30 flex flex-col justify-between hover:border-cyan-200 transition">
                <div className="space-y-1 text-xs">
                  <span className="font-extrabold text-[10px] bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded uppercase tracking-wider">{acc.bank_name}</span>
                  <p className="font-mono text-sm font-bold text-slate-800 mt-1">{acc.account_number}</p>
                  <p className="text-slate-500 font-medium">a.n. {acc.account_holder}</p>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBank(acc);
                      setIsAddingBank(false);
                      setBankForm({ ...acc });
                    }}
                    className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBank(acc.id)}
                    className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                    title="Hapus"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bank Account Modal Form */}
        {(isAddingBank || editingBank) && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="relative bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide">
                  {isAddingBank ? 'Tambah Rekening Baru' : 'Edit Rekening'}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingBank(false);
                    setEditingBank(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSaveBank} className="p-6 space-y-4 text-xs text-slate-700">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Nama Bank (Contoh: Transfer BNI, Mandiri, BCA)</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama bank"
                    value={bankForm.bank_name}
                    onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Nomor Rekening</label>
                  <input
                    type="text"
                    required
                    placeholder="Nomor rekening"
                    value={bankForm.account_number}
                    onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value.replace(/[^0-9-]/g, '') })}
                    className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">Nama Pemilik Rekening (Atas Nama)</label>
                  <input
                    type="text"
                    required
                    placeholder="Atas nama"
                    value={bankForm.account_holder}
                    onChange={(e) => setBankForm({ ...bankForm, account_holder: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingBank(false);
                      setEditingBank(null);
                    }}
                    className="border border-slate-300 hover:bg-slate-50 text-slate-650 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer transition shadow-md shadow-cyan-600/10"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1.6: PRICING PACKAGES CRUD */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-650" /> Kelola Informasi Paket & Harga Latihan (Homepage)
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Kelola paket latihan (PROMO, REGULER, PRIVATE) yang tampil di bagian informasi harga halaman depan.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAddingPricing(true);
              setEditingPricing(null);
              setPricingForm({
                id: '',
                category: 'REGULER',
                name: '',
                price: 0,
                sessions: 5,
                active_period: '',
                description: '',
                coachIds: []
              });
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition shadow-md shadow-emerald-600/10"
          >
            <Plus className="w-4 h-4" /> Tambah Paket Harga
          </button>
        </div>

        {/* Pricing packages list */}
        {pricingPackages.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
            Belum ada paket harga yang dibuat.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {pricingPackages.map((pkg) => (
              <div key={pkg.id} className="border border-slate-200/70 p-4 rounded-xl bg-slate-50/30 flex flex-col justify-between hover:border-cyan-200 transition">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className={`font-extrabold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider ${
                      pkg.category === 'PROMO' ? 'bg-rose-100 text-rose-800' :
                      pkg.category === 'PRIVATE' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-cyan-100 text-cyan-800'
                    }`}>
                      {pkg.category}
                    </span>
                    <span className="text-[10px] text-slate-450 font-bold">{pkg.active_period}</span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-sm">{pkg.name}</h4>
                  <p className="font-mono text-base font-black text-cyan-755">Rp {pkg.price.toLocaleString('id-ID')}</p>
                  <div className="space-y-1 text-slate-500 text-[11px] leading-relaxed">
                    <p>• <strong>{pkg.sessions}x</strong> Pertemuan Latihan</p>
                    {pkg.description && <p>• {pkg.description}</p>}
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPricing(pkg);
                      setIsAddingPricing(false);
                      setPricingForm({
                        ...pkg,
                        coachIds: pkg.coachIds || []
                      });
                    }}
                    className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePricing(pkg.id)}
                    className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                    title="Hapus"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pricing Modal Form */}
        {(isAddingPricing || editingPricing) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="relative bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md max-h-[85vh] md:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide">
                  {isAddingPricing ? 'Tambah Paket Baru' : 'Edit Paket Harga'}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPricing(false);
                    setEditingPricing(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSavePricing} className="flex flex-col flex-1 overflow-hidden">
                {/* Scrollable form body */}
                <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs text-slate-700 pr-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Kategori Paket</label>
                    <select
                      value={pricingForm.category}
                      onChange={(e) => setPricingForm({ ...pricingForm, category: e.target.value as any })}
                      className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                    >
                      <option value="PROMO">PROMO</option>
                      <option value="REGULER">REGULER</option>
                      <option value="PRIVATE">PRIVATE</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Nama Paket (Contoh: Paket Reguler PROMO 5x latihan)</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama paket"
                      value={pricingForm.name}
                      onChange={(e) => setPricingForm({ ...pricingForm, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 block">Harga (Rp)</label>
                      <input
                        type="number"
                        required
                        placeholder="Harga paket"
                        value={pricingForm.price || ''}
                        onChange={(e) => setPricingForm({ ...pricingForm, price: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 block">Jumlah Sesi Latihan</label>
                      <input
                        type="number"
                        required
                        placeholder="Jumlah sesi"
                        value={pricingForm.sessions || ''}
                        onChange={(e) => setPricingForm({ ...pricingForm, sessions: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Masa Aktif (Contoh: 1 Bulan, 3 Bulan, 2 Bulan)</label>
                    <input
                      type="text"
                      required
                      placeholder="Masa aktif"
                      value={pricingForm.active_period}
                      onChange={(e) => setPricingForm({ ...pricingForm, active_period: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 block">Deskripsi Paket / Aturan Main</label>
                    <textarea
                      placeholder="Contoh: 1 pelatih mengajar 1-6 anak. Jika tidak habis maka hangus."
                      value={pricingForm.description}
                      onChange={(e) => setPricingForm({ ...pricingForm, description: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
                    />
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    <label className="text-[11px] font-extrabold text-slate-700 block uppercase tracking-wider">Hubungkan dengan Pelatih</label>
                    <p className="text-[10px] text-slate-400 mb-2">Pilih pelatih yang melayani paket latihan ini:</p>
                    <div className="max-h-32 overflow-y-auto space-y-2 border border-slate-200/60 p-2.5 rounded-xl bg-slate-50/50">
                      {coaches.map(coach => {
                        const coachIds = pricingForm.coachIds || [];
                        const isChecked = coachIds.includes(coach.id);
                        return (
                          <label key={coach.id} className="flex items-center gap-2 text-xs font-semibold text-slate-750 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const updatedCoachIds = e.target.checked
                                  ? [...coachIds, coach.id]
                                  : coachIds.filter(id => id !== coach.id);
                                setPricingForm({ ...pricingForm, coachIds: updatedCoachIds });
                              }}
                              className="rounded text-cyan-600 focus:ring-cyan-500/20 w-4 h-4 border-slate-300 cursor-pointer"
                            />
                            <span>{coach.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Sticky action footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingPricing(false);
                      setEditingPricing(null);
                    }}
                    className="border border-slate-300 hover:bg-slate-50 text-slate-650 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer transition shadow-md shadow-cyan-600/10"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: LEVELS CRUD */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-cyan-600" /> Kelola Jenjang / Tingkat Kurikulum Latihan
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">Tambah, edit, atau hapus level pembelajaran renang bertahap yang tampil di beranda utama.</p>
          </div>
          <button
            type="button"
            onClick={handleAddNewLevelClick}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Level Baru
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-150 text-slate-500 font-extrabold uppercase bg-slate-50/50">
                <th className="py-3 px-4 w-16 text-center">Urutan</th>
                <th className="py-3 px-4 w-52">Nama Jenjang / Level</th>
                <th className="py-3 px-4">Target Pembelajaran</th>
                <th className="py-3 px-4">Materi Latihan</th>
                <th className="py-3 px-4 w-44">Target Kelulusan</th>
                <th className="py-3 px-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {levels.map((lvl) => (
                <tr key={lvl.id || lvl.level_number} className="hover:bg-slate-50/50 transition">
                  <td className="py-3.5 px-4 font-bold text-cyan-700 text-center">
                    <span className="inline-block bg-cyan-50 px-2 py-0.5 rounded text-[10px]">
                      Lvl {lvl.level_number}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{lvl.name}</td>
                  <td className="py-3.5 px-4 max-w-[200px] truncate" title={lvl.target_learning}>{lvl.target_learning}</td>
                  <td className="py-3.5 px-4 italic max-w-[200px] truncate" title={lvl.materials}>{lvl.materials}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-650 max-w-[150px] truncate" title={lvl.graduation_target}>{lvl.graduation_target}</td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditLevelClick(lvl)}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition cursor-pointer"
                        title="Edit Level"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => lvl.id && handleDeleteLevel(lvl.id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg transition cursor-pointer"
                        title="Hapus Level"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {levels.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">Belum ada data level renang yang tersimpan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT LEVEL MODAL */}
      {(isAddingLevel || editingLevel) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-155 shadow-2xl max-w-lg w-full overflow-hidden"
          >
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                {isAddingLevel ? 'Tambah Level Latihan Baru' : `Edit Level ${levelForm.level_number}: ${levelForm.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddingLevel(false);
                  setEditingLevel(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLevel} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-650">No. Level (Urutan)</label>
                  <input
                    type="number"
                    required
                    value={levelForm.level_number}
                    onChange={(e) => setLevelForm({ ...levelForm, level_number: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-semibold text-slate-650">Nama Jenjang / Level</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Water Confidence"
                    value={levelForm.name}
                    onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-655">Target Pembelajaran</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Deskripsikan kompetensi utama yang ditargetkan pada level ini..."
                  value={levelForm.target_learning}
                  onChange={(e) => setLevelForm({ ...levelForm, target_learning: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs text-slate-700 leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-655">Materi Latihan</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Sebutkan gerakan/aktivitas latihan (pisahkan dengan koma)..."
                  value={levelForm.materials}
                  onChange={(e) => setLevelForm({ ...levelForm, materials: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs text-slate-700 leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-655">Target Kelulusan</label>
                <input
                  type="text"
                  required
                  placeholder="Kriteria peserta lulus tingkatan ini"
                  value={levelForm.graduation_target}
                  onChange={(e) => setLevelForm({ ...levelForm, graduation_target: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-205 px-3 py-2 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingLevel(false);
                    setEditingLevel(null);
                  }}
                  className="border border-slate-300 hover:bg-slate-50 text-slate-600 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-md shadow-cyan-600/10 cursor-pointer"
                >
                  Simpan Level
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL UBAH PASSWORD ADMIN */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Key className="w-4 h-4 text-violet-600" /> Ubah Password Admin
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Masukkan password lama Anda dan tentukan password baru.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4 text-xs text-slate-700">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Password Lama <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan password Anda saat ini"
                  value={passwordOld}
                  onChange={(e) => setPasswordOld(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Password Baru <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 4 karakter"
                  value={passwordNew}
                  onChange={(e) => setPasswordNew(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Konfirmasi Password Baru <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  required
                  placeholder="Ketik ulang password baru"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="bg-violet-600 hover:bg-violet-500 disabled:bg-slate-300 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition shadow-md shadow-violet-600/10 cursor-pointer"
                >
                  {isChangingPassword ? 'Memproses...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}