// Résumé role toggle: a segmented "AI / ML" ↔ "Data" control that swaps
// which PDF the hero Résumé button downloads, and gently re-emphasizes the
// matching project cards (reorder to front + accent border). The choice
// persists in localStorage; the default is the AI/ML variant. On a first
// visit (no stored choice) the project grid is left in its curated order —
// re-emphasis only kicks in once the visitor expresses a preference.
(function () {
  "use strict";

  var KEY = "resumeVariant";
  var FILES = {
    ai: "assets/resume/Jacky_Jiang_Resume_AI.pdf",
    da: "assets/resume/Jacky_Jiang_Resume_DA.pdf",
  };
  var LABELS = { ai: "AI/ML", da: "Data" };

  var btn = document.getElementById("resume-btn");
  var seg = document.getElementById("resume-seg");
  if (!btn || !seg) return;

  var chips = Array.prototype.slice.call(seg.querySelectorAll(".seg-btn"));
  var grid = document.getElementById("project-grid");
  var originalCards = grid
    ? Array.prototype.slice.call(grid.querySelectorAll(".card"))
    : [];

  function cardMatches(card, variant) {
    return (card.dataset.roles || "").split(/\s+/).indexOf(variant) !== -1;
  }

  function apply(variant, emphasize) {
    if (variant !== "ai" && variant !== "da") variant = "ai";

    btn.setAttribute("href", FILES[variant]);
    btn.setAttribute("aria-label", "Download " + LABELS[variant] + " résumé (PDF)");

    chips.forEach(function (c) {
      var on = c.dataset.variant === variant;
      c.classList.toggle("active", on);
      c.setAttribute("aria-pressed", String(on));
    });

    if (grid && emphasize) {
      var matched = [];
      var rest = [];
      originalCards.forEach(function (card) {
        (cardMatches(card, variant) ? matched : rest).push(card);
      });
      matched.concat(rest).forEach(function (card) {
        card.classList.toggle("emph", cardMatches(card, variant));
        grid.appendChild(card);
      });
    }
  }

  seg.addEventListener("click", function (e) {
    var chip = e.target.closest(".seg-btn");
    if (!chip) return;
    apply(chip.dataset.variant, true);
    try {
      localStorage.setItem(KEY, chip.dataset.variant);
    } catch (err) { /* storage unavailable: choice just won't persist */ }
  });

  var saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch (err) { /* ignore */ }

  // Re-apply a stored preference (with re-emphasis); otherwise default to
  // AI/ML for the button only, leaving the grid untouched.
  apply(saved || "ai", Boolean(saved));
})();
