// Configuração do portal CDA — endereço do backend
// O site estático (GitHub Pages) e o backend (API self-hosted) podem viver em origens
// diferentes. Aponte API_BASE para o host onde corre o FastAPI.
//
// Páginas estáticas servidas pelo próprio backend: usar "" (mesma origem).
// Páginas estáticas no GitHub Pages com backend separado (ex. Railway/Render/VPS):
//   const CDA_API_BASE = "https://cda-api.seuhost.app";
//
var CDA_API_BASE = (function () {
  // Backend explícito (definido fora deste ficheiro, ex. num <script> antes) tem prioridade.
  if (typeof window.CDA_API_OVERRIDE !== "undefined" && window.CDA_API_OVERRIDE) {
    return window.CDA_API_OVERRIDE;
  }
  var local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  // Servido pelo próprio backend (mesma origem): vazio → chamadas relativas funcionam.
  // Servido noutra origem SEM override: deixamos vazio para as chamadas irem para a
  // mesma origem (será o caso do GitHub Pages, onde o backend ainda não está exposto).
  return "";
})();

// Base da API de IA (mesmo backend). Preferida pelo assistente quando presente.
var CDA_IA_API = (typeof CDA_API_BASE !== "undefined" && CDA_API_BASE) || "";
