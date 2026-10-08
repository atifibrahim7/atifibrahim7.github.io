/* Core behaviour: motion preference, smooth scroll, carousel, utilities.
   Libraries are self-hosted. Every enhancement has a native fallback. */
(() => {
  'use strict';

  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('.motion-toggle');
  let manualPaused = false;
  try { manualPaused = localStorage.getItem('portfolio-motion') === 'off'; } catch {}
  let paused = manualPaused || media.matches;
  let lenis = null;
  let embla = null;

  /* ---------- motion preference ---------- */

  function applyPreference() {
    paused = manualPaused || media.matches;
    document.documentElement.classList.toggle('motion-off', paused);
    document.documentElement.dataset.motion = paused ? 'off' : 'on';
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Enable animations' : 'Pause animations');
    toggle.innerHTML = paused
      ? '<span aria-hidden="true">▷</span><span class="motion-label">Motion off</span>'
      : '<span aria-hidden="true">Ⅱ</span><span class="motion-label">Pause motion</span>';

    if (lenis) { lenis.destroy(); lenis = null; }
    if (!paused && window.Lenis && matchMedia('(pointer:fine)').matches) {
      // autoRaf stays off: GSAP's ticker drives Lenis so scroll and tweens share one clock.
      lenis = new Lenis({ lerp: .085, smoothWheel: true, syncTouch: false, anchors: true, autoRaf: false });
    }
    window.__lenis = lenis;
    document.dispatchEvent(new CustomEvent('portfolio:lenis', { detail: { lenis } }));
    document.dispatchEvent(new CustomEvent('portfolio:motion', { detail: { paused } }));
    if (embla) embla.reInit({ duration: paused ? 0 : 32 });
  }

  toggle.addEventListener('click', () => {
    manualPaused = !paused;
    if (media.matches && !manualPaused) {
      toggle.setAttribute('aria-label', 'Reduced motion is enabled in your device settings');
      return;
    }
    try { localStorage.setItem('portfolio-motion', manualPaused ? 'off' : 'on'); } catch {}
    applyPreference();
  });
  media.addEventListener('change', applyPreference);
  applyPreference();

  /* ---------- project carousel ---------- */

  const viewport = document.querySelector('.embla');
  // Pages without a carousel (project case studies) skip this whole block.
  if (viewport) {
  const slides = Array.from(viewport.querySelectorAll('.carousel-slide'));
  const prev = document.querySelector('.carousel-prev');
  const next = document.querySelector('.carousel-next');
  const count = document.querySelector('.carousel-count');
  const dotsRoot = document.querySelector('.carousel-dots');

  const dots = slides.map((slide, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'carousel-dot';
    b.setAttribute('aria-label', 'Go to project ' + (i + 1) + ': ' + slide.querySelector('h3').textContent);
    b.addEventListener('click', () => go(i));
    dotsRoot.append(b);
    return b;
  });

  let selected = 0;

  function update() {
    selected = embla ? embla.selectedScrollSnap() : Math.round(viewport.scrollLeft / (viewport.clientWidth + 24));
    selected = Math.max(0, Math.min(selected, slides.length - 1));
    prev.disabled = selected === 0;
    next.disabled = selected === slides.length - 1;
    count.textContent = String(selected + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    dots.forEach((b, i) => b.setAttribute('aria-current', String(i === selected)));
    // Hidden slides cannot trap keyboard focus. Native fallback remains scrollable.
    slides.forEach((slide, i) => {
      if (embla) { slide.inert = i !== selected; slide.setAttribute('aria-hidden', String(i !== selected)); }
    });
    document.dispatchEvent(new CustomEvent('portfolio:slide', { detail: { index: selected, slide: slides[selected] } }));
  }

  function go(index) {
    if (embla) embla.scrollTo(index, paused);
    else viewport.scrollTo({ left: index * (viewport.clientWidth + 24), behavior: paused ? 'instant' : 'smooth' });
  }

  if (window.EmblaCarousel) {
    viewport.classList.add('is-ready');
    embla = EmblaCarousel(viewport, {
      loop: false,
      align: 'start',
      duration: paused ? 0 : 32,
      watchDrag: (_, event) => !event.target.closest('a,button,summary,details'),
      watchFocus: true
    });
    embla.on('select', update);
    embla.on('reInit', update);
    // Expose scroll progress so the motion layer can parallax slide artwork while dragging.
    embla.on('scroll', () => document.dispatchEvent(new CustomEvent('portfolio:drag', { detail: { embla } })));
    window.__embla = embla;
  } else {
    viewport.addEventListener('scroll', update, { passive: true });
  }

  prev.addEventListener('click', () => go(selected - 1));
  next.addEventListener('click', () => go(selected + 1));
  viewport.addEventListener('keydown', e => {
    if (e.target !== viewport) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(Math.min(selected + 1, slides.length - 1)); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(Math.max(selected - 1, 0)); }
  });
  update();
  }

  /* ---------- reading progress ---------- */

  const progress = document.querySelector('.reading-progress');
  let ticking = false;
  function progressUpdate() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
    ticking = false;
  }
  addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(progressUpdate); ticking = true; }
  }, { passive: true });
  progressUpdate();

  /* ---------- social rail contrast ---------- */

  // The rail is fixed, so it passes over the light open-source band. Flip its
  // colours when that band crosses the rail's own line, independent of GSAP.
  const rail = document.querySelector('.social-rail');
  const lightBand = document.querySelector('.open-section');
  if (rail && lightBand && 'IntersectionObserver' in window) {
    new IntersectionObserver(
      ([entry]) => rail.classList.toggle('on-light', entry.isIntersecting),
      { rootMargin: '-50% 0px -50% 0px' }
    ).observe(lightBand);
  }

  /* ---------- copy email ---------- */

  const button = document.getElementById('copy-email');
  button.addEventListener('click', async () => {
    const status = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText('asajjad308@gmail.com');
      status.textContent = 'Email copied.';
      button.textContent = 'Copied ✓';
      setTimeout(() => { button.textContent = 'Copy email ⧉'; status.textContent = ''; }, 3000);
    } catch {
      status.textContent = 'Please select and copy the email address above.';
    }
  });
})();
