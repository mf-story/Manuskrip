@echo off
title Manuskrip - Server Portal Berita
cd /d "%~dp0"
echo ============================================================
echo   MANUSKRIP - Portal Berita
echo ============================================================
echo.
echo   Portal  : http://localhost:5530
echo   Redaksi : http://localhost:5530/admin.html
echo.
echo   Login default: admin / admin123
echo.
echo   Biarkan jendela ini terbuka selama website dipakai.
echo   Tekan Ctrl+C untuk menghentikan server.
echo ============================================================
echo.
node server.js
pause
