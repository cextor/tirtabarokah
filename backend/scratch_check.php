<?php
try {
    $pdo = new PDO('mysql:host=127.0.0.1;dbname=db_tirtabarokah', 'root', '');
    $tables = ['coaches', 'members', 'events', 'settings', 'pricing_packages', 'users', 'coach_schedules', 'member_schedules'];
    foreach ($tables as $t) {
        try {
            $cnt = $pdo->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
            echo "$t: $cnt\n";
        } catch (Exception $e) {
            echo "$t: Error (" . $e->getMessage() . ")\n";
        }
    }
} catch (Exception $e) {
    echo "Connection error: " . $e->getMessage() . "\n";
}
