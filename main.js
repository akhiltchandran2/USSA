/* US Aviation Academy — homepage interactions */
(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Load-in: hero text, banner and glass card animate once fonts are ready */
  const markLoaded = () => setTimeout(() => document.body.classList.add('is-loaded'), 30);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(markLoaded);
  setTimeout(markLoaded, 1200); // fallback if fonts are slow

  /* Sticky floating header -------------------------------------------- */
  const header = document.querySelector('.site-header');
  const sticky = document.querySelector('.sticky-nav');
  const stickyFocusables = sticky.querySelectorAll('a, button, input');

  const setStickyVisible = (visible) => {
    if (sticky.classList.contains('is-visible') === visible) return;
    sticky.classList.toggle('is-visible', visible);
    sticky.setAttribute('aria-hidden', String(!visible));
    stickyFocusables.forEach((el) => (el.tabIndex = visible ? 0 : -1));
    if (!visible) closePillSearch();
  };

  /* Pill search: icon expands into an input */
  const pillSearch = sticky.querySelector('.pill-search');
  const pillInput = pillSearch.querySelector('input');
  const pillBtn = pillSearch.querySelector('.pill-search-btn');
  function closePillSearch() { pillSearch.classList.remove('is-open'); }
  pillBtn.addEventListener('click', () => {
    const open = !pillSearch.classList.contains('is-open');
    pillSearch.classList.toggle('is-open', open);
    pillBtn.setAttribute('aria-label', open ? 'Close search' : 'Open search');
    if (open) pillInput.focus();
  });
  pillInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePillSearch(); pillBtn.focus(); } });
  document.addEventListener('click', (e) => { if (!pillSearch.contains(e.target)) closePillSearch(); });

  /* Active nav link follows the section in view */
  const navLinks = [...document.querySelectorAll('.nav-menu a[href^="#"]')];
  const sectionIds = [...new Set(navLinks.map((a) => a.getAttribute('href').slice(1)))];
  const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
  const setActive = (id) => navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));

  /* Hero banner gentle parallax */
  const bannerPhoto = document.querySelector('.banner-photo');
  const banner = document.querySelector('.hero-banner');

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY;
      setStickyVisible(y > header.offsetHeight + 40);

      let current = '';
      for (const s of sections) if (s.getBoundingClientRect().top <= window.innerHeight * 0.35) current = s.id;
      setActive(current);

      if (!reduceMotion && document.body.classList.contains('is-loaded')) {
        const r = banner.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) {
          const p = Math.min(1, Math.max(0, -r.top / r.height));
          bannerPhoto.style.setProperty('--parallax-scale', (1 + p * 0.08).toFixed(4));
        }
      }
      updateScrollWords();
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* Mobile menu ------------------------------------------------------- */
  const menu = document.getElementById('mobile-menu');
  const toggles = document.querySelectorAll('.menu-toggle');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    toggles.forEach((t) => { t.setAttribute('aria-expanded', String(open)); t.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); });
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      document.body.style.overflow = 'hidden';
    } else {
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 300);
    }
  };
  toggles.forEach((t) => t.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open'))));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false); });

  /* Scroll-reveal words (display headings) ------------------------------ */
  const wordHeadings = [...document.querySelectorAll('.scroll-words')];
  wordHeadings.forEach((h) => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ');
  });
  function updateScrollWords() {
    const vh = window.innerHeight;
    for (const h of wordHeadings) {
      const r = h.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) continue;
      // 0 when the heading enters at 90% of the viewport, 1 by the time it reaches 45%
      const p = reduceMotion ? 1 : Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.45)));
      const spans = h.children;
      const lit = Math.round(p * spans.length);
      for (let i = 0; i < spans.length; i++) spans[i].classList.toggle('lit', i < lit);
    }
  }

  /* Count-up numbers ---------------------------------------------------- */
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const comma = el.hasAttribute('data-comma');
    const fmt = (n) => (comma ? n.toLocaleString('en-US') : String(n)) + suffix;
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const dur = 1600;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    el.textContent = fmt(0);
    requestAnimationFrame(tick);
  };

  /* In-view observers ---------------------------------------------------- */
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      el.classList.add('in-view');
      if (el.classList.contains('stats-grid')) el.querySelectorAll('[data-count]').forEach(countUp);
      if (el.classList.contains('glass-card')) countUp(el.querySelector('[data-count]'));
      io.unobserve(el);
    }
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal-up, .stats-grid').forEach((el) => io.observe(el));
  // the glass card counts up after its own load-in delay
  setTimeout(() => io.observe(document.querySelector('.glass-card')), 1000);

  /* Pre-footer reveal window: follows the pointer across the aircraft ----- */
  const visual = document.querySelector('.cta-visual');
  const WINDOW_W = 15.68;   // window width, % of visual
  const HOME_X = 46.2;      // Figma position
  let targetX = HOME_X, currentX = HOME_X, rafId = 0;
  const clampX = (x) => Math.min(100 - WINDOW_W, Math.max(0, x));
  const animateWindow = () => {
    currentX += (targetX - currentX) * 0.12;
    visual.style.setProperty('--wx', currentX.toFixed(3));
    rafId = Math.abs(targetX - currentX) > 0.02 ? requestAnimationFrame(animateWindow) : 0;
  };
  const moveTo = (x) => { targetX = clampX(x); if (!rafId) rafId = requestAnimationFrame(animateWindow); };
  const pointerX = (e) => {
    const r = visual.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * 100 - WINDOW_W / 2;
  };
  visual.addEventListener('pointermove', (e) => moveTo(pointerX(e)));
  visual.addEventListener('pointerleave', () => moveTo(HOME_X));
  visual.addEventListener('pointerdown', (e) => moveTo(pointerX(e)));
  // first time it scrolls into view, sweep the window across the plane
  if (!reduceMotion) {
    const sweep = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      sweep.disconnect();
      currentX = 8; visual.style.setProperty('--wx', currentX);
      moveTo(HOME_X);
    }, { threshold: 0.6 });
    sweep.observe(visual);
  }

  /* Prototype: keep dead links from jumping to the top */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  });

  onScroll();
})();
