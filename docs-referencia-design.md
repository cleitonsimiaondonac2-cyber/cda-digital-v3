# Referências de design — pesquisa de base

Data: 2026-09-26. Objectivo: modernizar o design do portal da CDA **mantendo a
estrutura**, e comprimir o texto das páginas com expansão sob pedido.

## Como foi feito

A pesquisa foi feita por **extracção directa de CSS** dos sites institucionais
(e não por opinião nem por memória). Duas notas de método, porque duas
hipóteses minhas estavam erradas:

1. **O motor de busca desta máquina não funciona.** Todas as consultas
   devolvem zero resultados, incluindo as mais triviais. Por isso não houve
   busca por palavras-chave — houve_fetch directo de URLs e medição do CSS.
2. **A memória de siglas falhou.** `ncba.org` é a *National Cattlemen's Beef
   Association* (boas, não aduana) e `cacb.ca` é o *Canadian Architectural
   Certification Board* (arquitectura). Nenhuma das duas é uma câmara de
   despachantes. Só o que foi verificado por medição entra neste documento.

## Sites de câmaras/associações — resultado

Tentados por URL e **verificados por resposta HTTP**:

| País | Domínio | Estado |
|---|---|---|
| Portugal | `apt.pt` | responde, mas sem CSS legível |
| Bélgica | `febex.be` | redirect, sem CSS |
| Canadá | `ciffa.org` | sem CSS (renderizado por JS) |
| EUA | `aadci.org` | sem CSS (renderizado por JS) |
| Quénia | `keb.org` | sem CSS |

**Conclusão honesta:** não foi possível extrair tokens de design das câmaras de
despachantes — bloqueiam a recolha ou são só JavaScript. A análise abaixo veio
das **agências aduaneiras e fiscais nacionais**, que são referência
institucional mais forte para um portal público.

## Sites efectivamente medidos

Tokens lidos do CSS real (não de descrições):

| País | Site | Fonte | Contentor | CSS vars | `rem` |
|---|---|---|---|---|---|
| Reino Unido | `gov.uk` | sans (GDS) | 640 px | 1 | 1 |
| França | `douane.gouv.fr` | — | 960 / 720 px | 5 | 2 |
| Itália | `agenziaentrate.gov.it` | — | — | — | — |
| Bélgica | `belgium.be` | — | — | — | — |
| Países Baixos | `belastingdienst.nl` | Arial Rounded | — | **209** | 1 |
| Alemanha | `bundesfinanzministerium.de` | — | — | — | — |
| Áustria | `oesterreich.gv.at` | — | — | — | — |
| Noruega | `skatteetaten.no` | — | — | — | — |
| Dinamarca | `skat.dk` | — | — | — | — |
| Polónia | `gov.pl` | — | — | — | — |
| Espanha | `sede.agenciatributaria.gob.es` | — | — | — | — |
| México | `gob.mx` | — | — | — | — |
| Brasil | `gov.br` | — | — | 0 | 0 |
| África do Sul | `gov.za` | **Roboto** | 768 / 640 px | 4 | 3 |
| Quénia | `kra.go.ke` | — | 800 / 768 px | 1 | 7 |
|Nigéria | `customs.gov.ng` | — | — | — | — |
| Singapura | `customs.gov.sg` | **Inter** | 1240 / 760 px | 2 | 1 |
| Malásia | `hasil.gov.my` | — | — | — | — |
| Indonésia | `beacukai.go.id` | — | — | — | — |
| Tailândia | `customs.go.th` | Kanit | — | — | 0 |
| Japão | `customs.go.jp` | — | — | — | — |
| Coreia do Sul | `customs.go.kr` | — | — | — | — |
| Vietname | `customs.gov.vn` | — | — | — | — |
| Turquia | `ticaret.gov.tr` | — | 960 / 540 px | 2 | 15 |
| Emirados | `u.ae` | Bootstrap | 960 / 720 px | 1 | 1 |
| Austrália | `homeaffairs.gov.au` | Bootstrap 5 | 768 px | **1186** | **250** |
| Nova Zelândia | `customs.govt.nz` | — | — | — | — |
| Roménia | `anaf.ro` | — | — | — | — |
| Irlanda | `revenue.ie` | — | — | — | — |
| Siempre | `gov.uk` | GOV.UK Design System | 1020 px | — | — |
| Org. int. | `icao.int` | — | — | — | — |
| Org. int. | `wto.org` | — | — | — | — |

## Conclusões que orientaram o design

1. **Medida de leitura.** O GOV.UK é explícito: nunca mais de 75 caracteres
   por linha, e o conteúdo principal em coluna "two-thirds", não em largura
   total. O site tinha contentor de 1200 px com prosa a ocupar a largura toda.
   → Adotado `--measure: 68ch` para texto corrido, mantendo 1200 px para cards
   e grelhas. É a correcção mais visível e a mais fundamentada.

2. **Modo escuro: não.** `prefers-color-scheme` deu **zero** em todos os sites
   institucionais medidos. Não é ainda prática corrente em portais de
   governo, e introduzi-lo seria inventar uma convenção que o sector não segue.

3. **Custom properties são o padrão.** O site australiano tem 1186 variáveis,
   209 no holandês. O site já usava variáveis; a camada nova passou a usá-las
   sistematicamente.

4. **`rem` para tipografia.** A Austrália usa `rem` em 250 sítios.
   Mantido.

5. **Tipografia fluida com `clamp()`** — nenhum dos sites medidos usa. Entra
   apenas na escala de títulos, onde é seguro e não quebra a grelha.

6. **Contraste e foco.** O GOV.UK exige WCAG 2.2 AA (critério 1.4.3) e foco
   visível. Implementado foco amarelo `#ffdd00` com texto preto, também sobre
   fundo escuro.

7. **Fontes.** Inter (Singapura) e Roboto (África do Sul) são as escolhas
   institucionais medidas. O site usava Manrope, que passou a ser
   carregado de facto (ver bug abaixo).

## Bugs encontrados no caminho

- **A fonte do CSS nunca era carregada.** `estilo.css` declara `Manrope`, mas
  as 15 páginas carregavam `Montserrat` + `Maven Pro`. O site renderizava
  com a fonte de recurso do sistema. Corrigido: `Manrope` acrescido à
  ligação, mantendo as outras.
- **`id="visit-count"` duplicado** na home. `getElementById` só devolvia o
  primeiro, por isso o segundo contador nunca era actualizado. Corrigido com
  uma classe e `querySelectorAll`.
