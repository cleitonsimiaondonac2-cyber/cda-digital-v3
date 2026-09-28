#!/usr/bin/env python3
"""Valida a integridade do índice da IA (ia/indice.json)."""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
INDICE = RAIZ / "ia" / "indice.json"
SITE_DOCS = RAIZ / "site" / "docs"

falhas = 0


def fail(msg):
    global falhas
    falhas += 1
    print(f"  [FALHA] {msg}")


def main():
    if not INDICE.exists():
        fail(f"{INDICE} não existe — corre ia/indexar.py antes")
        sys.exit(1)
    d = json.loads(INDICE.read_text(encoding="utf-8"))
    docs = d["docs"]
    print(f"==> Índice: {d['total_chunks']} chunks")

    if not docs:
        fail("índice sem chunks")
    if d["total_chunks"] != len(docs):
        fail(f"total_chunks={d['total_chunks']} ≠ len(docs)={len(docs)}")

    vazios = [c for c in docs if len(c.get("texto", "").strip()) < 20]
    if vazios:
        fail(f"{len(vazios)} chunk(s) com texto demasiado curto/em branco")

    pdfs = {p.name for p in SITE_DOCS.glob("*.pdf")}
    for c in docs:
        f = c.get("ficheiro")
        if f and f.lower().endswith(".pdf") and f not in pdfs:
            fail(f"chunk de '{f}' refere PDF não presente em site/docs/")

    print(f"\nResultado: {falhas} falhas")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
