/* CDA Digital 2.0 — interacções */
(function () {
  "use strict";

  // Parse JSON robusto: só faz .json() se o backend devolver JSON; senão lança
  // um erro claro (evita "Unexpected token '<'" quando recebe HTML/erro de proxy).
  function lerJson(r) {
    var ct = (r.headers.get("Content-Type") || "").toLowerCase();
    if (r.ok && ct.indexOf("application/json") === -1 && ct.indexOf("text/json") === -1) {
      return r.text().then(function (t) { throw new Error("resposta inesperada do servidor (" + r.status + ")"); });
    }
    return r.json().catch(function () {
      throw new Error("resposta inválida do servidor (" + r.status + ")");
    });
  }

  // ---- Menu móvel ----
  const menuBtn = document.getElementById("menu-btn");
  const nav = document.getElementById("nav");
  if (menuBtn && nav) {
    // O botão alternava a classe sem dizer nada a quem navega por leitor de
    // ecrã: aria-expanded não existia, por isso um utilizador de tecnologia
    // auxiliar não sabia se o menu estava aberto ou fechado. O estado é
    // refletido no botão e o botão é ligado ao menu que controla.
    if (!menuBtn.hasAttribute("aria-expanded")) menuBtn.setAttribute("aria-expanded", "false");
    if (!menuBtn.hasAttribute("aria-controls")) menuBtn.setAttribute("aria-controls", "nav");
    if (!nav.id) nav.id = "nav";

    const reflect = () => menuBtn.setAttribute("aria-expanded", nav.classList.contains("aberto") ? "true" : "false");
    menuBtn.addEventListener("click", () => { nav.classList.toggle("aberto"); reflect(); });
    reflect();

    // Fechar ao escolher uma ligação ou ao voltar ao desktop.
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) { nav.classList.remove("aberto"); reflect(); }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 900) { nav.classList.remove("aberto"); reflect(); }
    });
  }

  // ---- Marcador de página activa ----
  const SUBPAGE = { galeria: "noticias", actividades: "noticias", parceiros: "noticias", membro: "despachantes" };
  document.querySelectorAll("#nav a").forEach((a) => {
    const page = document.body.dataset.page;
    if (page && (a.dataset.pagina === page || a.dataset.pagina === SUBPAGE[page])) {
      if (a.dataset.pagina) a.classList.add("active");
    }
  });

  // ---- Título + metas dinâmicos ----
  const metas = document.querySelector("meta[name='description']");
  document.querySelectorAll("[data-titulo]").forEach((el) => {
    document.title = el.dataset.titulo + " — Câmara dos Despachantes Aduaneiros de Moçambique";
  });

  // ---- Centro Documental: filtros + pesquisa ----
  const qInput = document.getElementById("q");
  const fTipo = document.getElementById("f-tipo");
  const fAno = document.getElementById("f-ano");
  const fEnt = document.getElementById("f-ent");
  const lista = document.getElementById("doc-lista");
  const contador = document.getElementById("doc-cont");

  const TIPOS = ["Legislação", "Regulamentos", "Convocatórias", "Circulares", "Ordens de Serviço", "Exortações", "Relatórios", "Boletins", "Fichas de Inscrição", "Eventos"];
  const ORDENS = ["Ordens de Serviço"];

  function normaliza(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function filtraDocs() {
    const q = normaliza((qInput ? qInput.value : "") || "");
    const tipo = fTipo ? fTipo.value : "Todos";
    const ano = fAno ? fAno.value : "Todos";
    const ent = fEnt ? fEnt.value : "Todas";

    const res = CDA.DOCUMENTOS.filter((d) => {
      if (tipo !== "Todos" && d.tipo !== tipo) return false;
      if (ano !== "Todos" && String(d.ano) !== ano) return false;
      if (ent !== "Todas" && d.entidade !== ent) return false;
      if (q) {
        const alvo = normaliza(d.titulo + " " + d.entidade + " " + d.tipo);
        const termos = q.split(/\s+/);
        return termos.every((t) => alvo.includes(t));
      }
      return true;
    });
    renderDocs(res);
  }

  function esc(s) {
    return String(s == null ? "" : s);
  }

  function renderDocs(list) {
    if (!lista) return;
    if (contador) contador.textContent = list.length + " documento(s) encontrado(s)";
    lista.textContent = "";
    if (!list.length) {
      const vazio = document.createElement("div");
      vazio.className = "doc-item";
      const sp = document.createElement("span");
      sp.textContent = "Nenhum documento corresponde aos filtros seleccionados.";
      vazio.appendChild(sp);
      lista.appendChild(vazio);
      return;
    }
    list.forEach((d) => {
      const el = document.createElement("div");
      el.className = "doc-item";

      const meta = document.createElement("div");
      meta.className = "meta";
      const tipo = document.createElement("span");
      tipo.className = "tipo";
      tipo.textContent = esc(d.tipo);
      const titulo = document.createElement("span");
      titulo.textContent = esc(d.titulo);
      const ano = document.createElement("span");
      ano.className = "ano";
      ano.textContent = esc(d.entidade) + " · " + esc(d.ano);
      meta.appendChild(tipo);
      meta.appendChild(titulo);
      meta.appendChild(ano);
      el.appendChild(meta);

      const baixar = document.createElement("a");
      baixar.className = "baixar";
      baixar.href = esc(d.url);
      baixar.target = "_blank";
      baixar.rel = "noopener";
      baixar.textContent = "Abrir PDF";
      el.appendChild(baixar);

      const iaBtn = document.createElement("button");
      iaBtn.className = "ia-doc";
      iaBtn.type = "button";
      iaBtn.dataset.ficheiro = esc(d.ficheiro);
      iaBtn.dataset.titulo = esc(d.titulo);
      iaBtn.textContent = "Perguntar à CDA ✦";
      el.appendChild(iaBtn);

      lista.appendChild(el);
    });
  }

  if (lista) {
    if (fTipo) {
      TIPOS.forEach((t) => fTipo.add(new Option(t, t)));
    }
    if (fAno) {
      const anos = [...new Set(CDA.DOCUMENTOS.map((d) => d.ano).filter((a) => a != null && a !== ""))].sort((a, b) => b - a);
      anos.forEach((a) => fAno.add(new Option(String(a), String(a))));
    }
    if (fEnt) {
      const ents = [...new Set(CDA.DOCUMENTOS.map((d) => d.entidade))].sort();
      ents.forEach((e) => fEnt.add(new Option(e, e)));
    }
    [qInput, fTipo, fAno, fEnt].forEach((el) => el && el.addEventListener("input", filtraDocs));
    filtraDocs();

    // parâmetro ?q= vindo da homepage
    const qs = new URLSearchParams(location.search).get("q");
    if (qs && qInput) { qInput.value = qs; filtraDocs(); }

    // "Perguntar à IA" por documento → abre o Assistente flutuante
    lista.addEventListener("click", (e) => {
      const b = e.target.closest(".ia-doc");
      if (!b) return;
      if (window.CDA_IA) {
        window.CDA_IA.abrir(b.dataset.ficheiro, b.dataset.titulo);
      } else {
        const iaInputDoc = document.getElementById("ia-input");
        if (iaInputDoc) {
          iaInputDoc.value = "Sobre o documento «" + (b.dataset.titulo || "") + "»: ";
          iaInputDoc.focus();
        }
      }
    });
  }

  // ---- Lista de membros ----
  const bMembros = document.getElementById("busca-membros");
  const tMembros = document.getElementById("tabela-membros");
  const cMembros = document.getElementById("membros-cont");
  if (bMembros && tMembros && CDA.MEMBROS) {
    const corpo = tMembros.querySelector("tbody");
    function renderMembros() {
      const q = normaliza(bMembros.value);
      const res = CDA.MEMBROS.filter((m) => {
        if (!q) return true;
        return normaliza(m.nome + " " + m.carteira + " " + m.cedula).includes(q);
      });
      if (cMembros) cMembros.textContent = res.length + " de " + CDA.MEMBROS.length + " membros";
      corpo.textContent = "";
      res.forEach((m) => {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        td1.textContent = esc(m.carteira);
        const td2 = document.createElement("td");
        td2.textContent = esc(m.nome);
        const td3 = document.createElement("td");
        td3.textContent = esc(m.cedula);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        corpo.appendChild(tr);
      });
    }
    bMembros.addEventListener("input", renderMembros);
    renderMembros();
  }

  // ---- Notícias: expandir ----
  document.querySelectorAll("[data-noticia]").forEach((el) => {
    el.addEventListener("click", () => {
      const alvo = document.getElementById("noticia-" + el.dataset.noticia);
      if (alvo) alvo.classList.toggle("aberta");
      el.textContent = el.textContent.trim() === "Ler mais" ? "Fechar" : "Ler mais";
    });
  });

  // ---- Galeria: lightbox ----
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightbox-img");
  if (lb && lbImg) {
    document.querySelectorAll("[data-galeriasrc]").forEach((img) => {
      img.addEventListener("click", () => {
        lbImg.src = img.dataset.galeriasrc;
        lb.classList.add("aberta");
      });
    });
    lb.addEventListener("click", (e) => {
      if (e.target === lb || e.target.id === "lb-fechar") lb.classList.remove("aberta");
    });
  }

  // ---- Assistente IA → widget flutuante (js/assistente.js) ----
  // O botão "Conversar com o Assistente" (index) abre o widget
  const abreAssist = document.getElementById("assist-abre");
  if (abreAssist) {
    abreAssist.addEventListener("click", () => {
      if (window.CDA_IA) window.CDA_IA.abrir(null);
    });
  }

  // ---- Formulário de contacto (real → /api/contacto) ----
  const fContato = document.getElementById("form-contacto");
  if (fContato) {
    fContato.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = fContato.querySelector("button[type=submit]");
      const aviso = fContato.querySelector(".aviso-ok");
      const avisoErro = fContato.querySelector(".aviso-erro");
      if (aviso) aviso.style.display = "none";
      if (avisoErro) avisoErro.style.display = "none";
      if (btn) btn.disabled = true;
      const base = (window.CDA_API_BASE || "");
      fetch(base + "/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: document.getElementById("c-nome").value,
          email: document.getElementById("c-email").value,
          assunto: document.getElementById("c-assunto")
            ? document.getElementById("c-assunto").value : "",
          mensagem: document.getElementById("c-msg").value,
        }),
      }).then(function (r) {
        return lerJson(r).then(function (d) {
          if (!r.ok) throw new Error(d.detail || "falha no envio");
          if (aviso) aviso.style.display = "block";
          fContato.reset();
        });
      }).catch((err) => {
        if (avisoErro) { avisoErro.textContent = "Erro ao enviar: " + err.message; avisoErro.style.display = "block"; }
        else alert("Erro ao enviar: " + err.message);
      }).finally(() => { if (btn) btn.disabled = false; });
    });
  }

  // ---- Login real (área do membro → /api/auth) ----
  const fLogin = document.getElementById("form-login");
  if (fLogin) {
    fLogin.addEventListener("submit", (e) => {
      e.preventDefault();
      const base = (window.CDA_API_BASE || "");
      const aviso = document.getElementById("login-aviso");
      if (aviso) aviso.textContent = "";
      fetch(base + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: document.getElementById("l-user").value.trim(),
          senha: document.getElementById("l-pass").value,
        }),
      }).then(function (r) {
        return lerJson(r).then(function (d) {
          if (!r.ok) throw new Error(d.detail || "credenciais inválidas");
          const loginView = document.getElementById("login-view");
          const dash = document.getElementById("dash-view");
          if (loginView) loginView.style.display = "none";
          if (dash) {
            const nome = document.getElementById("dash-nome");
            if (nome) nome.textContent = d.nome || "Painel do membro";
            dash.style.display = "block";
          }
        });
      }).catch((err) => {
        if (aviso) aviso.textContent = err.message;
        else alert(err.message);
      });
    });
  }

  // ---- Registo (área do membro → /api/auth/registar) ----
  const fRegisto = document.getElementById("form-registo");
  if (fRegisto) {
    fRegisto.addEventListener("submit", (e) => {
      e.preventDefault();
      const base = (window.CDA_API_BASE || "");
      const msg = document.getElementById("registo-msg");
      const btn = fRegisto.querySelector("button[type=submit]");
      if (btn) btn.disabled = true;
      if (msg) msg.textContent = "";
      fetch(base + "/api/auth/registar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: document.getElementById("r-nome").value,
          email: document.getElementById("r-email").value,
          entidade: document.getElementById("r-entidade")
            ? document.getElementById("r-entidade").value : "",
          telefone: document.getElementById("r-telefone")
            ? document.getElementById("r-telefone").value : "",
          senha: document.getElementById("r-senha").value,
        }),
      }).then(function (r) {
        return lerJson(r).then(function (d) {
          if (!r.ok) throw new Error(d.detail || "falha no registo");
          if (msg) { msg.textContent = d.mensagem || "Conta criada. Já pode iniciar sessão."; msg.style.color = "#1c7c2f"; }
          fRegisto.reset();
        });
      }).catch((err) => {
        if (msg) msg.textContent = err.message;
        else alert(err.message);
      }).finally(() => { if (btn) btn.disabled = false; });
    });
  }

  // ---- Terminar sessão ----
  const terminSessao = document.getElementById("terminar-sessao");
  if (terminSessao) {
    terminSessao.addEventListener("click", (e) => {
      e.preventDefault();
      const base = (window.CDA_API_BASE || "");
      fetch(base + "/api/auth/logout", { method: "POST" }).catch(function () {}).finally(function () {
        location.reload();
      });
    });
  }

  // ---- Deslocar até ao formulário de registo ----
  const abreRegisto = document.getElementById("abre-registo");
  if (abreRegisto) {
    abreRegisto.addEventListener("click", (e) => {
      const alvo = document.getElementById("registo-box");
      if (alvo && alvo.scrollIntoView) {
        alvo.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
})();
