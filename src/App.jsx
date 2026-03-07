import { useState, useEffect, useCallback, useRef } from "react";

const FEED_META = {
  "cbc-ham":{name:"CBC Hamilton",color:"#E53935"},"global-ham":{name:"Global News",color:"#42A5F5"},
  "bayobserver":{name:"Bay Observer",color:"#26C6DA"},"mcmaster":{name:"McMaster",color:"#AB47BC"},
  "cfl":{name:"CFL",color:"#FFB300"},"cbc-ca":{name:"CBC Canada",color:"#EF5350"},
  "cbc-on":{name:"CBC Toronto",color:"#EF5350"},"reddit":{name:"r/Hamilton",color:"#FF7043"},
  "spec":{name:"The Spec",color:"#78909C"},"citynews":{name:"CityNews",color:"#42A5F5"},
  "cbc-politics":{name:"Politics",color:"#7E57C2"},"cbc-business":{name:"Business",color:"#66BB6A"},
  "cbc-health":{name:"Health",color:"#26C6DA"},"cbc-tech":{name:"Tech",color:"#5C6BC0"},
};

function timeAgo(d){if(!d)return"";try{const m=Math.floor((Date.now()-new Date(d).getTime())/6e4);if(isNaN(m)||m<0)return"";if(m<1)return"now";if(m<60)return`${m}m`;const h=Math.floor(m/60);if(h<24)return`${h}h`;const dy=Math.floor(h/24);if(dy<7)return`${dy}d`;return new Date(d).toLocaleDateString("en-CA",{month:"short",day:"numeric"})}catch{return""}}
function dedup(a){const s=new Set();return a.filter(x=>{const k=`${x.feedId}-${(x.title||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,50)}`;if(!k||s.has(k))return false;s.add(k);return true})}

// ── Hamilton Now — City Conditions Dashboard ────────────────────────────────
const WMO={0:"☀️",1:"🌤",2:"⛅",3:"☁️",45:"🌫",48:"🌫",51:"🌦",53:"🌦",55:"🌧",56:"🌧",61:"🌧",63:"🌧",65:"🌧",66:"🌧",71:"🌨",73:"🌨",75:"❄️",77:"❄️",80:"🌦",81:"🌧",82:"⛈",85:"🌨",95:"⛈",96:"⛈"};
const WMO_LABEL={0:"Clear",1:"Clear",2:"Partly Cloudy",3:"Overcast",45:"Fog",48:"Fog",51:"Drizzle",53:"Drizzle",55:"Heavy Drizzle",56:"Freezing Drizzle",61:"Light Rain",63:"Rain",65:"Heavy Rain",66:"Freezing Rain",71:"Light Snow",73:"Snow",75:"Heavy Snow",77:"Snow Grains",80:"Showers",81:"Showers",82:"Heavy Showers",85:"Snow Showers",95:"Thunderstorm",96:"Thunderstorm"};
const UV_LEVELS=[{max:2,label:"Low",color:"#66BB6A"},{max:5,label:"Moderate",color:"#FFB300"},{max:7,label:"High",color:"#FF7043"},{max:10,label:"Very High",color:"#E53935"},{max:99,label:"Extreme",color:"#AB47BC"}];
const AQI_LEVELS=[{max:20,label:"Excellent",color:"#66BB6A"},{max:40,label:"Good",color:"#9CCC65"},{max:60,label:"Moderate",color:"#FFB300"},{max:80,label:"Poor",color:"#FF7043"},{max:100,label:"Very Poor",color:"#E53935"},{max:999,label:"Hazardous",color:"#AB47BC"}];

function getLevel(val, levels) { return levels.find(l => val <= l.max) || levels[levels.length - 1]; }

