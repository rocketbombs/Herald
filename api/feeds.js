export const config = { runtime: "edge" };

const BATCH_1 = [
  { id: "cbc-ham", name: "CBC Hamilton", icon: "📺", color: "#C8102E", url: "https://www.cbc.ca/cmlink/rss-canada-hamilton", category: "Hamilton" },
  { id: "cbc-ca", name: "CBC Canada", icon: "🇨🇦", color: "#B71C1C", url: "https://www.cbc.ca/cmlink/rss-topstories", category: "Canada" },
  { id: "cbc-on", name: "CBC Toronto", icon: "📺", color: "#D32F2F", url: "https://www.cbc.ca/cmlink/rss-canada-toronto", category: "Ontario" },
  { id: "cbc-politics", name: "CBC Politics", icon: "🏛️", color: "#4A148C", url: "https://www.cbc.ca/cmlink/rss-politics", category: "Politics" },
  { id: "cbc-business", name: "CBC Business", icon: "💼", color: "#1B5E20", url: "https://www.cbc.ca/cmlink/rss-business", category: "Business" },
  { id: "cbc-health", name: "CBC Health", icon: "🏥", color: "#00838F", url: "https://www.cbc.ca/cmlink/rss-health", category: "Health" },
  { id: "cbc-tech", name: "CBC Tech & Science", icon: "🔬", color: "#4527A0", url: "https://www.cbc.ca/cmlink/rss-technology", category: "Tech" },
];

const BATCH_2 = [
  { id: "global-ham", name: "Global News Hamilton", icon: "📡", color: "#1565C0", url: "https://globalnews.ca/hamilton/feed/", category: "Hamilton" },
  { id: "bayobserver", name: "Bay Observer", icon: "🌊", color: "#0077B6", url: "https://bayobserver.ca/feed/", category: "Hamilton" },
  { id: "mcmaster", name: "McMaster Daily News", icon: "🎓", color: "#7A003C", url: "https://dailynews.mcmaster.ca/feed/", category: "McMaster" },
  { id: "cfl", name: "CFL News", icon: "🏈", color: "#FFB81C", url: "https://www.cfl.ca/feed/", category: "Sports" },
  { id: "reddit", name: "r/Hamilton", icon: "💬", color: "#FF4500", url: "https://www.reddit.com/r/Hamilton/.rss", category: "Community" },
  { id: "spec", name: "The Spec", icon: "📰", color: "#2D3748", url: "https://www.thespec.com/rss/", category: "Hamilton" },
  { id: "citynews", name: "CityNews Toronto", icon: "📺", color: "#0D47A1", url: "https://toronto.citynews.ca/feed/", category: "Ontario" },
];

function extractTag(block, tag) {
  const c = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const m1 = block.match(c);
  if (m1) return m1[1].trim();
  const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m2 = block.match(r);
  return m2 ? m2[1].trim() : "";
}

function extractImage(b) {
  const t = b.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
  if (t) return t[1];
  const mc = b.match(/<media:content[^>]*url=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i);
  if (mc) return mc[1];
  const mi = b.match(/<media:content[^>]*medium=["']image["'][^>]*url=["']([^"']+)["']/i);
  if (mi) return mi[1];
  const mi2 = b.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*medium=["']image["']/i);
  if (mi2) return mi2[1];
  const enc = b.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i);
  if (enc) return enc[1];
  const enc2 = b.match(/<enclosure[^>]*type=["']image[^"']*["'][^>]*url=["']([^"']+)["']/i);
  if (enc2) return enc2[1];
  const img = b.match(/<img[^>]*src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i);
  if (img) return img[1];
  return "";
}

function parseItems(xml) {
  const items = [];
  let m;
  const ir = /<item[\s>]([\s\S]*?)<\/item>/gi;
  while ((m = ir.exec(xml)) !== null) {
    items.push({ title: extractTag(m[1], "title"), description: extractTag(m[1], "description") || extractTag(m[1], "content:encoded"), link: extractTag(m[1], "link"), pubDate: extractTag(m[1], "pubDate") || extractTag(m[1], "dc:date"), image: extractImage(m[1]) });
  }
  if (items.length === 0) {
    const er = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
    while ((m = er.exec(xml)) !== null) {
      const lm = m[1].match(/<link[^>]*href=["']([^"']+)["']/);
      items.push({ title: extractTag(m[1], "title"), description: extractTag(m[1], "summary") || extractTag(m[1], "content"), link: lm ? lm[1] : extractTag(m[1], "link"), pubDate: extractTag(m[1], "published") || extractTag(m[1], "updated"), image: extractImage(m[1]) });
    }
  }
  return items.slice(0, 12);
}

function strip(h) {
  if (!h) return "";
  let s = h;
  // Decode numeric HTML entities: &#32; → space, &#x200B; → zero-width-space, etc.
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  s = s.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  // Decode named HTML entities (two passes for Reddit's double-encoding: &amp;lt; → &lt; → <)
  for (let i = 0; i < 2; i++) {
    s = s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
         .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
         .replace(/&apos;/g, "'").replace(/&mdash;/g, "—").replace(/&ndash;/g, "–")
         .replace(/&hellip;/g, "…").replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'")
         .replace(/&rdquo;/g, "\u201D").replace(/&ldquo;/g, "\u201C");
  }
  // Strip all HTML tags
  s = s.replace(/<[^>]+>/g, " ");
  // Strip Reddit noise
  s = s.replace(/\[link\]/gi, "").replace(/\[comments\]/gi, "")
       .replace(/submitted by\s*\/u\/\S+/gi, "")
       .replace(/\u200B/g, ""); // zero-width space (now decoded from &#x200B;)
  // Clean whitespace
  return s.replace(/\s+/g, " ").trim();
}

async function fetchFeed(feed, ms) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    const r = await fetch(feed.url, { signal: c.signal, headers: { "Accept": "application/rss+xml, application/atom+xml, text/xml, */*" } });
    clearTimeout(t);
    if (!r.ok) return null;
    const txt = await r.text();
    if (!txt || txt.length < 100) return null;
    const items = parseItems(txt);
    if (!items.length) return null;
    const arts = items.map(i => ({ title: strip(i.title), summary: strip(i.description).slice(0, 300), link: i.link, pubDate: i.pubDate || "", image: i.image || "", feedId: feed.id, category: feed.category })).filter(a => a.title && a.title.length > 5);
    if (!arts.length) return null;
    return { feed: { id: feed.id, name: feed.name, icon: feed.icon, color: feed.color, category: feed.category, count: arts.length }, articles: arts };
  } catch { return null; }
}

function dedup(a) {
  const s = new Set();
  return a.filter(x => { const k = `${x.feedId}-${x.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50)}`; if (s.has(k)) return false; s.add(k); return true; });
}

export default async function handler(req) {
  const url = new URL(req.url);
  const batch = url.searchParams.get("batch") || "1";
  const feeds = batch === "2" ? BATCH_2 : BATCH_1;
  const perFeed = batch === "2" ? 4000 : 3000;
  const deadline = batch === "2" ? 8000 : 6000;
  const results = [];
  const racers = feeds.map(async f => { const r = await fetchFeed(f, perFeed); if (r) results.push(r); });
  await Promise.race([Promise.allSettled(racers), new Promise(r => setTimeout(r, deadline))]);
  const allArts = [], lf = [];
  for (const r of results) { lf.push(r.feed); allArts.push(...r.articles); }
  const sorted = dedup(allArts).sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
  return new Response(JSON.stringify({ articles: sorted, feeds: lf, batch: parseInt(batch), fetchedAt: new Date().toISOString() }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600", "Vercel-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
