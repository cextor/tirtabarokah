<?php
$envFile = __DIR__ . '/backend/.env';
if (file_exists($envFile)) {
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
} else {
    $host = 'localhost'; $dbName = 'db_tirtabarokah'; $user = 'root'; $pass = ''; $port = 3306;
}

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbName;charset=utf8mb4", $user, $pass);
    $pdo->exec("UPDATE coach_schedules SET package_category = 'REGULER' WHERE package_category = 'ALL' OR package_category IS NULL OR package_category = ''");
    echo "Berhasil memperbarui kategori 'ALL' menjadi 'REGULER' pada database!\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
