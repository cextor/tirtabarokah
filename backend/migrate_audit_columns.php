<?php
/**
 * Database migration script to ensure all tables have audit columns:
 * - created_at
 * - created_by
 * - updated_at
 * - updated_by
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

echo "Memulai migrasi penambahan kolom audit (created_at, created_by, updated_at, updated_by) pada seluruh tabel...\n";

// Get all tables
$tablesStmt = $pdo->query("SHOW TABLES");
$tables = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);

foreach ($tables as $table) {
    echo "- Memeriksa tabel '$table'...\n";
    
    // Get existing columns
    $colsStmt = $pdo->query("SHOW COLUMNS FROM `$table`");
    $existingCols = array_map(function($col) {
        return strtolower($col['Field']);
    }, $colsStmt->fetchAll());

    $alterQueries = [];

    if (!in_array('created_at', $existingCols)) {
        $alterQueries[] = "ADD COLUMN `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
    }

    if (!in_array('created_by', $existingCols)) {
        $alterQueries[] = "ADD COLUMN `created_by` VARCHAR(100) NULL DEFAULT 'system'";
    }

    if (!in_array('updated_at', $existingCols)) {
        $alterQueries[] = "ADD COLUMN `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP";
    }

    if (!in_array('updated_by', $existingCols)) {
        $alterQueries[] = "ADD COLUMN `updated_by` VARCHAR(100) NULL DEFAULT 'system'";
    }

    if (!empty($alterQueries)) {
        $sql = "ALTER TABLE `$table` " . implode(", ", $alterQueries);
        $pdo->exec($sql);
        echo "  [OK] Menambahkan kolom baru: " . implode(", ", $alterQueries) . "\n";
    } else {
        echo "  [SKIP] Kolom audit sudah lengkap.\n";
    }
}

echo "Migrasi Selesai dengan Sukses!\n";
