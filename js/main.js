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

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
