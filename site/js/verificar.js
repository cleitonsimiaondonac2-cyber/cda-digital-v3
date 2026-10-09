/* Verificação de despachantes — pagina verificar.html.
   Le data/despachantes.json (com fallback local) e pesquisa por código,
   nome ou cédula. Apenas registos públicos são apresentados. */
(function () {
  "use strict";

  const FALLBACK = [
    { id: "000100010912", nome: "Carlos F. Filomeno de Gama Afonso", cedula: "DESP / 001 / DGA / 03", estado: "REGISTADO", delegacao: "Maputo", publico: true },
    { id: "000200020913", nome: "Maria da Graça João", cedula: "DESP / 002 / DGA / 04", estado: "REGISTADO", delegacao: "Maputo", publico: true },
    { id: "000300030914", nome: "José Manuel da Silva", cedula: "DESP / 003 / DGA / 05", estado: "REGISTADO", delegacao: "Beira", publico: true }
  ];

  let despachantes = [];

  function el(id) { return document.getElementById(id); }

  function carregar() {
    fetch("data/despachantes.json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (dados) { despachantes = Array.isArray(dados) ? dados : FALLBACK; })
      .catch(function () { despachantes = FALLBACK; });
  }

  function normaliza(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function pesquisar(q) {
    const termo = normaliza(q);
    return despachantes.filter(function (d) {
      if (!d.publico) return false;
      return normaliza(d.id).indexOf(termo) !== -1 ||
             normaliza(d.nome).indexOf(termo) !== -1 ||
             normaliza(d.cedula).indexOf(termo) !== -1;
    });
  }

  function campo(rotulo, valor) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = rotulo + ": ";
    p.appendChild(strong);
    p.appendChild(document.createTextNode(valor || "N/A"));
    return p;
  }

  function mostrarResultado(d) {
    const box = el("verify-resultado");
    box.innerHTML = "";
    const card = document.createElement("div");
    card.className = "card";
    const body = document.createElement("div");
    body.className = "card__body";

    const estadoOk = d.estado === "REGISTADO";
    const badge = document.createElement("span");
    badge.className = "badge " + (estadoOk ? "badge--green" : "badge--amber");
    badge.textContent = estadoOk ? "Registo confirmado" : "Registo " + d.estado;
    body.appendChild(badge);

    const h3 = document.createElement("h3");
    h3.textContent = d.nome;
    body.appendChild(h3);

    body.appendChild(campo("Código profissional", d.id));
    body.appendChild(campo("Cédula", d.cedula));
    body.appendChild(campo("Delegação", d.delegacao));
    body.appendChild(campo("Estado", d.estado));

    const nota = document.createElement("p");
    nota.className = "text-xs text-muted mt-4";
    nota.textContent = "Informação oficial da Câmara dos Despachantes Aduaneiros de Moçambique.";
    body.appendChild(nota);

    card.appendChild(body);
    box.appendChild(card);
  }

  function mostrarMultiplos(lista) {
    const box = el("verify-resultado");
    box.innerHTML = "";
    const h = document.createElement("h3");
    h.textContent = "Foram encontrados " + lista.length + " resultados";
    box.appendChild(h);
    const ul = document.createElement("ul");
    ul.className = "stack mt-4";
    lista.forEach(function (d) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = d.nome + " (" + d.id + ")";
      a.addEventListener("click", function (e) { e.preventDefault(); mostrarResultado(d); });
      li.appendChild(a);
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function mostrarVazio(q) {
    const box = el("verify-resultado");
    box.innerHTML = "";
    const div = document.createElement("div");
    div.className = "empty-state";
    const icon = document.createElement("div");
    icon.className = "empty-state__icon";
    icon.textContent = "✕";
    const h3 = document.createElement("h3");
    h3.textContent = "Nenhum registo encontrado";
    const p = document.createElement("p");
    p.textContent = 'Não foi encontrado nenhum registo para "' + q + '".';
    div.appendChild(icon); div.appendChild(h3); div.appendChild(p);
    box.appendChild(div);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = el("verify-form");
    if (!form) return;
    const input = el("verify-code");
    carregar();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const q = input.value.trim();
      if (!q) {
        mostrarVazio("");
        input.focus();
        return;
      }
      const res = pesquisar(q);
      if (res.length === 0) mostrarVazio(q);
      else if (res.length === 1) mostrarResultado(res[0]);
      else mostrarMultiplos(res);
    });
  });
})();
