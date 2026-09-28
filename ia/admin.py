#!/usr/bin/env python3
"""Fase 3 — Backend CDA: autenticação, contacto e painel admin.

Rotas montadas no app principal (api.py) sob /api/* e /admin/*.
O painel admin gerido aqui grava na BD e "publica" para js/dados.js + indice.json.
"""
import json
import os
import re
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from . import auth
from .db import Actividade, ContactoMsg, DocumentoMeta, Membro, Noticia, criar_tabelas, sessao as _sessao
from .publicar import gerar_dados_js, regenerar_indice

RAIZ = Path(__file__).resolve().parent.parent
SITE = RAIZ / "site"
DOCS_DIR = SITE / "docs"
GALERIA_DIR = SITE / "galeria"

router = APIRouter(prefix="")

# ---------------------------------------------------------------- helpers ---

def get_db():
    db = _sessao()
    try:
        yield db
    finally:
        db.close()


def admin_obrigatorio(request: Request, db: Session = Depends(get_db)) -> Membro:
    m = auth.obter_membro(request, db)
    if not m or not m.is_admin or not m.ativo:
        raise HTTPException(401, "não autorizado (sessão de administrador necessária)")
    return m


def membro_obrigatorio(request: Request, db: Session = Depends(get_db)) -> Membro:
    m = auth.obter_membro(request, db)
    if not m or not m.ativo:
        raise HTTPException(401, "sessão inválida")
    return m


def _parse_int(v) -> int | None:
    try:
        return int(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _real_path(p: Path) -> Path:
    return p.resolve()


# ----------------------------------------------------------- saúde / status -

@router.get("/api/status")
def status_pub() -> dict:
    return {"servico": "CDA Digital — Backend", "versao": "2.0",
            "autenticacao": True, "admin": True, "contacto": True}


# ------------------------------------------------------------- autenticação -

class RegistoIn(BaseModel):
    nome: str = Field(min_length=2, max_length=160)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=128)
    telefone: str = Field(default="", max_length=40)
    entidade: str = Field(default="", max_length=160)


class LoginIn(BaseModel):
    email: str = Field(min_length=1, max_length=200)
    senha: str = Field(min_length=1, max_length=128)


