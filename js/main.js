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

// Highlights: rendered from js/data/highlights.js (HIGHLIGHTS global).
// Sorted newest-first regardless of array order; year filter chips are
// generated automatically from the dates present in the data.
(function () {
  const list = document.getElementById("highlights-list");
  const bar = document.getElementById("highlights-filters");
  if (!list || !bar || typeof HIGHLIGHTS === "undefined") return;

  const items = HIGHLIGHTS.slice().sort((a, b) => b.date.localeCompare(a.date));
  const years = [...new Set(items.map((i) => i.date.slice(0, 4)))];

  function render(year) {
    list.innerHTML = "";
    items
      .filter((i) => year === "all" || i.date.slice(0, 4) === year)
      .forEach((i) => {
        const li = document.createElement("li");
        const date = document.createElement("span");
        date.className = "news-date";
        date.textContent = i.label || i.date;
        const text = document.createElement("span");
        text.className = "news-text";
        text.textContent = i.text;
        if (i.link) {
          text.appendChild(document.createTextNode(" "));
          const a = document.createElement("a");
          a.href = i.link;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = "↗";
          a.setAttribute("aria-label", "Open link: " + i.text.split(" ").slice(0, 6).join(" ") + "…");
          text.appendChild(a);
        }
        li.appendChild(date);
        li.appendChild(text);
        list.appendChild(li);
      });
  }

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

  function select(filter) {
    chips.forEach((c) => {
      const on = c.dataset.filter === filter;
      c.classList.toggle("active", on);
      c.setAttribute("aria-pressed", String(on));
    });
    render(filter);
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

  select("all");
})();

// Project filter chips: buttons toggle which cards are visible, matched via
// data-domains on the cards. Keyboard: chips are real buttons (Enter/Space
// native) and Left/Right arrows move focus within the toolbar.
(function () {
  const bar = document.getElementById("project-filters");
  const grid = document.getElementById("project-grid");
  if (!bar || !grid) return;
  const chips = Array.from(bar.querySelectorAll(".chip"));
  const cards = Array.from(grid.querySelectorAll(".card"));

  function applyFilter(filter) {
    chips.forEach((c) => {
      const on = c.dataset.filter === filter;
      c.classList.toggle("active", on);
      c.setAttribute("aria-pressed", String(on));
    });
    cards.forEach((card) => {
      const domains = (card.dataset.domains || "").split(/\s+/);
      card.hidden = filter !== "all" && !domains.includes(filter);
    });
  }

  bar.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) applyFilter(chip.dataset.filter);
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

  applyFilter("all");
})();

// Footer year
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
