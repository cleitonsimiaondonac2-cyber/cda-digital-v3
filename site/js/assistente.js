/* Assistente CDA — atendente flutuante (botão canto inferior + caixa de diálogo).
   Consulta a API local (RAG site + documentos via Ollama Cloud) com fallback
   offline por pesquisa local. Carregado em todas as páginas. */
(function () {
  "use strict";

  const IA_API = window.CDA_IA_API || (window.CDA_API_BASE || "http://127.0.0.1:8765");
  const HIST_MAX = 8;
  const BOAS_VINDAS =
    "Olá! Sou o Assistente CDA. Posso esclarecer dúvidas sobre a Câmara dos " +
    "Despachantes Aduaneiros de Moçambique, a profissão de despachante, " +
    "contactos, delegações e documentos oficiais. Como posso ajudar?";

  let historico = [];
  let docFoco = null;
  let aberto = false;

  const normaliza = (s) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  function criar() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "assist-btn";
    btn.id = "assist-btn";
    btn.setAttribute("aria-label", "Abrir o Assistente CDA");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '<span>Assistente CDA</span>';
    document.body.appendChild(btn);

    const box = document.createElement("div");
    box.className = "assist-box";
    box.id = "assist-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Assistente CDA");
    box.innerHTML =
      '<div class="assist-topo">' +
      '<h4>Assistente CDA</h4>' +
      '<div class="assist-topo-acoes">' +
      '<button type="button" class="assist-novo" title="Nova conversa">Novo</button>' +
      '<button type="button" class="assist-fechar" aria-label="Fechar">&#10005;</button>' +
      "</div></div>" +
      '<div class="assist-msgs" id="assist-msgs"></div>' +
      '<div class="assist-entrada">' +
      '<input id="assist-input" type="text" placeholder="Escreva a sua dúvida…" autocomplete="off" aria-label="Escreva a sua dúvida">' +
      '<button type="button" id="assist-enviar">Enviar</button>' +
      "</div>";
    document.body.appendChild(box);

    const msgs = box.querySelector("#assist-msgs");
    const input = box.querySelector("#assist-input");
    const enviar = box.querySelector("#assist-enviar");
    const novo = box.querySelector(".assist-novo");
    const fechar = box.querySelector(".assist-fechar");

    function abrir() {
      box.classList.add("aberta");
      btn.style.display = "none";
      aberto = true;
      if (msgs.children.length === 0) {
        mostrarBot(BOAS_VINDAS, null);
        historico = [];
      }
      setTimeout(() => input.focus(), 50);
    }

    function fecharBox() {
      box.classList.remove("aberta");
      btn.style.display = "";
      aberto = false;
    }

    btn.addEventListener("click", abrir);
    fechar.addEventListener("click", fecharBox);
    novo.addEventListener("click", () => {
      msgs.innerHTML = "";
      historico = [];
      docFoco = null;
      abrir();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && aberto) fecharBox();
    });

    function mostrarBot(mensagem, fontes, modo) {
      const bot = document.createElement("div");
      bot.className = "assist-msg bot";
      bot.textContent = mensagem;
      const esc = (s) =>
        String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      if (fontes && fontes.length) {
        const f = document.createElement("div");
        f.className = "assist-fontes";
        const links = fontes.map((x) => {
          const url = String(x.url || "");
          if (!/^https?:|^\/|^docs\//i.test(url) || url.indexOf("javascript:") === 0) return "";
          const rotulo = x.titulo + (x.ano ? " (" + x.ano + ")" : " · " + x.tipo);
          return '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(rotulo) + "</a>";
        }).filter(Boolean).join(" · ");
        if (links) {
          f.innerHTML = "<strong>Fontes:</strong> " + links;
          bot.appendChild(f);
        }
      }
      if (modo === "local") {
        const n = document.createElement("div");
        n.className = "assist-status";
        n.textContent = "Nota: assistente em modo de pesquisa local (sem modelo de linguagem).";
        bot.appendChild(n);
      }
      msgs.appendChild(bot);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function mostrarUsuario(texto) {
      const u = document.createElement("div");
      u.className = "assist-msg usr";
      u.textContent = texto;
      msgs.appendChild(u);
      msgs.scrollTop = msgs.scrollHeight;
    }

    function iaRespondeLocal(pergunta) {
      const termos = normaliza(pergunta).split(/\s+/).filter((t) => t.length > 2);
      const docs = (typeof CDA !== "undefined" && CDA.DOCUMENTOS) ? CDA.DOCUMENTOS : [];
      const pont = docs.map((d) => {
        const alvo = normaliza(d.titulo + " " + d.entidade + " " + d.tipo);
        let score = 0;
        termos.forEach((t) => {
          if (alvo.includes(t)) score++;
          if (normaliza(d.tipo).includes(t)) score += 2;
          if (normaliza(d.entidade).includes(t)) score += 1.5;
        });
        return { d, score };
      }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

      if (!pont.length) {
        return {
          txt: "Não encontrei informação suficiente no site e nos documentos oficiais disponíveis para responder com segurança. Contacte a CDA (tel. +258 21 305 504 / 305 506) ou consulte o Centro Documental.",
          fontes: [],
        };
      }
      let txt = "Com base nas informações disponíveis (site e documentos oficiais da CDA), encontrei os seguintes documentos relacionados com a sua pergunta:\n\n";
      pont.forEach((p) => { txt += "• " + p.d.titulo + " — " + p.d.entidade + ", " + p.d.ano + "\n"; });
      txt += "\nNota: resposta gerada por pesquisa local (sem modelo de linguagem). Abra as fontes para a informação completa.";
      return {
        txt,
        fontes: pont.map((p) => ({ titulo: p.d.titulo, ano: p.d.ano, tipo: p.d.tipo, url: p.d.url })),
      };
    }

    async function enviarMensagem(texto) {
      texto = (texto || "").trim();
      if (!texto) return;
      mostrarUsuario(texto);
      input.value = "";
      const ind = document.createElement("div");
      ind.className = "assist-msg bot";
      ind.textContent = "A pesquisar no site e na base documental…";
      msgs.appendChild(ind);
      msgs.scrollTop = msgs.scrollHeight;

      const corpo = { pergunta: texto, ficheiro: docFoco, historico: historico.slice(-HIST_MAX) };
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 30000);
        const r = await fetch(IA_API + "/ia/perguntar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
          signal: ctl.signal,
        });
        clearTimeout(t);
        if (!r.ok) throw new Error("http " + r.status);
        const d = await r.json();
        ind.remove();
        mostrarBot(d.resposta, d.fontes, d.modo);
        historico.push({ papel: "user", conteudo: texto });
        historico.push({ papel: "assistant", conteudo: d.resposta });
      } catch (e) {
        ind.remove();
        const local = iaRespondeLocal(texto);
        mostrarBot(local.txt, local.fontes, "local");
        historico.push({ papel: "user", conteudo: texto });
        historico.push({ papel: "assistant", conteudo: local.txt });
      }
      if (historico.length > HIST_MAX * 2) historico = historico.slice(-HIST_MAX * 2);
      docFoco = null;
    }

    enviar.addEventListener("click", () => enviarMensagem(input.value));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") enviarMensagem(input.value); });

    // Abertura a partir dos botões "Perguntar à IA" dos documentos
    window.CDA_IA = {
      abrir: function (ficheiro, titulo) {
        docFoco = ficheiro || null;
        abrir();
        if (titulo) {
          const b = document.createElement("div");
          b.className = "assist-docfoco";
          b.textContent = "A responder sobre: " + titulo;
          b.style.margin = "0 14px";
          msgs.insertAdjacentElement("afterend", b);
          setTimeout(() => b.remove(), 12000);
          input.value = "Sobre o documento «" + titulo + "»: ";
        }
      },
      perguntar: function (texto) {
        const q = (texto || "").trim();
        abrir();
        if (q) {
          input.value = "";
          enviarMensagem(q);
        }
      },
      fechar: fecharBox,
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", criar);
  } else {
    criar();
  }
})();