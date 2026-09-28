# CDA Digital 2.0

Portal digital + assistente de IA (RAG) da Câmara dos Despachantes Aduaneiros de Moçambique (CDA).

Fases: frontend institucional, centro documental (57 documentos), notícias, galeria, membros, área de membro (demonstração) e **Assistente CDA** — resposta fundamentada em documentos oficiais via OCR → indexação BM25 → RAG (Ollama Cloud), com fallback offline honesto.

Publicação GitHub Pages: <https://cleitonsimiaondonac2-cyber.github.io/cda-digital/>

---

## 🏗 Arquitectura (3 camadas)

```
site/   → frontend estático (fonte de verdade)  — servido local em :8000
ia/     → backend FastAPI (OCR, indexação, RAG) — API em :8765
docs/   → pasta de deploy GitHub Pages (gerada por build.sh)
```

Fluxo de conteúdo:

```
PDF ──► OCR (ia/ocr.py) ──► texto/ ──► indexação (ia/indexar.py) ──► indice.json ──► API ──► Assistente (widget em site/)
```

> `docs/` é gerado por `./build.sh` a partir de `site/`. Nunca edite `docs/` directamente.

---

## 🚀 Começar (máquina limpa)

```bash
./setup.sh            # instala deps + OCR + índice
./setup.sh api        # ... e arranca a API
```

Antes do `setup`: coloque os PDFs do acervo em `site/docs/*.pdf` e edite `ia/.env` depois (copiado do exemplo) para preencher `IA_API_KEY`.

Servir o site localmente:

```bash
python3 -m http.server 8000 --directory site
```

API em `http://127.0.0.1:8765`:
- `GET /health` — estado público (ok)
- `POST /ia/perguntar` `{pergunta, ficheiro?, historico?}` — resposta + fontes (RAG ou fallback local)
- `GET /ia/pesquisar?q=` — top-k de extratos (sem LLM)
- `GET /ia/documento?f=&q=` — pesquisa restrita a um documento
- `GET /ia/status` — métricas (protegido se `IA_STATUS_TOKEN` definido)

Autenticação e administração (`ia/auth.py`, `ia/admin.py`, sessão por cookie, senhas em PBKDF2):
- `POST /api/auth/registar` · `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me`
- `POST /api/contacto` · `GET /api/status`
- `GET/POST/PUT/DELETE /api/admin/documentos[/{id}]` · `POST /api/admin/documentos/upload`
- `GET/POST/PUT/DELETE /api/admin/noticias[/{id}]` · `GET/POST/PUT/DELETE /api/admin/actividades[/{id}]`
- `GET /api/admin/mensagens` · `POST /api/admin/mensagens/{id}/ler` · `DELETE /api/admin/mensagens/{id}`
- `GET /api/admin/membros` · `POST /api/admin/membros/{id}/toggle`
- `GET /api/admin/galeria` · `POST /api/admin/publicar`

> A conta de administrador é criada no arranque a partir de `ADMIN_EMAIL` + `ADMIN_SENHA`
> (ver `ia/.env.example`). Sem `ADMIN_SENHA` não existe nenhum administrador.

---

## ⚠️ Notas de produção (antes de entregar à CDA)

1. **IA pública:** o GitHub Pages serve só o site estático. Em produção a API tem de estar atrás de um reverse proxy (Nginx/Caddy/Cloudflare) em domínio próprio (ex.: `api.cda-mz.org` ou `/api/ia` no mesmo domínio) e o CORS alargado via `IA_ORIGINS`.
2. **Deploy determinístico:** manter `site/` como fonte; rodar `./build.sh` e publicar `docs/`.
3. **Dados privados:** contactos da instituição → *factos_institucionais.txt* (curados). Dados de membros → confirmar com a CDA quais campos são públicos.
4. **Segurança:** `ia/.env` nunca é versionado. Definir `IA_STATUS_TOKEN` e `IA_PROXY_HEADER` em produção (rate limiting já ativo).
5. **Área de membro e formulário de contacto:** o registo/login de membro (`/api/auth/registar`, `/api/auth/login`) e o formulário de contacto (`POST /api/contacto`) são **reais** — gravam na BD. Os cartões de serviço da área do membro (emitir carteira, regularizar quota, novo requerimento) são **demonstrativos**, com `alert()` a indicar "Em produção". Como a API não está em produção, nenhuma destas rotas funciona no site público.

---

## ✅ Checklist de entrega — RELEASE 1.0

