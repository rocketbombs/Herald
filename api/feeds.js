// /api/feeds.js — Vercel Edge Function
// Edge Runtime = near-zero cold starts (vs 1-5s for Node.js serverless)
// Aggressive 3s per-feed timeout + 8s global deadline = always returns fast
// Returns whatever feeds completed, drops the rest silently

export const config = {
  runtime: "edge",
};

const FEEDS = [
  // Fast feeds first (CBC endpoints are very reliable and quick)
  { id: "cbc-ham", name: "CBC Hamilton", icon: "📺", color: "#C8102E", url: "https://www.cbc.ca/cmlink/rss-canada-hamilton", category: "Hamilton" },
  { id: "cbc-ca", name: "CBC Canada", icon: "🇨🇦", color: "#B71C1C", url: "https://www.cbc.ca/cmlink/rss-topstories", category: "Canada" },
  { id: "cbc-on", name: "CBC Toronto", icon: "📺", color: "#D32F2F", url: "https://www.cbc.ca/cmlink/rss-canada-toronto", category: "Ontario" },
  { id: "cbc-politics", name: "CBC Politics", icon: "🏛️", color: "#4A148C", url: "https://www.cbc.ca/cmlink/rss-politics", category: "Politics" },
  { id: "cbc-business", name: "CBC Business", icon: "💼", color: "#1B5E20", url: "https://www.cbc.ca/cmlink/rss-business", category: "Business" },
  { id: "cbc-health", name: "CBC Health", icon: "🏥", color: "#00838F", url: "https://www.cbc.ca/cmlink/rss-health", category: "Health" },
  { id: "cbc-tech", name: "CBC Tech & Science", icon: "🔬", color: "#4527A0", url: "https://www.cbc.ca/cmlink/rss-technology", category: "Tech" },
  // Medium reliability
  { id: "global-ham", name: "Global News Hamilton", icon: "📡", color: "#1565C0", url: "https://globalnews.ca/hamilton/feed/", category: "Hamilton" },
  { id: "bayobserver", name: "Bay Observer", icon: "🌊", color: "#0077B6", url: "https://bayobserver.ca/feed/", category: "Hamilton" },
  { id: "mcmaster", name: "McMaster Daily News", icon: "🎓", color: "#7A003C", url: "https://dailynews.mcmaster.ca/feed/", category: "McMaster" },
  { id: "cfl", name: "CFL News", icon: "🏈", color: "#FFB81C", url: "https://www.cfl.ca/feed/", category: "Sports" },
  { id: "reddit", name: "r/Hamilton", icon: "💬", color: "#FF4500", url: "https://www.reddit.com/r/Hamilton/.rss", category: "Community" },
  { id: "spec", name: "The Spec", icon: "📰", color: "#2D3748", url: "https://www.thespec.com/rss/", category: "Hamilton" },
  { id: "citynews", name: "CityNews Toronto", icon: "📺", color: "#0D47A1", url: "https://toronto.citynews.ca/feed/", category: "Ontario" },
];

// ── Minimal regex-based XML parser (no DOMParser in Edge Runtime) ────────────
function extractTag(block, tag) {
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const m1 = block.match(cdataRe);
  if (m1) return m1[1].trim();
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m2 = block.match(re);
  return m2 ? m2[1].trim() : "";
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

// ── Fetch single feed with tight timeout ────────────────────────────────────
async function fetchFeed(feed, timeoutMs = 3000) {
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
  const GLOBAL_DEADLINE = 8000; // Return whatever we have after 8 seconds
  const PER_FEED_TIMEOUT = 3000; // Each feed gets 3 seconds max

  // Start all fetches immediately
  const feedPromises = FEEDS.map((f) => fetchFeed(f, PER_FEED_TIMEOUT));

  // Race: wait for all feeds OR the global deadline, whichever comes first
  const deadline = new Promise((resolve) =>
    setTimeout(() => resolve("DEADLINE"), GLOBAL_DEADLINE)
  );

  // Collect results as they come in
  const results = [];
  const racingPromises = feedPromises.map(async (p, i) => {
    const result = await p;
    if (result) results.push(result);
    return result;
  });

  // Wait for either all promises to settle or the deadline
  await Promise.race([
    Promise.allSettled(racingPromises),
    deadline,
  ]);

  // Build response from whatever we have right now
  const allArticles = [];
  const liveFeeds = [];

  for (const r of results) {
    liveFeeds.push(r.feed);
    allArticles.push(...r.articles);
  }

  const sorted = dedup(allArticles).sort((a, b) => {
    const da = new Date(a.pubDate || 0).getTime();
    const db = new Date(b.pubDate || 0).getTime();
    return db - da;
  });

  const payload = {
    articles: sorted,
    feeds: liveFeeds,
    fetchedAt: new Date().toISOString(),
    totalFeeds: FEEDS.length,
    returnedFeeds: liveFeeds.length,
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      // Vercel CDN cache: serve cached for 5 min, refresh in background for 10 min
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "Vercel-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
