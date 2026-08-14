<?php
/**
 * Database migration script to transition pricing packages:
 * 1. Creates `pricing_packages` table.
 * 2. Creates `coach_pricing_packages` junction table.
 * 3. Migrates settings pricing_packages JSON into the new relational tables.
 * 4. Removes the `pricing_packages` key from `site_settings`.
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

echo "Memulai migrasi paket harga...\n";

try {
    // 1. Create pricing_packages table
    $pdo->exec("CREATE TABLE IF NOT EXISTS pricing_packages (
        id VARCHAR(50) PRIMARY KEY,
        category ENUM('PROMO', 'REGULER', 'PRIVATE') NOT NULL,
        name VARCHAR(100) NOT NULL,
        price INT NOT NULL,
        sessions INT NOT NULL,
        active_period VARCHAR(50) NOT NULL,
        max_students INT NOT NULL DEFAULT 6,
        description TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    echo "- Tabel 'pricing_packages' berhasil dibuat.\n";

    // 2. Create coach_pricing_packages junction table
    $pdo->exec("CREATE TABLE IF NOT EXISTS coach_pricing_packages (
        coach_id VARCHAR(50) NOT NULL,
        pricing_package_id VARCHAR(50) NOT NULL,
        PRIMARY KEY (coach_id, pricing_package_id),
        FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE,
        FOREIGN KEY (pricing_package_id) REFERENCES pricing_packages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    echo "- Tabel 'coach_pricing_packages' berhasil dibuat.\n";

    // 3. Migrate settings pricing_packages JSON
    $stmt = $pdo->prepare("SELECT value_text FROM site_settings WHERE key_name = 'pricing_packages'");
    $stmt->execute();
    $settingsRow = $stmt->fetch();

    if ($settingsRow) {
        $jsonStr = $settingsRow['value_text'];
        $packages = json_decode($jsonStr, true);

        if (is_array($packages)) {
            foreach ($packages as $pkg) {
                // Insert into pricing_packages
                $insertPkg = $pdo->prepare("INSERT INTO pricing_packages (id, category, name, price, sessions, active_period, max_students, description) 
                    VALUES (:id, :category, :name, :price, :sessions, :active_period, :max_students, :description)
                    ON DUPLICATE KEY UPDATE 
                        category = :category2,
                        name = :name2,
                        price = :price2,
                        sessions = :sessions2,
                        active_period = :active_period2,
                        max_students = :max_students2,
                        description = :description2");

                $insertPkg->execute([
                    ':id' => $pkg['id'],
                    ':category' => $pkg['category'],
                    ':name' => $pkg['name'],
                    ':price' => $pkg['price'],
                    ':sessions' => $pkg['sessions'],
                    ':active_period' => $pkg['active_period'],
                    ':max_students' => $pkg['max_students'] ?? 6,
                    ':description' => $pkg['description'] ?? '',
                    ':category2' => $pkg['category'],
                    ':name2' => $pkg['name'],
                    ':price2' => $pkg['price'],
                    ':sessions2' => $pkg['sessions'],
                    ':active_period2' => $pkg['active_period'],
                    ':max_students2' => $pkg['max_students'] ?? 6,
                    ':description2' => $pkg['description'] ?? ''
                ]);

                // Insert coach relations
                if (isset($pkg['coachIds']) && is_array($pkg['coachIds'])) {
                    foreach ($pkg['coachIds'] as $coachId) {
                        // Check if coach exists in database first
                        $coachCheck = $pdo->prepare("SELECT id FROM coaches WHERE id = ?");
                        $coachCheck->execute([$coachId]);
                        if ($coachCheck->rowCount() > 0) {
                            $insertRelation = $pdo->prepare("INSERT IGNORE INTO coach_pricing_packages (coach_id, pricing_package_id) VALUES (?, ?)");
                            $insertRelation->execute([$coachId, $pkg['id']]);
                        }
                    }
                }
            }
            echo "- Data JSON pricing_packages berhasil dimigrasikan ke tabel relasional.\n";
        }
        
        // Delete key 'pricing_packages' from site_settings
        $pdo->exec("DELETE FROM site_settings WHERE key_name = 'pricing_packages'");
        echo "- Kolom 'pricing_packages' berhasil dihapus dari tabel 'site_settings'.\n";
    } else {
        echo "- Tidak ada data JSON pricing_packages di 'site_settings' yang perlu dimigrasikan.\n";
    }

    echo "Migrasi Selesai dengan Sukses!\n";
} catch (\Exception $e) {
    die("Error saat melakukan migrasi: " . $e->getMessage() . "\n");
}
