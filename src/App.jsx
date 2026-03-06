import { useState, useEffect, useCallback, useRef } from "react";

const FEED_META = {
  "cbc-ham": { name: "CBC Hamilton", icon: "📺", color: "#C8102E" },
  "global-ham": { name: "Global News Hamilton", icon: "📡", color: "#1565C0" },
  "bayobserver": { name: "Bay Observer", icon: "🌊", color: "#0077B6" },
  "mcmaster": { name: "McMaster Daily News", icon: "🎓", color: "#7A003C" },
  "cfl": { name: "CFL News", icon: "🏈", color: "#FFB81C" },
  "cbc-ca": { name: "CBC Canada", icon: "🇨🇦", color: "#B71C1C" },
  "cbc-on": { name: "CBC Toronto", icon: "📺", color: "#D32F2F" },
  "reddit": { name: "r/Hamilton", icon: "💬", color: "#FF4500" },
  "spec": { name: "The Spec", icon: "📰", color: "#2D3748" },
  "citynews": { name: "CityNews Toronto", icon: "📺", color: "#0D47A1" },
  "cbc-politics": { name: "CBC Politics", icon: "🏛️", color: "#4A148C" },
  "cbc-business": { name: "CBC Business", icon: "💼", color: "#1B5E20" },
  "cbc-health": { name: "CBC Health", icon: "🏥", color: "#00838F" },
  "cbc-tech": { name: "CBC Tech & Science", icon: "🔬", color: "#4527A0" },
};

function timeAgo(d) {
  if (!d) return "";
  try {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (isNaN(m) || m < 0) return "";
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const dy = Math.floor(h / 24);
    if (dy < 7) return `${dy}d ago`;
    return new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  } catch { return ""; }
}

function dedup(arr) {
  const seen = new Set();
  return arr.filter(a => {
    const k = (a.title || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 50);
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  });
}

// ── Weather ─────────────────────────────────────────────────────────────────
const WMO = {0:"☀️ Clear",1:"🌤 Mainly clear",2:"⛅ Partly cloudy",3:"☁️ Overcast",45:"🌫 Fog",48:"🌫 Rime fog",51:"🌦 Light drizzle",53:"🌦 Drizzle",55:"🌧 Heavy drizzle",61:"🌧 Light rain",63:"🌧 Rain",65:"🌧 Heavy rain",66:"🌧 Freezing rain",71:"🌨 Light snow",73:"🌨 Snow",75:"❄️ Heavy snow",80:"🌦 Showers",82:"⛈ Heavy showers",85:"🌨 Snow showers",95:"⛈ Thunderstorm"};

function Weather() {
  const [w, setW] = useState(null);
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=43.2557&longitude=-79.8711&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FToronto&forecast_days=1")
      .then(r => r.json()).then(data => {
        if (!data?.current) return;
        const c = data.current, d = data.daily;
        const dirs = ["N","NE","E","SE","S","SW","W","NW"];
        const dir = dirs[Math.round((c.wind_direction_10m || 0) / 45) % 8];
        const wmo = WMO[c.weather_code] || "🌤 Unknown";
        setW({ temp: Math.round(c.temperature_2m), cond: wmo.slice(2).trim(), icon: wmo.slice(0, 2).trim(), hum: c.relative_humidity_2m, wind: `${Math.round(c.wind_speed_10m)} km/h ${dir}`, hi: Math.round(d.temperature_2m_max[0]), lo: Math.round(d.temperature_2m_min[0]) });
      }).catch(() => {});
  }, []);

  if (!w) return <div className="hh-weather"><div className="hw-spin" style={{ width:20, height:20, border:"2px solid rgba(255,255,255,.3)", borderTop:"2px solid white", borderRadius:"50%" }} /></div>;
  return (
    <div className="hh-weather" style={{ position:"relative", overflow:"hidden" }}>
      <div className="hh-weather-bg-icon">{w.icon}</div>
      <div className="hh-weather-label">Hamilton Weather</div>
      <div className="hh-weather-main">
        <span className="hh-weather-temp">{w.temp}°</span>
        <span className="hh-weather-cond">{w.icon} {w.cond}</span>
      </div>
      <div className="hh-weather-details">
        <span>💧 {w.hum}%</span><span>💨 {w.wind}</span><span>H: {w.hi}° L: {w.lo}°</span>
      </div>
    </div>
  );
}

