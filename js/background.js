/* Ambient background.
 *
 * The cursor-following "nest" network is canvas-nest.js (MIT, hustcc) —
 * vendored at js/vendor/canvas-nest.min.js and injected dynamically below.
 * That build auto-initializes from attributes on its own <script> tag, so
 * injecting the tag is both the loading mechanism and the configuration.
 *
 * Layered above it on #bg-canvas is our original click effect: an expanding
 * ripple ring plus a small burst of fading sparks.
 *
 * Both are skipped entirely under prefers-reduced-motion and on small
 * screens (< 768px).
 */
(function () {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.innerWidth < 768) return;

  // ---- canvas-nest: conditional injection + theme-aware colors -----------
  var nestCanvas = null;
  var nestScript = null;

  function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function nestColors() {
    // Neutral gray filaments: the page reads as white with faint gray lines,
    // and the navy accent (#274c72) appears only on content. Dark mode uses
    // slightly brighter grays to stay visible on the near-black background.
    return isDark()
      ? { color: "150,158,170", point: "185,192,204" }
      : { color: "170,170,170", point: "140,140,140" };
  }

  function addNest() {
    var existing = [];
    document.querySelectorAll("canvas").forEach(function (el) {
      existing.push(el);
    });
    var colors = nestColors();
    var s = document.createElement("script");
    s.src = "js/vendor/canvas-nest.min.js";
    s.setAttribute("color", colors.color);
    s.setAttribute("pointColor", colors.point);
    s.setAttribute("opacity", "0.5");
    s.setAttribute("count", "99");
    s.setAttribute("zIndex", "-1");
    s.onload = function () {
      document.querySelectorAll("canvas").forEach(function (el) {
        if (existing.indexOf(el) === -1) nestCanvas = el;
      });
    };
    document.body.appendChild(s);
    nestScript = s;
  }

  function removeNest() {
    if (nestCanvas && nestCanvas.parentNode) {
      // shrink first so the orphaned draw loop costs nothing
      nestCanvas.width = 0;
      nestCanvas.height = 0;
      nestCanvas.parentNode.removeChild(nestCanvas);
    }
    nestCanvas = null;
    if (nestScript && nestScript.parentNode) nestScript.parentNode.removeChild(nestScript);
    nestScript = null;
  }

  addNest();

  // Recreate with the other palette when the theme toggles.
  new MutationObserver(function () {
    removeNest();
    addNest();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  // ---- Click ripple + spark burst (original code, MIT) -------------------
  var canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var width = 0;
  var height = 0;
  var ripples = [];
  var sparks = [];
  var rafId = null;
  var accent = { r: 39, g: 76, b: 114 };
  var RIPPLE_SPEED = 2.6;
  var BURST_COUNT = 9;

  function readAccent() {
    var raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent").trim();
    var m = /^#?([0-9a-f]{6})$/i.exec(raw);
    if (m) {
      accent = {
        r: parseInt(m[1].slice(0, 2), 16),
        g: parseInt(m[1].slice(2, 4), 16),
        b: parseInt(m[1].slice(4, 6), 16),
      };
    }
  }

  function rgba(alpha) {
    return "rgba(" + accent.r + "," + accent.g + "," + accent.b + "," + alpha + ")";
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function step() {
    ctx.clearRect(0, 0, width, height);

    var i;
    for (i = ripples.length - 1; i >= 0; i--) {
      var rp = ripples[i];
      rp.radius += RIPPLE_SPEED;
      rp.alpha *= 0.955;
      if (rp.alpha < 0.01) {
        ripples.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(rp.alpha);
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    ctx.lineWidth = 1;

    for (i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.96;
      s.vy *= 0.96;
      s.life -= 0.02;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = rgba(0.5 * s.life);
      ctx.fill();
    }

    // run only while something is animating
    if (ripples.length || sparks.length) {
      rafId = requestAnimationFrame(step);
    } else {
      ctx.clearRect(0, 0, width, height);
      rafId = null;
    }
  }

  function ensureLoop() {
    if (rafId === null && !document.hidden) rafId = requestAnimationFrame(step);
  }

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  });

  window.addEventListener("click", function (e) {
    ripples.push({ x: e.clientX, y: e.clientY, radius: 4, alpha: 0.35 });
    for (var k = 0; k < BURST_COUNT; k++) {
      var ang = (Math.PI * 2 * k) / BURST_COUNT + Math.random() * 0.5;
      var sp = 1.2 + Math.random() * 1.6;
      sparks.push({
        x: e.clientX,
        y: e.clientY,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 1,
      });
    }
    ensureLoop();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else {
      ensureLoop();
    }
  });

  new MutationObserver(readAccent).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  readAccent();
  resize();
})();
