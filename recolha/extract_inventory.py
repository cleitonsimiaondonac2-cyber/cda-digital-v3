#!/usr/bin/env python3
"""Extrai inventário do site CDA a partir do HTML descarregado."""
import os
import re
import html as html_mod
from html.parser import HTMLParser
from urllib.parse import urlparse
from collections import Counter

SITE = "/home/cleiton/projetos-software/cda/recolha/site/cda-mz.org"
OUT = "/home/cleiton/projetos-software/cda/recolha/inventario"
os.makedirs(OUT, exist_ok=True)

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ""
        self._in_title = False
        self.meta_desc = ""
        self.h1 = ""
        self._in_h1 = False
        self._h1_text = []
        self.links = []
        self.words = 0
        self._text = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self._in_title = True
        elif tag == "meta" and a.get("name", "").lower() == "description":
            self.meta_desc = a.get("content", "")
        elif tag == "h1":
            self._in_h1 = True
        elif tag == "a" and a.get("href"):
            self.links.append(a["href"])

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "h1":
            self._in_h1 = False
            self.h1 = " ".join(self._h1_text).strip()
            self._h1_text = []

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif self._in_h1:
            self._h1_text.append(data)
        else:
            self._text.append(data)

    def finalize(self):
        body = " ".join(self._text)
        body = re.sub(r"<[^>]+>", " ", body)
        self.words = len([w for w in re.split(r"\s+", body) if re.match(r"[A-Za-zÀ-ÿ0-9]", w)])


def main():
    pages = []
    doc_links = []
    external = Counter()
    internal = Counter()

    for root, _dirs, files in os.walk(SITE):
        for fname in files:
            path = os.path.join(root, fname)
            if not os.path.isfile(path):
                continue
            if os.path.getsize(path) > 8 * 1024 * 1024:
                continue
            try:
                with open(path, "r", encoding="utf-8", errors="replace") as fh:
                    content = fh.read()
            except Exception:
                continue

            rel = os.path.relpath(path, SITE)
            if rel in ("robots.txt",) or not (rel.startswith("index.php") or rel == "index.html"):
                continue

            parser = PageParser()
            try:
                parser.feed(content)
                parser.finalize()
            except Exception:
                continue

            kind = "pagina"
            if "component/k2/item" in rel:
                kind = "noticia"
            elif "?download=" in rel:
                kind = "documento"

            pages.append({
                "path": rel,
                "kind": kind,
                "title": parser.title.strip(),
                "h1": parser.h1,
                "meta": parser.meta_desc.strip(),
                "words": parser.words,
            })

            for href in parser.links:
                h = href.split("#")[0]
                if h.startswith("http") and "cda-mz.org" not in h:
                    external[h] += 1
                elif "?download=" in h:
                    doc_links.append((rel.split("?")[0], h))
                elif h.startswith(("/", "http")) and "cda-mz.org" in h or h.startswith("index.php"):
                    internal[h.split("?")[0].split("#")[0]] += 1

    with open(os.path.join(OUT, "paginas.tsv"), "w", encoding="utf-8") as fh:
        fh.write("tipo\tcaminho\ttitulo\th1\tmeta_descricao\tpalavras\n")
        for p in sorted(pages, key=lambda x: x["path"]):
            fh.write("\t".join([
                p["kind"],
                p["path"],
                p["title"].replace("\t", " "),
                p["h1"].replace("\t", " "),
                p["meta"].replace("\t", " "),
                str(p["words"]),
            ]) + "\n")

    with open(os.path.join(OUT, "documentos.tsv"), "w", encoding="utf-8") as fh:
        fh.write("secção\turl_documento\n")
        for sec, url in sorted(set(doc_links)):
            fh.write(f"{sec}\t{url}\n")

    with open(os.path.join(OUT, "links_externos.tsv"), "w", encoding="utf-8") as fh:
        for url, n in sorted(external.items(), key=lambda x: -x[1]):
            fh.write(f"{n}\t{url}\n")

    with open(os.path.join(OUT, "resumo.txt"), "w", encoding="utf-8") as fh:
        fh.write(f"Total páginas analisadas: {len(pages)}\n")
        for kind in ("pagina", "noticia", "documento"):
            fh.write(f"  {kind}: {sum(1 for p in pages if p['kind'] == kind)}\n")
        fh.write(f"Total links de documentos (?download=): {len(set(doc_links))}\n")
        fh.write(f"Domínios externos distintos: {len(external)}\n")

    print(f"Páginas: {len(pages)} | Documentos: {len(set(doc_links))} | Externos: {len(external)}")


if __name__ == "__main__":
    main()
