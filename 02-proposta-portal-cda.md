# Proposta — CDA Digital 2.0
## Portal Institucional Inteligente da Câmara dos Despachantes Aduaneiros de Moçambique

**Preparada por:** Lamo Projectos / Skylayer
**Data:** 18 de Agosto de 2026
**Base:** Auditoria completa do portal actual (documento 01) + requisitos da CDA
**Abordagem:** Modernizar a base existente (Joomla) e adicionar recursos de IA — mantendo a estrutura, o conteúdo e os URLs do site actual o máximo possível

---

## 1. Contexto e objectivos

O portal actual (`cda-mz.org`) funciona sobre **Joomla 3.9.1** — versão sem suporte de segurança desde Agosto de 2023 — com template descontinuado e componentes legados. O conteúdo institucional tem problemas graves de qualidade (página "Sobre Nós" com texto corrompido), há documentos duplicados e secções vazias, e não existe pesquisa nem qualquer recurso de IA.

O objectivo do projecto é a **transformação digital da CDA mantendo a sua base tecnológica**:

> **"Toda a informação da CDA, pesquisável e acessível de forma simples."**

O activo mais valioso do site — o acervo documental (legislação, regulamentos, circulares, convocatórias, ordens de serviço, relatórios, boletins) — será transformado num **sistema de conhecimento institucional com inteligência artificial**: pesquisa inteligente, assistente com respostas fundamentadas nos documentos oficiais e automação da gestão documental — **com custo zero de licenciamento** (tecnologias abertas e self-hosted).

---

## 2. Base tecnológica (mantida)

| Camada | Actual | Proposto | Mudança |
|---|---|---|---|
| CMS | Joomla 3.9.1 (EOL) | **Joomla 5.x** (suportado) | Upgrade oficial 3.9 → 4 → 5 |
| Notícias | K2 | **K2** (versão J4/5) | Manter — dados preservados |
| Documentos | PhocaDownload | **PhocaDownload** (versão J4/5) | Manter — categorias e ficheiros preservados |
| Galeria | SpeasyImageGallery | **SpeasyImageGallery** (J4/5) | Manter |
| Template | Businessreport (descontinuado) | Template responsivo moderno (J5) com a **mesma arquitectura de informação** | Substituição obrigatória (o actual já não é suportado) |
| Estrutura de menus | Actual | **Preservada ao máximo** | Só correcções e melhorias |
| URLs | Actual | **Preservados** (com 301 para o que mudar) | Sem quebra de links |

**Princípio:** o Joomla continua a ser o centro do site. A IA é adicionada como um serviço complementar — **sem substituir** o CMS nem a estrutura de informação existente.

---

## 3. Estrutura preservada e melhorada

A árvore de informação actual é mantida na íntegra:

```
CDA (cda-mz.org) — ESTRUTURA ACTUAL MANTIDA
├── Página Inicial
├── Sobre Nós (Missão e Valores · Órgãos Sociais · Histórico)
├── Documentação
│   ├── Legislação          (5 ficheiros)
│   ├── Regulamentos        (1 ficheiro)
│   ├── Convocatórias       (12 — eliminar 1 duplicado)
│   ├── Circulares          (6 — recolocar 2 fora de contexto)
│   ├── Ordens de Serviço   (10)
│   ├── Relatórios          (5 — eliminar duplicados da cat. 29)
│   ├── Exortações          (7)
│   └── Actas               (0 — preencher ou manter pronta)
├── Parceiros
├── Membros (Como ser Membro · Lista de Membros · Fichas de Inscrição)
├── Links Relevantes
├── Boletins (7 edições)
├── Contacte-nos
├── Fotos\galeria
└── Login (Área do Membro)
```

**Ajustes de estrutura (mínimos e justificados):**
1. Página de **Notícias** com arquivo (hoje as notícias só aparecem na homepage, sem listagem);
2. Pesquisa global no topo — caixa única para documentos e conteúdos;
3. Correcção do menu "Fotos\galeria" (backslash) para "Fotos / Galeria";
4. Melhorias em "Como ser Membro" e "Sobre Nós" (textos corrigidos — ver §6).

---

## 4. Modernização (Fase 1 do projecto)

### 4.1 Design e experiência

