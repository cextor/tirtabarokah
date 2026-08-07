@echo off
title Jalankan Tirta Barokah (Backend + Frontend)
echo ===================================================
echo   Menjalankan Project Tirta Barokah
echo ===================================================

:: Ensure PHP 8.3 path is used for CodeIgniter 4
set "PHP_BIN=C:\laragon\bin\php\php-8.3.28-Win32-vs16-x64\php.exe"

if not exist "%PHP_BIN%" (
    echo [!] PHP 8.3 tidak ditemukan di %PHP_BIN%, menggunakan php bawaan...
    set "PHP_BIN=php"
)

echo [1/2] Memulai Server Backend CodeIgniter (Port 8081)...
start "Backend Tirta Barokah (Port 8081)" cmd /k "cd backend && "%PHP_BIN%" spark serve --host 0.0.0.0 --port 8081"

echo [2/2] Memulai Server Frontend React (Port 3000)...
start "Frontend Tirta Barokah (Port 3000)" cmd /k "npm run dev"

echo ===================================================
echo  Aplikasi berhasil dibuka!
echo  - Frontend: http://localhost:3000
echo  - Backend:  http://localhost:8081
echo ===================================================
timeout /t 3
start http://localhost:3000
