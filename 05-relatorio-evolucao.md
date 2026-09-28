---
title: "CDA Digital 2.0"
subtitle: "Relatório Técnico de Desenvolvimento"
author: "Equipa de Desenvolvimento"
date: "Setembro 2026"
---

## 1. Objetivo

Este relatório documenta, de forma técnica e factual, o trabalho de desenvolvimento realizado sobre o portal da Câmara dos Despachantes Aduaneiros de Moçambique (CDA): a migração do site institucional original para a versão **CDA Digital 2.0**, incluindo frontend, backend, base de dados, autenticação, painel de gestão e assistente de IA. O objetivo é deixar registado o que foi construído, o estado atual de cada componente e o que permanece pendente.

Todas as métricas apresentadas foram verificadas diretamente no repositório, nos artefactos de entrega (testes, índices) e na execução dos testes automatizados.

---

## 2. Ponto de partida

O portal anterior era uma instalação **Joomla 3.9.1** (versão de Jan/2019) com template e componentes de terceiros (K2, PhocaDownload, galeria). A auditoria inicial (18/08/2026) identificou os seguintes pontos críticos que motivaram a reescrita:

- CMS sem atualizações de segurança desde ~2023 (versão sem suporte).
- Sem redireccionamento http->https; ausência de headers de segurança; cookies sem `Secure`/`HttpOnly`.
- Conteúdos institucionais incoerentes (páginas com texto de tradução automática).
- Arquitetura de informação defeituosa: documentos duplicados e catalogados em categorias erradas (ex.: relatórios dentro de "Regulamentos"); secções vazias.
- SEO inexistente (sem sitemap, meta descriptions duplicadas, URLs duplicadas).
- Sem funcionalidade de portal: a "Área do Membro" era apenas um login sem valor acrescentado; sem formulário de contacto, pesquisa documental ou agenda.

Apesar destas limitações, o património de conteúdo (documentos oficiais e lista de membros) era relevante e foi integralmente preservado na migração.

---

## 3. Arquitetura da nova versão

Decisão de projeto: **reescrita completa**, com arquitetura em três camadas, em vez de tentar modernizar o Joomla.

```
site/   -> frontend estático (fonte de verdade)      (HTML/CSS/JS)
ia/     -> backend FastAPI                           (BD, auth, admin, OCR, IA)
docs/   -> deploy GitHub Pages                       (gerado por build.sh)
```

Princípio arquitetural adotado: `site/` é a **única fonte de verdade**. A pasta `docs/` (produção) é gerada automaticamente por `build.sh` (rsync com `--delete`), de forma determinística, eliminando divergências entre desenvolvimento e publicação.

Fluxo de conteúdo:

```
PDF -> OCR (pdftotext + Tesseract) -> texto/ -> indexação BM25 -> indice.json
                                                                      |
Painel Admin -> Base de Dados (SQLAlchemy) -> publicar -> dados.js + indice.json
                                                                      v
                                                     Assistente CDA (IA + pesquisa)
```

### Stack

- **Frontend:** HTML5 semântico, CSS3 (variáveis, grid, media queries), JavaScript nativo (ES6), sem frameworks.
- **Backend:** Python 3, FastAPI (async) + Uvicorn.
- **Base de dados:** SQLAlchemy 2.0; SQLite em desenvolvimento, migrável para PostgreSQL via `DATABASE_URL`.
- **Autenticação:** PBKDF2-HMAC-SHA256 (260 000 iterações), tokens HMAC-SHA256, cookie HttpOnly.
- **IA:** pipeline RAG próprio: OCR -> chunking -> BM25 -> LLM (Ollama Cloud), com fallback offline.
- **Pesquisa:** índice BM25 com stemmer português (Snowball).
- **OCR:** `pdftotext` (camada de texto) + Tesseract (português, 300 dpi).
- **Deploy:** GitHub Pages (estático) + backend FastAPI self-hosted.

---

## 4. Frontend

### 4.1 Páginas

Foram entregues **11 páginas**:

`index`  -  `instituicao`  -  `despachantes`  -  `documentacao`  -  `noticias`  -  `actividades`  -  `galeria`  -  `area-membro`  -  `contactos`  -  `parceiros` + o **painel admin** (`admin.html`).

### 4.2 Redesign

