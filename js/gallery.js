// Photo gallery, rendered from js/data/photos.js (PHOTOS global):
//  - shared lightbox (window.SiteLightbox) — used by the album masonry, the
//    featured carousel, and the Footprints region photo strips
//  - masonry grid of ALL photos (album.html, #photo-grid)
//  - featured marquee carousel (misc.html, #carousel-track): slow seamless
//    loop, paused on hover/touch; static scrollable row under
//    prefers-reduced-motion
// No external libraries.
(function () {
  "use strict";

  if (typeof PHOTOS === "undefined") return;

  // newest first; undated photos sink to the bottom, ordered by filename
  var items = PHOTOS.slice().sort(function (a, b) {
    var d = (b.date || "").localeCompare(a.date || "");
    if (d !== 0) return d;
    return (a.id || a.src).localeCompare(b.id || b.src);
  });

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  var lbItems = []; // the photo list the lightbox is currently scoped to

  function showPhoto(idx) {
    current = (idx + lbItems.length) % lbItems.length;
    var p = lbItems[current];
    lbImg.src = p.src; // always the full-size image
    lbImg.alt = p.caption;
    lbCap.textContent = p.caption + (p.date ? " · " + p.date : "");
    var single = lbItems.length < 2;
    btnPrev.hidden = single;
    btnNext.hidden = single;
  }

  function openLightbox(list, idx) {
    if (!list || !list.length) return;
    lbItems = list;
    lastFocus = document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    open = true;
    showPhoto(idx || 0);
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
      e.preventDefault();
      var visibleButtons = focusables.filter(function (b) { return !b.hidden; });
      var i = visibleButtons.indexOf(document.activeElement);
      var dir = e.shiftKey ? -1 : 1;
      var next = (i + dir + visibleButtons.length) % visibleButtons.length;
      visibleButtons[next].focus();
    }
  });

  window.SiteLightbox = { open: openLightbox };

  // ---- Masonry grid: ALL photos (album.html) -----------------------------
  var grid = document.getElementById("photo-grid");
  if (grid) {
    items.forEach(function (p, idx) {
      var fig = document.createElement("figure");
      fig.className = "photo-item";

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "photo-open";
      btn.setAttribute("aria-label", "View larger: " + p.caption);
      btn.addEventListener("click", function () { openLightbox(items, idx); });

      var img = document.createElement("img");
      img.src = p.thumb || p.src; // small tile image; the lightbox loads full src
      img.alt = p.caption;
      img.loading = "lazy";
      img.decoding = "async";
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

  // ---- Featured carousel (misc.html) -------------------------------------
  var track = document.getElementById("carousel-track");
  if (track) {
    var featured = items.filter(function (p) { return p.featured; });
    var carousel = track.closest(".carousel");

    var addSet = function (isDuplicate) {
      featured.forEach(function (p, idx) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "carousel-slide";
        if (isDuplicate) {
          // the second copy exists only for the seamless loop
          b.setAttribute("aria-hidden", "true");
          b.tabIndex = -1;
        } else {
          b.setAttribute("aria-label", "View photo: " + p.caption);
        }
        var img = document.createElement("img");
        img.src = p.thumb || p.src;
        img.alt = isDuplicate ? "" : p.caption;
        img.loading = "lazy";
        img.decoding = "async";
        b.appendChild(img);
        b.addEventListener("click", function () { openLightbox(featured, idx); });
        track.appendChild(b);
      });
    };

    if (featured.length) {
      addSet(false);
      if (reducedMotion) {
        // static, manually scrollable row — no auto-scroll, no duplicate set
        carousel.classList.add("static");
      } else {
        addSet(true);
        // pause on touch; resume shortly after the finger lifts
        var resumeTimer = null;
        carousel.addEventListener("touchstart", function () {
          carousel.classList.add("paused");
          clearTimeout(resumeTimer);
        }, { passive: true });
        carousel.addEventListener("touchend", function () {
          resumeTimer = setTimeout(function () {
            carousel.classList.remove("paused");
          }, 1200);
        });
      }
    } else {
      carousel.hidden = true;
    }
  }
})();