// ── Card with optional thumbnail ────────────────────────────────────────────
function Card({ a, big, i }) {
  const meta = FEED_META[a.feedId] || { name: a.feedId, icon: "📰", color: "#94a3b8" };
  const [imgOk, setImgOk] = useState(!!a.image);

  return (
    <a href={a.link} target="_blank" rel="noopener noreferrer"
      className={`hh-card ${big ? "hh-card--big" : ""}`}
      style={{ borderLeftColor: meta.color, animationDelay: `${i * .03}s` }}
    >
      {/* Image + text layout for featured cards with images */}
      {big && a.image && imgOk ? (
        <div className="hh-card-img-row">
          <div className="hh-card-img-text">
            <div className="hh-card-meta">
              <span className="hh-card-source" style={{ background: meta.color }}>{meta.icon} {meta.name}</span>
              {a.time && <span className="hh-card-time">{a.time}</span>}
            </div>
            <h3 className="hh-card-title">{a.title}</h3>
            {a.summary && <p className="hh-card-summary">{a.summary.slice(0, 180)}{a.summary.length > 180 ? "…" : ""}</p>}
          </div>
          <img src={a.image} alt="" className="hh-card-img" onError={() => setImgOk(false)} loading="lazy" />
        </div>
      ) : (
        <>
          <div className="hh-card-meta">
            <span className="hh-card-source" style={{ background: meta.color }}>{meta.icon} {meta.name}</span>
            {a.time && <span className="hh-card-time">{a.time}</span>}
          </div>
          {/* Small thumbnail for non-featured cards */}
          {!big && a.image && imgOk ? (
            <div className="hh-card-sm-row">
              <div className="hh-card-sm-text">
                <h3 className="hh-card-title">{a.title}</h3>
                {a.summary && <p className="hh-card-summary">{a.summary.slice(0, 100)}{a.summary.length > 100 ? "…" : ""}</p>}
              </div>
              <img src={a.image} alt="" className="hh-card-sm-img" onError={() => setImgOk(false)} loading="lazy" />
            </div>
          ) : (
            <>
              <h3 className="hh-card-title">{a.title}</h3>
              {a.summary && <p className="hh-card-summary">{a.summary.slice(0, big ? 200 : 120)}{a.summary.length > (big ? 200 : 120) ? "…" : ""}</p>}
            </>
          )}
        </>
      )}
    </a>
  );
}

