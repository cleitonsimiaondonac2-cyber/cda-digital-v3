#!/usr/bin/env python3
"""Fase 2 — API do Assistente CDA (RAG via Ollama Cloud + BM25 local).

Endpoints:
  POST /ia/perguntar  {pergunta, ficheiro?}  → resposta fundamentada + fontes
  GET  /ia/pesquisar  ?q=                     → top-k extratos (sem LLM)
  GET  /ia/documento  ?f=...&q=               → pesquisa restrita a um documento
  GET  /ia/status                             → estado do motor

A chave da API do Ollama Cloud vive APENAS no servidor (ia/.env).
"""
import json
import math
import os
import re
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from snowballstemmer import PortugueseStemmer

RAIZ = Path(__file__).resolve().parent.parent
ENV = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV)

IA_URL = os.getenv("IA_URL", "https://api.ollama.com")
IA_CHAVE = os.getenv("IA_API_KEY", "")
IA_MODELO = os.getenv("IA_MODELO", "gpt-oss:120b")
IA_TIMEOUT = float(os.getenv("IA_TIMEOUT", "120"))

INDICE = json.loads((Path(__file__).resolve().parent / "indice.json").read_text(encoding="utf-8"))
DOCS = INDICE["docs"]
K = int(os.getenv("IA_TOP_K", "5"))
SCORE_MIN = float(os.getenv("IA_SCORE_MIN", "0.15"))
STEM = PortugueseStemmer()
RE_ACENTOS = re.compile(r"[áàâãä]|[éèêë]|[íìîï]|[óòôõö]|[úùûü]|[ç]")

# ——— Protecção contra abuso ———
# Limite de pedidos por janela temporal e por IP recolhido de um proxy confiável.
# Para produção atrás de Nginx/Cloudflare, defina IA_PROXY_HEADER=CF-Connecting-IP
# (ou HTTP_X_REAL_IP) para não confiar em X-Forwarded-For directamente.
RATE_MAX = int(os.getenv("IA_RATE_MAX", "20"))          # pedidos por janela
RATE_WINDOW = int(os.getenv("IA_RATE_WINDOW", "60"))    # segundos
PROXY_HEADER = os.getenv("IA_PROXY_HEADER", "").upper() or None
STATUS_TOKEN = os.getenv("IA_STATUS_TOKEN", "")         # se vazio, /ia/status fica aberto (não recomendado)
_janeiras: dict[str, list[float]] = defaultdict(list)


def _cliente_ip(req: Request) -> str:
    if PROXY_HEADER:
        for h in (PROXY_HEADER, "HTTP_X_FORWARDED_FOR", "HTTP_X_REAL_IP"):
            v = req.headers.get(h)
            if v:
                return v.split(",")[0].strip() or "desconhecido"
    return req.client.host if req.client else "desconhecido"


def _check_rate(req: Request) -> None:
    ip = _cliente_ip(req)
    agora = time.time()
    j = _janeiras[ip]
    while j and j[0] < agora - RATE_WINDOW:
        j.pop(0)
    if len(j) >= RATE_MAX:
        raise HTTPException(429, "demasiados pedidos. Tente novamente dentro de instantes.")
    j.append(agora)

FACTOS_INSTITUCIONAIS = (
    Path(__file__).resolve().parent / "factos_institucionais.txt"
).read_text(encoding="utf-8")


def normaliza(s: str) -> str:
    s = s.lower()
    for a, b in [("áàâãä", "a"), ("éèêë", "e"), ("íìîï", "i"),
                 ("óòôõö", "o"), ("úùûü", "u")]:
        for c in a:
            s = s.replace(c, b)
    s = s.replace("ç", "c")
    return re.sub(r"[\u0300-\u036f]", "", s)


def stem_frase(frase: str) -> list[str]:
    return STEM.stemWords(normaliza(frase).split())


def busca(q: str, ficheiro: str | None = None, k: int = K) -> list[dict]:
    k = min(max(int(k), 1), 20)
    termos = [t for t in stem_frase(q) if len(t) > 1]
    if not termos:
        return []
    # Aceita 'ficheiro' com ou sem o prefixo 'docs/' (a homepage usa o prefixo,
    # enquanto outros pontos usam só o nome). Normaliza para o formato do índice.
    f_alvo = None
    if ficheiro:
        f_alvo = ficheiro.lstrip("/")
        if f_alvo.startswith("docs/"):
            f_alvo = f_alvo[len("docs/"):]
    pontuados = []
    for d in DOCS:
        if f_alvo and d["ficheiro"] != f_alvo:
            continue
        score = 0.0
        for t in set(termos):
            if t in d["pesos"]:
                score += d["pesos"][t]
        if score > 0:
            pontuados.append((score, d))
    pontuados.sort(key=lambda x: x[0], reverse=True)
    return [{"score": round(s, 4), **{kk: vv for kk, vv in d.items() if kk != "pesos"}}
            for s, d in pontuados[:k]]


