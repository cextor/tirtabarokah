<?php
/**
 * Migration script to add 'operator' role and default operator user.
 */

$host = '127.0.0.1';
$db   = 'db_tirtabarokah';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "Connected to database successfully.\n";

    // 1. Ensure `role` column in `users` table allows 'operator'
    $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'coach', 'operator') NOT NULL DEFAULT 'admin'");
    echo "- Column 'role' in 'users' updated to support ('admin', 'coach', 'operator').\n";

    // 2. Check if default 'operator' account exists
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = 'operator'");
    $stmt->execute();
    $existing = $stmt->fetch();

    if (!$existing) {
        $hashedPass = password_hash('operator123', PASSWORD_BCRYPT);
        $insertStmt = $pdo->prepare("INSERT INTO users (id, username, password, name, role) VALUES ('user-operator', 'operator', ?, 'Operator Tirta Barokah', 'operator')");
        $insertStmt->execute([$hashedPass]);
        echo "- Account 'operator' created successfully with password 'operator123'.\n";
    } else {
        // Ensure role is set to 'operator'
        $updateStmt = $pdo->prepare("UPDATE users SET role = 'operator' WHERE username = 'operator'");
        $updateStmt->execute();
        echo "- Account 'operator' exists and role updated to 'operator'.\n";
    }

    echo "Migration completed successfully!\n";
} catch (PDOException $e) {
    echo "Migration error: " . $e->getMessage() . "\n";
    exit(1);
}
