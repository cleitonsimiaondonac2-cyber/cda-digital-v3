#!/usr/bin/env python3
"""Verificação de integridade de links e ficheiros do site CDA Digital.

Executa:
  1. href/src de todos os site/*.html → ficheiro existe?
  2. href '#...' → âncora existe na própria página?
  3. todos os PDFs declarados em js/dados.js → existem em site/docs?
  4. PDFs existentes em site/docs sem correspondência em dados.js (aviso)
"""
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SITE = RAIZ / "site"
DOCS_DIR = SITE / "docs"

FALHAS = 0
AVISOS = 0


class Colector(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []   # href
        self.fontes = []  # src

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "a" and d.get("href"):
            self.links.append(d["href"])
        if tag in ("script", "img", "link", "source") and d.get("src"):
            self.fontes.append(d["src"])


def fail(msg):
    global FALHAS
    FALHAS += 1
    print(f"  [FALHA] {msg}")


def aviso(msg):
    global AVISOS
    AVISOS += 1
    print(f"  [aviso] {msg}")


def verifica_html():
    for html in sorted(SITE.glob("*.html")):
        parser = Colector()
        try:
            parser.feed(html.read_text(encoding="utf-8"))
        except Exception as e:
            fail(f"{html.name}: não pôde ser lido ({e})")
            continue
        ancoras = set(re.findall(r'id="([^"]+)"', html.read_text(encoding="utf-8")))
        for ref in parser.links + parser.fontes:
            if not ref or ref.startswith(("http:", "https:", "mailto:", "tel:", "javascript:", "data:", "about:")):
                continue
            if ref.startswith("#"):
                alvo = ref[1:]
                if alvo and alvo not in ancoras:
                    fail(f"{html.name}: âncora #{alvo} não existe na página")
                continue
            caminho = ref.split("#")[0].split("?")[0]
            alvo = (html.parent / caminho).resolve()
            if not alvo.exists():
                # pode ser gerado por JS — reporta apenas como aviso
                aviso(f"{html.name}: não encontrou '{caminho}' (pode ser dinâmico)")


def verifica_pdfs():
    dados = SITE / "js" / "dados.js"
    if not dados.exists():
        fail("js/dados.js não existe")
        return
    texto = dados.read_text(encoding="utf-8")
    m = re.search(r'"DOCUMENTOS"\s*:\s*(\[.*?\n\])', texto, re.S)
    if not m:
        fail("não conseguiu extrair DOCUMENTOS de dados.js")
        return
    try:
        docs = json.loads(m.group(1))
    except Exception as e:
        fail(f"DOCUMENTOS de dados.js inválido: {e}")
        return

    existe = {p.name for p in DOCS_DIR.glob("*.pdf")}
    for d in docs:
        f = d.get("ficheiro") or Path(d.get("url", "")).name
        if f not in existe:
            fail(f"doc '{d.get('titulo')}': ficheiro '{f}' não existe em site/docs/")
    # órfãos
    declarados = {d.get("ficheiro") or Path(d.get("url", "")).name for d in docs}
    for nome in sorted(existe - declarados):
        aviso(f"PDF '{nome}' existe mas não está declarado em dados.js")


def main():
    paginas = sorted(SITE.glob("*.html"))
    print(f"==> Verificar links HTML ({len(paginas)} páginas)")
    verifica_html()
    print(f"==> Verificar PDFs (dados.js ↔ site/docs) em {DOCS_DIR}")
    verifica_pdfs()
    print(f"\nResultado: {FALHAS} falhas, {AVISOS} avisos")
    sys.exit(1 if FALHAS else 0)


if __name__ == "__main__":
    main()
