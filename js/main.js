/* theezraanya.com · shared script */
(() => {
  'use strict';
  const doc = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const EMAIL = 'message.theezraanya@gmail.com';
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/' + EMAIL;
  const SUBSTACK = 'https://theezraanya.substack.com';

  /* ---------- Preloader (first visit per session) + curtain ---------- */
  const ready = () => doc.classList.add('is-ready');
  const loader = $('.loader');
  if (doc.classList.contains('first-visit') && loader && !reduce) {
    const out = $('.loader__count span', loader);
    const seq = ['03', '02', '01', '00'];
    let i = 0;
    const t = setInterval(() => {
      i++;
      if (i < seq.length) out.textContent = seq[i];
      else {
        clearInterval(t);
        loader.classList.add('done');
        ready();
        setTimeout(() => { loader.remove(); doc.classList.remove('first-visit'); }, 1100);
      }
    }, 380);
  } else {
    requestAnimationFrame(() => requestAnimationFrame(ready));
  }
  try { sessionStorage.setItem('ea-visited', '1'); } catch (e) {}
  setTimeout(ready, 3500); // safety net

  // page transition on internal links
  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute('href');
    if (!href || a.target === '_blank' || a.hasAttribute('download') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;
    if (reduce) return;
    e.preventDefault();
    doc.classList.add('is-leaving');
    setTimeout(() => { location.href = a.href; }, 560);
  });
  window.addEventListener('pageshow', e => { if (e.persisted) { doc.classList.remove('is-leaving'); ready(); } });

  /* ---------- Nav: solid on scroll, hide on scroll down, progress ---------- */
  const nav = $('.nav');
  const prog = $('.progress');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    if (nav) {
      nav.classList.toggle('is-solid', y > 40);
      nav.classList.toggle('is-hidden', y > lastY && y > 400 && !doc.classList.contains('menu-open'));
    }
    if (prog) {
      const h = document.body.scrollHeight - innerHeight;
      prog.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    }
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // mobile menu
  const burger = $('.burger');
  if (burger) {
    const toggle = force => {
      const open = typeof force === 'boolean' ? force : !doc.classList.contains('menu-open');
      doc.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => toggle());
    $$('.menu a').forEach((a, i) => { a.style.transitionDelay = (0.08 + i * 0.05) + 's'; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') toggle(false); });
  }

  // live clock (West Africa Time)
  const clocks = $$('[data-time]');
  if (clocks.length) {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const tick = () => { const t = fmt.format(new Date()); clocks.forEach(c => (c.textContent = t)); };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], .split:not(.split--load)').forEach(el => io.observe(el));

  /* ---------- Counters ---------- */
  const cio = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target; cio.unobserve(el);
      const end = parseFloat(el.dataset.count); const pad = el.dataset.pad ? +el.dataset.pad : 0;
      if (reduce) { el.textContent = String(end).padStart(pad, '0'); return; }
      const dur = 1600; const t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / dur); const v = Math.round(end * (1 - Math.pow(1 - p, 4)));
        el.textContent = String(v).padStart(pad, '0');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- Marquees: clone track for a seamless loop ---------- */
  $$('.marquee').forEach(m => {
    const track = $('.marquee__track', m);
    if (!track) return;
    const clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    m.appendChild(clone);
  });

  /* ---------- Quote: light words as they scroll into view ---------- */
  $$('.quote[data-words]').forEach(q => {
    const words = q.textContent.trim().split(/\s+/);
    q.innerHTML = words.map(w => `<span class="w">${w}</span> `).join('');
    const ws = $$('.w', q);
    const update = () => {
      const r = q.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
      const n = Math.round(p * ws.length);
      ws.forEach((w, i) => w.classList.toggle('lit', i < n));
    };
    if (reduce) ws.forEach(w => w.classList.add('lit'));
    else { window.addEventListener('scroll', update, { passive: true }); update(); }
  });

  /* ---------- Topic rows: floating image follows the cursor ---------- */
  const hov = $('.hover-img');
  if (hov && matchMedia('(pointer:fine)').matches) {
    const img = $('img', hov);
    $$('[data-img]').forEach(row => {
      row.addEventListener('mouseenter', () => { img.src = row.dataset.img; hov.classList.add('on'); });
      row.addEventListener('mouseleave', () => hov.classList.remove('on'));
    });
    window.addEventListener('mousemove', e => { hov.style.left = e.clientX + 'px'; hov.style.top = e.clientY + 'px'; }, { passive: true });
  }

  /* ---------- Custom cursor + magnetic buttons ---------- */
  if (matchMedia('(pointer:fine)').matches && !reduce) {
    doc.classList.add('has-cursor');
    const dot = $('.cursor'), ring = $('.cursor-ring');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px,${my}px)`; }, { passive: true });
    const loop = () => { rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18; ring.style.transform = `translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener('mouseover', e => { ring.classList.toggle('hover', !!e.target.closest('a,button,label,[data-img],.gallery')); });
    document.addEventListener('mousedown', () => ring.classList.add('down'));
    document.addEventListener('mouseup', () => ring.classList.remove('down'));
    $$('.btn, .offer__go, .socials a').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px,${(e.clientY - r.top - r.height / 2) * 0.28}px)`;
      });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- Draggable gallery ---------- */
  $$('.gallery').forEach(g => {
    let down = false, sx = 0, sl = 0, moved = false;
    g.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = g.scrollLeft; g.classList.add('drag'); });
    window.addEventListener('pointerup', () => { down = false; g.classList.remove('drag'); });
    g.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; g.scrollLeft = sl - dx; });
    g.addEventListener('click', e => { if (moved) e.preventDefault(); }, true);
  });

  /* ---------- Parallax (light) ---------- */
  const px = $$('[data-parallax]');
  if (px.length && !reduce) {
    const run = () => {
      px.forEach(el => {
        const r = el.getBoundingClientRect();
        const s = parseFloat(el.dataset.parallax) || 0.1;
        el.style.transform = `translate3d(0,${(r.top + r.height / 2 - innerHeight / 2) * -s}px,0)`;
      });
    };
    window.addEventListener('scroll', run, { passive: true }); run();
  }

  /* ---------- Accordions ---------- */
  $$('.acc').forEach(acc => {
    acc.addEventListener('click', e => {
      const q = e.target.closest('.acc-q'); if (!q) return;
      const item = q.closest('.acc-item'); const open = item.classList.contains('open');
      if (acc.dataset.single !== undefined) $$('.acc-item.open', acc).forEach(i => { i.classList.remove('open'); $('.acc-q', i).setAttribute('aria-expanded', 'false'); });
      item.classList.toggle('open', !open); q.setAttribute('aria-expanded', String(!open));
    });
  });

  /* ---------- Countdown ---------- */
  $$('[data-countdown]').forEach(el => {
    const target = new Date(el.dataset.countdown).getTime();
    const parts = { d: $('[data-d]', el), h: $('[data-h]', el), m: $('[data-m]', el), s: $('[data-s]', el) };
    const live = el.dataset.live ? $(el.dataset.live) : null;
    const tick = () => {
      let diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      if (parts.d) parts.d.textContent = String(d).padStart(2, '0');
      if (parts.h) parts.h.textContent = String(h).padStart(2, '0');
      if (parts.m) parts.m.textContent = String(m).padStart(2, '0');
      if (parts.s) parts.s.textContent = String(s).padStart(2, '0');
      if (live && target - Date.now() <= 0 && target - Date.now() > -36e5 * 2) live.hidden = false;
    };
    tick(); setInterval(tick, 1000);
  });

  /* ---------- Forms (FormSubmit AJAX, works on GitHub Pages) ---------- */
  const params = new URLSearchParams(location.search);
  $$('form[data-form]').forEach(form => {
    // preselect from ?type=
    const type = params.get('type');
    if (type) {
      const sel = form.querySelector(`[name="enquiry"] option[value="${type}"], input[name="enquiry"][value="${type}"], input[name="session_type"][value="${type}"]`);
      if (sel) { if (sel.tagName === 'OPTION') sel.selected = true; else sel.checked = true; }
    }
    const err = $('.form-err', form);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const btn = $('button[type="submit"]', form);
      const label = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = 'Sending…';
      if (err) err.classList.remove('on');
      const data = Object.fromEntries(new FormData(form).entries());
      data._subject = form.dataset.subject || 'New message from theezraanya.com';
      data._template = 'table';
      data._captcha = 'false';
      data.page = location.pathname;
      try {
        const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === 'false' || json.success === false) throw new Error(json.message || 'Send failed');
        form.classList.add('sent');
        const done = form.nextElementSibling;
        if (done) { done.setAttribute('tabindex', '-1'); done.focus({ preventScroll: true }); done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }
      } catch (ex) {
        btn.disabled = false; btn.innerHTML = label;
        if (err) {
          const body = Object.entries(data).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${v}`).join('\n');
          const mail = `mailto:${EMAIL}?subject=${encodeURIComponent(data._subject)}&body=${encodeURIComponent(body)}`;
          err.innerHTML = `The form could not send just now. <a href="${mail}">Email your message instead</a> and it opens ready to send.`;
          err.classList.add('on');
        }
      }
    });
  });

  // Substack subscribe forms: open Substack with the email filled in
  $$('form[data-substack]').forEach(f => {
    f.addEventListener('submit', e => {
      e.preventDefault();
      const email = f.querySelector('input[type="email"]').value.trim();
      if (!email) return;
      window.open(`${SUBSTACK}/subscribe?email=${encodeURIComponent(email)}`, '_blank', 'noopener');
      f.reset();
    });
  });

  // copy buttons
  $$('[data-copy]').forEach(b => {
    b.addEventListener('click', async () => {
      const src = $(b.dataset.copy);
      try { await navigator.clipboard.writeText(src.innerText.trim()); const t = b.textContent; b.textContent = 'Copied'; setTimeout(() => (b.textContent = t), 1600); } catch (e) {}
    });
  });

  /* ---------- Substack posts ---------- */
  const postsEl = $('[data-posts]');
  if (postsEl) loadPosts(postsEl);

  async function loadPosts(el) {
    const limit = +el.dataset.posts || 3;
    const fallback = [
      { title: 'Lessons of a Recovering Perfectionist', excerpt: 'The standard we hold ourselves to is rarely our own. This is the story of embracing uncertainty and learning to begin again.', link: SUBSTACK, tag: 'Faith & Formation' },
      { title: 'Everything Is Learnable', excerpt: 'Most people assume some things sit beyond them. The limit is almost always a belief, and beliefs can be unlearned.', link: SUBSTACK, tag: 'Faith & Formation' },
      { title: 'Consider Jesus', excerpt: 'Who is Jesus? Are we still in touch with the Jesus of the Bible, or have we built one from our biases, prejudices and assumptions?', link: SUBSTACK, tag: 'Theology' }
    ];
    let posts = [];
    try {
      const r = await fetch('data/posts.json', { cache: 'no-cache' });
      if (r.ok) { const j = await r.json(); posts = (j.posts || []).filter(p => p.title && p.link); }
    } catch (e) {}
    if (!posts.length) {
      try {
        const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(SUBSTACK + '/feed'));
        const j = await r.json();
        if (j.status === 'ok') posts = j.items.map(it => ({
          title: it.title, link: it.link, date: it.pubDate,
          image: it.enclosure && it.enclosure.link || it.thumbnail || '',
          excerpt: strip(it.description || it.content || '').slice(0, 240)
        }));
      } catch (e) {}
    }
    const live = posts.length > 0;
    if (!live) posts = fallback;
    el.innerHTML = posts.slice(0, limit).map(card).join('');
    el.classList.toggle('few', Math.min(limit, posts.length) <= 3);
    const note = $('[data-posts-note]');
    if (note) note.hidden = live;
    $$('.post', el).forEach((p, i) => { p.setAttribute('data-reveal', ''); p.dataset.delay = String(i % 3 + 1); io.observe(p); });
  }
  function strip(html) { const d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function card(p) {
    const date = p.date ? new Date(p.date.replace(' ', 'T')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const img = p.image
      ? `<div class="post__img"><img src="${esc(p.image)}" alt="" loading="lazy"></div>`
      : `<div class="post__img post__img--type"><span>${esc(p.title)}</span></div>`;
    return `<a class="post" href="${esc(p.link)}" target="_blank" rel="noopener">${img}<div><div class="post__meta"><b>${esc(p.tag || 'Essay')}</b>${date ? `<span>${date}</span>` : ''}</div><h3 class="post__t" style="margin:12px 0 10px">${esc(p.title)}</h3><p class="post__x">${esc(p.excerpt)}</p></div></a>`;
  }

  // year
  $$('[data-year]').forEach(el => (el.textContent = new Date().getFullYear()));
})();

/* preselect a radio from buttons like <a data-pick="group"> */
document.querySelectorAll('[data-pick]').forEach(a => a.addEventListener('click', () => {
  const r = document.querySelector(`input[name="session_type"][value="${a.dataset.pick}"]`);
  if (r) r.checked = true;
}));

/* hero word flip: BELIEVE → BUILD → BECOME */
(() => {
  const f = document.querySelector('.flip');
  if (!f) return;
  const words = [...f.children];
  let i = 0;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  setInterval(() => {
    const cur = words[i]; i = (i + 1) % words.length; const nxt = words[i];
    cur.classList.remove('on'); cur.classList.add('out');
    nxt.classList.remove('out'); nxt.classList.add('on');
    setTimeout(() => cur.classList.remove('out'), 900);
  }, 2600);
})();
