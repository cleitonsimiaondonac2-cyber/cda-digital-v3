#!/usr/bin/env bash
# Corre toda a suíte de testes do repositório CDA Digital.
#   tests/run_tests.sh
set -euo pipefail
cd "$(dirname "$0")"
RAIZ=$(cd .. && pwd)
ok=1

run() {
  echo "── $1"
  shift
  if "$@"; then echo "   ✔ passou"; else echo "   ✘ FALHOU"; ok=0; fi
  echo
}

run "Links e ficheiros (site)"        python3 "$RAIZ/tests/test_links.py"
run "Integridade do índice da IA"      python3 "$RAIZ/tests/test_indice.py"
run "Lógica da IA (sem rede)"          "$RAIZ/ia/venv/bin/python" "$RAIZ/tests/test_ia_logic.py"
run "API (testclient)"                 "$RAIZ/ia/venv/bin/python" "$RAIZ/tests/test_api.py"

echo "======================================"
if [ "$ok" = "1" ]; then echo "Suíte completa: OK"; else echo "Suíte completa: houve falhas"; fi
exit $((1 - ok))