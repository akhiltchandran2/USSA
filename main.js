/* US Aviation Academy — homepage interactions
   Motion values follow pactum-interactions.md (section numbers in comments). */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* §1.1 Smooth scroll (Lenis, duration 1.0) -------------------------------- */
  const lenis = !reduceMotion && window.Lenis ? new window.Lenis({ duration: 1.0 }) : null;
  if (lenis) {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const SCROLL_OFFSET = -96; // clears the floating header
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    e.preventDefault(); // prototype: dead "#" links do nothing
    if (hash === '#') return;
    const target = document.querySelector(hash);
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: hash === '#top' ? 0 : SCROLL_OFFSET });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + (hash === '#top' ? 0 : SCROLL_OFFSET) });
  });

  /* §7 Hero load sequence: start once fonts are ready ---------------------- */
  const markLoaded = () => setTimeout(() => document.body.classList.add('is-loaded'), 30);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(markLoaded);
  setTimeout(markLoaded, 1200); // fallback if fonts are slow

  /* §1.2 Sticky floating header -------------------------------------------- */
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
  function closePillSearch() { pillSearch.classList.remove('is-open'); pillBtn.setAttribute('aria-label', 'Open search'); }
  pillBtn.addEventListener('click', () => {
    const open = !pillSearch.classList.contains('is-open');
    pillSearch.classList.toggle('is-open', open);
    pillBtn.setAttribute('aria-label', open ? 'Close search' : 'Open search');
    if (open) pillInput.focus();
  });
  pillInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePillSearch(); pillBtn.focus(); } });
  document.addEventListener('click', (e) => { if (!pillSearch.contains(e.target)) closePillSearch(); });

  /* §3.1 Active nav dot follows the section in view */
  const navLinks = [...document.querySelectorAll('.nav-menu a[href^="#"]')];
  const sections = [...new Set(navLinks.map((a) => a.getAttribute('href').slice(1)))]
    .map((id) => document.getElementById(id)).filter(Boolean)
    .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)); // page order, not nav order
  const setActive = (id) => navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));

  /* Mobile menu (§1.2: scroll locks while open) ---------------------------- */
  const menu = document.getElementById('mobile-menu');
  const toggles = document.querySelectorAll('.menu-toggle');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    toggles.forEach((t) => { t.setAttribute('aria-expanded', String(open)); t.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); });
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      if (lenis) lenis.stop(); else document.body.style.overflow = 'hidden';
    } else {
      menu.classList.remove('is-open');
      if (lenis) lenis.start(); else document.body.style.overflow = '';
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 600);
    }
  };
  toggles.forEach((t) => t.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open'))));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) setMenu(false); });

  /* §6.3 Scroll colour reveal: split into words → characters --------------- */
  const revealHeadings = [...document.querySelectorAll('.scroll-words')].map((h) => {
    const text = h.textContent.trim();
    h.setAttribute('aria-label', text);
    const words = text.split(/\s+/);
    h.innerHTML = words.map((w) => `<span class="w" aria-hidden="true">${[...w].map((c) => `<span class="c">${c}</span>`).join('')}</span>`).join(' ');
    // each character gets its own slice of the 0→1 scroll range
    const chars = [];
    h.querySelectorAll('.w').forEach((wEl, wi) => {
      const start = wi / words.length, end = (wi + 1) / words.length;
      const cs = wEl.querySelectorAll('.c');
      cs.forEach((cEl, ci) => chars.push({ el: cEl, s: start + ((end - start) / cs.length) * ci, e: start + ((end - start) / cs.length) * (ci + 1), t: -1 }));
    });
    return { el: h, chars };
  });
  const updateReveal = () => {
    const vh = window.innerHeight;
    for (const h of revealHeadings) {
      const top = h.el.getBoundingClientRect().top;
      // offset ["start 0.75", "start 0.15"]
      const p = reduceMotion ? 1 : clamp((vh * 0.75 - top) / (vh * 0.6), 0, 1);
      for (const c of h.chars) {
        const t = clamp((p - c.s) / (c.e - c.s), 0, 1);
        if (t !== c.t) { c.t = t; c.el.style.setProperty('--t', t.toFixed(3)); }
      }
    }
  };

  /* §7 hero parallax (90% speed) + §6.5 DNA image parallax + §6.10 CTA scale */
  // Each page has a subset of these; missing ones are skipped.
  const bannerPhoto = document.querySelector('.banner-photo');
  const banner = document.querySelector('.hero-banner');
  const parallaxFrames = [...document.querySelectorAll('.parallax-frame')];
  const cta = document.getElementById('cta');
  const ctaHeading = cta && cta.querySelector('h2');
  let ctaScale = 2, ctaTarget = 2;

  const updateScrollLinked = () => {
    const vh = window.innerHeight;
    if (reduceMotion) { ctaTarget = 1; return; }
    if (banner) {
      const b = banner.getBoundingClientRect();
      if (b.bottom > 0 && b.top < vh) {
        const maxShift = b.height * 0.06; // image is 112% tall
        bannerPhoto.style.setProperty('--parallax', `${clamp(window.scrollY * 0.1, 0, maxShift).toFixed(1)}px`);
      }
    }
    for (const frame of parallaxFrames) {
      const d = frame.getBoundingClientRect();
      if (d.bottom > 0 && d.top < vh) {
        const maxShift = d.height * 0.08; // image is 116% tall
        frame.querySelector('img').style.setProperty('--parallax', `${clamp((d.top / vh) * 20 * -5, -maxShift, maxShift).toFixed(1)}px`);
      }
    }
    if (cta) {
      // scale 2 → 1 as the CTA section goes from "start end" to "start start"
      const c = cta.getBoundingClientRect();
      ctaTarget = 2 - clamp((vh - c.top) / vh, 0, 1);
    }
  };
  // spring-like smoothing for the CTA scale (stiffness 500 / damping 60 feel)
  const smoothCta = () => {
    ctaScale += (ctaTarget - ctaScale) * 0.18;
    if (Math.abs(ctaTarget - ctaScale) < 0.0005) ctaScale = ctaTarget;
    ctaHeading.style.setProperty('--cta-scale', ctaScale.toFixed(4));
    requestAnimationFrame(smoothCta);
  };
  if (ctaHeading) requestAnimationFrame(smoothCta);

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      setStickyVisible(window.scrollY > header.offsetHeight + 40);
      let current = '';
      for (const s of sections) if (s.getBoundingClientRect().top <= window.innerHeight * 0.35) current = s.id;
      setActive(current);
      updateScrollLinked();
      updateReveal();
    });
  };
  if (lenis) lenis.on('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* §6.7 Count-up numbers (spring bounce 0, duration 1) -------------------- */
  const countUp = (el, delay = 0) => {
    const target = Number(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const comma = el.hasAttribute('data-comma');
    const fmt = (n) => prefix + (comma ? n.toLocaleString('en-US') : String(n)) + suffix;
    if (reduceMotion) { el.textContent = fmt(target); return; }
    el.textContent = fmt(0);
    setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 1000);
        el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - t, 4))));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
  };

  /* §6.1 / §6.2 / §6.7 / §6.9 in-view triggers (50% in view, once) --------- */
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      el.classList.add('in-view');
      if (el.matches('.stats-grid, .count-group')) el.querySelectorAll('[data-count]').forEach((n) => countUp(n, 400));
      io.unobserve(el);
    }
  }, { threshold: 0.5 });
  document.querySelectorAll('.reveal-up, .heading-in, .stats-grid, .count-group, .draw-line, .slide-in').forEach((el) => io.observe(el));

  // hero glass card counts up as it lands (§7: card enters at 0.6s)
  const heroCount = document.querySelector('.glass-card [data-count]');
  if (heroCount) setTimeout(() => countUp(heroCount), reduceMotion ? 0 : 1300);

  /* Expanding card rows (locations, accreditation): hovered/focused card
     widens; the first card is active by default */
  document.querySelectorAll('.locations-grid, .accred-grid').forEach((locGrid) => {
    const locCards = [...locGrid.children];
    const activateCard = (card) => locCards.forEach((c) => c.classList.toggle('is-active', c === card));
    locCards.forEach((card) => {
      card.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') activateCard(card); });
      card.addEventListener('focus', () => activateCard(card));
    });
    locGrid.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') activateCard(locCards[0]); });
    locGrid.addEventListener('focusout', (e) => { if (!locGrid.contains(e.relatedTarget)) activateCard(locCards[0]); });
  });

  /* Pre-footer reveal window: follows the pointer across the aircraft ------- */
  const visual = document.querySelector('.cta-visual');
  if (visual) {
    const WINDOW_W = 15.68; // window width, % of visual
    const HOME_X = 46.2;    // Figma position
    let targetX = HOME_X, currentX = HOME_X, rafId = 0;
    const animateWindow = () => {
      currentX += (targetX - currentX) * 0.12;
      visual.style.setProperty('--wx', currentX.toFixed(3));
      rafId = Math.abs(targetX - currentX) > 0.02 ? requestAnimationFrame(animateWindow) : 0;
    };
    const moveTo = (x) => { targetX = clamp(x, 0, 100 - WINDOW_W); if (!rafId) rafId = requestAnimationFrame(animateWindow); };
    const pointerX = (e) => {
      const r = visual.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100 - WINDOW_W / 2;
    };
    visual.addEventListener('pointermove', (e) => moveTo(pointerX(e)));
    visual.addEventListener('pointerleave', () => moveTo(HOME_X));
    visual.addEventListener('pointerdown', (e) => moveTo(pointerX(e)));
    if (!reduceMotion) {
      const sweep = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        sweep.disconnect();
        currentX = 8; visual.style.setProperty('--wx', currentX);
        moveTo(HOME_X);
      }, { threshold: 0.6 });
      sweep.observe(visual);
    }
  }

  onScroll();
})();
