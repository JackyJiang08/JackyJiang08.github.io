// Command palette (Cmd/Ctrl-K) — vanilla JS, no libraries.
//
// Fuzzy-searchable actions: jump to any section, copy the contact email,
// download either résumé variant, open external profiles, toggle the theme.
// Accessibility: role=dialog + listbox/option with aria-activedescendant,
// arrow-key navigation, focus trapped in the input while open, and focus
// restored to the invoking element on close.
(function () {
  "use strict";

  var EMAIL = "jiangyuqing0508@outlook.com";
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform);

  // ---- Actions -----------------------------------------------------------
  function jump(id) {
    return function () {
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }

  function openUrl(url) {
    return function () {
      window.open(url, "_blank", "noopener");
    };
  }

  function downloadFile(path) {
    return function () {
      var a = document.createElement("a");
      a.href = path;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
  }

  var ACTIONS = [
    { label: "Jump to About", hint: "01", run: jump("about") },
    { label: "Jump to Highlights", hint: "02", run: jump("highlights") },
    { label: "Jump to Experience", hint: "03", run: jump("experience") },
    { label: "Jump to Projects", hint: "04", run: jump("projects") },
    { label: "Jump to Publication", hint: "05", run: jump("publications") },
    { label: "Jump to Skills", hint: "06", run: jump("skills") },
    { label: "Jump to Education", hint: "07", run: jump("education") },
    { label: "Jump to Contact", hint: "08", run: jump("contact") },
    {
      label: "Copy email",
      hint: EMAIL,
      run: function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(EMAIL);
        }
      },
    },
    { label: "Download résumé (AI)", hint: "PDF", run: downloadFile("assets/resume/Jacky_Jiang_Resume_AI.pdf") },
    { label: "Download résumé (Data)", hint: "PDF", run: downloadFile("assets/resume/Jacky_Jiang_Resume_DA.pdf") },
    { label: "Open LinkedIn", hint: "↗", run: openUrl("https://www.linkedin.com/in/yuqing-jacky-jiang/") },
    { label: "Open GitHub", hint: "↗", run: openUrl("https://github.com/JackyJiang08") },
    { label: "Open arXiv paper", hint: "↗", run: openUrl("https://arxiv.org/abs/2602.07276") },
    {
      label: "Toggle light/dark theme",
      hint: "◐",
      run: function () {
        var t = document.getElementById("theme-toggle");
        if (t) t.click();
      },
    },
  ];

  // ---- Fuzzy match: query chars in order; tighter runs score higher ------
  function fuzzyScore(query, text) {
    query = query.toLowerCase();
    text = text.toLowerCase();
    if (!query) return 1;
    var score = 0;
    var ti = 0;
    var streak = 0;
    for (var qi = 0; qi < query.length; qi++) {
      var found = text.indexOf(query[qi], ti);
      if (found === -1) return -1;
      streak = found === ti ? streak + 1 : 1;
      score += streak * 2 + (found === 0 || text[found - 1] === " " ? 3 : 0);
      ti = found + 1;
    }
    return score;
  }

  // ---- Build DOM ---------------------------------------------------------
  var overlay = document.createElement("div");
  overlay.className = "palette-overlay";
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="palette" role="dialog" aria-modal="true" aria-label="Command palette">' +
    '  <div class="palette-head">' +
    '    <input class="palette-input" type="text" role="combobox" aria-expanded="true"' +
    '           aria-controls="palette-list" aria-autocomplete="list" autocomplete="off"' +
    '           spellcheck="false" placeholder="Type a command or search…" />' +
    '    <kbd class="palette-esc">esc</kbd>' +
    "  </div>" +
    '  <ul class="palette-list" id="palette-list" role="listbox"></ul>' +
    '  <p class="palette-empty" hidden>No matching commands</p>' +
    "</div>";
  document.body.appendChild(overlay);

  var input = overlay.querySelector(".palette-input");
  var list = overlay.querySelector(".palette-list");
  var empty = overlay.querySelector(".palette-empty");

  var open = false;
  var results = [];
  var selected = 0;
  var lastFocus = null;

  function render() {
    var q = input.value.trim();
    results = ACTIONS
      .map(function (a) { return { action: a, score: fuzzyScore(q, a.label) }; })
      .filter(function (r) { return r.score >= 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (r) { return r.action; });

    if (selected >= results.length) selected = 0;
    empty.hidden = results.length > 0;

    list.innerHTML = "";
    results.forEach(function (a, i) {
      var li = document.createElement("li");
      li.className = "palette-item" + (i === selected ? " selected" : "");
      li.id = "palette-opt-" + i;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === selected));
      var label = document.createElement("span");
      label.className = "palette-item-label";
      label.textContent = a.label;
      var hint = document.createElement("span");
      hint.className = "palette-item-hint";
      hint.textContent = a.hint || "";
      li.appendChild(label);
      li.appendChild(hint);
      li.addEventListener("mouseenter", function () {
        selected = i;
        updateSelection();
      });
      li.addEventListener("mousedown", function (e) {
        e.preventDefault();
        runSelected();
      });
      list.appendChild(li);
    });
    updateSelection();
  }

  function updateSelection() {
    var items = list.children;
    for (var i = 0; i < items.length; i++) {
      var on = i === selected;
      items[i].classList.toggle("selected", on);
      items[i].setAttribute("aria-selected", String(on));
      if (on) {
        input.setAttribute("aria-activedescendant", items[i].id);
        items[i].scrollIntoView({ block: "nearest" });
      }
    }
    if (!items.length) input.removeAttribute("aria-activedescendant");
  }

  function runSelected() {
    var action = results[selected];
    if (!action) return;
    close();
    action.run();
  }

  function show() {
    if (open) return;
    open = true;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    input.value = "";
    selected = 0;
    render();
    input.focus();
  }

  function close() {
    if (!open) return;
    open = false;
    overlay.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    lastFocus = null;
  }

  // ---- Events ------------------------------------------------------------
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      open ? close() : show();
      return;
    }
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length) {
        selected = (selected + 1) % results.length;
        updateSelection();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length) {
        selected = (selected - 1 + results.length) % results.length;
        updateSelection();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      runSelected();
    } else if (e.key === "Tab") {
      // focus trap: the input is the palette's only focusable control
      e.preventDefault();
    }
  });

  input.addEventListener("input", function () {
    selected = 0;
    render();
  });

  overlay.addEventListener("mousedown", function (e) {
    if (e.target === overlay) close();
  });

  var hint = document.getElementById("palette-hint");
  if (hint) {
    if (!isMac) {
      var kbd = hint.querySelector("kbd");
      if (kbd) kbd.textContent = "Ctrl K";
    }
    hint.addEventListener("click", show);
  }
})();