function Skel({ n = 3 }) {
  return Array.from({ length: n }).map((_, i) => (
    <div key={i} className="hh-skel" style={{ animationDelay: `${i * .2}s` }}>
      <div className="hh-skel-bar" style={{ width: "30%" }} />
      <div className="hh-skel-bar" style={{ width: "82%" }} />
      <div className="hh-skel-bar" style={{ width: "55%" }} />
    </div>
  ));
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function HamiltonHerald() {
  const [articles, setArticles] = useState([]);
  const [liveFeeds, setLiveFeeds] = useState([]);
  const [filter, setFilter] = useState("all");
  const [updated, setUpdated] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading | wave2 | done | error
  const [showSrc, setShowSrc] = useState(false);
  const staleRef = useRef({ articles: [], feeds: [] });

  const fetchBatch = useCallback(async (batch) => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(`/api/feeds?batch=${batch}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  }, []);

  const load = useCallback(async () => {
    // Show stale data immediately if we have it
    if (staleRef.current.articles.length > 0) {
      setPhase("wave2");
    } else {
      setPhase("loading");
    }

    // Wave 1: fast CBC feeds
    const d1 = await fetchBatch(1);
    if (d1 && d1.articles.length > 0) {
      const withTime = d1.articles.map(a => ({ ...a, time: timeAgo(a.pubDate) }));
      setArticles(withTime);
      setLiveFeeds(d1.feeds);
      setUpdated(new Date(d1.fetchedAt));
      staleRef.current = { articles: withTime, feeds: d1.feeds };
    }
    setPhase("wave2");

    // Wave 2: slower feeds (fires immediately, doesn't block wave 1 render)
    const d2 = await fetchBatch(2);
    if (d2 && d2.articles.length > 0) {
      const wave2Articles = d2.articles.map(a => ({ ...a, time: timeAgo(a.pubDate) }));
      setArticles(prev => {
        const merged = dedup([...prev, ...wave2Articles])
          .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
        staleRef.current.articles = merged;
        return merged;
      });
      setLiveFeeds(prev => {
        const merged = [...prev, ...d2.feeds];
        staleRef.current.feeds = merged;
        return merged;
      });
      setUpdated(new Date(d2.fetchedAt));
    }
    setPhase("done");
  }, [fetchBatch]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const iv = setInterval(() => load(), 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [load]);

  const liveCats = ["all", ...Array.from(new Set(liveFeeds.map(f => f.category)))];
  const filtered = filter === "all" ? articles : articles.filter(a => a.category === filter);
  const feat = filtered.slice(0, 3);
  const rest = filtered.slice(3);
  const ticker = articles.slice(0, 25);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,500;9..144,700;9..144,900&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--hh-max:1280px;--hh-red:#C8102E;--hh-bg:#f0f1f5;--hh-dark:#0c1220;--hh-card-bg:#fff;--hh-text:#0f172a;--hh-muted:#94a3b8;--hh-border:#e2e8f0;--hh-sans:'DM Sans',system-ui,-apple-system,sans-serif;--hh-serif:'Fraunces',Georgia,serif;--hh-px:14px}
        @keyframes hw-fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes hw-pulse{0%,100%{opacity:1}50%{opacity:.5}}
        @keyframes hw-spin{to{transform:rotate(360deg)}}
        @keyframes hw-ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .hw-spin{animation:hw-spin .8s linear infinite}
        .hh-root{min-height:100vh;background:var(--hh-bg);font-family:var(--hh-sans);color:var(--hh-text);-webkit-font-smoothing:antialiased}

        .hh-masthead{background:linear-gradient(180deg,#0c1220,#162032);color:white;position:relative;overflow:hidden}
        .hh-masthead-pattern{position:absolute;inset:0;opacity:.03;background-image:repeating-linear-gradient(45deg,transparent,transparent 30px,white 30px,white 31px);pointer-events:none}
        .hh-topbar{display:flex;justify-content:space-between;align-items:center;padding:8px var(--hh-px);border-bottom:1px solid rgba(255,255,255,.08);font-size:11px;color:var(--hh-muted);position:relative;flex-wrap:wrap;gap:4px;max-width:var(--hh-max);margin:0 auto}
        .hh-topbar-left{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
        .hh-topbar-right{display:flex;align-items:center;gap:8px;font-size:11px}
        .hh-title-wrap{text-align:center;padding:18px var(--hh-px) 14px;position:relative}
        .hh-title-sub{font-size:10px;text-transform:uppercase;letter-spacing:4px;color:#64748b;margin-bottom:3px}
        .hh-title{font-family:var(--hh-serif);font-size:clamp(26px,8vw,48px);font-weight:900;letter-spacing:-1px;line-height:1;background:linear-gradient(135deg,#fff,#cbd5e1);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .hh-title-desc{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#475569;margin-top:4px}
        .hh-title-line{width:50px;height:2px;background:linear-gradient(90deg,transparent,var(--hh-red),transparent);margin:10px auto 0}

        .hh-ticker{overflow:hidden;white-space:nowrap;background:var(--hh-dark);padding:6px 0}
        .hh-ticker-inner{display:inline-block;animation:hw-ticker 90s linear infinite}
        .hh-ticker-dot{color:var(--hh-red);font-weight:700;margin:0 6px}
        .hh-ticker-text{color:#e2e8f0;margin-right:24px;font-size:11px}

        .hh-nav{background:white;border-bottom:1px solid var(--hh-border);position:sticky;top:0;z-index:100;box-shadow:0 1px 3px rgba(0,0,0,.04)}
        .hh-nav-inner{max-width:var(--hh-max);margin:0 auto;padding:0 var(--hh-px);display:flex;align-items:center;gap:4px}
        .hh-tabs{display:flex;gap:2px;flex:1;padding:5px 0;overflow-x:auto;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
        .hh-tabs::-webkit-scrollbar{height:2px}
        .hh-tabs::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}
        .hh-tab{padding:8px 10px;border:none;cursor:pointer;font-size:11px;font-weight:500;color:#64748b;background:transparent;border-radius:8px;white-space:nowrap;font-family:var(--hh-sans);transition:all .2s;min-height:38px;display:flex;align-items:center;gap:3px;-webkit-tap-highlight-color:transparent}
        .hh-tab--active{font-weight:700}
        .hh-nav-actions{display:flex;gap:5px;border-left:1px solid var(--hh-border);padding-left:6px;flex-shrink:0}
        .hh-btn{padding:6px 10px;border:1px solid var(--hh-border);background:white;cursor:pointer;border-radius:8px;font-size:11px;color:#475569;font-weight:500;font-family:var(--hh-sans);min-height:36px;white-space:nowrap;-webkit-tap-highlight-color:transparent}
        .hh-btn--primary{border:none;background:var(--hh-red);color:white;font-weight:600}
        .hh-btn--primary:disabled{background:#94a3b8;cursor:wait}

        .hh-main{max-width:var(--hh-max);margin:0 auto;padding:16px var(--hh-px)}
        .hh-grid{display:flex;flex-direction:column;gap:16px}
        .hh-featured{display:flex;flex-direction:column;gap:10px;margin-bottom:14px}
        .hh-divider{display:flex;align-items:center;gap:10px;margin:4px 0 12px}
        .hh-divider-line{flex:1;height:1px;background:var(--hh-border)}
        .hh-divider-text{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--hh-muted);font-weight:600;white-space:nowrap}
        .hh-article-grid{display:grid;grid-template-columns:1fr;gap:8px}

        .hh-weather{padding:16px;background:linear-gradient(135deg,#1B4965 0%,#274c77 50%,#2D6A4F 100%);border-radius:12px;color:white;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:80px}
        .hh-weather-bg-icon{position:absolute;top:-20px;right:-15px;font-size:70px;opacity:.12;pointer-events:none}
        .hh-weather-label{font-size:10px;text-transform:uppercase;letter-spacing:2px;opacity:.8;margin-bottom:4px;width:100%}
        .hh-weather-main{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;width:100%}
        .hh-weather-temp{font-size:34px;font-weight:700;font-family:var(--hh-serif);line-height:1}
        .hh-weather-cond{font-size:13px;opacity:.85}
        .hh-weather-details{display:flex;gap:10px;margin-top:8px;font-size:11px;opacity:.75;flex-wrap:wrap;width:100%}

        /* Cards */
        .hh-card{display:block;text-decoration:none;color:inherit;padding:12px 14px;background:var(--hh-card-bg);border-radius:10px;border-left:3px solid #94a3b8;box-shadow:0 1px 3px rgba(0,0,0,.05);transition:transform .2s ease,box-shadow .2s ease;animation:hw-fadeIn .4s ease both;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .hh-card:active{transform:scale(.985)}
        .hh-card--big{padding:16px 18px;border-left-width:4px;border-radius:14px}
        .hh-card-meta{display:flex;align-items:center;gap:6px;margin-bottom:5px;flex-wrap:wrap}
        .hh-card-source{color:white;font-size:9px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:.7px;white-space:nowrap}
        .hh-card-time{font-size:10px;color:#b0b8c4;margin-left:auto;white-space:nowrap}
        .hh-card-title{font-size:14px;font-weight:600;line-height:1.35;margin:0;color:var(--hh-text);font-family:var(--hh-serif)}
        .hh-card--big .hh-card-meta{margin-bottom:7px}
        .hh-card--big .hh-card-title{font-size:16px;font-weight:700}
        .hh-card-summary{font-size:12px;color:#64748b;line-height:1.55;margin:4px 0 0}
        .hh-card--big .hh-card-summary{font-size:12.5px;margin-top:5px}

        /* Featured card image layout */
        .hh-card-img-row{display:flex;gap:14px;align-items:flex-start}
        .hh-card-img-text{flex:1;min-width:0}
        .hh-card-img{width:140px;height:95px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#f1f5f9}

        /* Small card thumbnail */
        .hh-card-sm-row{display:flex;gap:10px;align-items:flex-start}
        .hh-card-sm-text{flex:1;min-width:0}
        .hh-card-sm-img{width:80px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0;background:#f1f5f9}

        /* Wave 2 loading indicator */
        .hh-wave2-bar{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:hw-shimmer 1.5s ease infinite;padding:8px 16px;border-radius:10px;text-align:center;font-size:12px;color:var(--hh-muted);margin-bottom:12px}
        @keyframes hw-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

        .hh-sidebar{display:flex;flex-direction:column;gap:12px}
        .hh-sidebar-panel{padding:14px;background:white;border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
        .hh-sidebar-label{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--hh-muted);font-weight:600;margin-bottom:8px}
        .hh-feed-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #f8fafc}
        .hh-feed-name{font-size:12px;color:#475569;display:flex;align-items:center;gap:4px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:155px}
        .hh-feed-count{font-size:11px;font-weight:600;color:#22c55e}
        .hh-stats{text-align:center;animation:hw-fadeIn .4s ease}
        .hh-stats-number{font-size:24px;font-weight:700;color:var(--hh-text);font-family:var(--hh-serif)}
        .hh-stats-label{font-size:12px;color:var(--hh-muted)}
        .hh-stats-time{font-size:11px;color:#b0b8c4;margin-top:3px}

        .hh-skel{padding:16px;background:white;border-radius:10px;border-left:3px solid var(--hh-border);animation:hw-pulse 1.5s ease infinite}
        .hh-skel-bar{height:12px;background:#f1f5f9;border-radius:6px;margin-bottom:8px}
        .hh-skel-bar:nth-child(2){height:16px}
        .hh-skel-bar:last-child{margin-bottom:0}

        .hh-sources{margin-bottom:16px;padding:16px;background:white;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,.06);animation:hw-fadeIn .3s ease}
        .hh-sources-title{font-family:var(--hh-serif);font-size:16px;font-weight:700;margin-bottom:10px;color:var(--hh-text)}
        .hh-sources-grid{display:grid;grid-template-columns:1fr;gap:6px}
        .hh-source-item{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8fafc;border-radius:8px;border:1px solid #f1f5f9}
        .hh-source-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0}
        .hh-source-name{font-size:12px;font-weight:600;color:#1e293b}
        .hh-source-detail{font-size:11px;color:var(--hh-muted)}
        .hh-sources-note{margin-top:10px;font-size:10px;color:var(--hh-muted);line-height:1.6}

        .hh-footer{background:var(--hh-dark);color:#64748b;padding:22px var(--hh-px);margin-top:28px;text-align:center}
        .hh-footer-title{font-family:var(--hh-serif);font-size:16px;font-weight:700;color:#cbd5e1;margin-bottom:5px}
        .hh-footer-text{font-size:11px;max-width:500px;margin:0 auto;line-height:1.6}
        .hh-footer-sources{font-size:10px;margin-top:6px;color:#475569;line-height:1.5}

        .hh-empty{grid-column:1/-1;text-align:center;padding:36px 16px;color:var(--hh-muted)}
        .hh-empty-icon{font-size:32px;margin-bottom:8px}
        .hh-empty-link{color:#3b82f6;cursor:pointer;text-decoration:underline;-webkit-tap-highlight-color:transparent}

        .hh-topbar-date-short{display:inline}
        .hh-topbar-date-full{display:none}

        @media(min-width:640px){
          :root{--hh-px:20px}
          .hh-topbar{font-size:12px;padding:10px var(--hh-px)}
          .hh-topbar-date-short{display:none}
          .hh-topbar-date-full{display:inline}
          .hh-title-wrap{padding:22px var(--hh-px) 18px}
          .hh-title-sub{font-size:11px;letter-spacing:5px}
          .hh-title-desc{font-size:11px;letter-spacing:3px}
          .hh-ticker-text{font-size:12px;margin-right:28px}
          .hh-tab{font-size:12px;padding:8px 12px}
          .hh-article-grid{grid-template-columns:repeat(2,1fr);gap:10px}
          .hh-sources-grid{grid-template-columns:repeat(2,1fr)}
          .hh-card{padding:14px 18px}
          .hh-card--big{padding:20px 22px}
          .hh-card--big .hh-card-title{font-size:19px}
          .hh-card-title{font-size:15px}
          .hh-card-source{font-size:10px;padding:2px 9px}
          .hh-card-summary{font-size:12.5px}
          .hh-card--big .hh-card-summary{font-size:13.5px}
          .hh-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.09)}
          .hh-weather-temp{font-size:40px}
          .hh-stats-number{font-size:28px}
          .hh-card-img{width:180px;height:110px}
          .hh-card-sm-img{width:90px;height:65px}
        }

        @media(min-width:960px){
          :root{--hh-px:24px}
          .hh-grid{flex-direction:row;gap:20px}
          .hh-sidebar{width:270px;flex-shrink:0;position:sticky;top:60px;align-self:flex-start;max-height:calc(100vh - 80px);overflow-y:auto}
          .hh-sidebar::-webkit-scrollbar{width:4px}
          .hh-sidebar::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:10px}
          .hh-articles-col{flex:1;min-width:0}
          .hh-article-grid{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
          .hh-sources-grid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
          .hh-tab{padding:8px 14px}
          .hh-card--big{padding:24px 26px}
          .hh-card--big .hh-card-title{font-size:20px}
          .hh-weather-temp{font-size:42px}
          .hh-title-line{width:60px}
          .hh-card-img{width:200px;height:120px}
        }
        @media(min-width:1200px){.hh-sidebar{width:280px}}
      `}</style>

      <div className="hh-root">
        <header className="hh-masthead">
          <div className="hh-masthead-pattern" />
          <div className="hh-topbar">
            <div className="hh-topbar-left">
              <span>📍 Hamilton, ON</span>
              <span style={{ opacity:.35 }}>|</span>
              <span className="hh-topbar-date-full">{new Date().toLocaleDateString("en-CA",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</span>
              <span className="hh-topbar-date-short">{new Date().toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"})}</span>
            </div>
            <div className="hh-topbar-right">
              {phase === "loading" && <span style={{ display:"flex",alignItems:"center",gap:4 }}><div className="hw-spin" style={{ width:10,height:10,border:"1.5px solid rgba(255,255,255,.2)",borderTop:"1.5px solid #60a5fa",borderRadius:"50%" }} /><span style={{ color:"#60a5fa" }}>Loading…</span></span>}
              {phase === "wave2" && <span style={{ display:"flex",alignItems:"center",gap:4 }}><div className="hw-spin" style={{ width:10,height:10,border:"1.5px solid rgba(255,255,255,.2)",borderTop:"1.5px solid #fbbf24",borderRadius:"50%" }} /><span style={{ color:"#fbbf24" }}>Loading more…</span></span>}
              {phase === "done" && <span style={{ color:"#4ade80" }}>{liveFeeds.length} sources • {articles.length} stories</span>}
            </div>
          </div>
          <div className="hh-title-wrap">
            <div className="hh-title-sub">The</div>
            <h1 className="hh-title">HAMILTON HERALD</h1>
            <div className="hh-title-desc">Live News Aggregator • The Ambitious City</div>
            <div className="hh-title-line" />
          </div>
        </header>

        {ticker.length > 0 && <div className="hh-ticker"><div className="hh-ticker-inner">
          {[...ticker,...ticker].map((a,i) => <span key={i}><span className="hh-ticker-dot">●</span><span className="hh-ticker-text">{a.title}</span></span>)}
        </div></div>}

        <nav className="hh-nav"><div className="hh-nav-inner">
          <div className="hh-tabs">
            {liveCats.map(c => {
              const active = filter === c;
              const mf = liveFeeds.find(f => f.category === c);
              const meta = mf ? FEED_META[mf.id] || {} : {};
              return <button key={c} onClick={() => setFilter(c)} className={`hh-tab ${active?"hh-tab--active":""}`}
                style={active ? { color:meta.color||mf?.color||"#0f172a",background:`${meta.color||mf?.color||"#0f172a"}11`} : {}}
              >{c==="all"?`All (${articles.length})`:`${mf?.icon||"📰"} ${c}`}</button>;
            })}
          </div>
          <div className="hh-nav-actions">
            <button onClick={() => setShowSrc(!showSrc)} className="hh-btn" style={showSrc?{background:"#f1f5f9"}:{}}>{liveFeeds.length>0?`📡 ${liveFeeds.length}`:"📡"}</button>
            <button onClick={load} disabled={phase==="loading"} className="hh-btn hh-btn--primary">⟳</button>
          </div>
        </div></nav>

        <main className="hh-main">
          {showSrc && <div className="hh-sources">
            <h3 className="hh-sources-title">📡 Live Sources ({liveFeeds.length})</h3>
            {liveFeeds.length>0 ? <div className="hh-sources-grid">{liveFeeds.map(f => <div key={f.id} className="hh-source-item"><div className="hh-source-dot" /><div style={{flex:1,minWidth:0}}><div className="hh-source-name">{f.icon} {f.name}</div><div className="hh-source-detail">{f.category} • {f.count} stories</div></div></div>)}</div> : null}
            {phase === "wave2" && <div style={{color:"#fbbf24",fontSize:12,marginTop:8,display:"flex",alignItems:"center",gap:6}}>
              <div className="hw-spin" style={{width:10,height:10,border:"1.5px solid #fde68a",borderTop:"1.5px solid #f59e0b",borderRadius:"50%"}} />
              Loading additional sources…
            </div>}
            <div className="hh-sources-note">ℹ️ Fast feeds load first, then additional sources stream in. Weather: Open-Meteo.</div>
          </div>}

          <div className="hh-grid">
            <div className="hh-sidebar">
              <Weather />
              <div className="hh-sidebar-panel">
                <div className="hh-sidebar-label">{phase==="loading"?"Connecting…":phase==="wave2"?`${liveFeeds.length} feeds (loading more…)`:`${liveFeeds.length} Live Feeds`}</div>
                {phase==="loading" ? <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {[1,2,3,4,5].map(i => <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}>
                    <div className="hw-spin" style={{width:10,height:10,border:"1.5px solid #e2e8f0",borderTop:"1.5px solid #60a5fa",borderRadius:"50%",flexShrink:0}} />
                    <div style={{height:12,background:"#f1f5f9",borderRadius:4,flex:1,animation:`hw-pulse 1.5s ease ${i*.15}s infinite`}} />
                  </div>)}
                </div> : liveFeeds.map(f => <div key={f.id} className="hh-feed-row">
                  <span className="hh-feed-name">{f.icon} {f.name}</span>
                  <span className="hh-feed-count">{f.count}</span>
                </div>)}
                {phase === "wave2" && <div style={{padding:"6px 0",display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#f59e0b",borderTop:"1px solid #f8fafc",marginTop:2}}>
                  <div className="hw-spin" style={{width:9,height:9,border:"1.5px solid #fde68a",borderTop:"1.5px solid #f59e0b",borderRadius:"50%"}} />
                  More sources loading…
                </div>}
              </div>
              {articles.length > 0 && <div className="hh-sidebar-panel hh-stats">
                <div className="hh-stats-number">{articles.length}</div>
                <div className="hh-stats-label">articles from {liveFeeds.length} sources</div>
                {updated && <div className="hh-stats-time">Updated {updated.toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit"})}</div>}
              </div>}
            </div>

            <div className="hh-articles-col">
              {/* Wave 2 shimmer bar */}
              {phase === "wave2" && articles.length > 0 && (
                <div className="hh-wave2-bar">Loading additional sources — Bay Observer, Global News, Reddit, McMaster…</div>
              )}

              <div className="hh-featured">
                {feat.length>0 ? feat.map((a,i) => <Card key={`f${i}-${a.feedId}`} a={a} big i={i} />) : <Skel n={3} />}
              </div>
              {filtered.length > 3 && <div className="hh-divider"><div className="hh-divider-line" /><span className="hh-divider-text">{filter==="all"?"More Stories":filter}</span><div className="hh-divider-line" /></div>}
              <div className="hh-article-grid">
                {rest.length>0 ? rest.map((a,i) => <Card key={`r${i}-${a.feedId}`} a={a} i={i} />) :
                  phase==="loading" ? <Skel n={6} /> :
                  filtered.length<=3 ? null : <div className="hh-empty"><div className="hh-empty-icon">📰</div><div>No more articles. <span className="hh-empty-link" onClick={load}>Refresh</span></div></div>}
              </div>
            </div>
          </div>
        </main>

        <footer className="hh-footer">
          <div className="hh-footer-title">Hamilton Herald</div>
          <div className="hh-footer-text">Live news from {liveFeeds.length>0?liveFeeds.length:"multiple"} sources via server-side RSS. Weather by Open-Meteo. Zero API keys.</div>
          {liveFeeds.length>0 && <div className="hh-footer-sources">{liveFeeds.map(f=>f.name).join(" • ")}</div>}
        </footer>
      </div>
    </>
  );
}
