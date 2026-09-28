#!/usr/bin/env bash
# Arranca o Assistente CDA (API) na porta 8765.
# NOTA: utiliza o módulo `ia.api` (a partir da raiz do projeto), porque api.py
# usa imports relativos (from .db, .auth, .admin, …).
cd "$(dirname "$0")/.."
exec ./ia/venv/bin/python -m uvicorn ia.api:app --host 127.0.0.1 --port 8765 "$@"
