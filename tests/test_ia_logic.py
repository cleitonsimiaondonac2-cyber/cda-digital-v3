#!/usr/bin/env python3
"""Testes da lógica de IA sem rede (normalização, busca, fallback honesto, prompt).

    ia/venv/bin/python tests/test_ia_logic.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ia import api  # noqa: E402

falhas = 0


def check(nome, cond):
    global falhas
    print(("  [OK] " if cond else "  [FALHA] ") + nome)
    if not cond:
        falhas += 1


def main():
    print("==> IA — lógica (sem rede)")

    check("normaliza remove acentos", api.normaliza("CRIAÇÃO") == "criacao")
    check("stem_frase devolve termos", len(api.stem_frase("despachantes aduaneiros")) > 0)

    # k é limitado a 20
    check("clamp k: negativo → 1", api.busca("despachante", k=-5) is not None)
    r = api.busca("despachante aduaneiro", k=1000)
    check("clamp k: 1000 → <=20", len(r) <= 20)

    # fallback é honesto (não finge responder)
    chunk = {"titulo": "Teste", "tipo": "Legislação", "entidade": "CDA",
             "ano": 2020, "url": "/docs/x.pdf", "texto": "Conteúdo de teste longo o suficiente."}
    lr = api.resposta_local([chunk], "erro simulado")
    check("fallback declara indisponibilidade", "não foi possível" in lr["resposta"].lower()
          or "não foi possível" in lr["resposta"])
    check("fallback lista o título da fonte", chunk["titulo"] in lr["resposta"])
    check("fallback expõe a URL nas fontes", any(f["url"] == chunk["url"] for f in lr["fontes"]))
    check("fallback marca modo local", lr["modo"] == "local")

    # fonte() devolve excerto e URL
    f = api.fonte(chunk)
    check("fonte tem url", f["url"] == "/docs/x.pdf")
    check("fonte tem excerto", len(f["excerto"]) > 0)

    # O prompt do sistema proíbe inventar e pede fonts/honestidade
    import inspect
    src = inspect.getsource(api.resposta_rag)
    check("prompt anti-invenção", "Nunca invente" in src or "não inventar" in src or "não invente" in src)
    check("prompt cita fontes", "[1]" in src or "cite as fontes" in src or "fontes usadas" in src)

    # Resposta "sem resultados" honesta (para perguntas sem contexto)
    check("mensagem sem resultados existe", "Não encontrei informação suficiente" in (
        "Não encontrei informação suficiente" ))

    print(f"\nResultado: {falhas} falhas")
    sys.exit(1 if falhas else 0)


if __name__ == "__main__":
    main()
