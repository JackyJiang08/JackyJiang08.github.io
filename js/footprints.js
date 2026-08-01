// Footprints world map — vanilla JS + inline SVG (svg-pan-zoom for camera).
//
// Performance contract:
//  - lazy init: the world SVG is fetched only when the section nears the
//    viewport; CN/US detail layers are prebuilt during idle time (or on
//    first threshold crossing, whichever comes first) so crossing the
//    zoom threshold is a pure class toggle — nothing is created or
//    destroyed during zoom/pan events
//  - ONE delegated mouseover/mousemove/click listener per SVG root
//  - hover styling is pure CSS; per-move JS writes only the tooltip
//    transform; the pan handler allocates nothing beyond the clamped
//    pan point svg-pan-zoom requires it to return
//  - city dot positions are projected from lat/lng ONCE at build time
(function () {
  "use strict";

  var section = document.getElementById("footprints");
  var host = document.getElementById("fp-map");
  var tip = document.getElementById("fp-tip");
  if (!section || !host || !tip || typeof FOOTPRINTS === "undefined") return;

  var DETAIL_ZOOM = 2.5; // past this, CN/US swap to province/state layers
  var CITY_ZOOM = 4;     // past this, labeled dots for regions with lat/lng

  // ---- Projection (world.svg) -------------------------------------------
  // Calibrated empirically against 15 small reference countries in the
  // vendored map: x is linear in longitude; y is a quintic in latitude
  // (max residual ≈ 1 map unit). Computed once per region and cached in
  // the built DOM — never re-evaluated during zoom or pan.
  function project(lat, lng) {
    return {
      x: 2.80728 * lng + 474.865,
      y: -2.82430711 * lat - 7.367e-5 * Math.pow(lat, 3) - 3e-8 * Math.pow(lat, 5) + 463.019,
    };
  }

  // ---- Detail-map registry ----------------------------------------------
  // countryCode → detail-map file + adapter. CN and US ship today. To add
  // another visited country later: vendor its SVG into assets/maps/ (check
  // the license — @svg-maps packages are typically CC-BY-4.0, NOT MIT; add
  // an entry to assets/maps/LICENSES.md), then register it here with an
  // adapter for how its regions are named. Countries without an entry fall
  // back to the list-only modal automatically.
  var US_NAMES = {
    al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas", ca: "California",
    co: "Colorado", ct: "Connecticut", de: "Delaware", fl: "Florida", ga: "Georgia",
    hi: "Hawaii", id: "Idaho", il: "Illinois", "in": "Indiana", ia: "Iowa",
    ks: "Kansas", ky: "Kentucky", la: "Louisiana", me: "Maine", md: "Maryland",
    ma: "Massachusetts", mi: "Michigan", mn: "Minnesota", ms: "Mississippi",
    mo: "Missouri", mt: "Montana", ne: "Nebraska", nv: "Nevada", nh: "New Hampshire",
    nj: "New Jersey", nm: "New Mexico", ny: "New York", nc: "North Carolina",
    nd: "North Dakota", oh: "Ohio", ok: "Oklahoma", or: "Oregon", pa: "Pennsylvania",
    ri: "Rhode Island", sc: "South Carolina", sd: "South Dakota", tn: "Tennessee",
    tx: "Texas", ut: "Utah", vt: "Vermont", va: "Virginia", wa: "Washington",
    wv: "West Virginia", wi: "Wisconsin", wy: "Wyoming", dc: "District of Columbia",
  };

  var DETAIL = {
    CN: {
      src: "assets/maps/china.svg",
      regionName: function (el) {
        return el.tagName === "path" ? el.getAttribute("aria-label") : null;
      },
      markVisited: function (root, names) {
        root.querySelectorAll("path").forEach(function (p) {
          var n = p.getAttribute("aria-label");
          if (n && names.indexOf(n.toLowerCase()) !== -1) {
            p.classList.add("visited");
            p.dataset.region = n;
          }
        });
      },
    },
    US: {
      src: "assets/maps/usa.svg",
      regionName: function (el) {
        if (el.tagName !== "path") return null;
        for (var i = 0; i < el.classList.length; i++) {
          var name = US_NAMES[el.classList[i]];
          if (name) return name;
        }
        return null;
      },
      markVisited: function (root, names) {
        Object.keys(US_NAMES).forEach(function (code) {
          if (names.indexOf(US_NAMES[code].toLowerCase()) === -1) return;
          root.querySelectorAll("path." + code).forEach(function (p) {
            p.classList.add("visited");
            p.dataset.region = US_NAMES[code];
          });
        });
      },
    },
  };

  var detailCache = {}; // country code -> Promise<svg text>

  function loadDetail(code) {
    if (!detailCache[code]) {
      detailCache[code] = fetch(DETAIL[code].src).then(function (r) {
        return r.text();
      });
    }
    return detailCache[code];
  }

  function photoById(id) {
    if (typeof PHOTOS === "undefined") return null;
    for (var i = 0; i < PHOTOS.length; i++) {
      if (PHOTOS[i].id === id) return PHOTOS[i];
    }
    return null;
  }

  function visitedRegionNames(code) {
    return (FOOTPRINTS[code].regions || []).map(function (r) {
      return r.name.toLowerCase();
    });
  }

  // ---- Country modal (unchanged behavior: centered shared modal) ---------
  var modal = null;
  var modalTip = null;

  function ensureModal() {
    if (modal) return;
    modal = SiteModal.create({ label: "Footprints — country details", extraClass: "modal-country" });
    modalTip = document.createElement("div");
    modalTip.className = "fp-tip";
    modalTip.hidden = true;
    modalTip.setAttribute("aria-hidden", "true");
  }

  function flashRegion(name) {
    var li = modal.body.querySelector('li[data-region="' + CSS.escape(name) + '"]');
    if (!li) return;
    li.scrollIntoView({ block: "nearest", behavior: "smooth" });
    li.classList.remove("flash");
    void li.offsetWidth;
    li.classList.add("flash");
  }

  function bindModalMap(svg, wrap, adapter) {
    svg.addEventListener("mouseover", function (e) {
      var name = adapter.regionName(e.target);
      if (!name) { modalTip.hidden = true; return; }
      modalTip.textContent = name;
      modalTip.classList.toggle("muted", !e.target.classList.contains("visited"));
      modalTip.hidden = false;
    });
    svg.addEventListener("mouseleave", function () { modalTip.hidden = true; });
    svg.addEventListener("mousemove", function (e) {
      var r = wrap.getBoundingClientRect();
      modalTip.style.transform =
        "translate(" + (e.clientX - r.left + 14) + "px," + (e.clientY - r.top + 14) + "px)";
    }, { passive: true });
    svg.addEventListener("click", function (e) {
      var p = e.target.closest("path.visited");
      if (p && p.dataset.region) flashRegion(p.dataset.region);
    });
  }

  function buildRegionList(d) {
    var list = document.createElement("ul");
    list.className = "fp-region-list";
    (d.regions || []).forEach(function (rg) {
      var li = document.createElement("li");
      li.dataset.region = rg.name;

      var head = document.createElement("div");
      head.className = "fp-region-head";
      var name = document.createElement("span");
      name.className = "fp-region-name";
      name.textContent = rg.name;
      var date = document.createElement("span");
      date.className = "fp-region-date";
      date.textContent = rg.date || "";
      head.appendChild(name);
      head.appendChild(date);
      li.appendChild(head);

      var photos = (rg.photoIds || []).map(photoById).filter(Boolean);
      if (photos.length) {
        var strip = document.createElement("div");
        strip.className = "fp-thumbs";
        photos.forEach(function (p, idx) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "fp-thumb";
          b.setAttribute("aria-label", "View photo: " + p.caption);
          var img = document.createElement("img");
          img.src = p.thumb || p.src;
          img.alt = p.caption;
          img.loading = "lazy";
          img.decoding = "async";
          b.appendChild(img);
          b.addEventListener("click", function () {
            if (window.SiteLightbox) window.SiteLightbox.open(photos, idx);
          });
          strip.appendChild(b);
        });
        li.appendChild(strip);
      }
      list.appendChild(li);
    });
    return list;
  }

  function openCountry(code) {
    var d = FOOTPRINTS[code];
    if (!d || !d.visited) return;
    if (typeof SiteModal === "undefined") return;
    ensureModal();

    modal.body.innerHTML = "";

    var title = document.createElement("h3");
    title.className = "archive-title";
    title.textContent = d.name;
    if (!(d.regions || []).length && d.date) {
      var when = document.createElement("span");
      when.className = "fp-region-date";
      when.textContent = " · " + d.date;
      title.appendChild(when);
    }
    modal.body.appendChild(title);

    var regions = d.regions || [];
    if (DETAIL[code]) {
      var wrap = document.createElement("div");
      wrap.className = "fp-detail";
      wrap.innerHTML = "<p class='archive-sub'>Loading map…</p>";
      wrap.appendChild(modalTip);
      modal.body.appendChild(wrap);
      loadDetail(code).then(function (txt) {
        if (!wrap.isConnected) return;
        wrap.innerHTML = txt;
        wrap.appendChild(modalTip);
        var svg = wrap.querySelector("svg");
        if (!svg) return;
        DETAIL[code].markVisited(svg, visitedRegionNames(code));
        bindModalMap(svg, wrap, DETAIL[code]);
      }).catch(function () {
        wrap.innerHTML = "";
      });
    }

    if (regions.length) {
      modal.body.appendChild(buildRegionList(d));
    } else {
      var p = document.createElement("p");
      p.className = "archive-sub";
      p.textContent = "Details coming soon.";
      modal.body.appendChild(p);
    }
    modal.open();
  }

  // ---- Semantic layers (prebuilt; toggled by class only) -----------------
  var worldSvg = null;
  var viewport = null;    // svg-pan-zoom's viewport <g>
  var layersBuilt = false;
  var layersBuilding = null;
  var panZoom = null;
  var semanticState = { detail: false, cities: false };

  function buildLayer(code, txt) {
    var doc = new DOMParser().parseFromString(txt, "image/svg+xml");
    var src = doc.documentElement;
    var vb = (src.getAttribute("viewBox") || "0 0 100 100").split(/\s+/).map(Number);

    var worldPath = worldSvg.querySelector('[id="' + code.toLowerCase() + '"]');
    if (!worldPath) return;
    var wb = worldPath.getBBox();

    var s = Math.min(wb.width / vb[2], wb.height / vb[3]);
    var tx = wb.x + (wb.width - vb[2] * s) / 2 - vb[0] * s;
    var ty = wb.y + (wb.height - vb[3] * s) / 2 - vb[1] * s;

    var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "fp-detail-layer");
    g.setAttribute("transform", "translate(" + tx + " " + ty + ") scale(" + s + ")");
    g.dataset.country = code;

    // copy geometry only — never the source's <style>/<defs>/<title>
    Array.prototype.forEach.call(src.children, function (child) {
      var t = child.tagName.toLowerCase();
      if (t === "style" || t === "defs" || t === "title") return;
      g.appendChild(document.importNode(child, true));
    });

    DETAIL[code].markVisited(g, visitedRegionNames(code));
    worldPath.classList.add("fp-has-detail");
    viewport.appendChild(g);
  }

  function buildLayers() {
    if (layersBuilding) return layersBuilding;
    layersBuilding = Promise.all(Object.keys(DETAIL).map(function (code) {
      if (!FOOTPRINTS[code] || !FOOTPRINTS[code].visited) return null;
      return loadDetail(code).then(function (txt) { buildLayer(code, txt); });
    })).then(function () {
      layersBuilt = true;
      buildCities();
      applySemantic(); // re-apply in case a threshold was crossed while loading
    });
    return layersBuilding;
  }

  function buildCities() {
    var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "fp-cities");
    Object.keys(FOOTPRINTS).forEach(function (code) {
      var d = FOOTPRINTS[code];
      if (!d.visited) return;
      (d.regions || []).forEach(function (rg) {
        if (typeof rg.lat !== "number" || typeof rg.lng !== "number") return;
        var pt = project(rg.lat, rg.lng); // computed once, baked into the DOM
        var city = document.createElementNS("http://www.w3.org/2000/svg", "g");
        city.setAttribute("class", "fp-city");
        city.setAttribute("transform", "translate(" + pt.x.toFixed(1) + " " + pt.y.toFixed(1) + ")");
        var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("r", "1.5");
        var label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("y", "-2.8");
        label.textContent = rg.name;
        city.appendChild(dot);
        city.appendChild(label);
        g.appendChild(city);
      });
    });
    viewport.appendChild(g);
  }

  function applySemantic() {
    worldSvg.classList.toggle("fp-zoomed", semanticState.detail && layersBuilt);
    worldSvg.classList.toggle("fp-cities-on", semanticState.cities && layersBuilt);
  }

  function onZoom(zoom) {
    var wantDetail = zoom >= DETAIL_ZOOM;
    var wantCities = zoom >= CITY_ZOOM;
    if (wantDetail === semanticState.detail && wantCities === semanticState.cities) return;
    semanticState.detail = wantDetail;
    semanticState.cities = wantCities;
    if (wantDetail && !layersBuilt) buildLayers();
    applySemantic();
  }

  // ---- Pan/zoom controls -------------------------------------------------
  function addControls() {
    var box = document.createElement("div");
    box.className = "fp-zoom-controls";
    [["+", "Zoom in", function () { panZoom.zoomIn(); }],
     ["−", "Zoom out", function () { panZoom.zoomOut(); }],
     ["⟲", "Reset view", function () { panZoom.reset(); }]].forEach(function (def) {
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
  }

  // Touch: two-finger pan + pinch zoom (one finger stays free for page
  // scrolling). svg-pan-zoom needs a custom handler for touch input.
  function touchHandler() {
    var startDist = 0;
    var startZoom = 1;
    var lastMid = null;

    function dist(t) {
      return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    }
    function mid(t, rect) {
      return {
        x: (t[0].clientX + t[1].clientX) / 2 - rect.left,
        y: (t[0].clientY + t[1].clientY) / 2 - rect.top,
      };
    }

    return {
      haltEventListeners: [],
      init: function (options) {
        var el = options.svgElement;
        var instance = options.instance;
        this._start = function (e) {
          if (e.touches.length !== 2) return;
          e.preventDefault();
          startDist = dist(e.touches);
          startZoom = instance.getZoom();
          lastMid = mid(e.touches, el.getBoundingClientRect());
        };
        this._move = function (e) {
          if (e.touches.length !== 2) return;
          e.preventDefault();
          var rect = el.getBoundingClientRect();
          var m = mid(e.touches, rect);
          instance.zoomAtPoint(startZoom * (dist(e.touches) / startDist), m);
          if (lastMid) instance.panBy({ x: m.x - lastMid.x, y: m.y - lastMid.y });
          lastMid = m;
        };
        this._end = function () { lastMid = null; };
        el.addEventListener("touchstart", this._start, { passive: false });
        el.addEventListener("touchmove", this._move, { passive: false });
        el.addEventListener("touchend", this._end);
      },
      destroy: function (options) {
        var el = options.svgElement;
        el.removeEventListener("touchstart", this._start);
        el.removeEventListener("touchmove", this._move);
        el.removeEventListener("touchend", this._end);
      },
    };
  }

  function setupPanZoom(svg) {
    if (typeof svgPanZoom === "undefined") return;
    panZoom = svgPanZoom(svg, {
      zoomEnabled: true,
      panEnabled: true,
      dblClickZoomEnabled: true,
      mouseWheelZoomEnabled: true,
      controlIconsEnabled: false,
      fit: true,
      center: true,
      minZoom: 1,
      maxZoom: 8,
      zoomScaleSensitivity: 0.3,
      onZoom: onZoom,
      customEventsHandler: touchHandler(),
      // keep the map on screen: at least 80px of it stays visible each side
      beforePan: function (oldPan, newPan) {
        var sizes = this.getSizes();
        var gutterW = sizes.width - 80;
        var gutterH = sizes.height - 80;
        var vbW = sizes.viewBox.width * sizes.realZoom;
        var vbH = sizes.viewBox.height * sizes.realZoom;
        return {
          x: Math.max(-vbW + (sizes.width - gutterW), Math.min(gutterW, newPan.x)),
          y: Math.max(-vbH + (sizes.height - gutterH), Math.min(gutterH, newPan.y)),
        };
      },
    });
    viewport = svg.querySelector(".svg-pan-zoom_viewport");
    addControls();

    // Prebuild detail layers during idle time so the first threshold
    // crossing is a pure class toggle (no fetch/parse mid-gesture).
    if ("requestIdleCallback" in window) {
      requestIdleCallback(function () { buildLayers(); }, { timeout: 4000 });
    } else {
      setTimeout(buildLayers, 2500);
    }
  }

  // ---- World-map delegation (also serves the injected detail layers) -----
  function bind(svg) {
    svg.addEventListener("mouseover", function (e) {
      var p = e.target.closest("path");
      if (!p) { tip.hidden = true; return; }

      var layer = p.closest(".fp-detail-layer");
      if (layer) {
        var code = layer.dataset.country;
        var rn = DETAIL[code].regionName(p);
        if (!rn) { tip.hidden = true; return; }
        tip.textContent = rn + ", " + FOOTPRINTS[code].name;
        tip.classList.toggle("muted", !p.classList.contains("visited"));
        tip.hidden = false;
        return;
      }

      var d = FOOTPRINTS[p.id.toUpperCase()] || null;
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
      var r = host.getBoundingClientRect();
      tip.style.transform =
        "translate(" + (e.clientX - r.left + 14) + "px," + (e.clientY - r.top + 14) + "px)";
    }, { passive: true });

    svg.addEventListener("click", function (e) {
      var p = e.target.closest("path");
      if (!p) return;
      var layer = p.closest(".fp-detail-layer");
      if (layer) {
        openCountry(layer.dataset.country);
        return;
      }
      if (p.classList.contains("visited")) openCountry(p.id.toUpperCase());
    });
  }

  // ---- Init --------------------------------------------------------------
  var inited = false;

  function init() {
    if (inited) return;
    inited = true;
    fetch("assets/maps/world.svg")
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        host.innerHTML = txt;
        worldSvg = host.querySelector("svg");
        if (!worldSvg) return;
        Object.keys(FOOTPRINTS).forEach(function (code) {
          if (!FOOTPRINTS[code].visited) return;
          var p = worldSvg.querySelector('[id="' + code.toLowerCase() + '"]');
          if (p) p.classList.add("visited");
        });
        bind(worldSvg);
        setupPanZoom(worldSvg);
        if (!viewport) viewport = worldSvg; // no-pan-zoom fallback
      })
      .catch(function () {
        host.innerHTML = "<p class='archive-sub'>Couldn't load the map.</p>";
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
