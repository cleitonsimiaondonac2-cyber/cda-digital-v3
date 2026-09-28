#!/usr/bin/env python3
"""Autenticação CDA — hashing de senha (PBKDF2) e sessões assinadas (HMAC).

Sem dependências externas (stdlib) para robustez no deploy.
"""
import base64
import hashlib
import hmac
import os
import secrets
import time
from typing import Optional

from .db import Membro, sessao

_SECRET_SRC = os.getenv("AUTH_SECRET", "")
if not _SECRET_SRC:
    # Segredo persistente em ficheiro ignorado pelo git (criado na 1.ª execução).
    _sf = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".auth_secret")
    if os.path.exists(_sf):
        _SECRET_SRC = open(_sf, "r", encoding="utf-8").read().strip()
    else:
        _SECRET_SRC = secrets.token_hex(32)
        with open(_sf, "w", encoding="utf-8") as f:
            f.write(_SECRET_SRC)
        try:
            os.chmod(_sf, 0o600)
        except OSError:
            pass

_SEGUNDO = _SECRET_SRC.encode()
TOKEN_VALIDADE = int(os.getenv("AUTH_TOKEN_VALIDADE", "604800"))  # segundos (7 dias)


def _pbkdf2(senha: str, salt: bytes, iteracoes: int = 260_000) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt, iteracoes)


def gerar_hash_senha(senha: str) -> str:
    salt = os.urandom(16)
    h = _pbkdf2(senha, salt)
    return f"pbkdf2_sha256${260_000}${base64.b64encode(salt).decode()}${base64.b64encode(h).decode()}"


def verificar_senha(senha: str, armazenado: str) -> bool:
    try:
        algo, iteracoes, salt_b, hash_b = armazenado.split("$")
        if algo != "pbkdf2_sha256":
            return False
        h = _pbkdf2(senha, base64.b64decode(salt_b), int(iteracoes))
        return hmac.compare_digest(h, base64.b64decode(hash_b))
    except Exception:
        return False


def assinar_token(membro_id: int, emissao: int) -> str:
    payload = f"{membro_id}.{emissao}"
    sig = hmac.new(_SEGUNDO, payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def criar_token(membro_id: int) -> str:
    return assinar_token(membro_id, int(time.time()))


def verificar_token(token: str) -> Optional[int]:
    """Devolve membro_id se o token for válido e atual; senão None."""
    try:
        payload, sig = token.rsplit(".", 1)
        esperado = hmac.new(_SEGUNDO, payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, esperado):
            return None
        membro_id, emissao = payload.split(".")
        if time.time() - int(emissao) > TOKEN_VALIDADE:
            return None
        return int(membro_id)
    except Exception:
        return None


def obter_membro(req, db) -> Optional[Membro]:
    """Lê o token do cookie/sessão e devolve o membro, ou None."""
    token = req.cookies.get("cda_sessao") or ""
    membro_id = verificar_token(token)
    if membro_id is None:
        return None
    return db.get(Membro, membro_id)


def criar_admin(email: str, senha: str, nome: str) -> None:
    """Garante a existência de um administrador inicial (idempotente)."""
    with sessao() as s:
        if s.query(Membro).filter(Membro.email == email).first():
            return
        s.add(Membro(nome=nome, email=email,
                    hash_senha=gerar_hash_senha(senha), is_admin=True, ativo=True))
        s.commit()
