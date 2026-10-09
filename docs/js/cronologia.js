/* CDA Digital 2.0 — Cronologia interactiva (S3.2.3)
   ------------------------------------------------------------------
   Linha do tempo vertical a partir de `data/timeline.json` (19 entradas,
   datas parciais possíveis com `data: null` → mostra só o ano).

   Montagem (M4): <div data-cronologia></div>

   Estrutura gerada (classes já existentes em css/sistema.css):
     <ol class="timeline">
       <li class="timeline__item" tabindex="-1">
         <details>
           <div class="timeline__date">29 SET 1960</div>
           <summary class="timeline__title">Decreto 43.199/60</summary>
           <p class="timeline__body">…</p>
         </details>
       </li>
     </ol>

   Teclado (cada entrada é focável):
     - Tab/Shift+Tab percorrem os <summary> (nativo do <details>)
     - ↑/↓ movem o foco entre entradas
     - Enter/Espaço expandem (nativo)

   Contrato de dados: CDA_DATA_LEITOR.timeline() com fallback fetch
   'data/timeline.json' (mesmo padrão de js/app.js). Sem dependências,
   sem módulos ES. */
(function () {
  "use strict";

  var RAIZ_SEL = "[data-cronologia]";
  var FONTE = "data/timeline.json";
  var MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
               "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  /* ---------- helpers ---------- */
  function el(tag, classe, texto) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = texto;
    return n;
  }

  // Data parcial tolerada: "1960-09-29" → "29 SET 1960"; null → "1960".
  function dataPT(reg) {
    var d = reg.data;
    if (!d) return reg.ano != null ? String(reg.ano) : "";
    var p = String(d).split("-");
    if (p.length !== 3) return String(d);
    var mes = parseInt(p[1], 10);
    return parseInt(p[2], 10) + " " + (MESES[mes - 1] || p[1]) + " " + p[0];
  }

  function lerJson(r) {
    var ct = (r.headers.get("Content-Type") || "").toLowerCase();
    if (!r.ok) throw new Error("resposta inesperada do servidor (" + r.status + ")");
    if (ct.indexOf("json") === -1 && ct.indexOf("text/plain") === -1) {
      throw new Error("resposta inesperada do servidor (" + r.status + ")");
    }
    return r.json().catch(function () { throw new Error("resposta inválida do servidor"); });
  }

  /* ---------- dados (contrato CDA_DATA_LEITOR + fallback fetch) ---------- */
  function carregar() {
    var leitor = window.CDA_DATA_LEITOR;
    var prontos = (leitor && typeof leitor.timeline === "function" && leitor.timeline()) || [];
    if (prontos.length) return Promise.resolve(prontos);
    var espera = (leitor && typeof leitor.ready === "function") ? leitor.ready() : Promise.resolve();
    return espera.then(function () {
      var deNovo = (leitor && typeof leitor.timeline === "function" && leitor.timeline()) || [];
      if (deNovo.length) return deNovo;
      if (typeof fetch !== "function") return [];
      return fetch(FONTE).then(lerJson).catch(function () { return []; });
    });
  }

  /* ---------- ordenação defensiva (o dataset já vem ordenado) ---------- */
  function ordenar(lista) {
    return lista.slice().sort(function (a, b) {
      var da = a.data || (a.ano != null ? a.ano + "-01-01" : "");
      var db = b.data || (b.ano != null ? b.ano + "-01-01" : "");
      if (da === db) return String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt");
      return da < db ? -1 : 1;
    });
  }

  /* ---------- render ---------- */
  function montarItem(reg, indice) {
    var li = el("li", "timeline__item");
    li.tabIndex = -1; // focável programaticamente (setas ↑/↓)
    li.setAttribute("data-indice", String(indice));

    var det = document.createElement("details");

    // <summary> é o 1.º filho (exigência do content model do <details>);
    // dentro dele: data em bloco + título — mantém a ordem visual desejada.
    var sum = el("summary", "timeline__title");
    var data = el("span", "timeline__date", dataPT(reg));
    data.style.display = "block";
    sum.appendChild(data);
    sum.appendChild(document.createTextNode(reg.titulo || "Sem título"));
    det.appendChild(sum);

    var corpo = el("p", "timeline__body", reg.descricao || "");
    det.appendChild(corpo);

    if (reg.categoria) {
      var badge = el("span", "badge badge--outline", reg.categoria);
      badge.style.display = "inline-block";
      badge.style.marginTop = "var(--sp-2)";
      det.appendChild(badge);
    }

    li.appendChild(det);
    return li;
  }

  function navegarTeclado(lista, e) {
    var k = e.key;
    if (k !== "ArrowDown" && k !== "ArrowUp") return;
    var foco = document.activeElement;
    if (!foco || !lista.contains(foco)) return;
    var itens = lista.querySelectorAll(".timeline__item");
    var actual = -1;
    for (var i = 0; i < itens.length; i++) {
      if (itens[i] === foco || itens[i].contains(foco)) { actual = i; break; }
    }
    if (actual === -1) return;
    var prox = k === "ArrowDown" ? actual + 1 : actual - 1;
    if (prox < 0 || prox >= itens.length) return;
    e.preventDefault();
    var sum = itens[prox].querySelector("summary");
    (sum || itens[prox]).focus();
  }

  /* ---------- arranque ---------- */
  function arrancar() {
    var raiz = document.querySelector(RAIZ_SEL);
    if (!raiz) return; // página sem o componente — sem erros

    raiz.textContent = "";
    var lista = el("ol", "timeline");
    raiz.appendChild(lista);

    var vazio = el("div", "empty-state");
    vazio.hidden = true;
    vazio.appendChild(el("h3", null, "Cronologia indisponível"));
    vazio.appendChild(el("p", null, "Não foi possível carregar as entradas da cronologia."));
    raiz.appendChild(vazio);

    function render(entries) {
      var regs = ordenar(Array.isArray(entries) ? entries : []);
      if (!regs.length) {
        lista.hidden = true;
        vazio.hidden = false;
        return;
      }
      lista.textContent = "";
      regs.forEach(function (reg, i) { lista.appendChild(montarItem(reg, i)); });
      lista.addEventListener("keydown", function (e) { navegarTeclado(lista, e); });
    }

    carregar().then(render).catch(function () { render([]); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrancar);
  } else {
    arrancar();
  }
})();
