#!/usr/bin/env python3
"""Seed — importa o acervo atual (js/dados.js) para a BD do painel admin.

Idempotente: só cria registos que ainda não existam.
Corre:  ./ia/venv/bin/python -m ia.seed   (a partir da raiz do projeto)
"""
import json
import re
import sys
from pathlib import Path

from .db import Actividade, DocumentoMeta, Noticia, criar_tabelas, sessao

RAIZ = Path(__file__).resolve().parent.parent
JS = RAIZ / "site" / "js" / "dados.js"


def _bloco(txt: str, nome: str):
    start = txt.find(f'"%s"' % nome)
    if start == -1:
        raise SystemExit(f"Não encontrei {nome} em dados.js")
    open_i = txt.find("[", start)
    if open_i == -1:
        raise SystemExit(f"Sem array em {nome}")
    depth = 0
    in_str = False
    esc = False
    for i in range(open_i, len(txt)):
        c = txt[i]
        if esc:
            esc = False
            continue
        if c == "\\":
            esc = True
            continue
        if c == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                bloco = txt[open_i:i + 1]
                return json.loads(bloco)
    raise SystemExit(f"Array não fechado em {nome}")


def main() -> None:
    criar_tabelas()
    txt = JS.read_text(encoding="utf-8")

    with sessao() as s:
        # --- documentos ---
        n = 0
        for d in _bloco(txt, "DOCUMENTOS"):
            if s.query(DocumentoMeta).filter(DocumentoMeta.ficheiro == d["ficheiro"]).first():
                continue
            s.add(DocumentoMeta(ficheiro=d["ficheiro"], titulo=d["titulo"],
                                tipo=d.get("tipo", ""), entidade=d.get("entidade", ""),
                                ano=d.get("ano"), categoria=d.get("categoria", ""),
                                status=d.get("status", "vigente"), url=d.get("url", "")))
            n += 1

        # --- factos inst. → nenhum; só notícias ---
        n_not = 0
        for x in _bloco(txt, "NOTICIAS"):
            if s.query(Noticia).filter(Noticia.titulo == x["titulo"]).first():
                continue
            s.add(Noticia(titulo=x["titulo"], categoria=x.get("categoria", ""),
                          data=x.get("data", ""), resumo=x.get("resumo", ""),
                          texto=x.get("texto", ""), imagem=x.get("imagem", "")))
            n_not += 1

        # --- actividades ---
        n_act = 0
        for x in _bloco(txt, "ACTIVIDADES"):
            if s.query(Actividade).filter(Actividade.titulo == x["titulo"]).first():
                continue
            s.add(Actividade(titulo=x["titulo"], categoria=x.get("categoria", ""),
                             data=x.get("data", ""), local=x.get("local", ""),
                             descricao=x.get("descricao", ""), destaque=bool(x.get("destaque")),
                             capas=json.dumps(x.get("capas", [])),
                             documentos=json.dumps(x.get("documentos", []))))
            n_act += 1

        s.commit()
        print(f"Seed: +{n} documentos, +{n_not} notícias, +{n_act} actividades")


if __name__ == "__main__":
    main()
