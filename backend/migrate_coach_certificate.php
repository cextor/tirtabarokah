<?php
$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    die("File .env tidak ditemukan\n");
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
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    $stmt = $pdo->query("SHOW COLUMNS FROM `coaches`");
    $cols = array_map(function($col) { return $col['Field']; }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    
    if (!in_array('certificate_url', $cols)) {
        $pdo->exec("ALTER TABLE `coaches` ADD COLUMN `certificate_url` LONGTEXT DEFAULT NULL");
        echo "Kolom certificate_url berhasil ditambahkan ke tabel coaches.\n";
    } else {
        echo "Kolom certificate_url sudah ada.\n";
    }
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