- Redesenho da homepage como portal digital: hero fotográfico, pesquisa + assistente, launcher "O que procura?", centro documental pesquisável, bloco IA, actualidade editorial.
- Menu reduzido com dropdowns; tipografia sans (Manrope); mapa de delegações; cartões de documento com ação "Perguntar à CDA".
- Secção editorial "CDA em Actividade" na homepage, alimentada pelo modelo de actividades.
- Responsividade validada para telemóvel, tablet e desktop (breakpoints específicos).

### 4.3 Dados e conteúdo

- **Documentos:** 57 catalogados em 10 categorias (Ordens de Serviço 11, Convocatórias 11, Boletins 7, Exortações 7, Relatórios 6, Legislação 5, Circulares 4, Fichas de Inscrição 4, Regulamentos 1, Eventos 1), com metadados normalizados (tipo, título, entidade, ano, ficheiro, URL).
- **Notícias:** 11 (título, categoria, data, texto).
- **Actividades:** 5 eventos, com capas, ligação a notícias, documentos e IA.
- **Membros:** 221. **Órgãos sociais:** 15.
- **Galeria:** fotográfica com lightbox.

### 4.4 Segurança no frontend

Renderização de documentos, membros e actividades **sem `innerHTML`** (proteção XSS), preparando o frontend para consumir dados de CMS/BD.

### 4.5 Volume de código (frontend)

- JavaScript: ~2 905 linhas.
- CSS (`estilo.css`): 738 linhas.
- HTML: ~2 273 linhas.

---

## 5. Assistente CDA (IA / RAG)

Assistente conversacional que responde **apenas com base nos documentos oficiais da CDA**, citando sempre as fontes. Pipeline:

```
1. OCR      -> extração de texto dos 57 PDFs (pdftotext >=100 chars; senão Tesseract 300 dpi)
2. Chunking -> segmentos de 700 caracteres com sobreposição de 120
3. Stemming -> normalização lexical em português (Snowball PortugueseStemmer)
4. Indexação-> índice BM25 (1 123 segmentos indexados)
5. Retrieval-> recuperação top-k dos extratos mais relevantes (k <= 20)
6. LLM     -> síntese da resposta (Ollama Cloud) com citação das fontes
7. Fallback -> modo local quando o modelo não está disponível (declarado na UI sem alucinação)
```

### Endpoints IA

| Endpoint | Função |
|---|---|
| `GET /health` | Estado público (healthcheck) |
| `POST /ia/perguntar` | Resposta conversacional + fontes (RAG ou fallback) |
| `GET /ia/pesquisar?q=` | Pesquisa top-k de extratos (sem LLM) |
| `GET /ia/documento?f=&q=` | Pesquisa restrita a um documento |
| `GET /ia/status` | Métricas (protegível via `IA_STATUS_TOKEN`) |

O índice atual contém **1 123 segmentos**; **5 documentos** sem texto extraível (ver pendências).

---

## 6. Backend e infraestrutura de dados

### 6.1 Base de dados
Modelos SQLAlchemy: `Membro`, `Noticia`, `Actividade`, `DocumentoMeta`, `ContactoMsg`. SQLite por agora; estrutura migrável para PostgreSQL sem alteração de código (via `DATABASE_URL`).

### 6.2 Autenticação
- Hashing PBKDF2-HMAC-SHA256 (260 000 iterações).
- Sessões por token HMAC-SHA256 assinado, cookie HttpOnly.
- Segredos isolados do repositório (`.env`, `.auth_secret`, `*.db` no `.gitignore`).

### 6.3 APIs (FastAPI, ~30 rotas)

**Públicas**
- `GET /api/status`
- `POST /api/contacto` (formulário de contacto real, gravado na BD)

**Autenticação**
- `POST /api/auth/registar`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

**Administração** (`/api/admin/*`)
- `GET|POST|PUT|DELETE /api/admin/documentos[/{id}]`
- `POST /api/admin/documentos/upload` (upload PDF + OCR + reindexação)
- `GET|POST /api/admin/noticias[/{id}]`, `DELETE`
- `GET|POST /api/admin/actividades[/{id}]`, `DELETE`
- `GET /api/admin/mensagens`, `POST .../{id}/ler`, `DELETE`
- `GET /api/admin/membros`, `POST .../{id}/toggle`
- `GET /api/admin/galeria`
- `POST /api/admin/publicar` (regenera `dados.js` a partir da BD + reindexa IA)

