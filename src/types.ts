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
  status: 'Tersedia' | 'Penuh';
  photo: string;
  experience: string;
  referralCode: string; // New field
  referralBonus?: number; // New field
  maxQuota: number; // default 6
  currentQuota: number;
  packages: Package[];
  schedule: ScheduleDay[];
}

export interface EventItem {
  id: string;
  title: string;
  category: 'Fun Swimming' | 'Lomba' | 'Latihan Bersama' | 'Pengumuman';
  date: string;
  description: string;
  imageUrl: string;
}

