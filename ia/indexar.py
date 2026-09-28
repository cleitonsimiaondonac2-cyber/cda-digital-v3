#!/usr/bin/env python3
"""Fase 1 — Índice de texto (chunking + BM25) do portal CDA.

Fontes de conhecimento:
  1. Documentos oficiais (js/dados.js + ia/texto/*.txt) — tipo original;
  2. Páginas do site (HTML) — tipo "Institucional";
  3. Notícias e órgãos sociais (js/dados.js) — tipo "Notícia" / "Institucional".

Saída → ia/indice.json (usado pela API do Assistente CDA).
"""
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

from bs4 import BeautifulSoup
from snowballstemmer import PortugueseStemmer

RAIZ = Path(__file__).resolve().parent.parent
SITE = RAIZ / "site"
JS = SITE / "js" / "dados.js"
TEXTO = RAIZ / "ia" / "texto"
SAIDA = RAIZ / "ia" / "indice.json"

CHUNK_TAM = 700
CHUNK_OVER = 120
STEM = PortugueseStemmer()
PAGINAS = ["index.html", "instituicao.html", "despachantes.html", "documentacao.html",
           "noticias.html", "galeria.html", "parceiros.html", "area-membro.html",
           "contactos.html"]
CLASSES_EXCLUIDAS = {
    "topbar", "nav", "header", "footer", "lightbox", "ia-painel", "filtros",
    "doc-list", "doc-destaque", "news-home", "news-lista", "galeria",
    "tabela-wrap", "login-box", "dash", "busca", "breadcrumb", "hero-search",
    "hero-side", "menu-btn", "ia-aviso", "conteudo-dinamico", "estatisticas",
}