@router.post("/api/auth/registar")
def registar(r: RegistoIn, request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    if not re.match(r"^[a-zA-ZÀ-ÿ' .-]+$", r.nome):
        raise HTTPException(400, "nome inválido")
    if db.query(Membro).filter(Membro.email == r.email.lower().strip()).first():
        raise HTTPException(409, "já existe uma conta com este email")
    db.add(Membro(
        nome=r.nome.strip(), email=r.email.lower().strip(),
        hash_senha=auth.gerar_hash_senha(r.senha),
        telefone=r.telefone.strip(), entidade=r.entidade.strip(),
    ))
    db.commit()
    return JSONResponse({"ok": True, "mensagem": "conta criada. Já pode iniciar sessão."})


@router.post("/api/auth/login")
def login(l: LoginIn, request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    m = db.query(Membro).filter(Membro.email == l.email.lower().strip()).first()
    if not m or not auth.verificar_senha(l.senha, m.hash_senha):
        raise HTTPException(401, "email ou senha incorrectos")
    if not m.ativo:
        raise HTTPException(403, "conta desactivada")
    token = auth.criar_token(m.id)
    m.ultimo_login = datetime.now()
    db.commit()
    resp = JSONResponse({"ok": True, "nome": m.nome, "is_admin": m.is_admin})
    resp.set_cookie("cda_sessao", token, httponly=True, samesite="lax",
                    max_age=auth.TOKEN_VALIDADE, secure=os.getenv("COOKIE_SECURE", "0") == "1")
    return resp


@router.post("/api/auth/logout")
def logout() -> JSONResponse:
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("cda_sessao")
    return resp


@router.get("/api/auth/me")
def me(request: Request, db: Session = Depends(get_db)) -> dict:
    m = auth.obter_membro(request, db)
    if not m:
        raise HTTPException(401, "sem sessão")
    return {"nome": m.nome, "email": m.email, "is_admin": m.is_admin,
            "telefone": m.telefone, "entidade": m.entidade,
            "ultimo_login": m.ultimo_login.isoformat() if m.ultimo_login else None}


# --------------------------------------------------------- formulário contacto

class ContactoIn(BaseModel):
    nome: str = Field(min_length=2, max_length=160)
    email: EmailStr
    assunto: str = Field(default="", max_length=200)
    mensagem: str = Field(min_length=5, max_length=4000)


@router.post("/api/contacto")
def contacto(c: ContactoIn, request: Request, db: Session = Depends(get_db)) -> JSONResponse:
    db.add(ContactoMsg(nome=c.nome.strip(), email=c.email.lower().strip(),
                       assunto=c.assunto.strip(), mensagem=c.mensagem.strip(),
                       ip=request.client.host if request.client else ""))
    db.commit()
    return JSONResponse({"ok": True, "mensagem": "Mensagem enviada. A CDA responderá em breve."})


# ------------------------------------------------------------------ painel admin
# ------------------------------------------------ documentos

@router.get("/api/admin/documentos")
def admin_docs(_: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    docs = db.query(DocumentoMeta).order_by(DocumentoMeta.titulo).all()
    return {"documentos": [{
        "id": d.id, "ficheiro": d.ficheiro, "titulo": d.titulo, "tipo": d.tipo,
        "entidade": d.entidade, "ano": d.ano, "categoria": d.categoria,
        "status": d.status, "url": d.url,
    } for d in docs]}


@router.get("/api/admin/documentos/{doc_id}")
def ver_doc(doc_id: int, _: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    d = db.get(DocumentoMeta, doc_id) or _raise404("documento")
    return {"id": d.id, "ficheiro": d.ficheiro, "titulo": d.titulo, "tipo": d.tipo,
            "entidade": d.entidade, "ano": d.ano, "categoria": d.categoria,
            "status": d.status, "url": d.url}


@router.post("/api/admin/documentos")
def criar_doc(_: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db),
              ficheiro: str = Form(...), titulo: str = Form(...),
              tipo: str = Form(""), entidade: str = Form(""), ano: str = Form(""),
              categoria: str = Form(""), status: str = Form("vigente")) -> dict:
    ficheiro = ficheiro.strip()
    if not ficheiro or not titulo.strip():
        raise HTTPException(400, "ficheiro e título são obrigatórios")
    if db.query(DocumentoMeta).filter(DocumentoMeta.ficheiro == ficheiro).first():
        raise HTTPException(409, "já existe um documento com este ficheiro")
    d = DocumentoMeta(ficheiro=ficheiro, titulo=titulo.strip(), tipo=tipo.strip(),
                      entidade=entidade.strip(), ano=_parse_int(ano),
                      categoria=categoria.strip(), status=status.strip(),
                      url=f"docs/{ficheiro}")
    db.add(d)
    db.commit()
    return {"ok": True, "id": d.id}


@router.put("/api/admin/documentos/{doc_id}")
def editar_doc(doc_id: int, _: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db),
               ficheiro: str = Form(...), titulo: str = Form(...),
               tipo: str = Form(""), entidade: str = Form(""), ano: str = Form(""),
               categoria: str = Form(""), status: str = Form("vigente")) -> dict:
    d = db.get(DocumentoMeta, doc_id) or _raise404("documento")
    d.ficheiro = ficheiro.strip()
    d.titulo = titulo.strip()
    d.tipo = tipo.strip()
    d.entidade = entidade.strip()
    d.ano = _parse_int(ano)
    d.categoria = categoria.strip()
    d.status = status.strip()
    d.url = f"docs/{d.ficheiro}"
    db.commit()
    return {"ok": True}


@router.delete("/api/admin/documentos/{doc_id}")
def apagar_doc(doc_id: int, _: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    d = db.get(DocumentoMeta, doc_id) or _raise404("documento")
    db.delete(d)
    db.commit()
    return {"ok": True}


# --------------------------------------------------------- upload de PDF + OCR

@router.post("/api/admin/documentos/upload")
async def upload_doc(_: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db),
                     ficheiro: UploadFile = File(...), titulo: str = Form(""),
                     tipo: str = Form(""), entidade: str = Form(""),
                     ano: str = Form(""), categoria: str = Form(""),
                     status: str = Form("vigente")) -> dict:
    nome = ficheiro.filename or ""
    if not nome.lower().endswith(".pdf"):
        raise HTTPException(400, "apenas PDF")
    nome_limpo = re.sub(r"[^A-Za-z0-9._-]+", "-", nome)
    destino = _real_path(DOCS_DIR / nome_limpo)
    if destino.parent != _real_path(DOCS_DIR):
        raise HTTPException(400, "nome de ficheiro inválido")
    conteudo = await ficheiro.read()
    if len(conteudo) > 30 * 1024 * 1024:
        raise HTTPException(413, "ficheiro demasiado grande (máx 30 MB)")
    destino.write_bytes(conteudo)

    # regista metadados na BD
    if not db.query(DocumentoMeta).filter(DocumentoMeta.ficheiro == nome_limpo).first():
        db.add(DocumentoMeta(ficheiro=nome_limpo,
                             titulo=titulo.strip() or nome_limpo[:-4],
                             tipo=tipo.strip(), entidade=entidade.strip(),
                             ano=_parse_int(ano), categoria=categoria.strip(),
                             status=status.strip(), url=f"docs/{nome_limpo}"))
        db.commit()

    # pipeline OCR + índice
    from . import ocr
    res = ocr.extrai_um(nome_limpo)
    idx = regenerar_indice()
    return {"ok": True, "ficheiro": nome_limpo, "ocr": res, "indice_rc": idx["rc"]}


# --------------------------------------------------------------------- notícias

class NoticiaIn(BaseModel):
    titulo: str = Field(min_length=2, max_length=300)
    categoria: str = Field(default="", max_length=80)
    data: str = Field(default="", max_length=20)
    resumo: str = Field(default="", max_length=2000)
    texto: str = Field(default="", max_length=20000)
    imagem: str = Field(default="", max_length=300)
    publicada: bool = True


@router.get("/api/admin/noticias")
def admin_noticias(_: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    ns = db.query(Noticia).order_by(Noticia.data.desc(), Noticia.id.desc()).all()
    return {"noticias": [{"id": n.id, "titulo": n.titulo, "categoria": n.categoria,
                          "data": n.data, "publicada": n.publicada} for n in ns]}


@router.post("/api/admin/noticias")
def criar_noticia(p: NoticiaIn, _: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    n = Noticia(**p.dict())
    db.add(n)
    db.commit()
    return {"ok": True, "id": n.id}


@router.get("/api/admin/noticias/{noticia_id}")
def ver_noticia(noticia_id: int, _: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    n = db.get(Noticia, noticia_id) or _raise404("notícia")
    return {"id": n.id, "titulo": n.titulo, "categoria": n.categoria, "data": n.data,
            "resumo": n.resumo, "texto": n.texto, "imagem": n.imagem, "publicada": n.publicada}


@router.put("/api/admin/noticias/{noticia_id}")
def editar_noticia(noticia_id: int, p: NoticiaIn, _: Membro = Depends(admin_obrigatorio),
                   db: Session = Depends(get_db)) -> dict:
    n = db.get(Noticia, noticia_id) or _raise404("notícia")
    for k, v in p.dict().items():
        setattr(n, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/api/admin/noticias/{noticia_id}")
def apagar_noticia(noticia_id: int, _: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    n = db.get(Noticia, noticia_id) or _raise404("notícia")
    db.delete(n)
    db.commit()
    return {"ok": True}


# ----------------------------------------------------------------- actividades

class ActividadeIn(BaseModel):
    titulo: str = Field(min_length=2, max_length=300)
    categoria: str = Field(default="", max_length=80)
    data: str = Field(default="", max_length=20)
    local: str = Field(default="", max_length=160)
    descricao: str = Field(default="", max_length=8000)
    destaque: bool = False
    capas: list[str] = []
    documentos: list[str] = []
    noticia_id: int | None = None


@router.get("/api/admin/actividades")
def admin_actividades(_: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    as_ = db.query(Actividade).order_by(Actividade.data.desc()).all()
    return {"actividades": [{"id": a.id, "titulo": a.titulo, "categoria": a.categoria,
                             "data": a.data, "local": a.local, "destaque": a.destaque} for a in as_]}


@router.post("/api/admin/actividades")
def criar_actividade(p: ActividadeIn, _: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    a = Actividade(titulo=p.titulo, categoria=p.categoria, data=p.data, local=p.local,
                   descricao=p.descricao, destaque=p.destaque,
                   capas=json.dumps(p.capas), documentos=json.dumps(p.documentos),
                   noticia_id=p.noticia_id)
    db.add(a)
    db.commit()
    return {"ok": True, "id": a.id}


@router.get("/api/admin/actividades/{act_id}")
def ver_actividade(act_id: int, _: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    a = db.get(Actividade, act_id) or _raise404("actividade")
    return {"id": a.id, "titulo": a.titulo, "categoria": a.categoria, "data": a.data,
            "local": a.local, "descricao": a.descricao, "destaque": a.destaque,
            "capas": json.loads(a.capas or "[]"), "documentos": json.loads(a.documentos or "[]"),
            "noticia_id": a.noticia_id}


@router.put("/api/admin/actividades/{act_id}")
def editar_actividade(act_id: int, p: ActividadeIn, _: Membro = Depends(admin_obrigatorio),
                      db: Session = Depends(get_db)) -> dict:
    a = db.get(Actividade, act_id) or _raise404("actividade")
    for k, v in p.dict().items():
        if k == "capas":
            v = json.dumps(v)
        elif k == "documentos":
            v = json.dumps(v)
        setattr(a, k, v)
    db.commit()
    return {"ok": True}


@router.delete("/api/admin/actividades/{act_id}")
def apagar_actividade(act_id: int, _: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    a = db.get(Actividade, act_id) or _raise404("actividade")
    db.delete(a)
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------- caixa contacto

@router.get("/api/admin/mensagens")
def admin_mensagens(_: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    msgs = db.query(ContactoMsg).order_by(ContactoMsg.criado_em.desc()).all()
    return {"mensagens": [{"id": m.id, "nome": m.nome, "email": m.email, "assunto": m.assunto,
                           "mensagem": m.mensagem, "lida": m.lida,
                           "criado_em": m.criado_em.strftime("%Y-%m-%d %H:%M") if m.criado_em else ""} for m in msgs]}


@router.post("/api/admin/mensagens/{msg_id}/ler")
def marcar_lida(msg_id: int, _: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    m = db.get(ContactoMsg, msg_id) or _raise404("mensagem")
    m.lida = True
    db.commit()
    return {"ok": True}


@router.delete("/api/admin/mensagens/{msg_id}")
def apagar_msg(msg_id: int, _: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    m = db.get(ContactoMsg, msg_id) or _raise404("mensagem")
    db.delete(m)
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------- membros

@router.get("/api/admin/membros")
def admin_membros(_: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    ms = db.query(Membro).order_by(Membro.nome).all()
    return {"membros": [{"id": m.id, "nome": m.nome, "email": m.email,
                         "telefone": m.telefone, "is_admin": m.is_admin, "ativo": m.ativo} for m in ms]}


@router.post("/api/admin/membros/{membro_id}/toggle")
def toggle_membro(membro_id: int, _: Membro = Depends(admin_obrigatorio), db: Session = Depends(get_db)) -> dict:
    m = db.get(Membro, membro_id) or _raise404("membro")
    if m.id == _.id:
        raise HTTPException(400, "não pode desactivar a própria conta")
    m.ativo = not m.ativo
    db.commit()
    return {"ok": True, "ativo": m.ativo}


# ---------------------------------------------------------------- publicação

@router.post("/api/admin/publicar")
def publicar(_: Membro = Depends(admin_obrigatorio)) -> dict:
    ficheiros = gerar_dados_js()
    idx = regenerar_indice()
    return {"ok": True, "documentos": len(ficheiros), "indice_rc": idx["rc"]}


# ----------------------------------------------------------------- galeria/lists

@router.get("/api/admin/galeria")
def admin_galeria(_: Membro = Depends(admin_obrigatorio)) -> dict:
    imgs = sorted(p.name for p in GALERIA_DIR.glob("*") if p.suffix.lower() in (".jpg", ".png", ".jpeg", ".webp"))
    return {"imagens": imgs}


def _raise404(tipo: str):
    raise HTTPException(404, f"{tipo} não encontrado")
