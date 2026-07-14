/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Coach, Member, EventItem } from './types';

export const INITIAL_COACHES: Coach[] = [
  {
    id: 'coach-rian',
    name: 'Coach Rian',
    status: 'Tersedia',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80',
    experience: 'Mantan Atlet Renang Daerah, 5 Tahun Pengalaman Melatih Anak & Dewasa',
    referralCode: 'COACH-RIAN',
    referralBonus: 150000,
    maxQuota: 6,
    currentQuota: 5,
    packages: [
      { id: 'rian-p4', name: 'Paket 4x latihan', price: 250000, sessions: 4 },
      { id: 'rian-p8', name: 'Paket 8x latihan', price: 450000, sessions: 8 },
      { id: 'rian-p12', name: 'Paket 12x latihan', price: 600000, sessions: 12 }
    ],
    schedule: [
      {
        day: 'Senin',
        timeSlots: [
          { time: '08.00', maxSlots: 6, currentSlots: 5, students: ['member-aldi', 'member-bima', 'member-caca', 'member-dito', 'member-elsa'] },
          { time: '09.00', maxSlots: 6, currentSlots: 0, students: [] },
          { time: '16.00', maxSlots: 6, currentSlots: 0, students: [] },
          { time: '17.00', maxSlots: 6, currentSlots: 0, students: [] }
        ]
      },
      {
        day: 'Selasa',
        timeSlots: [
          { time: '08.00', maxSlots: 6, currentSlots: 2, students: ['member-fani', 'member-galang'] },
          { time: '09.00', maxSlots: 6, currentSlots: 1, students: ['member-hari'] },
          { time: '16.00', maxSlots: 6, currentSlots: 0, students: [] },
          { time: '17.00', maxSlots: 6, currentSlots: 0, students: [] }
        ]
      }
    ]
  },
  {
    id: 'coach-nisa',
    name: 'Coach Nisa',
    status: 'Tersedia',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80',
    experience: 'Sertifikasi Pelatih Renang Internasional, Ahli Renang Gaya Dada & Bebas',
    referralCode: 'COACH-NISA',
    referralBonus: 50000,
    maxQuota: 6,
    currentQuota: 2,
    packages: [
      { id: 'nisa-p4', name: 'Paket 4x latihan', price: 250000, sessions: 4 },
      { id: 'nisa-p8', name: 'Paket 8x latihan', price: 450000, sessions: 8 },
      { id: 'nisa-p12', name: 'Paket 12x latihan', price: 600000, sessions: 12 }
    ],
    schedule: [
      {
        day: 'Rabu',
        timeSlots: [
          { time: '08.00', maxSlots: 6, currentSlots: 1, students: ['member-irma'] },
          { time: '10.00', maxSlots: 6, currentSlots: 0, students: [] },
          { time: '15.00', maxSlots: 6, currentSlots: 1, students: ['member-joko'] },
          { time: '16.00', maxSlots: 6, currentSlots: 0, students: [] }
        ]
      },
      {
        day: 'Kamis',
        timeSlots: [
          { time: '08.00', maxSlots: 6, currentSlots: 0, students: [] },
          { time: '10.00', maxSlots: 6, currentSlots: 0, students: [] },
          { time: '15.00', maxSlots: 6, currentSlots: 0, students: [] },
          { time: '16.00', maxSlots: 6, currentSlots: 0, students: [] }
        ]
      }
    ]
  },
  {
    id: 'coach-dika',
    name: 'Coach Dika',
    status: 'Penuh',
    photo: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=400&fit=crop&q=80',
    experience: '6 Tahun Melatih Anak Berkebutuhan Khusus & Terapi Cedera Renang',
    referralCode: 'COACH-DIKA',
    referralBonus: 0,
    maxQuota: 6,
    currentQuota: 6,
    packages: [
      { id: 'dika-p4', name: 'Paket 4x latihan', price: 250000, sessions: 4 },
      { id: 'dika-p8', name: 'Paket 8x latihan', price: 450000, sessions: 8 },
      { id: 'dika-p12', name: 'Paket 12x latihan', price: 600000, sessions: 12 }
    ],
    schedule: [
      {
        day: 'Jumat',
        timeSlots: [
          { time: '08.00', maxSlots: 6, currentSlots: 6, students: ['member-karen', 'member-latif', 'member-miko', 'member-nana', 'member-oni', 'member-putra'] },
          { time: '16.00', maxSlots: 6, currentSlots: 0, students: [] }
        ]
      },
      {
        day: 'Sabtu',
        timeSlots: [
          { time: '08.00', maxSlots: 6, currentSlots: 0, students: [] },
          { time: '10.00', maxSlots: 6, currentSlots: 0, students: [] }
        ]
      }
    ]
  }
];

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'member-aldi',
    parent: { fatherMotherName: 'Bapak Rudi', whatsapp: '081234567890' },
    student: { fullName: 'Aldi Pratama', gender: 'Laki-laki', dob: '2016-04-12', age: 10, illnessHistory: 'Tidak ada', hasSwumBefore: true },
    coachId: 'coach-rian',
    packageId: 'rian-p8',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Senin',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 5,
    sessionsTotal: 8,
    payment: {
      amount: 450000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-15T10:00:00Z'
    },
    progress: [
      { id: 'prog-1', date: '2026-06-22', attendance: 'Hadir', note: 'Hari pertama: Meluncur dengan baik dan melatih kayuhan kaki gaya bebas.' },
      { id: 'prog-2', date: '2026-06-25', attendance: 'Hadir', note: 'Melatih pernapasan gaya bebas ke arah kanan. Sudah mulai stabil.' },
      { id: 'prog-3', date: '2026-06-29', attendance: 'Hadir', note: 'Pengenalan gaya dada. Koordinasi kaki sudah baik, gerakan tangan perlu pembiasaan.' }
    ],
    registeredAt: '2026-06-14T09:30:00Z',
    referralCodeUsed: 'COACH-RIAN',
    referralCount: 2,
    referralBonus: 100000
  },
  {
    id: 'member-bima',
    parent: { fatherMotherName: 'Ibu Maya', whatsapp: '082198765432' },
    student: { fullName: 'Bima Sakti', gender: 'Laki-laki', dob: '2015-08-20', age: 11, illnessHistory: 'Asma ringan', hasSwumBefore: false },
    coachId: 'coach-rian',
    packageId: 'rian-p8',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Senin',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 6,
    sessionsTotal: 8,
    payment: {
      amount: 450000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-15T10:15:00Z'
    },
    progress: [
      { id: 'bima-prog-1', date: '2026-06-22', attendance: 'Hadir', note: 'Latihan dasar membiasakan kepala di dalam air. Bima sangat berani.' },
      { id: 'bima-prog-2', date: '2026-06-29', attendance: 'Hadir', note: 'Meluncur dibantu kickboard sejauh 5 meter.' }
    ],
    registeredAt: '2026-06-14T10:00:00Z'
  },
  {
    id: 'member-caca',
    parent: { fatherMotherName: 'Bapak Hartono', whatsapp: '081344556677' },
    student: { fullName: 'Caca Kirana', gender: 'Perempuan', dob: '2017-01-05', age: 9, illnessHistory: 'Tidak ada', hasSwumBefore: true },
    coachId: 'coach-rian',
    packageId: 'rian-p4',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Senin',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 1,
    sessionsTotal: 4,
    payment: {
      amount: 250000,
      method: 'Tunai di Kasir',
      proofUrl: null,
      status: 'Pembayaran Berhasil',
      date: '2026-06-16T15:00:00Z'
    },
    progress: [
      { id: 'caca-prog-1', date: '2026-06-22', attendance: 'Hadir', note: 'Sudah mahir gaya bebas. Latihan hari ini pengenalan gaya dada lengkap.' },
      { id: 'caca-prog-2', date: '2026-06-25', attendance: 'Hadir', note: 'Latihan ketahanan renang 25 meter bolak balik gaya bebas.' },
      { id: 'caca-prog-3', date: '2026-06-29', attendance: 'Hadir', note: 'Melatih kayuhan kaki gaya dada dan teknik mengambil napas.' }
    ],
    registeredAt: '2026-06-15T08:00:00Z'
  },
  {
    id: 'member-dito',
    parent: { fatherMotherName: 'Ibu Siska', whatsapp: '081122334455' },
    student: { fullName: 'Dito Mahendra', gender: 'Laki-laki', dob: '2018-09-30', age: 7, illnessHistory: 'Tidak ada', hasSwumBefore: false },
    coachId: 'coach-rian',
    packageId: 'rian-p12',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Senin',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 10,
    sessionsTotal: 12,
    payment: {
      amount: 600000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-15T11:00:00Z'
    },
    progress: [
      { id: 'dito-prog-1', date: '2026-06-22', attendance: 'Hadir', note: 'Latihan gelembung napas (bubble) di tepi kolam. Masih agak takut air.' },
      { id: 'dito-prog-2', date: '2026-06-29', attendance: 'Hadir', note: 'Sudah mulai berani melepas pegangan kolam dengan pelampung punggung.' }
    ],
    registeredAt: '2026-06-14T11:20:00Z'
  },
  {
    id: 'member-elsa',
    parent: { fatherMotherName: 'Bapak Joko', whatsapp: '081299887766' },
    student: { fullName: 'Elsa Monica', gender: 'Perempuan', dob: '2016-11-18', age: 9, illnessHistory: 'Pernah trauma tenggelam', hasSwumBefore: false },
    coachId: 'coach-rian',
    packageId: 'rian-p8',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Senin',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 2,
    sessionsTotal: 8,
    payment: {
      amount: 450000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-15T13:40:00Z'
    },
    progress: [
      { id: 'elsa-prog-1', date: '2026-06-22', attendance: 'Hadir', note: 'Fokus ke adaptasi air karena ada trauma. Elsa berhasil tersenyum di kolam hari ini!' },
      { id: 'elsa-prog-2', date: '2026-06-24', attendance: 'Hadir', note: 'Meluncur dibantu pelatih dengan jarak dekat.' },
      { id: 'elsa-prog-3', date: '2026-06-26', attendance: 'Hadir', note: 'Belajar mengepakan kaki gaya bebas di pinggir kolam.' },
      { id: 'elsa-prog-4', date: '2026-06-29', attendance: 'Hadir', note: 'Mencoba menyelam mengambil koin mainan di air dangkal (1 meter).' },
      { id: 'elsa-prog-5', date: '2026-07-01', attendance: 'Hadir', note: 'Latihan meluncur mandiri sejauh 3 meter. Kemajuannya luar biasa.' }
    ],
    registeredAt: '2026-06-14T15:00:00Z'
  },
  {
    id: 'member-fani',
    parent: { fatherMotherName: 'Ibu Diana', whatsapp: '081234561234' },
    student: { fullName: 'Fani Anggraini', gender: 'Perempuan', dob: '2015-05-15', age: 11, illnessHistory: 'Tidak ada', hasSwumBefore: true },
    coachId: 'coach-rian',
    packageId: 'rian-p4',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Selasa',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 3,
    sessionsTotal: 4,
    payment: {
      amount: 250000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-15T10:00:00Z'
    },
    progress: [],
    registeredAt: '2026-06-15T09:30:00Z'
  },
  {
    id: 'member-galang',
    parent: { fatherMotherName: 'Bapak Rudi Hartono', whatsapp: '081234569988' },
    student: { fullName: 'Galang Saputra', gender: 'Laki-laki', dob: '2014-02-10', age: 12, illnessHistory: 'Tidak ada', hasSwumBefore: true },
    coachId: 'coach-rian',
    packageId: 'rian-p8',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Selasa',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 8,
    sessionsTotal: 8,
    payment: {
      amount: 450000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-16T11:00:00Z'
    },
    progress: [],
    registeredAt: '2026-06-16T10:00:00Z'
  },
  {
    id: 'member-hari',
    parent: { fatherMotherName: 'Ibu Yani', whatsapp: '081234564455' },
    student: { fullName: 'Hari Wijaya', gender: 'Laki-laki', dob: '2017-07-07', age: 9, illnessHistory: 'Tidak ada', hasSwumBefore: false },
    coachId: 'coach-rian',
    packageId: 'rian-p4',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Selasa',
    scheduleTime: '09.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 4,
    sessionsTotal: 4,
    payment: {
      amount: 250000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-16T12:00:00Z'
    },
    progress: [],
    registeredAt: '2026-06-16T11:30:00Z'
  },
  {
    id: 'member-irma',
    parent: { fatherMotherName: 'Bapak Sony', whatsapp: '081299990001' },
    student: { fullName: 'Irma Lestari', gender: 'Perempuan', dob: '2016-03-03', age: 10, illnessHistory: 'Tidak ada', hasSwumBefore: false },
    coachId: 'coach-nisa',
    packageId: 'nisa-p8',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Rabu',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 8,
    sessionsTotal: 8,
    payment: {
      amount: 450000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-17T09:00:00Z'
    },
    progress: [],
    registeredAt: '2026-06-17T08:00:00Z'
  },
  {
    id: 'member-joko',
    parent: { fatherMotherName: 'Ibu Ratna', whatsapp: '081299990002' },
    student: { fullName: 'Joko Susilo', gender: 'Laki-laki', dob: '2015-10-10', age: 10, illnessHistory: 'Tidak ada', hasSwumBefore: true },
    coachId: 'coach-nisa',
    packageId: 'nisa-p8',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Rabu',
    scheduleTime: '15.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 8,
    sessionsTotal: 8,
    payment: {
      amount: 450000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-17T09:15:00Z'
    },
    progress: [],
    registeredAt: '2026-06-17T08:30:00Z'
  },
  {
    id: 'member-karen',
    parent: { fatherMotherName: 'Bapak Sutejo', whatsapp: '081299990010' },
    student: { fullName: 'Karen Gillan', gender: 'Perempuan', dob: '2015-02-12', age: 11, illnessHistory: 'Tidak ada', hasSwumBefore: false },
    coachId: 'coach-dika',
    packageId: 'dika-p12',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Jumat',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 12,
    sessionsTotal: 12,
    payment: {
      amount: 600000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-17T10:00:00Z'
    },
    progress: [],
    registeredAt: '2026-06-17T09:30:00Z'
  },
  {
    id: 'member-latif',
    parent: { fatherMotherName: 'Ibu Aminah', whatsapp: '081299990011' },
    student: { fullName: 'Latif Ibrahim', gender: 'Laki-laki', dob: '2017-05-05', age: 9, illnessHistory: 'Tidak ada', hasSwumBefore: true },
    coachId: 'coach-dika',
    packageId: 'dika-p4',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Jumat',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 4,
    sessionsTotal: 4,
    payment: {
      amount: 250000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-17T10:10:00Z'
    },
    progress: [],
    registeredAt: '2026-06-17T10:00:00Z'
  },
  {
    id: 'member-miko',
    parent: { fatherMotherName: 'Bapak Ronald', whatsapp: '081299990012' },
    student: { fullName: 'Miko Pratama', gender: 'Laki-laki', dob: '2018-01-01', age: 8, illnessHistory: 'Tidak ada', hasSwumBefore: false },
    coachId: 'coach-dika',
    packageId: 'dika-p8',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Jumat',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 8,
    sessionsTotal: 8,
    payment: {
      amount: 450000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-17T10:20:00Z'
    },
    progress: [],
    registeredAt: '2026-06-17T10:20:00Z'
  },
  {
    id: 'member-nana',
    parent: { fatherMotherName: 'Bapak Yusuf', whatsapp: '081299990003' },
    student: { fullName: 'Nana Novita', gender: 'Perempuan', dob: '2016-09-09', age: 9, illnessHistory: 'Tidak ada', hasSwumBefore: true },
    coachId: 'coach-dika',
    packageId: 'dika-p8',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Jumat',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 1,
    sessionsTotal: 8,
    payment: {
      amount: 450000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-18T09:30:00Z'
    },
    progress: [],
    registeredAt: '2026-06-17T10:30:00Z'
  },
  {
    id: 'member-oni',
    parent: { fatherMotherName: 'Ibu Susan', whatsapp: '081299990004' },
    student: { fullName: 'Oni Syahputra', gender: 'Laki-laki', dob: '2015-11-11', age: 10, illnessHistory: 'Tidak ada', hasSwumBefore: false },
    coachId: 'coach-dika',
    packageId: 'dika-p8',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Jumat',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 5,
    sessionsTotal: 8,
    payment: {
      amount: 450000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-18T09:40:00Z'
    },
    progress: [],
    registeredAt: '2026-06-17T10:40:00Z'
  },
  {
    id: 'member-putra',
    parent: { fatherMotherName: 'Bapak Anwar', whatsapp: '081299990005' },
    student: { fullName: 'Putra Pratama', gender: 'Laki-laki', dob: '2016-12-25', age: 9, illnessHistory: 'Tidak ada', hasSwumBefore: true },
    coachId: 'coach-dika',
    packageId: 'dika-p8',
    scheduleFrequency: '1x Seminggu',
    scheduleDay: 'Jumat',
    scheduleTime: '08.00',
    coachType: 'Reguler',
    status: 'Aktif',
    sessionsLeft: 6,
    sessionsTotal: 8,
    payment: {
      amount: 450000,
      method: 'Transfer BNI',
      proofUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60',
      status: 'Pembayaran Berhasil',
      date: '2026-06-18T09:50:00Z'
    },
    progress: [],
    registeredAt: '2026-06-17T10:50:00Z'
  }
];

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'event-1',
    title: 'Fun Swimming Anak-Anak Tirta Barokah',
    category: 'Fun Swimming',
    date: '2026-07-20',
    description: 'Kegiatan berenang ceria untuk melatih keberanian anak di air dangkal dengan berbagai permainan seru, perebutan koin, dan balapan pelampung. Semua peserta mendapatkan bingkisan menarik!',
    imageUrl: 'https://images.unsplash.com/photo-1519074002996-a69e7ac46a42?w=600&h=400&fit=crop&q=80'
  },
  {
    id: 'event-2',
    title: 'Kejuaraan Renang Pemula Se-Palembang',
    category: 'Lomba',
    date: '2026-08-05',
    description: 'Ajang kompetisi gaya bebas dan gaya dada 25 meter untuk kategori umur 6-12 tahun. Dapatkan piala, piagam penghargaan, dan tabungan pendidikan untuk juara 1, 2, dan 3!',
    imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&h=400&fit=crop&q=80'
  }
];