def fonte(chunk: dict) -> dict:
    return {"titulo": chunk["titulo"], "tipo": chunk["tipo"],
            "entidade": chunk["entidade"], "ano": chunk.get("ano"),
            "url": chunk["url"], "excerto": chunk["texto"][:260]}


def resposta_local(chunks: list[dict], razao: str = "") -> dict:
    """Resposta por extratos (sem LLM) — usada como fallback honesto.

    Não finge responder à pergunta: apresenta os documentos relevantes e explica
    claramente que o classificador de linguagem não esteve disponível.
    """
    razao_aviso = ""
    if razao:
        razao_aviso = (" O modelo de linguagem esteve temporariamente indisponível, "
                       "pelo que a resposta foi gerada por pesquisa local.")
    if chunks:
        linhas = "\n".join(
            f"• {c['titulo']}" + (f" ({c['ano']})" if c.get("ano") else "")
            + f": \"{c['texto'][:220]}…\""
            for c in chunks)
        txt = ("Não foi possível utilizar o assistente de IA neste momento."
               + razao_aviso
               + "\n\nEnquanto isso, encontrei estes documentos oficiais relacionados, "
                 "que poderão responder à sua pergunta:\n\n" + linhas
               + "\n\nAbra as fontes abaixo para a informação completa, ou tente "
                 "novamente dentro de instantes.")
    else:
        txt = "Não foi possível utilizar o assistente de IA neste momento."
    return {"resposta": txt, "fontes": [fonte(c) for c in chunks],
            "modo": "local", "modelo": "bm25-local"}


def resposta_rag(pergunta: str, chunks: list[dict],
                 historico: list[dict] | None = None) -> dict:
    """RAG: contexto do site + documentos + LLM via Ollama Cloud."""
    contexto = "\n\n".join(
        f"[{i}] {c['titulo']} — {c['entidade']}"
        + (f", {c['ano']}" if c.get("ano") else "")
        + f" (tipo: {c['tipo']}):\n{c['texto']}"
        for i, c in enumerate(chunks, start=1))
    sistema = (
        "É o Assistente CDA, o assistente digital e atendente da Câmara dos "
        "Despachantes Aduaneiros de Moçambique (CDA). Atende visitantes do site "
        "cda-mz.org e membros, esclarecendo dúvidas sobre a Câmara, a profissão "
        "de despachante aduaneiro, procedimentos, contactos, delegações, notícias "
        "e documentos. Responda SEMPRE em português, de forma cordial e directa.\n"
        "Regras obrigatórias:\n"
        "1. Responda APENAS com base no CONTEXTO (páginas oficiais do site, "
        "factos institucionais e documentos oficiais da CDA). Nunca invente leis, "
        "datas, valores, contactos ou procedimentos.\n"
        "2. Se a informação não estiver no contexto, responda exatamente: "
        "\"Não encontrei informação suficiente no site e nos documentos oficiais "
        "disponíveis para responder com segurança.\" e sugira contactar a CDA "
        "(tel. +258 21 305 504 / 305 506) ou consultar o Centro Documental.\n"
        "3. Cite as fontes usadas com [1], [2], etc., no fim da resposta.\n"
        "4. Seja directo e conciso (máx. 4 parágrafos).\n"
        "5. Quando útil, convide a visitar a página relevante do site "
        "(ex.: 'pode consultar a página Como ser Membro') e o Centro Documental.\n\n"
        "CONTEXTO (site oficial + documentos da CDA):\n"
        + FACTOS_INSTITUCIONAIS + "\n\n" + contexto)
    messages = [{"role": "system", "content": sistema}]
    if historico:
        for h in historico[-6:]:
            if h.get("papel") in ("user", "assistant") and h.get("conteudo"):
                messages.append({"role": h["papel"], "content": h["conteudo"]})
    messages.append({"role": "user", "content": pergunta})
    payload = {
        "model": IA_MODELO,
        "messages": messages,
        "stream": False,
        "options": {"num_predict": 2048, "temperature": 0.2},
    }
    r = httpx.post(f"{IA_URL}/api/chat", headers={
        "Authorization": f"Bearer {IA_CHAVE}"}, json=payload,
        timeout=IA_TIMEOUT)
    r.raise_for_status()
    msg = r.json().get("message", {})
    resposta = (msg.get("content") or "").strip()
    if not resposta:
        raise RuntimeError("modelo devolveu resposta vazia")
    return {"resposta": resposta, "fontes": [fonte(c) for c in chunks],
            "modo": "rag", "modelo": IA_MODELO}


