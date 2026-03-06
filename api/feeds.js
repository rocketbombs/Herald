// /api/feeds.js — Vercel Edge Function
// Supports ?batch=1 (fast feeds) and ?batch=2 (slow feeds)
// Extracts thumbnail images from media:content, media:thumbnail, enclosure, and inline img tags

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

// ── XML parsing ─────────────────────────────────────────────────────────────

function extractTag(block, tag) {
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const m1 = block.match(cdataRe);
  if (m1) return m1[1].trim();
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m2 = block.match(re);
  return m2 ? m2[1].trim() : "";
}

function extractImage(block) {
  // 1. media:thumbnail url="..."
  const mediaThumbnail = block.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
  if (mediaThumbnail) return mediaThumbnail[1];

  // 2. media:content url="..." (only images)
  const mediaContent = block.match(/<media:content[^>]*url=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i);
  if (mediaContent) return mediaContent[1];

  // 3. media:content with medium="image"
  const mediaImg = block.match(/<media:content[^>]*medium=["']image["'][^>]*url=["']([^"']+)["']/i);
  if (mediaImg) return mediaImg[1];
  const mediaImg2 = block.match(/<media:content[^>]*url=["']([^"']+)["'][^>]*medium=["']image["']/i);
  if (mediaImg2) return mediaImg2[1];

  // 4. enclosure with image type
  const enclosure = block.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image/i);
  if (enclosure) return enclosure[1];
  const enclosure2 = block.match(/<enclosure[^>]*type=["']image[^"']*["'][^>]*url=["']([^"']+)["']/i);
  if (enclosure2) return enclosure2[1];

  // 5. First <img src="..."> in description/content
  const imgTag = block.match(/<img[^>]*src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i);
  if (imgTag) return imgTag[1];

  return "";
}

function parseItems(xml) {
  const items = [];

  // RSS <item>
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    items.push({
      title: extractTag(m[1], "title"),
      description: extractTag(m[1], "description") || extractTag(m[1], "content:encoded"),
      link: extractTag(m[1], "link"),
      pubDate: extractTag(m[1], "pubDate") || extractTag(m[1], "dc:date"),
      image: extractImage(m[1]),
    });
  }

  // Atom <entry>
  if (items.length === 0) {
    const entryRe = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
    while ((m = entryRe.exec(xml)) !== null) {
      const linkMatch = m[1].match(/<link[^>]*href=["']([^"']+)["']/);
      items.push({
        title: extractTag(m[1], "title"),
        description: extractTag(m[1], "summary") || extractTag(m[1], "content"),
        link: linkMatch ? linkMatch[1] : extractTag(m[1], "link"),
        pubDate: extractTag(m[1], "published") || extractTag(m[1], "updated"),
        image: extractImage(m[1]),
      });
    }
  }

  return items.slice(0, 12);
}

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

// ── Fetch one feed ──────────────────────────────────────────────────────────

async function fetchFeed(feed, timeoutMs) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "HamiltonHerald/1.0 (RSS Aggregator)",
        "Accept": "application/rss+xml, application/atom+xml, text/xml, */*",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text || text.length < 100) return null;

    const items = parseItems(text);
    if (items.length === 0) return null;

    const articles = items.map((item) => ({
      title: stripHtml(item.title),
      summary: stripHtml(item.description).slice(0, 300),
      link: item.link,
      pubDate: item.pubDate || "",
      image: item.image || "",
      feedId: feed.id,
      category: feed.category,
    })).filter((a) => a.title && a.title.length > 5);

    if (articles.length === 0) return null;
    return {
      feed: { id: feed.id, name: feed.name, icon: feed.icon, color: feed.color, category: feed.category, count: articles.length },
      articles,
    };
  } catch {
    return null;
  }
}

// ── Dedup ───────────────────────────────────────────────────────────────────

function dedup(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    const k = a.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req) {
  const url = new URL(req.url);
  const batch = url.searchParams.get("batch") || "1";

  const feeds = batch === "2" ? BATCH_2 : BATCH_1;
  const PER_FEED_TIMEOUT = batch === "2" ? 4000 : 3000;
  const GLOBAL_DEADLINE = batch === "2" ? 8000 : 6000;

  const results = [];
  const racers = feeds.map(async (f) => {
    const r = await fetchFeed(f, PER_FEED_TIMEOUT);
    if (r) results.push(r);
  });

  await Promise.race([
    Promise.allSettled(racers),
    new Promise((resolve) => setTimeout(resolve, GLOBAL_DEADLINE)),
  ]);

  const allArticles = [];
  const liveFeeds = [];
  for (const r of results) {
    liveFeeds.push(r.feed);
    allArticles.push(...r.articles);
  }

  const sorted = dedup(allArticles).sort((a, b) =>
    new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime()
  );

  return new Response(JSON.stringify({
    articles: sorted,
    feeds: liveFeeds,
    batch: parseInt(batch),
    fetchedAt: new Date().toISOString(),
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "Vercel-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