def normaliza(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[áàâãä]", "a", s)
    s = re.sub(r"[éèêë]", "e", s)
    s = re.sub(r"[íìîï]", "i", s)
    s = re.sub(r"[óòôõö]", "o", s)
    s = re.sub(r"[úùûü]", "u", s)
    s = re.sub(r"[ç]", "c", s)
    s = re.sub(r"[\u0300-\u036f]", "", s)
    return s


def stem_frase(frase: str) -> list[str]:
    return STEM.stemWords(normaliza(frase).split())


def carrega_metadados() -> dict[str, dict]:
    """Mapeia ficheiro → metadados do documento (do js/dados.js)."""
    texto = JS.read_text(encoding="utf-8")
    m = re.search(r'"DOCUMENTOS"\s*:\s*(\[.*?\n\])', texto, re.S)
    if not m:
        sys.exit("Não encontrei CDA.DOCUMENTOS em dados.js")
    docs = json.loads(m.group(1))
    return {d["ficheiro"]: d for d in docs}


def chunk_texto(texto: str) -> list[str]:
    texto = re.sub(r"\s+", " ", texto).strip()
    if len(texto) <= CHUNK_TAM:
        return [texto] if texto else []
    partes = []
    i = 0
    while i < len(texto):
        fatia = texto[i:i + CHUNK_TAM]
        corte = max(fatia.rfind(". "), fatia.rfind("; "), fatia.rfind(", "),
                    CHUNK_TAM // 2)
        partes.append(fatia[:corte].strip())
        i += corte - CHUNK_OVER
    return [p for p in partes if len(p) > 40]


def texto_pagina(pagina: str) -> str:
    """Texto principal de uma página (sem nav/footer/script e zonas dinâmicas)."""
    soup = BeautifulSoup((SITE / pagina).read_text(encoding="utf-8"), "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer", "iframe",
                     "svg", "button", "input", "select", "textarea", "form"]):
        tag.decompose()
    alvo = [el for el in soup.find_all(class_=True)
            if set(el.get("class", [])) & CLASSES_EXCLUIDAS]
    for el in alvo:
        el.decompose()
    body = soup.body or soup
    return re.sub(r"\s+", " ", body.get_text(" ", strip=True))


def extrai_noticias() -> list[dict]:
    texto = JS.read_text(encoding="utf-8")
    m = re.search(r'"NOTICIAS"\s*:\s*(\[.*?\n\])', texto, re.S)
    if not m:
        return []
    noticias = json.loads(m.group(1))
    res = []
    for i, n in enumerate(noticias, start=1):
        if not n.get("texto"):
            continue
        ano = int(n.get("data", "")[:4] or 0)
        res.append({
            "ficheiro": "noticias.html",
            "titulo": n["titulo"],
            "tipo": "Notícia",
            "entidade": "CDA",
            "ano": ano,
            "url": "noticias.html",
            "n": i,
            "texto": n.get("texto", "")[:CHUNK_TAM],
            "termos": stem_frase(n.get("texto", "")[:CHUNK_TAM] + " " + n["titulo"]
                                 + " notícia cda " + str(ano)),
        })
    return res


def extrai_orgaos() -> list[dict]:
    texto = JS.read_text(encoding="utf-8")
    m = re.search(r'"ORGAOS"\s*:\s*(\[.*?\n\])', texto, re.S)
    if not m:
        return []
    orgaos = json.loads(m.group(1))
    lista = "Órgãos sociais da CDA (Triénio 2024–2026): " + "; ".join(
        f"{o['orgao']} — {o['cargo']}: {o['nome']}" for o in orgaos)
    return [{
        "ficheiro": "instituicao.html",
        "titulo": "Órgãos sociais da CDA",
        "tipo": "Institucional",
        "entidade": "CDA",
        "ano": 2024,
        "url": "instituicao.html#orgaos",
        "n": 1,
        "texto": lista,
        "termos": stem_frase(lista + " órgãos sociais cda 2024"),
    }]


def extrai_factos() -> list[dict]:
    """Factos institucionais (contactos, morada, órgãos, história) — fonte fiável."""
    origem = RAIZ / "ia" / "factos_institucionais.txt"
    texto = origem.read_text(encoding="utf-8")
    return [{
        "ficheiro": "instituicao.html",
        "titulo": "Factos institucionais da CDA",
        "tipo": "Institucional",
        "entidade": "CDA",
        "ano": None,
        "url": "instituicao.html#quem-somos",
        "n": 1,
        "texto": texto,
        "termos": stem_frase(texto),
    }]


def main() -> None:
    metas = carrega_metadados()
    docs = []
    sem_texto = []
    for ficheiro, meta in metas.items():
        origem = TEXTO / (ficheiro + ".txt")
        if not origem.exists():
            sem_texto.append(ficheiro)
            continue
        texto = origem.read_text(encoding="utf-8", errors="replace")
        for n, chunk in enumerate(chunk_texto(texto), start=1):
            docs.append({
                "ficheiro": ficheiro,
                "titulo": meta["titulo"],
                "tipo": meta["tipo"],
                "entidade": meta["entidade"],
                "ano": meta["ano"],
                "url": meta["url"],
                "n": n,
                "texto": chunk,
                "termos": stem_frase(chunk + " " + meta["titulo"] + " "
                                     + meta["tipo"] + " " + meta["entidade"]
                                     + " " + str(meta["ano"])),
            })
    # Páginas do site
    for pagina in PAGINAS:
        texto = texto_pagina(pagina)
        for n, chunk in enumerate(chunk_texto(texto), start=1):
            docs.append({
                "ficheiro": pagina,
                "titulo": "Página: " + pagina.replace(".html", "").capitalize(),
                "tipo": "Institucional",
                "entidade": "CDA",
                "ano": None,
                "url": pagina,
                "n": n,
                "texto": chunk,
                "termos": stem_frase(chunk + " " + pagina + " institucional"),
            })
    # Notícias, órgãos e factos institucionais
    docs += extrai_noticias()
    docs += extrai_orgaos()
    docs += extrai_factos()

    # --- BM25 ---
    N = len(docs)
    df = Counter()
    for d in docs:
        df.update(set(d["termos"]))
    media_len = sum(len(d["termos"]) for d in docs) / max(N, 1)
    k1, b = 1.5, 0.75
    indice = []
    for d in docs:
        dl = len(d["termos"])
        pesos = {}
        for termo, freq in Counter(d["termos"]).items():
            nq = df[termo]
            idf = math.log(1 + (N - nq + 0.5) / (nq + 0.5))
            pesos[termo] = idf * (freq * (k1 + 1)) / (freq + k1 * (1 - b + b * dl / media_len))
        indice.append({k: v for k, v in d.items() if k != "termos"} | {"pesos": pesos})
    payload = {"docs": indice, "parametros": {"k1": k1, "b": b, "chunk": CHUNK_TAM},
               "total_chunks": len(indice), "docs_sem_texto": sem_texto}
    SAIDA.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"Índice: {len(indice)} chunks (docs + páginas + notícias) → {SAIDA}")
    print(f"Sem texto no índice: {len(sem_texto)} → {sem_texto[:6]}")


if __name__ == "__main__":
    main()