- Template responsivo **mobile-first** (o actual é fixo a 1200 px, inutilizável em telemóvel);
- Estilo institucional sóbrio: azul-marinho/branco, tipografia sólida, sem efeitos decorativos;
- Homepage reorganizada sem alterar a informação:
  - Hero com a proposta da CDA + botões "Conheça a CDA" e "Área do Membro";
  - Acesso rápido (Legislação · Circulares · Membros · Inscrição · Boletins);
  - **Caixa "Pesquise na CDA"** — pesquisa normal e inteligente (IA, §5);
  - Notícias recentes, "A CDA em números", delegações, contactos.

### 4.2 Segurança (crítica — alguns pontos a resolver imediatamente)

| Acção | Prazo |
|---|---|
| Redireccionamento forçado http→https | Imediato (mesmo antes do projecto) |
| Headers de segurança (HSTS, X-Frame-Options, X-Content-Type-Options, CSP mínima) | Imediato |
| Cookie de sessão com flag `Secure` | Imediato |
| Protecção `/administrator/` (por IP) + bloquear `/manifests/` | Semana 1 |
| Upgrade Joomla 3.9 → 5 (corrige vulnerabilidades conhecidas) | Fase 1 |
| Módulo WAF actualizado (o Mod_Security existente tem regras descalibradas — o crawl da auditoria foi bloqueado com UA simples e contornado com headers completos) | Fase 1 |

### 4.3 SEO e performance

| Item | Actual | Objectivo |
|---|---|---|
| TTFB | 1,31 s | < 0,8 s (cache + compressão + HTTP/2) |
| Sitemap.xml | Inexistente | Criado e actualizado automaticamente |
| Meta descriptions | Única para todo o site | Única por página (com apoio de IA) |
| URLs duplicadas | 3 variantes por página (`?change_direction=1/2`) | Canonicals + limpeza |
| Open Graph | Ausente | Implementado |
| Mobile | Não responsivo | Mobile-first |
| Acessibilidade | Não conforme | WCAG 2.1 AA |

---

## 5. Centro Documental + Inteligência Artificial (Fases 2–4)

### 5.1 O problema que a IA resolve

Hoje, encontrar informação num documento exige:

```
Documentação → Circulares → 2025 → Circular DGA → PDF → Ctrl+F
```

Com o portal inteligente:

```
"Quais são as circulares da DGA de 2025 relacionadas com desembaraço?"
                ↓
            IA (RAG)
                ↓
   Resultados relevantes + resumo + link ao documento original
```

### 5.2 Recursos de IA incluídos

| Recurso | Descrição | Público |
|---|---|---|
| **Assistente CDA** | Responde a perguntas sobre legislação, procedimentos e requisitos, **apenas com base nos documentos oficiais**, citando sempre as fontes | Público |
| **Perguntar ao documento** | Botão "[Abrir documento] [Perguntar à IA]" — responde com base **só nesse documento** (ex.: "Quais os procedimentos deste regulamento?") | Público |
| **Pesquisa semântica** | Encontra documentos por conceito, não só por palavra-chave ("normas sobre carteira profissional") | Público |
| **Resumos automáticos** | Cada documento ganha um resumo de 2–3 parágrafos (listagens e resultados de pesquisa) | Público |
| **Classificação automática** | Ao publicar um PDF, o sistema sugere tipo, entidade, ano, número, tema e tags — o administrador só valida | Interno |
| **CDA Copilot** | Ferramenta interna: pesquisa documental, resumo de documentos longos, localização de referências (ex.: "encontra todas as referências a licenciamento de despachantes" num PDF de 80 pág.) | Funcionários |
| **Apoio a notícias** | Geração automática de resumo, SEO title, meta description, tags e versões para redes sociais — publicação final sempre humana | Interno |
| **Tradução PT↔EN** | Tradução automática local; legislação/jurídico com revisão humana obrigatória; institucional com revisão opcional | Público/Interno |

### 5.3 Arquitectura (tudo gratuito e self-hosted)

