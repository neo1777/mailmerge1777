#!/bin/bash
echo "mailmerge1777 — server locale"
echo "Backend avviato su http://localhost:3001"
[ ! -d node_modules ] && npm install --silent
export PORT=3001
npm start
