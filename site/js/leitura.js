/* ==========================================================================
   CDA — Leitura progressiva
   --------------------------------------------------------------------------
   O conteudo ja esta escrito com <details>/<summary> nativos, por isso este
   ficheiro e apenas um *melhoramento progressivo*:

     - sem JavaScript  -> os botoes "abrir tudo" desaparecem e cada secção
                           continua a funcionar individualmente
     - com JavaScript   -> aparece a barra de controlo, e a preferencia
                           fica guardada entre visitas

   Sem dependencias. Sem fetch. Sem innerHTML.
   ========================================================================== */

(function () {
  "use strict";

  var CHAVE = "cda:leitura:aberto";

  function lerPreferencia() {
    try {
      return window.localStorage.getItem(CHAVE);
    } catch (e) {
      return null; // modo privado / storage bloqueado
    }
  }

  function guardarPreferencia(v) {
    try {
      if (v === null) window.localStorage.removeItem(CHAVE);
      else window.localStorage.setItem(CHAVE, v);
    } catch (e) {
      /* sem storage: a preferencia vale só para esta visita */
    }
  }

  function blocosDaPagina() {
    return Array.prototype.slice.call(
      document.querySelectorAll("details.leitura")
    );
  }

  function montarControlo() {
    var blocos = blocosDaPagina();
    if (!blocos.length) return; // nada a controlar nesta página

    var guardados = lerPreferencia();
    // Sem preferencia guardada, o site abre tudo dobrado (o objectivo).
    // Se o visitante ja tinha aberto tudo, abrimos tudo.
    if (guardados === "todos") {
      blocos.forEach(function (b) { b.open = true; });
    }

    var barra = document.createElement("div");
    barra.className = "leitura-controlo";

    var nota = document.createElement("span");
    nota.className = "leitura-controlo__nota";
    nota.textContent =
      blocos.length === 1
        ? "1 secção com detalhe"
        : blocos.length + " secções com detalhe";
    barra.appendChild(nota);

    function sincronizarRotulos() {
      var algumAberto = blocos.some(function (x) { return x.open; });
      abrirBtn.textContent = algumAberto ? "Fechar tudo" : "Abrir tudo";
    }

    var abrirBtn = document.createElement("button");
    abrirBtn.type = "button";
    abrirBtn.className = "leitura-btn";
    abrirBtn.addEventListener("click", function () {
      var algumAberto = blocos.some(function (x) { return x.open; });
      blocos.forEach(function (x) { x.open = !algumAberto; });
      sincronizarRotulos();
      guardarPreferencia(algumAberto ? "nenhum" : "todos");
    });

    sincronizarRotulos();

    // Se o visitante abre uma secção à mão, o rótulo tem de acompanhar.
    blocos.forEach(function (b) {
      b.addEventListener("toggle", sincronizarRotulos);
    });

    barra.appendChild(abrirBtn);

    // insere antes do primeiro bloco de leitura da pagina
    var primeiro = blocos[0];
    primeiro.parentNode.insertBefore(barra, primeiro);
  }

  function marcarGatilho() {
    // Garante que o texto do <summary> nao fica com o cursor de mao: o
    // elemento e um botao, nao um link.
    blocosDaPagina().forEach(function (b) {
      var s = b.querySelector(":scope > summary");
      if (s) s.classList.add("leitura__gatilho");
    });
  }

  /* ----------------------------------------------------------------------
     Âncoras: o índice da Revista aponta para #editorial, #capa, etc. Esses
     `id` passaram a estar no <details>. Se alguém chega por um link directo
     (ou clica "Ir para a secção"), o bloco tem de abrir — caso contrário a
     página parece estar partido.
     ---------------------------------------------------------------------- */
  function abrirPorAncora() {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    var alvo = null;
    try {
      alvo = document.querySelector(hash);
    } catch (e) {
      return; // hash inválido: deixa o navegador tratar
    }
    if (!alvo) return;

    // Se o alvo está dentro de um bloco dobrado, abrir esse bloco
    var bloco = alvo.closest ? alvo.closest("details.leitura") : null;
    if (bloco) {
      bloco.open = true;
      if (bloco.querySelector(":scope > summary")) {
        bloco.querySelector(":scope > summary").classList.add("leitura__gatilho");
      }
    }
    if (typeof alvo.scrollIntoView === "function") {
      alvo.scrollIntoView({ block: "start" });
    }
  }

  function init() {
    marcarGatilho();
    montarControlo();
    abrirPorAncora();
    window.addEventListener("hashchange", abrirPorAncora);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
