/* Denúncia de fraude — pagina denunciar.html.
   Demonstração client-side: guarda a denúncia no localStorage do navegador
   e apresenta um número de referência. NÃO envia dados para nenhum servidor. */
(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }

  document.addEventListener("DOMContentLoaded", function () {
    const form = el("report-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const resultado = el("report-resultado");
      resultado.innerHTML = "";

      const tipo = el("report-tipo").value;
      const urgencia = el("report-urgencia").value;
      const titulo = el("report-titulo").value.trim();
      const descricao = el("report-descricao").value.trim();

      if (!tipo || !urgencia || !titulo || !descricao) {
        const aviso = document.createElement("div");
        aviso.className = "callout callout--danger mt-4";
        aviso.setAttribute("role", "alert");
        const t = document.createElement("p");
        t.className = "callout__title";
        t.textContent = "Campos obrigatórios";
        const p = document.createElement("p");
        p.textContent = "Preencha o tipo, a urgência, o título e a descrição da denúncia.";
        aviso.appendChild(t); aviso.appendChild(p);
        resultado.appendChild(aviso);
        return;
      }

      const documentos = el("report-doc").files ? el("report-doc").files.length : 0;
      const referencia = "CDA-" + Date.now().toString(36).toUpperCase();

      const denuncia = {
        referencia: referencia,
        tipo: tipo,
        urgencia: urgencia,
        titulo: titulo,
        descricao: descricao,
        data: el("report-data").value,
        local: el("report-local").value.trim(),
        documentos: documentos,
        email: el("report-contato-email").value.trim(),
        telefone: el("report-contato-telefone").value.trim(),
        anonimato: el("report-anonimato").checked,
        submetido: new Date().toISOString()
      };

      try {
        const guardadas = JSON.parse(localStorage.getItem("cda_denuncias") || "[]");
        guardadas.push(denuncia);
        localStorage.setItem("cda_denuncias", JSON.stringify(guardadas));
      } catch (err) {
        console.error("Não foi possível guardar a denúncia localmente:", err);
      }

      const ok = document.createElement("div");
      ok.className = "callout callout--ok mt-4";
      ok.setAttribute("role", "status");
      const t = document.createElement("p");
      t.className = "callout__title";
      t.textContent = "Denúncia submetida";
      const p = document.createElement("p");
      p.textContent = "O seu número de referência é " + referencia + ". Guarde-o para acompanhar o estado da denúncia.";
      const p2 = document.createElement("p");
      p2.className = "text-xs";
      p2.textContent = "Demonstração: os dados foram guardados apenas no seu navegador.";
      ok.appendChild(t); ok.appendChild(p); ok.appendChild(p2);
      resultado.appendChild(ok);

      form.reset();
      resultado.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})();
