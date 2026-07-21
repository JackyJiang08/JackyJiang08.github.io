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

// Impact metrics: count up when scrolled into view. The DOM ships final
// values, so reduced-motion users (and no-JS) simply see them as-is.
(function () {
  const nums = document.querySelectorAll(".metric-num[data-count]");
  if (!nums.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  function animate(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const duration = 1200;
    const start = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        animate(e.target);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.4 });
  nums.forEach((el) => io.observe(el));
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

// Typing effect for the profile role line. The DOM ships the static
// "Quantitative Developer · Data Scientist · ML Engineer" line, which stays
// as-is under prefers-reduced-motion; otherwise it is typed away and the
// roles cycle one at a time.
(function () {
  const el = document.getElementById("typed-role");
  if (!el) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const phrases = [
    "Quantitative Developer",
    "Data Scientist",
    "ML Engineer",
  ];
  let phrase = 0;
  let deleting = true;

  function tick() {
    const current = el.textContent;
    if (deleting) {
      if (current.length > 0) {
        el.textContent = current.slice(0, -1);
        setTimeout(tick, 26);
      } else {
        deleting = false;
        setTimeout(tick, 320);
      }
    } else {
      const target = phrases[phrase];
      if (current.length < target.length) {
        el.textContent = target.slice(0, current.length + 1);
        setTimeout(tick, 62);
      } else {
        deleting = true;
        phrase = (phrase + 1) % phrases.length;
        setTimeout(tick, 2100);
      }
    }
  }
  setTimeout(tick, 1500);
})();

// Footer year
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
