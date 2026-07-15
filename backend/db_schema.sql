-- Database initialization for Tirta Barokah
CREATE DATABASE IF NOT EXISTS db_tirtabarokah;
USE db_tirtabarokah;

-- 1. Table: coaches
CREATE TABLE IF NOT EXISTS coaches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    photo VARCHAR(255) NOT NULL,
    experience TEXT NOT NULL,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    referral_bonus INT DEFAULT 0,
    max_quota INT DEFAULT 6
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table: packages
CREATE TABLE IF NOT EXISTS packages (
    id VARCHAR(50) PRIMARY KEY,
    coach_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    price INT NOT NULL,
    sessions INT NOT NULL,
    FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table: coach_schedules
CREATE TABLE IF NOT EXISTS coach_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coach_id VARCHAR(50) NOT NULL,
    day VARCHAR(20) NOT NULL,
    time VARCHAR(10) NOT NULL,
    max_slots INT DEFAULT 6,
    FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table: members
CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(50) PRIMARY KEY,
    parent_name VARCHAR(100) NOT NULL,
    parent_whatsapp VARCHAR(20) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    student_gender ENUM('Laki-laki', 'Perempuan') NOT NULL,
    student_dob DATE NOT NULL,
    student_age INT NOT NULL,
    student_illness TEXT,
    student_has_swum TINYINT(1) DEFAULT 0,
    coach_id VARCHAR(50) NOT NULL,
    package_id VARCHAR(50) NOT NULL,
    schedule_frequency ENUM('1x Seminggu', '2x Seminggu') NOT NULL,
    schedule_day VARCHAR(20) NOT NULL,
    schedule_time VARCHAR(10) NOT NULL,
    schedule_day2 VARCHAR(20) DEFAULT NULL,
    schedule_time2 VARCHAR(10) DEFAULT NULL,
    coach_type ENUM('Reguler', 'Privat') NOT NULL,
    status ENUM('Menunggu Pembayaran', 'Menunggu Verifikasi', 'Aktif', 'Paket Hampir Habis', 'Selesai') NOT NULL,
    sessions_left INT NOT NULL,
    sessions_total INT NOT NULL,
    registered_at DATETIME NOT NULL,
    referral_code_used VARCHAR(50) DEFAULT NULL,
    referral_count INT DEFAULT 0,
    referral_bonus INT DEFAULT 0,
    FOREIGN KEY (coach_id) REFERENCES coaches(id),
    FOREIGN KEY (package_id) REFERENCES packages(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table: payments
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id VARCHAR(50) NOT NULL,
    amount INT NOT NULL,
    method VARCHAR(50) NOT NULL,
    proof_url VARCHAR(255) DEFAULT NULL,
    status ENUM('Menunggu Verifikasi', 'Pembayaran Berhasil', 'Pembayaran Gagal') NOT NULL,
    date DATETIME NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Table: training_progress
CREATE TABLE IF NOT EXISTS training_progress (
    id VARCHAR(50) PRIMARY KEY,
    member_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    attendance ENUM('Hadir', 'Absen', 'Izin') NOT NULL,
    note TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Table: reschedule_requests
CREATE TABLE IF NOT EXISTS reschedule_requests (
    id VARCHAR(50) PRIMARY KEY,
    member_id VARCHAR(50) NOT NULL,
    original_day VARCHAR(20) NOT NULL,
    original_time VARCHAR(10) NOT NULL,
    requested_day VARCHAR(20) NOT NULL,
    requested_time VARCHAR(10) NOT NULL,
    status ENUM('Menunggu', 'Disetujui', 'Ditolak') NOT NULL,
    reason TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Table: events
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category ENUM('Fun Swimming', 'Lomba', 'Latihan Bersama', 'Pengumuman') NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    image_url VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== SEEDING INITIAL DATA ====================

-- Seeding coaches
INSERT INTO coaches (id, name, photo, experience, referral_code, referral_bonus, max_quota) VALUES
('coach-rian', 'Coach Rian', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80', 'Mantan Atlet Renang Daerah, 5 Tahun Pengalaman Melatih Anak & Dewasa', 'COACH-RIAN', 150000, 6),
('coach-nisa', 'Coach Nisa', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&q=80', 'Sertifikasi Pelatih Renang Internasional, Ahli Renang Gaya Dada & Bebas', 'COACH-NISA', 50000, 6),
('coach-dika', 'Coach Dika', 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=400&h=400&fit=crop&q=80', '6 Tahun Melatih Anak Berkebutuhan Khusus & Terapi Cedera Renang', 'COACH-DIKA', 0, 6);

-- Seeding packages
INSERT INTO packages (id, coach_id, name, price, sessions) VALUES
('rian-p4', 'coach-rian', 'Paket 4x latihan', 250000, 4),
('rian-p8', 'coach-rian', 'Paket 8x latihan', 450000, 8),
('rian-p12', 'coach-rian', 'Paket 12x latihan', 600000, 12),
('nisa-p4', 'coach-nisa', 'Paket 4x latihan', 250000, 4),
('nisa-p8', 'coach-nisa', 'Paket 8x latihan', 450000, 8),
('nisa-p12', 'coach-nisa', 'Paket 12x latihan', 600000, 12),
('dika-p4', 'coach-dika', 'Paket 4x latihan', 250000, 4),
('dika-p8', 'coach-dika', 'Paket 8x latihan', 450000, 8),
('dika-p12', 'coach-dika', 'Paket 12x latihan', 600000, 12);

-- Seeding coach_schedules
INSERT INTO coach_schedules (coach_id, day, time, max_slots) VALUES
('coach-rian', 'Senin', '08.00', 6),
('coach-rian', 'Senin', '09.00', 6),
('coach-rian', 'Senin', '16.00', 6),
('coach-rian', 'Senin', '17.00', 6),
('coach-rian', 'Selasa', '08.00', 6),
('coach-rian', 'Selasa', '09.00', 6),
('coach-rian', 'Selasa', '16.00', 6),
('coach-rian', 'Selasa', '17.00', 6),
('coach-nisa', 'Rabu', '08.00', 6),
('coach-nisa', 'Rabu', '10.00', 6),
('coach-nisa', 'Rabu', '15.00', 6),
('coach-nisa', 'Rabu', '16.00', 6),
('coach-nisa', 'Kamis', '08.00', 6),
('coach-nisa', 'Kamis', '10.00', 6),
('coach-nisa', 'Kamis', '15.00', 6),
('coach-nisa', 'Kamis', '16.00', 6),
('coach-dika', 'Jumat', '08.00', 6),
('coach-dika', 'Jumat', '16.00', 6),
('coach-dika', 'Sabtu', '08.00', 6),
('coach-dika', 'Sabtu', '10.00', 6);

-- Seeding members
INSERT INTO members (id, parent_name, parent_whatsapp, student_name, student_gender, student_dob, student_age, student_illness, student_has_swum, coach_id, package_id, schedule_frequency, schedule_day, schedule_time, coach_type, status, sessions_left, sessions_total, registered_at, referral_code_used, referral_count, referral_bonus) VALUES
('member-aldi', 'Bapak Rudi', '081234567890', 'Aldi Pratama', 'Laki-laki', '2016-04-12', 10, 'Tidak ada', 1, 'coach-rian', 'rian-p8', '1x Seminggu', 'Senin', '08.00', 'Reguler', 'Aktif', 5, 8, '2026-06-14 09:30:00', 'COACH-RIAN', 2, 100000),
('member-bima', 'Ibu Maya', '082198765432', 'Bima Sakti', 'Laki-laki', '2015-08-20', 11, 'Asma ringan', 0, 'coach-rian', 'rian-p8', '1x Seminggu', 'Senin', '08.00', 'Reguler', 'Aktif', 6, 8, '2026-06-14 10:00:00', NULL, 0, 0),
('member-caca', 'Bapak Hartono', '081344556677', 'Caca Kirana', 'Perempuan', '2017-01-05', 9, 'Tidak ada', 1, 'coach-rian', 'rian-p4', '1x Seminggu', 'Senin', '08.00', 'Reguler', 'Aktif', 1, 4, '2026-06-15 08:00:00', NULL, 0, 0),
('member-dito', 'Ibu Siska', '081122334455', 'Dito Mahendra', 'Laki-laki', '2018-09-30', 7, 'Tidak ada', 0, 'coach-rian', 'rian-p12', '1x Seminggu', 'Senin', '08.00', 'Reguler', 'Aktif', 10, 12, '2026-06-14 11:20:00', NULL, 0, 0),
('member-elsa', 'Bapak Joko', '081299887766', 'Elsa Monica', 'Perempuan', '2016-11-18', 9, 'Pernah trauma tenggelam', 0, 'coach-rian', 'rian-p8', '1x Seminggu', 'Senin', '08.00', 'Reguler', 'Aktif', 2, 8, '2026-06-14 15:00:00', NULL, 0, 0),
('member-fani', 'Ibu Diana', '081234561234', 'Fani Anggraini', 'Perempuan', '2015-05-15', 11, 'Tidak ada', 1, 'coach-rian', 'rian-p4', '1x Seminggu', 'Selasa', '08.00', 'Reguler', 'Aktif', 3, 4, '2026-06-15 09:30:00', NULL, 0, 0),
('member-galang', 'Bapak Rudi Hartono', '081234569988', 'Galang Saputra', 'Laki-laki', '2014-02-10', 12, 'Tidak ada', 1, 'coach-rian', 'rian-p8', '1x Seminggu', 'Selasa', '08.00', 'Reguler', 'Aktif', 8, 8, '2026-06-16 10:00:00', NULL, 0, 0),
('member-hari', 'Ibu Yani', '081234564455', 'Hari Wijaya', 'Laki-laki', '2017-07-07', 9, 'Tidak ada', 0, 'coach-rian', 'rian-p4', '1x Seminggu', 'Selasa', '09.00', 'Reguler', 'Aktif', 4, 4, '2026-06-16 11:30:00', NULL, 0, 0),
('member-irma', 'Bapak Sony', '081299990001', 'Irma Lestari', 'Perempuan', '2016-03-03', 10, 'Tidak ada', 0, 'coach-nisa', 'nisa-p8', '1x Seminggu', 'Rabu', '08.00', 'Reguler', 'Aktif', 8, 8, '2026-06-17 08:00:00', NULL, 0, 0),
('member-joko', 'Ibu Ratna', '081299990002', 'Joko Susilo', 'Laki-laki', '2015-10-10', 10, 'Tidak ada', 1, 'coach-nisa', 'nisa-p8', '1x Seminggu', 'Rabu', '15.00', 'Reguler', 'Aktif', 8, 8, '2026-06-17 08:30:00', NULL, 0, 0),
('member-karen', 'Bapak Sutejo', '081299990010', 'Karen Gillan', 'Perempuan', '2015-02-12', 11, 'Tidak ada', 0, 'coach-dika', 'dika-p12', '1x Seminggu', 'Jumat', '08.00', 'Reguler', 'Aktif', 12, 12, '2026-06-17 09:30:00', NULL, 0, 0),
('member-latif', 'Ibu Aminah', '081299990011', 'Latif Ibrahim', 'Laki-laki', '2017-05-05', 9, 'Tidak ada', 1, 'coach-dika', 'dika-p4', '1x Seminggu', 'Jumat', '08.00', 'Reguler', 'Aktif', 4, 4, '2026-06-17 10:00:00', NULL, 0, 0),
('member-miko', 'Bapak Ronald', '081299990012', 'Miko Pratama', 'Laki-laki', '2018-01-01', 8, 'Tidak ada', 0, 'coach-dika', 'dika-p8', '1x Seminggu', 'Jumat', '08.00', 'Reguler', 'Aktif', 8, 8, '2026-06-17 10:20:00', NULL, 0, 0),
('member-nana', 'Bapak Yusuf', '081299990003', 'Nana Novita', 'Perempuan', '2016-09-09', 9, 'Tidak ada', 1, 'coach-dika', 'dika-p8', '1x Seminggu', 'Jumat', '08.00', 'Reguler', 'Aktif', 1, 8, '2026-06-17 10:30:00', NULL, 0, 0),
('member-oni', 'Ibu Susan', '081299990004', 'Oni Syahputra', 'Laki-laki', '2015-11-11', 10, 'Tidak ada', 0, 'coach-dika', 'dika-p8', '1x Seminggu', 'Jumat', '08.00', 'Reguler', 'Aktif', 5, 8, '2026-06-17 10:40:00', NULL, 0, 0),
('member-putra', 'Bapak Anwar', '081299990005', 'Putra Pratama', 'Laki-laki', '2016-12-25', 9, 'Tidak ada', 1, 'coach-dika', 'dika-p8', '1x Seminggu', 'Jumat', '08.00', 'Reguler', 'Aktif', 6, 8, '2026-06-17 10:50:00', NULL, 0, 0);

-- Seeding payments
INSERT INTO payments (member_id, amount, method, proof_url, status, date) VALUES
('member-aldi', 450000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-15 10:00:00'),
('member-bima', 450000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-15 10:15:00'),
('member-caca', 250000, 'Tunai di Kasir', NULL, 'Pembayaran Berhasil', '2026-06-16 15:00:00'),
('member-dito', 600000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-15 11:00:00'),
('member-elsa', 450000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-15 13:40:00'),
('member-fani', 250000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-15 10:00:00'),
('member-galang', 450000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-16 11:00:00'),
('member-hari', 250000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-16 12:00:00'),
('member-irma', 450000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-17 09:00:00'),
('member-joko', 450000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-17 09:15:00'),
('member-karen', 600000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-17 10:00:00'),
('member-latif', 250000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-17 10:10:00'),
('member-miko', 450000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-17 10:20:00'),
('member-nana', 450000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-18 09:30:00'),
('member-oni', 450000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-18 09:40:00'),
('member-putra', 450000, 'Transfer BNI', 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=500&auto=format&fit=crop&q=60', 'Pembayaran Berhasil', '2026-06-18 09:50:00');

-- Seeding training progress
INSERT INTO training_progress (id, member_id, date, attendance, note) VALUES
('prog-1', 'member-aldi', '2026-06-22', 'Hadir', 'Hari pertama: Meluncur dengan baik dan melatih kayuhan kaki gaya bebas.'),
('prog-2', 'member-aldi', '2026-06-25', 'Hadir', 'Melatih pernapasan gaya bebas ke arah kanan. Sudah mulai stabil.'),
('prog-3', 'member-aldi', '2026-06-29', 'Hadir', 'Pengenalan gaya dada. Koordinasi kaki sudah baik, gerakan tangan perlu pembiasaan.'),
('bima-prog-1', 'member-bima', '2026-06-22', 'Hadir', 'Latihan dasar membiasakan kepala di dalam air. Bima sangat berani.'),
('bima-prog-2', 'member-bima', '2026-06-29', 'Hadir', 'Meluncur dibantu kickboard sejauh 5 meter.'),
('caca-prog-1', 'member-caca', '2026-06-22', 'Hadir', 'Sudah mahir gaya bebas. Latihan hari ini pengenalan gaya dada lengkap.'),
('caca-prog-2', 'member-caca', '2026-06-25', 'Hadir', 'Latihan ketahanan renang 25 meter bolak balik gaya bebas.'),
('caca-prog-3', 'member-caca', '2026-06-29', 'Hadir', 'Melatih kayuhan kaki gaya dada dan teknik mengambil napas.'),
('dito-prog-1', 'member-dito', '2026-06-22', 'Hadir', 'Latihan gelembung napas (bubble) di tepi kolam. Masih agak takut air.'),
('dito-prog-2', 'member-dito', '2026-06-29', 'Hadir', 'Sudah mulai berani melepas pegangan kolam dengan pelampung punggung.'),
('elsa-prog-1', 'member-elsa', '2026-06-22', 'Hadir', 'Fokus ke adaptasi air karena ada trauma. Elsa berhasil tersenyum di kolam hari ini!'),
('elsa-prog-2', 'member-elsa', '2026-06-24', 'Hadir', 'Meluncur dibantu pelatih dengan jarak dekat.'),
('elsa-prog-3', 'member-elsa', '2026-06-26', 'Hadir', 'Belajar mengepakan kaki gaya bebas di pinggir kolam.'),
('elsa-prog-4', 'member-elsa', '2026-06-29', 'Hadir', 'Mencoba menyelam mengambil koin mainan di air dangkal (1 meter).'),
('elsa-prog-5', 'member-elsa', '2026-07-01', 'Hadir', 'Latihan meluncur mandiri sejauh 3 meter. Kemajuannya luar biasa.');

-- Seeding events
INSERT INTO events (id, title, category, date, description, image_url) VALUES
('event-1', 'Fun Swimming Anak-Anak Tirta Barokah', 'Fun Swimming', '2026-07-20', 'Kegiatan berenang ceria untuk melatih keberanian anak di air dangkal dengan berbagai permainan seru, perebutan koin, dan balapan pelampung. Semua peserta mendapatkan bingkisan menarik!', 'https://images.unsplash.com/photo-1519074002996-a69e7ac46a42?w=600&h=400&fit=crop&q=80'),
('event-2', 'Kejuaraan Renang Pemula Se-Palembang', 'Lomba', '2026-08-05', 'Ajang kompetisi gaya bebas dan gaya dada 25 meter untuk kategori umur 6-12 tahun. Dapatkan piala, piagam penghargaan, dan tabungan pendidikan untuk juara 1, 2, dan 3!', 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&h=400&fit=crop&q=80');
