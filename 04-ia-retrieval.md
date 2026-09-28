# 04 — Assistente CDA: IA de Retrieval + Ollama Cloud

**Data:** 20-08-2026 · **Âmbito:** motor de IA do portal CDA Digital 2.0 (demonstração funcional)

## O que foi construído

| Componente | Detalhe |
|---|---|
| **Extracção de texto** (`ia/ocr.py`) | 57 PDFs do acervo → 22 via camada de texto (pdftotext), 30 via OCR (Tesseract 5.5, língua `por`, 300 dpi) — **52/57 OK** |
| **Índice** (`ia/indexar.py`) | 1 117 chunks (~700 chars, sobreposição), stemização portuguesa (snowballstemmer), **BM25 puro em Python** → `ia/indice.json` |
| **Fontes de conhecimento** | 52 documentos oficiais + **9 páginas do site** (texto principal extraído com BeautifulSoup, sem nav/footer) + **9 notícias** (`dados.js`) + órgãos sociais + **bloco de factos institucionais** (`ia/factos_institucionais.txt`) sempre presente no contexto |
| **API** (`ia/api.py`, porta 8765) | `POST /ia/perguntar` (RAG + **multi-turn** via `historico`), `GET /ia/pesquisar?q=`, `GET /ia/documento?f=&q=`, `GET /ia/status` |
| **LLM** | **gpt-oss:120b** via Ollama Cloud (api.ollama.com), gratuito nesta conta. Chave só no servidor (`ia/.env`, fora do site) |
| **Assistente flutuante** (`js/assistente.js`) | **Botão fixo no canto inferior direito, em todas as 9 páginas** → caixa de diálogo (boas-vindas + sugestões, multi-turn, indicador do motor, `Esc` fecha, adaptado a mobile). Substitui os painéis embutidos; os 57 botões "Perguntar à IA" abrem o widget com o documento em foco |

## Regra de ouro (da proposta)

- Sem informação recuperada → resposta honesta *"Não encontrei informação suficiente no site e nos documentos oficiais disponíveis…"* + sugestão de contacto;
- As fontes (links para os PDFs ou páginas) são anexadas pelo backend a partir dos chunks — nunca geradas pelo LLM;
- Aviso permanente no painel: a IA não substitui o texto oficial dos diplomas.

## Testes efectuados (browser real, headless)

| Pergunta | Resultado |
|---|---|
| "Onde fica a CDA e quais os contactos?" | Morada (Edifício Central, Rua João Carlos Raposo Beirão, 508), tel. +258 21 305 504/506, email |
| "Quem é o presidente da CDA?" | **Salmate Chuaibo Daud** (factos institucionais, triénio 2024–2026) |
| "Como posso me tornar despachante aduaneiro?" | Concurso público, requisitos do Estatuto + Decreto 18/2011 |
| "Mostra as circulares de 2014" | Lista Circular 006/CDA/2014, 5/DGA/2014 e 005/CDA/2014, com fontes |
| "Qual a legislação que regula a actividade de despacho aduaneiro?" | Decreto n.º 18/2011, de 26 de Maio, com fonte real |
| Multi-turn: "…e quando foi aprovado o decreto?" | Responde 26 de Maio de 2011 (usa o contexto do turno anterior) |
| "Qual a cor favorita do presidente da CDA?" | Resposta honesta "Não encontrei informação suficiente…" |
| Fallback com API desligada | Responde pela pesquisa local (BM25), rotulado "modo offline" |
| Widget em 9/9 páginas | Botão presente e funcional (index, instituicao, despachantes, documentacao, noticias, galeria, parceiros, area-membro, contactos) |
| Mobile 375px | Caixa a 347px de largura, sem overflow horizontal; botão só com ícone |
| "Perguntar à IA" por documento | Abre o widget, indica "A responder sobre: …" e pré-preenche a pergunta com foco no documento |

## Achados do acervo (corrupção na origem)

5 PDFs estão **corrompidos no site da CDA** (sem trailer/XRef; download fresco idêntico — não é artefacto do crawl):
`ficha-de-inscricao-do-despachante-aduaneiro.pdf`, `ficha-de-registo-de-sociedades.pdf`,
`ficha-de-ajudante-de-despachante.pdf`, `ficha-de-praticante-de-despachante.pdf`,
`lei-n-6-2009-de-10-de-marco.pdf` (ghostscript recuperou só 1 das páginas).
Ficam fora do índice (5/57); **recomenda-se pedir os originais à CDA**.

## Como correr

```bash
cd /home/cleiton/projetos-software/cda/ia
./run.sh            # API em http://127.0.0.1:8765
# site (noutro terminal):
cd /home/cleiton/projetos-software/cda/site && python3 -m http.server 8000
# → http://localhost:8000/ (botão "Assistente CDA" no canto inferior direito)
```

Config em `ia/.env`: `IA_API_KEY`, `IA_MODELO` (default `gpt-oss:120b`), `IA_TOP_K`, `IA_TIMEOUT`.
Para re-indexar após alterar o acervo ou as páginas: `ia/venv/bin/python ia/indexar.py` e reiniciar a API.
DeepSeek V4 Flash requer subscrição na conta (testado); basta mudar `IA_MODELO=deepseek-v4-flash:0731`.

## Evolução para produção (servidor da CDA)

1. Docker Compose do sidecar (FastAPI + índice) — o pipeline actual migra tal qual;
2. Embeddings semânticos (bge-m3/ONNX) quando houver servidor com RAM;
3. LLM local (Ollama) numa VPS dedicada — mesma API, só muda `IA_URL`;
4. Ligação ao Joomla 5 via módulo que chama a API (a chave nunca sai do servidor).