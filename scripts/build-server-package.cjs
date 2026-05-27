// scripts/build-server-package.js
// Eseguito durante npm run build per generare il pacchetto server statico

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const OUTPUT_PATH = path.join(__dirname, '../public/mailmerge-server.zip');

// File e cartelle da includere nel pacchetto server
const INCLUDE = [
  'server.ts',
  'tsconfig.json',
  'config.json',
  'src/backend',
  'src/types/index.ts',
];

// package.json semplificato solo con le dipendenze backend
const BACKEND_PACKAGE = {
  name: 'mailmerge1777-server',
  version: '1.0.0',
  description: 'mailmerge1777 — Server locale',
  main: 'server.ts',
  scripts: {
    start: 'tsx server.ts'
  },
  dependencies: {
    'express': '^4.21.2',
    'cors': '^2.8.6',
    'multer': '^2.1.1',
    'exceljs': '^4.4.0',
    'pdf-lib': '^1.17.1',
    'nodemailer': '^8.0.7',
    'archiver': '^7.0.1',
    'csv-parse': '^6.2.1',
    'check-disk-space': '^3.4.0',
    'tsx': '^4.21.0'
  }
};

const README_TXT = `mailmerge1777 — Server locale
===============================
by neo1777

ISTRUZIONI
----------

1. Installare Node.js da https://nodejs.org (versione LTS)
   Seguire il programma di installazione come qualsiasi altro programma.

2. Estrarre questa cartella in un posto comodo (es. Documenti)
   IMPORTANTE: non avviare gli script dall'interno del file ZIP.

3. Avviare il server con doppio clic:
   - Windows : start.bat (doppio clic)
   - Mac     : start-mac.sh  (poi apri terminale -> chmod +x start-mac.sh -> ./start-mac.sh)
   - Linux   : start-linux.sh (poi apri terminale -> chmod +x start-linux.sh -> ./start-linux.sh)

4. Tenere aperta la finestra nera durante tutto l'utilizzo dell'app.

5. Aprire l'app nel browser: https://neo1777.github.io/mailmerge1777
   La barra in cima diventerà verde quando il server è attivo.

NOTA: la prima volta l'installazione richiede qualche minuto.
Le volte successive il server si avvia in pochi secondi.
`;

const START_BAT = `@echo off
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
`;

const START_MAC = `#!/bin/bash
clear
echo ""
echo "  mailmerge1777 — server locale"
echo "  ===================================="
echo ""

cd "$(dirname "$0")"

if ! command -v node &> /dev/null; then
  echo "  ERRORE: Node.js non trovato."
  echo "  Installare Node.js da https://nodejs.org"
  read -p "  Premi Invio per chiudere..."
  exit 1
fi

if [ ! -f package.json ]; then
  echo "  ERRORE: file package.json non trovato."
  echo "  Assicurarsi di aver estratto il file ZIP."
  read -p "  Premi Invio per chiudere..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  Prima esecuzione: installazione dipendenze..."
  npm install --no-optional
  echo "  Installazione completata."
  echo ""
fi

export PORT=3001
export NODE_ENV=production
echo "  Server avviato su http://localhost:3001"
echo "  Non chiudere questa finestra durante l'utilizzo."
echo ""
npm start
`;

const START_LINUX = `#!/bin/bash
clear
echo ""
echo "  mailmerge1777 — server locale"
echo "  ===================================="
echo ""

cd "$(dirname "$0")"

if ! command -v node &> /dev/null; then
  echo "  ERRORE: Node.js non trovato."
  echo "  Installare con il proprio package manager:"
  echo "    Ubuntu/Debian: sudo apt install nodejs npm"
  echo "    Fedora:        sudo dnf install nodejs"
  exit 1
fi

[ ! -d node_modules ] && npm install --no-optional

export PORT=3001
export NODE_ENV=production
echo "  Server avviato su http://localhost:3001"
echo "  Non chiudere questa finestra durante l'utilizzo."
echo ""
npm start
`;

async function buildPackage() {
  console.log('Building server package...');

  const output = fs.createWriteStream(OUTPUT_PATH);
  const archive = archiver('zip', { zlib: { level: 6 } });

  output.on('close', () => console.log(`Server package built: ${archive.pointer()} bytes`));
  archive.on('error', err => { throw err; });
  archive.pipe(output);

  // README
  archive.append(README_TXT, { name: 'mailmerge-server/README.txt' });

  // Scripts di avvio
  archive.append(START_BAT,   { name: 'mailmerge-server/start.bat' });
  archive.append(START_MAC,   { name: 'mailmerge-server/start-mac.sh' });
  archive.append(START_LINUX, { name: 'mailmerge-server/start-linux.sh' });

  // package.json semplificato
  archive.append(JSON.stringify(BACKEND_PACKAGE, null, 2), { name: 'mailmerge-server/package.json' });

  // File sorgente
  const root = path.join(__dirname, '..');
  for (const item of INCLUDE) {
    const fullPath = path.join(root, item);
    if (!fs.existsSync(fullPath)) { console.warn(`Skipping missing: ${item}`); continue; }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      archive.directory(fullPath, `mailmerge-server/${item}`);
    } else {
      archive.file(fullPath, { name: `mailmerge-server/${item}` });
    }
  }

  await archive.finalize();
}

buildPackage().catch(console.error);
