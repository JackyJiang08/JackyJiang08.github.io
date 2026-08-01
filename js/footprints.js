// Footprints — single-projection composite map with a hybrid GPU camera.
//
// Map: assets/maps/world-composite.svg (scripts/build-map.mjs) — inlined
// into the DOM (never <img>/background, which would always rasterize).
//
// CRISP-ZOOM HYBRID:
//  - during a gesture, pan/zoom is one CSS transform on .fp-cam
//    (GPU-composited; slight softness mid-gesture is acceptable)
//  - when input settles (~160ms debounce, no active drag/pinch/animation),
//    the accumulated transform is BAKED into the SVG viewBox and the CSS
//    transform resets to identity in the same frame — the math makes both
//    states pixel-identical at the swap, then the browser re-renders the
//    vectors at full resolution → razor-sharp at any zoom
//  - subsequent gestures start from the new viewBox baseline; Reset bakes
//    back to the full-world viewBox
//
// All zoom-dependent logic (thresholds, stroke/dot counter-scaling) reads
// the EFFECTIVE zoom = (fullWorldWidth / viewBoxWidth) × liveScale, so
// behavior is identical before and after a bake. During pan/zoom the only
// per-frame DOM write is the transform; class toggles and CSS-var updates
// happen only when a threshold or zoom bucket changes.
(function () {
  "use strict";

  var section = document.getElementById("footprints");
  var host = document.getElementById("fp-map");
  var cam = document.getElementById("fp-cam");
  var tip = document.getElementById("fp-tip");
  if (!section || !host || !cam || !tip || typeof FOOTPRINTS === "undefined") return;

  var EFF_MIN = 1;
  var EFF_MAX = 8;
  var DETAIL_ZOOM = 2.5;
  var CITY_ZOOM = 4;
  var DETAIL_COUNTRIES = ["CN", "US"];
  var SETTLE_MS = 160;

  function slug(name) {
    return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  // ---- Camera state ------------------------------------------------------
  var svg = null;
  var W = 0, H = 0;                    // host px size
  var VW0 = 0, VH0 = 0;                // full-world viewBox size
  var vb = { x: 0, y: 0, w: 0, h: 0 }; // current viewBox baseline
  var cur = { s: 1, x: 0, y: 0 };      // live transform (relative to baseline)
  var target = { s: 1, x: 0, y: 0 };
  var anim = null;
  var rafId = null;
  var settleTimer = null;
  var dragging = false;
  var pinchMid = null;
  var zoomBucket = -1;
  var zoomedFlags = { detail: false, cities: false };

  function effZoom() {
    return (VW0 / vb.w) * cur.s;
  }

  function baseZoom() {
    return VW0 / vb.w;
  }

  // world extent in current-baseline px (for pan clamping)
  function clampT(t, s) {
    var ppu = W / vb.w;
    var L = -vb.x * ppu, T = -vb.y * ppu;
    var R = L + VW0 * ppu, B = T + VH0 * ppu;
    t.x = Math.min(-s * L, Math.max(W - s * R, t.x));
    t.y = Math.min(-s * T, Math.max(H - s * B, t.y));
    return t;
  }

  function apply() {
    cam.style.transform =
      "translate(" + cur.x + "px," + cur.y + "px) scale(" + cur.s + ")";
  }

  // occasional (bucketed) writes — NOT per-frame
  function thresholds() {
    var z = effZoom();
    var wantDetail = z >= DETAIL_ZOOM;
    var wantCities = z >= CITY_ZOOM;
    if (wantDetail !== zoomedFlags.detail) {
      zoomedFlags.detail = wantDetail;
      svg.classList.toggle("fp-zoomed", wantDetail);
    }
    if (wantCities !== zoomedFlags.cities) {
      zoomedFlags.cities = wantCities;
      svg.classList.toggle("fp-cities-on", wantCities);
    }
    var bucket = Math.round(z * 4);
    if (bucket !== zoomBucket) {
      zoomBucket = bucket;
      cam.style.setProperty("--fp-sw", (0.5 / z).toFixed(3));
      cam.style.setProperty("--fp-inv", (1 / z).toFixed(4));
    }
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    rafId = null;
    if (anim) {
      var t = Math.min(1, (now - anim.t0) / anim.dur);
      var e = easeOut(t);
      cur.s = anim.from.s + (anim.to.s - anim.from.s) * e;
      cur.x = anim.from.x + (anim.to.x - anim.from.x) * e;
      cur.y = anim.from.y + (anim.to.y - anim.from.y) * e;
      if (t >= 1) {
        anim = null;
        markActivity(); // schedule the settle bake
      }
    }
    apply();        // the one per-frame DOM write
    thresholds();   // toggles/vars only on change
    if (anim) schedule();
  }

  function schedule() {
    if (rafId === null) rafId = requestAnimationFrame(frame);
  }

  function animateTo(s, x, y, dur) {
    var to = clampT({ x: x, y: y }, s);
    target = { s: s, x: to.x, y: to.y };
    anim = { from: { s: cur.s, x: cur.x, y: cur.y }, to: target, t0: performance.now(), dur: dur || 140 };
    schedule();
  }

  function setDirect(s, x, y) {
    anim = null;
    var t = clampT({ x: x, y: y }, s);
    target = { s: s, x: t.x, y: t.y };
    cur = { s: s, x: t.x, y: t.y };
    schedule();
  }

  function zoomAt(px, py, factor, dur) {
    var bz = baseZoom();
    var sMin = EFF_MIN / bz, sMax = EFF_MAX / bz;
    var s2 = Math.min(sMax, Math.max(sMin, target.s * factor));
    var ratio = s2 / target.s;
    animateTo(s2, px - (px - target.x) * ratio, py - (py - target.y) * ratio, dur);
    markActivity();
  }

  function resetView(dur) {
    // animate to effective zoom 1 (full world); the settle bake then snaps
    // the viewBox back to the exact full-world rectangle
    var s2 = 1 / baseZoom();
    var ppu = W / vb.w;
    animateTo(s2, s2 * vb.x * ppu, s2 * vb.y * ppu, dur || 320);
    markActivity();
  }

  // ---- The bake: fold the transform into the viewBox, seamlessly ---------
  function bake() {
    if (anim || dragging || pinchMid) return;
    if (cur.s === 1 && cur.x === 0 && cur.y === 0) return;
    var ppu = W / vb.w;
    var nx = vb.x - cur.x / (cur.s * ppu);
    var ny = vb.y - cur.y / (cur.s * ppu);
    var nw = vb.w / cur.s;
    var nh = vb.h / cur.s;
    // snap to the exact full world when effectively at base zoom
    if (Math.abs(effZoom() - 1) < 0.005) {
      nx = 0; ny = 0; nw = VW0; nh = VH0;
    }
    vb = { x: nx, y: ny, w: nw, h: nh };
    cur = { s: 1, x: 0, y: 0 };
    target = { s: 1, x: 0, y: 0 };
    // both writes in the same frame, before paint → pixel-identical swap:
    // screen(u) before = t + s·(u−vbOld)·ppu ; after = (u−vbNew)·ppu·s
    svg.setAttribute("viewBox", nx + " " + ny + " " + nw + " " + nh);
    cam.style.transform = "translate(0px,0px) scale(1)";
  }

  function markActivity() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function () {
      if (anim || dragging || pinchMid) {
        markActivity(); // still busy — re-arm
        return;
      }
      requestAnimationFrame(bake);
    }, SETTLE_MS);
  }

  // ---- Projection (identical to the build; constants from the SVG) -------
  var proj = null;

  function makeProjection() {
    var k = parseFloat(svg.dataset.projK);
    var tx = parseFloat(svg.dataset.projTx);
    var ty = parseFloat(svg.dataset.projTy);
    return function (lat, lng) {
      var l = lng * Math.PI / 180, p = lat * Math.PI / 180;
      var p2 = p * p, p4 = p2 * p2;
      var x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)));
      var y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)));
      return { x: tx + k * x, y: ty - k * y };
    };
  }

  // ---- Build-once decorations -------------------------------------------
  var regionMeta = {};
  var bboxCache = {};

  function decorate() {
    Object.keys(FOOTPRINTS).forEach(function (code) {
      var d = FOOTPRINTS[code];
      if (!d.visited) return;
      var p = svg.querySelector('[id="c-' + code + '"]');
      if (p) p.classList.add("visited");
      (d.regions || []).forEach(function (rg) {
        var id = "r-" + code + "-" + slug(rg.name);
        var rp = svg.querySelector('[id="' + id + '"]');
        if (rp) {
          rp.classList.add("visited");
          regionMeta[id] = { date: rg.date || "" };
        }
      });
    });

    DETAIL_COUNTRIES.forEach(function (cc) {
      var g = svg.querySelector("#admin1-" + cc);
      if (g) g.removeAttribute("hidden");
    });

    var cities = document.createElementNS("http://www.w3.org/2000/svg", "g");
    cities.setAttribute("class", "fp-cities");
    Object.keys(FOOTPRINTS).forEach(function (code) {
      (FOOTPRINTS[code].regions || []).forEach(function (rg) {
        if (!FOOTPRINTS[code].visited) return;
        if (typeof rg.lat !== "number" || typeof rg.lng !== "number") return;
        var pt = proj(rg.lat, rg.lng);
        var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "fp-city");
        g.setAttribute("transform", "translate(" + pt.x.toFixed(2) + " " + pt.y.toFixed(2) + ")");
        var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("r", "1.4");
        var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.textContent = rg.name;
        g.appendChild(dot);
        g.appendChild(label);
        cities.appendChild(g);
      });
    });
    svg.appendChild(cities);
  }

  // ---- Interaction -------------------------------------------------------
  function hostPoint(e) {
    var r = host.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function countryOf(p) {
    if (p.id && p.id.slice(0, 2) === "c-") return p.id.slice(2);
    var g = p.closest("g[id^='admin1-']");
    if (g) return g.id.slice(7);
    return null;
  }

  function zoomToCountry(code) {
    var p = svg.querySelector('[id="c-' + code + '"]');
    if (!p) return;
    var bb = bboxCache[code] || (bboxCache[code] = p.getBBox());
    var effTarget = Math.min(EFF_MAX, Math.max(EFF_MIN,
      0.85 * Math.min(VW0 / bb.width, VH0 / bb.height)));
    var s = effTarget / baseZoom();
    var ppu = W / vb.w;
    var cx = (bb.x + bb.width / 2 - vb.x) * ppu;
    var cy = (bb.y + bb.height / 2 - vb.y) * ppu;
    animateTo(s, W / 2 - cx * s, H / 2 - cy * s, 420);
    markActivity();
  }

  var moved = false;

  function bind() {
    host.addEventListener("wheel", function (e) {
      e.preventDefault();
      var pt = hostPoint(e);
      zoomAt(pt.x, pt.y, Math.exp(-e.deltaY * 0.0022), 140);
    }, { passive: false });

    var sx = 0, sy = 0, ox = 0, oy = 0;
    host.addEventListener("mousedown", function (e) {
      dragging = true;
      moved = false;
      sx = e.clientX; sy = e.clientY;
      ox = target.x; oy = target.y;
    });
    window.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      setDirect(target.s, ox + dx, oy + dy);
    });
    window.addEventListener("mouseup", function () {
      if (dragging) {
        dragging = false;
        markActivity();
      }
    });

    var pinchDist = 0, pinchZoom = 1;
    host.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      pinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                             e.touches[0].clientY - e.touches[1].clientY);
      pinchZoom = target.s;
      var r = host.getBoundingClientRect();
      pinchMid = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left,
                   y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top };
    }, { passive: false });
    host.addEventListener("touchmove", function (e) {
      if (e.touches.length !== 2 || !pinchMid) return;
      e.preventDefault();
      var r = host.getBoundingClientRect();
      var m = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top };
      var dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                            e.touches[0].clientY - e.touches[1].clientY);
      var bz = baseZoom();
      var s2 = Math.min(EFF_MAX / bz, Math.max(EFF_MIN / bz, pinchZoom * dist / pinchDist));
      var ratio = s2 / target.s;
      var x2 = pinchMid.x - (pinchMid.x - target.x) * ratio + (m.x - pinchMid.x);
      var y2 = pinchMid.y - (pinchMid.y - target.y) * ratio + (m.y - pinchMid.y);
      pinchMid = m;
      setDirect(s2, x2, y2);
    }, { passive: false });
    host.addEventListener("touchend", function () {
      if (pinchMid) {
        pinchMid = null;
        markActivity();
      }
    });

    host.addEventListener("dblclick", function (e) {
      e.preventDefault();
      var pt = hostPoint(e);
      zoomAt(pt.x, pt.y, 1.9, 200);
    });

    svg.addEventListener("click", function (e) {
      if (moved) return;
      var p = e.target.closest("path");
      if (!p) {
        if (effZoom() > 1.05) resetView();
        return;
      }
      var code = countryOf(p);
      if (code && FOOTPRINTS[code] && FOOTPRINTS[code].visited) {
        zoomToCountry(code);
      } else if (effZoom() > 1.05 && !code) {
        resetView();
      }
    });
    host.addEventListener("click", function (e) {
      if (!moved && e.target === host && effZoom() > 1.05) resetView();
    });

    svg.addEventListener("mouseover", function (e) {
      var p = e.target.closest("path");
      if (!p) { tip.hidden = true; return; }
      var g = p.closest("g[id^='admin1-']");
      if (g) {
        var meta = regionMeta[p.id];
        var rn = p.getAttribute("name") || "";
        tip.textContent = meta && meta.date ? rn + " · " + meta.date : rn;
        tip.classList.toggle("muted", !p.classList.contains("visited"));
        tip.hidden = false;
        return;
      }
      var code = p.id.slice(2);
      var d = FOOTPRINTS[code];
      var name = p.getAttribute("name") || (d && d.name) || "";
      if (d && d.visited) {
        var n = (d.regions || []).length;
        tip.textContent = name + " · " + n + (n === 1 ? " region" : " regions");
        tip.classList.remove("muted");
      } else {
        tip.textContent = name;
        tip.classList.add("muted");
      }
      tip.hidden = false;
    });
    svg.addEventListener("mouseleave", function () { tip.hidden = true; });
    svg.addEventListener("mousemove", function (e) {
      var pt = hostPoint(e);
      tip.style.transform = "translate(" + (pt.x + 14) + "px," + (pt.y + 14) + "px)";
    }, { passive: true });

    var box = document.createElement("div");
    box.className = "fp-zoom-controls";
    [["+", "Zoom in", function () { zoomAt(W / 2, H / 2, 1.6, 180); }],
     ["−", "Zoom out", function () { zoomAt(W / 2, H / 2, 1 / 1.6, 180); }],
     ["⟲", "Reset view", function () { resetView(); }]].forEach(function (def) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "fp-zoom-btn";
      b.textContent = def[0];
      b.setAttribute("aria-label", def[1]);
      b.title = def[1];
      b.addEventListener("click", def[2]);
      box.appendChild(b);
    });
    host.parentNode.appendChild(box);

    var rt = null;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        W = host.clientWidth;
        H = host.clientHeight;
        setDirect(target.s, target.x, target.y);
        markActivity();
      }, 150);
    });
  }

  // ---- Stat rings --------------------------------------------------------
  function initRings() {
    var CIRC = 2 * Math.PI * 30;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var countries = Object.keys(FOOTPRINTS).filter(function (k) {
      return FOOTPRINTS[k].visited;
    }).length;
    var states = ((FOOTPRINTS.US || {}).regions || []).length;

    var defs = [
      { fill: "ring-states", num: "ring-states-num", value: states, total: 50 },
      { fill: "ring-countries", num: "ring-countries-num", value: countries, total: 195 },
    ];
    defs.forEach(function (d) {
      var el = document.getElementById(d.fill);
      var num = document.getElementById(d.num);
      if (!el || !num) return;
      num.textContent = String(d.value);
      el.style.strokeDasharray = String(CIRC);
      el.style.strokeDashoffset = String(CIRC);
      d.offset = CIRC * (1 - Math.min(1, d.value / d.total));
    });

    function fill() {
      defs.forEach(function (d) {
        var el = document.getElementById(d.fill);
        if (el) el.style.strokeDashoffset = String(d.offset);
      });
    }

    if (reduced || !("IntersectionObserver" in window)) {
      fill();
      return;
    }
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          rio.disconnect();
          requestAnimationFrame(fill);
        }
      });
    }, { threshold: 0.4 });
    rio.observe(document.getElementById("fp-rings"));
  }

  // ---- Init --------------------------------------------------------------
  var inited = false;

  function init() {
    if (inited) return;
    inited = true;
    initRings();
    fetch("assets/maps/world-composite.svg")
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        cam.innerHTML = txt; // truly inline — vectors, not a rasterized image
        svg = cam.querySelector("svg");
        if (!svg) return;
        W = host.clientWidth;
        H = host.clientHeight;
        var v = svg.viewBox.baseVal;
        VW0 = v.width; VH0 = v.height;
        vb = { x: v.x, y: v.y, w: v.width, h: v.height };
        proj = makeProjection();
        decorate();
        bind();
        apply();
        thresholds();
      })
      .catch(function () {
        cam.innerHTML = "<p class='archive-sub'>Couldn't load the map.</p>";
      });
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          io.disconnect();
          init();
        }
      });
    }, { rootMargin: "400px" });
    io.observe(section);
  } else {
    init();
  }
})();
