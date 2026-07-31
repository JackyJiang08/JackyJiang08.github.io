// Shared modal component. Used by the résumé viewer and the news archive —
// one implementation of: centered panel over dimmed backdrop, close via X /
// Esc / backdrop click, background scroll lock, focus trap with focus
// restored on close, subtle open/close transition, ARIA dialog semantics.
//
// Usage:
//   var modal = SiteModal.create({ label: "Résumé viewer", extraClass: "modal-resume" });
//   modal.body.appendChild(...);   // fill with content (kept across opens)
//   modal.open();  modal.close();
(function () {
  "use strict";

  var FOCUSABLE =
    "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), " +
    "textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

  function create(opts) {
    opts = opts || {};

    var overlay = document.createElement("div");
    overlay.className = "modal-overlay" + (opts.extraClass ? " " + opts.extraClass : "");
    overlay.hidden = true;

    var panel = document.createElement("div");
    panel.className = "modal-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    if (opts.label) panel.setAttribute("aria-label", opts.label);

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "modal-close";
    closeBtn.setAttribute("aria-label", "Close (Esc)");
    closeBtn.innerHTML = "&times;";

    var body = document.createElement("div");
    body.className = "modal-body";

    panel.appendChild(closeBtn);
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    var isOpen = false;
    var lastFocus = null;
    var closeTimer = null;

    function open() {
      if (isOpen) return;
      isOpen = true;
      clearTimeout(closeTimer);
      lastFocus = document.activeElement;
      overlay.hidden = false;
      // force a reflow so the transition runs from the hidden state
      void overlay.offsetWidth;
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
      closeBtn.focus();
      if (typeof opts.onOpen === "function") opts.onOpen();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      overlay.classList.remove("open");
      document.body.style.overflow = "";
      // hide after the CSS transition (fixed timeout: transitionend never
      // fires when reduced-motion disables transitions)
      closeTimer = setTimeout(function () {
        overlay.hidden = true;
      }, 180);
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
      lastFocus = null;
      if (typeof opts.onClose === "function") opts.onClose();
    }

    closeBtn.addEventListener("click", close);

    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) close();
    });

    document.addEventListener("keydown", function (e) {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Tab") {
        // focus trap: cycle within the panel
        var focusables = Array.prototype.filter.call(
          panel.querySelectorAll(FOCUSABLE),
          function (el) { return el.offsetParent !== null || el === closeBtn; }
        );
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (focusables.indexOf(document.activeElement) === -1) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    return {
      el: overlay,
      panel: panel,
      body: body,
      open: open,
      close: close,
      isOpen: function () { return isOpen; },
    };
  }

  window.SiteModal = { create: create };
})();