app = FastAPI(title="Assistente CDA — IA", version="2.0.0")
_ORIGENS_EXTRA = [o.strip() for o in os.getenv("IA_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000", "http://127.0.0.1:8000",
        "http://localhost:8765", "http://127.0.0.1:8765",
        "https://cleitonsimiaondonac2-cyber.github.io",
        *_ORIGENS_EXTRA,
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


# ——— Backend CDA (Fase 3): BD + autenticação + contacto + painel admin ———
from .admin import router as admin_router  # noqa: E402
from .auth import criar_admin  # noqa: E402
from .db import criar_tabelas  # noqa: E402

app.include_router(admin_router)

_ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@cda-mz.org")
_ADMIN_SENHA = os.getenv("ADMIN_SENHA", "")


@app.on_event("startup")
def _inicio() -> None:
    criar_tabelas()
    if _ADMIN_SENHA:
        criar_admin(_ADMIN_EMAIL, _ADMIN_SENHA, "Administrador CDA")


class Mensagem(BaseModel):
    papel: str
    conteudo: str = Field(max_length=2000)


class Pergunta(BaseModel):
    pergunta: str = Field(min_length=1, max_length=2000)
    ficheiro: str | None = None
    historico: list[Mensagem] | None = Field(default=None, max_length=20)


@app.post("/ia/perguntar")
def perguntar(p: Pergunta, req: Request) -> dict:
    _check_rate(req)
    if not p.pergunta.strip():
        raise HTTPException(400, "pergunta vazia")
    chunks = busca(p.pergunta, p.ficheiro)
    if not chunks:
        return {"resposta": "Não encontrei informação suficiente no site e nos "
                            "documentos oficiais disponíveis para responder com "
                            "segurança. Contacte a CDA (tel. +258 21 305 504 / "
                            "305 506) ou consulte o Centro Documental.",
                "fontes": [], "modo": "sem-resultados", "modelo": IA_MODELO}
    historico = [{"papel": m.papel, "conteudo": m.conteudo}
                 for m in (p.historico or []) if m.papel in ("user", "assistant")]
    if not IA_CHAVE:
        return resposta_local(chunks)
    try:
        return resposta_rag(p.pergunta, chunks, historico)
    except Exception as e:  # noqa: BLE001
        print("ERRO LLM:", e, file=sys.stderr)
        return resposta_local(chunks, razao=str(e))


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/ia/pesquisar")
def pesquisar(q: str = "", ficheiro: str | None = None, k: int = 5, req: Request = None) -> dict:
    _check_rate(req)
    return {"resultados": [fonte(c) | {"score": c["score"]} for c in busca(q, ficheiro, k)]}


@app.get("/ia/documento")
def documento(f: str, q: str, req: Request = None) -> dict:
    _check_rate(req)
    return {"resultados": [fonte(c) | {"score": c["score"]} for c in busca(q, f, 4)]}


@app.get("/ia/status")
def status(req: Request) -> dict:
    if STATUS_TOKEN:
        auth = req.headers.get("authorization", "")
        if auth != f"Bearer {STATUS_TOKEN}":
            raise HTTPException(401, "não autorizado")
    ficheiros = sorted({d["ficheiro"] for d in DOCS})
    return {"total_chunks": len(DOCS), "total_docs": len(ficheiros),
            "docs_sem_texto": INDICE.get("docs_sem_texto", []),
            "modelo": IA_MODELO, "chave_configurada": bool(IA_CHAVE),
            "chunk_tamanho": INDICE["parametros"]["chunk"]}


@app.get("/")
def raiz() -> dict:
    return {
        "servico": "CDA Digital 2.0 — Portal + API + Painel Admin",
        "site": "/index.html", "painel_admin": "/admin.html",
        "endpoints": [
            "GET /health", "POST /ia/perguntar", "GET /ia/pesquisar?q=",
            "GET /ia/documento?f=&q=", "GET /ia/status",
            "POST /api/contacto", "POST /api/auth/login", "GET /api/auth/me",
            "GET /api/admin/documentos", "GET /api/admin/noticias",
            "GET /api/admin/actividades", "GET /api/admin/membros",
            "POST /api/admin/publicar"]}


_SITE_DIR = RAIZ / "site"
if _SITE_DIR.is_dir():
    app.mount("/", StaticFiles(directory=_SITE_DIR, html=False), name="site")