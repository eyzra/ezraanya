/**
 * Builds the Authentic Intelligence articles for the website.
 *
 * Reads every Markdown file in /articles and writes:
 *   data/articles.json  the articles the Writing page and reader show
 *   feed.xml            an RSS feed, so tools like Zapier or Make can share each new article to LinkedIn
 *
 * Runs on GitHub (see .github/workflows/articles.yml) whenever a file in /articles changes.
 * To run it on your own computer: node scripts/build-articles.mjs
 *
 * Each article starts with a header like this:
 * ---
 * title: Your title
 * kicker: Short label shown above the title (optional)
 * date: 2026-11-23
 * cover: assets/img/articles/your-cover.jpg
 * excerpt: One or two sentences for the card.
 * linkedin: https://www.linkedin.com/pulse/... (optional)
 * ---
 * Then the article in normal Markdown: ### for headings, **bold**, *italic*, [link](url), 1. lists, --- for a line.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://theezraanya.com';
const TAG = 'Authentic Intelligence';

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function frontMatter(src) {
  const m = src.match(/^﻿?---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  m[1].split('\n').forEach(line => {
    const i = line.indexOf(':');
    if (i < 1) return;
    let v = line.slice(i + 1).trim();
    if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1);
    meta[line.slice(0, i).trim().toLowerCase()] = v;
  });
  return { meta, body: src.slice(m[0].length) };
}

// Inline Markdown: links, bare URLs, bold italic, bold, italic, code
function inline(text, noAuto = false) {
  const links = [];
  let s = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, t, u) => { links.push([t, u]); return `\u0000${links.length - 1}\u0000`; });
  s = esc(s);
  if (!noAuto) s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, u) => `${pre}<a href="${u}">${u}</a>`);
  s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
       .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
       .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
       .replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<a href="${esc(links[i][1])}">${inline(links[i][0], true)}</a>`);
  return s;
}

function markdown(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = [];
  let para = [], list = null;
  const flushPara = () => {
    if (!para.length) return;
    // two trailing spaces mean a line break
    out.push('<p>' + para.map(l => inline(l.replace(/\s{2,}$/, ''))).join(para.some(l => /\s{2,}$/.test(l)) ? '<br>' : ' ') + '</p>');
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    out.push(`<${list.type}>` + list.items.map(it => `<li>${it.map(l => inline(l.trim())).join('<br>')}</li>`).join('') + `</${list.type}>`);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.replace(/\t/g, '    ');
    if (!line.trim()) { flushPara(); if (list) list.gap = true; continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    const ol = line.match(/^\s{0,3}(\d+)[.)]\s+(.*)$/);
    const ul = line.match(/^\s{0,3}[-*+]\s+(.*)$/);
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flushPara(); flushList(); out.push('<hr>'); continue; }
    if (h) { flushPara(); flushList(); if (h[2].trim()) { const lvl = Math.max(2, Math.min(4, h[1].length === 1 ? 2 : h[1].length - 1)); out.push(`<h${lvl}>${inline(h[2].trim())}</h${lvl}>`); } continue; }
    if (ol || ul) {
      flushPara();
      const type = ol ? 'ol' : 'ul';
      if (!list || list.type !== type) { flushList(); list = { type, items: [] }; }
      list.items.push([(ol ? ol[2] : ul[1])]); list.gap = false;
      continue;
    }
    if (list && /^\s{2,}\S/.test(line)) { list.items[list.items.length - 1].push(line.trim()); continue; }
    if (list) flushList();
    if (/^>\s?/.test(line)) { flushPara(); out.push(`<blockquote><p>${inline(line.replace(/^>\s?/, ''))}</p></blockquote>`); continue; }
    para.push(line);
  }
  flushPara(); flushList();
  return out.join('\n');
}

const plain = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const slugify = s => s.toLowerCase().replace(/\.md$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const dir = join(ROOT, 'articles');
const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('_')) : [];
const articles = files.map((file, order) => {
  const { meta, body } = frontMatter(readFileSync(join(dir, file), 'utf8'));
  const content = markdown(body);
  const text = plain(content);
  return {
    title: meta.title || file.replace(/\.md$/, ''),
    kicker: meta.kicker || '',
    slug: slugify(meta.slug || file),
    date: meta.date || '',
    image: meta.cover || '',
    excerpt: meta.excerpt || text.slice(0, 240),
    link: meta.linkedin || '',
    linkedin: meta.linkedin || '',
    tag: TAG,
    local: true,
    words: text.split(' ').length,
    content,
    _order: order
  };
}).filter(a => !/^draft$/i.test(a.date));

// Newest first. Articles without a date keep their file order, after dated ones.
articles.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a._order - b._order);
articles.forEach(a => delete a._order);

mkdirSync(join(ROOT, 'data'), { recursive: true });
writeFileSync(join(ROOT, 'data/articles.json'), JSON.stringify({ updated: new Date().toISOString(), articles }, null, 2));

const abs = p => /^https?:/.test(p) ? p : `${SITE}/${String(p).replace(/^\//, '')}`;
const rssDate = d => { const t = d ? new Date(d + (d.length === 10 ? 'T09:00:00+01:00' : '')) : null; return t && !isNaN(t) ? t.toUTCString() : ''; };
const items = articles.map(a => {
  const url = `${SITE}/essay.html?p=${encodeURIComponent(a.slug)}`;
  return `    <item>
      <title>${esc(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="false">theezraanya-${a.slug}</guid>
${rssDate(a.date) ? `      <pubDate>${rssDate(a.date)}</pubDate>\n` : ''}      <description>${esc(a.excerpt)}</description>
${a.image ? `      <enclosure url="${esc(abs(a.image))}" type="image/jpeg" length="0"/>\n` : ''}      <category>${TAG}</category>
    </item>`;
}).join('\n');
writeFileSync(join(ROOT, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Authentic Intelligence by Ezra Anya</title>
    <link>${SITE}/writing.html</link>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Ezra Anya on AI, branding, psychology and personal development. The Art of Thinking Clearly.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`);
console.log(`Built ${articles.length} article(s): ${articles.map(a => a.slug).join(', ')}`);
