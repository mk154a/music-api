@echo off
:loop
cd /d C:\api-musica\src
node app.js
timeout /t 1800 >nul
goto loop
