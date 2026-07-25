<?php
/**
 * Database migration script to transition db_tirtabarokah schema:
 * 1. Creates `member_schedules` table.
 * 2. Migrates existing member schedules from columns in `members` table to the new `member_schedules` table.
 * 3. Safely drops foreign keys and columns in `members` table related to schedule.
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

echo "Memulai migrasi member schedules...\n";

try {
    // 1. Create `member_schedules` table
    $pdo->exec("CREATE TABLE IF NOT EXISTS member_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        member_id VARCHAR(50) NOT NULL,
        coach_id VARCHAR(50) NOT NULL,
        day VARCHAR(20) NOT NULL,
        time VARCHAR(10) NOT NULL,
        FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
        FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    echo "- Tabel 'member_schedules' berhasil dibuat.\n";

    // 2. Migrate existing schedule data
    $membersColumns = $pdo->query("DESCRIBE members")->fetchAll(PDO::FETCH_COLUMN);
    if (in_array('schedule_day', $membersColumns)) {
        // Read members
        $members = $pdo->query("SELECT * FROM members")->fetchAll();
        $count = 0;
        foreach ($members as $m) {
            // Sesi 1
            if (!empty($m['schedule_day']) && !empty($m['schedule_time']) && !empty($m['coach_id'])) {
                $stmt = $pdo->prepare("INSERT INTO member_schedules (member_id, coach_id, day, time) VALUES (?, ?, ?, ?)");
                $stmt->execute([$m['id'], $m['coach_id'], $m['schedule_day'], $m['schedule_time']]);
                $count++;
            }
            // Sesi 2
            if (isset($m['schedule_frequency']) && $m['schedule_frequency'] === '2x Seminggu' && !empty($m['schedule_day2']) && !empty($m['schedule_time2']) && !empty($m['coach_id'])) {
                $stmt = $pdo->prepare("INSERT INTO member_schedules (member_id, coach_id, day, time) VALUES (?, ?, ?, ?)");
                $stmt->execute([$m['id'], $m['coach_id'], $m['schedule_day2'], $m['schedule_time2']]);
                $count++;
            }
        }
        echo "- Berhasil memindahkan $count data jadwal latihan ke tabel 'member_schedules'.\n";
    }

    // 3. Drop foreign keys and columns
    // Find foreign key constraints on members.coach_id
    $fkQuery = $pdo->query("
        SELECT CONSTRAINT_NAME 
        FROM information_schema.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = '$dbName' 
          AND TABLE_NAME = 'members' 
          AND COLUMN_NAME = 'coach_id' 
          AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    $fk = $fkQuery->fetch();
    if ($fk) {
        $fkName = $fk['CONSTRAINT_NAME'];
        $pdo->exec("ALTER TABLE members DROP FOREIGN KEY $fkName;");
        echo "- Foreign Key '$fkName' pada kolom coach_id berhasil dihapus.\n";
    }

    // Drop columns from members
    $drops = [];
    if (in_array('coach_id', $membersColumns)) $drops[] = "DROP COLUMN coach_id";
    if (in_array('schedule_frequency', $membersColumns)) $drops[] = "DROP COLUMN schedule_frequency";
    if (in_array('schedule_day', $membersColumns)) $drops[] = "DROP COLUMN schedule_day";
    if (in_array('schedule_time', $membersColumns)) $drops[] = "DROP COLUMN schedule_time";
    if (in_array('schedule_day2', $membersColumns)) $drops[] = "DROP COLUMN schedule_day2";
    if (in_array('schedule_time2', $membersColumns)) $drops[] = "DROP COLUMN schedule_time2";

    if (!empty($drops)) {
        $pdo->exec("ALTER TABLE members " . implode(', ', $drops));
        echo "- Kolom jadwal lama berhasil dihapus dari tabel 'members'.\n";
    }

    echo "Migrasi Selesai dengan Sukses!\n";
} catch (\Exception $e) {
    die("Error saat melakukan migrasi: " . $e->getMessage() . "\n");
}