| Item | Estado |
|---|---|
| Homepage | CONCLUÍDO (conteúdo estático, sem depender de JS) |
| Instituição | CONCLUÍDO |
| Órgãos sociais | CONCLUÍDO |
| Delegações | PARCIAL (visual a melhorar — mapa) |
| Despachantes | CONCLUÍDO (verificar referências jurídicas com a CDA) |
| Lista de membros | PARCIAL (rever privacidade de campos) |
| Centro documental | PARCIAL (falta gestão/CMS) |
| Pesquisa | PARCIAL (lexical+BM25; evolução: híbrida) |
| OCR | CONCLUÍDO (5 PDFs corrompidos fora do acervo) |
| IA (RAG + fallback honesto) | CONCLUÍDO |
| Notícias | PARCIAL (homepage estática; falta CMS) |
| Galeria | CONCLUÍDO |
| Contactos | PARCIAL (formulário é real — `POST /api/contacto` grava na BD — mas a API não está em produção) |
| Área de membro | PARCIAL (registo/login reais via `/api/auth/*`; os cartões de serviço são demonstrativos) |
| Login/Autenticação | CONCLUÍDO no código (PBKDF2 + sessão por cookie, `ia/auth.py`) — falta a API em produção |
| Administração | CONCLUÍDO no código (29 rotas em `ia/admin.py`: documentos, notícias, actividades, membros, mensagens, galeria, publicação) — falta a API em produção |
| Segurança | PARCIAL (rate limiting, PBKDF2, anti-abuso implementados; falta HTTPS/reverse proxy e pôr a API em produção) |
| SEO | PARCIAL |
| Mobile/Responsivo | CONCLUÍDO |
| Backup | FALTA |
| Deploy | PARCIAL (estático OK; falta API/proxy em produção) |
| Testes | PARCIAL (tests/ básicos) |
| Documentação | PARCIAL |

### Estado — SEO e build (2026-09-26)

- **`build.sh` corrigido**: usa `rsync --inplace`. Sem isto, o rsync criava ficheiros temporários
  `.<nome>.XXXXXX` e falhava com `File name too long` (código 23) nos PDFs de nome longo, porque
  `/home` está em ecryptfs (limite de 143 bytes por nome). O script abortava a meio.
- **SEO**: criados `site/sitemap.xml` (14 URLs, XML válido) e `site/robots.txt`; Open Graph
  (`og:title`, `og:description`, `og:type`, `og:url`, `og:image`) e Twitter Card em todas as 15
  páginas; `admin.html` com `meta description` e `noindex` (e excluído do sitemap);
  cartão de partilha `site/img/og-cda.png` (1200×630).

### Estado — build de hardening (fase anterior)

- **Fix P0**: `site/` é a única fonte; `docs/` gerado por `build.sh` (elimina divergência). 
- **API**: rate limiting (20/60s, overridable), `/health` público, `/ia/status` protegível por token, `k` limitado a 20, validação de `pergunta`/`histórico`.
- **Fallback honesto**: o modo local indica claramente "sem modelo de linguagem" na resposta e na UI (`.assist-status`); timeout de 30 s.
- **Bootstrap**: `setup.sh`, `ia/requirements.txt`, `ia/.env.example`, `README.md`.
- **Testes**: `tests/test_links.py`, `tests/test_indice.py`, `tests/test_api.py`.

> ⚠️ **Contexto da auditoria**: a alegação de que OCR/indexador apontam para pasta errada era falsa — `site/` é a fonte de desenvolvimento e `docs/` a de deploy; ambas existem e a divergência é resolvida por `build.sh`. A referência jurídica "Decreto 16/2011 (Estatuto)" **está correta** (verificado por OCR do PDF); "Diploma Ministerial 16/2012" é um documento distinto (Regulamento do Desembaraço Aduaneiro).

---

## 🧪 Testes

```bash
tests/run_tests.sh        # corre toda a suíte (links, índice, lógica IA, API)
```

Suíte:
- `tests/test_links.py` — valida links/âncoras de todas as páginas e existencia de PDFs.
- `tests/test_indice.py` — integridade do `indice.json` (chunks × PDFs).
- `tests/test_ia_logic.py` — normalização, busca, fallback honesto e prompt (sem rede).
- `tests/test_api.py` — smoke da API via TestClient (health, validação, rate-limit, clamp).

## 📄 Documentos

- `01-auditoria-cda.{md,pdf}` — auditoria do site antigo
- `02-proposta-portal-cda.{md,pdf}` — proposta (referência histórica)
- `03-resumo-apresentacao.{md,pdf}` — resumo de apresentação
- `04-ia-retrieval.md` — relatório da fase IA/assistente