### 6.4 Painel administrativo

Acesso discreto pelo canto inferior direito do portal (`admin.html`), com login de administrador e dashboard:
- **Documentos:** CRUD + upload de PDF com OCR/reindexação automática.
- **Notícias / Actividades:** CRUD com publicação.
- **Mensagens:** caixa das mensagens do formulário de contacto (marcar lida, apagar).
- **Membros:** ativar/desativar contas.
- **Galeria:** gestão de conteúdo fotográfico.
- **Publicar:** regera o site publicado a partir da BD (sem intervenção em código).

Fluxo de publicação: Painel -> BD -> regenerate `dados.js` (compatível com o frontend) -> reindexar IA -> deploy.

---

## 7. Segurança e robustez

- **XSS-safe:** renderização sem `innerHTML`.
- **Rate limiting** na API (20 req/60 s, configurável).
- **Validação de entradas** (Pydantic); clamping de parâmetros (ex.: `k` limitado a 20).
- **Healthcheck** público + métricas protegíveis por token.
- **Segredos isolados:** `.gitignore` exclui `.env`, `.auth_secret`, `*.db` (verificado em histórico -- nenhum segredo versionado).

---

## 8. Testes

Suíte automatizada (`tests/`, runner `run_tests.sh`), **0 falhas**:

| Suíte | Cobre |
|---|---|
| `test_links.py` | Âncoras/links de todas as páginas + existência dos 57 PDFs |
| `test_indice.py` | Integridade do índice (1 123 segmentos vs PDFs) |
| `test_ia_logic.py` | Normalização, busca, fallback honesto, prompt |
| `test_api.py` | Smoke da API (health, validação, rate-limit, clamp) |

Smoke manual adicional no backend: registo/login, contacto na caixa admin, CRUD de notícias/actividades, upload/OCR, publicação.

---

## 9. Deploy

- GitHub Pages publica `docs/` (deploy determinístico via `build.sh`).
- Backend FastAPI self-hosted serve simultaneamente a API e o site (montagem estática em `/`), evitando CORS num único domínio.
- Arranque via `ia/start.sh` (setsid + nohup), porta `8765`, log dedicado.
- Provisionamento reprodutível (`setup.sh`, `requirements.txt` versionado).

---

## 10. Volume de trabalho (resumo)

| Recurso | Quantidade |
|---|---|
| Páginas + painel admin | 11 |
| Documentos | 57 (10 categorias) |
| Notícias | 11 |
| Actividades | 5 |
| Membros | 221 |
| Órgãos sociais | 15 |
| Segmentos indexados (IA) | 1 123 |
| Rotas de API | ~30 |
| Linhas JS (frontend) | ~2 905 |
| Linhas CSS | 738 |
| Linhas HTML | ~2 273 |
| Linhas Python (backend) | ~1 528 |
| Commits no repositório | 13 |
| Testes automatizados | 4 suítes, 0 falhas |

---

## 11. Pendências / próximos passos

| Item | Estado |
|---|---|
| 5 PDFs com texto não extraível | Fora do acervo; re-extrair ou remover com documentação |
| Token GitHub partilhado exposto | Revogar/regenerar |
| `.env` de produção | Preencher (IA_STATUS_TOKEN, rate limits, IA_ORIGINS) sem segredos no repo |
| Deploy do backend com reverse proxy | Ainda só local (:8765); expor em domínio próprio (Nginx/Caddy/Cloudflare + TLS) |
| Campo jurídico `status` dos documentos | Requer confirmação da CDA (não foi fabricado) |
| Enriquecimento contínuo de conteúdo | Via painel admin + botão Publicar |

---

## 12. Conclusão

O portal foi migrado de uma plataforma legada (Joomla 3.9.1, sem suporte e com vários riscos) para uma aplicação própria em três camadas, com base de dados persistente, autenticação, gestão editorial via painel e assistente de IA documental. Todo o conteúdo útil foi preservado e reestruturado. A suíte de testes e o smoke manual confirmam o funcionamento dos componentes principais; as pendências listadas acima permanecem em aberto, destacando-se a exposição do backend em produção e a revogação do token.
