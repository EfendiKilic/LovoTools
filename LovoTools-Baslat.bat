@echo off
title LovoTools Yerel Sunucu
cd /d "%~dp0"

echo.
echo  LovoTools baslatiliyor...
echo  Site su adreste acilacak: http://localhost:8130
echo.
echo  Kapatmak icin bu pencereyi kapatabilirsin.
echo.

start "" "http://localhost:8130"
npx -y http-server LovoToolsProject -p 8130 -c-1

pause
