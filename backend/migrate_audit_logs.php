<?php
/**
 * Database migration script to create audit_logs table:
 * 1. Creates `audit_logs` table.
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

echo "Memulai migrasi audit_logs...\n";

try {
    // Create audit_logs table
    $pdo->exec("CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        username VARCHAR(100) NOT NULL,
        role VARCHAR(50) NOT NULL,
        action_type ENUM('input', 'edit', 'hapus', 'verifikasi') NOT NULL,
        table_name VARCHAR(100) NOT NULL,
        record_id VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    echo "- Tabel 'audit_logs' berhasil dibuat.\n";

    echo "Migrasi Selesai dengan Sukses!\n";
} catch (\Exception $e) {
    die("Error saat melakukan migrasi: " . $e->getMessage() . "\n");
}
