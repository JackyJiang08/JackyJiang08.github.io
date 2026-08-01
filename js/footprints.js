// Footprints world map — vanilla JS + inline SVG, no libraries.
//
// Performance contract:
//  - lazy init: the SVG (assets/maps/world.svg, ~240 KB) is fetched and
//    injected only when the section approaches the viewport
//  - ONE delegated mouseover/mousemove/click listener on the SVG root
//  - hover styling is pure CSS (.visited:hover); the only per-mousemove JS
//    write is the tooltip's transform (translate — no top/left layout)
//  - a single reused tooltip element, absolutely positioned
(function () {
  "use strict";

  var section = document.getElementById("footprints");
  var host = document.getElementById("fp-map");
  var tip = document.getElementById("fp-tip");
  if (!section || !host || !tip || typeof FOOTPRINTS === "undefined") return;

  var inited = false;
  var modal = null;

  function countryFor(pathEl) {
    return FOOTPRINTS[pathEl.id.toUpperCase()] || null;
  }

  function openCountry(code) {
    var d = FOOTPRINTS[code];
    if (!d || !d.visited) return;
    if (typeof SiteModal === "undefined") return;
    if (!modal) {
      modal = SiteModal.create({ label: "Footprints — country details", extraClass: "modal-country" });
    }
    modal.body.innerHTML = "";
    var title = document.createElement("h3");
    title.className = "archive-title";
    title.textContent = d.name;
    modal.body.appendChild(title);

    var regions = d.regions || [];
    if (regions.length) {
      var list = document.createElement("ul");
      list.className = "fp-region-list";
      regions.forEach(function (rg) {
        var li = document.createElement("li");
        var name = document.createElement("span");
        name.className = "fp-region-name";
        name.textContent = rg.name;
        var date = document.createElement("span");
        date.className = "fp-region-date";
        date.textContent = rg.date || "";
        li.appendChild(name);
        li.appendChild(date);
        list.appendChild(li);
      });
      modal.body.appendChild(list);
    } else {
      var p = document.createElement("p");
      p.className = "archive-sub";
      p.textContent = "Details coming soon.";
      modal.body.appendChild(p);
    }
    modal.open();
  }

  function bind(svg) {
    svg.addEventListener("mouseover", function (e) {
      var p = e.target.closest("path");
      if (!p) { tip.hidden = true; return; }
      var d = countryFor(p);
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

    // only per-move write: a composited transform on the reused tooltip
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
