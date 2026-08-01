// Photography gallery: renders the grid from js/data/photos.js (PHOTOS
// global), generates category filter chips, and provides a minimal original
// lightbox — click to open, Esc/click-outside to close, ←/→ to navigate,
// focus-trapped while open. No external libraries.
(function () {
  "use strict";

  var grid = document.getElementById("photo-grid");
  var bar = document.getElementById("photo-filters");
  if (!grid || !bar || typeof PHOTOS === "undefined") return;

  var items = PHOTOS.slice().sort(function (a, b) {
    return (b.date || "").localeCompare(a.date || "");
  });
  var categories = [];
  items.forEach(function (p) {
    if (categories.indexOf(p.category) === -1) categories.push(p.category);
  });

  var visible = items.slice(); // photos matching the active filter, in order

  // ---- Grid rendering ----------------------------------------------------
  function render(filter) {
    visible = items.filter(function (p) {
      return filter === "all" || p.category === filter;
    });
    grid.innerHTML = "";
    visible.forEach(function (p, idx) {
      var fig = document.createElement("figure");
      fig.className = "photo-item";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "photo-open";
      btn.setAttribute("aria-label", "View larger: " + p.caption);
      btn.addEventListener("click", function () { openLightbox(idx); });

      var img = document.createElement("img");
      img.src = p.src;
      img.alt = p.caption;
      img.loading = "lazy";
      img.decoding = "async";
      // intrinsic dimensions reserve space before load — no layout shift
      if (p.w && p.h) {
        img.width = p.w;
        img.height = p.h;
      }
      btn.appendChild(img);

      var cap = document.createElement("figcaption");
      cap.textContent = p.caption + (p.date ? " · " + p.date : "");

      fig.appendChild(btn);
      fig.appendChild(cap);
      grid.appendChild(fig);
    });
  }

  // ---- Filter chips (same pattern as the Highlights year filter) ---------
  ["all"].concat(categories).forEach(function (f, idx) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (idx === 0 ? " active" : "");
    b.dataset.filter = f;
    b.setAttribute("aria-pressed", String(idx === 0));
    b.textContent = f === "all" ? "All" : f;
    bar.appendChild(b);
  });

  var chips = Array.prototype.slice.call(bar.querySelectorAll(".chip"));

  function select(filter) {
    chips.forEach(function (c) {
      var on = c.dataset.filter === filter;
      c.classList.toggle("active", on);
      c.setAttribute("aria-pressed", String(on));
    });
    render(filter);
  }

  bar.addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    if (chip) select(chip.dataset.filter);
  });

  bar.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    var i = chips.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    var next = e.key === "ArrowRight"
      ? (i + 1) % chips.length
      : (i - 1 + chips.length) % chips.length;
    chips[next].focus();
  });

  // ---- Lightbox ----------------------------------------------------------
  var overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="lightbox-panel" role="dialog" aria-modal="true" aria-label="Photo viewer">' +
    '  <button type="button" class="lightbox-btn lightbox-close" aria-label="Close (Esc)">&times;</button>' +
    '  <button type="button" class="lightbox-btn lightbox-prev" aria-label="Previous photo (left arrow)">&larr;</button>' +
    '  <figure class="lightbox-figure">' +
    '    <img class="lightbox-img" src="" alt="" />' +
    '    <figcaption class="lightbox-caption"></figcaption>' +
    "  </figure>" +
    '  <button type="button" class="lightbox-btn lightbox-next" aria-label="Next photo (right arrow)">&rarr;</button>' +
    "</div>";
  document.body.appendChild(overlay);

  var lbImg = overlay.querySelector(".lightbox-img");
  var lbCap = overlay.querySelector(".lightbox-caption");
  var btnClose = overlay.querySelector(".lightbox-close");
  var btnPrev = overlay.querySelector(".lightbox-prev");
  var btnNext = overlay.querySelector(".lightbox-next");
  var focusables = [btnClose, btnPrev, btnNext];

  var open = false;
  var current = 0;
  var lastFocus = null;

  function showPhoto(idx) {
    current = (idx + visible.length) % visible.length;
    var p = visible[current];
    lbImg.src = p.src;
    lbImg.alt = p.caption;
    lbCap.textContent = p.caption + (p.date ? " · " + p.date : "");
    var single = visible.length < 2;
    btnPrev.hidden = single;
    btnNext.hidden = single;
  }

  function openLightbox(idx) {
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    open = true;
    showPhoto(idx);
    btnClose.focus();
  }

  function closeLightbox() {
    if (!open) return;
    open = false;
    overlay.hidden = true;
    lbImg.src = "";
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    lastFocus = null;
  }

  btnClose.addEventListener("click", closeLightbox);
  btnPrev.addEventListener("click", function () { showPhoto(current - 1); });
  btnNext.addEventListener("click", function () { showPhoto(current + 1); });

  overlay.addEventListener("mousedown", function (e) {
    if (e.target === overlay || e.target.classList.contains("lightbox-panel") ||
        e.target.classList.contains("lightbox-figure")) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeLightbox();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      showPhoto(current - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      showPhoto(current + 1);
    } else if (e.key === "Tab") {
      // focus trap across the three lightbox buttons
      e.preventDefault();
      var visibleButtons = focusables.filter(function (b) { return !b.hidden; });
      var i = visibleButtons.indexOf(document.activeElement);
      var dir = e.shiftKey ? -1 : 1;
      var next = (i + dir + visibleButtons.length) % visibleButtons.length;
      visibleButtons[next].focus();
    }
  });

  select("all");
})();
