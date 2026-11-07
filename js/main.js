/* theezraanya.com · shared script */
(() => {
  'use strict';
  const doc = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const EMAIL = 'message.theezraanya@gmail.com';
  const FORM_ENDPOINT = 'https://formsubmit.co/ajax/' + EMAIL;
  // Google Sheet receiver (see google-apps-script/Code.gs). Paste the Web app URL between the quotes.
  // While it is empty, forms fall back to FormSubmit.
  const SHEET_ENDPOINT = window.EA_SHEET_ENDPOINT || '';
  const formName = () => (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  async function sendForm(data) {
    data._form = data._form || formName();
    data.page = data.page || location.pathname;
    if (SHEET_ENDPOINT) {
      const res = await fetch(SHEET_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data), redirect: 'follow' });
      const json = await res.json().catch(() => ({ ok: res.ok }));
      if (!json.ok) throw new Error(json.error || 'Sheet send failed');
      return;
    }
    const res = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || String(json.success) === 'false') {
      const er = new Error(String(json.message || 'Send failed'));
      if (/activat/i.test(er.message)) er.activation = true;
      throw er;
    }
  }
  window.EA_sendForm = sendForm;
  // Umami: count successful form sends (no personal details are sent)
  const tracked = sendForm;
  window.EA_sendForm = async d => { await tracked(d); try { window.umami && window.umami.track('Form sent', { form: d._form || formName() }); } catch (e) {} };
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

  // photos inside reveal frames must load up front: a clipped image never triggers lazy loading
  $$('[data-reveal="clip"] img, .hero-photo img').forEach(i => { i.loading = 'eager'; });

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], .split:not(.split--load)').forEach(el => io.observe(el));
  // backup: reveal anything that has entered the viewport, in case an observer callback is missed
  const sweep = () => {
    const h = innerHeight;
    $$('[data-reveal]:not(.in), .split:not(.split--load):not(.in)').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < h * 0.95 && r.bottom > 0) el.classList.add('in');
    });
  };
  let sweepQueued = false;
  window.addEventListener('scroll', () => { if (!sweepQueued) { sweepQueued = true; requestAnimationFrame(() => { sweep(); sweepQueued = false; }); } }, { passive: true });
  window.addEventListener('load', sweep);
  setTimeout(sweep, 900); setTimeout(sweep, 2500);

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
      const data = {};
      for (const [k, v] of new FormData(form).entries()) data[k] = data[k] ? data[k] + ', ' + v : v;
      data._subject = form.dataset.subject || 'New message from theezraanya.com';
      data._template = 'table';
      data._captcha = 'false';
      data.page = location.pathname;
      try {
        await window.EA_sendForm(data);
        form.classList.add('sent');
        const done = form.nextElementSibling;
        if (done) { done.setAttribute('tabindex', '-1'); done.focus({ preventScroll: true }); done.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); }
      } catch (ex) {
        btn.disabled = false; btn.innerHTML = label;
        if (err) {
          const body = Object.entries(data).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}: ${v}`).join('\n');
          const mail = `mailto:${EMAIL}?subject=${encodeURIComponent(data._subject)}&body=${encodeURIComponent(body)}`;
          err.innerHTML = ex.activation
            ? `This form is waiting for its one-time activation. Ezra's team will switch it on shortly. In the meantime, <a href="${mail}">send your message by email</a> and it opens ready to go.`
            : `The form could not send just now. <a href="${mail}">Email your message instead</a> and it opens ready to send.`;
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

  /* ---------- Substack posts: shared loader ---------- */
  const FALLBACK_POSTS = [
    { title: 'Lessons of a Recovering Perfectionist', slug: '', excerpt: 'The standard we hold ourselves to is rarely our own. This is the story of embracing uncertainty and learning to begin again.', link: SUBSTACK, tag: 'Faith & Formation' },
    { title: 'Everything Is Learnable', slug: '', excerpt: 'Most people assume some things sit beyond them. The limit is almost always a belief, and beliefs can be unlearned.', link: SUBSTACK, tag: 'Faith & Formation' },
    { title: 'Consider Jesus', slug: '', excerpt: 'Who is Jesus? Are we still in touch with the Jesus of the Bible, or have we built one from our biases, prejudices and assumptions?', link: SUBSTACK, tag: 'Theology' }
  ];
  const slugOf = link => { const m = String(link || '').match(/\/p\/([^/?#]+)/); return m ? m[1] : ''; };
  let postsPromise = null;
  function getPosts() {
    if (postsPromise) return postsPromise;
    postsPromise = (async () => {
      let posts = [];
      try {
        const r = await fetch('data/posts.json', { cache: 'no-cache' });
        if (r.ok) { const j = await r.json(); posts = (j.posts || []).filter(p => p.title && p.link); }
      } catch (e) {}
      const pubs = (window.EA_SUBSTACKS && window.EA_SUBSTACKS.length) ? window.EA_SUBSTACKS : [{ site: SUBSTACK, label: 'Letters' }];
      if (!posts.length) {
        for (const { site, label } of pubs) {
          let got = await (async () => {
            let posts = [];
      if (!posts.length) {
              try {
                const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(site + '/feed'));
                const j = await r.json();
                if (j.status === 'ok') posts = j.items.map(it => ({
                  title: it.title, link: it.link, date: it.pubDate,
                  image: (it.enclosure && it.enclosure.link) || it.thumbnail || firstImg(it.content || ''),
                  excerpt: strip(it.description || it.content || '').slice(0, 260),
                  content: it.content || ''
                }));
              } catch (e) {}
            }
            if (!posts.length) {
              for (const proxy of ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?url=']) {
                try {
                  const r = await fetch(proxy + encodeURIComponent(site + '/feed'));
                  if (!r.ok) continue;
                  const xml = new DOMParser().parseFromString(await r.text(), 'text/xml');
                  posts = [...xml.querySelectorAll('item')].map(it => {
                    const g = n => (it.getElementsByTagName(n)[0] || {}).textContent || '';
                    const enc = it.querySelector('enclosure');
                    const content = g('content:encoded');
                    return { title: g('title'), link: g('link'), date: g('pubDate'), image: enc ? enc.getAttribute('url') : firstImg(content), excerpt: strip(g('description') || content).slice(0, 260), content };
                  }).filter(p => p.title && p.link);
                  if (posts.length) break;
                } catch (e) {}
              }
            }
                  return posts;
          })();
          got.forEach(p => { p.tag = p.tag || label; });
          posts.push(...got);
        }
        posts.sort((x, y) => new Date(y.date) - new Date(x.date));
      }
      posts.forEach(p => { p.slug = p.slug || slugOf(p.link); });
      return { posts, live: posts.length > 0 };
    })();
    return postsPromise;
  }

  const postsEl = $('[data-posts]');
  if (postsEl) (async () => {
    const limit = +postsEl.dataset.posts || 3;
    const { posts, live } = await getPosts();
    const list = live ? posts : FALLBACK_POSTS;
    const draw = items => {
      postsEl.innerHTML = items.slice(0, limit).map(card).join('');
      postsEl.classList.toggle('few', Math.min(limit, items.length) <= 3);
      $$('.post', postsEl).forEach(p => p.classList.add('in'));
    };
    draw(list);
    const tags = [...new Set(list.map(tagOf))];
    if (postsEl.hasAttribute('data-posts-filter') && tags.length > 1) {
      const bar = document.createElement('div');
      bar.className = 'post-filter'; bar.setAttribute('role', 'tablist');
      bar.innerHTML = ['All', ...tags].map((t, i) => `<button type="button" role="tab" aria-selected="${i === 0}">${esc(t)}</button>`).join('');
      postsEl.before(bar);
      bar.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        $$('button', bar).forEach(x => x.setAttribute('aria-selected', String(x === b)));
        const t = b.textContent;
        draw(t === 'All' ? list : list.filter(p => tagOf(p) === t));
      });
    }
    const note = $('[data-posts-note]');
    if (note) note.hidden = live;
    $$('.post', postsEl).forEach((p, i) => { p.setAttribute('data-reveal', ''); p.dataset.delay = String(i % 3 + 1); io.observe(p); });
  })();

  // Display names for Substack labels and sections (set in js/config.js)
  function tagOf(p) { const map = window.EA_TAG_LABELS || {}; const t = p.tag || 'Letters'; return map[t] || t; }
  function firstImg(html) { const m = String(html).match(/<img[^>]+src="([^"]+)"/); return m ? m[1] : ''; }
  function strip(html) { const d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function fmtDate(d) { if (!d) return ''; const t = new Date(String(d).replace(' ', 'T')); return isNaN(t) ? '' : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function card(p) {
    const date = fmtDate(p.date);
    const href = p.slug ? `essay.html?p=${encodeURIComponent(p.slug)}` : p.link;
    const ext = p.slug ? '' : ' target="_blank" rel="noopener"';
    const img = p.image
      ? `<div class="post__img"><img src="${esc(p.image)}" alt="" loading="lazy"></div>`
      : `<div class="post__img post__img--type"><span>${esc(p.title)}</span></div>`;
    return `<a class="post" href="${esc(href)}"${ext}>${img}<div><div class="post__meta"><b>${esc(tagOf(p))}</b>${date ? `<span>${date}</span>` : ''}</div><h3 class="post__t" style="margin:12px 0 10px">${esc(p.title)}</h3><p class="post__x">${esc(p.excerpt)}</p><span class="post-link-sub">Read ${tagOf(p) === 'Letters' ? 'the letter' : 'now'} →</span></div></a>`;
  }

  /* ---------- Essay page: read a Substack post on the site ---------- */
  const essayEl = $('[data-essay]');
  if (essayEl) (async () => {
    const slug = params.get('p');
    const { posts } = await getPosts();
    const i = posts.findIndex(p => p.slug === slug);
    const post = posts[i];
    const T = $('[data-essay-title]'), M = $('[data-essay-meta]'), C = $('[data-essay-cover]'), S = $('[data-essay-source]');
    if (!post) {
      T.textContent = 'Letter not found';
      M.innerHTML = '';
      essayEl.innerHTML = `<p>This essay may have moved. <a href="writing.html">Browse all essays</a> or <a href="${SUBSTACK}" target="_blank" rel="noopener">read on Substack</a>.</p>`;
      return;
    }
    document.title = post.title + ' · Ezra Anya';
    T.textContent = post.title;
    const clean = sanitize(post.content || '');
    const words = strip(clean).split(' ').filter(Boolean).length;
    M.innerHTML = `<b>${esc(tagOf(post))}</b>${post.date ? `<span>${fmtDate(post.date)}</span>` : ''}${words > 80 ? `<span>${Math.max(1, Math.round(words / 230))} min read</span>` : ''}<span>By Ezra Anya</span>`;
    if (post.image && C) { C.innerHTML = `<img src="${esc(post.image)}" alt="">`; C.hidden = false; }
    if (S) S.href = post.link;
    if (words > 80) {
      essayEl.innerHTML = clean;
    } else {
      essayEl.innerHTML = `<p>${esc(post.excerpt)}</p><div class="essay-paywall"><p class="eyebrow">Continue reading</p><p>The full essay lives on Substack.</p><p style="margin-top:18px"><a class="btn btn--ink" href="${esc(post.link)}" target="_blank" rel="noopener" style="text-decoration:none;color:#fff">Read on Substack <span class="arr">↗</span></a></p></div>`;
    }
    const nextEl = $('[data-essay-next]');
    if (nextEl) {
      const more = posts.filter((_, k) => k !== i).slice(0, 3);
      if (more.length) { nextEl.innerHTML = more.map(card).join(''); nextEl.classList.toggle('few', more.length < 3); }
      else nextEl.closest('section').hidden = true;
    }
  })();

  // Allow-list sanitiser for Substack HTML: keeps reading content, drops scripts, widgets and tracking
  function sanitize(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstChild;
    const ALLOWED = new Set(['P','H1','H2','H3','H4','H5','H6','BLOCKQUOTE','UL','OL','LI','A','STRONG','B','EM','I','U','S','FIGURE','FIGCAPTION','IMG','HR','BR','PRE','CODE','SUP','SUB','SPAN','DIV','PICTURE','IFRAME','TABLE','THEAD','TBODY','TR','TH','TD']);
    const DROP = /subscription-widget|subscribe|button-wrapper|captioned-button|share|footnote-anchor-placeholder|poll|install-substack/i;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 8) { n.remove(); return; }
        if (n.nodeType !== 1) return;
        if (!ALLOWED.has(n.tagName) || DROP.test(n.className || '')) {
          if (['SCRIPT','STYLE','FORM','INPUT','BUTTON','SVG','NOSCRIPT'].includes(n.tagName) || DROP.test(n.className || '')) { n.remove(); return; }
          walk(n); n.replaceWith(...n.childNodes); return;
        }
        if (n.tagName === 'PICTURE') { const im = n.querySelector('img'); if (im) { n.replaceWith(im); walk(im.parentNode || node); } else n.remove(); return; }
        if (n.tagName === 'IFRAME' && !/^https:\/\/(www\.)?(youtube(-nocookie)?\.com|player\.vimeo\.com|open\.spotify\.com)\//.test(n.getAttribute('src') || '')) { n.remove(); return; }
        const keep = { A: ['href'], IMG: ['src', 'alt', 'width', 'height'], IFRAME: ['src', 'allow', 'allowfullscreen'], TD: ['colspan'], TH: ['colspan'] }[n.tagName] || [];
        [...n.attributes].forEach(at => { if (!keep.includes(at.name)) n.removeAttribute(at.name); });
        if (n.tagName === 'A') { const h = n.getAttribute('href') || ''; if (/^javascript:/i.test(h)) n.removeAttribute('href'); else { n.target = '_blank'; n.rel = 'noopener'; } }
        if (n.tagName === 'IMG') { n.loading = 'lazy'; n.removeAttribute('width'); n.removeAttribute('height'); }
        walk(n);
      });
    };
    walk(root);
    root.querySelectorAll('div,span').forEach(el => { if (!el.textContent.trim() && !el.querySelector('img,iframe')) el.remove(); });
    return root.innerHTML;
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

/* Calendly inline embed: hide the fallback once the widget loads */
(() => {
  const wrap = document.querySelector('.cal-wrap');
  if (!wrap) return;
  const check = setInterval(() => { if (wrap.querySelector('iframe')) { wrap.classList.add('loaded'); clearInterval(check); } }, 400);
  setTimeout(() => clearInterval(check), 15000);
})();

/* Library: playbooks and articles from data/library.json */
(() => {
  const grid = document.querySelector('[data-library]');
  if (!grid) return;
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  fetch('data/library.json', { cache: 'no-cache' }).then(r => r.json()).then(j => {
    const items = (j.items || []).filter(i => i.title && i.file);
    if (!items.length) { grid.outerHTML = '<div class="lib-empty"><p class="lead" style="margin:0 auto">The first playbooks are being prepared. Subscribe on Substack to hear when they land.</p></div>'; return; }
    grid.innerHTML = items.map(i => `
      <article class="lib-card" data-reveal>
        <a class="lib-cover${i.cover ? " has-img" : ""}" href="reader.html?doc=${encodeURIComponent(i.slug)}" aria-label="Read ${esc(i.title)}">${i.cover ? `<img src="${esc(i.cover)}" alt="Cover of ${esc(i.title)}" loading="lazy">` : ''}<span>${esc(i.title)}</span></a>
        <div class="lib-body">
          <span class="label">${esc(i.type || 'Playbook')}${i.pages ? ' · ' + esc(i.pages) + ' pages' : ''}</span>
          <h3 class="h4">${esc(i.title)}</h3>
          <p>${esc(i.summary)}</p>
          <div class="lib-actions"><a class="link" href="reader.html?doc=${encodeURIComponent(i.slug)}">Flip through <span class="arr">→</span></a><a class="link" href="${esc(i.file)}" download>Download PDF <span class="arr">↓</span></a></div>
        </div>
      </article>`).join('');
    grid.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('in'));
  }).catch(() => {});
})();

/* Reader: turns a library PDF into a flipbook (PDF.js renders, StPageFlip turns the pages) */
(() => {
  const host = document.querySelector('[data-reader]');
  if (!host) return;
  const slug = new URLSearchParams(location.search).get('doc');
  const title = document.querySelector('[data-reader-title]');
  const dl = document.querySelector('[data-reader-download]');
  const msg = html => { host.innerHTML = `<p class="lead reader-msg">${html}</p>`; };
  const esc = v => String(v || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  fetch('data/library.json', { cache: 'no-cache' }).then(r => r.json()).then(async j => {
    const doc = (j.items || []).find(i => i.slug === slug);
    if (!doc) { msg('That document could not be found. <a class="link" href="writing.html#playbooks">Back to the playbooks</a>'); return; }
    document.title = doc.title + ' · Ezra Anya';
    if (title) title.textContent = doc.title;
    if (dl) { dl.href = doc.file; dl.setAttribute('download', ''); }
    const lib = window['pdfjs-dist/build/pdf'];
    if (!lib) { msg(`The reader could not load. <a class="link" href="${doc.file}" download>Download the PDF</a>`); return; }
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    msg('Opening the book…');
    const pdf = await lib.getDocument(doc.file).promise;
    const first = (await pdf.getPage(1)).getViewport({ scale: 1 });
    const ratio = first.height / first.width;
    const renderW = Math.min(1100, Math.round(560 * Math.min(2, window.devicePixelRatio || 1)));
    const imgs = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      msg(`Preparing page ${n} of ${pdf.numPages}…`);
      const page = await pdf.getPage(n);
      const vp = page.getViewport({ scale: renderW / page.getViewport({ scale: 1 }).width });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      imgs.push(c.toDataURL('image/jpeg', 0.9));
    }
    host.innerHTML = `
      <div class="flip-stage"><div class="flip-book" data-book></div></div>
      <div class="flip-ctrl">
        <button type="button" class="flip-btn" data-flip-prev aria-label="Previous page">←</button>
        <span class="flip-count" data-flip-count aria-live="polite"></span>
        <button type="button" class="flip-btn" data-flip-next aria-label="Next page">→</button>
      </div>
      <p class="flip-hint">Drag a corner, tap the arrows or use your arrow keys to turn the page.</p>`;
    const book = host.querySelector('[data-book]');
    imgs.forEach((src, i) => {
      const d = document.createElement('div');
      d.className = 'flip-page';
      if (i === 0 || i === imgs.length - 1) d.dataset.density = 'hard';
      d.innerHTML = `<img src="${src}" alt="${esc(doc.title)}, page ${i + 1}" draggable="false">`;
      book.appendChild(d);
    });
    const count = host.querySelector('[data-flip-count]');
    if (!window.St || !window.St.PageFlip) {
      // Library missing: show the pages one at a time with the same controls
      const pages = [...book.children]; let at = 0;
      book.classList.add('flip-fallback');
      const show = () => { pages.forEach((p, i) => p.hidden = i !== at); count.textContent = `${at + 1} / ${pages.length}`; };
      host.querySelector('[data-flip-prev]').onclick = () => { at = Math.max(0, at - 1); show(); };
      host.querySelector('[data-flip-next]').onclick = () => { at = Math.min(pages.length - 1, at + 1); show(); };
      show(); return;
    }
    // Fit a whole spread, with the controls, inside the screen height
    const availH = Math.max(380, window.innerHeight - 290);
    const maxPW = Math.max(260, Math.min(900, Math.floor(availH / ratio)));
    const pw = Math.min(560, maxPW), ph = Math.round(pw * ratio);
    const flip = new St.PageFlip(book, {
      width: pw, height: ph, size: 'stretch',
      minWidth: 260, maxWidth: maxPW, minHeight: Math.round(260 * ratio), maxHeight: Math.round(maxPW * ratio),
      showCover: true, usePortrait: true, maxShadowOpacity: 0.45,
      mobileScrollSupport: true, flippingTime: 800, autoSize: true
    });
    flip.loadFromHTML(book.querySelectorAll('.flip-page'));
    const total = imgs.length;
    const update = () => {
      const i = flip.getCurrentPageIndex();
      const spread = flip.getOrientation() === 'landscape' && i > 0 && i < total - 1;
      count.textContent = spread ? `${i + 1}–${Math.min(i + 2, total)} / ${total}` : `${i + 1} / ${total}`;
      host.querySelector('[data-flip-prev]').disabled = i === 0;
      host.querySelector('[data-flip-next]').disabled = i >= total - (spread ? 2 : 1);
    };
    flip.on('flip', update); flip.on('changeOrientation', update); update();
    host.querySelector('[data-flip-prev]').onclick = () => flip.flipPrev();
    host.querySelector('[data-flip-next]').onclick = () => flip.flipNext();
    document.addEventListener('keydown', e => {
      if (e.target.closest('input,textarea')) return;
      if (e.key === 'ArrowRight') flip.flipNext();
      if (e.key === 'ArrowLeft') flip.flipPrev();
    });
  }).catch(() => msg('The document could not load right now.'));
})();

/* ---------- Clarity Conversation: discovery form, then Calendly ---------- */
(() => {
  const form = document.querySelector('form[data-discovery]');
  if (!form) return;
  const EMAIL = 'message.theezraanya@gmail.com';
  const CAL = (document.querySelector('[data-cal-link]') || {}).href || 'https://calendly.com/ezraanya/talk-w-tea';
  const panes = [...form.querySelectorAll('[data-pane]')];
  const bars = [...form.querySelectorAll('.dsteps i')];
  const label = form.querySelector('[data-step-label]');
  const prev = form.querySelector('[data-prev]'), next = form.querySelector('[data-next]'), submit = form.querySelector('[data-submit]');
  const err = form.querySelector('.form-err');
  const KEY = 'ea-clarity-draft';
  let step = 0;

  // "Other" free-text for question 3
  const other = form.querySelector('[data-other]');
  form.querySelectorAll('input[name="3. Which best describes you"]').forEach(r => r.addEventListener('change', () => {
    const on = form.querySelector('input[name="3. Which best describes you"]:checked').value === 'Other';
    other.hidden = !on; other.required = on; if (on) other.focus();
  }));

  // draft save / restore
  const save = () => {
    const d = {};
    form.querySelectorAll('input,textarea').forEach(el => {
      if (!el.name || el.name.startsWith('_')) return;
      if (el.type === 'radio' || el.type === 'checkbox') { if (el.checked) (d[el.name] = d[el.name] || []).push(el.value); }
      else if (el.value) d[el.name] = el.value;
    });
    try { localStorage.setItem(KEY, JSON.stringify({ d, step })); } catch (e) {}
  };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.d) {
      form.querySelectorAll('input,textarea').forEach(el => {
        const v = saved.d[el.name]; if (v == null) return;
        if (el.type === 'radio' || el.type === 'checkbox') el.checked = [].concat(v).includes(el.value);
        else el.value = v;
      });
      const r = form.querySelector('input[name="3. Which best describes you"]:checked');
      if (r && r.value === 'Other') { other.hidden = false; other.required = true; }
      step = Math.min(saved.step || 0, panes.length - 1);
    }
  } catch (e) {}
  form.addEventListener('input', save);
  form.addEventListener('change', save);

  const show = i => {
    step = i;
    panes.forEach((p, k) => p.classList.toggle('on', k === i));
    bars.forEach((b, k) => b.classList.toggle('on', k <= i));
    label.textContent = `Step ${i + 1} of ${panes.length}`;
    prev.hidden = i === 0;
    next.hidden = i === panes.length - 1;
    submit.hidden = i !== panes.length - 1;
    save();
  };
  const valid = pane => {
    let ok = true;
    pane.querySelectorAll('.dq').forEach(q => {
      let good = true;
      if (q.dataset.group) good = !!q.querySelector('input[type=checkbox]:checked');
      q.querySelectorAll('input,textarea').forEach(el => { if (!el.hidden && !el.checkValidity()) good = false; });
      q.classList.toggle('invalid', !good);
      if (!good && ok) { ok = false; const f = q.querySelector('input:not([hidden]),textarea'); if (f) f.focus({ preventScroll: true }); q.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
    return ok;
  };
  form.addEventListener('input', e => { const q = e.target.closest('.dq'); if (q) q.classList.remove('invalid'); });
  next.addEventListener('click', () => { if (valid(panes[step])) { show(step + 1); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });
  prev.addEventListener('click', () => { show(step - 1); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && step < panes.length - 1) { e.preventDefault(); next.click(); } });

  const openCalendar = (name, email, note) => {
    form.classList.add('done');
    const book = document.querySelector('[data-book]');
    book.classList.add('on');
    if (note) book.querySelector('[data-book-note]').innerHTML = note;
    const url = new URL(CAL);
    if (name) url.searchParams.set('name', name);
    if (email) url.searchParams.set('email', email);
    url.searchParams.set('hide_gdpr_banner', '1');
    url.searchParams.set('primary_color', 'f26b1d');
    const link = book.querySelector('[data-cal-link]'); link.href = url.toString();
    const host = book.querySelector('[data-cal-host]');
    const tryInit = (n = 0) => {
      if (window.Calendly && Calendly.initInlineWidget) {
        Calendly.initInlineWidget({ url: url.toString(), parentElement: host, prefill: { name, email } });
        const wrap = host.closest('.cal-wrap');
        const chk = setInterval(() => { if (host.querySelector('iframe')) { wrap.classList.add('loaded'); clearInterval(chk); } }, 400);
        setTimeout(() => clearInterval(chk), 15000);
      } else if (n < 20) setTimeout(() => tryInit(n + 1), 300);
    };
    tryInit();
    book.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    for (let i = 0; i < panes.length; i++) { if (!valid(panes[i])) { show(i); return; } }
    const data = {};
    for (const [k, v] of new FormData(form).entries()) { if (!v) continue; data[k] = data[k] ? data[k] + ', ' + v : v; }
    const name = data['1. Full name'] || '', email = data['2. Email address'] || '';
    data._subject = `Clarity Conversation form: ${name}`;
    data._template = 'table';
    data._captcha = 'false';
    data._replyto = email;
    const label0 = submit.innerHTML; submit.disabled = true; submit.innerHTML = 'Sending…'; err.classList.remove('on');
    try {
      data._form = 'clarity'; await window.EA_sendForm(data);
      try { localStorage.removeItem(KEY); } catch (x) {}
      openCalendar(name, email);
    } catch (ex) {
      submit.disabled = false; submit.innerHTML = label0;
      const body = Object.entries(data).filter(([k]) => !k.startsWith('_')).map(([k, v]) => `${k}\n${v}\n`).join('\n');
      const mail = `mailto:${EMAIL}?subject=${encodeURIComponent(data._subject)}&body=${encodeURIComponent(body)}`;
      openCalendar(name, email, `Your answers could not be sent automatically, so please <a href="${mail}" style="color:var(--orange-text);text-decoration:underline">send them by email</a> (it opens ready to send). Then pick a time below.`);
    }
  });

  show(step);
})();

/* ---------- Microsoft Clarity with cookie consent ----------
   Clarity loads on every page. Until a visitor accepts, it runs in no-consent mode:
   no cookies, page-level data only. Accepting switches on full session tracking. */
(() => {
  const id = window.EA_CLARITY_ID;
  if (!id) return;
  const KEY = 'ea-cookie-consent';
  let choice = null;
  try { choice = localStorage.getItem(KEY); } catch (e) {}
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', id);
  const signal = granted => window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: granted ? 'granted' : 'denied' });
  signal(choice === 'accepted');
  const banner = document.querySelector('.cookie');
  if (!banner) return;
  if (!choice) setTimeout(() => banner.classList.add('on'), 1800);
  const decide = v => {
    try { localStorage.setItem(KEY, v); } catch (e) {}
    signal(v === 'accepted');
    if (v !== 'accepted') { try { window.clarity('consent', false); } catch (e) {} }
    banner.classList.remove('on');
  };
  banner.querySelector('[data-accept]').addEventListener('click', () => decide('accepted'));
  banner.querySelector('[data-decline]').addEventListener('click', () => decide('declined'));
  document.querySelectorAll('[data-cookie-settings]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); banner.classList.add('on'); }));
})();
