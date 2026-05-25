/* Kymar landing — interactive bits.
 *
 * 1) Day/night theme toggle. The app ships two palettes (Studio dark,
 *    Olive cream); the site mirrors them so the web identity stays
 *    in sync. Persistence via localStorage so a refresh keeps the
 *    user's choice. First-visit fallback: honours the OS
 *    `prefers-color-scheme` so users who prefer light don't see a
 *    flash of dark.
 * 2) Hero phone-frame parallax tilt (mousemove, desktop only).
 *
 * No build step, no framework — vanilla ES2020+. Loaded with `defer`,
 * so the DOM is parsed before any of this runs. */

(() => {
  'use strict';

  /* ---------- 1. Theme toggle (Studio / Olive) ---------- */

  const STORAGE_KEY = 'kymar.site.theme';
  const root = document.documentElement;

  function applyTheme(name) {
    // `studio` is the default in CSS (no attribute set); olive is
    // applied via data-theme so [data-theme="olive"] overrides the
    // :root variables. Keep this string in sync with styles.css.
    if (name === 'olive') root.setAttribute('data-theme', 'olive');
    else                  root.removeAttribute('data-theme');
    updateToggleLabel(name);
  }

  function currentTheme() {
    return root.getAttribute('data-theme') === 'olive' ? 'olive' : 'studio';
  }

  function updateToggleLabel(name) {
    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    // Glyph swap — moon when on Studio (offering Olive), sun when
    // on Olive (offering Studio). Same icon-button stays in place.
    btn.textContent = name === 'olive' ? '☾' : '☀';
    btn.setAttribute('aria-label',
      name === 'olive' ? 'Switch to dark theme' : 'Switch to light theme');
    btn.setAttribute('aria-pressed', name === 'olive' ? 'true' : 'false');
  }

  // Initial seed: stored preference > OS prefers-color-scheme > Studio.
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'olive' || stored === 'studio') applyTheme(stored);
    else if (matchMedia('(prefers-color-scheme: light)').matches) applyTheme('olive');
    else applyTheme('studio');
  } catch (_) { applyTheme('studio'); }

  // Wire the toggle button. Idempotent if the button is missing.
  document.querySelector('.theme-toggle')?.addEventListener('click', () => {
    const next = currentTheme() === 'olive' ? 'studio' : 'olive';
    applyTheme(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
  });

  /* ---------- 2. Phone-frame parallax tilt ---------- */

  const heroScreen = document.querySelector('.hero-screen');
  const heroFrame  = heroScreen?.querySelector('.phone-frame');

  if (heroScreen && heroFrame && matchMedia('(hover: hover)').matches
      && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Limit the tilt to ~8deg in each axis — past that the perspective
    // distortion starts to read as "broken layout" rather than parallax.
    const MAX = 8;
    heroScreen.addEventListener('mousemove', (e) => {
      const r = heroScreen.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width  - 0.5) * 2;   // -1..1
      const y = ((e.clientY - r.top)  / r.height - 0.5) * 2;
      heroFrame.style.transform =
        `rotateY(${x * MAX}deg) rotateX(${-y * MAX}deg)`;
    });
    heroScreen.addEventListener('mouseleave', () => {
      // CSS transition handles the easing back to neutral.
      heroFrame.style.transform = '';
    });
  }
})();
