@echo off
setlocal
title mailmerge1777 - Server locale
color 0A
echo.
echo  mailmerge1777 — server locale
echo  ====================================
echo.

cd /d "%~dp0"

rem Verifica che il file package.json esista (ZIP estratto correttamente)
if not exist package.json goto NO_PACKAGE

rem Verifica presenza di Node.js
where node >nul 2>&1
if %errorlevel% neq 0 goto NO_NODE

rem Verifica presenza di npm
where npm >nul 2>&1
if %errorlevel% neq 0 goto NO_NPM

rem Mostra versione Node.js trovata
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  Node.js trovato: %NODE_VER%
echo.

rem Controlla se e la prima esecuzione
if not exist node_modules goto INSTALL
goto START

:INSTALL
echo  Prima esecuzione: installazione dipendenze in corso...
echo  Attendere qualche minuto...
echo.
call npm install --silent
if %errorlevel% neq 0 goto INSTALL_ERROR
echo  Dipendenze installate correttamente.
echo.

:START
echo  Server avviato su http://localhost:3001
echo  Aprire l'app nel browser: https://neo1777.github.io/mailmerge1777
echo.
echo  NON chiudere questa finestra durante l'utilizzo dell'app.
echo  Per fermare il server premere Ctrl+C.
echo.
set PORT=3001
set NODE_ENV=production
call npm start
pause
goto END

:NO_PACKAGE
echo  ERRORE: file package.json non trovato.
echo.
echo  Assicurarsi di aver estratto il file ZIP completo
echo  e di eseguire questo script dalla cartella estratta,
echo  non dall'interno del file ZIP.
echo.
pause
exit /b 1

:NO_NODE
echo  Node.js non trovato sul sistema.
echo  Tentativo di installazione automatica...
echo.
where winget >nul 2>&1
if %errorlevel% neq 0 goto NO_WINGET
echo  Installazione tramite winget in corso...
winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
if %errorlevel% neq 0 goto WINGET_FAILED
echo.
echo  Node.js installato con successo.
echo.
echo  IMPORTANTE: chiudere questa finestra e riaprire start.bat
echo  Il sistema deve aggiornare le variabili d'ambiente prima
echo  di poter avviare il server.
echo.
pause
exit /b 0

:NO_WINGET
echo  winget non disponibile su questo sistema.
goto MANUAL_INSTALL

:WINGET_FAILED
echo  Installazione automatica non riuscita.

:MANUAL_INSTALL
echo.
echo  ============================================================
echo  AZIONE RICHIESTA: installare Node.js manualmente
echo.
echo  1. La pagina di download si apre automaticamente nel browser
echo  2. Scaricare la versione LTS (quella consigliata)
echo  3. Seguire il programma di installazione fino al termine
echo  4. Chiudere questa finestra e riaprire start.bat
echo  ============================================================
echo.
start https://nodejs.org/it/download
pause
exit /b 1

:NO_NPM
echo  ERRORE: npm non trovato.
echo  Reinstallare Node.js da https://nodejs.org
echo.
pause
exit /b 1

:INSTALL_ERROR
echo.
echo  ERRORE durante l'installazione delle dipendenze.
echo  Verificare la connessione internet e riprovare.
echo.
pause
exit /b 1

:END
endlocal