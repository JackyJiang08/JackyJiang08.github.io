// Theme toggle: persists choice in localStorage; LIGHT is the default
// when no preference is stored.
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  const icon = toggle ? toggle.querySelector(".theme-toggle-icon") : null;

  function currentTheme() {
    return root.getAttribute("data-theme") || "light";
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    if (icon) icon.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") {
    apply(saved);
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      const next = currentTheme() === "dark" ? "light" : "dark";
      apply(next);
      localStorage.setItem("theme", next);
    });
  }
})();

// Scroll-reveal for sections.
(function () {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08 }
  );
  items.forEach((el) => io.observe(el));
})();

// Scrollspy + scroll-progress bar. The section list is derived from the nav
// links at runtime, so it always matches the current section order.
(function () {
  const links = document.querySelectorAll("#nav-links a[href^='#']");
  const sections = Array.from(links)
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  const progress = document.querySelector(".scroll-progress");
  if (!sections.length && !progress) return;

  function onScroll() {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    const atBottom = scrollable > 0 && window.scrollY >= scrollable - 2;

    if (progress) {
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      progress.style.width = Math.min(100, Math.max(0, pct)) + "%";
    }

    const y = window.scrollY + 90;
    let current = null;
    for (const s of sections) {
      if (s.offsetTop <= y) current = s;
    }
    // when fully scrolled, the last section wins even if it is short
    if (atBottom && sections.length) current = sections[sections.length - 1];
    links.forEach((a) => {
      const active = current && a.getAttribute("href") === "#" + current.id;
      a.classList.toggle("active", Boolean(active));
    });
  }

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        onScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();

// Highlights: the page shows the 5 most recent one-line entries from
// js/data/highlights.js; the full log opens in the News Archive modal
// (shared js/modal.js component), grouped by year with filter chips.
(function () {
  const list = document.getElementById("highlights-list");
  const openBtn = document.getElementById("highlights-archive-open");
  if (!list || typeof HIGHLIGHTS === "undefined") return;

  const items = HIGHLIGHTS.slice().sort((a, b) => b.date.localeCompare(a.date));
  const years = [...new Set(items.map((i) => i.date.slice(0, 4)))];

  function orgAnchor(name, href) {
    if (!href) {
      const s = document.createElement("span");
      s.textContent = name;
      return s;
    }
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = name;
    return a;
  }

  function row(item) {
    const li = document.createElement("li");
    li.className = "hl-row";
    const date = document.createElement("strong");
    date.className = "hl-date";
    date.textContent = "[" + item.date + "]";
    li.appendChild(date);
    li.appendChild(document.createTextNode(" "));

    if (item.org) {
      // "Joined <org link> as a <bold role>."
      li.appendChild(document.createTextNode("Joined "));
      li.appendChild(orgAnchor(item.org, item.orgLink));
      if (item.orgNote) li.appendChild(document.createTextNode(item.orgNote));
      const article = /^[aeiou]/i.test(item.role) ? "an" : "a";
      li.appendChild(document.createTextNode(" as " + article + " "));
      const role = document.createElement("strong");
      role.className = "hl-role";
      role.textContent = item.role;
      li.appendChild(role);
      li.appendChild(document.createTextNode("."));
    } else {
      // plain text; only the linkText words become the link
      const text = item.text || "";
      const idx = item.link && item.linkText ? text.indexOf(item.linkText) : -1;
      if (idx !== -1) {
        li.appendChild(document.createTextNode(text.slice(0, idx)));
        li.appendChild(orgAnchor(item.linkText, item.link));
        li.appendChild(document.createTextNode(text.slice(idx + item.linkText.length)));
      } else {
        li.appendChild(document.createTextNode(text));
      }
    }
    return li;
  }

  // in-page: 5 most recent only
  items.slice(0, 5).forEach((i) => list.appendChild(row(i)));

  // ---- News Archive modal (built lazily on first open) ----
  let modal = null;

  function buildArchive() {
    modal = SiteModal.create({ label: "News archive", extraClass: "modal-archive" });

    const title = document.createElement("h3");
    title.className = "archive-title";
    title.textContent = "News Archive";
    const sub = document.createElement("p");
    sub.className = "archive-sub";
    sub.textContent = "Earlier updates — internships, research, and milestones";

    const bar = document.createElement("div");
    bar.className = "filter-chips";
    bar.setAttribute("role", "toolbar");
    bar.setAttribute("aria-label", "Filter archive by year");

    ["all", ...years].forEach((f, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (idx === 0 ? " active" : "");
      b.dataset.filter = f;
      b.setAttribute("aria-pressed", String(idx === 0));
      b.textContent = f === "all" ? "All" : f;
      bar.appendChild(b);
    });
    const chips = Array.from(bar.querySelectorAll(".chip"));

    const groups = document.createElement("div");
    groups.className = "archive-groups";
    years.forEach((y) => {
      const sec = document.createElement("section");
      sec.className = "archive-group";
      sec.dataset.year = y;
      const h = document.createElement("h4");
      h.className = "archive-year";
      h.textContent = y;
      const ul = document.createElement("ul");
      ul.className = "hl-list archive-list";
      items
        .filter((i) => i.date.slice(0, 4) === y)
        .forEach((i) => ul.appendChild(row(i)));
      sec.appendChild(h);
      sec.appendChild(ul);
      groups.appendChild(sec);
    });

    function select(filter) {
      chips.forEach((c) => {
        const on = c.dataset.filter === filter;
        c.classList.toggle("active", on);
        c.setAttribute("aria-pressed", String(on));
      });
      groups.querySelectorAll(".archive-group").forEach((g) => {
        g.hidden = filter !== "all" && g.dataset.year !== filter;
      });
    }

    bar.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (chip) select(chip.dataset.filter);
    });

    bar.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const i = chips.indexOf(document.activeElement);
      if (i === -1) return;
      e.preventDefault();
      const next = e.key === "ArrowRight"
        ? (i + 1) % chips.length
        : (i - 1 + chips.length) % chips.length;
      chips[next].focus();
    });

    modal.body.appendChild(title);
    modal.body.appendChild(sub);
    modal.body.appendChild(bar);
    modal.body.appendChild(groups);
  }

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      if (typeof SiteModal === "undefined") return;
      if (!modal) buildArchive();
      modal.open();
    });
  }
})();

// Footer year
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
