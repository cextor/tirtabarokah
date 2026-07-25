<?php
/**
 * Database migration script to create `coach_absences` table.
 */

// Simple .env parser to get DB credentials
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

echo "Memulai migrasi coach absences...\n";

try {
    // Create `coach_absences` table
    $pdo->exec("CREATE TABLE IF NOT EXISTS coach_absences (
        id VARCHAR(50) PRIMARY KEY,
        coach_id VARCHAR(50) NOT NULL,
        day VARCHAR(20) NOT NULL,
        time VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        reason TEXT NOT NULL,
        status ENUM('Menunggu', 'Transfer', 'Reschedule', 'Batal') NOT NULL DEFAULT 'Menunggu',
        replacement_coach_id VARCHAR(50) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE,
        FOREIGN KEY (replacement_coach_id) REFERENCES coaches(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    echo "- Tabel 'coach_absences' berhasil dibuat.\n";

    echo "Migrasi Selesai dengan Sukses!\n";
} catch (\Exception $e) {
    die("Error saat melakukan migrasi: " . $e->getMessage() . "\n");
}