```
                  SITE (Joomla 5)  ←── interface, estrutura e conteúdo
                        │  API (JSON)
                        ▼
        SERVIÇO IA SIDECAR (Docker, mesmo servidor ou VPS dedicada)
   ┌─────────────────────────────────────────────────────────────┐
   │ Python API (FastAPI)                                        │
   │  ├── OCR: Tesseract (língua: português)   — digitalizações │
   │  ├── Embeddings: bge-m3 (multilingue)      — pesquisa       │
   │  ├── Vector DB: pgvector (PostgreSQL)      — semântica      │
   │  └── LLM local: Ollama (Qwen2.5 / Mistral Nemo — PT)        │
   │        └── RAG: pesquisa na base documental → resposta      │
   │              + fontes (links reais) + "não sei" honesto     │
   │  └── Tradução: NLLB-200 (local)                             │
   └─────────────────────────────────────────────────────────────┘
```

**Regra de ouro — a IA não substitui a informação oficial:**
- O assistente **procura primeiro, responde depois** (RAG — Retrieval-Augmented Generation): sem documentos encontrados, responde *"Não encontrei informação suficiente nos documentos oficiais disponíveis para responder com segurança"*;
- Toda a resposta cita a fonte com link directo ao documento;
- Aviso permanente: "A IA não substitui o texto oficial dos diplomas";
- **Governança de dados:** só documentos públicos entram no índice; dados de membros (perfil, quotas, requerimentos) **nunca** saem do servidor; logs de utilização; política clara de IA definida com a CDA.

### 5.4 Preparação do acervo — OCR

A auditoria detectou que **~78% dos PDFs são digitalizações sem camada de texto** (23 amostras: 5 com texto, 18 sem). Todos os documentos passam por:

```
PDF → OCR (Tesseract, PT) → extracção de texto → chunking
   → embeddings (bge-m3) → índice (pgvector) → disponível ao assistente
```

O PDF original permanece o documento oficial; o texto extraído serve apenas a pesquisa e o resumo.

---

## 6. Qualidade editorial (transversal)

| Conteúdo | Tratamento |
|---|---|
| "Sobre Nós" | **Reescrita completa** (texto actual ininteligível — citado na auditoria) |
| "Como ser Membro" | Correção de erros (ex.: "Decreto 18/2011 de **8 de 26 de Maio**", palavras repetidas) e citações legais |
| Legislação, Estatuto, Regulamentos | **Mantidos fiéis** (apenas formatação) |
| Missão e Valores, Histórico, Órgãos Sociais | Revisão ortográfica e de fluxo |
| Documentos duplicados/mal catalogados | Eliminados/recolocados (convocatórias 176/177; relatórios cat. 29; 2 ficheiros em Circulares) |
| Boletins | Recolhidos na migração (não foram descarregados no crawl) e catalogados |
| Notícias (7) | Migradas com datas originais + arquivo |

---

## 7. Área do Membro (Fase 5)

```
Área do Membro (login Joomla existente, reforçado)
├── Bem-vindo, [nome]
├── Carteira profissional (estado)
├── Comunicados e documentos exclusivos
├── Requerimentos (novo → submeter → acompanhar estado)
├── Quotas (histórico, estado, recibos)
├── Formação / Eventos
├── Perfil
└── Contactar CDA
```

Com assistente pessoal: *"Mostre-me os documentos publicados esta semana"*, *"Encontre a última circular sobre X"*.

| Funcionalidade | Descrição | Ponto de decisão |
|---|---|---|
| Quotas | Registo de pagamentos com estado e recibos | Gateway a definir (M-Pesa, referência bancária ou registo manual) |
| Requerimentos | Formulários com workflow: submetido → em análise → deferido/indeferido | Lista de tipos a confirmar com a CDA |
| Carteira | Dados do membro + PDF com elementos de segurança | Validação jurídica do desenho |

---

## 8. Roadmap e fases

| Fase | Conteúdo | Duração |
|---|---|---|
| **0. Contenção** (independente, recomendada já) | https forçado, headers de segurança, cookies `Secure`, proteger `/administrator/` | 1 semana |
| **1. Modernização** | Upgrade Joomla 3.9→4→5, template responsivo novo (mesma IA), migração de conteúdo/URLs, SEO (sitemap, metas, canonical), performance, acessibilidade | 3 semanas |
| **2. Centro Documental** | Limpeza do acervo (duplicados, catalogação), OCR dos 50 documentos, metadados, pesquisa avançada com filtros, pré-visualização | 2–3 semanas |
| **3. IA pública** | Serviço sidecar (Docker: Ollama + Python + pgvector), Assistente CDA (RAG com fontes), pesquisa semântica, "perguntar ao documento", resumos | 3 semanas |
| **4. IA interna** | CDA Copilot (classificação automática, apoio a notícias, resumos internos), tradução PT↔EN (NLLB), política e logs de IA | 2 semanas |
| **5. Área do Membro** | Login reforçado, perfil, carteira, quotas, requerimentos com workflow, notificações, assistente pessoal | 3–4 semanas |
| **6. Go-live e formação** | Publicação final, formação do staff (2 sessões: gestão de conteúdo e uso das ferramentas de IA), suporte 30 dias | 1–2 semanas |
| **Total** | | **15–17 semanas** |

