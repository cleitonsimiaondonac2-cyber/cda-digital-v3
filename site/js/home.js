/* CDA Digital 2.0 — Hero fotográfico editorial (homepage)
   Fundo alimentado automaticamente por CDA.ACTIVIDADES: cada diagnóstico
   mostra a fotografia de capa de uma actividade real, com overlay azul,
   mini-caption "CDA em Actividade" e navegação manual. */
(function () {
  "use strict";

  /* js/dados.js é gerado pelo painel admin e ainda traz dois registos
     "Seminario de Teste" do protótipo, datados de 2026-08-28 — o que os fazia
     ser os primeiros slides do hero. Filtramos aqui, no consumidor, e não em
     dados.js, para não perder a alteração na próxima geração do ficheiro. */
  var ACT = ((typeof CDA !== "undefined" && CDA.ACTIVIDADES) || []).filter(function (a) {
    return !/teste/i.test(a.titulo || "") && !/teste/i.test(a.descricao || "");
  });
  var slidesEl = document.getElementById("hero-slides");
  var dotsEl = document.getElementById("hero-dots");
  var capTit = document.getElementById("hero-foot-tit");
  var capMeta = document.getElementById("hero-foot-meta");
  var capLink = document.getElementById("hero-foot-link");
  var foot = document.getElementById("hero-foot-cap");
  var prevBtn = document.getElementById("hero-prev");
  var nextBtn = document.getElementById("hero-next");

  if (!slidesEl || ACT.length < 1) return;

  var ord = ACT.slice().sort(function (a, b) {
    var ra = a.relevancia || 0, rb = b.relevancia || 0;
    if (ra !== rb) return rb - ra;
    return String(b.data).localeCompare(String(a.data));
  });
  var cur = 0;
  var timer = null;
  var DELAY = 6000;

  // Versão HD (1400px) em galeria/hd/ — evita upscale da thumb 400px no hero
  function imgSrc(nome) {
    var base = String(nome).replace(/\.[a-z0-9]+$/i, "");
    return "galeria/hd/" + base + ".jpg";
  }

  function metaTexto(a) {
    var out = [];
    if (a.categoria) out.push(a.categoria);
    if (a.local) out.push(a.local);
    return out.join(" · ");
  }

  // Constrói as camadas de fundo (uma por actividade)
  ord.forEach(function (a, i) {
    var capa = (a.capas && a.capas[0]) || "";
    if (!capa) return;
    var s = document.createElement("div");
    s.className = "hero-slide";
    s.style.backgroundImage = "url('" + imgSrc(capa) + "')";
    if (i === 0) s.classList.add("active");
    slidesEl.appendChild(s);

    var d = document.createElement("button");
    d.type = "button";
    d.className = "hero-dot" + (i === 0 ? " active" : "");
    d.setAttribute("role", "tab");
    d.setAttribute("aria-label", "Actividade " + (i + 1));
    d.addEventListener("click", function () { irPara(i); });
    dotsEl.appendChild(d);
  });

  var slides = slidesEl.children;
  var dots = dotsEl.children;

  function go() {
    for (var i = 0; i < slides.length; i++) {
      slides[i].classList.toggle("active", i === cur);
      slides[i].classList.toggle("zoom", i === cur);
      dots[i].classList.toggle("active", i === cur);
    }
    var a = ord[cur];
    if (capTit) capTit.textContent = a.titulo;
    if (capMeta) capMeta.textContent = metaTexto(a);
    if (capLink) capLink.href = "actividades.html";
  }

  function irPara(i) {
    cur = (i + ord.length) % ord.length;
    go();
    reiniciar();
  }

  function avancar() { irPara(cur + 1); }
  function recuar() { irPara(cur - 1); }

  function reiniciar() {
    if (timer) clearTimeout(timer);
    if (!foot || !foot.classList.contains("paused")) {
      timer = setTimeout(avancar, DELAY);
    }
  }

  if (prevBtn) prevBtn.addEventListener("click", recuar);
  if (nextBtn) nextBtn.addEventListener("click", avancar);

  if (foot) {
    foot.addEventListener("mouseenter", function () {
      foot.classList.add("paused");
      if (timer) clearTimeout(timer);
    });
    foot.addEventListener("mouseleave", function () {
      foot.classList.remove("paused");
      reiniciar();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { avancar(); }
    else if (e.key === "ArrowLeft") { recuar(); }
  });

  go();
  reiniciar();
})();

/* CDA Digital 2.0 — Portal institucional (inspiração cta.org.mz)
   Bloco 2: Flash de notícias (ticker), Actualidade dinâmica e contadores.
   Tudo alimentado por CDA.NOTICIAS / CDA.MEMBROS de js/dados.js. */
(function () {
  "use strict";

  if (typeof CDA === "undefined") return;

  /* ------------------------------------------------------------------------
     Manifesto das fotografias normalizadas, gerado por
     tools/otimizar-imagens.sh. Se o ficheiro não carregar (ou estiver
     desatualizado), o site continua a usar os JPG originais — só perde a
     optimização, nunca a imagem.
     ------------------------------------------------------------------------ */
  var MANIFESTO = (function () {
    var vazio = {};
    try {
      var r = new XMLHttpRequest();
      r.open("GET", "img/editorial/manifesto.json", false); // síncrono de propósito:
      r.send(null);                                         // as imagens são
      if (r.status !== 200) return vazio;                   // desenhadas no
      var dados = JSON.parse(r.responseText);               // mesmo ciclo
      var m = {};
      (dados.noticias || []).forEach(function (n) { m[n.nome] = n; });
      return m;
    } catch (e) {
      return vazio;
    }
  })();

  /* "2026-07-15" -> "15 JUL 2026". A data já vem em ISO; não ha parsing
     de fuso horario a fazer, que era uma fonte de bugs comuns. */
  var MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  function formatarData(iso) {
    if (!iso) return "";
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return iso;
    return parseInt(m[3], 10) + " " + (MESES[parseInt(m[2], 10) - 1] || m[2]) + " " + m[1];
  }

  // Ordena notícias por data (mais recente primeiro), excluindo conteúdo de teste
  function noticiasOrdenadas() {
    var lista = (CDA.NOTICIAS || []).filter(function (n) {
      return !/teste/i.test(n.titulo || "");
    });
    return lista.sort(function (a, b) {
      var ra = a.relevancia || 0, rb = b.relevancia || 0;
      if (ra !== rb) return rb - ra;
      return String(b.data).localeCompare(String(a.data));
    });
  }

  // Formata "2026-01-28" -> "28-01-2026"
  function dataCurta(iso) {
    var p = String(iso || "").split("-");
    if (p.length !== 3) return iso || "";
    return p[2] + "-" + p[1] + "-" + p[0];
  }

  // 1) FLASH CDA — barra de notícias contínua (marquee simples)
  var flashEl = document.getElementById("flash-cda");
  var track = document.getElementById("flash-track");
  if (flashEl && track) {
    var recentes = noticiasOrdenadas().slice(0, 6);
    if (recentes.length > 0) {
      // flex: 0 0 auto — impede o encolhimento flex dos itens (texto nunca comprimido,
      // garantindo que o conteúdo excede a largura e o marquee pode correr).
      recentes.forEach(function (n) {
        var a = document.createElement("a");
        a.href = "noticias.html";
        a.style.flex = "0 0 auto";
        a.textContent = n.titulo + "  ·  " + dataCurta(n.data);
        track.appendChild(a);
      });

      // Largura real de um conjunto (medida antes de duplicar, com itens não encolhidos)
      var largura = track.scrollWidth;

      // Só anima se o conteúdo exceder a largura visível da pista
      if (largura > track.clientWidth) {
        // Duplica o conteúdo para um loop contínuo sem quebra visível
        Array.prototype.slice.call(track.children).forEach(function (item) {
          track.appendChild(item.cloneNode(true));
        });

        var delta = 0;
        var ativo = true;
        flashEl.addEventListener("mouseenter", function () { ativo = false; });
        flashEl.addEventListener("mouseleave", function () { ativo = true; });
        (function passo() {
          if (ativo) {
            delta += 1;
            if (delta >= largura) delta = 0;
            track.scrollLeft = delta;
          }
          window.requestAnimationFrame(passo);
        })();
      }
    }
  }

  // 2) ACTUALIDADE — 1 destaque grande + lista editorial
  //
  // As fotografias usam as versoes normalizadas em img/editorial/ (16:9, WebP
  // em 480/900/1600) com srcset, em vez dos originais soltos de 1,8 MB. Se o
  // manifesto nao existir, cai no caminho antigo — o site nunca fica sem imagem.
  var newsList = document.getElementById("news-list");
  if (newsList) {
    var recentes = noticiasOrdenadas();

    function varianteDe(nome) {
      if (!nome) return null;
      var chave = String(nome).replace(/^.*\//, "").replace(/\.(jpg|jpeg|png)$/i, "");
      if (!MANIFESTO[chave]) return null;
      return MANIFESTO[chave].variantes;
    }

    function temImagem(n) { return !!(n && n.imagem); }

    function imgEditorial(n, classe, sizes) {
      var v = varianteDe(n.imagem);
      var img = document.createElement("img");
      img.alt = n.titulo || "";
      img.loading = "lazy";
      img.decoding = "async";
      img.sizes = sizes;
      // O ponto focal vem do campo `foco` de cada noticia (ex.: "50% 20%"
      // para um retrato, que o corte 16:9 centraria no meio errado).
      // Definimos a variavel --foco e nao objectPosition em linha, para o
      // object-position do editorial.css ser a unica fonte de verdade.
      if (n.foco) { img.style.setProperty("--foco", n.foco); }
      if (v) {
        // O manifesto guarda caminhos relativos a img/ (ex.:
        // "editorial/x-900.webp"). Como o <img> vive numa pagina na raiz, o
        // caminho tem de levar o prefixo img/ — sem ele o browser pedia
        // /editorial/... e devolvia 404 em todas as fotografias.
        img.className = classe;
        img.src = "img/" + v[1].jpg;                                  // 900 px
        img.srcset = v.map(function (x) { return "img/" + x.webp + " " + x.w + "w"; }).join(", ");
        img.setAttribute("data-pj", "");
      } else {
        img.className = classe;
        img.src = n.imagem || "";
      }
      return img;
    }

    // --- o destaque ---
    var topo = recentes[0];
    if (topo) {
      var destaque = document.createElement("a");
      destaque.className = "news-destaque";
      destaque.href = "noticias.html";

      // Sem imagem, o destaque fica só com texto — nunca geramos <img src="">
      if (temImagem(topo)) {
        var mid = document.createElement("div");
        mid.className = "news-destaque__media";
        mid.appendChild(imgEditorial(topo, "", "(max-width: 760px) 100vw, 55vw"));
        destaque.appendChild(mid);
      }

      var corpoD = document.createElement("div");
      corpoD.className = "news-destaque__body";

      var catD = document.createElement("span");
      catD.className = "news-destaque__cat";
      catD.textContent = topo.categoria || "Actualidade";
      corpoD.appendChild(catD);

      var hD = document.createElement("h3");
      hD.textContent = topo.titulo || "";
      corpoD.appendChild(hD);

      // so a primeira frase: o resto fica na pagina de detalhe
      var txt = (topo.texto || "").split(/(?<=\.)\s+/)[0] || "";
      if (txt.length > 190) txt = txt.slice(0, 187).replace(/\s+\S*$/, "") + "…";
      if (txt) {
        var pD = document.createElement("p");
        pD.textContent = txt;
        corpoD.appendChild(pD);
      }

      var metaD = document.createElement("span");
      metaD.className = "news-destaque__meta";
      metaD.textContent = formatarData(topo.data);
      corpoD.appendChild(metaD);

      var maisD = document.createElement("span");
      maisD.className = "leia-mais";
      maisD.textContent = "Ler a notícia";
      corpoD.appendChild(maisD);

      destaque.appendChild(corpoD);
      newsList.appendChild(destaque);

      // --- a lista ---
      var resto = recentes.slice(1, 6);
      if (resto.length) {
        var lista = document.createElement("div");
        lista.className = "news-lista";
        resto.forEach(function (n) {
          var a = document.createElement("a");
          a.className = "news-item";
          a.href = "noticias.html";

          var m = document.createElement("div");
          m.className = "news-item__media";
          if (temImagem(n)) m.appendChild(imgEditorial(n, "", "(max-width: 560px) 96px, 172px"));
          else m.classList.add("news-item__media--vazia");
          a.appendChild(m);

          var c = document.createElement("div");
          var cat = document.createElement("span");
          cat.className = "news-item__cat";
          cat.textContent = n.categoria || "";
          c.appendChild(cat);

          var h4 = document.createElement("h4");
          h4.textContent = n.titulo || "";
          c.appendChild(h4);

          var t2 = document.createElement("time");
          t2.textContent = formatarData(n.data);
          c.appendChild(t2);

          a.appendChild(c);
          lista.appendChild(a);
        });
        newsList.appendChild(lista);
      }
    }
  }

  // 2b) PESQUISA DO HERO — procura nos dados que a pagina ja carregou
  //
  // Nao ha indice de pesquisa no servidor nem na API: isto pesquisa o que
  // esta em CDA.NOTICIAS e CDA.DOCUMENTOS (13 noticias + 58 documentos), que
  // e exactamente o conteudo que a home apresenta. Dizemos isso ao utilizador
  // em vez de fingir que e uma pesquisa global.
  var formBusca = document.getElementById("hero-search-form");
  var campoBusca = document.getElementById("hero-q");
  var secBusca = document.getElementById("pesquisa-resultados");
  var listaBusca = document.getElementById("pesquisa-lista");
  var tituloBusca = document.getElementById("pesquisa-tit");
  var limparBusca = document.getElementById("pesquisa-limpar");

  // "Assembleia" tem de encontrar "Assembleia" E "assembleia" E "Assembléia".
  function semAcentos(s) {
    return String(s == null ? "" : s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  // Posicao da primeira ocorrencia, ou -1 se nao existe. O melhor campo
  // escolhe-se com melhor(), porque Math.min(-1, 5) = -1 — um campo que bate
  // nunca pode ser anulado por um campo que nao bate.
  var NAO_ENCONTRADO = -1;
  function occurrence(haystack, needle) {
    var h = semAcentos(haystack);
    var i = h.indexOf(needle);
    return i < 0 ? NAO_ENCONTRADO : i;
  }

  // Menor posicao entre as que existirem; -1 se nenhuma existir.
  function melhor() {
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] >= 0) return arguments[i];
    }
    return NAO_ENCONTRADO;
  }

  function pesquisa(q) {
    var termo = semAcentos(q).trim();
    if (termo.length < 2) return null;

    var noticias = [];
    (CDA.NOTICIAS || []).forEach(function (n) {
      if (/teste/i.test(n.titulo || "")) return;
      var pos = melhor(
        occurrence(n.titulo, termo),
        occurrence(n.categoria, termo),
        occurrence(n.texto, termo)
      );
      if (pos >= 0) noticias.push({ n: n, p: pos });
    });
    noticias.sort(function (a, b) { return a.p - b.p; });

    var docs = [];
    (CDA.DOCUMENTOS || []).forEach(function (d) {
      var pos = melhor(
        occurrence(d.titulo, termo),
        occurrence(d.tipo, termo),
        occurrence(d.entidade, termo),
        occurrence(String(d.ano || ""), termo)
      );
      if (pos >= 0) docs.push({ d: d, p: pos });
    });
    docs.sort(function (a, b) { return a.p - b.p; });

    return { termo: termo, noticias: noticias.slice(0, 6), docs: docs.slice(0, 8), total: noticias.length + docs.length };
  }

  function desenharResultados(r) {
    if (!r) { secBusca.hidden = true; listaBusca.textContent = ""; return; }

    listaBusca.textContent = "";

    if (r.total === 0) {
      tituloBusca.textContent = 'Sem resultados para "' + r.termo + '"';
      var p0 = document.createElement("p");
      p0.className = "pesquisa-vazia";
      p0.textContent = "Não encontrámos notícias nem documentos com esta expressão. Tente uma palavra mais geral, como «circular», «regulamento» ou «formação».";
      listaBusca.appendChild(p0);
    } else {
      tituloBusca.textContent = r.total + (r.total === 1 ? " resultado" : " resultados") + ' para "' + r.termo + '"';

      if (r.noticias.length) {
        var hn = document.createElement("h3");
        hn.className = "pesquisa-grupo";
        hn.textContent = "Notícias";
        listaBusca.appendChild(hn);
        var un = document.createElement("ul");
        un.className = "pesquisa-itens";
        r.noticias.forEach(function (x) {
          un.appendChild(itemResultado(x.n.titulo, "noticias.html",
            (x.n.categoria || "") + (x.n.data ? " · " + formatarData(x.n.data) : "")));
        });
        listaBusca.appendChild(un);
      }

      if (r.docs.length) {
        var hd = document.createElement("h3");
        hd.className = "pesquisa-grupo";
        hd.textContent = "Documentos";
        listaBusca.appendChild(hd);
        var ud = document.createElement("ul");
        ud.className = "pesquisa-itens";
        r.docs.forEach(function (x) {
          var meta = [x.d.tipo, x.d.entidade, x.d.ano].filter(Boolean).join(" · ");
          var href = x.d.url || ("documentacao.html#" + (x.d.ficheiro || ""));
          ud.appendChild(itemResultado(x.d.titulo, href, meta));
        });
        listaBusca.appendChild(ud);
      }
    }
    secBusca.hidden = false;
  }

  function itemResultado(titulo, href, meta) {
    var li = document.createElement("li");
    li.className = "pesquisa-item";
    var a = document.createElement("a");
    a.href = href;
    a.textContent = titulo;                 // textContent: nada de innerHTML
    li.appendChild(a);
    if (meta) {
      var m = document.createElement("span");
      m.className = "pesquisa-item-meta";
      m.textContent = meta;
      li.appendChild(m);
    }
    return li;
  }

  if (formBusca && campoBusca && secBusca && listaBusca) {
    // Pesquisa ao escrever, mas só a partir de 3 letras, para não varrer os
    // dados a cada tecla. Debounce de 200 ms.
    var t;
    campoBusca.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (campoBusca.value.trim().length < 3) { secBusca.hidden = true; return; }
        desenharResultados(pesquisa(campoBusca.value));
      }, 200);
    });

    formBusca.addEventListener("submit", function (e) {
      e.preventDefault();
      clearTimeout(t);
      desenharResultados(pesquisa(campoBusca.value));
    });

    if (limparBusca) {
      limparBusca.addEventListener("click", function () {
        campoBusca.value = "";
        secBusca.hidden = true;
        listaBusca.textContent = "";
        campoBusca.focus();
      });
    }

    // O campo do cabeçalho (#head-q) é o MESMO acervo e aparecia na mesma
    // página, mas nunca foi ligado a nada: escrever e carregar em Enter
    // não faziam nada. Passa a_partilhar o mesmo comportamento e o mesmo
    // painel de resultados. Esvaziar um limpa os dois, para não ficar texto
    // morto num campo que já não reflecte o que está no ecrã.
    var campoCabecalho = document.getElementById("head-q");
    var formCabecalho = document.getElementById("head-search");
    if (campoCabecalho) {
      var t2;
      campoCabecalho.addEventListener("input", function () {
        clearTimeout(t2);
        t2 = setTimeout(function () {
          var v = campoCabecalho.value;
          if (v.trim().length < 3) { secBusca.hidden = true; return; }
          desenharResultados(pesquisa(v));
        }, 200);
      });

      // Se o utilizador escreve no cabeçalho, o campo do herói deixa de
      // reflectir o estado — limpamos para não haver dois textos diferentes.
      campoCabecalho.addEventListener("input", function () {
        if (campoBusca.value !== campoCabecalho.value) campoBusca.value = campoCabecalho.value;
      });

      if (formCabecalho) {
        formCabecalho.addEventListener("submit", function (e) {
          e.preventDefault();
          clearTimeout(t2);
          desenharResultados(pesquisa(campoCabecalho.value));
        });
      }

      if (limparBusca) {
        limparBusca.addEventListener("click", function () { campoCabecalho.value = ""; });
      }
    }
  }

  // 2c) Botao "Abrir assistente" da barra lateral.
  // O assistente.js cria o proprio botao flutuante (#assist-btn) e so expoe a
  // acao por ese clique. Em vez de duplicar a UI do assistente, delegamos nele.
  var botaoAssistente = document.getElementById("abrir-assistente");
  if (botaoAssistente) {
    botaoAssistente.addEventListener("click", function () {
      var flutuante = document.getElementById("assist-btn");
      if (flutuante) flutuante.click();
    });
  }

  // 3) Contador de membros real
  var membrosCount = document.getElementById("membros-count");
  if (membrosCount && CDA.MEMBROS && CDA.MEMBROS.length) {
    membrosCount.textContent = String(CDA.MEMBROS.length);
  }

  // 4) NEWSLETTER — subscrição simples (feedback local, sem backend)
  var nlForm = document.getElementById("newsletter-form");
  var nlOk = document.getElementById("newsletter-ok");
  if (nlForm) {
    nlForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var em = document.getElementById("newsletter-email");
      var valor = (em && em.value || "").trim();
      if (valor && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valor)) {
        em.value = "";
        if (nlOk) nlOk.hidden = false;
        try { localStorage.setItem("cda-newsletter", valor); } catch (_) {}
      } else {
        em.focus();
        em.style.borderColor = "#ff6b6b";
      }
    });
  }

  // 5) PARCEIROS — carrossel contínuo de instituições parceiras
  var parceirosTrack = document.querySelector(".parceiros-track");
  if (parceirosTrack) {
    // Todos os itens mostram LOGO + NOME juntos (logo img com alt + span com o nome)
    var parceiros = [
      { tipo: "logo", src: "img/parceiros/at.png", nome: "Autoridade Tributária de Moçambique" },
      { tipo: "logo", src: "img/parceiros/alfandegas-fallback.svg", nome: "Alfândegas de Moçambique" },
      { tipo: "logo", src: "img/parceiros/mef.png", nome: "Ministério da Economia e Finanças" },
      { tipo: "logo", src: "img/parceiros/mic.png", nome: "Ministério da Indústria e Comércio" },
      { tipo: "logo", src: "img/parceiros/cta.png", nome: "Confederação das Associações Económicas (CTA)" },
      { tipo: "logo", src: "img/parceiros/ccm-fallback.svg", nome: "Câmara de Comércio de Moçambique" },
      { tipo: "logo", src: "img/parceiros/apiex.png", nome: "Agência para a Promoção de Investimentos e Exportações (APIEX)" },
      { tipo: "logo", src: "img/parceiros/igeze-fallback.svg", nome: "Instituto de Gestão de Zonas Económicas Especiais (IGEZE)" },
      { tipo: "logo", src: "img/parceiros/jue-fallback.svg", nome: "Janela Única Electrónica (JUE)" },
      { tipo: "logo", src: "img/parceiros/asapra-fallback.svg", nome: "ASAPRA" },
      { tipo: "logo", src: "img/parceiros/fiata.svg", nome: "FIATA" },
      { tipo: "logo", src: "img/parceiros/wco.png", nome: "Organização Mundial das Alfândegas (OMA/WCO)" },
      { tipo: "logo", src: "img/parceiros/bancomoc.png", nome: "Banco de Moçambique" }
    ];
    parceiros.forEach(function (p) {
      var item = document.createElement("span");
      item.className = "parceiros-item parceiros-item-logo";
      var img = document.createElement("img");
      img.className = "parceiros-item-img";
      img.src = p.src;
      img.alt = p.nome;
      // NÃO usar loading="lazy" aqui. A pista tem ~5 800 px de largura e o
      // browser só carrega o que está perto da janela de visualização:
      // com "lazy" carregavam 12 de 13 logos só depois de fazer scroll, e a
      // 13.ª nunca chegava a carregar — o resultado eram espaços vazios a
      // meio da animação. Depois de recortar e reduzir, as 13 logos pesam
      // 89 KB, por isso carregá-las de imediato é razoável.
      img.decoding = "async";
      var nome = document.createElement("span");
      nome.className = "parceiros-item-nome";
      nome.textContent = p.nome;
      item.appendChild(img);
      item.appendChild(nome);
      parceirosTrack.appendChild(item);
    });
    // Duplica para loop contínuo (animation translateX -50%). A duplicação
    // tem de acontecer DEPOIS de as imagens terem tamanho: com o carregamento
    // assíncrono, um clone feito cedo ficaria com a imagem por carregar e
    // mudaria de largura a meio do ciclo.
    var duplicar = function () {
      if (parceirosTrack.dataset.duplicado) return;
      parceirosTrack.dataset.duplicado = "1";
      Array.prototype.slice.call(parceirosTrack.children).forEach(function (item) {
        var copia = item.cloneNode(true);
        // Um id repetido no DOM seria inválido; o alt deixa de ser necessário
        // na cópia porque é a mesma imagem vista outra vez.
        var imgCopia = copia.querySelector("img");
        if (imgCopia) imgCopia.alt = "";
        parceirosTrack.appendChild(copia);
      });
    };
    if (parceirosTrack.getBoundingClientRect().width > 0) duplicar();
    else window.addEventListener("load", duplicar, { once: true });

    // Pausa/retomar. O WCAG 2.2.2 exige um mecanismo para travar conteúdo que
    // se move sozinho durante mais de 5 segundos; a animação é de 46 s.
    var btnParceiros = document.getElementById("parceiros-btn");
    var textoParceiros = document.getElementById("parceiros-btn-texto");
    var iconeParceiros = document.getElementById("parceiros-btn-icone");
    if (btnParceiros) {
      var parado = false;
      btnParceiros.addEventListener("click", function () {
        parado = !parado;
        parceirosTrack.classList.toggle("parceiros-parado", parado);
        btnParceiros.setAttribute("aria-pressed", parado ? "true" : "false");
        if (textoParceiros) textoParceiros.textContent = parado ? "Retomar" : "Pausar";
        if (iconeParceiros) iconeParceiros.textContent = parado ? "▶" : "❙❙";
      });
      btnParceiros.setAttribute("aria-pressed", "false");
    }
  }

  // 6) CONTADOR DE VISITAS — persistência local simples
  // A home mostra o contador em dois sítios diferentes, por isso actualizam-se
  // todos os elementos com a classe (o id repetir-se-ia e getElementById só
  // devolveria o primeiro).
  var visitEls = document.querySelectorAll(".visit-count, #visit-count");
  if (visitEls.length) {
    var n = 0;
    try { n = parseInt(localStorage.getItem("cda-visitas") || "0", 10) || 0; } catch (_) {}
    n += 1;
    try { localStorage.setItem("cda-visitas", String(n)); } catch (_) {}
    Array.prototype.forEach.call(visitEls, function (el) {
      el.textContent = String(n);
    });
  }
})();
