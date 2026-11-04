// Pulls the latest posts from Substack's RSS feed and writes data/posts.json.
// Run by .github/workflows/substack.yml on a schedule. Needs Node 18+ (built-in fetch). No dependencies.
import { writeFile, mkdir } from 'node:fs/promises';

const FEED = 'https://theezraanya.substack.com/feed';
const LIMIT = 12;

const decode = s => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1]).trim() : ''; };
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const res = await fetch(FEED, { headers: { 'User-Agent': 'theezraanya.com feed sync' } });
if (!res.ok) { console.error('Feed request failed:', res.status); process.exit(1); }
const xml = await res.text();
const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, LIMIT).map(([, it]) => {
  const enclosure = it.match(/<enclosure[^>]*url="([^"]+)"/);
  const description = tag(it, 'description');
  const content = tag(it, 'content:encoded');
  const imgInContent = content.match(/<img[^>]+src="([^"]+)"/);
  return {
    title: tag(it, 'title'),
    link: tag(it, 'link'),
    date: new Date(tag(it, 'pubDate')).toISOString(),
    excerpt: text(description || content).slice(0, 260),
    image: enclosure ? enclosure[1] : (imgInContent ? imgInContent[1] : '')
  };
}).filter(p => p.title && p.link);

if (!items.length) { console.error('No posts found; leaving posts.json unchanged.'); process.exit(0); }
await mkdir('data', { recursive: true });
await writeFile('data/posts.json', JSON.stringify({ updated: new Date().toISOString(), source: FEED, posts: items }, null, 2) + '\n');
console.log(`Wrote ${items.length} posts.`);
