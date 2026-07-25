/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParentData {
  fatherMotherName: string;
  whatsapp: string;
}

export interface StudentData {
  fullName: string;
  gender: 'Laki-laki' | 'Perempuan';
  dob: string;
  age: number;
  illnessHistory: string;
  hasSwumBefore: boolean;
}

export interface TrainingProgress {
  id: string;
  date: string;
  attendance: 'Hadir' | 'Absen' | 'Izin';
  note: string;
}

export interface PaymentRecord {
  amount: number;
  method: 'Transfer BNI' | 'Tunai di Kasir';
  proofUrl: string | null;
  status: 'Menunggu Verifikasi' | 'Pembayaran Berhasil' | 'Pembayaran Gagal';
  date: string;
}

export interface Member {
  id: string;
  parent: ParentData;
  student: StudentData;
  coachId: string;
  packageId: string;
  scheduleFrequency: '1x Seminggu' | '2x Seminggu';
  scheduleDay: string;
  scheduleTime: string;
  scheduleDay2?: string;
  scheduleTime2?: string;
  coachType: 'Reguler' | 'Privat';
  status: 'Menunggu Pembayaran' | 'Menunggu Verifikasi' | 'Aktif' | 'Paket Hampir Habis' | 'Selesai';
  sessionsLeft: number;
  sessionsTotal: number;
  payment: PaymentRecord;
  progress: TrainingProgress[];
  registeredAt: string;
  referralCodeUsed?: string;
  referralCount?: number;
  referralBonus?: number;
  rescheduleRequests?: {
    id: string;
    originalDay: string;
    originalTime: string;
    requestedDay: string;
    requestedTime: string;
    status: 'Menunggu' | 'Disetujui' | 'Ditolak';
    reason: string;
  }[];
  schedules?: {
    coachId: string;
    day: string;
    time: string;
  }[];
  isActive?: boolean;
}

export interface Package {
  id: string;
  name: string;
  price: number;
  sessions: number;
}

export interface ScheduleTimeSlot {
  time: string;
  maxSlots: number;
  currentSlots: number;
  students: string[]; // Member IDs
}

export interface ScheduleDay {
  day: string;
  timeSlots: ScheduleTimeSlot[];
}

export interface Coach {
  id: string;
  name: string;
  username?: string;
  password?: string;
  email?: string;
  phone?: string;
  status: 'Tersedia' | 'Penuh';
  photo: string;
  experience: string;
  referralCode: string; // New field
  referralBonus?: number; // New field
  maxQuota: number; // default 6
  currentQuota: number;
  packages: Package[];
  schedule: ScheduleDay[];
  isActive?: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  category: 'Fun Swimming' | 'Lomba' | 'Latihan Bersama' | 'Pengumuman';
  date: string;
  description: string;
  imageUrl: string;
  created_at?: string;
}

export interface ProgramLevel {
  id?: number | string;
  level_number: number;
  name: string;
  target_learning: string;
  materials: string;
  graduation_target: string;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
}

export interface SiteSettings {
  profile_heading?: string;
  profile_text_1?: string;
  profile_text_2?: string;
  profile_text_3?: string;
  why_choose_heading?: string;
  why_choose_1_title?: string;
  why_choose_1_desc?: string;
  why_choose_2_title?: string;
  why_choose_2_desc?: string;
  why_choose_3_title?: string;
  why_choose_3_desc?: string;
  why_choose_4_title?: string;
  why_choose_4_desc?: string;
  package_notes?: string;
  admin_whatsapp?: string;
  bank_accounts?: string;
}

export interface CoachAbsence {
  id: string;
  coachId: string;
  day: string;
  time: string;
  date: string;
  reason: string;
  status: 'Menunggu' | 'Transfer' | 'Reschedule' | 'Batal';
  replacementCoachId?: string;
  created_at?: string;
}

