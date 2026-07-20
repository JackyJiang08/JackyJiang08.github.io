// Theme toggle: persists choice in localStorage, defaults to system preference.
(function () {
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  const icon = toggle ? toggle.querySelector(".theme-toggle-icon") : null;

  function systemPrefersDark() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function currentTheme() {
    return root.getAttribute("data-theme") ||
      (systemPrefersDark() ? "dark" : "light");
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    if (icon) icon.textContent = theme === "dark" ? "☀️" : "🌙";
  }

  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") {
    apply(saved);
  } else if (icon) {
    icon.textContent = systemPrefersDark() ? "☀️" : "🌙";
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

// Typing effect for the profile role line.
(function () {
  const el = document.getElementById("typed-role");
  if (!el) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const phrases = [
    "Machine Learning Researcher",
    "CS & Statistics @ UIUC",
    "LLM Adaptation & Agents",
    "Data Science & Quant Finance",
  ];
  let phrase = 0;
  let pos = phrases[0].length;
  let deleting = true;
  let wait = 1600;

  function tick() {
    const text = phrases[phrase];
    if (wait > 0) {
      const w = wait;
      wait = 0;
      setTimeout(tick, w);
      return;
    }
    if (deleting) {
      pos -= 1;
      el.textContent = text.slice(0, pos);
      if (pos === 0) {
        deleting = false;
        phrase = (phrase + 1) % phrases.length;
      }
      setTimeout(tick, 34);
    } else {
      pos += 1;
      el.textContent = phrases[phrase].slice(0, pos);
      if (pos === phrases[phrase].length) {
        deleting = true;
        wait = 2100;
      }
      setTimeout(tick, 62);
    }
  }
  setTimeout(tick, 1600);
})();

// Particle-network background (canvas-nest style). Desktop only; respects
// reduced-motion; pauses when the tab is hidden.
(function () {
  const canvas = document.getElementById("particles");
  if (!canvas) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.innerWidth < 768 || "ontouchstart" in window) return;

  const ctx = canvas.getContext("2d");
  const COUNT = 70;
  const LINK_DIST = 130;
  const MOUSE_DIST = 190;
  let dots = [];
  let w, h, raf;
  const mouse = { x: null, y: null };

  function accentRGB() {
    const dark = document.documentElement.getAttribute("data-theme") === "dark" ||
      (!document.documentElement.getAttribute("data-theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    return dark ? "129,140,248" : "79,70,229";
  }

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }

  function init() {
    dots = Array.from({ length: COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
    }));
  }

  function step() {
    ctx.clearRect(0, 0, w, h);
    const rgb = accentRGB();
    for (const d of dots) {
      d.x += d.vx;
      d.y += d.vy;
      if (d.x < 0 || d.x > w) d.vx *= -1;
      if (d.y < 0 || d.y > h) d.vy *= -1;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + rgb + ",0.35)";
      ctx.fill();
    }
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x;
        const dy = dots[i].y - dots[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < LINK_DIST) {
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.strokeStyle = "rgba(" + rgb + "," + 0.16 * (1 - dist / LINK_DIST) + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      if (mouse.x !== null) {
        const dx = dots[i].x - mouse.x;
        const dy = dots[i].y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_DIST) {
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = "rgba(" + rgb + "," + 0.12 * (1 - dist / MOUSE_DIST) + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    raf = requestAnimationFrame(step);
  }

  window.addEventListener("resize", () => {
    resize();
    init();
  });
  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });
  window.addEventListener("mouseout", () => {
    mouse.x = null;
    mouse.y = null;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(step);
    }
  });

  resize();
  init();
  step();
})();

// Footer year
(function () {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
