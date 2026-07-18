<?php
header('Content-Type: application/json');

$response = [
    'copy_status' => 'pending',
    'db_status' => 'pending',
    'git_status' => 'pending',
    'errors' => []
];

// ==================== 1. COPY FRAMEWORK FILES ====================
$source = "C:/laragon/www/framework-4.6.3";
$dest = "C:/laragon/www/tirtabarokah/backend";

function copy_recursive($src, $dst) {
    if (!file_exists($src)) {
        return false;
    }
    if (!file_exists($dst)) {
        mkdir($dst, 0777, true);
    }
    $dir = opendir($src);
    while (false !== ($file = readdir($dir))) {
        if (($file != '.') && ($file != '..')) {
            $srcFile = $src . '/' . $file;
            $destFile = $dst . '/' . $file;
            if (is_dir($srcFile)) {
                // Avoid copying app settings completely to prevent overwriting custom config
                if ($file === 'app' || $file === 'env' || $file == '.env') {
                    copy_app_selective($srcFile, $destFile);
                } else {
                    copy_recursive($srcFile, $destFile);
                }
            } else {
                if (!file_exists($destFile)) {
                    copy($srcFile, $destFile);
                }
            }
        }
    }
    closedir($dir);
    return true;
}

function copy_app_selective($src, $dst) {
    if (!file_exists($dst)) {
        mkdir($dst, 0777, true);
    }
    $dir = opendir($src);
    while (false !== ($file = readdir($dir))) {
        if (($file != '.') && ($file != '..')) {
            $srcFile = $src . '/' . $file;
            $destFile = $dst . '/' . $file;
            if (is_dir($srcFile)) {
                copy_app_selective($srcFile, $destFile);
            } else {
                // Do not overwrite files that exist (e.g. ApiController, Routes, Cors, Filters, .env)
                if (!file_exists($destFile)) {
                    copy($srcFile, $destFile);
                }
            }
        }
    }
    closedir($dir);
}

try {
    if (copy_recursive($source, $dest)) {
        $response['copy_status'] = 'success';
    } else {
        $response['copy_status'] = 'failed';
        $response['errors'][] = 'Source framework path not found.';
    }
} catch (Exception $e) {
    $response['copy_status'] = 'failed';
    $response['errors'][] = 'Copy error: ' . $e->getMessage();
}

// ==================== 2. DATABASE SETUP ====================
try {
    $pdo = new PDO("mysql:host=localhost", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create database (recreate for clean setup)
    $pdo->exec("DROP DATABASE IF EXISTS db_tirtabarokah;");
    $pdo->exec("CREATE DATABASE db_tirtabarokah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
    $pdo->exec("USE db_tirtabarokah;");
    
    // Read and run sql script
    $sqlPath = $dest . '/db_schema.sql';
    if (file_exists($sqlPath)) {
        $sql = file_get_contents($sqlPath);
        
        // Remove comments
        $sql = preg_replace('/--.*$/m', '', $sql);
        // Split by semicolon (approximate, works for simple schemas)
        $queries = explode(';', $sql);
        
        foreach ($queries as $query) {
            $query = trim($query);
            if (!empty($query)) {
                $pdo->exec($query);
            }
        }
        $response['db_status'] = 'success';
    } else {
        $response['db_status'] = 'failed';
        $response['errors'][] = 'db_schema.sql not found at ' . $sqlPath;
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $response['db_status'] = 'failed';
    $response['errors'][] = 'Database error: ' . $e->getMessage();
}

// ==================== 3. GIT STATUS & PUSH ====================
try {
    // Run git commands via shell exec
    // Change directory to root and run commands
    $gitOutput = [];
    $cwd = "C:\\laragon\\www\\tirtabarokah";
    
    // Stage everything
    exec("cd /d $cwd && git add . 2>&1", $gitOutput, $code);
    
    // Commit
    $commitMsg = "chore: automate backend file setup and database creation";
    exec("cd /d $cwd && git commit -m \"$commitMsg\" 2>&1", $gitOutput, $code);
    
    // Push
    exec("cd /d $cwd && git push origin main 2>&1", $gitOutput, $code);
    
    $response['git_status'] = 'executed';
    $response['git_output'] = $gitOutput;
    $response['git_code'] = $code;
} catch (Exception $e) {
    $response['git_status'] = 'failed';
    $response['errors'][] = 'Git error: ' . $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);
