/* Pagina "Presidente" (presidente-single.html) — le ?id= e renderiza o perfil
   a partir de data/presidentes.json, usando o Design System CDA. */
(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }
  function setText(id, txt) { const n = el(id); if (n) n.textContent = txt; }

  function renderFeitos(feitos) {
    const alvo = el("pres-feitos");
    if (!alvo) return;
    alvo.innerHTML = "";
    if (!feitos || !feitos.length) {
      const li = document.createElement("li");
      li.textContent = "Sem registos.";
      alvo.appendChild(li);
      return;
    }
    feitos.forEach(function (f) {
      const li = document.createElement("li");
      li.textContent = f;
      alvo.appendChild(li);
    });
  }

  function renderDocs(docs) {
    const alvo = el("pres-docs");
    if (!alvo) return;
    alvo.innerHTML = "";
    if (!docs || !docs.length) {
      const li = document.createElement("li");
      li.textContent = "Sem documentos disponíveis.";
      alvo.appendChild(li);
      return;
    }
    docs.forEach(function (d) {
      const li = document.createElement("li");
      if (d.url && d.url !== "#") {
        const a = document.createElement("a");
        a.href = d.url;
        a.textContent = d.titulo;
        li.appendChild(a);
      } else {
        li.textContent = d.titulo;
      }
      alvo.appendChild(li);
    });
  }

  function mostrarErro(msg) {
    setText("pres-nome", "Presidente não encontrado");
    setText("pres-desc", msg);
    setText("pres-mandato", "");
  }

  document.addEventListener("DOMContentLoaded", function () {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      mostrarErro("Não foi indicado um presidente. Volte à lista de presidentes para escolher um perfil.");
      return;
    }
    fetch("data/presidentes.json")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (lista) {
        const p = lista.find(function (x) { return String(x.id) === String(id); });
        if (!p) { mostrarErro("O presidente indicado não foi encontrado."); return; }
        setText("pres-nome", p.nome);
        setText("pres-mandato", "Mandato: " + p.mandato);
        setText("pres-desc", p.descricao || "Sem descrição disponível.");
        renderFeitos(p.feitos);
        renderDocs(p.documentos);
      })
      .catch(function (err) {
        console.error("Erro ao carregar presidentes:", err);
        mostrarErro("Ocorreu um erro ao carregar os dados. Tente novamente mais tarde.");
      });
  });
})();
