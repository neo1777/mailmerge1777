@echo off
title mailmerge1777 — Server Rete Locale
color 0B
echo.
echo  mailmerge1777 — server locale
echo  ====================================
echo  Modalita: RETE AZIENDALE
echo  Tutti i PC della rete potranno usare l'app
echo.

cd /d "%~dp0"

if not exist node_modules (
  echo  Prima esecuzione: installazione dipendenze...
  npm install --silent
  echo  Installazione completata.
  echo.
)

echo  Build frontend in corso...
call npm run build

echo.
echo  Rilevamento IP della macchina...

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
  set IP=%%a
  goto :found
)
:found
set IP=%IP: =%

echo.
echo  ============================================
echo  Server avviato!
echo.
echo  Da QUESTO PC:   http://localhost:3001
echo  Da altri PC:    http://%IP%:3001
echo.
echo  Condividi "Da altri PC" con i colleghi.
echo  NON chiudere questa finestra.
echo  ============================================
echo.

set NODE_ENV=production
set PORT=3001
npm start
