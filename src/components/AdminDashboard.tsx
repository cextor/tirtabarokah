/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Coach, Member, Package, ScheduleDay, EventItem } from '../types';
import { 
  Users, DollarSign, Award, Calendar, ShieldCheck, TrendingUp, AlertTriangle, 
  Plus, Edit, Trash, Check, X, Bell, BarChart2, PieChart as PieIcon, Settings, Phone, CheckSquare, Sparkles, Image as ImageIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { motion } from 'motion/react';

interface AdminDashboardProps {
  coaches: Coach[];
  members: Member[];
  events: EventItem[];
  onUpdateCoaches: (coaches: Coach[]) => void;
  onUpdateMembers: (members: Member[]) => void;
  onUpdateEvents: (events: EventItem[]) => void;
}

export default function AdminDashboard({ 
  coaches, 
  members, 
  events,
  onUpdateCoaches, 
  onUpdateMembers,
  onUpdateEvents
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'verifikasi' | 'peserta' | 'pelatih' | 'reminder' | 'events' | 'laporan'>('verifikasi');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // STATE FOR ADDING NEW COACH
  const [showAddCoachModal, setShowAddCoachModal] = useState<boolean>(false);
  const [newCoachName, setNewCoachName] = useState<string>('');
  const [newCoachExperience, setNewCoachExperience] = useState<string>('');
  const [newCoachPhoto, setNewCoachPhoto] = useState<string>('');
  const [newCoachQuota, setNewCoachQuota] = useState<number>(6);

  // Default package templates for new coach
  const [newCoachPkg4Price, setNewCoachPkg4Price] = useState<number>(250000);
  const [newCoachPkg8Price, setNewCoachPkg8Price] = useState<number>(450000);
  const [newCoachPkg12Price, setNewCoachPkg12Price] = useState<number>(600000);

  // Selected coach for editing pricing/schedule
  const [selectedEditCoachId, setSelectedEditCoachId] = useState<string>('');
  const [editCoachName, setEditCoachName] = useState<string>('');
  const [editCoachExperience, setEditCoachExperience] = useState<string>('');
  const [editCoachPhoto, setEditCoachPhoto] = useState<string>('');
  const [editQuotaValue, setEditQuotaValue] = useState<number>(6);
  const [editPrice4, setEditPrice4] = useState<number>(250000);
  const [editPrice8, setEditPrice8] = useState<number>(450000);
  const [editPrice12, setEditPrice12] = useState<number>(600000);
  const [editCoachPackages, setEditCoachPackages] = useState<Package[]>([]);

  // FILTERS FOR PARTICIPANTS
  const [pesertaFilter, setPesertaFilter] = useState<'semua' | 'aktif' | 'hampir-habis' | 'menunggu-verifikasi'>('semua');
  const [searchPeserta, setSearchPeserta] = useState<string>('');

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
    setShowStudentModal(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !parentName || !parentWhatsapp) {
      alert("Harap lengkapi Nama Siswa, Nama Orang Tua, dan WhatsApp!");
      return;
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
      alert("Data siswa berhasil diperbarui!");
    } else {
      const newId = `member-${Date.now().toString().slice(-6)}`;
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
        payment: {
          amount: Number(payAmount),
          method: payMethod,
          proofUrl: null,
          status: payStatus,
          date: new Date().toISOString().split('T')[0]
        },
        progress: [],
        registeredAt: new Date().toISOString(),
        rescheduleRequests: []
      };

      const updatedMembers = [...members, newMember];
      const syncedCoaches = syncCoachesSchedules(coaches, updatedMembers);

      onUpdateMembers(updatedMembers);
      onUpdateCoaches(syncedCoaches);
      alert("Siswa baru berhasil ditambahkan!");
    }

    setShowStudentModal(false);
    resetStudentForm();
  };

  // JADWAL H-1 REMINDER STATE
  const [simulatedToday, setSimulatedToday] = useState<string>('Senin');

  // EVENT CONFIG STATE
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventCategory, setNewEventCategory] = useState<'Fun Swimming' | 'Lomba' | 'Latihan Bersama' | 'Pengumuman'>('Fun Swimming');
  const [newEventDate, setNewEventDate] = useState<string>('');
  const [newEventDescription, setNewEventDescription] = useState<string>('');
  const [newEventImageUrl, setNewEventImageUrl] = useState<string>('https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&fit=crop&q=80');

  // Preset Unsplash images for quick click
  const presetImages = [
    { name: 'Fun Swimming', url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=600&fit=crop&q=80' },
    { name: 'Lomba Renang', url: 'https://images.unsplash.com/photo-1438029071396-1e831a7fa6d8?w=600&fit=crop&q=80' },
    { name: 'Latihan Bersama', url: 'https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=600&fit=crop&q=80' },
    { name: 'Pengumuman / Pool', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&fit=crop&q=80' }
  ];

  // CALCULATIONS FOR STATS CARDS
  const activeMembers = members.filter(m => m.status === 'Aktif' || m.status === 'Paket Hampir Habis');
  const pendingPayments = members.filter(m => m.status === 'Menunggu Verifikasi' || m.payment.status === 'Menunggu Verifikasi');
  const expiringMembers = members.filter(m => m.sessionsLeft <= 2 && m.status !== 'Menunggu Verifikasi');

  const totalRevenue = members
    .filter(m => m.payment.status === 'Pembayaran Berhasil')
    .reduce((sum, m) => sum + m.payment.amount, 0);

  // ACTION: VERIFY PAYMENT
  const handleVerifyPayment = (memberId: string, isApproved: boolean) => {
    const memberObj = members.find(m => m.id === memberId);
    if (!memberObj) return;

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
      const targetCoach = coaches.find(c => c.referralCode.toUpperCase() === code);
      if (targetCoach) {
        const updatedCoaches = coaches.map(c => {
          if (c.id === targetCoach.id) {
            return {
              ...c,
              referralBonus: (c.referralBonus || 0) + 50000 // Coach gets Rp 50.000 cash reward
            };
          }
          return c;
        });
        onUpdateCoaches(updatedCoaches);
      } else {
        // 2. Is it a member referral?
        const targetMemberIndex = members.findIndex(m => m.id.toUpperCase() === code);
        if (targetMemberIndex !== -1) {
          // Member gets 1 free session, and new registered member gets Rp 25.000 discount
          const updatedWithReferral = updated.map(m => {
            if (m.id.toUpperCase() === code) {
              return {
                ...m,
                referralCount: (m.referralCount || 0) + 1,
                referralBonus: (m.referralBonus || 0) + 25000, // Rp 25.000 discount
                sessionsLeft: m.sessionsLeft + 1 // Add 1 free session reward!
              };
            }
            return m;
          });
          onUpdateMembers(updatedWithReferral);
          return;
        }
      }
    }

    onUpdateMembers(updated);
  };

  // ACTION: DELETE MEMBER (STOP TRAINING / EXPEL)
  const handleDeleteMember = (memberId: string) => {
    const confirmStop = confirm("Apakah Anda yakin ingin menghentikan latihan siswa ini? Data pendaftaran akan dihapus dari sistem dan kuota pelatih akan otomatis dibebaskan.");
    if (!confirmStop) return;

    // Filter out member
    const updatedMembers = members.filter(m => m.id !== memberId);
    const syncedCoaches = syncCoachesSchedules(coaches, updatedMembers);

    onUpdateCoaches(syncedCoaches);
    onUpdateMembers(updatedMembers);
    alert("Data member berhasil dihapus dan slot pelatih dikosongkan.");
  };

  // ACTION: ATTENDANCE LOG / DECREASE 1 SESSION
  const handleLogAttendance = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    if (member.sessionsLeft <= 0) {
      alert("Sesi latihan member ini sudah habis (0 Sesi)! Harap perpanjang paket terlebih dahulu.");
      return;
    }

    const confirmLog = confirm(`Catat kehadiran latihan untuk siswa ${member.student.fullName}? Sisa sesi akan berkurang dari ${member.sessionsLeft} menjadi ${member.sessionsLeft - 1}.`);
    if (!confirmLog) return;

    const newSessionsLeft = member.sessionsLeft - 1;
    const isAlmostExpiring = newSessionsLeft <= 2;

    const updated = members.map(m => {
      if (m.id === memberId) {
        return {
          ...m,
          sessionsLeft: newSessionsLeft,
          status: newSessionsLeft === 0 ? 'Selesai' as const : isAlmostExpiring ? 'Paket Hampir Habis' as const : m.status
        };
      }
      return m;
    });

    onUpdateMembers(updated);
    
    if (newSessionsLeft === 0) {
      alert("Latihan tercatat! Sesi latihan siswa sekarang HABIS (0). Silakan konfirmasi untuk perpanjangan atau stop latihan.");
    } else if (isAlmostExpiring) {
      alert(`Latihan tercatat! Sisa sesi siswa tinggal ${newSessionsLeft} sesi (Hampir Habis).`);
    } else {
      alert(`Kehadiran berhasil dicatat! Sisa sesi: ${newSessionsLeft}.`);
    }
  };

  // ACTION: ADD COACH
  const handleAddCoachSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoachName || !newCoachExperience) return;

    const defaultPhoto = newCoachPhoto || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop&q=80';
    const newId = `coach-${newCoachName.toLowerCase().replace(/\s+/g, '-')}`;

    const newCoach: Coach = {
      id: newId,
      name: newCoachName,
      status: 'Tersedia',
      photo: defaultPhoto,
      experience: newCoachExperience,
      maxQuota: newCoachQuota,
      currentQuota: 0,
      referralCode: `COACH-${newCoachName.toUpperCase().replace(/\s+/g, '')}`,
      referralBonus: 0,
      packages: [
        { id: `${newId}-p4`, name: 'Paket 4x latihan', price: newCoachPkg4Price, sessions: 4 },
        { id: `${newId}-p8`, name: 'Paket 8x latihan', price: newCoachPkg8Price, sessions: 8 },
        { id: `${newId}-p12`, name: 'Paket 12x latihan', price: newCoachPkg12Price, sessions: 12 }
      ],
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
    
    // reset form
    setNewCoachName('');
    setNewCoachExperience('');
    setNewCoachPhoto('');
    setNewCoachQuota(6);
    setShowAddCoachModal(false);
  };

  // ACTION: SAVE COACH SETTINGS
  const handleSaveCoachSettings = (coachId: string) => {
    const updated = coaches.map(c => {
      if (c.id === coachId) {
        return {
          ...c,
          name: editCoachName,
          experience: editCoachExperience,
          photo: editCoachPhoto,
          maxQuota: editQuotaValue,
          packages: editCoachPackages
        };
      }
      return c;
    });

    onUpdateCoaches(updated);
    setSelectedEditCoachId('');
    alert("Profil & harga paket pelatih berhasil disimpan!");
  };

  const handleEditCoachSettings = (coachId: string) => {
    const coach = coaches.find(c => c.id === coachId);
    if (!coach) return;
    
    setSelectedEditCoachId(coachId);
    setEditCoachName(coach.name);
    setEditCoachExperience(coach.experience);
    setEditCoachPhoto(coach.photo);
    setEditQuotaValue(coach.maxQuota);
    setEditCoachPackages(coach.packages || []);
    setEditPrice4(coach.packages.find(p => p.sessions === 4)?.price || 250000);
    setEditPrice8(coach.packages.find(p => p.sessions === 8)?.price || 450000);
    setEditPrice12(coach.packages.find(p => p.sessions === 12)?.price || 600000);
  };

  const handleAddEditPackage = () => {
    const newId = `pkg-${Date.now()}`;
    setEditCoachPackages(prev => [...prev, { id: newId, name: 'Paket Baru', sessions: 4, price: 250000 }]);
  };

  const handleDeleteEditPackage = (id: string) => {
    setEditCoachPackages(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateEditPackageField = (id: string, field: keyof Package, value: any) => {
    setEditCoachPackages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // ACTION: ADD TIME SLOT TO SCHEDULE
  const handleAddScheduleSlot = (coachId: string, dayName: string, timeStr: string) => {
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
                timeSlots: [...d.timeSlots, { time: timeStr, maxSlots: c.maxQuota || 6, currentSlots: 0, students: [] }]
                  .sort((a, b) => a.time.localeCompare(b.time))
              };
            }
            return d;
          })
        };
      }
      return c;
    });
    onUpdateCoaches(updated);
    alert(`Slot waktu ${timeStr} ditambahkan pada hari ${dayName}.`);
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
    const confirmDel = confirm(`Hapus slot ${timeStr} pada hari ${dayName}?`);
    if (!confirmDel) return;

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
  };

  // ACTION: MANAGE EVENTS
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate || !newEventDescription) {
      alert("Harap lengkapi semua data event!");
      return;
    }

    const newEvent: EventItem = {
      id: `event-${Date.now()}`,
      title: newEventTitle,
      category: newEventCategory,
      date: newEventDate,
      description: newEventDescription,
      imageUrl: newEventImageUrl
    };

    onUpdateEvents([...events, newEvent]);
    
    // Clear state
    setNewEventTitle('');
    setNewEventDate('');
    setNewEventDescription('');
    alert("Event baru berhasil ditambahkan!");
  };

  const handleDeleteEvent = (eventId: string) => {
    const confirmDel = confirm("Apakah Anda yakin ingin menghapus kegiatan/event ini dari website?");
    if (!confirmDel) return;
    onUpdateEvents(events.filter(e => e.id !== eventId));
    alert("Event berhasil dihapus.");
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
    const matchesSearch = m.student.fullName.toLowerCase().includes(searchPeserta.toLowerCase()) || 
                          m.parent.fatherMotherName.toLowerCase().includes(searchPeserta.toLowerCase()) ||
                          m.parent.whatsapp.includes(searchPeserta) ||
                          m.id.toLowerCase().includes(searchPeserta.toLowerCase());
    
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 relative">
      {/* Mobile Sidebar Toggle Header */}
      <div className="lg:hidden flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm w-full">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">Menu Admin</h3>
            <p className="text-[9px] text-slate-400 font-semibold font-mono">TIRTA BAROKAH</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 text-slate-500 hover:text-cyan-600 hover:bg-slate-50 rounded-xl border border-slate-100 transition cursor-pointer"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
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
        fixed inset-y-0 left-0 lg:static z-50 lg:z-10
        w-72 lg:w-64 bg-white p-5 rounded-r-2xl lg:rounded-2xl border-r lg:border border-slate-200/60 lg:border-slate-100 
        flex flex-col justify-between shadow-xl lg:shadow-sm
        transition-transform duration-300 ease-in-out h-full lg:h-auto
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="space-y-6">
          {/* Sidebar Title */}
          <div className="hidden lg:flex items-center gap-2 pb-4 border-b border-slate-100">
            <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-xs text-slate-800 tracking-wider uppercase">Menu Admin</h3>
              <p className="text-[10px] text-slate-400 font-semibold font-mono">TIRTA BAROKAH</p>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="space-y-1">
            {[
              { id: 'verifikasi', label: 'Verifikasi Pembayaran', icon: ShieldCheck, badge: pendingPayments.length, color: 'text-amber-600 bg-amber-50' },
              { id: 'peserta', label: 'Manajemen Siswa', icon: Users, badge: members.length, color: 'text-cyan-600 bg-cyan-50' },
              { id: 'reminder', label: 'Jadwal & Reminder H-1', icon: Bell, color: 'text-indigo-600 bg-indigo-50' },
              { id: 'events', label: 'Kelola Event / Berita', icon: ImageIcon, badge: events.length, color: 'text-rose-600 bg-rose-50' },
              { id: 'pelatih', label: 'Kelola Pelatih & Kuota', icon: Award, badge: coaches.length, color: 'text-teal-600 bg-teal-50' },
              { id: 'laporan', label: 'Laporan Keuangan', icon: BarChart2, color: 'text-emerald-600 bg-emerald-50' },
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`
                    w-full px-3.5 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between group cursor-pointer
                    ${isActive 
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/10 font-black' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/15 text-white' : item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className={`
                      px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide font-mono
                      ${isActive 
                        ? 'bg-white text-cyan-800' 
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      }
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer info */}
        <div className="pt-4 border-t border-slate-100 mt-6 space-y-2">
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl text-[10px] text-slate-500 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span>Mode: Administrator</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 space-y-8 min-w-0">
        {/* Stats Summary Panel */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-cyan-50 rounded-xl text-cyan-600">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Pendapatan</p>
              <h4 className="text-lg font-black text-slate-800">Rp {totalRevenue.toLocaleString('id-ID')}</h4>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Member Aktif</p>
              <h4 className="text-lg font-black text-slate-800">{activeMembers.length} Anak</h4>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Butuh Verifikasi</p>
              <h4 className="text-lg font-black text-slate-800">{pendingPayments.length} Akun</h4>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Paket Habis / Kurang</p>
              <h4 className="text-lg font-black text-slate-800">{expiringMembers.length} Siswa</h4>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        
        {/* TAB 1: VERIFIKASI PEMBAYARAN */}
        {activeTab === 'verifikasi' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Menunggu Verifikasi Pendaftaran & Pembayaran</h3>
              <p className="text-slate-500 text-xs">Peserta yang baru mendaftar atau memperpanjang paket lewat BNI harus diverifikasi oleh admin secara manual.</p>
            </div>

            {pendingPayments.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-400 mt-2 font-semibold">Seluruh pembayaran pendaftaran telah terverifikasi!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingPayments.map((member) => {
                  const coach = coaches.find(c => c.id === member.coachId);
                  return (
                    <div key={member.id} className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-cyan-200 transition">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-800">{member.student.fullName}</span>
                          <span className="text-[10px] font-mono bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded font-bold">{member.id}</span>
                          {member.referralCodeUsed && (
                            <span className="text-[9px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded font-bold">
                              Ref: {member.referralCodeUsed}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 grid grid-cols-2 gap-x-6 gap-y-1">
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
            )}
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
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition shadow-md shadow-cyan-600/10 cursor-pointer whitespace-nowrap"
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
                            <div className="font-bold text-slate-800">{member.student.fullName}</div>
                            <div className="font-mono text-[9px] text-slate-400 mt-0.5">{member.id}</div>
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
                                className="p-1.5 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
                                title="Edit Detail Siswa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* ATTENDANCE ACTION */}
                              {member.status !== 'Menunggu Verifikasi' && (
                                <button
                                  onClick={() => handleLogAttendance(member.id)}
                                  className="px-2.5 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-bold rounded-lg border border-cyan-200 flex items-center gap-1 transition"
                                  title="Log Hadir Siswa (Kurangi 1 Sesi)"
                                >
                                  <CheckSquare className="w-3.5 h-3.5" /> Absen Sesi
                                </button>
                              )}

                              {/* STOP PACKET / DELETE USER */}
                              <button
                                onClick={() => handleDeleteMember(member.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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
                      <p className="text-[10px] text-slate-500">Isi data lengkap di bawah untuk memperbarui database akademis renang.</p>
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
                            onChange={(e) => setStudentDob(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-bold text-slate-600">Umur (Tahun)</label>
                          <input
                            type="number"
                            min={2}
                            max={60}
                            value={studentAge}
                            onChange={(e) => setStudentAge(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs"
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
                            {((coaches.find(c => c.id === selectedCoachId) || coaches[0])?.schedule.find(d => d.day === schDay1)?.timeSlots || []).map(ts => (
                              <option key={ts.time} value={ts.time}>{ts.time} WIB ({ts.currentSlots}/{ts.maxSlots} terisi)</option>
                            ))}
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
                                {((coaches.find(c => c.id === selectedCoachId) || coaches[0])?.schedule.find(d => d.day === schDay2)?.timeSlots || []).map(ts => (
                                  <option key={ts.time} value={ts.time}>{ts.time} WIB ({ts.currentSlots}/{ts.maxSlots} terisi)</option>
                                ))}
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

        {/* TAB 3: REMINDERS & NOTIFIKASI H-1 */}
        {activeTab === 'reminder' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-1">
                  <Bell className="w-4 h-4 text-cyan-600" /> Pengingat Latihan H-1 & Paket Expiring
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">Admin mengonfirmasi pesan WhatsApp pengingat besok latihan atau sisa sesi paket yang akan segera habis.</p>
              </div>

              {/* Simulated Date Selector */}
              <div className="space-y-1 w-full md:w-auto">
                <label className="text-[10px] font-bold text-slate-500 block">Simulasi Hari Saat Ini:</label>
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
                              onClick={() => {
                                const confirmRenew = confirm(`Perpanjang paket siswa ${member.student.fullName}?`);
                                if (confirmRenew) {
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
                                  alert("Paket berhasil diperpanjang!");
                                }
                              }}
                              className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-2.5 py-1.5 rounded-lg text-[10px]"
                            >
                              Perpanjang
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-2 py-1.5 rounded-lg text-[10px] border border-rose-200"
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

        {/* TAB 4: EVENTS / KEGIATAN */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Manajemen Event & Berita Kegiatan</h3>
              <p className="text-slate-500 text-xs">Buat pengumuman fun swimming, lomba internal, atau berita terbaru yang tampil di halaman depan pendaftaran.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Form Tambah Event */}
              <form onSubmit={handleAddEvent} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1">
                  <Plus className="w-4 h-4 text-cyan-600" /> Tambah Kegiatan / Event
                </h4>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Judul Event / Kegiatan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Fun Swimming Tirta Barokah"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-lg focus:outline-hidden focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Kategori Event</label>
                  <select
                    value={newEventCategory}
                    onChange={(e: any) => setNewEventCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-lg focus:outline-hidden"
                  >
                    <option value="Fun Swimming">Fun Swimming</option>
                    <option value="Lomba">Lomba</option>
                    <option value="Latihan Bersama">Latihan Bersama</option>
                    <option value="Pengumuman">Pengumuman</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Tanggal Pelaksanaan</label>
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-lg focus:outline-hidden"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Gambar Banner Kegiatan (Upload)</label>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 p-2.5 rounded-lg mt-1">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center">
                      {newEventImageUrl ? (
                        <img src={newEventImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded text-[10px] border border-slate-200 transition inline-block">
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
                      <p className="text-[8px] text-slate-400">Pilih file foto dari HP atau komputer.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">Isi Pengumuman / Deskripsi Kegiatan</label>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan detail jadwal, lokasi kolam renang, dan persyaratan event..."
                    value={newEventDescription}
                    onChange={(e) => setNewEventDescription(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-lg focus:outline-hidden"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  Publikasikan Event Ke Web
                </button>
              </form>

              {/* Grid Event Aktif */}
              <div className="lg:col-span-2 space-y-3">
                <h4 className="font-bold text-sm text-slate-800">Daftar Event / Pengumuman Terbit</h4>
                {events.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-400 mt-2 font-semibold">Belum ada pengumuman kegiatan yang diterbitkan.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                    {events.map(event => (
                      <div key={event.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between hover:border-cyan-200 transition">
                        <div className="h-28 bg-slate-100 relative">
                          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
                          <span className="absolute top-2 left-2 bg-cyan-600 text-white font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded shadow-sm">
                            {event.category}
                          </span>
                        </div>
                        <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] text-slate-400 font-mono block">{event.date}</span>
                            <h5 className="font-extrabold text-xs text-slate-800 line-clamp-1">{event.title}</h5>
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-1">{event.description}</p>
                          </div>
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => handleDeleteEvent(event.id)}
                              className="text-[10px] font-bold text-rose-600 hover:text-rose-500 flex items-center gap-0.5"
                            >
                              <Trash className="w-3 h-3" /> Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MANAJEMEN PELATIH & JADWAL */}
        {activeTab === 'pelatih' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Manajemen Pelatih & Kuota Latihan</h3>
                <p className="text-slate-500 text-xs">Ubah kuota siswa maksimal, harga paket latihan 4x/8x/12x, dan kelola jam jadwal latihan pelatih.</p>
              </div>
              <button
                onClick={() => setShowAddCoachModal(true)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 shadow-md shadow-cyan-600/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tambah Pelatih Baru
              </button>
            </div>

            {/* ADD COACH MODAL SHEET */}
            {showAddCoachModal && (
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
                <h4 className="font-bold text-sm text-slate-800">Tambah Pelatih Baru ke Tirta Barokah</h4>
                <form onSubmit={handleAddCoachSubmit} className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Nama Lengkap Pelatih</label>
                    <input
                      type="text"
                      placeholder="Contoh: Coach Rian"
                      value={newCoachName}
                      onChange={(e) => setNewCoachName(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-lg focus:outline-hidden"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Kuota Siswa Aktif Maksimal</label>
                    <input
                      type="number"
                      value={newCoachQuota}
                      onChange={(e) => setNewCoachQuota(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-lg font-mono focus:outline-hidden"
                      required
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 block">Foto Pelatih</label>
                    <div className="flex items-center gap-4 bg-white border border-slate-200 p-3 rounded-xl mt-1">
                      <div className="w-14 h-14 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center">
                        {newCoachPhoto ? (
                          <img src={newCoachPhoto} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-200 transition inline-block">
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
                        <p className="text-[10px] text-slate-400 font-medium">Mendukung format PNG, JPG, GIF. Gambar akan disimpan dalam database lokal.</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-semibold text-slate-500">Pengalaman / Biografi Singkat</label>
                    <input
                      type="text"
                      placeholder="Contoh: Mantan atlet, 4 tahun pengalaman, dll."
                      value={newCoachExperience}
                      onChange={(e) => setNewCoachExperience(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-lg focus:outline-hidden"
                      required
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2 border-t border-slate-200 pt-3">
                    <h5 className="text-[11px] font-bold text-slate-700">Harga Paket Default Pelatih Baru</h5>
                    <div className="grid grid-cols-3 gap-3 mt-1.5">
                      <div>
                        <label className="text-[9px] font-semibold text-slate-500 block">Paket 4x (Rp)</label>
                        <input type="number" value={newCoachPkg4Price} onChange={e => setNewCoachPkg4Price(Number(e.target.value))} className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs rounded-lg font-mono" />
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-slate-500 block">Paket 8x (Rp)</label>
                        <input type="number" value={newCoachPkg8Price} onChange={e => setNewCoachPkg8Price(Number(e.target.value))} className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs rounded-lg font-mono" />
                      </div>
                      <div>
                        <label className="text-[9px] font-semibold text-slate-500 block">Paket 12x (Rp)</label>
                        <input type="number" value={newCoachPkg12Price} onChange={e => setNewCoachPkg12Price(Number(e.target.value))} className="w-full bg-white border border-slate-200 px-2 py-1.5 text-xs rounded-lg font-mono" />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex gap-2 justify-end pt-2">
                    <button type="button" onClick={() => setShowAddCoachModal(false)} className="border border-slate-300 px-3 py-2 text-xs rounded-lg font-medium bg-white">Batal</button>
                    <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 text-xs rounded-lg">Simpan Pelatih</button>
                  </div>
                </form>
              </div>
            )}

            {/* List of coaches settings */}
            <div className="space-y-6">
              {coaches.map((coach) => {
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
                          <h4 className="font-black text-slate-800 text-sm">{coach.name}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">{coach.experience}</p>
                          <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                            <span>Siswa Aktif: <strong className="text-cyan-700">{activeCount} anak</strong></span>
                            <span>Kuota Max: <strong className="text-slate-700">{coach.maxQuota} anak</strong></span>
                            <span className="font-mono text-cyan-800">Kode Ref: <strong>{coach.referralCode}</strong></span>
                            {coach.referralBonus && coach.referralBonus > 0 ? (
                              <span className="font-mono text-indigo-700">Rewards: <strong>Rp {coach.referralBonus.toLocaleString('id-ID')}</strong></span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => handleSaveCoachSettings(coach.id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-lg text-xs"
                            >
                              Simpan
                            </button>
                            <button
                              onClick={() => setSelectedEditCoachId('')}
                              className="border border-slate-300 bg-white text-slate-600 px-3 py-2 rounded-lg text-xs"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditCoachSettings(coach.id)}
                            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit Profil, Kuota & Harga
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-4 shadow-inner"
                      >
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500">Nama Pelatih</label>
                            <input 
                              type="text" 
                              value={editCoachName} 
                              onChange={(e) => setEditCoachName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold mt-1" 
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500">Pengalaman / Biografi Singkat</label>
                            <input 
                              type="text" 
                              value={editCoachExperience} 
                              onChange={(e) => setEditCoachExperience(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs mt-1" 
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Foto Pelatih</label>
                          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1">
                            <div className="w-12 h-12 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-slate-100 flex items-center justify-center">
                              {editCoachPhoto ? (
                                <img src={editCoachPhoto} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-6 h-6 text-slate-300" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <label className="cursor-pointer bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs border border-slate-200 transition inline-block">
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
                              <p className="text-[10px] text-slate-400 font-medium">Unggah file foto untuk mengganti foto lama pelatih ini.</p>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 space-y-3">
                          <div className="flex justify-between items-center">
                            <h5 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Kelola Paket Belajar (CRUD)</h5>
                            <button
                              type="button"
                              onClick={handleAddEditPackage}
                              className="text-[10px] bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-extrabold px-2.5 py-1 rounded-lg border border-cyan-200/50 transition flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Tambah Paket Baru
                            </button>
                          </div>

                          <div className="space-y-2">
                            {editCoachPackages.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic">Belum ada paket belajar untuk pelatih ini.</p>
                            ) : (
                              editCoachPackages.map((pkg, idx) => (
                                <div key={pkg.id || idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200/40">
                                  <div className="col-span-4">
                                    <label className="text-[8px] font-bold text-slate-400">Nama Paket</label>
                                    <input 
                                      type="text"
                                      value={pkg.name}
                                      onChange={(e) => handleUpdateEditPackageField(pkg.id, 'name', e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-bold text-slate-800"
                                      placeholder="Nama Paket"
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <label className="text-[8px] font-bold text-slate-400">Sesi Latihan</label>
                                    <input 
                                      type="number"
                                      value={pkg.sessions}
                                      onChange={(e) => handleUpdateEditPackageField(pkg.id, 'sessions', Number(e.target.value))}
                                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-mono text-slate-800"
                                      placeholder="Sesi"
                                    />
                                  </div>
                                  <div className="col-span-4">
                                    <label className="text-[8px] font-bold text-slate-400">Harga (Rp)</label>
                                    <input 
                                      type="number"
                                      value={pkg.price}
                                      onChange={(e) => handleUpdateEditPackageField(pkg.id, 'price', Number(e.target.value))}
                                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-[11px] font-mono text-slate-800"
                                      placeholder="Harga"
                                    />
                                  </div>
                                  <div className="col-span-1 text-center pt-2">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEditPackage(pkg.id)}
                                      className="text-slate-400 hover:text-rose-600 transition p-1"
                                      title="Hapus Paket"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="grid md:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500">Maks Quota Siswa (Umum)</label>
                              <input 
                                type="number" 
                                value={editQuotaValue} 
                                onChange={(e) => setEditQuotaValue(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono mt-1 text-slate-800" 
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Schedule manager inside coach card */}
                    <div className="border-t border-slate-200 pt-3">
                      <p className="text-[11px] font-bold text-slate-700">Waktu Jadwal & Pengisian Slot (7 Hari):</p>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mt-2">
                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((dayName) => {
                          const dayObj = coach.schedule.find(d => d.day === dayName) || { day: dayName, timeSlots: [] };
                          return (
                            <div key={dayName} className="bg-white rounded-xl border border-slate-200/60 p-3 space-y-2">
                              <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                                <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">{dayName}</span>
                                <button
                                  onClick={() => {
                                    const timeStr = prompt("Masukkan slot jam baru (contoh: '09.30' atau '17.00'):");
                                    if (timeStr) handleAddScheduleSlot(coach.id, dayName, timeStr);
                                  }}
                                  className="text-[10px] font-bold text-cyan-600 hover:underline flex items-center gap-0.5"
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
                                            <p className={`text-[9px] font-semibold ${isFull ? 'text-rose-600 font-extrabold' : 'text-slate-500'}`}>
                                              Slot: {usageCount} / {slot.maxSlots} {isFull ? '(PENUH)' : ''}
                                            </p>
                                          </div>
                                          <button
                                            onClick={() => handleRemoveScheduleSlot(coach.id, dayName, slot.time)}
                                            className="text-slate-300 hover:text-rose-600 transition"
                                            title="Hapus Slot Jam"
                                          >
                                            <X className="w-3.5 h-3.5" />
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: LAPORAN KEUANGAN */}
        {activeTab === 'laporan' && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Laporan Pendapatan & Grafik Perkembangan</h3>
              <p className="text-slate-500 text-xs">Visualisasi data pertumbuhan siswa aktif dan rincian omzet dana kas Tirta Barokah.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Box 1: Revenue per coach */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60">
                <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-1">
                  <PieIcon className="w-4 h-4 text-cyan-600" /> Distribusi Pendapatan per Pelatih
                </h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByCoachData}>
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

            {/* Income Statement Summary */}
            <div className="bg-cyan-950 text-white rounded-2xl p-6 border border-cyan-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-cyan-400">Kas Pemasukan Berhasil Diverifikasi</h4>
                <p className="text-2xl font-black font-mono">Rp {totalRevenue.toLocaleString('id-ID')}</p>
                <p className="text-[10px] text-cyan-300">Dana terkumpul dari transfer BNI dan Kasir Kolam renang yang sudah disetujui Admin.</p>
              </div>
              <div className="space-y-1 text-xs md:text-right">
                <p>Total Member Registrasi: <strong>{members.length} Anak</strong></p>
                <p>Status Aktif Belajar: <strong>{activeMembers.length} Siswa</strong></p>
                <p>Tipe Privat 1-on-1: <strong>{members.filter(m => m.coachType === 'Privat').length} Siswa</strong></p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  </div>
  );
}
