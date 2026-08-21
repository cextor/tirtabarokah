<?php
/**
 * Migration script:
 * 1. Creates `package_schedules` table.
 * 2. Adds `schedule_id` and `swimming_pool_id` to `member_schedules` table.
 * 3. Migrates existing coach_schedules into package_schedules.
 * 4. Links existing member_schedules with schedule_id in package_schedules.
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
    $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    echo "Connected to database: $dbName\n";

    // 1. Create `package_schedules` table
    $pdo->exec("CREATE TABLE IF NOT EXISTS `package_schedules` (
        `id` INT AUTO_INCREMENT PRIMARY KEY,
        `pricing_package_id` VARCHAR(50) NOT NULL,
        `coach_id` VARCHAR(50) NOT NULL,
        `day` VARCHAR(20) NOT NULL,
        `time` VARCHAR(50) NOT NULL,
        `swimming_pool_id` VARCHAR(50) NOT NULL,
        `max_slots` INT NOT NULL DEFAULT 6,
        `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY `idx_pricing_pkg` (`pricing_package_id`),
        KEY `idx_coach_day_time` (`coach_id`, `day`, `time`),
        KEY `idx_pool` (`swimming_pool_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    echo "- Tabel 'package_schedules' siap.\n";

    // 2. Add `schedule_id` and `swimming_pool_id` to `member_schedules`
    $memSchedCols = $pdo->query("SHOW COLUMNS FROM `member_schedules`")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('schedule_id', $memSchedCols)) {
        $pdo->exec("ALTER TABLE `member_schedules` ADD COLUMN `schedule_id` INT NULL AFTER `member_id`");
        echo "- Kolom 'schedule_id' berhasil ditambahkan ke `member_schedules`.\n";
    } else {
        echo "- Kolom 'schedule_id' sudah ada di `member_schedules`.\n";
    }

    if (!in_array('swimming_pool_id', $memSchedCols)) {
        $pdo->exec("ALTER TABLE `member_schedules` ADD COLUMN `swimming_pool_id` VARCHAR(50) NULL AFTER `time`");
        echo "- Kolom 'swimming_pool_id' berhasil ditambahkan ke `member_schedules`.\n";
    } else {
        echo "- Kolom 'swimming_pool_id' sudah ada di `member_schedules`.\n";
    }

    // 3. Migrate existing `coach_schedules` to `package_schedules` if package_schedules is empty
    $countExisting = (int)$pdo->query("SELECT COUNT(*) FROM `package_schedules`")->fetchColumn();
    if ($countExisting === 0) {
        // Fetch existing coach schedules
        $coachSchedules = $pdo->query("SELECT * FROM `coach_schedules`")->fetchAll();
        $defaultPoolId = $pdo->query("SELECT id FROM `swimming_pools` ORDER BY id ASC LIMIT 1")->fetchColumn() ?: 'pool-54735';
        $defaultPkgId = $pdo->query("SELECT id FROM `pricing_packages` ORDER BY id ASC LIMIT 1")->fetchColumn() ?: 'pkg-reguler-1';

        $insertStmt = $pdo->prepare("INSERT INTO `package_schedules` 
            (pricing_package_id, coach_id, day, time, swimming_pool_id, max_slots, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())");

        $migrated = 0;
        foreach ($coachSchedules as $cs) {
            $poolId = !empty($cs['swimming_pool_id']) ? $cs['swimming_pool_id'] : $defaultPoolId;
            $pkgId = !empty($cs['pricing_package_id']) ? $cs['pricing_package_id'] : $defaultPkgId;
            $maxSlots = !empty($cs['max_slots']) ? (int)$cs['max_slots'] : 6;

            // Check if package has max_students
            $pkgMax = $pdo->query("SELECT max_students FROM `pricing_packages` WHERE id = " . $pdo->quote($pkgId))->fetchColumn();
            if ($pkgMax) {
                $maxSlots = (int)$pkgMax;
            }

            $insertStmt->execute([
                $pkgId,
                $cs['coach_id'],
                $cs['day'],
                $cs['time'],
                $poolId,
                $maxSlots
            ]);
            $migrated++;
        }
        echo "- Berhasil memigrasikan $migrated jadwal dari `coach_schedules` ke `package_schedules`.\n";
    } else {
        echo "- Tabel `package_schedules` sudah memiliki $countExisting data jadwal.\n";
    }

    // 4. Update schedule_id in `member_schedules`
    $pdo->exec("UPDATE `member_schedules` ms
        JOIN `package_schedules` ps ON ms.coach_id = ps.coach_id AND ms.day = ps.day AND ms.time = ps.time
        SET ms.schedule_id = ps.id, ms.swimming_pool_id = ps.swimming_pool_id
        WHERE ms.schedule_id IS NULL");
    echo "- Sinkronisasi `schedule_id` pada `member_schedules` selesai.\n";

    echo "MIGRASI BERHASIL!\n";

} catch (Exception $e) {
    echo "ERROR MIGRASI: " . $e->getMessage() . "\n";
    exit(1);
}
