-- Database initialization for Tirta Barokah
CREATE DATABASE IF NOT EXISTS db_tirtabarokah;
USE db_tirtabarokah;

-- 1. Table: users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'coach') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table: coaches
CREATE TABLE IF NOT EXISTS coaches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    photo LONGTEXT NOT NULL,
    experience TEXT NOT NULL,
    referral_code VARCHAR(50) UNIQUE NOT NULL,
    referral_bonus INT DEFAULT 0,
    max_quota INT DEFAULT 6,
    is_active TINYINT(1) DEFAULT 1,
    email VARCHAR(100) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table: packages
CREATE TABLE IF NOT EXISTS packages (
    id VARCHAR(50) PRIMARY KEY,
    coach_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    price INT NOT NULL,
    sessions INT NOT NULL,
    FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Table: coach_schedules
CREATE TABLE IF NOT EXISTS coach_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coach_id VARCHAR(50) NOT NULL,
    day VARCHAR(20) NOT NULL,
    time VARCHAR(50) NOT NULL,
    max_slots INT DEFAULT 6,
    FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Table: members
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
    package_id VARCHAR(50) NOT NULL,
    coach_type ENUM('Reguler', 'Privat') NOT NULL,
    status ENUM('Menunggu Pembayaran', 'Menunggu Verifikasi', 'Aktif', 'Paket Hampir Habis', 'Selesai') NOT NULL,
    sessions_left INT NOT NULL,
    sessions_total INT NOT NULL,
    registered_at DATETIME NOT NULL,
    referral_code_used VARCHAR(50) DEFAULT NULL,
    referral_count INT DEFAULT 0,
    referral_bonus INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    FOREIGN KEY (package_id) REFERENCES packages(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Table: member_schedules
CREATE TABLE IF NOT EXISTS member_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id VARCHAR(50) NOT NULL,
    coach_id VARCHAR(50) NOT NULL,
    day VARCHAR(20) NOT NULL,
    time VARCHAR(50) NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Table: payments
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

-- 8. Table: training_progress
CREATE TABLE IF NOT EXISTS training_progress (
    id VARCHAR(50) PRIMARY KEY,
    member_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    attendance ENUM('Hadir', 'Absen', 'Izin') NOT NULL,
    note TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Table: reschedule_requests
CREATE TABLE IF NOT EXISTS reschedule_requests (
    id VARCHAR(50) PRIMARY KEY,
    member_id VARCHAR(50) NOT NULL,
    original_day VARCHAR(20) NOT NULL,
    original_time VARCHAR(50) NOT NULL,
    requested_day VARCHAR(20) NOT NULL,
    requested_time VARCHAR(50) NOT NULL,
    status ENUM('Menunggu', 'Disetujui', 'Ditolak') NOT NULL,
    reason TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Table: events
CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category ENUM('Fun Swimming', 'Lomba', 'Latihan Bersama', 'Pengumuman') NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    image_url LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==================== SEEDING INITIAL DATA ====================

-- Seeding users
INSERT INTO users (id, username, password, name, role) VALUES
('admin-1', 'admin', 'admin123', 'Super Admin', 'admin'),
('coach-ardi', 'ardi', 'coach123', 'Coach Ardi', 'coach'),
('coach-hakim', 'hakim', 'coach123', 'Coach Hakim', 'coach'),
('coach-ari', 'ari', 'coach123', 'Coach Ari', 'coach'),
('coach-rahmat', 'rahmat', 'coach123', 'Coach Rahmat', 'coach'),
('coach-yudi', 'yudi', 'coach123', 'Coach Yudi', 'coach'),
('coach-amel', 'amel', 'coach123', 'Coach Amel', 'coach'),
('coach-rama', 'rama', 'coach123', 'Coach Rama', 'coach'),
('coach-asty', 'asty', 'coach123', 'Coach Asty', 'coach'),
('coach-riyadz', 'riyadz', 'coach123', 'Coach Riyadz', 'coach'),
('coach-ridho', 'ridho', 'coach123', 'Coach Ridho', 'coach')
ON DUPLICATE KEY UPDATE 
    username=VALUES(username),
    password=VALUES(password),
    name=VALUES(name),
    role=VALUES(role);

-- Seeding coaches
INSERT INTO coaches (id, name, photo, experience, referral_code, referral_bonus, max_quota, is_active, email, phone) VALUES
('coach-ardi', 'Coach Ardi', '/images/coach_ardi.jpg', 'Pengalaman melatih sejak tahun 2007. Lisensi: Nasional.', 'COACH-ARDI', 150000, 8, 1, 'ardi@tirtabarokah.com', '081234567891'),
('coach-hakim', 'Coach Hakim', '/images/coach_hakim.jpg', 'Pengalaman melatih sejak tahun 2015. Lisensi: Nasional.', 'COACH-HAKIM', 150000, 6, 1, 'hakim@tirtabarokah.com', '081234567892'),
('coach-ari', 'Coach Ari', '/images/coach_ari.jpg', 'Pengalaman melatih sejak tahun 2017. Lisensi: Nasional.', 'COACH-ARI', 150000, 6, 1, 'ari@tirtabarokah.com', '081234567893'),
('coach-rahmat', 'Coach Rahmat', '/images/coach_rahmat.jpg', 'Pengalaman melatih sejak tahun 2019. Lisensi: Nasional.', 'COACH-RAHMAT', 150000, 6, 1, 'rahmat@tirtabarokah.com', '081234567894'),
('coach-yudi', 'Coach Yudi', '/images/coach_yudi.jpg', 'Pengalaman melatih sejak tahun 2020. Lisensi: Nasional.', 'COACH-YUDI', 150000, 6, 1, 'yudi@tirtabarokah.com', '081234567895'),
('coach-amel', 'Coach Amel', '/images/coach_amel.jpg', 'Pengalaman melatih sejak tahun 2020. Lisensi: Nasional.', 'COACH-AMEL', 150000, 6, 1, 'amel@tirtabarokah.com', '081234567896'),
('coach-rama', 'Coach Rama', '/images/coach_rama.jpg', 'Pengalaman melatih sejak tahun 2024. Lisensi: Nasional.', 'COACH-RAMA', 150000, 6, 1, 'rama@tirtabarokah.com', '081234567897'),
('coach-asty', 'Coach Asty', '/images/coach_asty.jpg', 'Pengalaman melatih sejak tahun 2025. Lisensi: Nasional.', 'COACH-ASTY', 150000, 6, 1, 'asty@tirtabarokah.com', '081234567898'),
('coach-riyadz', 'Coach Riyadz', '/images/coach_riyadz.jpg', 'Pengalaman melatih sejak tahun 2025. Lisensi: Nasional.', 'COACH-RIYADZ', 150000, 6, 1, 'riyadz@tirtabarokah.com', '081234567899'),
('coach-ridho', 'Coach Ridho', '/images/coach_ridho.jpg', 'Pengalaman melatih sejak tahun 2025. Lisensi: Nasional.', 'COACH-RIDHO', 150000, 6, 1, 'ridho@tirtabarokah.com', '081234567900')
ON DUPLICATE KEY UPDATE
    name=VALUES(name),
    photo=VALUES(photo),
    experience=VALUES(experience),
    referral_code=VALUES(referral_code),
    referral_bonus=VALUES(referral_bonus),
    max_quota=VALUES(max_quota),
    is_active=VALUES(is_active),
    email=VALUES(email),
    phone=VALUES(phone);

-- Seeding packages
INSERT INTO packages (id, coach_id, name, price, sessions) VALUES
('ardi-reg-5x', 'coach-ardi', 'Reguler 5x latihan', 250000, 5),
('ardi-priv-2', 'coach-ardi', 'Private khusus 2 anak', 1300000, 8),
('ardi-priv-3', 'coach-ardi', 'Private khusus 3 anak', 1500000, 8),
('hakim-reg-5x', 'coach-hakim', 'Reguler 5x latihan', 250000, 5),
('ari-reg-5x', 'coach-ari', 'Reguler 5x latihan', 250000, 5),
('rahmat-reg-5x', 'coach-rahmat', 'Reguler 5x latihan', 250000, 5),
('yudi-reg-5x', 'coach-yudi', 'Reguler 5x latihan', 250000, 5),
('amel-reg-5x', 'coach-amel', 'Reguler 5x latihan', 250000, 5),
('rama-reg-5x', 'coach-rama', 'Reguler 5x latihan', 220000, 5),
('asty-reg-5x', 'coach-asty', 'Reguler 5x latihan', 250000, 5),
('riyadz-reg-5x', 'coach-riyadz', 'Reguler 5x latihan', 220000, 5),
('ridho-reg-5x', 'coach-ridho', 'Reguler 5x latihan', 220000, 5);

-- Seeding coach_schedules
INSERT INTO coach_schedules (coach_id, day, time, max_slots) VALUES
('coach-ardi', 'Selasa', '16.15 - 17.30', 8),
('coach-ardi', 'Rabu', '16.10 - 17.30', 6),
('coach-ardi', 'Kamis', '16.10 - 17.30', 6),
('coach-ardi', 'Jumat', '16.10 - 17.30', 6),
('coach-ardi', 'Sabtu', '08.00 - 09.15', 6),
('coach-ardi', 'Sabtu', '09.15 - 10.30', 6),
('coach-ardi', 'Sabtu', '15.00 - 16.15', 6),
('coach-ardi', 'Sabtu', '16.15 - 17.30', 6),
('coach-ardi', 'Minggu', '08.00 - 09.15', 6),
('coach-ardi', 'Minggu', '09.15 - 10.30', 6),
('coach-ardi', 'Minggu', '15.00 - 16.15', 6),
('coach-ardi', 'Minggu', '16.15 - 17.30', 6),
('coach-hakim', 'Selasa', '16.15 - 17.30', 6),
('coach-hakim', 'Rabu', '16.10 - 17.30', 6),
('coach-hakim', 'Kamis', '16.10 - 17.30', 6),
('coach-hakim', 'Jumat', '16.10 - 17.30', 6),
('coach-hakim', 'Sabtu', '08.00 - 09.15', 6),
('coach-hakim', 'Sabtu', '09.15 - 10.30', 6),
('coach-hakim', 'Sabtu', '15.00 - 16.15', 6),
('coach-hakim', 'Sabtu', '16.15 - 17.30', 6),
('coach-hakim', 'Minggu', '08.00 - 09.15', 6),
('coach-hakim', 'Minggu', '09.15 - 10.30', 6),
('coach-hakim', 'Minggu', '15.00 - 16.15', 6),
('coach-hakim', 'Minggu', '16.15 - 17.30', 6),
('coach-ari', 'Rabu', '16.10 - 17.30', 6),
('coach-ari', 'Kamis', '16.10 - 17.30', 6),
('coach-ari', 'Jumat', '16.10 - 17.30', 6),
('coach-ari', 'Sabtu', '08.00 - 09.15', 6),
('coach-ari', 'Sabtu', '15.00 - 16.15', 6),
('coach-ari', 'Sabtu', '16.15 - 17.30', 6),
('coach-ari', 'Minggu', '08.00 - 09.15', 6),
('coach-ari', 'Minggu', '09.15 - 10.30', 6),
('coach-rahmat', 'Selasa', '16.15 - 17.30', 6),
('coach-rahmat', 'Rabu', '16.10 - 17.30', 6),
('coach-rahmat', 'Kamis', '16.10 - 17.30', 6),
('coach-rahmat', 'Jumat', '16.10 - 17.30', 6),
('coach-rahmat', 'Sabtu', '08.00 - 09.15', 6),
('coach-rahmat', 'Sabtu', '09.15 - 10.30', 6),
('coach-rahmat', 'Sabtu', '15.00 - 16.15', 6),
('coach-rahmat', 'Sabtu', '16.15 - 17.30', 6),
('coach-rahmat', 'Minggu', '08.00 - 09.15', 6),
('coach-rahmat', 'Minggu', '09.15 - 10.30', 6),
('coach-rahmat', 'Minggu', '15.00 - 16.15', 6),
('coach-rahmat', 'Minggu', '16.15 - 17.30', 6),
('coach-yudi', 'Rabu', '08.00 - 09.15', 6),
('coach-yudi', 'Rabu', '16.10 - 17.30', 6),
('coach-yudi', 'Kamis', '08.00 - 09.15', 6),
('coach-yudi', 'Kamis', '16.10 - 17.30', 6),
('coach-yudi', 'Jumat', '08.00 - 09.15', 6),
('coach-yudi', 'Jumat', '16.10 - 17.30', 6),
('coach-yudi', 'Sabtu', '08.00 - 09.15', 6),
('coach-yudi', 'Sabtu', '09.15 - 10.30', 6),
('coach-yudi', 'Sabtu', '15.00 - 16.15', 6),
('coach-yudi', 'Sabtu', '16.15 - 17.30', 6),
('coach-yudi', 'Minggu', '08.00 - 09.15', 6),
('coach-yudi', 'Minggu', '09.15 - 10.30', 6),
('coach-yudi', 'Minggu', '15.00 - 16.15', 6),
('coach-yudi', 'Minggu', '16.15 - 17.30', 6),
('coach-amel', 'Rabu', '16.10 - 17.30', 6),
('coach-amel', 'Kamis', '16.10 - 17.30', 6),
('coach-amel', 'Jumat', '16.10 - 17.30', 6),
('coach-amel', 'Sabtu', '15.00 - 16.15', 6),
('coach-amel', 'Sabtu', '16.15 - 17.30', 6),
('coach-amel', 'Minggu', '08.00 - 09.15', 6),
('coach-amel', 'Minggu', '09.15 - 10.30', 6),
('coach-amel', 'Minggu', '15.00 - 16.15', 6),
('coach-amel', 'Minggu', '16.15 - 17.30', 6),
('coach-rama', 'Rabu', '16.10 - 17.30', 6),
('coach-rama', 'Kamis', '16.10 - 17.30', 6),
('coach-rama', 'Jumat', '16.10 - 17.30', 6),
('coach-rama', 'Sabtu', '08.00 - 09.15', 6),
('coach-rama', 'Sabtu', '09.15 - 10.30', 6),
('coach-rama', 'Sabtu', '15.00 - 16.15', 6),
('coach-rama', 'Sabtu', '16.15 - 17.30', 6),
('coach-rama', 'Minggu', '08.00 - 09.15', 6),
('coach-rama', 'Minggu', '09.15 - 10.30', 6),
('coach-rama', 'Minggu', '15.00 - 16.15', 6),
('coach-rama', 'Minggu', '16.15 - 17.30', 6),
('coach-asty', 'Rabu', '16.10 - 17.30', 6),
('coach-asty', 'Kamis', '16.10 - 17.30', 6),
('coach-asty', 'Jumat', '16.10 - 17.30', 6),
('coach-asty', 'Sabtu', '08.00 - 09.15', 6),
('coach-asty', 'Sabtu', '09.15 - 10.30', 6),
('coach-asty', 'Sabtu', '15.00 - 16.15', 6),
('coach-asty', 'Sabtu', '16.15 - 17.30', 6),
('coach-asty', 'Minggu', '08.00 - 09.15', 6),
('coach-asty', 'Minggu', '09.15 - 10.30', 6),
('coach-asty', 'Minggu', '15.00 - 16.15', 6),
('coach-asty', 'Minggu', '16.15 - 17.30', 6),
('coach-riyadz', 'Rabu', '16.10 - 17.30', 6),
('coach-riyadz', 'Kamis', '16.10 - 17.30', 6),
('coach-riyadz', 'Jumat', '16.10 - 17.30', 6),
('coach-riyadz', 'Sabtu', '08.00 - 09.15', 6),
('coach-riyadz', 'Sabtu', '09.15 - 10.30', 6),
('coach-riyadz', 'Sabtu', '15.00 - 16.15', 6),
('coach-riyadz', 'Sabtu', '16.15 - 17.30', 6),
('coach-riyadz', 'Minggu', '08.00 - 09.15', 6),
('coach-riyadz', 'Minggu', '09.15 - 10.30', 6),
('coach-riyadz', 'Minggu', '15.00 - 16.15', 6),
('coach-riyadz', 'Minggu', '16.15 - 17.30', 6),
('coach-ridho', 'Sabtu', '08.00 - 09.15', 6),
('coach-ridho', 'Sabtu', '09.15 - 10.30', 6),
('coach-ridho', 'Sabtu', '15.00 - 16.15', 6),
('coach-ridho', 'Sabtu', '16.15 - 17.30', 6),
('coach-ridho', 'Minggu', '08.00 - 09.15', 6),
('coach-ridho', 'Minggu', '09.15 - 10.30', 6),
('coach-ridho', 'Minggu', '15.00 - 16.15', 6),
('coach-ridho', 'Minggu', '16.15 - 17.30', 6);

-- Seeding members sample data
INSERT INTO members (id, parent_name, parent_whatsapp, student_name, student_gender, student_dob, student_age, student_illness, student_has_swum, package_id, coach_type, status, sessions_left, sessions_total, registered_at, is_active) VALUES
('MBR-2025-001', 'Hendra Wijaya', '628123456789', 'Raffi Ahmad', 'Laki-laki', '2016-05-12', 9, 'Tidak Ada', 1, 'ardi-reg-5x', 'Reguler', 'Aktif', 1, 5, '2025-01-10 10:00:00', 1),
('MBR-2025-002', 'Siti Rahma', '628987654321', 'Nayla Putri', 'Perempuan', '2017-08-20', 8, 'Asma Ringan', 0, 'ardi-priv-2', 'Privat', 'Aktif', 4, 8, '2025-01-12 14:30:00', 1),
('MBR-2025-003', 'Budi Santoso', '628555444333', 'Bima Sakti', 'Laki-laki', '2015-11-03', 10, 'Tidak Ada', 1, 'hakim-reg-5x', 'Reguler', 'Menunggu Verifikasi', 5, 5, '2025-01-15 09:15:00', 1),
('MBR-2025-004', 'Dewi Lestari', '628771122334', 'Aura Kasih', 'Perempuan', '2018-02-14', 7, 'Tidak Ada', 1, 'ari-reg-5x', 'Reguler', 'Paket Hampir Habis', 2, 5, '2025-01-05 11:20:00', 1)
ON DUPLICATE KEY UPDATE student_name=VALUES(student_name);

-- Seeding member_schedules
INSERT INTO member_schedules (member_id, coach_id, day, time) VALUES
('MBR-2025-001', 'coach-ardi', 'Rabu', '16.10 - 17.30'),
('MBR-2025-002', 'coach-ardi', 'Sabtu', '08.00 - 09.15'),
('MBR-2025-002', 'coach-ardi', 'Minggu', '08.00 - 09.15'),
('MBR-2025-003', 'coach-hakim', 'Selasa', '16.15 - 17.30'),
('MBR-2025-004', 'coach-ari', 'Rabu', '16.10 - 17.30');

-- Seeding payments
INSERT INTO payments (member_id, amount, method, proof_url, status, date) VALUES
('MBR-2025-001', 250000, 'Transfer BNI', '/uploads/proof_sample1.jpg', 'Pembayaran Berhasil', '2025-01-10 10:05:00'),
('MBR-2025-002', 1300000, 'Tunai di Kasir', NULL, 'Pembayaran Berhasil', '2025-01-12 14:35:00'),
('MBR-2025-003', 250000, 'Transfer BNI', '/uploads/proof_sample3.jpg', 'Menunggu Verifikasi', '2025-01-15 09:20:00'),
('MBR-2025-004', 250000, 'Transfer BNI', '/uploads/proof_sample4.jpg', 'Pembayaran Berhasil', '2025-01-05 11:25:00');

-- Seeding training_progress
INSERT INTO training_progress (id, member_id, date, attendance, note) VALUES
('PROG-001', 'MBR-2025-001', '2025-01-12', 'Hadir', 'Latihan meluncur dan penyesuaian pernapasan.'),
('PROG-002', 'MBR-2025-001', '2025-01-15', 'Hadir', 'Gerakan kaki gaya dada mulai stabil.'),
('PROG-003', 'MBR-2025-001', '2025-01-19', 'Hadir', 'Melakukan rotasi tangan gaya bebas.'),
('PROG-004', 'MBR-2025-001', '2025-01-22', 'Hadir', 'Pengambilan napas samping gaya bebas sudah cukup lancar.'),
('PROG-005', 'MBR-2025-002', '2025-01-18', 'Hadir', 'Pengenalan air dan keberanian menyelam.')
ON DUPLICATE KEY UPDATE note=VALUES(note);


-- Seeding events
INSERT INTO events (id, title, category, date, description, image_url) VALUES
('event-1', 'Fun Swimming Anak-Anak Tirta Barokah', 'Fun Swimming', '2026-07-20', 'Kegiatan berenang ceria untuk melatih keberanian anak di air dangkal dengan berbagai permainan seru, perebutan koin, dan balapan pelampung. Semua peserta mendapatkan bingkisan menarik!', '/images/event_fun.png'),
('event-2', 'Kejuaraan Renang Pemula Se-Palembang', 'Lomba', '2026-08-05', 'Ajang kompetisi gaya bebas dan gaya dada 25 meter untuk kategori umur 6-12 tahun. Dapatkan piala, piagam penghargaan, dan tabungan pendidikan untuk juara 1, 2, dan 3!', '/images/event_lomba.png');

-- 11. Table: site_settings
CREATE TABLE IF NOT EXISTS site_settings (
    key_name VARCHAR(100) PRIMARY KEY,
    value_text TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seeding site_settings
INSERT INTO site_settings (key_name, value_text) VALUES
('profile_heading', 'Profil Private Renang Tirta Barokah Palembang'),
('profile_text_1', 'Private Renang Tirta Barokah Palembang adalah tempat latihan renang yang telah dipercaya masyarakat Palembang sejak tahun 2012.'),
('profile_text_2', 'Metode latihan dirancang secara bertahap, sistematis, dan disesuaikan dengan usia, kemampuan, serta tujuan belajar masing-masing peserta.'),
('profile_text_3', 'Didukung oleh tim pelatih berlisensi kepelatihan, memberikan pendampingan personal agar mendapat perhatian optimal.'),
('why_choose_heading', 'Mengapa Memilih Private Renang Tirta Barokah Palembang?'),
('why_choose_1_title', 'Berpengalaman Sejak 2012'),
('why_choose_1_desc', 'Lebih dari satu dekade melayani renang private.'),
('why_choose_2_title', 'Pelatih Profesional'),
('why_choose_2_desc', 'Berlisensi resmi, berpengalaman, dan komunikatif.'),
('why_choose_3_title', 'Pendekatan Personal'),
('why_choose_3_desc', 'Setiap peserta memperoleh perhatian lebih intensif.'),
('why_choose_4_title', 'Aman & Menyenangkan'),
('why_choose_4_desc', 'Membangun rasa percaya diri dengan pendekatan sabar.'),
('package_notes', 'Catatan: Biaya belum termasuk tiket masuk kolam renang (opsional tergantung lokasi latihan).')
ON DUPLICATE KEY UPDATE value_text=VALUES(value_text);

-- 12. Table: program_levels
CREATE TABLE IF NOT EXISTS program_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level_number INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    target_learning TEXT NOT NULL,
    materials TEXT NOT NULL,
    graduation_target TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seeding program_levels
INSERT INTO program_levels (id, level_number, name, target_learning, materials, graduation_target) VALUES
(1, 1, 'Water Confidence (Adaptasi Air)', 'Berani masuk kolam tanpa takut\nMengenal lingkungan kolam\nBermain di air dengan nyaman\nPercaya kepada pelatih', 'Pengenalan kolam\nBermain air\nBerjalan di dalam air\nPercikan air ke wajah\nDuduk di pinggir kolam\nKeselamatan dasar di kolam', 'Peserta merasa nyaman berada di air dan tidak takut lagi.'),
(2, 2, 'Breathing (Latihan Pernapasan)', 'Mengatur napas dengan benar\nMeniup gelembung di air\nMenyelam ringan', 'Bubble\nAmbil napas\nBuang napas di air\nMenyelam pendek\nMengambil benda di dasar kolam dangkal', 'Peserta mampu mengontrol napas saat berada di dalam air.'),
(3, 3, 'Floating (Mengapung)', 'Mengapung telungkup\nMeningkatkan rasa panik\nMengapung terlentang', 'Front Float\nBack Float\nStar Float\nStreamline Position', 'Peserta dapat mengapung dengan rileks.'),
(4, 4, 'Glide (Meluncur)', 'Meluncur lurus\nPosisi badan streamline\nMenjaga keseimbangan tubuh', 'Push Off\nStreamline\nGlide\nMeluncur dari dinding kolam', 'Peserta mampu meluncur dengan posisi tubuh yang baik.'),
(5, 5, 'Kicking (Gerakan Kaki)', 'Tendangan efektif\nPosisi kaki benar', 'Flutter Kick\nKick Board Drill\nKick tanpa papan', 'Peserta mampu bergerak maju menggunakan tendangan kaki.'),
(6, 6, 'Arm Movement (Gerakan Tangan)', 'Teknik kayuhan tangan\nKoordinasi tangan', 'Recovery\nCatch\nPull\nPush', 'Peserta memahami teknik kayuhan dasar.'),
(7, 7, 'Coordination (Koordinasi)', 'Menggabungkan Pernapasan, Tangan, dan Kaki', 'Swim Drill\nKoordinasi penuh\nLatihan ritme', 'Peserta mulai berenang tanpa bantuan pelatih.'),
(8, 8, 'Swimming Independence (Mandiri)', 'Berenang mandiri\nTeknik semakin rapi\nMeningkatkan jarak renang', 'Gaya Bebas\nGaya Dada\nPerbaikan teknik\nEfisiensi gerakan', 'Peserta mampu berenang secara mandiri dengan teknik dasar yang benar.'),
(9, 9, 'Skill Development', 'Peserta mulai belajar Gaya Bebas, Gaya Dada, Gaya Punggung, Gaya Kupu-kupu', 'Start\nFinish\nDiving\nWater Survival\nTreading Water', 'Peserta memiliki keterampilan tingkat lanjut dan memahami dasar-dasar penyelamatan diri di air.')
ON DUPLICATE KEY UPDATE 
    level_number=VALUES(level_number),
    name=VALUES(name),
    target_learning=VALUES(target_learning),
    materials=VALUES(materials),
    graduation_target=VALUES(graduation_target);

-- 13. Table: user_tokens
CREATE TABLE IF NOT EXISTS user_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