**Estimativa de esforço:** 420–540 horas de desenvolvimento/gestão. Orçamento detalhado por fase a apresentar após validação do escopo com a CDA.

---

## 9. Infraestrutura (2 cenários — decisão do cliente)

| Cenário | Descrição | Custo estimado |
|---|---|---|
| **A — VPS única** | Joomla + serviço de IA no mesmo servidor: **16 GB RAM, 4 vCPU, 200 GB SSD**, Docker, backups | ~40–60 USD/mês (VPS moçambicana ou regional) |
| **B — Alojamento + VPS de IA** | Manter alojamento partilhado (Joomla) + **VPS 16 GB** só para o motor de IA (Ollama + OCR + vector DB) | ~40–60 USD/mês (só a VPS) |

Nota: a IA local exige uma VPS — **não corre em alojamento partilhado (cPanel)**. Se o objectivo é tudo gratuito em licenciamento, a VPS é o único custo fixo de infraestrutura (mais barato que qualquer licença de SaaS de IA com dados públicos + privados).

---

## 10. Riscos e mitigação

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Upgrade Joomla 3.9→5 com K2/PhocaDownload (extensões J4/5 existem, mas podem exigir ajustes) | Média | Ambiente de teste/estágio antes do go-live; plano de rollback; regressão completa do acervo |
| Qualidade PT dos modelos locais gratuitos | Média | Modelos com bom português (Qwen2.5, Mistral Nemo); arquitectura com camada de abstração — permite activar um modelo cloud (pago, opcional) sem reescrita |
| OCR em digitalizações antigas de baixa qualidade | Média | Tesseract com dados PT; revisão por amostragem; o PDF original mantém-se a fonte oficial |
| Alucinação da IA | Média (mitigado) | RAG obrigatório: sem documentos → "não sei"; fontes citadas; aviso legal |
| Infraestrutura da CDA desconhecida | Média | Cenários A/B apresentados; decisão não bloqueia fases 0–1 |
| Gateway de quotas atrasado | Alta | Fase 5 desenhada com "registo manual" como fallback |
| Conteúdo corrompido (reescrita longa) | Média | Reescrita incluída; validação em 2 reuniões com a CDA |

---

## 11. Incluído e não incluído

**Incluído:**
- Fases 0–6 (contenção, upgrade Joomla 5, modernização, centro documental com OCR, IA pública e interna, área do membro, formação e suporte 30 dias);
- Reescrita editorial dos textos institucionais (com validação da CDA);
- Configuração da infraestrutura no cenário escolhido;
- Manual de publicação e de uso das ferramentas de IA.

**Não incluído (opcional, orçamento à parte):**
- Integração directa M-Pesa (API do operador);
- Modelo LLM cloud (upgrade opcional de qualidade);
- Plataforma de formação online (LMS);
- Aplicação móvel nativa;
- Manutenção continuada após o período de suporte;
- Inglês/Francês completos (a tradução automática PT↔EN está incluída; revisão humana de toda a legislação traduzida é orçamento à parte).

---

## 12. Próximos passos

1. Entrega da auditoria (documento 01) e desta proposta à CDA;
2. Reunião de validação: escopo, gateway de quotas, lista de requerimentos, textos institucionais;
3. Pedido formal de acesso (checklist §9 da auditoria — inclui backend, dump, backups, VPS);
4. Decisão de infraestrutura (cenário A ou B);
5. Contratação e arranque da **Fase 0 (contenção)** — recomendado imediato, antes mesmo do projecto completo;
6. Arranque da Fase 1 após validação.

---

*Documento baseado na auditoria de 18/08/2026. Estatísticas: ~50 documentos únicos (78% digitalizados, requerem OCR), 223 membros, 7 notícias, 22 imagens.*
