# 📁 Conteúdo Organizado — CDA Digital

> **Objectivo:** Organizar todo o conteúdo do portal CDA Digital para que qualquer agente de IA
> possa facilmente entender, actualizar ou continuar a construir o site.

---

## 📊 Estrutura

```
content/
├── README.md                    ← Este ficheiro (visão geral)
├── CONTEUDO-GERAL.md            ← Informações institucionais da CDA
├── noticias/                    ← Notícias organizadas individualmente (16 ficheiros)
├── eventos/                     ← Eventos/actividades organizados (6 ficheiros)
├── documentos/                  ← Documentos oficiais indexados
├── paginas/                     ← Conteúdo das páginas do site
└── imagens/                     ← Imagens organizadas por categoria
    ├── noticias/                ← 16 imagens de notícias
    ├── eventos/                 ← 22 imagens de eventos (galeria HD)
    ├── revista/                 ← 48 páginas da revista
    ├── pessoas/                 ← 2 fotos de dirigentes
    ├── parceiros/               ← 13 logos de parceiros
    ├── logos/                   ← Logos da CDA
    └── arquivo/baixa-qualidade/ ← Screenshots arquivados
```

---

## 📰 Notícias (16 artigos)

| # | Título | Data | Categoria | Imagem |
|---|--------|------|-----------|--------|
| 001 | CTA celebra Dia dos Despachantes | 2026-09-25 | Institucional | cooperacao-at.jpg |
| 002 | CDA e AT reforçam cooperação | 2026-03-30 | Cooperação | cooperacao-at.jpg |
| 003 | Visita Tribunal Sofala à CDA Beira | 2025-10-27 | Institucional | justica-aduaneira.jpg |
| 004 | Líderes femininas aduaneiras ASAPRA | 2026-07-15 | Internacional | asapra-brasil.jpg |
| 005 | O Despachante regressa | 2026-07-15 | Editorial | capa-julho-2026.jpg |
| 006 | CDA Vice-Presidência ASAPRA | 2026-07-15 | Internacional | asapra-brasil.jpg |
| 007 | Quadros CDA na CTA e CCM | 2026-07-15 | Representação | representacao-privado.jpg |
| 008 | Facilitação do comércio | 2026-07-15 | Facilitação | facilitacao-comercio.jpg |
| 009 | Convénio São Paulo | 2026-07-15 | Cooperação | convenio-sao-paulo.jpg |
| 010 | Formação Regras de Origem | 2026-07-15 | Formação | formacao-regras-origem.jpg |
| 011 | Conferência OMA Emirados | 2026-07-15 | Internacional | futuro-digital.jpg |
| 012 | Workshop conformidade | 2026-07-15 | Conformidade | conformidade-integridade.jpg |
| 013 | IFCBA Japão | 2026-07-15 | Internacional | cupula-mundial-japao.jpg |
| 014 | Intercâmbio São Tomé | 2026-07-15 | Lusofonia | lusofonia.jpg |
| 015 | Solidariedade Marracuene | 2026-07-15 | Resp. Social | solidariedade-cheias.jpg |
| 016 | Entrevista Sábito Romeu | 2026-07-15 | Entrevista | entrevista-sabito-romeu.jpg |

---

## 🎯 Eventos (6 actividades)

| # | Evento | Data | Local | Destaque |
|---|--------|------|-------|----------|
| 001 | Dia dos Despachantes 2026 | 2026-09-14 | Maputo | ⭐ |
| 002 | Reunião CDA e AT | 2026-03-30 | Maputo | ⭐ |
| 003 | Visita Tribunal Sofala | 2025-10-27 | Beira | |
| 004 | XXVI AGO | 2024-11-17 | Maputo | ⭐ |
| 005 | Tomada de posse | 2024-10-29 | Maputo | |
| 006 | Actividades Q4 2024 | 2024-12-16 | Moçambique | |

---

## 🖼️ Imagens — Resumo

| Categoria | Quantidade | Tamanho total |
|-----------|-----------|---------------|
| Notícias | 16 | ~10 MB |
| Eventos (HD) | 22 | ~4 MB |
| Revista | 48 | ~4 MB |
| Pessoas | 2 | ~2.6 MB |
| Parceiros | 13 | ~200 KB |
| Logos | 2 | ~80 KB |
| Arquivo | 2 | ~230 KB |
| **Total** | **105** | **~21 MB** |

---

## ⚠️ Imagens de Baixa Qualidade (Arquivadas)

| Ficheiro | Problema | Acção |
|----------|----------|-------|
| 11-screenshot-*.jpg | Screenshot de ecrã | Substituir por foto profissional |
| 12-screenshot-*.jpg | Screenshot de ecrã | Substituir por foto profissional |

---

## 🔧 Como Usar

### Para actualizar notícias:
1. Ler o ficheiro em `noticias/` correspondente
2. Actualizar texto, data ou imagem conforme necessário
3. A imagem associada está indicada no frontmatter

### Para adicionar nova notícia:
1. Criar ficheiro `noticias/NNN-slug-curto.md` com o template
2. Adicionar imagem em `imagens/noticias/` com nome descritivo
3. Actualizar `js/dados.js` no site com os novos dados

### Para actualizar eventos do hero banner:
1. Ler os ficheiros em `eventos/`
2. As imagens do hero vêm de `imagens/eventos/` (galeria HD)
3. Actualizar `js/dados.js` na secção ACTIVIDADES
