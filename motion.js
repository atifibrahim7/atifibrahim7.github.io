/* Motion layer — GSAP + ScrollTrigger + SplitText, driven by one ticker shared with Lenis.
   Everything here is additive: the page is complete and readable before a single tween runs,
   and the whole layer tears itself down when motion is paused. */
(() => {
  'use strict';

  const root = document.documentElement;
  if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('is-loading'); return; }

  gsap.registerPlugin(ScrollTrigger);
  const hasSplit = !!window.SplitText;
  if (hasSplit) gsap.registerPlugin(SplitText);

  gsap.defaults({ ease: 'power3.out', duration: 1 });
  const fine = matchMedia('(pointer:fine)');
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));

  /* ------------------------------------------------------------------ *
   * Lenis <-> GSAP: one clock, so scrub and scroll never disagree.
   * ------------------------------------------------------------------ */

  let lenis = null;
  const raf = time => lenis && lenis.raf(time * 1000);

  function bindLenis(instance) {
    if (lenis) { lenis.off('scroll', ScrollTrigger.update); gsap.ticker.remove(raf); }
    lenis = instance;
    if (!lenis) return;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
  }
  document.addEventListener('portfolio:lenis', e => bindLenis(e.detail.lenis));
  // script.js runs first, so its initial instance predates the listener above.
  if (window.__lenis) bindLenis(window.__lenis);

  /* ------------------------------------------------------------------ *
   * Text splitting — reverted on teardown so screen readers keep clean text.
   * ------------------------------------------------------------------ */

  const splits = [];

  function splitLines(el) {
    if (!hasSplit) return null;
    const s = new SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    splits.push(s);
    return s;
  }

  function splitChars(el) {
    if (!hasSplit) return null;
    const s = new SplitText(el, { type: 'chars,words', charsClass: 'split-char' });
    splits.push(s);
    return s;
  }

  /* ------------------------------------------------------------------ *
   * The animation graph. Rebuilt from scratch whenever motion resumes.
   * ------------------------------------------------------------------ */

  let ctx = null;

  function build() {
    if (ctx) return;

    ctx = gsap.context(() => {

      const cleanups = [];

      /* --- intro curtain -> hero, as one continuous movement --- */

      const loader = $('#loader');
      const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });

      if (root.classList.contains('is-loading') && loader) {
        const counter = { v: 0 };
        intro
          .to(loader.querySelector('.loader-bar i'), { scaleX: 1, duration: 1.15, ease: 'power2.inOut' }, 0)
          .to(counter, {
            v: 100, duration: 1.15, ease: 'power2.inOut',
            onUpdate: () => { loader.querySelector('.loader-count').textContent = String(Math.round(counter.v)).padStart(2, '0'); }
          }, 0)
          .to(loader.querySelector('.loader-inner'), { yPercent: -18, opacity: 0, duration: .7 }, 1.1)
          .to(loader, {
            clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut',
            onComplete: () => { root.classList.remove('is-loading'); try { sessionStorage.setItem('portfolio-intro', 'seen'); } catch {} }
          }, 1.25);
      } else {
        root.classList.remove('is-loading');
      }

      const heroStart = intro.duration() ? '-=0.55' : 0;

      /* --- hero: characters rise through their line mask --- */

      const heroLines = $$('.hero h1 .hero-line > span');
      heroLines.forEach((line, i) => {
        const chars = splitChars(line);
        intro.from(chars ? chars.chars : line, {
          yPercent: 115,
          opacity: 0,
          duration: 1.3,
          stagger: chars ? 0.016 : 0,
          ease: 'expo.out'
        }, i === 0 ? heroStart : '<0.09');
      });

      intro
        .from('.eyebrow > span', { y: 18, opacity: 0, duration: .9, stagger: .08 }, '<0.1')
        .from('.hero-bottom > *', { y: 26, opacity: 0, duration: 1, stagger: .09 }, '<0.15')
        .from('.hero-foot span', { opacity: 0, duration: .8, stagger: .1 }, '<0.1')
        .from('.hero-sculpture', { opacity: 0, scale: .82, duration: 1.8, ease: 'power2.out' }, 0.2)
        .from('.nav > *', { y: -22, opacity: 0, duration: .9, stagger: .07 }, '<0.2');

      /* --- hero parallax: text drifts up, sculpture lags behind it --- */

      gsap.to('.hero h1, .hero-bottom, .eyebrow', {
        yPercent: -14, opacity: .18, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .6 }
      });
      gsap.to('.hero-sculpture', {
        yPercent: 26, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 }
      });

      /* --- headings: line-by-line mask reveal --- */

      $$('[data-split="lines"]').forEach(el => {
        const s = splitLines(el);
        gsap.from(s ? s.lines : el, {
          yPercent: 108, opacity: 0, duration: 1.15, stagger: .1, ease: 'expo.out', clearProps: 'transform',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true }
        });
      });

      /* --- generic reveals --- */

      $$('.reveal').forEach(el => {
        gsap.from(el, {
          y: 34, opacity: 0, duration: 1.1, clearProps: 'transform',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true }
        });
      });

      /* --- expertise marquee: loops forever, leans into scroll velocity --- */

      const marquee = $('[data-marquee]');
      if (marquee) {
        const track = marquee.querySelector('.marquee-track');
        const clone = track.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        marquee.append(clone);
        const loop = gsap.to(marquee.children, {
          xPercent: -100, ease: 'none', duration: 22, repeat: -1
        });
        ScrollTrigger.create({
          trigger: marquee,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: self => {
            const v = gsap.utils.clamp(-8, 8, self.getVelocity() / 260);
            gsap.to(loop, { timeScale: v || 1, duration: .5, overwrite: true });
          }
        });
      }

      /* --- project carousel: artwork drifts against the drag --- */

      const slideVisuals = $$('.carousel-slide .project-visual');
      const parallax = slideVisuals.map(el => gsap.quickTo(el, 'xPercent', { duration: .5, ease: 'power3' }));
      const onDrag = () => {
        const embla = window.__embla;
        if (!embla) return;
        embla.scrollSnapList().forEach((snap, i) => {
          if (!parallax[i]) return;
          parallax[i](gsap.utils.clamp(-14, 14, (embla.scrollProgress() - snap) * -38));
        });
      };
      document.addEventListener('portfolio:drag', onDrag);
      cleanups.push(() => document.removeEventListener('portfolio:drag', onDrag));

      gsap.from('.project-showcase', {
        y: 60, opacity: 0, duration: 1.2, clearProps: 'transform',
        scrollTrigger: { trigger: '.project-showcase', start: 'top 88%', once: true }
      });

      /* --- the journey: a pinned horizontal timeline on wide screens --- */

      const mm = gsap.matchMedia();
      mm.add('(min-width: 900px)', () => {
        const viewport = $('[data-journey]');
        const track = $('.journey-track');
        const bar = $('.journey-bar i');
        if (!viewport || !track) return;

        viewport.classList.add('is-pinned');
        // Stop the pan once the last card (the "what's next" CTA) reaches 40% from the
        // left, instead of flushing it against the right edge where it reads as cut off.
        // The track often ends right where that card does, so there's no natural room
        // to pan into; a trailing spacer manufactures that room. It's sized exactly once
        // per refresh, inside refreshInit (GSAP's own pre-measurement hook), never from
        // distance() itself — writing it from there fed back into another refresh and
        // another resize forever, which is what was scrolling the page on its own.
        const lastCard = track.lastElementChild;
        let spacer = track.querySelector('.journey-spacer');
        if (lastCard && !spacer) {
          spacer = document.createElement('div');
          spacer.className = 'journey-spacer';
          spacer.setAttribute('aria-hidden', 'true');
          track.appendChild(spacer);
        }
        function sizeSpacer() {
          if (!lastCard || !spacer) return;
          const contentEnd = lastCard.offsetLeft + lastCard.offsetWidth;
          const target = Math.max(0, lastCard.offsetLeft - viewport.clientWidth * .4);
          spacer.style.width = Math.max(0, target + viewport.clientWidth - contentEnd) + 'px';
        }
        sizeSpacer();
        const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

        const tl = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: '.journey',
            start: 'top top',
            end: () => '+=' + (distance() + innerHeight * .4),
            pin: true,
            scrub: .7,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            refreshInit: sizeSpacer,
            onUpdate: self => { if (bar) gsap.set(bar, { scaleX: self.progress }); }
          }
        });

        // Each card gets its own moment: it lifts in, comes into full focus as it
        // nears the centre of the pinned frame, then eases back as the next one
        // arrives. Keyed to the horizontal tween, so it runs both ways with it.
        $$('.milestone').forEach(card => {
          gsap.timeline({
            scrollTrigger: {
              trigger: card,
              containerAnimation: tl,
              start: 'left 92%',
              end: 'left 8%',
              scrub: true
            }
          })
            .fromTo(card,
              { yPercent: 12, opacity: 0, scale: .94, filter: 'saturate(.5)' },
              { yPercent: 0, opacity: 1, scale: 1, filter: 'saturate(1)', ease: 'power2.out', duration: 1 }
            )
            .to(card, { opacity: .45, scale: .94, filter: 'saturate(.5)', ease: 'power2.in', duration: 1 });
        });

        return () => viewport.classList.remove('is-pinned');
      });

      mm.add('(max-width: 899px)', () => {
        $$('.milestone').forEach(card => {
          gsap.from(card, { y: 40, opacity: 0, duration: 1, clearProps: 'transform', scrollTrigger: { trigger: card, start: 'top 90%', once: true } });
        });
      });

      /* --- open source: counters and staggered package rows ---
         clearProps matters here: a percentage offset left behind as an inline
         pixel transform strands the rows over the note that follows them. --- */

      $$('[data-count]').forEach(el => {
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.8, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true },
          onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; },
          onComplete: () => { el.textContent = target + suffix; }
        });
      });

      gsap.from('.package', {
        y: 70, opacity: 0, duration: 1, stagger: .12, clearProps: 'transform',
        scrollTrigger: { trigger: '.package-list', start: 'top 85%', once: true }
      });

      /* --- skills: a quick cascade, no two cards landing together --- */

      gsap.from('.skill-card', {
        y: 40, opacity: 0, scale: .96, duration: .9, stagger: { each: .07, from: 'start' }, clearProps: 'transform',
        scrollTrigger: { trigger: '.skills', start: 'top 85%', once: true }
      });

      gsap.from('.experience > div', {
        x: 30, opacity: 0, duration: .9, stagger: .1, clearProps: 'transform',
        scrollTrigger: { trigger: '.experience', start: 'top 85%', once: true }
      });

      /* --- contact: the closing line arrives last --- */

      gsap.from('.contact-bottom > *', {
        y: 24, opacity: 0, duration: .9, stagger: .1, clearProps: 'transform',
        scrollTrigger: { trigger: '.contact-bottom', start: 'top 92%', once: true }
      });

      /* --- global: the whole page skews very slightly with scroll speed --- */

      const skewTargets = $$('.project-showcase, .package-list, .skills');
      const skewTo = skewTargets.map(el => gsap.quickTo(el, 'skewY', { duration: .55, ease: 'power3' }));
      const clampSkew = gsap.utils.clamp(-2.2, 2.2);
      const rest = () => skewTo.forEach(fn => fn(0));
      ScrollTrigger.create({
        onUpdate: self => {
          const skew = clampSkew(self.getVelocity() / -440);
          skewTo.forEach(fn => fn(skew));
        },
        onRefresh: rest
      });
      // getVelocity() stops reporting once scrolling ends, so settle explicitly.
      ScrollTrigger.addEventListener('scrollEnd', rest);
      cleanups.push(() => ScrollTrigger.removeEventListener('scrollEnd', rest));

      return () => cleanups.forEach(fn => fn());
    });

    ScrollTrigger.refresh();
  }

  function teardown() {
    if (ctx) { ctx.revert(); ctx = null; }
    splits.forEach(s => s.revert());
    splits.length = 0;
    gsap.set('.hero h1, .hero-bottom, .eyebrow, .hero-sculpture', { clearProps: 'all' });
    root.classList.remove('is-loading');
    ScrollTrigger.refresh();
  }

  /* ------------------------------------------------------------------ *
   * Cursor and magnetism — pointer-fine only, purely decorative.
   * ------------------------------------------------------------------ */

  function cursor() {
    const el = $('#cursor');
    if (!el || !fine.matches) return;
    const ring = el.querySelector('.cursor-ring');
    const dot = el.querySelector('.cursor-dot');
    const label = el.querySelector('.cursor-text');

    // GSAP owns the transform, so centring happens here rather than in CSS.
    gsap.set([ring, dot], { xPercent: -50, yPercent: -50 });

    const ringX = gsap.quickTo(ring, 'x', { duration: .55, ease: 'power3' });
    const ringY = gsap.quickTo(ring, 'y', { duration: .55, ease: 'power3' });
    const dotX = gsap.quickTo(dot, 'x', { duration: .12, ease: 'power3' });
    const dotY = gsap.quickTo(dot, 'y', { duration: .12, ease: 'power3' });

    addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      el.classList.add('is-live');
      ringX(e.clientX); ringY(e.clientY);
      dotX(e.clientX); dotY(e.clientY);
    }, { passive: true });

    addEventListener('pointerdown', () => el.classList.add('is-down'));
    addEventListener('pointerup', () => el.classList.remove('is-down'));
    addEventListener('pointerleave', () => el.classList.remove('is-live'));

    document.addEventListener('pointerover', e => {
      // A real target always wins over the drag affordance, so the blob never
      // covers the link the visitor is reaching for.
      const hot = e.target.closest('a,button,summary');
      const drag = !hot && e.target.closest('[data-cursor="drag"]');
      el.classList.toggle('is-hot', !!hot);
      el.classList.toggle('is-drag', !!drag);
      label.textContent = drag ? 'DRAG' : '';
    });
  }

  function magnets() {
    if (!fine.matches) return;
    $$('.magnetic').forEach(el => {
      const x = gsap.quickTo(el, 'x', { duration: .45, ease: 'power3' });
      const y = gsap.quickTo(el, 'y', { duration: .45, ease: 'power3' });
      el.addEventListener('pointermove', e => {
        if (root.classList.contains('motion-off')) return;
        const r = el.getBoundingClientRect();
        x((e.clientX - (r.left + r.width / 2)) * .32);
        y((e.clientY - (r.top + r.height / 2)) * .42);
      });
      el.addEventListener('pointerleave', () => { x(0); y(0); });
    });
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */

  function start() {
    if (!root.classList.contains('motion-off')) build();
    else root.classList.remove('is-loading');
    cursor();
    magnets();
  }

  document.addEventListener('portfolio:motion', e => {
    if (e.detail.paused) teardown();
    else build();
  });

  // Fonts change line boxes, and SplitText measures line boxes. Wait for them.
  if (document.fonts && document.fonts.status !== 'loaded') {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]).then(start);
  } else {
    start();
  }

  addEventListener('load', () => ScrollTrigger.refresh());
})();
