(function () {
  function escapeHTML(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatSimpleTaxon(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";

    // Ordens, famílias, subfamílias e outros níveis supragenéricos:
    // ficam sem itálico.
    if (/^[A-Z][A-Za-z-]+$/.test(text)) return escapeHTML(text);
    if (/(idae|inae|ini)$/i.test(text)) return escapeHTML(text);

    // Gênero + sp.
    let m = text.match(/^([A-Z][a-zA-Z-]+)\s+(sp\.)$/);
    if (m) return `<em>${escapeHTML(m[1])}</em> ${escapeHTML(m[2])}`;

    // Espécie + autoria opcional.
    m = text.match(/^([A-Z][a-zA-Z-]+)\s+([a-z][a-zA-Z-]+)(.*)$/);
    if (m) {
      return `<em>${escapeHTML(m[1])} ${escapeHTML(m[2])}</em>${escapeHTML(m[3])}`;
    }

    // Gênero isolado.
    m = text.match(/^([A-Z][a-zA-Z-]+)$/);
    if (m) return `<em>${escapeHTML(m[1])}</em>`;

    return escapeHTML(text);
  }

  function formatValidatedTaxon(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";

    // Trata cadeias mistas separadas por ponto e vírgula, por exemplo:
    // "Ichneumonidae; Ophion sp."
    // "Scelionidae; Calliscelio sp."
    const parts = text.split(";").map(p => p.trim());

    return parts.map(part => {
      if (!part) return "";

      // Família/subfamília/ordem: sem itálico.
      if (/^[A-Z][A-Za-z-]+$/.test(part) || /(idae|inae|ini)$/i.test(part)) {
        return escapeHTML(part);
      }

      // Gênero + sp.
      let m = part.match(/^([A-Z][a-zA-Z-]+)\s+(sp\.)$/);
      if (m) return `<em>${escapeHTML(m[1])}</em> ${escapeHTML(m[2])}`;

      // Espécie + autoria opcional.
      m = part.match(/^([A-Z][a-zA-Z-]+)\s+([a-z][a-zA-Z-]+)(.*)$/);
      if (m) {
        return `<em>${escapeHTML(m[1])} ${escapeHTML(m[2])}</em>${escapeHTML(m[3])}`;
      }

      // Gênero isolado.
      m = part.match(/^([A-Z][a-zA-Z-]+)$/);
      if (m) return `<em>${escapeHTML(m[1])}</em>`;

      return escapeHTML(part);
    }).join("; ");
  }

  function fixCards(root = document) {
    root.querySelectorAll(".taxon").forEach((el) => {
      const original = el.textContent.trim();
      el.innerHTML = formatSimpleTaxon(original);
    });
  }

  function fixDetail(root = document) {
    root.querySelectorAll(".detail-grid .label").forEach((label) => {
      if (label.textContent.trim() !== "Táxon validado") return;
      const value = label.nextElementSibling;
      if (!value) return;
      const original = value.textContent.trim();
      value.innerHTML = formatValidatedTaxon(original);
    });

    // Também corrige nomes científicos dentro de "Observação funcional"
    // quando aparecem explicitamente como "Gênero sp." ou espécie binomial.
    root.querySelectorAll(".detail-note").forEach((note) => {
      if (note.dataset.taxonomiaV2 === "1") return;
      let html = note.innerHTML;

      // Gênero sp.
      html = html.replace(
        /\b([A-Z][a-zA-Z-]+)\s+(sp\.)\b/g,
        function (_, g, sp) {
          if (/(idae|inae|ini)$/i.test(g)) return `${g} ${sp}`;
          return `<em>${g}</em> ${sp}`;
        }
      );

      // Binômios simples em texto corrido.
      html = html.replace(
        /\b([A-Z][a-zA-Z-]+)\s+([a-z][a-zA-Z-]+)\b/g,
        function (_, g, e) {
          if (/(idae|inae|ini)$/i.test(g)) return `${g} ${e}`;
          return `<em>${g} ${e}</em>`;
        }
      );

      note.innerHTML = html;
      note.dataset.taxonomiaV2 = "1";
    });
  }

  function applyFormatting(root = document) {
    fixCards(root);
    fixDetail(root);
  }

  applyFormatting();

  const observer = new MutationObserver(() => applyFormatting());
  observer.observe(document.body, { childList: true, subtree: true });
})();