function HamiltonNow() {
  const [data, setData] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Main weather: current + hourly (next 12h) + daily (sunrise/sunset/uv)
    fetch("https://api.open-meteo.com/v1/forecast?latitude=43.2557&longitude=-79.8711&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=America%2FToronto&forecast_days=2")
      .then(r => r.json()).then(d => {
        if (!d?.current) return;
        const c = d.current, dy = d.daily, hr = d.hourly;
        const dirs = ["N","NE","E","SE","S","SW","W","NW"];
        const dir = dirs[Math.round((c.wind_direction_10m || 0) / 45) % 8];
        const nowHour = new Date().getHours();

        // Build next 10 hours from hourly data
        const nowIdx = hr.time.findIndex(t => new Date(t).getHours() === nowHour && new Date(t).getDate() === new Date().getDate());
        const startIdx = nowIdx >= 0 ? nowIdx : 0;
        const hourly = [];
        for (let i = startIdx; i < Math.min(startIdx + 10, hr.time.length); i++) {
          const h = new Date(hr.time[i]).getHours();
          hourly.push({
            hour: h === nowHour ? "Now" : `${h % 12 || 12}${h < 12 ? "a" : "p"}`,
            temp: Math.round(hr.temperature_2m[i]),
            icon: WMO[hr.weather_code[i]] || "🌤",
            precip: hr.precipitation_probability[i] || 0,
          });
        }

        const sunriseTime = dy.sunrise?.[0] ? new Date(dy.sunrise[0]).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" }) : "--";
        const sunsetTime = dy.sunset?.[0] ? new Date(dy.sunset[0]).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" }) : "--";

        setData({
          temp: Math.round(c.temperature_2m),
          feels: Math.round(c.apparent_temperature),
          icon: WMO[c.weather_code] || "🌤",
          cond: WMO_LABEL[c.weather_code] || "Unknown",
          hum: c.relative_humidity_2m,
          wind: `${Math.round(c.wind_speed_10m)} ${dir}`,
          gusts: Math.round(c.wind_gusts_10m),
          hi: Math.round(dy.temperature_2m_max[0]),
          lo: Math.round(dy.temperature_2m_min[0]),
          uv: Math.round(dy.uv_index_max[0]),
          sunrise: sunriseTime,
          sunset: sunsetTime,
          precipMax: dy.precipitation_probability_max?.[0] || 0,
          hourly,
        });
      }).catch(() => {});

    // Air quality — separate Open-Meteo endpoint (also free, no key)
    fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=43.2557&longitude=-79.8711&current=european_aqi,pm2_5,pm10&timezone=America%2FToronto")
      .then(r => r.json()).then(d => {
        if (!d?.current) return;
        setAqi({ index: d.current.european_aqi, pm25: d.current.pm2_5, pm10: d.current.pm10 });
      }).catch(() => {});
  }, []);

  if (!data) return <div className="hn-dash" style={{padding:20,display:"flex",justifyContent:"center",alignItems:"center",minHeight:70}}><div className="hm-spin" style={{ width: 16, height: 16 }} /></div>;

  const uvLevel = getLevel(data.uv, UV_LEVELS);
  const aqiLevel = aqi ? getLevel(aqi.index, AQI_LEVELS) : null;

  return (
    <div className="hn-dash">
      {/* Header row */}
      <div className="hn-header">
        <div className="hn-temp-block">
          <span className="hn-temp">{data.temp}°</span>
          <span className="hn-icon">{data.icon}</span>
        </div>
        <div className="hn-cond-block">
          <div className="hn-cond">{data.cond}</div>
          <div className="hn-feels">Feels {data.feels}° · ↑{data.hi}° ↓{data.lo}°</div>
        </div>
      </div>

      {/* Compact stats row — always visible */}
      <div className="hn-stats">
        <div className="hn-stat">
          <div className="hn-stat-val">💧{data.hum}%</div>
          <div className="hn-stat-lbl">Humidity</div>
        </div>
        <div className="hn-stat">
          <div className="hn-stat-val">💨{data.wind}</div>
          <div className="hn-stat-lbl">Wind</div>
        </div>
        <div className="hn-stat">
          <div className="hn-stat-val" style={{ color: uvLevel.color }}>{data.uv}</div>
          <div className="hn-stat-lbl">UV {uvLevel.label}</div>
        </div>
        {aqi && (
          <div className="hn-stat">
            <div className="hn-stat-val" style={{ color: aqiLevel.color }}>{aqi.index}</div>
            <div className="hn-stat-lbl">AQI {aqiLevel.label}</div>
          </div>
        )}
      </div>

      {/* Expand toggle */}
      <button className="hn-expand" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Collapse forecast" : "Expand forecast"}>
        {expanded ? "Hide forecast ▴" : "Hourly forecast ▾"}
      </button>

      {/* Expanded section */}
      {expanded && (
        <div className="hn-expanded">
          {/* Hourly forecast */}
          <div className="hn-hourly-scroll">
            {data.hourly.map((h, i) => (
              <div key={i} className="hn-hour">
                <div className="hn-hour-time">{h.hour}</div>
                <div className="hn-hour-icon">{h.icon}</div>
                <div className="hn-hour-temp">{h.temp}°</div>
                {h.precip > 0 && <div className="hn-hour-precip">💧{h.precip}%</div>}
              </div>
            ))}
          </div>

          {/* Precipitation bar */}
          {data.precipMax > 0 && (
            <div className="hn-precip-row">
              <span className="hn-precip-label">Precip. chance today</span>
              <div className="hn-precip-bar-bg">
                <div className="hn-precip-bar-fill" style={{ width: `${data.precipMax}%` }} />
              </div>
              <span className="hn-precip-pct">{data.precipMax}%</span>
            </div>
          )}

          {/* Sun + AQI details */}
          <div className="hn-detail-grid">
            <div className="hn-detail">
              <div className="hn-detail-icon">🌅</div>
              <div><div className="hn-detail-val">{data.sunrise}</div><div className="hn-detail-lbl">Sunrise</div></div>
            </div>
            <div className="hn-detail">
              <div className="hn-detail-icon">🌇</div>
              <div><div className="hn-detail-val">{data.sunset}</div><div className="hn-detail-lbl">Sunset</div></div>
            </div>
            <div className="hn-detail">
              <div className="hn-detail-icon">💨</div>
              <div><div className="hn-detail-val">{data.gusts} km/h</div><div className="hn-detail-lbl">Gusts</div></div>
            </div>
            {aqi && (
              <div className="hn-detail">
                <div className="hn-detail-icon">🫁</div>
                <div><div className="hn-detail-val">PM2.5: {aqi.pm25}</div><div className="hn-detail-lbl">PM10: {aqi.pm10}</div></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────
function Card({a,big,i}){
  const meta=FEED_META[a.feedId]||{name:a.feedId,color:"#78909C"};
  const[imgOk,setImgOk]=useState(true);
  const hasImg=a.image&&imgOk;
  return(
    <a href={a.link}target="_blank"rel="noopener noreferrer"
      className={`hm-card${big?" hm-card--feat":""}`}
      style={{"--accent":meta.color,animationDelay:`${i*.03}s`}}
      aria-label={`${a.title} — ${meta.name}`}>
      {big?(
        <div className="hm-card-hero">
          <div className="hm-card-hero-text">
            <div className="hm-card-meta">
              <span className="hm-card-src">{meta.name}</span>
              {a.time&&<span className="hm-card-time">{a.time}</span>}
            </div>
            <h3 className="hm-card-title">{a.title}</h3>
            {a.summary&&<p className="hm-card-sum">{a.summary.slice(0,180)}{a.summary.length>180?"…":""}</p>}
          </div>
          {a.image?(
            hasImg?<img src={a.image}alt={a.title}className="hm-card-hero-img"onError={()=>setImgOk(false)}loading="lazy"/>
            :<div className="hm-card-hero-img hm-card-img-fallback"><span className="hm-card-img-fallback-text">{meta.name}</span></div>
          ):null}
        </div>
      ):(
        <>
          <div className="hm-card-meta">
            <span className="hm-card-src">{meta.name}</span>
            {a.time&&<span className="hm-card-time">{a.time}</span>}
          </div>
          {a.image?(
            <div className="hm-card-thumb-row">
              <div className="hm-card-thumb-text">
                <h3 className="hm-card-title">{a.title}</h3>
                {a.summary&&<p className="hm-card-sum">{a.summary.slice(0,90)}{a.summary.length>90?"…":""}</p>}
              </div>
              {hasImg?<img src={a.image}alt={a.title}className="hm-card-thumb"onError={()=>setImgOk(false)}loading="lazy"/>
              :<div className="hm-card-thumb hm-card-img-fallback"/>}
            </div>
          ):(
            <>
              <h3 className="hm-card-title">{a.title}</h3>
              {a.summary&&<p className="hm-card-sum">{a.summary.slice(0,110)}{a.summary.length>110?"…":""}</p>}
            </>
          )}
        </>
      )}
    </a>
  );
}

// ── Donate Modal ────────────────────────────────────────────────────────────
const BTC_ADDRESS = "3NNuaniGXL2s3dES8RkEMSUrQKrJuNLaA6";

function DonateModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(BTC_ADDRESS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = BTC_ADDRESS;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="hm-modal-overlay" onClick={onClose}>
      <div className="hm-modal" onClick={e => e.stopPropagation()}>
        <button className="hm-modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="hm-modal-icon">☕</div>
        <h2 className="hm-modal-title">Support THE HAMMER</h2>
        <p className="hm-modal-desc">If you find this useful, consider sending a tip via Bitcoin.</p>

        <div className="hm-modal-qr">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&bgcolor=12121a&color=e8e6e3&data=bitcoin:${BTC_ADDRESS}`}
            alt="Bitcoin QR Code"
            width={180} height={180}
            style={{ borderRadius: 8 }}
          />
        </div>

        <div className="hm-modal-addr-wrap">
          <div className="hm-modal-addr-label">BTC Address</div>
          <div className="hm-modal-addr-row">
            <code className="hm-modal-addr">{BTC_ADDRESS}</code>
            <button className="hm-modal-copy" onClick={copy} aria-label="Copy address">
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        <p className="hm-modal-footer-text">Scan the QR code or tap Copy to grab the address.</p>
      </div>
    </div>
  );
}

// ── Hamilton X Feed — Curated Twitter/X Embed + Fallback ────────────────────
/*
 * CURATED HAMILTON X ACCOUNTS — Segmented for List Creation
 *
 * === Official City/Gov ===
 * @cityofhamilton    — City of Hamilton (official)
 * @HamiltonLRT       — Hamilton LRT Project
 * @Hamilton_CA        — Hamilton Conservation Authority
 * @hamiltonecdev     — Hamilton Economic Development
 *
 * === Transit / Traffic / Emergency ===
 * @HamiltonPolice    — Hamilton Police Service
 * @HamiltonFireDep   — Hamilton Fire Department
 * @HPS_Paramedics    — Hamilton Paramedic Services
 * @hsrHSRNow         — HSR Real-Time Transit
 *
 * === Local Media / Journalists ===
 * @CBCHamilton       — CBC Hamilton (digital news)
 * @CHCHNews          — CHCH TV (Hamilton-based TV station)
 * @TheSpec           — The Hamilton Spectator
 * @BayObserver       — Bay Observer (independent)
 *
 * TO CREATE AN X LIST:
 * 1. Go to x.com → Lists → Create New List → "Hamilton News"
 * 2. Add the accounts above
 * 3. Get the list URL (e.g. https://x.com/i/lists/123456789)
 * 4. Replace EMBED_URL below with your list URL
 * 5. The widget will embed that list's timeline
 */
const EMBED_URL = "https://x.com/CBCHamilton"; // Replace with your X List URL
const HAMILTON_ACCOUNTS = [
  { handle: "CBCHamilton", label: "CBC Hamilton", cat: "Media" },
  { handle: "CHCHNews", label: "CHCH News", cat: "Media" },
  { handle: "TheSpec", label: "The Spec", cat: "Media" },
  { handle: "BayObserver", label: "Bay Observer", cat: "Media" },
  { handle: "cityofhamilton", label: "City of Hamilton", cat: "Official" },
  { handle: "HamiltonPolice", label: "Hamilton Police", cat: "Emergency" },
  { handle: "HamiltonFireDep", label: "Hamilton Fire", cat: "Emergency" },
  { handle: "HPS_Paramedics", label: "Paramedics", cat: "Emergency" },
  { handle: "HamiltonLRT", label: "Hamilton LRT", cat: "Transit" },
  { handle: "hsrHSRNow", label: "HSR Transit", cat: "Transit" },
];

function HamiltonX() {
  const containerRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Load Twitter widget.js asynchronously
    const timeout = setTimeout(() => { if (!loaded) setFailed(true); }, 8000);

    if (window.twttr && window.twttr.widgets) {
      renderWidget();
      return () => clearTimeout(timeout);
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.onload = () => renderWidget();
    script.onerror = () => setFailed(true);
    document.head.appendChild(script);

    function renderWidget() {
      if (!containerRef.current || loaded) return;
      clearTimeout(timeout);
      window.twttr.widgets.createTimeline(
        { sourceType: "url", url: EMBED_URL },
        containerRef.current,
        {
          height: 380,
          theme: "dark",
          chrome: "nofooter transparent noheader noborders",
          dnt: true,
        }
      ).then(() => setLoaded(true)).catch(() => setFailed(true));
    }

    return () => clearTimeout(timeout);
  }, [loaded]);

  return (
    <div className="hx-panel">
      <button className="hx-toggle" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Hide Hamilton X feed" : "Show Hamilton X feed"}>
        <span className="hx-toggle-label">Hamilton on 𝕏</span>
        <span className="hx-toggle-arrow">{expanded ? "▴" : "▾"}</span>
      </button>

      {expanded && (
        <div className="hx-content">
          {/* Embed container — hidden if failed */}
          {!failed && (
            <div className="hx-embed-wrap">
              <div ref={containerRef} className="hx-embed" />
              {!loaded && <div className="hx-loading"><div className="hm-spin" style={{ width: 14, height: 14 }} /></div>}
            </div>
          )}

          {/* Fallback — shown if embed fails */}
          {failed && (
            <div className="hx-fallback">
              <div className="hx-fallback-msg">Live feed unavailable</div>
              <div className="hx-fallback-desc">Follow Hamilton directly on X</div>
            </div>
          )}

          {/* Always show curated account links */}
          <div className="hx-accounts">
            {["Media", "Emergency", "Official", "Transit"].map(cat => (
              <div key={cat} className="hx-cat-group">
                <div className="hx-cat-label">{cat}</div>
                <div className="hx-cat-links">
                  {HAMILTON_ACCOUNTS.filter(a => a.cat === cat).map(a => (
                    <a key={a.handle} href={`https://x.com/${a.handle}`} target="_blank" rel="noopener noreferrer" className="hx-account-link" aria-label={`${a.label} on X`}>
                      @{a.handle}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Skel({n=3}){return Array.from({length:n}).map((_,i)=>(
  <div key={i}className="hm-skel"style={{animationDelay:`${i*.15}s`}}>
    <div className="hm-skel-bar"style={{width:"25%"}}/><div className="hm-skel-bar"style={{width:"80%"}}/><div className="hm-skel-bar"style={{width:"50%"}}/>
  </div>
))}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function TheHammer(){
  const[articles,setArticles]=useState([]);
  const[feeds,setFeeds]=useState([]);
  const[filter,setFilter]=useState("all");
  const[updated,setUpdated]=useState(null);
  const[phase,setPhase]=useState("loading");
  const[showSrc,setShowSrc]=useState(false);
  const[showDonate,setShowDonate]=useState(false);
  // Accumulator ref to prevent duplicate appending
  const accRef=useRef({articles:[],feeds:[]});

  const fetchBatch=useCallback(async(b)=>{
    try{
      const c=new AbortController();const t=setTimeout(()=>c.abort(),12000);
      const r=await fetch(`/api/feeds?batch=${b}`,{signal:c.signal});clearTimeout(t);
      if(!r.ok)return null;return await r.json();
    }catch{return null}
  },[]);

  const load=useCallback(async()=>{
    // Reset accumulator on each full load
    accRef.current={articles:[],feeds:[]};
    setPhase("loading");

    // Wave 1
    const d1=await fetchBatch(1);
    if(d1&&d1.articles.length>0){
      const w1=d1.articles.map(a=>({...a,time:timeAgo(a.pubDate)}));
      accRef.current={articles:w1,feeds:[...d1.feeds]};
      setArticles(w1);
      setFeeds([...d1.feeds]);
      setUpdated(new Date(d1.fetchedAt));
    }
    setPhase("wave2");

    // Wave 2
    const d2=await fetchBatch(2);
    if(d2&&d2.articles.length>0){
      const w2=d2.articles.map(a=>({...a,time:timeAgo(a.pubDate)}));
      const merged=dedup([...accRef.current.articles,...w2]).sort((a,b)=>new Date(b.pubDate||0)-new Date(a.pubDate||0));
      const mergedFeeds=[...accRef.current.feeds,...d2.feeds];
      accRef.current={articles:merged,feeds:mergedFeeds};
      setArticles(merged);
      setFeeds(mergedFeeds);
      setUpdated(new Date(d2.fetchedAt));
    }
    setPhase("done");
  },[fetchBatch]);

  useEffect(()=>{load()},[load]);
  useEffect(()=>{const iv=setInterval(load,5*60*1000);return()=>clearInterval(iv)},[load]);

  // Fix 3: Live-updating relative timestamp
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  const updatedAgo = updated ? (() => {
    const m = Math.floor((now - updated.getTime()) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ${m % 60}m ago`;
  })() : null;

  const cats=["all",...Array.from(new Set(articles.map(a=>a.category).filter(Boolean)))];
  // Fix 4: Only show categories that have articles in the current loaded set
  const catsWithCounts = cats.map(c => ({ cat: c, count: c === "all" ? articles.length : articles.filter(a => a.category === c).length })).filter(x => x.count > 0);

  // Reset filter if current category was removed
  useEffect(() => {
    if (filter !== "all" && !catsWithCounts.find(x => x.cat === filter)) setFilter("all");
  }, [catsWithCounts, filter]);
  const fil=filter==="all"?articles:articles.filter(a=>a.category===filter);
  // Hero selection: prioritize Hamilton-local feeds for featured stories
  const HAMILTON_FEED_IDS = new Set(["cbc-ham", "global-ham", "bayobserver", "spec"]);
  const heroPool = filter === "all"
    ? (() => {
        const local = fil.filter(a => HAMILTON_FEED_IDS.has(a.feedId));
        const heroes = local.slice(0, 3);
        // Fill remaining hero slots from any source if not enough local
        if (heroes.length < 3) {
          const used = new Set(heroes.map(h => `${h.feedId}-${h.title}`));
          for (const a of fil) {
            if (heroes.length >= 3) break;
            if (!used.has(`${a.feedId}-${a.title}`)) heroes.push(a);
          }
        }
        return heroes;
      })()
    : fil.slice(0, 3);
  const feat = heroPool;
  const featKeys = new Set(feat.map(a => `${a.feedId}-${a.title}`));
  const rest = fil.filter(a => !featKeys.has(`${a.feedId}-${a.title}`));
  const ticker=articles.slice(0,25);

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#0a0a0f;--bg2:#12121a;--bg3:#1a1a26;--bg4:#22222f;
          --tx:#e8e6e3;--tx2:#9b97a0;--tx3:#65616b;
          --accent:#e5a825;--accent2:#d4942a;--accent-dim:rgba(229,168,37,.12);
          --border:#2a2a38;--border2:#1e1e2a;
          --max:1280px;--px:14px;
          --head:'Sora',system-ui,sans-serif;--body:'Outfit',system-ui,sans-serif;
          --red:#E53935;
        }
        @keyframes hm-fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes hm-pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes hm-spin{to{transform:rotate(360deg)}}
        @keyframes hm-ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes hm-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .hm-spin{border:2px solid var(--border);border-top:2px solid var(--accent);border-radius:50%;animation:hm-spin .7s linear infinite}

        .hm-root{min-height:100vh;background:var(--bg);color:var(--tx);font-family:var(--body);-webkit-font-smoothing:antialiased}

        /* ── Header ── */
        .hm-header{background:var(--bg);border-bottom:1px solid var(--border2);position:relative}
        .hm-header-inner{max-width:var(--max);margin:0 auto;padding:16px var(--px) 14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
        .hm-brand{display:flex;align-items:center;gap:10px}
        .hm-logo{font-family:var(--head);font-weight:800;font-size:clamp(20px,5vw,28px);letter-spacing:-.5px;color:var(--tx);line-height:1}
        .hm-logo span{color:var(--accent)}
        .hm-tagline{font-size:11px;color:var(--tx3);letter-spacing:1px;text-transform:uppercase;display:none}
        .hm-header-right{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--tx3)}
        .hm-header-status{display:flex;align-items:center;gap:5px}

        /* ── Ticker ── */
        .hm-ticker{overflow:hidden;white-space:nowrap;background:var(--bg2);border-bottom:1px solid var(--border2);padding:6px 0;display:none}
        .hm-ticker-inner{display:inline-block;animation:hm-ticker 100s linear infinite}
        .hm-ticker:hover .hm-ticker-inner{animation-play-state:paused}
        .hm-ticker-dot{color:var(--accent);margin:0 8px;font-size:8px}
        .hm-ticker-text{color:var(--tx2);margin-right:28px;font-size:11px;font-family:var(--body)}

        /* ── Nav ── */
        .hm-nav{background:rgba(10,10,15,.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--border2);position:sticky;top:0;z-index:100}
        .hm-nav-inner{max-width:var(--max);margin:0 auto;padding:0 var(--px);display:flex;align-items:center;gap:4px}
        .hm-tabs{display:flex;gap:2px;flex:1;padding:5px 0;overflow-x:auto;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
        .hm-tabs::-webkit-scrollbar{height:2px}
        .hm-tabs::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}
        .hm-tab{padding:7px 12px;border:none;cursor:pointer;font-size:12px;font-weight:500;color:var(--tx3);background:transparent;border-radius:6px;white-space:nowrap;font-family:var(--body);transition:all .2s;min-height:36px;-webkit-tap-highlight-color:transparent}
        .hm-tab:hover{color:var(--tx2);background:var(--bg3)}
        .hm-tab--active{font-weight:600;color:var(--accent);background:var(--accent-dim)}
        .hm-nav-actions{display:flex;gap:5px;border-left:1px solid var(--border2);padding-left:8px;flex-shrink:0}
        .hm-btn{padding:6px 10px;border:1px solid var(--border);background:var(--bg3);cursor:pointer;border-radius:6px;font-size:11px;color:var(--tx2);font-weight:500;font-family:var(--body);min-height:34px;white-space:nowrap;transition:all .15s;-webkit-tap-highlight-color:transparent}
        .hm-btn:hover{background:var(--bg4);color:var(--tx)}
        .hm-btn--accent{border-color:var(--accent);color:var(--accent)}
        .hm-btn--accent:hover{background:var(--accent-dim)}

        /* ── Layout ── */
        .hm-main{max-width:var(--max);margin:0 auto;padding:16px var(--px)}
        .hm-grid{display:flex;flex-direction:column;gap:16px}
        .hm-featured{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
        .hm-divider{display:flex;align-items:center;gap:10px;margin:4px 0 10px}
        .hm-divider-line{flex:1;height:1px;background:var(--border2)}
        .hm-divider-text{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:var(--tx3);font-weight:600;white-space:nowrap;font-family:var(--head)}
        .hm-article-grid{display:grid;grid-template-columns:1fr;gap:8px}

        /* ── Hamilton Now Dashboard ── */
        .hn-dash{background:var(--bg2);border:1px solid var(--border);border-radius:12px;overflow:hidden}
        .hn-header{display:flex;align-items:center;gap:12px;padding:14px 16px 0}
        .hn-temp-block{display:flex;align-items:baseline;gap:4px}
        .hn-temp{font-size:34px;font-weight:700;font-family:var(--head);line-height:1;color:var(--tx)}
        .hn-icon{font-size:22px}
        .hn-cond-block{flex:1}
        .hn-cond{font-size:13px;font-weight:600;color:var(--tx);font-family:var(--head)}
        .hn-feels{font-size:11px;color:var(--tx3);margin-top:1px}

        .hn-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;padding:10px 16px;background:transparent}
        .hn-stat{padding:5px 0}
        .hn-stat-val{font-size:12px;font-weight:600;color:var(--tx);font-family:var(--head)}
        .hn-stat-lbl{font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-top:1px}

        .hn-expand{display:block;width:100%;background:none;border:none;border-top:1px solid var(--border2);padding:7px 16px;font-size:11px;color:var(--tx3);cursor:pointer;font-family:var(--body);transition:all .15s;text-align:center;-webkit-tap-highlight-color:transparent}
        .hn-expand:hover{color:var(--accent);background:var(--accent-dim)}
        .hn-expand:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}

        .hn-expanded{border-top:1px solid var(--border2);padding:12px 0;animation:hm-fadeIn .3s ease}

        .hn-hourly-scroll{display:flex;gap:2px;overflow-x:auto;padding:0 12px 8px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
        .hn-hourly-scroll::-webkit-scrollbar{height:2px}
        .hn-hourly-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}
        .hn-hour{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 8px;border-radius:8px;min-width:48px;background:var(--bg3);transition:background .15s}
        .hn-hour:first-child{background:var(--accent-dim);border:1px solid rgba(229,168,37,.2)}
        .hn-hour-time{font-size:9px;color:var(--tx3);font-weight:600;text-transform:uppercase;letter-spacing:.3px;font-family:var(--head)}
        .hn-hour:first-child .hn-hour-time{color:var(--accent)}
        .hn-hour-icon{font-size:16px;line-height:1}
        .hn-hour-temp{font-size:12px;font-weight:600;color:var(--tx);font-family:var(--head)}
        .hn-hour-precip{font-size:8px;color:var(--accent2);font-weight:500}

        .hn-precip-row{display:flex;align-items:center;gap:8px;padding:6px 16px 10px;font-size:10px}
        .hn-precip-label{color:var(--tx3);flex-shrink:0;font-size:10px}
        .hn-precip-bar-bg{flex:1;height:4px;background:var(--bg4);border-radius:2px;overflow:hidden}
        .hn-precip-bar-fill{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:2px;transition:width .5s ease}
        .hn-precip-pct{color:var(--accent);font-weight:600;font-family:var(--head);font-size:11px;flex-shrink:0}

        .hn-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;padding:0 12px 8px}
        .hn-detail{display:flex;align-items:center;gap:8px;padding:6px 4px}
        .hn-detail-icon{font-size:16px;flex-shrink:0}
        .hn-detail-val{font-size:11px;font-weight:600;color:var(--tx);font-family:var(--head)}
        .hn-detail-lbl{font-size:9px;color:var(--tx3)}

        /* ── Cards ── */
        .hm-card{display:block;text-decoration:none;color:inherit;padding:12px 14px;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;transition:all .2s ease;animation:hm-fadeIn .4s ease both;cursor:pointer;-webkit-tap-highlight-color:transparent;border-left:3px solid var(--accent)}
        .hm-card:hover{background:var(--bg3);border-color:var(--border);transform:translateY(-1px)}
        .hm-card:active{transform:scale(.99)}
        .hm-card--feat{padding:16px 18px;border-radius:12px}
        .hm-card-meta{display:flex;align-items:center;gap:8px;margin-bottom:5px}
        .hm-card-src{font-size:10px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;font-family:var(--head)}
        .hm-card-time{font-size:10px;color:var(--tx3);margin-left:auto}
        .hm-card-title{font-size:14px;font-weight:600;line-height:1.35;color:var(--tx);font-family:var(--head);margin:0}
        .hm-card--feat .hm-card-title{font-size:16px;font-weight:700}
        .hm-card-sum{font-size:12px;color:var(--tx2);line-height:1.5;margin:4px 0 0}
        .hm-card--feat .hm-card-sum{font-size:12.5px}

        .hm-card-hero{display:flex;gap:14px;align-items:flex-start}
        .hm-card-hero-text{flex:1;min-width:0}
        .hm-card-hero-img{width:130px;height:90px;object-fit:cover;border-radius:8px;flex-shrink:0;background:var(--bg4)}
        .hm-card-thumb-row{display:flex;gap:10px;align-items:flex-start}
        .hm-card-thumb-text{flex:1;min-width:0}
        .hm-card-thumb{width:72px;height:54px;object-fit:cover;border-radius:6px;flex-shrink:0;background:var(--bg4)}

        /* Fix 1: Stable image fallback — keeps hero dimensions, shows gradient */
        .hm-card-img-fallback{background:linear-gradient(135deg,var(--bg3),var(--bg4));display:flex;align-items:center;justify-content:center;overflow:hidden}
        .hm-card-img-fallback-text{font-size:10px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:1px;font-family:var(--head);opacity:.6}

        /* Fix 5: Focus-visible for keyboard navigation */
        .hm-card:focus-visible{outline:2px solid var(--accent);outline-offset:2px;transform:translateY(-1px)}
        .hm-tab:focus-visible{outline:2px solid var(--accent);outline-offset:-2px;border-radius:6px}
        .hm-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .hm-empty-link:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

        /* ── Wave 2 bar ── */
        .hm-wave2{background:linear-gradient(90deg,var(--bg3) 25%,var(--bg4) 50%,var(--bg3) 75%);background-size:200% 100%;animation:hm-shimmer 1.8s ease infinite;padding:8px 16px;border-radius:8px;text-align:center;font-size:11px;color:var(--tx3);margin-bottom:10px;border:1px solid var(--border2)}

        /* ── Sidebar ── */
        .hm-sidebar{display:flex;flex-direction:column;gap:10px}
        .hm-panel{padding:14px;background:var(--bg2);border:1px solid var(--border2);border-radius:10px}
        .hm-panel-label{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);font-weight:600;margin-bottom:8px;font-family:var(--head)}
        .hm-feed-row{display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid var(--border2)}
        .hm-feed-row:last-child{border-bottom:none}
        .hm-feed-name{font-size:11px;color:var(--tx2);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;max-width:150px}
        .hm-feed-count{font-size:10px;font-weight:600;color:var(--accent)}
        .hm-stat-num{font-size:26px;font-weight:700;color:var(--tx);font-family:var(--head);text-align:center}
        .hm-stat-label{font-size:11px;color:var(--tx3);text-align:center}
        .hm-stat-time{font-size:10px;color:var(--tx3);text-align:center;margin-top:2px;opacity:.7}

        .hm-skel{padding:14px;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;animation:hm-pulse 1.5s ease infinite}
        .hm-skel-bar{height:10px;background:var(--bg4);border-radius:4px;margin-bottom:8px}
        .hm-skel-bar:nth-child(2){height:14px}
        .hm-skel-bar:last-child{margin-bottom:0}

        /* ── Sources ── */
        .hm-sources{margin-bottom:14px;padding:16px;background:var(--bg2);border:1px solid var(--border2);border-radius:12px;animation:hm-fadeIn .3s ease}
        .hm-sources-title{font-family:var(--head);font-size:14px;font-weight:700;margin-bottom:10px;color:var(--tx)}
        .hm-sources-grid{display:grid;grid-template-columns:1fr;gap:4px}
        .hm-src-item{display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg3);border-radius:6px}
        .hm-src-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0}
        .hm-src-name{font-size:12px;font-weight:600;color:var(--tx)}
        .hm-src-detail{font-size:10px;color:var(--tx3)}

        .hm-empty{grid-column:1/-1;text-align:center;padding:36px 16px;color:var(--tx3)}
        .hm-empty-link{color:var(--accent);cursor:pointer;text-decoration:underline}

        /* ── Hamilton X Widget ── */
        .hx-panel{background:var(--bg2);border:1px solid var(--border2);border-radius:10px;overflow:hidden}
        .hx-toggle{display:flex;justify-content:space-between;align-items:center;width:100%;background:none;border:none;padding:10px 14px;cursor:pointer;color:var(--tx);font-family:var(--head);font-size:12px;font-weight:600;-webkit-tap-highlight-color:transparent;transition:background .15s}
        .hx-toggle:hover{background:var(--bg3)}
        .hx-toggle:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
        .hx-toggle-label{display:flex;align-items:center;gap:6px}
        .hx-toggle-arrow{color:var(--tx3);font-size:11px}
        .hx-content{border-top:1px solid var(--border2);animation:hm-fadeIn .3s ease}
        .hx-embed-wrap{position:relative;min-height:100px}
        .hx-embed{overflow:hidden}
        .hx-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg2)}
        .hx-fallback{padding:16px;text-align:center}
        .hx-fallback-msg{font-size:13px;font-weight:600;color:var(--tx2);font-family:var(--head);margin-bottom:4px}
        .hx-fallback-desc{font-size:11px;color:var(--tx3)}
        .hx-accounts{padding:10px 14px 12px;display:flex;flex-direction:column;gap:8px}
        .hx-cat-group{}
        .hx-cat-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--tx3);font-weight:600;font-family:var(--head);margin-bottom:3px}
        .hx-cat-links{display:flex;flex-wrap:wrap;gap:4px}
        .hx-account-link{font-size:10px;color:var(--accent);text-decoration:none;padding:2px 7px;background:var(--accent-dim);border-radius:4px;transition:all .15s;white-space:nowrap;-webkit-tap-highlight-color:transparent}
        .hx-account-link:hover{background:var(--accent);color:var(--bg)}
        .hx-account-link:focus-visible{outline:2px solid var(--accent);outline-offset:1px}

        /* ── Footer ── */
        .hm-footer{border-top:1px solid var(--border2);padding:20px var(--px);margin-top:24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
        .hm-footer-brand{font-family:var(--head);font-size:14px;font-weight:700;color:var(--tx3)}
        .hm-footer-text{font-size:10px;color:var(--tx3);max-width:400px;line-height:1.5;opacity:.6}
        .hm-footer-donate{background:none;border:1px solid var(--border);color:var(--tx3);font-family:var(--body);font-size:11px;padding:6px 14px;border-radius:6px;cursor:pointer;transition:all .2s;-webkit-tap-highlight-color:transparent}
        .hm-footer-donate:hover{color:var(--accent);border-color:var(--accent);background:var(--accent-dim)}

        /* ── Donate button in nav ── */
        .hm-btn--donate{border-color:var(--border);color:var(--tx2)}
        .hm-btn--donate:hover{color:var(--accent);border-color:var(--accent);background:var(--accent-dim)}

        /* ── Modal ── */
        .hm-modal-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;animation:hm-fadeIn .2s ease}
        .hm-modal{background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:28px 24px;max-width:380px;width:100%;position:relative;text-align:center;animation:hm-fadeIn .3s ease}
        .hm-modal-close{position:absolute;top:12px;right:14px;background:none;border:none;color:var(--tx3);font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;transition:all .15s;-webkit-tap-highlight-color:transparent}
        .hm-modal-close:hover{color:var(--tx);background:var(--bg4)}
        .hm-modal-close:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .hm-modal-icon{font-size:36px;margin-bottom:8px}
        .hm-modal-title{font-family:var(--head);font-size:18px;font-weight:700;color:var(--tx);margin-bottom:6px}
        .hm-modal-desc{font-size:13px;color:var(--tx2);line-height:1.5;margin-bottom:18px}
        .hm-modal-qr{display:flex;justify-content:center;margin-bottom:18px}
        .hm-modal-qr img{border:1px solid var(--border);border-radius:10px;background:var(--bg3)}
        .hm-modal-addr-wrap{margin-bottom:16px}
        .hm-modal-addr-label{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);font-weight:600;margin-bottom:6px;font-family:var(--head)}
        .hm-modal-addr-row{display:flex;align-items:center;gap:8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 10px}
        .hm-modal-addr{flex:1;font-size:11px;color:var(--tx);word-break:break-all;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;line-height:1.4;text-align:left}
        .hm-modal-copy{flex-shrink:0;background:var(--accent-dim);border:1px solid var(--accent);color:var(--accent);font-family:var(--head);font-size:11px;font-weight:600;padding:5px 12px;border-radius:6px;cursor:pointer;transition:all .15s;white-space:nowrap;-webkit-tap-highlight-color:transparent}
        .hm-modal-copy:hover{background:var(--accent);color:var(--bg)}
        .hm-modal-copy:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
        .hm-modal-footer-text{font-size:11px;color:var(--tx3);opacity:.7}

        .hm-topbar-date-short{display:inline}
        .hm-topbar-date-full{display:none}

        @media(min-width:640px){
          :root{--px:20px}
          .hm-ticker{display:block}
          .hm-tagline{display:inline}
          .hm-topbar-date-short{display:none}
          .hm-topbar-date-full{display:inline}
          .hm-article-grid{grid-template-columns:repeat(2,1fr);gap:10px}
          .hm-sources-grid{grid-template-columns:repeat(2,1fr)}
          .hm-card{padding:14px 18px}
          .hm-card--feat{padding:18px 22px}
          .hm-card--feat .hm-card-title{font-size:18px}
          .hm-card-title{font-size:15px}
          .hm-card:hover{transform:translateY(-2px)}
          .hn-temp{font-size:38px}
          .hn-stats{grid-template-columns:repeat(4,1fr)}
          .hm-card-hero-img{width:170px;height:105px}
          .hm-card-thumb{width:85px;height:60px}
        }

        @media(min-width:960px){
          :root{--px:24px}
          .hm-grid{flex-direction:row;gap:18px}
          .hm-sidebar{width:260px;flex-shrink:0;position:sticky;top:52px;align-self:flex-start;max-height:calc(100vh - 70px);overflow-y:auto}
          .hm-sidebar::-webkit-scrollbar{width:3px}
          .hm-sidebar::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}
          .hm-articles-col{flex:1;min-width:0}
          .hm-article-grid{grid-template-columns:repeat(auto-fill,minmax(290px,1fr))}
          .hm-sources-grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
          .hm-card--feat .hm-card-title{font-size:20px}
          .hm-card-hero-img{width:200px;height:120px}
          .hm-logo{font-size:28px}
          .hn-stats{grid-template-columns:repeat(2,1fr)}
          .hn-temp{font-size:32px}
        }
        @media(min-width:1200px){.hm-sidebar{width:270px}}
      `}</style>

      <div className="hm-root">
        {/* Header */}
        <header className="hm-header"><div className="hm-header-inner">
          <div className="hm-brand">
            <div className="hm-logo">THE HAMMER<span>.</span></div>
            <span className="hm-tagline">Hamilton's Feed</span>
          </div>
          <div className="hm-header-right">
            <span className="hm-topbar-date-full">{new Date().toLocaleDateString("en-CA",{weekday:"short",month:"short",day:"numeric"})}</span>
            <span className="hm-topbar-date-short">{new Date().toLocaleDateString("en-CA",{month:"short",day:"numeric"})}</span>
            <span style={{opacity:.3}}>·</span>
            <div className="hm-header-status">
              {phase==="loading"&&<><div className="hm-spin"style={{width:10,height:10}}/><span style={{color:"var(--accent)"}}>Loading</span></>}
              {phase==="wave2"&&<><div className="hm-spin"style={{width:10,height:10,borderTopColor:"#fbbf24"}}/><span style={{color:"#fbbf24"}}>More feeds</span></>}
              {phase==="done"&&<span style={{color:"var(--accent)"}}>{feeds.length} sources · {articles.length}</span>}
            </div>
          </div>
        </div></header>

        {/* Ticker */}
        {ticker.length>0&&<div className="hm-ticker"><div className="hm-ticker-inner">
          {[...ticker,...ticker].map((a,i)=><span key={i}><span className="hm-ticker-dot">●</span><span className="hm-ticker-text">{a.title}</span></span>)}
        </div></div>}

        {/* Nav */}
        <nav className="hm-nav"><div className="hm-nav-inner">
          <div className="hm-tabs">
            {catsWithCounts.map(({cat:c,count})=>{
              const active=filter===c;
              return<button key={c}onClick={()=>setFilter(c)}className={`hm-tab${active?" hm-tab--active":""}`}>
                {c==="all"?`All${count>0?` (${count})`:""}`:`${c} (${count})`}
              </button>
            })}
          </div>
          <div className="hm-nav-actions">
            <button onClick={()=>setShowDonate(true)}className="hm-btn hm-btn--donate">☕ Tip</button>
            <button onClick={()=>setShowSrc(!showSrc)}className="hm-btn"style={showSrc?{background:"var(--bg4)"}:{}}>
              {feeds.length>0?`${feeds.length} src`:"src"}
            </button>
            <button onClick={load}disabled={phase==="loading"}className="hm-btn hm-btn--accent">↻</button>
          </div>
        </div></nav>

        {/* Main */}
        <main className="hm-main">
          {showSrc&&<div className="hm-sources">
            <div className="hm-sources-title">Sources ({feeds.length})</div>
            {feeds.length>0&&<div className="hm-sources-grid">{feeds.map(f=><div key={f.id}className="hm-src-item">
              <div className="hm-src-dot"/>
              <div style={{flex:1,minWidth:0}}>
                <div className="hm-src-name">{f.name}</div>
                <div className="hm-src-detail">{f.category} · {f.count}</div>
              </div>
            </div>)}</div>}
            {phase==="wave2"&&<div style={{color:"#fbbf24",fontSize:11,marginTop:8,display:"flex",alignItems:"center",gap:5}}>
              <div className="hm-spin"style={{width:9,height:9,borderTopColor:"#fbbf24"}}/>Loading additional sources…
            </div>}
          </div>}

          <div className="hm-grid">
            {/* Sidebar */}
            <div className="hm-sidebar">
              <HamiltonNow/>
              <div className="hm-panel">
                <div className="hm-panel-label">{phase==="loading"?"Connecting":phase==="wave2"?`${feeds.length} feeds +`:`${feeds.length} Feeds`}</div>
                {phase==="loading"?<div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {[1,2,3,4].map(i=><div key={i}style={{display:"flex",alignItems:"center",gap:8,padding:"3px 0"}}>
                    <div className="hm-spin"style={{width:9,height:9,flexShrink:0}}/>
                    <div style={{height:10,background:"var(--bg4)",borderRadius:3,flex:1,animation:`hm-pulse 1.5s ease ${i*.15}s infinite`}}/>
                  </div>)}
                </div>:feeds.map(f=><div key={f.id}className="hm-feed-row">
                  <span className="hm-feed-name">{f.name}</span>
                  <span className="hm-feed-count">{f.count}</span>
                </div>)}
                {phase==="wave2"&&<div style={{padding:"5px 0",display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#fbbf24",marginTop:2}}>
                  <div className="hm-spin"style={{width:8,height:8,borderTopColor:"#fbbf24"}}/>more incoming
                </div>}
              </div>
              {articles.length>0&&<div className="hm-panel">
                <div className="hm-stat-num">{articles.length}</div>
                <div className="hm-stat-label">stories · {feeds.length} sources</div>
                {updatedAgo&&<div className="hm-stat-time">Updated {updatedAgo}</div>}
              </div>}
              <HamiltonX/>
            </div>

            {/* Articles */}
            <div className="hm-articles-col">
              {phase==="wave2"&&articles.length>0&&<div className="hm-wave2">Loading more sources…</div>}
              <div className="hm-featured">
                {feat.length>0?feat.map((a,i)=><Card key={`f${i}-${a.feedId}`}a={a}big i={i}/>):<Skel n={3}/>}
              </div>
              {fil.length>3&&<div className="hm-divider"><div className="hm-divider-line"/><span className="hm-divider-text">{filter==="all"?"More":filter}</span><div className="hm-divider-line"/></div>}
              <div className="hm-article-grid">
                {rest.length>0?rest.map((a,i)=><Card key={`r${i}-${a.feedId}`}a={a}i={i}/>):
                  phase==="loading"?<Skel n={6}/>:
                  fil.length<=3?null:<div className="hm-empty"><span className="hm-empty-link"onClick={load}>Refresh</span></div>}
              </div>
            </div>
          </div>
        </main>

        <footer className="hm-footer">
          <div className="hm-footer-brand">THE HAMMER<span style={{color:"var(--accent)"}}>.</span></div>
          <div className="hm-footer-text">Hamilton, Ontario</div>
          <button onClick={()=>setShowDonate(true)}className="hm-footer-donate">☕ Support this project</button>
        </footer>

        {showDonate && <DonateModal onClose={() => setShowDonate(false)} />}
      </div>
    </>
  );
}
