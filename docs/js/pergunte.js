/* Pergunte à CDA — pagina pergunte.html.
   Trata apenas o formulário de contacto (demonstração client-side).
   As perguntas frequentes usam o accordion nativo (<details>) do Design System. */
(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }

  document.addEventListener("DOMContentLoaded", function () {
    const form = el("faq-contact-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const resultado = el("faq-resultado");
      resultado.innerHTML = "";

      const nome = el("faq-nome").value.trim();
      const email = el("faq-email").value.trim();
      const assunto = el("faq-assunto").value.trim();
      const mensagem = el("faq-mensagem").value.trim();

      if (!nome || !email || !assunto || !mensagem) {
        const aviso = document.createElement("div");
        aviso.className = "callout callout--danger mt-4";
        aviso.setAttribute("role", "alert");
        const p = document.createElement("p");
        p.textContent = "Preencha todos os campos obrigatórios.";
        aviso.appendChild(p);
        resultado.appendChild(aviso);
        return;
      }

      const ok = document.createElement("div");
      ok.className = "callout callout--ok mt-4";
      ok.setAttribute("role", "status");
      const t = document.createElement("p");
      t.className = "callout__title";
      t.textContent = "Mensagem enviada";
      const p = document.createElement("p");
      p.textContent = "Obrigado, " + nome + ". Entraremos em contacto consigo em breve.";
      ok.appendChild(t); ok.appendChild(p);
      resultado.appendChild(ok);

      form.reset();
    });
  });
})();
