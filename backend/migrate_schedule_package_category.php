<?php
/**
 * Migration script to add package_category and pricing_package_id to coach_schedules table
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

echo "Memulai migrasi kategori paket pada jadwal pelatih...\n";

try {
    // Add package_category column if not exists
    $cols = $pdo->query("SHOW COLUMNS FROM coach_schedules LIKE 'package_category'")->fetchAll();
    if (count($cols) === 0) {
        $pdo->exec("ALTER TABLE coach_schedules ADD COLUMN package_category VARCHAR(50) NOT NULL DEFAULT 'ALL'");
        echo "- Kolom 'package_category' berhasil ditambahkan ke tabel 'coach_schedules'.\n";
    } else {
        echo "- Kolom 'package_category' sudah ada di tabel 'coach_schedules'.\n";
    }

    // Add pricing_package_id column if not exists
    $colsPkg = $pdo->query("SHOW COLUMNS FROM coach_schedules LIKE 'pricing_package_id'")->fetchAll();
    if (count($colsPkg) === 0) {
        $pdo->exec("ALTER TABLE coach_schedules ADD COLUMN pricing_package_id VARCHAR(50) DEFAULT NULL");
        echo "- Kolom 'pricing_package_id' berhasil ditambahkan ke tabel 'coach_schedules'.\n";
    } else {
        echo "- Kolom 'pricing_package_id' sudah ada di tabel 'coach_schedules'.\n";
    }

    echo "Migrasi berhasil selesai!\n";

} catch (Exception $e) {
    echo "Terjadi kesalahan: " . $e->getMessage() . "\n";
}
