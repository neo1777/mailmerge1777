#!/bin/bash
clear
echo ""
echo "  mailmerge1777 — server locale"
echo "  ===================================="
echo "  Backend locale — Mac"
echo ""

cd "$(dirname "$0")"

# Verifica Node.js
if ! command -v node &> /dev/null; then
  echo "  ERRORE: Node.js non trovato."
  echo "  Installa Node.js da https://nodejs.org e riavvia questo script."
  read -p "  Premi Invio per chiudere..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "  Prima esecuzione: installazione dipendenze..."
  npm install --silent
  echo "  Installazione completata."
  echo ""
fi

export PORT=3001
echo "  Backend avviato su http://localhost:3001"
echo "  Non chiudere questa finestra durante l'utilizzo."
echo ""
npm start
