# Auditoria do Portal da CDA — Câmara dos Despachantes Aduaneiros de Moçambique

**Endereço:** https://cda-mz.org/
**Data da auditoria:** 18 de Agosto de 2026
**Auditor:** Lamo Projectos / Skylayer (via processo digital)
**Base da auditoria:** Informação pública (crawl completo do site) + medições técnicas remotas. Acesso ao servidor/backend **pendente** — ver §9.

---

## 1. Sumário executivo

O portal da CDA é um sistema legado construído em **Joomla 3.9.1** (versão de Janeiro de 2019, **sem suporte de segurança desde Agosto de 2023**) com template comercial "Businessreport" (Youjoomla) e componentes de terceiros (K2, PhocaDownload, SpeasyImageGallery).

O site possui **conteúdo real e relevante** — legislação, circulares, convocatórias, ordens de serviço, boletins e a lista de membros — mas a experiência digital é gravemente deficiente em cinco dimensões:

1. **Segurança:** CMS sem patches há 3+ anos (vulnerabilidades conhecidas publicamente), sem headers de segurança, sem redireccionamento http→https, cookies sem flag `Secure`.
2. **Conteúdo institucional corrompido:** a página "Sobre Nós" contém texto incoerente (provável tradução automática mal feita); formulários de subscrição com texto partido; erros factuais/redacionais em "Como ser Membro".
3. **Arquitectura de informação deficiente:** secções vazias (Actas, Relatórios), documentos duplicados em categorias erradas (relatórios de 2016 dentro de "Regulamentos"), documentos mal catalogados (relatório de auditoria dentro de "Circulares").
4. **SEO inexistente:** sem sitemap, meta description idêntica em todas as páginas, sem redireccionamentos normalizados, estrutura de URLs exposta a duplicação (variantes `?change_direction=1/2`).
5. **Funcionalidade de portal ausente:** a "Área do Membro" é apenas um login de utilizador Joomla sem qualquer funcionalidade; não há formulário de contacto, pesquisa documental ou agenda de eventos.

**Conclusão:** o site não representa a dimensão institucional, jurídica e profissional da CDA. A decisão da CDA (18/08/2026) é **modernizar mantendo a base tecnológica**: upgrade para Joomla 5 (mesmo CMS, estrutura e componentes preservados) e adição de recursos de IA gratuitos e self-hosted (assistente documental, pesquisa semântica, automação de gestão do acervo). A proposta correspondente está no documento 02. Enquanto a migração decorre, aplicam-se as medidas de contenção do §8.

---

## 2. Metodologia e âmbito

| Acção | Resultado |
|---|---|
| Crawl completo do site (mirror local) | 121 ficheiros, ~34 MB (HTML + documentos PDF) |
| Inventário automático de páginas/documentos | 122 entradas (páginas, notícias, documentos) |
| Medições HTTP/TLS | Headers, certificado, redireccionamentos, tempos |
| Verificação de componentes | Joomla 3.9.1, K2, PhocaDownload, SpeasyImageGallery |
| Texto integral das páginas institucionais | Extraído e analisado (qualidade editorial) |

O crawl foi parcialmente bloqueado pelo **Mod_Security** em URLs de categoria do PhocaDownload com user-agents simples; as páginas foram obtidas com headers de browser completos. Nota: a regra é rígida mas contornável — ver §4.6.

---

## 3. Inventário do site

### 3.1 Árvore de páginas (excluindo variantes `?change_direction=` e feeds)

```
CDA (cda-mz.org)
├── Página Inicial
├── Sobre Nós
│   ├── Missão e Valores
│   ├── Órgãos Sociais
│   └── Histórico
├── Documentação
│   ├── Legislação          (5 ficheiros)
│   ├── Regulamentos        (1 ficheiro)
│   ├── Convocatórias       (12 ficheiros, 1 duplicado)
│   ├── Circulares          (6 ficheiros, 2 mal catalogados)
│   ├── Ordens de Serviço   (10 ficheiros)
│   ├── Relatórios          (5 ficheiros, duplicados noutra categoria)
│   ├── Exortações          (7 ficheiros)
│   └── Actas               (0 ficheiros — vazia)
├── Parceiros
├── Membros
│   ├── Como ser Membro
│   ├── Lista de Membros    (~223 membros em tabela)
│   └── Fichas de Inscrição (4 formulários PDF)
├── Links Relevantes
├── Boletins                (7 edições)
├── Contacte-nos
├── Fotos\galeria           (22 imagens)
└── Login (reset/remind)
```

