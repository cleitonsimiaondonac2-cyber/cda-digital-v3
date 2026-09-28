#!/usr/bin/env bash
# Bootstrap do repositório CDA Digital — instala dependências, corre OCR, indexa e (opcionalmente) arranca a API.
# Uso:
#   ./setup.sh            # instala + OCR + índice
#   ./setup.sh --skip-ocr # apenas dependências + índice (usa texto/ existente)
#   ./setup.sh api        # instala + OCR + índice e arranca a API
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Verificando ferramentas de sistema (pdftotext, tesseract)..."
for cmd in pdftotext pdftoppm tesseract; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "  [!] '$cmd' não encontrado. Instale (Debian/Ubuntu):"
    echo "      sudo apt install poppler-utils tesseract-ocr tesseract-ocr-por"
  fi
done

echo "==> Ambiente Python (ia/venv)..."
if [ ! -d ia/venv ]; then
  python3 -m venv ia/venv
fi
./ia/venv/bin/pip install --quiet --upgrade pip
./ia/venv/bin/pip install --quiet -r ia/requirements.txt

echo "==> Configuração .env..."
if [ ! -f ia/.env ]; then
  cp ia/.env.example ia/.env
  echo "  Criado ia/.env a partir do exemplo. Preencha IA_API_KEY para ativar o RAG."
fi

if [ "${1:-}" = "--skip-ocr" ] || [ -d ia/texto ] && [ "$(ls ia/texto/*.txt 2>/dev/null | wc -l)" -gt 0 ]; then
  echo "==> A usar texto/ existente (skip OCR)."
else
  echo "==> OCR (P0: precisa de site/docs/*.pdf)..."
  ./ia/venv/bin/python ia/ocr.py
fi

echo "==> Indexação (ia/indice.json)..."
./ia/venv/bin/python ia/indexar.py

echo "==> Pronto. Índice: $(python3 -c "import json;print(json.load(open('ia/indice.json'))['total_chunks'])" 2>/dev/null || echo '?') chunks."

if [ "${1:-}" = "api" ]; then
  echo "==> A arrancar API em http://127.0.0.1:8765 ..."
  exec ./ia/run.sh
fi
