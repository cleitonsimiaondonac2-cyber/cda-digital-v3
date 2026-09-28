/* CDA Digital 2.0 — Arquivo de Actividades
   Renderiza o arquivo de actividades/eventos a partir de CDA.ACTIVIDADES.
   Constrói o DOM com textContent (XSS-safe), no padrão de app.js. */
(function () {
  "use strict";

  /* js/dados.js é gerado pelo painel admin e ainda traz dois registos
     "Seminario de Teste" do protótipo, datados de 2026-08-28 — ou seja, os
     mais recentes de todos. Filtramos aqui, no consumidor, e não em dados.js,
     para não perder a alteração na próxima geração do ficheiro. */
  var ACT = ((typeof CDA !== "undefined" && CDA.ACTIVIDADES) || []).filter(function (a) {
    return !/teste/i.test(a.titulo || "") && !/teste/i.test(a.descricao || "");
  });
  var NOT = (typeof CDA !== "undefined" && CDA.NOTICIAS) || [];
  var DOCS = (typeof CDA !== "undefined" && CDA.DOCUMENTOS) || [];

  var filtrosEl = document.getElementById("act-filtros");
  var destaqueEl = document.getElementById("act-destaque");
  var listaEl = document.getElementById("act-lista");
  var detailEl = document.getElementById("act-detail");
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");

  if (!listaEl || !ACT.length) return;

  var CATS = ["Reuniões", "Conferências", "Formação", "Eventos", "Visitas", "Institucional"];
  var estado = "todas";

  function dataPT(d) {
    if (!d) return "";
    var p = d.split("-");
    if (p.length !== 3) return d;
    var meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return parseInt(p[2], 10) + " " + meses[parseInt(p[1], 10) - 1] + " " + p[0];
  }

  function imgSrc(nome) { return "galeria/" + nome; }

  function abrirLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.add("aberta");
  }
  function fecharLightbox() { lightbox.classList.remove("aberta"); }

  function noticiaTitulo(act) {
    if (!act.noticia) return null;
    var n = NOT.find(function (x) { return x.titulo === act.noticia; });
    return n || null;
  }

  // ---- Filtros (Todas + categorias presentes) ----
  function renderFiltros() {
    filtrosEl.textContent = "";
    var cats = CATS.filter(function (c) {
      return ACT.some(function (a) { return a.categoria === c; });
    });
    var itens = [["todas", "Todas"]].concat(cats.map(function (c) { return [c, c]; }));
    itens.forEach(function (par) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "act-chip" + (estado === par[0] ? " ativo" : "");
      b.dataset.cat = par[0];
      b.textContent = par[1];
      b.addEventListener("click", function () { estado = par[0]; renderFiltros(); render(); });
      filtrosEl.appendChild(b);
    });
  }

  // ---- Destaque (editorial, foto grande) ----
  function renderDestaque(act) {
    destaqueEl.textContent = "";
    var art = document.createElement("article");
    art.className = "act-destaque";

    var media = document.createElement("div");
    media.className = "act-destaque-media";
    if (act.capas && act.capas.length) {
      var img = document.createElement("img");
      img.src = imgSrc(act.capas[0]);
      img.alt = act.titulo;
      media.appendChild(img);
      if (act.capas.length > 1) {
        var nf = document.createElement("span");
        nf.className = "act-contagem";
        nf.textContent = act.capas.length + " fotografias";
        media.appendChild(nf);
      }
    }

    var corpo = document.createElement("div");
    corpo.className = "act-destaque-corpo";
    var topo = document.createElement("div");
    topo.className = "act-titulo-linha";
    var cat = document.createElement("span");
    cat.className = "act-cat";
    cat.textContent = act.categoria;
    var data = document.createElement("span");
    data.className = "act-data";
    data.textContent = dataPT(act.data) + (act.local ? " · " + act.local : "");
    topo.appendChild(cat);
    topo.appendChild(data);

    var h = document.createElement("h2");
    h.textContent = act.titulo;
    var p = document.createElement("p");
    p.className = "act-desc";
    p.textContent = act.descricao;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-red";
    btn.textContent = "Ver cobertura →";
    btn.addEventListener("click", function () { abrirDetalhe(act.id); window.scrollTo({ top: detailEl.offsetTop - 90, behavior: "smooth" }); });

    corpo.appendChild(topo);
    corpo.appendChild(h);
    corpo.appendChild(p);
    corpo.appendChild(btn);
    art.appendChild(media);
    art.appendChild(corpo);
    destaqueEl.appendChild(art);
  }

  // ---- Lista de actividades (cartões) ----
  function renderLista(itens) {
    listaEl.textContent = "";
    if (!itens.length) {
      var v = document.createElement("p");
      v.className = "act-vazio";
      v.textContent = "Ainda não há actividades nesta categoria.";
      listaEl.appendChild(v);
      return;
    }
    itens.forEach(function (act) {
      var card = document.createElement("article");
      card.className = "act-card";
      var media = document.createElement("div");
      media.className = "act-card-media";
      if (act.capas && act.capas.length) {
        var img = document.createElement("img");
        img.src = imgSrc(act.capas[0]);
        img.alt = act.titulo;
        media.appendChild(img);
        var nf = document.createElement("span");
        nf.className = "act-contagem";
        nf.textContent = act.capas.length + " fotos";
        media.appendChild(nf);
      }
      var corpo = document.createElement("div");
      corpo.className = "act-card-corpo";
      var meta = document.createElement("div");
      meta.className = "act-meta";
      var cat = document.createElement("span");
      cat.className = "act-cat";
      cat.textContent = act.categoria;
      var data = document.createElement("span");
      data.className = "act-data-min";
      data.textContent = dataPT(act.data) + (act.local ? " · " + act.local : "");
      meta.appendChild(cat);
      meta.appendChild(data);
      var h = document.createElement("h3");
      h.textContent = act.titulo;
      var p = document.createElement("p");
      p.className = "act-card-desc";
      p.textContent = act.descricao;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "act-ver";
      btn.textContent = "Ver cobertura →";
      btn.addEventListener("click", function () { abrirDetalhe(act.id); window.scrollTo({ top: detailEl.offsetTop - 90, behavior: "smooth" }); });
      corpo.appendChild(meta);
      corpo.appendChild(h);
      corpo.appendChild(p);
      corpo.appendChild(btn);
      card.appendChild(media);
      card.appendChild(corpo);
      listaEl.appendChild(card);
    });
  }

  // ---- Detalhe de uma actividade (galeria + contexto) ----
  function abrirDetalhe(id) {
    detailEl.hidden = false;
    detailEl.textContent = "";
    var act = ACT.find(function (a) { return a.id === id; });
    if (!act) return;

    var fechar = document.createElement("button");
    fechar.type = "button";
    fechar.className = "act-fechar";
    fechar.textContent = "← Voltar às actividades";
    fechar.addEventListener("click", function () { detailEl.hidden = true; destaqueEl.scrollIntoView({ behavior: "smooth" }); });
    detailEl.appendChild(fechar);

    var cab = document.createElement("header");
    cab.className = "act-det-cab";
    var cat = document.createElement("span");
    cat.className = "act-cat";
    cat.textContent = act.categoria;
    var h = document.createElement("h2");
    h.textContent = act.titulo;
    var meta = document.createElement("p");
    meta.className = "act-det-meta";
    meta.textContent = dataPT(act.data) + (act.local ? " · " + act.local : "") + " · " + act.capas.length + " fotografias";
    cab.appendChild(cat);
    cab.appendChild(h);
    cab.appendChild(meta);
    var desc = document.createElement("p");
    desc.className = "act-det-desc";
    desc.textContent = act.descricao;
    cab.appendChild(desc);
    detailEl.appendChild(cab);

    // Galeria
    var gal = document.createElement("div");
    gal.className = "act-det-galeria";
    act.capas.forEach(function (nome) {
      var img = document.createElement("img");
      img.src = imgSrc(nome);
      img.alt = act.titulo;
      img.loading = "lazy";
      img.addEventListener("click", function () { abrirLightbox(imgSrc(nome)); });
      gal.appendChild(img);
    });
    detailEl.appendChild(gal);

    // Contexto: notícia relacionada + documentos relacionados + IA
    var ctx = document.createElement("div");
    ctx.className = "act-det-contexto";

    var n = noticiaTitulo(act);
    if (n) {
      var nb = document.createElement("div");
      nb.className = "act-ctx-bloco";
      var nt = document.createElement("h4");
      nt.textContent = "Notícia relacionada";
      var na = document.createElement("a");
      na.href = "noticias.html";
      na.textContent = n.titulo;
      nb.appendChild(nt);
      nb.appendChild(na);
      ctx.appendChild(nb);
    }

    var docsRel = (act.documentos || []).map(function (nome) {
      return DOCS.find(function (d) { return d.ficheiro === nome || d.url === nome; });
    }).filter(Boolean);
    if (docsRel.length) {
      var db = document.createElement("div");
      db.className = "act-ctx-bloco";
      var dt = document.createElement("h4");
      dt.textContent = "Documentos relacionados";
      db.appendChild(dt);
      docsRel.forEach(function (d) {
        var a = document.createElement("a");
        a.href = d.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = d.titulo;
        db.appendChild(a);
      });
      ctx.appendChild(db);
    }

    if (act.documentos && act.documentos.length) {
      var ib = document.createElement("div");
      ib.className = "act-ctx-bloco";
      var it2 = document.createElement("h4");
      it2.textContent = "Perguntar sobre esta actividade";
      var btnIA = document.createElement("button");
      btnIA.type = "button";
      btnIA.className = "btn btn-navy";
      btnIA.textContent = "Perguntar sobre os documentos desta actividade ✦";
      btnIA.addEventListener("click", function () {
        var d0 = DOCS.find(function (d) { return d.ficheiro === act.documentos[0] || d.url === act.documentos[0]; });
        var fich = d0 && d0.ficheiro ? d0.ficheiro : null;
        if (window.CDA_IA && typeof window.CDA_IA.abrir === "function") {
          window.CDA_IA.abrir(fich, d0 && d0.titulo ? d0.titulo : act.titulo);
        }
      });
      ib.appendChild(it2);
      ib.appendChild(btnIA);
      ctx.appendChild(ib);
    } else {
      var nb2 = document.createElement("div");
      nb2.className = "act-ctx-bloco";
      var nt3 = document.createElement("h4");
      nt3.textContent = "Consultar";
      var np = document.createElement("p");
      np.textContent = "Para mais informações sobre esta actividade, contacte a CDA através do formulário.";
      nb2.appendChild(nt3);
      nb2.appendChild(np);
      ctx.appendChild(nb2);
    }

    detailEl.appendChild(ctx);

    detailEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---- Arranque ----
  var ordem = ACT.slice().sort(function (a, b) { return b.data.localeCompare(a.data); });
  var destaque = ordem.find(function (a) { return a.destaque; }) || ordem[0];

  function render() {
    var lis = estado === "todas" ? ordem : ordem.filter(function (a) { return a.categoria === estado; });
    if (destaqueEl) renderDestaque(destaque);
    renderLista(lis);
  }

  renderFiltros();
  render();

  if (lightbox) {
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox || e.target.closest("#lb-fechar")) fecharLightbox(); });
  }
})();
