#!/usr/bin/env bash
# Daemoniza a API CDA (uvicorn) em segundo plano, desligado do terminal.
cd "$(dirname "$0")/.." || exit 1
pkill -f "[u]vicorn ia.api:app" 2>/dev/null
sleep 1
setsid nohup ./ia/venv/bin/python -m uvicorn ia.api:app \
  --host 127.0.0.1 --port 8765 \
  </dev/null >/tmp/opencode/api.log 2>&1 &
disown
# devolve controlo rapidamente sem esperar pelos FDs do servidor
exit 0
