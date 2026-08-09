@echo off
title Manuskrip - Buka Akses HP
REM Minta izin administrator (UAC) secara otomatis
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Meminta izin administrator...
  powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

cd /d "%~dp0"

echo ============================================================
echo   Manuskrip - Mengizinkan akses dari HP
echo ============================================================
echo.

REM Izinkan port 5530 di firewall
netsh advfirewall firewall delete rule name="Manuskrip 5530" >nul 2>&1
netsh advfirewall firewall add rule name="Manuskrip 5530" dir=in action=allow protocol=TCP localport=5530

echo.
echo Alamat untuk dibuka di HP (harus satu Wi-Fi dengan komputer ini):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  echo    Portal  : http://%%a:5530
  echo    Redaksi : http://%%a:5530/admin.html
)
echo.
echo Menjalankan server... (biarkan jendela ini terbuka selama dipakai)
echo Tekan Ctrl+C untuk berhenti.
echo.

node server.js

pause
