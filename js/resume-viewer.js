// View-only résumé viewer: opens the shared modal (js/modal.js) and renders
// the selected PDF (AI/ML or Data variant) to canvases with PDF.js, vendored
// at js/vendor/pdf.min.js (Apache-2.0, Mozilla). The library is injected
// lazily on first open so normal visits never pay its weight.
//
// Honest limitation: the PDF files still live at public URLs and remain
// fetchable by anyone who reads the page source or network log. This viewer
// avoids *offering* a download (no button, no browser PDF toolbar, context
// menu disabled) but cannot make downloading impossible on a static site.
(function () {
  "use strict";

  var FILES = {
    ai: "assets/resume/Jacky_Jiang_Resume_AI.pdf",
    da: "assets/resume/Jacky_Jiang_Resume_DA.pdf",
  };
  var STORE_KEY = "resumeVariant";

  var trigger = document.getElementById("resume-open");
  if (!trigger || typeof SiteModal === "undefined") return;

  var modal = null;
  var pagesBox = null;
  var pageLabel = null;
  var prevBtn = null;
  var nextBtn = null;
  var segButtons = [];
  var pdfDoc = null;
  var variant = "ai";
  var currentPage = 1;
  var renderToken = 0; // invalidates in-flight renders when switching docs
  var libLoading = null;

  try {
    var saved = localStorage.getItem(STORE_KEY);
    if (saved === "ai" || saved === "da") variant = saved;
  } catch (err) { /* ignore */ }

  function loadLib() {
    if (window.pdfjsLib) return Promise.resolve();
    if (libLoading) return libLoading;
    libLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "js/vendor/pdf.min.js";
      s.onload = function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "js/vendor/pdf.worker.min.js";
        resolve();
      };
      s.onerror = reject;
      document.body.appendChild(s);
    });
    return libLoading;
  }

  function buildModal() {
    modal = SiteModal.create({ label: "Résumé viewer", extraClass: "modal-resume" });

    var toolbar = document.createElement("div");
    toolbar.className = "pdf-toolbar";

    var seg = document.createElement("div");
    seg.className = "segmented";
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "Résumé variant");
    [["ai", "AI / ML"], ["da", "Data"]].forEach(function (pair) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "seg-btn";
      b.dataset.variant = pair[0];
      b.textContent = pair[1];
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { setVariant(pair[0]); });
      seg.appendChild(b);
      segButtons.push(b);
    });

    var pager = document.createElement("div");
    pager.className = "pdf-pager";
    prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "pdf-pager-btn";
    prevBtn.setAttribute("aria-label", "Previous page");
    prevBtn.innerHTML = "&larr;";
    prevBtn.addEventListener("click", function () { goToPage(currentPage - 1); });
    nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "pdf-pager-btn";
    nextBtn.setAttribute("aria-label", "Next page");
    nextBtn.innerHTML = "&rarr;";
    nextBtn.addEventListener("click", function () { goToPage(currentPage + 1); });
    pageLabel = document.createElement("span");
    pageLabel.className = "pdf-page-label";
    pageLabel.setAttribute("aria-live", "polite");
    pager.appendChild(prevBtn);
    pager.appendChild(pageLabel);
    pager.appendChild(nextBtn);

    toolbar.appendChild(seg);
    toolbar.appendChild(pager);

    pagesBox = document.createElement("div");
    pagesBox.className = "pdf-pages";
    // view-only: no context menu on the rendered pages
    pagesBox.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    // keep "page x / y" in sync while scrolling
    pagesBox.addEventListener("scroll", onScrollSync, { passive: true });

    modal.body.appendChild(toolbar);
    modal.body.appendChild(pagesBox);

    var resizeTimer = null;
    window.addEventListener("resize", function () {
      if (!modal.isOpen() || !pdfDoc) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { renderDoc(pdfDoc); }, 250);
    });
  }

  function setVariant(v) {
    variant = v;
    try { localStorage.setItem(STORE_KEY, v); } catch (err) { /* ignore */ }
    segButtons.forEach(function (b) {
      var on = b.dataset.variant === v;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    loadDoc();
  }

  function loadDoc() {
    var token = ++renderToken;
    pagesBox.innerHTML = "<p class='pdf-status'>Loading…</p>";
    pageLabel.textContent = "";
    window.pdfjsLib.getDocument(FILES[variant]).promise.then(function (doc) {
      if (token !== renderToken) return;
      pdfDoc = doc;
      currentPage = 1;
      renderDoc(doc);
    }).catch(function () {
      if (token !== renderToken) return;
      pagesBox.innerHTML = "<p class='pdf-status'>Couldn't load the PDF. Please try again.</p>";
    });
  }

  function renderDoc(doc) {
    var token = ++renderToken;
    pagesBox.innerHTML = "";
    var width = pagesBox.clientWidth - 8; // fit-to-width minus padding
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var chain = Promise.resolve();
    for (var n = 1; n <= doc.numPages; n++) {
      (function (pageNum) {
        chain = chain.then(function () {
          if (token !== renderToken) return;
          return doc.getPage(pageNum).then(function (page) {
            if (token !== renderToken) return;
            var base = page.getViewport({ scale: 1 });
            var scale = width / base.width;
            var viewport = page.getViewport({ scale: scale * dpr });
            var canvas = document.createElement("canvas");
            canvas.className = "pdf-page-canvas";
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            canvas.style.width = width + "px";
            canvas.dataset.page = String(pageNum);
            pagesBox.appendChild(canvas);
            return page.render({
              canvasContext: canvas.getContext("2d"),
              viewport: viewport,
            }).promise;
          });
        });
      })(n);
    }
    chain.then(function () {
      if (token === renderToken) updatePager();
    });
    updatePager();
  }

  function goToPage(n) {
    if (!pdfDoc) return;
    n = Math.max(1, Math.min(pdfDoc.numPages, n));
    currentPage = n;
    var canvas = pagesBox.querySelector("canvas[data-page='" + n + "']");
    if (canvas) pagesBox.scrollTop = canvas.offsetTop - pagesBox.offsetTop;
    updatePager();
  }

  function onScrollSync() {
    if (!pdfDoc) return;
    var mid = pagesBox.scrollTop + pagesBox.clientHeight / 3;
    var canvases = pagesBox.querySelectorAll("canvas[data-page]");
    for (var i = 0; i < canvases.length; i++) {
      var c = canvases[i];
      var top = c.offsetTop - pagesBox.offsetTop;
      if (top <= mid && mid < top + c.offsetHeight) {
        var p = parseInt(c.dataset.page, 10);
        if (p !== currentPage) {
          currentPage = p;
          updatePager();
        }
        break;
      }
    }
  }

  function updatePager() {
    if (!pdfDoc) return;
    pageLabel.textContent = "page " + currentPage + " / " + pdfDoc.numPages;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= pdfDoc.numPages;
    var single = pdfDoc.numPages < 2;
    prevBtn.hidden = single;
    nextBtn.hidden = single;
  }

  trigger.addEventListener("click", function () {
    if (!modal) buildModal();
    modal.open();
    loadLib().then(function () {
      setVariant(variant);
    }).catch(function () {
      pagesBox.innerHTML = "<p class='pdf-status'>Couldn't load the PDF viewer.</p>";
    });
  });
})();
