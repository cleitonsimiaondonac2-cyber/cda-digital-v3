#!/usr/bin/env python3
"""Publicação de conteúdo: DB → js/dados.js + indice.json (IA).

O painel admin grava os dados canónicos na BD; a "publicação" regenera os
ficheiros estáticos que o site e o motor BM25 consomem, mantendo a
arquitectura estática (GitHub Pages) coerente com o backend.
"""
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy.orm import selectinload

from .db import Actividade, DocumentoMeta, Noticia, sessao

RAIZ = Path(__file__).resolve().parent.parent
SITE = RAIZ / "site"
JS = SITE / "js" / "dados.js"


def _slug(texto: str) -> str:
    import re
    from unicodedata import normalize
    t = normalize("NFKD", texto).encode("ascii", "ignore").decode()
    t = re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")
    return t[:60] or "item"


def _json_float(v):
    return v


def _dump(obj) -> str:
    return json.dumps(obj, ensure_ascii=False)


def _noticia_para_json(n: Noticia, activ: Actividade | None) -> dict:
    d = {
        "titulo": n.titulo,
        "categoria": n.categoria or "",
        "data": n.data or "",
        "texto": n.texto or "",
    }
    if n.imagem:
        d["imagem"] = n.imagem
    if n.resumo:
        d["resumo"] = n.resumo
    if activ:
        d["activ"] = activ.id and activ.titulo
    return d


def _actividade_para_json(a: Actividade) -> dict:
    def _lista(raw: str) -> list:
        try:
            v = json.loads(raw or "[]")
            return v if isinstance(v, list) else []
        except Exception:
            return []
    return {
        "id": (f"act-{a.id}" if a.id else _slug(a.titulo)),
        "titulo": a.titulo,
        "categoria": a.categoria or "",
        "data": a.data or "",
        "local": a.local or "",
        "descricao": a.descricao or "",
        "destaque": bool(a.destaque),
        "capas": _lista(a.capas),
        "noticia": (a.noticia.titulo if a.noticia else ""),
        "documentos": _lista(a.documentos),
    }


def _documento_para_json(d: DocumentoMeta) -> dict:
    url = d.url or f"docs/{d.ficheiro}"
    return {
        "tipo": d.tipo or "",
        "titulo": d.titulo,
        "entidade": d.entidade or "",
        "ano": d.ano,
        "ficheiro": d.ficheiro,
        "url": url,
    }


def gerar_dados_js() -> list[str]:
    """Regenera js/dados.js a partir da BD. Devolve DOCUMENTOS_ORIG para validar."""
    with sessao() as s:
        docs = s.query(DocumentoMeta).order_by(DocumentoMeta.titulo).all()
        noticias = s.query(Noticia).order_by(Noticia.data.desc()).all()
        activs = s.query(Actividade).options(selectinload(Actividade.noticia)).order_by(Actividade.data.desc()).all()
        # mapa attività → notícia relacionada
        activ_by_id = {a.id: a for a in activs}
        noti_por_activ = {}
        for a in activs:
            if a.noticia_id:
                noti_por_activ[a.noticia_id] = a

    # --- MEMBROS e ORGAOS: preservados do ficheiro atual (não geridos aqui) ---
    texto_atual = JS.read_text(encoding="utf-8")
    import re
    membros_bloco = re.search(r'"MEMBROS"\s*:\s*(\[[\s\S]*?\n\s*\])', texto_atual)
    orgaos_bloco = re.search(r'"ORGAOS"\s*:\s*(\[[\s\S]*?\n\s*\])', texto_atual)
    membros_txt = membros_bloco.group(1) if membros_bloco else "[]"
    orgaos_txt = orgaos_bloco.group(1) if orgaos_bloco else "[]"

    def _span(arr, indent="  "):
        return "\n".join(indent + _dump(o) for o in arr)

    linhas = []
    linhas.append("// Dados do portal CDA — gerados pelo backend (painel admin)")
    linhas.append("// Ficheiro gerado automaticamente em " + datetime.now().strftime("%Y-%m-%d %H:%M"))
    linhas.append("const CDA = {")

    linhas.append('"DOCUMENTOS": [')
    linhas.append(",\n".join(_span([_documento_para_json(d)]) for d in docs) if docs else "")
    linhas.append("],")
    linhas.append(f'"MEMBROS": {membros_txt},')
    linhas.append('"NOTICIAS": [')
    if noticias:
        arr = [_noticia_para_json(n, noti_por_activ.get(n.id)) for n in noticias]
        linhas.append(",\n".join(_span([o]) for o in arr))
    linhas.append("],")
    linhas.append(f'"ORGAOS": {orgaos_txt},')
    linhas.append('"ACTIVIDADES": [')
    if activs:
        arr = [_actividade_para_json(a) for a in activs]
        linhas.append(",\n".join(_span([o]) for o in arr))
    linhas.append("]")
    linhas.append("};")

    JS.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    return [d.ficheiro for d in docs]


def regenerar_indice() -> dict:
    """Corre indexar.py para reconstruir indice.json (BM25/IA)."""
    p = subprocess.run([sys.executable, str(RAIZ / "ia" / "indexar.py")],
                       capture_output=True, text=True, cwd=RAIZ)
    return {"rc": p.returncode, "saida": p.stdout.strip(), "erro": p.stderr.strip()}


def publicar() -> dict:
    ficheiros = gerar_dados_js()
    res = regenerar_indice()
    return {"documentos": len(ficheiros), "indice": res}


if __name__ == "__main__":
    from .db import criar_tabelas
    criar_tabelas()
    print(json.dumps(publicar(), ensure_ascii=False, indent=2))
