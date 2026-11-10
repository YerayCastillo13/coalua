(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const STONES = window.STONES;
  const byId = Object.fromEntries(STONES.map(s => [s.id, s]));
  const img = (n) => `assets/img/${n}.webp`;
  const eur = (n) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => innerWidth < 860;

  gsap.registerPlugin(ScrollTrigger);
  // en móvil la barra del navegador cambia la altura al hacer scroll: no recalculamos por eso (evita saltos)
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------------- Smooth scroll ---------------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // Desplazamiento "cinematográfico": nunca saltamos de golpe, recorremos el camino
  // para que las animaciones se reproduzcan aunque se use un enlace o botón.
  const easeInOut = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function glide(target, offset = 0, minDur = 1.2) {
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + scrollY + offset;
    const dist = Math.abs(y - scrollY);
    const duration = Math.min(5, Math.max(minDur, dist / 2400));
    if (lenis) lenis.scrollTo(y, { duration, easing: easeInOut, force: true });
    else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = $(id); if (!el) return;
    e.preventDefault();
    glide(el, id === '#top' ? 0 : -52);
  }));

  /* ---------------- Stars ---------------- */
  const cv = $('#stars'), cx = cv.getContext('2d');
  let stars = [];
  function sizeStars() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = cv.offsetWidth * dpr; cv.height = cv.offsetHeight * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round((cv.offsetWidth * cv.offsetHeight) / 5200);
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * cv.offsetWidth, y: Math.random() * cv.offsetHeight,
      r: Math.random() * 1.2 + .2, p: Math.random() * Math.PI * 2, s: Math.random() * .02 + .005
    }));
  }
  let starsVisible = true;
  function drawStars() {
    if (starsVisible) {
      cx.clearRect(0, 0, cv.offsetWidth, cv.offsetHeight);
      for (const s of stars) {
        s.p += s.s;
        cx.globalAlpha = .25 + Math.abs(Math.sin(s.p)) * .75;
        cx.fillStyle = '#F4EDE3';
        cx.beginPath(); cx.arc(s.x, s.y, s.r, 0, 6.283); cx.fill();
      }
    }
    requestAnimationFrame(drawStars);
  }
  sizeStars(); drawStars();
  addEventListener('resize', sizeStars);

  /* ---------------- Sun rays ---------------- */
  const raysG = $('#sunRays');
  const C = { x: 200, y: 168 };
  const N = 15;
  for (let i = 0; i < N; i++) {
    const a = Math.PI + (i / (N - 1)) * Math.PI;      // 180º → 360º (semicírculo superior)
    const long = i % 2 === 0;
    const r1 = long ? 56 : 62, r2 = long ? 170 : 118;
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', C.x + Math.cos(a) * r1); l.setAttribute('y1', C.y + Math.sin(a) * r1);
    l.setAttribute('x2', C.x + Math.cos(a) * r2); l.setAttribute('y2', C.y + Math.sin(a) * r2);
    const len = r2 - r1;
    l.style.strokeDasharray = len; l.style.strokeDashoffset = len;
    raysG.appendChild(l);
  }
  // intro on load
  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro
    .from('.sun__bowl, .sun__arc, .sun__dot', { opacity: 0, scale: .6, transformOrigin: '200px 168px', duration: 1.2, stagger: .1 })
    .to('#sunRays line', { strokeDashoffset: 0, duration: 1.1, stagger: { each: .05, from: 'center' } }, '-=.8')
    .from('.hero__word', { opacity: 0, y: 30, filter: 'invert(1) blur(12px)', duration: 1.2 }, '-=.9')
    .from('.hero__tag', { opacity: 0, y: 20, duration: 1 }, '-=.8')
    .fromTo('#cue', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, clearProps: 'transform' }, '-=.6');

  /* ---------------- Hero scroll ---------------- */
  // La foto nace exactamente del cuenco del sol (se recalcula en cada resize)
  const sunEl = $('#sun'), stage = $('.hero__stage');
  // (los SVG no tienen offsetTop/offsetWidth: medimos con getBoundingClientRect.
  //  El cuenco es el origen del escalado, así que su posición no cambia al crecer el sol)
  const bowl = () => {
    const r = sunEl.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const w = sunEl.clientWidth || r.width;
    return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height * 168 / 260, r: w * 30 / 400 };
  };
  const rMax = () => Math.hypot(stage.offsetWidth, stage.offsetHeight);
  // iris.r: 0 = cerrado, 1 = llena el cuenco del sol, 2 = pantalla completa
  const reveal = $('#heroReveal');
  const iris = { r: 0 };
  function drawIris() {
    const b = bowl();
    const rad = iris.r <= 1 ? b.r * iris.r : b.r + (rMax() - b.r) * (iris.r - 1);
    reveal.style.clipPath = `circle(${rad.toFixed(1)}px at ${b.x}px ${b.y.toFixed(1)}px)`;
  }
  drawIris();
  addEventListener('resize', drawIris);
  const cue = $('#cue'), cueFill = $('#cueFill'), cueText = $('#cueText');
  const heroTl = gsap.timeline({
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true,
      onToggle: (st) => { starsVisible = st.isActive || st.progress < 1; },
      onUpdate: (st) => {
        cueFill.style.strokeDashoffset = 132 * (1 - st.progress);
        cueText.textContent = st.progress > .62 ? 'Sigue bajando' : 'Desliza para descubrir';
        cue.classList.toggle('is-hidden', st.progress > .96);
      } }
  });
  heroTl
    .to('#sunRays', { rotation: 35, svgOrigin: '200 168', duration: 1, ease: 'none' }, 0)
    .to('#sun', { scale: 1.7, transformOrigin: '50% 64.6%', duration: .5, ease: 'power1.in' }, 0)
    .to('.hero__glow', { scale: 1.8, opacity: 1, duration: .5 }, 0)
    .to('#heroCopy', { opacity: 0, y: 60, filter: 'blur(8px)', duration: .22 }, 0.02)
    .fromTo(iris, { r: 0 }, { r: 1, duration: .12, ease: 'power2.out', onUpdate: drawIris }, .1)
    .to(iris, { r: 2, duration: .42, ease: 'power3.in', onUpdate: drawIris }, .26)
    .fromTo('#heroReveal img', { scale: 1.5 }, { scale: 1, duration: .75, ease: 'power1.out' }, .1)
    .fromTo('#heroRevealCopy > *', { opacity: 0, y: 50 }, { opacity: 1, y: 0, stagger: .06, duration: .18 }, .64)
    .to({}, { duration: .2 });

  // El indicador también es un botón: si lo pulsas, la escena se reproduce sola (no se salta)
  cue.addEventListener('click', () => {
    const st = heroTl.scrollTrigger;
    // 1er toque: reproduce el amanecer y se detiene en "Lleva el sol contigo".
    // 2º toque: continúa (pasando por el manifiesto) hasta la colección.
    if (st.progress < .88) glide(st.start + (st.end - st.start) * .93, 0, 3.2);
    else glide($('#piedras'), 0, 2.4);
  });

  // Si a los pocos segundos nadie ha hecho scroll, damos un pequeño empujón visual
  let interacted = false;
  addEventListener('scroll', () => { if (scrollY > 8) interacted = true; }, { passive: true });
  function nudge() {
    if (interacted || scrollY > 8 || document.hidden) return;
    cue.classList.remove('is-nudge'); void cue.offsetWidth; cue.classList.add('is-nudge');
    gsap.timeline()
      .to('.hero__stage', { y: -22, duration: .45, ease: 'power2.out' })
      .to('.hero__stage', { y: 0, duration: .9, ease: 'bounce.out' });
  }
  if (!reduce) setTimeout(() => { nudge(); const iv = setInterval(() => interacted ? clearInterval(iv) : nudge(), 5200); }, 3800);

  /* ---------------- Nav theme ---------------- */
  const nav = $('#nav');
  const darkSections = () => [$('.promo'), $('#hero'), $('#spot'), $('#ritual'), $('.footer'), $('#piedras').dataset.dark === '1' ? $('#piedras') : null].filter(Boolean);
  function navTheme() {
    const y = 60;
    const dark = darkSections().some(el => { const r = el.getBoundingClientRect(); return r.top <= y && r.bottom >= y; });
    nav.classList.toggle('is-light', !dark);
  }
  const progressBar = $('#progress');
  function onScroll() {
    navTheme();
    const max = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  }
  ScrollTrigger.addEventListener('refresh', onScroll);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- Manifesto word reveal ---------------- */
  const man = $('#manifesto');
  man.innerHTML = man.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  gsap.to('#manifesto .w', {
    opacity: 1, stagger: .1, ease: 'none',
    scrollTrigger: { trigger: '.manifesto', start: 'top 75%', end: 'bottom 60%', scrub: true }
  });

  /* ---------------- Stones (horizontal) ---------------- */
  const track = $('#stonesTrack');
  track.innerHTML = STONES.map(s => `
    <button class="stone" data-id="${s.id}" data-bg="${s.bg}" data-ink="${s.ink}" data-dark="${s.dark ? 1 : 0}" aria-label="Ver ${s.name}">
      <div class="stone__img"><img src="${img(s.hand)}" alt="Pulsera de ${s.name}" loading="lazy"></div>
      <span class="stone__swatch">${s.intent}</span>
      <div class="stone__meta">
        <div><span class="stone__name">${s.name}</span><span class="stone__tag">${s.tag}</span></div>
        <span class="stone__price">${eur(s.price)}</span>
      </div>
    </button>`).join('');

  const stonesSec = $('#piedras');
  let stonesST;
  function buildStones() {
    const dist = () => track.scrollWidth - innerWidth + (isMobile() ? 20 : innerWidth * .06);
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: stonesSec, pin: '.stones__pin', start: 'top top', end: () => '+=' + dist() * 1.1,
        scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (st) => {
          gsap.set('#stonesBar', { scaleX: st.progress });
          gsap.set('#stonesHint', { opacity: Math.max(0, .8 - st.progress * 7) });
        }
      }
    });
    stonesST = tween.scrollTrigger;
    gsap.set(stonesSec, { backgroundColor: '#F4EDE3', color: '#24211D' });
    $$('.stone', track).forEach((card) => {
      ScrollTrigger.create({
        trigger: card, containerAnimation: tween, start: 'left 65%', end: 'right 35%',
        onToggle: (st) => {
          if (!st.isActive) return;
          gsap.to(stonesSec, { backgroundColor: card.dataset.bg, color: card.dataset.ink, duration: .7, ease: 'power2.out' });
          stonesSec.dataset.dark = card.dataset.dark;
          navTheme();
        }
      });
      gsap.fromTo($('img', card), { scale: 1.25 }, {
        scale: 1, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'center center', scrub: true }
      });
      gsap.fromTo(card, { y: 60, rotate: 2 }, {
        y: 0, rotate: 0, ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'left 40%', scrub: true }
      });
    });
    // al volver al inicio, restaura crema
    ScrollTrigger.create({ trigger: stonesSec, start: 'top 60%', onLeaveBack: () => { gsap.to(stonesSec, { backgroundColor: '#F4EDE3', color: '#24211D', duration: .5 }); stonesSec.dataset.dark = '0'; } });
  }
  buildStones();
  track.addEventListener('click', (e) => { const b = e.target.closest('.stone'); if (b) openQV(b.dataset.id); });

  /* ---------------- Spotlight Citrino ---------------- */
  const spot = gsap.timeline({ scrollTrigger: { trigger: '#spot', start: 'top top', end: 'bottom bottom', scrub: 1 } });
  const facts = $$('#spotFacts li');
  spot
    .fromTo('#spotMedia', { clipPath: 'inset(18% 22% 18% 22% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1, ease: 'power2.inOut' }, 0)
    .fromTo('.spot__img--a', { scale: 1.3 }, { scale: 1, duration: 1.2, ease: 'power1.out' }, 0)
    .fromTo('#spotIntro', { scale: 1.25, opacity: 0 }, { scale: 1, opacity: 1, duration: .5 }, 0)
    .to('#spotIntro', { opacity: 0, yPercent: -40, filter: 'blur(10px)', duration: .5 }, 1.1)
    .to('.spot__shade', { opacity: 1, duration: .5 }, 1.2);
  facts.forEach((f, i) => {
    const t = 1.5 + i * 1.3;
    spot.fromTo(f, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .5 }, t);
    if (i === 1) spot.to('.spot__img--b', { opacity: 1, duration: .6 }, t - .2).to('.spot__img--b', { scale: 1.08, duration: 2, ease: 'none' }, t - .2);
    if (i === 2) spot.to('.spot__img--b', { opacity: 0, duration: .6 }, t - .2);
    if (i < facts.length - 1) spot.to(f, { opacity: 0, y: -60, duration: .4 }, t + 1);
  });
  gsap.set('#spotBuy', { xPercent: -50, yPercent: 160, opacity: 0 });
  spot.to('#spotBuy', { yPercent: 0, opacity: 1, duration: .5, ease: 'back.out(1.4)' }, 1.5 + facts.length * 1.3 - .6)
      .to({}, { duration: .6 });

  /* ---------------- Card flip ---------------- */
  gsap.timeline({ scrollTrigger: { trigger: '#card3d', start: 'top top', end: 'bottom bottom', scrub: 1 } })
    .fromTo('#card', { rotateY: -25, rotateX: 18, rotateZ: -10, y: 120, scale: .85 },
      { rotateY: 0, rotateX: 6, rotateZ: -4, y: 0, scale: 1, duration: .35, ease: 'power2.out' })
    .to('#card', { rotateY: 180, rotateX: -4, rotateZ: 3, duration: .5, ease: 'power2.inOut' })
    .to('#card', { y: -20, duration: .15 });
  gsap.from('.card3d__copy > *', {
    opacity: 0, y: 40, stagger: .12, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: '#card3d', start: 'top 60%' }
  });

  /* ---------------- Polaroids ---------------- */
  const pols = $$('.polaroid');
  const finals = () => {
    const m = isMobile();
    return m
      ? [[-25, 9, -10], [25, 7, 8], [-23, 31, 6], [24, 31, -7], [0, 19, -3]]
      : [[-34, 14, -12], [-17, 26, 7], [0, 16, -4], [17, 27, 9], [34, 12, -7]];
  };
  const polTl = gsap.timeline({ scrollTrigger: { trigger: '#unboxing', start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true } });
  polTl.fromTo('#unboxBg', { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1, ease: 'none', duration: 1 }, 0)
       .fromTo('.unbox__copy > *', { opacity: 0, y: 50 }, { opacity: 1, y: 0, stagger: .05, duration: .15 }, 0);
  pols.forEach((p, i) => {
    gsap.set(p, { xPercent: -50, yPercent: -50 });
    polTl.fromTo(p,
      { x: () => (i - 2) * innerWidth * .3, y: () => innerHeight * 1.1, rotation: (i % 2 ? 1 : -1) * 40 },
      { x: () => finals()[i][0] / 100 * innerWidth, y: () => finals()[i][1] / 100 * innerHeight, rotation: () => finals()[i][2], ease: 'power3.out', duration: .35 },
      .15 + i * .1);
  });

  /* ---------------- Generic reveals ---------------- */
  ScrollTrigger.batch('.reveal', {
    start: 'top 88%',
    onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 50 }, { opacity: 1, y: 0, stagger: .1, duration: 1, ease: 'power3.out', overwrite: true })
  });
  gsap.set('.reveal', { opacity: 0 });

  /* ---------------- Shop grid ---------------- */
  const grid = $('#grid');
  grid.innerHTML = STONES.map(s => `
    <article class="card" data-intent="${s.intent}" data-id="${s.id}">
      <div class="card__media" data-qv="${s.id}" role="button" tabindex="0" aria-label="Vista rápida de ${s.name}">
        <span class="card__dot" style="background:${s.color}"></span>
        <img src="${img(s.img)}" alt="Pulseras de ${s.name}" loading="lazy">
        <img src="${img(s.hand)}" alt="" loading="lazy">
      </div>
      <div class="card__body">
        <div>
          <span class="card__intent">${s.intent}</span>
          <h3 class="card__name">${s.name}</h3>
          <span class="card__price">${eur(s.price)}</span>
        </div>
        <button class="add" data-add="${s.id}" aria-label="Añadir ${s.name} a la cesta">+</button>
      </div>
    </article>`).join('');
  ScrollTrigger.batch('.card', {
    start: 'top 92%',
    onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 70, scale: .96 }, { opacity: 1, y: 0, scale: 1, stagger: .08, duration: 1, ease: 'power3.out' })
  });
  $('#filters').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('.chip').forEach(c => c.classList.toggle('is-active', c === b));
    const f = b.dataset.filter;
    const cards = $$('.card', grid);
    gsap.to(cards, {
      opacity: 0, y: 20, duration: .25, stagger: .02, onComplete: () => {
        cards.forEach(c => c.classList.toggle('is-hidden', f !== 'all' && c.dataset.intent !== f));
        const vis = cards.filter(c => !c.classList.contains('is-hidden'));
        gsap.fromTo(vis, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .6, stagger: .06, ease: 'power3.out' });
        ScrollTrigger.refresh();
      }
    });
  });
  grid.addEventListener('click', (e) => {
    const m = e.target.closest('[data-qv]'); if (m) openQV(m.dataset.qv);
  });
  grid.addEventListener('keydown', (e) => {
    const m = e.target.closest('[data-qv]'); if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openQV(m.dataset.qv); }
  });

  /* ---------------- Ritual / moon ---------------- */
  const steps = $$('.rstep');
  const rit = gsap.timeline({ scrollTrigger: { trigger: '#ritual', start: 'top top', end: 'bottom bottom', scrub: 1 } });
  rit.fromTo('#moonShadow', { xPercent: 0 }, { xPercent: 112, ease: 'none', duration: 3 }, 0)
     .fromTo('#moon', { rotation: -20, scale: .85 }, { rotation: 10, scale: 1, ease: 'none', duration: 3 }, 0)
     .fromTo('.ritual__head', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .3 }, 0);
  steps.forEach((s, i) => {
    rit.fromTo(s, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: .35 }, i * 1 + .1);
    if (i < steps.length - 1) rit.to(s, { opacity: 0, y: -50, duration: .3 }, i * 1 + .8);
  });

  /* ---------------- Quick view ---------------- */
  const modal = $('#modal');
  let qvId = null, qvSize = 'M';
  function openQV(id) {
    const s = byId[id]; qvId = id;
    $('#qvImg').src = img(s.img); $('#qvImg').alt = `Pulseras de ${s.name}`;
    $('#qvImg2').src = img(s.hand); $('#qvImg2').alt = `Pulsera de ${s.name} en la mano`;
    $('#qvIntent').textContent = s.intent;
    $('#qvName').textContent = s.name;
    $('#qvTag').textContent = s.tag;
    $('#qvDesc').textContent = s.desc;
    $('#qvPrice').textContent = eur(s.price);
    modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false');
    lenis && lenis.stop();
    setTimeout(() => $('.modal__close', modal).focus(), 50);
  }
  function closeQV() { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); }
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeQV(); });
  $$('.size').forEach(b => b.addEventListener('click', () => { qvSize = b.dataset.size; $$('.size').forEach(x => x.classList.toggle('is-active', x === b)); }));
  $('#qvAdd').addEventListener('click', () => { addToBag(qvId, qvSize); closeQV(); });

  /* ---------------- Bag ---------------- */
  let bag = [];
  try { bag = JSON.parse(localStorage.getItem('coalua-bag') || '[]'); } catch (_) {}
  const save = () => { try { localStorage.setItem('coalua-bag', JSON.stringify(bag)); } catch (_) {} };
  const drawer = $('#drawer');
  const FREE = 35;
  function renderBag() {
    const count = bag.reduce((a, b) => a + b.qty, 0);
    const total = bag.reduce((a, b) => a + b.qty * byId[b.id].price, 0);
    const bc = $('#bagCount'); bc.textContent = count; bc.classList.toggle('has', count > 0);
    $('#drawerTotal').textContent = eur(total);
    const left = FREE - total;
    $('#drawerShip').innerHTML = (left > 0 ? `Te faltan <strong>${eur(left)}</strong> para el envío gratis` : '¡Tienes envío gratis! ✨') +
      `<div class="bar"><i style="width:${Math.min(100, total / FREE * 100)}%"></i></div>`;
    $('#drawerList').innerHTML = bag.length ? bag.map((b, i) => {
      const s = byId[b.id];
      return `<li><img src="${img(s.img)}" alt=""><div><div class="n">${s.name}</div><div class="s">Talla ${b.size} · ${eur(s.price)}</div>
        <div class="qty"><button data-q="${i}" data-d="-1" aria-label="Quitar uno">−</button><span>${b.qty}</span><button data-q="${i}" data-d="1" aria-label="Añadir uno">+</button></div></div>
        <strong>${eur(s.price * b.qty)}</strong></li>`;
    }).join('') : '<li class="drawer__empty">Tu cesta está vacía.<br>Elige tu piedra ✨</li>';
  }
  function addToBag(id, size = 'M') {
    const ex = bag.find(b => b.id === id && b.size === size);
    ex ? ex.qty++ : bag.push({ id, size, qty: 1 });
    save(); renderBag();
    const bc = $('#bagCount'); bc.classList.remove('bump'); void bc.offsetWidth; bc.classList.add('bump');
    toast(`${byId[id].name} añadida a tu cesta`);
  }
  $('#drawerList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]'); if (!b) return;
    const it = bag[+b.dataset.q]; it.qty += +b.dataset.d;
    if (it.qty <= 0) bag.splice(+b.dataset.q, 1);
    save(); renderBag();
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-add]');
    if (a) { e.stopPropagation(); addToBag(a.dataset.add); flyToBag(a); }
  });
  const openDrawer = () => { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); lenis && lenis.stop(); };
  const closeDrawer = () => { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); };
  $('#bagBtn').addEventListener('click', openDrawer);
  drawer.addEventListener('click', (e) => { if (e.target.closest('[data-close-drawer]')) closeDrawer(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeQV(); closeDrawer(); } });

  function flyToBag(from) {
    const a = from.getBoundingClientRect(), b = $('#bagBtn').getBoundingClientRect();
    const dot = document.createElement('div');
    Object.assign(dot.style, { position: 'fixed', zIndex: 200, width: '14px', height: '14px', borderRadius: '50%', background: '#E4B36A', left: a.left + a.width / 2 - 7 + 'px', top: a.top + a.height / 2 - 7 + 'px', pointerEvents: 'none' });
    document.body.appendChild(dot);
    gsap.timeline({ onComplete: () => dot.remove() })
      .to(dot, { x: b.left + b.width / 2 - (a.left + a.width / 2), duration: .8, ease: 'power1.inOut' }, 0)
      .to(dot, { y: b.top + b.height / 2 - (a.top + a.height / 2), duration: .8, ease: 'back.in(1.6)' }, 0)
      .to(dot, { scale: .4, opacity: .6, duration: .2 }, .6);
  }

  let tt;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('is-on');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('is-on'), 2200);
  }
  renderBag();

  /* ---------------- Refresh after assets ---------------- */
  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
