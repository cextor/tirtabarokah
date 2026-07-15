# PowerShell Script to Setup CodeIgniter 4 Backend for Tirta Barokah

$source = "C:\laragon\www\framework-4.6.3"
$dest = "C:\laragon\www\tirtabarokah\backend"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Tirta Barokah Backend Setup Assistant" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Ensure destination backend directory exists
if (!(Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest | Out-Null
}

Write-Host "[1/3] Menyalin sistem inti & folder CodeIgniter..." -ForegroundColor Yellow

# Copy files & folders from template root except app, env, and .env
Get-ChildItem -Path $source | Where-Object { $_.Name -ne "app" -and $_.Name -ne "env" -and $_.Name -ne ".env" } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $dest -Recurse -Force
}

Write-Host "[2/3] Menyalin file konfigurasi aplikasi tambahan (tanpa menimpa file kustom)..." -ForegroundColor Yellow

# Copy app files selectively without overwriting our controller, routes, cors, or filters
$appSource = Join-Path $source "app"
$appDest = Join-Path $dest "app"

# Helper recursive function to copy without overwriting
function Copy-WithoutOverwrite($srcPath, $dstPath) {
    if (!(Test-Path $dstPath)) {
        New-Item -ItemType Directory -Path $dstPath | Out-Null
    }
    
    Get-ChildItem -Path $srcPath | ForEach-Object {
        $destFile = Join-Path $dstPath $_.Name
        if ($_.PsIsContainer) {
            Copy-WithoutOverwrite $_.FullName $destFile
        } else {
            if (!(Test-Path $destFile)) {
                Copy-Item -Path $_.FullName -Destination $dstPath
            }
        }
    }
}

Copy-WithoutOverwrite $appSource $appDest

Write-Host "[3/3] Selesai menyalin berkas backend!" -ForegroundColor Green

Write-Host "`n--- Petunjuk Langkah Selanjutnya ---" -ForegroundColor Cyan
Write-Host "1. Buat database baru bernama 'tirtabarokah' di phpMyAdmin Anda."
Write-Host "2. Import file 'backend/db_schema.sql' ke database 'tirtabarokah'."
Write-Host "3. Jalankan server backend (CodeIgniter):" -ForegroundColor Yellow
Write-Host "   cd backend"
Write-Host "   php spark serve"
Write-Host "4. Jalankan frontend React di terminal terpisah:" -ForegroundColor Yellow
Write-Host "   npm run dev"
Write-Host "=========================================" -ForegroundColor Cyan
