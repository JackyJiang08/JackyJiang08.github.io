// Footprints world map — vanilla JS + inline SVG, no libraries.
//
// Performance contract:
//  - lazy init: the world SVG (~240 KB) is fetched only when the section
//    approaches the viewport; CN/US detail SVGs are fetched on FIRST open of
//    that country's modal and cached in memory afterward
//  - ONE delegated mouseover/mousemove/click listener per SVG root
//  - hover styling is pure CSS; the only per-mousemove JS write is the
//    tooltip's transform (translate — no top/left layout)
//  - region photo thumbnails are created only when the modal opens
(function () {
  "use strict";

  var section = document.getElementById("footprints");
  var host = document.getElementById("fp-map");
  var tip = document.getElementById("fp-tip");
  if (!section || !host || !tip || typeof FOOTPRINTS === "undefined") return;

  // ---- Detail-map adapters ----------------------------------------------
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
      markVisited: function (svg, names) {
        svg.querySelectorAll("path").forEach(function (p) {
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
      markVisited: function (svg, names) {
        Object.keys(US_NAMES).forEach(function (code) {
          if (names.indexOf(US_NAMES[code].toLowerCase()) === -1) return;
          svg.querySelectorAll("path." + code).forEach(function (p) {
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

  // ---- Country modal -----------------------------------------------------
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
    void li.offsetWidth; // restart the animation
    li.classList.add("flash");
  }

  function bindDetail(svg, wrap, adapter) {
    svg.addEventListener("mouseover", function (e) {
      var name = adapter.regionName(e.target);
      if (!name) { modalTip.hidden = true; return; }
      modalTip.textContent = name;
      modalTip.classList.toggle("muted", !e.target.classList.contains("visited"));
      modalTip.hidden = false;
    });
    svg.addEventListener("mouseleave", function () {
      modalTip.hidden = true;
    });
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

      // photo strip — only for regions that actually have photos
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
    // single dated visit with no regions: date joins the header
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
        // stale-open guard: only inject if this wrap is still in the modal
        if (!wrap.isConnected) return;
        wrap.innerHTML = txt;
        wrap.appendChild(modalTip);
        var svg = wrap.querySelector("svg");
        if (!svg) return;
        DETAIL[code].markVisited(svg, regions.map(function (r) {
          return r.name.toLowerCase();
        }));
        bindDetail(svg, wrap, DETAIL[code]);
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

  // ---- World map ---------------------------------------------------------
  function bind(svg) {
    svg.addEventListener("mouseover", function (e) {
      var p = e.target.closest("path");
      if (!p) { tip.hidden = true; return; }
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

    svg.addEventListener("mouseleave", function () {
      tip.hidden = true;
    });

    svg.addEventListener("mousemove", function (e) {
      var r = host.getBoundingClientRect();
      tip.style.transform =
        "translate(" + (e.clientX - r.left + 14) + "px," + (e.clientY - r.top + 14) + "px)";
    }, { passive: true });

    svg.addEventListener("click", function (e) {
      var p = e.target.closest("path.visited");
      if (p) openCountry(p.id.toUpperCase());
    });
  }

  var inited = false;

  function init() {
    if (inited) return;
    inited = true;
    fetch("assets/maps/world.svg")
      .then(function (r) { return r.text(); })
      .then(function (txt) {
        host.innerHTML = txt;
        var svg = host.querySelector("svg");
        if (!svg) return;
        Object.keys(FOOTPRINTS).forEach(function (code) {
          if (!FOOTPRINTS[code].visited) return;
          var p = svg.querySelector('[id="' + code.toLowerCase() + '"]');
          if (p) p.classList.add("visited");
        });
        bind(svg);
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