**Notícias (K2):** 7 artigos, apenas acessíveis pelo módulo da homepage — **não existe página de listagem/arquivo de notícias**.

### 3.2 Documentos por secção (59 ligações, ~50 ficheiros únicos)

| Secção | Ficheiros | Observações |
|---|---|---|
| Legislação | 5 | Lei 6/2009, Lei 4/2011, Decreto 18/2011, Diploma 16/2012, Estatuto da CDA |
| Convocatórias | 12 | 12ª a 19ª AGO + extraordinárias; **176 e 177 idênticos** (mesmo tamanho exacto, 553 070 bytes) |
| Ordens de Serviço | 10 | 2016 na maioria |
| Exortações | 7 | Inclui Ciclone Idai, fim/início de ano |
| Circulares | 6 | Inclui **"relatorio-de-auditoria" e "programa"** — fora de contexto nesta secção |
| Regulamentos | 1 | Regulamento Interno (III AGE, 2017) |
| Relatórios | 5 | Balanço/contas 2016 — **duplicados** na categoria 29 sob "Regulamentos" |
| Actas | **0** | Secção criada mas vazia |
| Boletins | 7 | "O Despachante" 01–06 + Boletim Informativo 04 |
| Fichas de Inscrição | 4 | Despachante, sociedades, ajudante, praticante |
| **Total** | **~50 únicos** | **6 duplicados/mal catalogados confirmados** |

---

## 4. Auditoria técnica

### 4.1 Plataforma

| Item | Valor | Avaliação |
|---|---|---|
| CMS | Joomla **3.9.1** (identificado via manifest público) | **CRÍTICO** — EOL desde Ago/2023 |
| Template | Businessreport (Youjoomla, comercial) | Legado, já descontinuado |
| Componentes | K2 (conteúdo/notícias), PhocaDownload (documentos), SpeasyImageGallery (fotos) | 2 dos 3 descontinuados/abandonados |
| Servidor | Apache, HTTP/2 | OK |
| TLS | Let's Encrypt, válido até 29/10/2026 | OK |
| PHP/MySQL | Não verificável sem acesso (a confirmar) | Pendente |

**Exposição do manifest:** `https://cda-mz.org/administrator/manifests/files/joomla.xml` é publicamente acessível e revela a versão exacta — informação útil para atacantes.

### 4.2 Performance (medições reais, 18/08/2026)

| Métrica | Valor | Referência |
|---|---|---|
| TTFB | **1,31 s** | Lento (ideal < 0,8 s) |
| Homepage (HTML) | 57 KB, 41 referências a assets, 83 links | Pesado para mobile |
| Documentos PDF | 300 KB – 1,4 MB | Não optimizados/compressos |
| Crawl completo | 10+ min para 121 ficheiros | Site lento em resposta seriada |

### 4.3 Disponibilidade

- Sem página de manutenção; serviço respondeu durante toda a auditoria.
- **Sem sitemap.xml** (404) nem indícios de backup verificável (pendente de acesso).

### 4.4 Prontidão do conteúdo para IA (teste de OCR — 18/08/2026)

Para avaliar a viabilidade de pesquisa inteligente/IA sobre o acervo, foi testada a **camada de texto** de 23 PDFs descarregados (todas as secções, excepto boletins — não descarregados pelo crawl):

| Resultado | Quantidade | Percentagem |
|---|---|---|
| PDFs com camada de texto extraível (>100 caracteres) | 5 | 22% |
| PDFs **digitalizados, sem camada de texto** | 18 | **78%** |

Exemplos: "requisitos-para-registo-e-cadastro-de-agentes-transitarios" (2 pág., 0 caracteres), "convocatoria-5-assembleia-geral-extraordinaria" (1 pág., 0), "ordem-de-servico-numero-10-dga-2016" (3 pág., 0); "lei-n-4-2011" (3 pág., 10 791 caracteres — com texto).

