<?php
/**
 * Database migration script to create event_categories, swimming_pools tables
 * and add swimming_pool_id column to coach_schedules.
 */

$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    die("File .env tidak ditemukan di: $envFile\n");
}

$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$env = [];
foreach ($lines as $line) {
    if (strpos(trim($line), '#') === 0) continue;
    $parts = explode('=', $line, 2);
    if (count($parts) === 2) {
        $env[trim($parts[0])] = trim(trim($parts[1]), "'\"");
    }
}

$host = $env['database.default.hostname'] ?? 'localhost';
$dbName = $env['database.default.database'] ?? 'db_tirtabarokah';
$user = $env['database.default.username'] ?? 'root';
$pass = $env['database.default.password'] ?? '';
$port = $env['database.default.port'] ?? 3306;

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbName;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    die("Koneksi database gagal: " . $e->getMessage() . "\n");
}

echo "Memulai migrasi event_categories & swimming_pools...\n";

try {
    // 1. Create event_categories table
    $pdo->exec("CREATE TABLE IF NOT EXISTS event_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100) NULL DEFAULT 'system',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by VARCHAR(100) NULL DEFAULT 'system'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    echo "- Tabel 'event_categories' berhasil dibuat.\n";

    // Seed default categories
    $defaultCategories = ['Fun Swimming', 'Lomba', 'Latihan Bersama', 'Pengumuman'];
    foreach ($defaultCategories as $cat) {
        $stmt = $pdo->prepare("INSERT IGNORE INTO event_categories (name) VALUES (?)");
        $stmt->execute([$cat]);
    }
    echo "- Seed kategori event default berhasil.\n";

    // 2. Create swimming_pools table
    $pdo->exec("CREATE TABLE IF NOT EXISTS swimming_pools (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        training_days TEXT NOT NULL,
        training_hours TEXT NOT NULL,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(100) NULL DEFAULT 'system',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by VARCHAR(100) NULL DEFAULT 'system'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    echo "- Tabel 'swimming_pools' berhasil dibuat.\n";

    // Seed initial swimming pool
    $stmt = $pdo->prepare("INSERT IGNORE INTO swimming_pools (id, name, training_days, training_hours, description) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([
        'pool-1',
        'Kolam Renang Tirta Barokah (Utama)',
        json_encode(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']),
        json_encode(['08:00 - 09:30', '10:00 - 11:30', '14:00 - 15:30', '16:00 - 17:30']),
        'Kolam renang standar dengan fasilitas lengkap, kamar ganti, dan tempat bilas.'
    ]);
    echo "- Seed kolam renang utama berhasil.\n";

    // 3. Add swimming_pool_id to coach_schedules table
    $colsStmt = $pdo->query("SHOW COLUMNS FROM `coach_schedules`");
    $existingCols = array_map(function($col) {
        return strtolower($col['Field']);
    }, $colsStmt->fetchAll());

    if (!in_array('swimming_pool_id', $existingCols)) {
        $pdo->exec("ALTER TABLE `coach_schedules` ADD COLUMN `swimming_pool_id` VARCHAR(50) NULL AFTER `time`");
        echo "- Kolom 'swimming_pool_id' berhasil ditambahkan ke tabel 'coach_schedules'.\n";
    }

    echo "Migrasi Selesai dengan Sukses!\n";
} catch (\Exception $e) {
    die("Error saat melakukan migrasi: " . $e->getMessage() . "\n");
}
