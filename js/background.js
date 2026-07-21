/* Interactive constellation background — original implementation (MIT).
 *
 * Drifting particles joined by faint lines, gently repelled by the cursor;
 * links brighten near the cursor; clicks spawn a ripple ring plus a small
 * fading burst. Subtle by design: low-alpha accent color on a near-white
 * (or dark) background so text contrast is never affected.
 *
 * Performance/accessibility contract:
 *  - requestAnimationFrame loop, paused while the tab is hidden
 *  - particle count scales with viewport, hard-capped (120 desktop)
 *  - small screens get a light static-free version with fewer particles
 *  - prefers-reduced-motion: a single static frame is drawn, no loop,
 *    no pointer listeners
 */
(function () {
  "use strict";

  var canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var smallScreen = window.innerWidth < 768;

  // ---- Tuning ------------------------------------------------------------
  var HARD_CAP = smallScreen ? 36 : 120;
  var AREA_PER_DOT = 16000;      // px^2 of viewport per particle
  var LINK_DIST = smallScreen ? 100 : 135;
  var DRIFT = 0.28;              // base speed, px/frame
  var MOUSE_RADIUS = 170;        // cursor influence radius
  var MOUSE_FORCE = 0.045;       // gentle repulsion strength
  var DOT_ALPHA = 0.32;
  var LINK_ALPHA = 0.13;
  var GLOW_BOOST = 1.9;          // link brightening factor near cursor
  var RIPPLE_SPEED = 2.6;
  var BURST_COUNT = 9;

  // ---- State -------------------------------------------------------------
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var width = 0;
  var height = 0;
  var dots = [];
  var ripples = [];
  var sparks = [];
  var mouse = { x: -1e4, y: -1e4 };
  var rafId = null;
  var accent = { r: 79, g: 70, b: 229 };

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

  function targetCount() {
    return Math.min(HARD_CAP, Math.round((width * height) / AREA_PER_DOT));
  }

  function makeDot() {
    var angle = Math.random() * Math.PI * 2;
    var speed = DRIFT * (0.5 + Math.random());
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1.1 + Math.random() * 0.9,
    };
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var n = targetCount();
    while (dots.length < n) dots.push(makeDot());
    if (dots.length > n) dots.length = n;
  }

  // ---- Drawing -----------------------------------------------------------
  function drawFrame(animate) {
    ctx.clearRect(0, 0, width, height);

    // update + draw dots
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      if (animate) {
        // gentle cursor repulsion, eased by distance
        var mdx = d.x - mouse.x;
        var mdy = d.y - mouse.y;
        var mdist = Math.hypot(mdx, mdy);
        if (mdist < MOUSE_RADIUS && mdist > 0.001) {
          var push = (1 - mdist / MOUSE_RADIUS) * MOUSE_FORCE;
          d.vx += (mdx / mdist) * push;
          d.vy += (mdy / mdist) * push;
        }
        // clamp speed so interaction never gets jittery
        var sp = Math.hypot(d.vx, d.vy);
        var max = DRIFT * 2.2;
        if (sp > max) {
          d.vx = (d.vx / sp) * max;
          d.vy = (d.vy / sp) * max;
        }
        d.x += d.vx;
        d.y += d.vy;
        // wrap around edges for a continuous field
        if (d.x < -10) d.x = width + 10;
        if (d.x > width + 10) d.x = -10;
        if (d.y < -10) d.y = height + 10;
        if (d.y > height + 10) d.y = -10;
      }
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = rgba(DOT_ALPHA);
      ctx.fill();
    }

    // links between nearby dots; brighter near the cursor
    ctx.lineWidth = 1;
    for (i = 0; i < dots.length; i++) {
      for (var j = i + 1; j < dots.length; j++) {
        var a = dots[i];
        var b = dots[j];
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        if (Math.abs(dx) > LINK_DIST || Math.abs(dy) > LINK_DIST) continue;
        var dist = Math.hypot(dx, dy);
        if (dist >= LINK_DIST) continue;
        var alpha = LINK_ALPHA * (1 - dist / LINK_DIST);
        var midx = (a.x + b.x) / 2;
        var midy = (a.y + b.y) / 2;
        var toMouse = Math.hypot(midx - mouse.x, midy - mouse.y);
        if (toMouse < MOUSE_RADIUS) {
          alpha *= 1 + (GLOW_BOOST - 1) * (1 - toMouse / MOUSE_RADIUS);
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = rgba(alpha);
        ctx.stroke();
      }
    }

    if (!animate) return;

    // ripples
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

    // click-burst sparks
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
  }

  function loop() {
    drawFrame(true);
    rafId = requestAnimationFrame(loop);
  }

  // ---- Reduced motion: one static frame, nothing else --------------------
  readAccent();
  resize();
  if (reducedMotion) {
    drawFrame(false);
    return;
  }

  // ---- Events ------------------------------------------------------------
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  });

  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }, { passive: true });

  window.addEventListener("mouseout", function () {
    mouse.x = -1e4;
    mouse.y = -1e4;
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
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    } else if (rafId === null) {
      rafId = requestAnimationFrame(loop);
    }
  });

  // Track theme switches so particle color follows --accent
  new MutationObserver(readAccent).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  rafId = requestAnimationFrame(loop);
})();
