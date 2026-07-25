<?php
/**
 * Database migration script to transition db_tirtabarokah schema:
 * 1. Creates `users` table.
 * 2. Migrates existing admin accounts to the `users` table.
 * 3. Migrates existing coach credentials (username/password) to the `users` table.
 * 4. Removes redundant credentials from the `coaches` table.
 * 5. Configures `coaches.id` as a foreign key referencing `users.id` with ON DELETE CASCADE.
 * 6. Drops the redundant `admins` table.
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

echo "Memulai migrasi database...\n";

try {
    // 1. Create `users` table
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        role ENUM('admin', 'coach') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    echo "- Tabel 'users' berhasil dibuat.\n";

    // 2. Migrate admins
    $adminsTableExists = $pdo->query("SHOW TABLES LIKE 'admins'")->rowCount() > 0;
    if ($adminsTableExists) {
        $admins = $pdo->query("SELECT * FROM admins")->fetchAll();
        foreach ($admins as $admin) {
            $stmt = $pdo->prepare("INSERT IGNORE INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, 'admin')");
            $stmt->execute([$admin['id'], $admin['username'], $admin['password'], $admin['name']]);
        }
        echo "- Akun admin berhasil disalin ke tabel 'users'.\n";
    }

    // 3. Migrate coaches
    $coachesColumns = $pdo->query("DESCRIBE coaches")->fetchAll(PDO::FETCH_COLUMN);
    if (in_array('username', $coachesColumns) && in_array('password', $coachesColumns)) {
        $coaches = $pdo->query("SELECT * FROM coaches")->fetchAll();
        foreach ($coaches as $coach) {
            $stmt = $pdo->prepare("INSERT IGNORE INTO users (id, username, password, name, role) VALUES (?, ?, ?, ?, 'coach')");
            $stmt->execute([$coach['id'], $coach['username'], $coach['password'], $coach['name']]);
        }
        echo "- Kredensial pelatih berhasil disalin ke tabel 'users'.\n";
    }

    // 4. Drop username and password columns from coaches & add FK referencing users
    if (in_array('username', $coachesColumns) || in_array('password', $coachesColumns)) {
        // Drop foreign keys that might reference coaches (to prevent lockups during modifications, though not needed for dropping columns)
        
        $dropQuery = "ALTER TABLE coaches";
        $drops = [];
        if (in_array('username', $coachesColumns)) {
            $drops[] = "DROP COLUMN username";
        }
        if (in_array('password', $coachesColumns)) {
            $drops[] = "DROP COLUMN password";
        }
        $dropQuery .= " " . implode(', ', $drops);
        $pdo->exec($dropQuery);
        echo "- Kolom 'username' dan 'password' berhasil dihapus dari tabel 'coaches'.\n";
    }

    // 5. Add Foreign Key relation coaches.id -> users.id if not already present
    // Check if constraint exists
    $fkCheck = $pdo->query("
        SELECT CONSTRAINT_NAME 
        FROM information_schema.REFERENTIAL_CONSTRAINTS 
        WHERE CONSTRAINT_SCHEMA = '$dbName' 
          AND TABLE_NAME = 'coaches' 
          AND REFERENCED_TABLE_NAME = 'users'
    ")->fetch();

    if (!$fkCheck) {
        $pdo->exec("ALTER TABLE coaches ADD CONSTRAINT fk_coaches_users FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;");
        echo "- Constraint Foreign Key 'fk_coaches_users' berhasil ditambahkan ke tabel 'coaches'.\n";
    }

    // 6. Safely drop admins table
    if ($adminsTableExists) {
        $pdo->exec("DROP TABLE IF EXISTS admins;");
        echo "- Tabel 'admins' lama berhasil dihapus.\n";
    }

    echo "Migrasi Selesai dengan Sukses!\n";
} catch (\Exception $e) {
    die("Error saat melakukan migrasi: " . $e->getMessage() . "\n");
}
