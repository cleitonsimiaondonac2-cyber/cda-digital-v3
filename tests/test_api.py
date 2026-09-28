#!/usr/bin/env python3
"""Testes básicos da API do Assistente CDA (usam TestClient, sem servidor à parte).

Corre dentro do venv da IA (depende de fastapi + httpx + snowballstemmer):
    ia/venv/bin/python tests/test_api.py
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402
from ia import api  # noqa: E402

client = TestClient(api.app)
falhas = 0


def check(nome, cond):
    global falhas
    print(("  [OK] " if cond else "  [FALHA] ") + nome)
    if not cond:
        falhas += 1


def main():
    print("==> API CDA — testes básicos")

    r = client.get("/health")
    check("GET /health → 200", r.status_code == 200 and r.json().get("status") == "ok")

    r = client.post("/ia/perguntar", json={"pergunta": ""})
    check("pergunta vazia → 422 (validação)", r.status_code == 422)

    r = client.post("/ia/perguntar", json={"pergunta": "qual a morada da CDA?"})
    check("pergunta válida → 200", r.status_code == 200)
    if r.status_code == 200:
        d = r.json()
        check("tem 'resposta'", bool(d.get("resposta")))
        check("tem 'modo'", d.get("modo") in ("rag", "local", "sem-resultados"))
        check("tem 'fontes' (lista)", isinstance(d.get("fontes"), list))

    r = client.get("/ia/pesquisar", params={"q": "circulares", "k": 1000})
    check("GET /ia/pesquisar com k gigante → clampa a 20", r.status_code == 200
          and len(r.json().get("resultados", [])) <= 20)

    # validação de histórico (papel inválido é ignorado, não quebra)
    r = client.post("/ia/perguntar", json={
        "pergunta": "olá",
        "historico": [{"papel": "user", "conteudo": "oi"}]})
    check("histórico aceite → 200", r.status_code == 200)

    print(f"\nResultado: {falhas} falhas")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
