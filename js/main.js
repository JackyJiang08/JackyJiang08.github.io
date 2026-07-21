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

// Scrollspy: highlight the nav link for the section in view.
(function () {
  const links = document.querySelectorAll("#nav-links a[href^='#']");
  const sections = Array.from(links)
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  if (!sections.length) return;

  function onScroll() {
    const y = window.scrollY + 90;
    let current = null;
    for (const s of sections) {
      if (s.offsetTop <= y) current = s;
    }
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
  onScroll();
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
