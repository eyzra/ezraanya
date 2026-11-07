// Pulls the latest posts from Substack and writes data/posts.json.
// Run by .github/workflows/substack.yml. Needs Node 18+ (built-in fetch). No dependencies.
// Substack often blocks requests from GitHub's servers, so this tries three sources in turn
// and exits cleanly if none answer, leaving the last good posts.json in place.
import { writeFile, mkdir, readFile } from 'node:fs/promises';

// Every Substack publication to show on the site. Add a line for each new newsletter.
const PUBLICATIONS = [
  { site: 'https://theezraanya.substack.com', label: 'Letters' }
];
const LIMIT = 12;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const decode = s => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1]).trim() : ''; };
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const slugOf = link => { const m = String(link).match(/\/p\/([^/?#]+)/); return m ? m[1] : ''; };
const firstImg = html => { const m = html.match(/<img[^>]+src="([^"]+)"/); return m ? m[1] : ''; };

function fromRss(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, LIMIT).map(([, it]) => {
    const enclosure = it.match(/<enclosure[^>]*url="([^"]+)"/);
    const content = tag(it, 'content:encoded');
    const link = tag(it, 'link');
    return {
      title: tag(it, 'title'),
      link,
      slug: slugOf(link),
      content,
      date: new Date(tag(it, 'pubDate')).toISOString(),
      excerpt: text(tag(it, 'description') || content).slice(0, 260),
      image: enclosure ? enclosure[1] : firstImg(content)
    };
  });
}

// Substack sections (e.g. Authentic Intelligence) come through the archive API only, so it runs first.
const secName = o => (o && (o.section_name || (o.section && o.section.name) || (o.sections && o.sections[0] && o.sections[0].name))) || '';
const sourcesFor = (SITE, FEED) => [
  {
    name: 'Substack archive API',
    run: async () => {
      const r = await fetch(`${SITE}/api/v1/archive?sort=new&limit=${LIMIT}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const list = await r.json();
      const out = [];
      for (const p of list) {
        let content = '', section = secName(p);
        try {
          const d = await fetch(`${SITE}/api/v1/posts/${p.slug}`, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
          if (d.ok) { const dj = await d.json(); content = dj.body_html || ''; section = section || secName(dj); }
        } catch {}
        out.push({
          title: p.title, link: p.canonical_url || `${SITE}/p/${p.slug}`, slug: p.slug, content, section,
          date: new Date(p.post_date).toISOString(),
          excerpt: (p.subtitle || p.description || '').slice(0, 260), image: p.cover_image || ''
        });
      }
      return out;
    }
  },
  {
    name: 'Substack feed',
    run: async () => {
      const r = await fetch(FEED, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return fromRss(await r.text());
    }
  },
  {
    name: 'rss2json',
    run: async () => {
      const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(FEED));
      const j = await r.json();
      if (j.status !== 'ok') throw new Error(j.message || 'not ok');
      return j.items.slice(0, LIMIT).map(it => ({
        title: it.title, link: it.link, slug: slugOf(it.link), content: it.content || '',
        date: new Date(it.pubDate.replace(' ', 'T') + 'Z').toISOString(),
        excerpt: text(it.description || it.content || '').slice(0, 260),
        image: (it.enclosure && it.enclosure.link) || it.thumbnail || firstImg(it.content || '')
      }));
    }
  }
];

let posts = [];
for (const pub of PUBLICATIONS) {
  const FEED = pub.site + '/feed';
  let got = [];
  for (const s of sourcesFor(pub.site, FEED)) {
    try {
      got = (await s.run()).filter(p => p.title && p.link);
      if (got.length) { console.log(`${pub.site}: ${got.length} posts from ${s.name}.`); break; }
      console.log(`${pub.site}: ${s.name} returned no posts.`);
    } catch (e) {
      console.log(`${pub.site}: ${s.name} failed: ${e.message}`);
    }
  }
  got.forEach(p => { p.tag = p.section || pub.label; p.publication = pub.site; });
  posts.push(...got);
}
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

if (!posts.length) {
  console.log('No source answered. Keeping the current posts.json.');
  process.exit(0);
}

await mkdir('data', { recursive: true });
let previous = '';
try { previous = await readFile('data/posts.json', 'utf8'); } catch {}

const body = JSON.stringify({ sources: PUBLICATIONS.map(p => p.site), posts }, null, 2) + '\n';
if (body === previous) { console.log('No changes.'); process.exit(0); }
await writeFile('data/posts.json', body);
console.log(`Wrote ${posts.length} posts.`);