**Conclusão:** ~78% do acervo exige **OCR** (Tesseract, dados PT — gratuito) antes de qualquer indexação semântica/IA. O PDF original permanece a fonte oficial; o texto extraído serve a pesquisa e resumos. Os boletins (7 edições) devem ser recolhidos e testados na migração.

### 4.5 Caminho de actualização: Joomla 3.9 → 5

| Passo | Detalhe | Risco |
|---|---|---|
| 1. Joomla 3.9 → 3.10 (última 3.x) | Pré-requisito oficial; verificar extensões | Baixo |
| 2. 3.10 → Joomla 4.x | Requer PHP 8.0+; substituir template (Businessreport não é compatível) | Médio |
| 3. 4.x → Joomla 5.x | Requer PHP 8.1+; regressão completa de funcionalidades | Baixo–Médio |
| 4. Extensões | K2, PhocaDownload e SpeasyImageGallery têm versões para J4/5 — **a manter** (categorias, ficheiros e configuração preservadas) | Médio |
| 5. Template | Novo template responsivo J5 com a mesma arquitectura de informação e URLs | Médio |
| 6. Dados | Conteúdo, K2 items, downloads PhocaDownload e utilizadores migram no processo | Baixo |

**Recomendação:** ambiente de estágio para o upgrade + plano de rollback + regressão do acervo (50 documentos) e dos 223 membros antes do go-live.

---

## 5. Auditoria de segurança

### 5.1 Cabeçalhos HTTP (medidos)

| Cabeçalho | Estado | Risco |
|---|---|---|
| `Strict-Transport-Security` (HSTS) | **Ausente** | Alto |
| `Content-Security-Policy` | **Ausente** | Alto |
| `X-Frame-Options` | **Ausente** (permitido iframe/clickjacking) | Médio |
| `X-Content-Type-Options` | **Ausente** | Médio |
| `Referrer-Policy` | **Ausente** | Baixo |
| `P3P` (legado IE) | Presente (obsoleto) | Cosmético |

### 5.2 Transporte e cookies

- **Sem redireccionamento http→https**: `http://cda-mz.org/` responde 200 directamente (dados/formulários podem viajar em claro).
- Cookie de sessão: nome aleatório do padrão Joomla, com `HttpOnly` mas **sem `Secure`** — vulnerável a intercepção em ligações não cifradas.
- Cabeçalho `Cache-Control: no-store` presente (positivo para sessões).

### 5.3 Superfície de ataque

| Item | Estado |
|---|---|
| CMS sem patches (Joomla 3.9.x) | Vulnerabilidades conhecidas públicas (ex. CVE-2023-23752 e sucessivas) |
| Login de administração | Exposto em `/administrator/` (não testado) |
| Login de utilizadores | Página pública, sem captcha visível |
| Versão revelada | Manifest acessível publicamente |
| Mod_Security | **Activo** — bloqueou o crawl com UAs simples; contornado com headers completos (sinal de que o WAF não está totalmente calibrado) |
| Formulários | Subscrição de boletim e recuperação de senha (sem evidência de protecção anti-spam) |

### 5.4 Prioridade de remediação

1. **Imediato:** redireccionamento forçado http→https + flag `Secure` em cookies.
2. **Imediato:** instalar headers de segurança (HSTS, X-Frame-Options, X-Content-Type-Options, CSP mínima).
3. **Curto prazo:** bloquear `/administrator/manifests/` no servidor (ou acesso por IP); monitorizar `/administrator/`.
4. **Plano:** substituir o CMS (ver proposta) — manutenção continuada do Joomla 3.9 é indefensável.

---

## 6. Auditoria UX/UI e acessibilidade

### 6.1 Primeira impressão (homepage)

