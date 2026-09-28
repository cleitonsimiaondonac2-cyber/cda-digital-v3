# CDA Digital 2.0 — Resumo Executivo
## Portal Institucional Inteligente da Câmara dos Despachantes Aduaneiros de Moçambique

**Lamo Projectos / Skylayer** — 18 de Agosto de 2026 · Base: auditoria completa de 18/08/2026 (documento 01) e proposta detalhada (documento 02)

---

## O que temos hoje

| Dimensão | Situação real (medida) |
|---|---|
| Plataforma | Joomla 3.9.1 — **sem suporte de segurança desde 2023** |
| Segurança | Sem https forçado, sem headers de segurança, cookies sem `Secure` |
| Acervo | ~50 documentos oficiais — **78% são digitalizações** sem texto pesquisável |
| Conteúdo | "Sobre Nós" com texto corrompido; documentos duplicados; secção Actas vazia |
| Experiência | Não funciona bem em telemóvel; sem pesquisa; sem área de membros real |

**O problema não é falta de conteúdo — é falta de acesso ao conteúdo.**

---

## O que propomos

> **Manter a base tecnológica e a estrutura — modernizar e adicionar inteligência artificial gratuita e local.**

### 1. Base mantida
- Upgrade **Joomla 3.9 → 5** (mesmo CMS, caminho oficial)
- **K2 + PhocaDownload + galeria preservados** — categorias, ficheiros e URLs intactos
- Mesma estrutura de menus e informação

### 2. Modernização
- Template responsivo **mobile-first**, design institucional sóbrio
- Segurança em dia (https forçado, headers, protecção do admin)
- SEO (sitemap, metas, canonical) e performance (TTFB < 0,8 s)
- Textos institucionais corrigidos (Sobre Nós, Como ser Membro)

### 3. Centro Documental com IA
- Limpeza do acervo (duplicados eliminados, catalogação correcta)
- **OCR** (Tesseract) — os 78% de digitalizações ficam pesquisáveis
- **Assistente CDA** (RAG): responde com base **apenas nos documentos oficiais**, citando sempre as fontes — e diz **"não sei"** quando não encontra fundamento
- Pesquisa semântica: *"circulares da DGA de 2025 sobre desembaraço"* → resultados + resumo + link ao original
- **"Perguntar ao documento"** — conversa sobre um PDF específico
- **CDA Copilot** (interno): classificação automática de novos documentos, resumos, apoio à escrita de notícias, tradução PT↔EN

### 4. Área do Membro
- Perfil, carteira profissional, quotas, requerimentos com acompanhamento, comunicados — e assistente pessoal (*"mostre-me os documentos desta semana"*)

**IA em tudo isto: 100% gratuita em licenciamento** — modelos abertos (Ollama, bge-m3, NLLB) a correr no próprio servidor da CDA. Os dados dos membros **nunca saem do servidor**. A IA não substitui a informação oficial — apenas a torna utilizável.

---

## Fases e prazos

| Fase | Conteúdo | Duração |
|---|---|---|
| 0. Contenção | Segurança imediata do site actual (https, headers) | 1 semana |
| 1. Modernização | Upgrade Joomla 5, template novo, SEO, performance | 3 semanas |
| 2. Centro Documental | OCR, limpeza, metadados, pesquisa avançada | 2–3 semanas |
| 3. IA pública | Assistente CDA, pesquisa semântica, perguntar ao documento | 3 semanas |
| 4. IA interna | CDA Copilot, classificação automática, tradução | 2 semanas |
| 5. Área do Membro | Login, perfil, quotas, requerimentos | 3–4 semanas |
| 6. Go-live | Formação do staff, suporte 30 dias | 1–2 semanas |
| **Total** | | **15–17 semanas** |

**Infraestrutura:** única decisão do cliente — VPS única (Joomla + IA, ~16 GB RAM, 40–60 USD/mês) ou alojamento actual + VPS só para a IA. Sem VPS não há IA local gratuita.

---

## Próximos passos

1. **Fase 0 arranca já** — contenção de segurança independente do resto;
2. Reunião de validação: escopo, quotas (M-Pesa/registro manual), requerimentos, textos;
3. Pedido formal de acesso (backend, dump, backups, VPS);
4. Decisão de infraestrutura (cenário A ou B);
5. Arranque da Fase 1 após validação.

---

*Resumo do projecto completo — ver documentos 01 (auditoria, 11 pág.) e 02 (proposta, 10 pág.).*