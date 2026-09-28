#!/usr/bin/env python3
"""Fase 0 — Extração de texto dos 57 PDFs do acervo CDA.

Para cada PDF em site/docs/:
  1. pdftotext (camada de texto existente) — se devolver >= 100 chars, usa;
  2. senão, OCR com Tesseract (língua por) sobre imagens a 300 dpi.

Saída: ia/texto/{ficheiro}.txt  +  ia/ocr_relatorio.json
"""
import concurrent.futures as cf
import json
import os
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent          # .../cda
DOCS = RAIZ / "site" / "docs"
TEXTO = RAIZ / "ia" / "texto"
RELATORIO = RAIZ / "ia" / "ocr_relatorio.json"
MIN_CHARS = 100
LIMITE_TAMANHO = 4_000_000   # caracteres máximos por documento (evita artefactos)
TMP = Path("/tmp/opencode/ocr")

os.makedirs(TEXTO, exist_ok=True)
os.makedirs(TMP, exist_ok=True)


def extrai_um(nome: str) -> dict:
    pdf = DOCS / nome
    txt = TEXTO / (nome + ".txt")
    try:
        # 1. camada de texto
        r = subprocess.run(["pdftotext", "-l", "20", str(pdf), "-"],
                           capture_output=True, timeout=120)
        texto = r.stdout.decode("utf-8", errors="replace")
        if len(texto.strip()) >= MIN_CHARS:
            txt.write_text(texto[:LIMITE_TAMANHO], encoding="utf-8")
            return {"ficheiro": nome, "metodo": "pdftotext",
                    "chars": len(texto.strip()), "ok": True}
        # 2. OCR
        base = TMP / nome.replace(".pdf", "")
        subprocess.run(["pdftoppm", "-r", "300", "-png", str(pdf), str(base)],
                       capture_output=True, timeout=300)
        paginas = sorted(base.parent.glob(base.name + "*.png"))
        if not paginas:
            return {"ficheiro": nome, "metodo": "ocr", "chars": 0,
                    "ok": False, "erro": "pdftoppm sem páginas"}
        partes = []
        for p in paginas:
            r = subprocess.run(["tesseract", str(p), "stdout", "-l", "por"],
                               capture_output=True, timeout=180)
            partes.append(r.stdout.decode("utf-8", errors="replace"))
        texto = "\n".join(partes)
        for p in paginas:
            p.unlink(missing_ok=True)
        if len(texto.strip()) < 20:
            return {"ficheiro": nome, "metodo": "ocr", "chars": len(texto.strip()),
                    "ok": False, "erro": "OCR devolveu texto insuficiente"}
        txt.write_text(texto[:LIMITE_TAMANHO], encoding="utf-8")
        return {"ficheiro": nome, "metodo": "ocr",
                "chars": len(texto.strip()), "ok": True}
    except Exception as e:  # noqa: BLE001
        return {"ficheiro": nome, "metodo": "?", "chars": 0,
                "ok": False, "erro": str(e)[:200]}


def main() -> None:
    pdfs = sorted(p.name for p in DOCS.glob("*.pdf"))
    if not pdfs:
        print("Sem PDFs em", DOCS)
        sys.exit(1)
    print(f"{len(pdfs)} PDFs — paralelo em {os.cpu_count() or 2} núcleos")
    relatorio = {}
    feitos = 0
    with cf.ProcessPoolExecutor(max_workers=min(2, os.cpu_count() or 1)) as ex:
        for res in ex.map(extrai_um, pdfs):
            feitos += 1
            relatorio[res["ficheiro"]] = res
            estado = "OK" if res["ok"] else "FALHA"
            print(f"[{feitos}/{len(pdfs)}] {estado} {res['metodo']:>10} "
                  f"{res['chars']:>8} chars  {res['ficheiro']}")
    RELATORIO.write_text(json.dumps(relatorio, ensure_ascii=False, indent=2),
                         encoding="utf-8")
    ok = sum(1 for r in relatorio.values() if r["ok"])
    print(f"\nConcluído: {ok}/{len(pdfs)} OK → {TEXTO}")


if __name__ == "__main__":
    main()