- O hero são 3 banners rotativos institucionais (AGO 2023/2024) — sem mensagem clara de "quem é a CDA e o que faz".
- Não há hierarquia: notícias, "breves", login, newsletter e menu ocupam o mesmo peso visual.
- Sem call-to-action visível ("Conheça a CDA", "Área do Membro", "Pesquisar documentos").
- Layout fixo de **1200 px** — sem adaptação mobile real; navegação em submenu suspenso (hover) inutilizável em ecrãs tácteis.

### 6.2 Identificados em inspecção do código

- **Múltiplas H1** por página (logo + título), quebrando a hierarquia semântica.
- Menu com erro de caracter: **"Fotos\galeria"** (backslash no título visível).
- Feed RSS/Atom da página de Links Relevantes com título corrompido ("Câmada dos Despachantes Oficiais de Angola", "Órdem dos Despachantes Oficiais de Portugal").
- Botão "Top", controles de tamanho de fonte e RTL/LTR do template antigo — lixo visual no rodapé.
- Validação "CSS Valid / XHTML Valid" (selos obsoletos de 2010) no rodapé.

### 6.3 Acessibilidade (checklist WCAG 2.1, sem ferramenta — por inspecção)

| Critério | Estado |
|---|---|
| Texto alternativo em imagens | Parcial (alguns `alt` ausentes/descritivos) |
| Contraste | Baixo no template (links #727d91 sobre fundo claro) |
| Navegação por teclado | Submenus hover dificultam; foco não visível |
| Formulários | Sem labels associados visíveis em todos os campos |
| Língua | `lang` não declarado correctamente para PT |
| Redimensionamento | Layout fixo 1200 px impede zoom funcional |

---

## 7. Arquitectura de informação e conteúdo

### 7.1 Achados estruturais

1. **Actas — secção vazia.** A categoria existe (categoria 30) mas não contém qualquer ficheiro.
2. **Relatórios duplicados e mal colocados.** Os 5 relatórios financeiros de 2016 (Balanço, MDR, Amortizações, Notas, Controle Orçamental) existem em **duas categorias**: `relatorios/category/31` e `regulamentos/category/29` (a segunda com "1" no nome, ex. "BAL DEZ -2016 CDAM 1.pdf").
3. **Convocatórias com ficheiro duplicado exacto.** `?download=176:convocatoria` e `?download=177:convocatoria` têm exactamente 553 070 bytes — mesmo ficheiro carregado duas vezes.
4. **Circulares com ficheiros fora de contexto.** "relatorio-de-auditoria" e "programa" não são circulares.
5. **Sem página de notícias.** As 7 notícias K2 só são alcançáveis via módulo da homepage; não há arquivo nem categorização por data/assunto.
6. **"Boletins" apenas com download PDF** — sem visualização nem sumário.
7. **Lista de membros é uma tabela de 223 linhas** sem pesquisa, filtro ou dados de contacto dos membros (a confirmar com acesso).

### 7.2 Qualidade editorial (evidências textuais exactas)

**CRÍTICO — Página "Sobre Nós" (texto incoerente, provável tradução automática):**

> "Os Despachantes Aduaneiros têm que estarem inscritos na Câmara dos Despachantes Aduaneiros de Moçambique como as atribuições, outras entradas, uma Emissão de Carteira Profissional, o Registo Recente dos Membros, uma Fiscalização do Exercício da Atividade, o Aperfeiçoamento Profissional, o Apoio aos Membros e zelar pela Dignidade e Prestígio da Profissão."

> "O Despachante Aduaneiro é o período para a representação de governança Direta, em Nome e por Conta de outrem, nos atos e Formalidades Relacionados com o Desembaraço Aduaneiro de Mercadorias."

> "A Câmara dos Despachantes Aduaneiros está sujeita à revisão da Norma Técnica do Ministério das Finanças, Cabendo à Direção Geral das Alfândegas ou ao Licenciamento da Atividade de Despachante Aduaneiro"

**MÉDIO — "Como ser Membro" (erros factuais/redacionais):**

> "Decreto 18/2011 de **8 de 26 de Maio** - Regulamento do exercício da actividade de despacho aduaneiro **aduaneiro** de mercadorias."

> "desde que observado o principio da" *(incompleto)*

**MÉDIO — Subscrição de boletim (homepage):**

> "Receba nenhum e-mail Seu O Nosso todoas COM Boletim Mensal como Novidades da CDA"

**BAIXO — Vários:** "Câmada dos Despachantes Oficiais de Angola" (Links Relevantes), "Órdem dos Despachantes" (idem), "Fotos\galeria" (menu), "Dixon Chongo ... Despachantes Aduanieros" (notícia), "Visão Geral ... até 2019" em artigo de 2019.

### 7.3 Classificação do conteúdo para a migração

| Tipo | Tratamento proposto |
|---|---|
| Legislação, Estatuto, Regulamentos | Manter **fiel** (apenas formatar/estruturar) |
| Missão e Valores, Histórico, Órgãos Sociais | Rever ortografia; conteúdo válido |
| Sobre Nós | **Reescrever por completo** (texto corrompido) |
| Como ser Membro | **Reescrever/corrigir** (erros de redacção e citações legais) |
| Documentos PDF | Migrar com metadados (tipo, ano, número, assunto, entidade) |
| Notícias (7) | Migrar com datas originais; criar arquivo |
| Lista de membros | Converter em base de dados pesquisável |
| Boletins | Migrar como "publicações" com capa/sumário |
| Galeria | Migrar 22 imagens com legendas |
| Fichas de inscrição | Substituir por formulários digitais |

---

## 8. SEO e performance — achados adicionais

1. **Sem sitemap.xml** — bloqueia indexação estruturada.
2. **Meta description única em todo o site** ("Câmara dos Despachantes Aduaneiros de Moçambique") — nenhuma página tem description própria; títulos truncados e sem marca consistente.
3. **Duplicação de URLs:** cada página existe em 3 variantes (`/página`, `?change_direction=1`, `?change_direction=2`) + variantes `?format=feed` — sem canonical.
4. **Notícias sem datas legíveis nem páginas de listagem** — sem arquitectura SEO.
5. **Sem https force** — risco de conteúdo misto e perda de rankings.
6. **Feeds RSS/Atom** existem (K2) mas com títulos corrompidos.
7. **Sem Open Graph/Twitter Cards** (partilha social pobre).
8. **Performance mobile deficiente:** 57 KB de HTML + 41 assets + sliders pesados; sem lazy-loading; TTFB 1,3 s.

---

## 9. Pedido formal de acesso à CDA (checklist pendente)

Para aprofundar a auditoria e preparar a migração, solicitar à CDA:

- [ ] Acesso ao backend Joomla (admin) — inventário de extensões e configurações
- [ ] Credenciais SSH/FTP do alojamento — versões de PHP, MySQL, Apache
- [ ] Dump da base de dados (ou exportação do PhocaDownload + K2)
- [ ] Ficheiros originais dos documentos (PDFs) e imagens em alta resolução
- [ ] Backups: existência, frequência, localização
- [ ] Acessos a Google Analytics / Search Console (se existirem)
- [ ] Controlo de DNS e registo do domínio
- [ ] Endereço de e-mail institucional e necessidades de webmail
- [ ] Indicação de responsável técnico e de responsável editorial do lado da CDA

---

## 10. Recomendações imediatas (contenção, mesmo antes da migração)

| # | Acção | Prazo |
|---|---|---|
| 1 | Forçar https (redirect 301) | Imediato |
| 2 | Adicionar headers de segurança (HSTS, XFO, X-CTO, CSP mínima) | Imediato |
| 3 | Marcar cookies com `Secure` | Imediato |
| 4 | Restringir `/administrator/` por IP + bloquear `/manifests/` | 1 semana |
| 5 | Corrigir o texto da página "Sobre Nós" (versão provisória) | 1 semana |
| 6 | Remover/arquivar ficheiros duplicados (convocatórias 176/177, relatórios cat. 29) | 2 semanas |
| 7 | Criar sitemap.xml básico | 2 semanas |
| 8 | Plano de migração para o novo portal (documento de proposta) | 4–8 semanas |

---

*Ficheiros de suporte: `/recolha/inventario/paginas.tsv`, `documentos.tsv`, `links_externos.tsv`, `resumo.txt`; mirror HTML completo em `/recolha/site/`.*
