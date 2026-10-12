(function () {
  function escapeHTML(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTaxonText(text) {
    const raw = String(text || "").trim();
    if (!raw) return raw;

    // Ordem, família e subfamília ficam sem itálico.
    // Exemplos: Coleoptera, Diptera, Chrysopidae, Braconidae, Aphidiinae.
    if (/^[A-Z][A-Za-z-]+$/.test(raw)) return escapeHTML(raw);
    if (/(idae|inae|ini)$/i.test(raw)) return escapeHTML(raw);

    // Gênero + sp. -> somente o gênero em itálico.
    let m = raw.match(/^([A-Z][a-zA-Z-]+)\s+(sp\.)$/);
    if (m) return `<em>${escapeHTML(m[1])}</em> ${escapeHTML(m[2])}`;

    // Espécie + autor/ano opcional -> gênero + epíteto em itálico;
    // autoria e ano permanecem em fonte normal.
    m = raw.match(/^([A-Z][a-zA-Z-]+)\s+([a-z][a-zA-Z-]+)(.*)$/);
    if (m) {
      return `<em>${escapeHTML(m[1])} ${escapeHTML(m[2])}</em>${escapeHTML(m[3])}`;
    }

    return escapeHTML(raw);
  }

  function fixCards(root = document) {
    root.querySelectorAll(".taxon").forEach((el) => {
      if (el.dataset.taxonomiaFormatada === "1") return;
      const original = el.textContent.trim();
      el.innerHTML = formatTaxonText(original);
      el.dataset.taxonomiaFormatada = "1";
    });
  }

  function fixDetail(root = document) {
    root.querySelectorAll(".detail-grid .label").forEach((label) => {
      if (label.textContent.trim() !== "Táxon validado") return;
      const value = label.nextElementSibling;
      if (!value || value.dataset.taxonomiaFormatada === "1") return;
      const original = value.textContent.trim();
      value.innerHTML = formatTaxonText(original);
      value.dataset.taxonomiaFormatada = "1";
    });
  }

  function applyFormatting(root = document) {
    fixCards(root);
    fixDetail(root);
  }

  applyFormatting();

  // O site cria cartões e fichas dinamicamente ao filtrar, paginar e abrir registros.
  // O observador reaplica a formatação sempre que novos elementos aparecem.
  const observer = new MutationObserver(() => applyFormatting());
  observer.observe(document.body, { childList: true, subtree: true });
})();
