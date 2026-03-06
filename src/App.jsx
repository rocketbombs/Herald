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

// ── Weather ─────────────────────────────────────────────────────────────────
const WMO={0:"☀️ Clear",1:"🌤 Clear",2:"⛅ Cloudy",3:"☁️ Overcast",45:"🌫 Fog",51:"🌦 Drizzle",61:"🌧 Rain",63:"🌧 Rain",65:"🌧 Heavy Rain",66:"🌧 Freezing Rain",71:"🌨 Snow",73:"🌨 Snow",75:"❄️ Heavy Snow",80:"🌦 Showers",82:"⛈ Storms",95:"⛈ Thunder"};

function Weather(){
  const[w,setW]=useState(null);
  useEffect(()=>{
    fetch("https://api.open-meteo.com/v1/forecast?latitude=43.2557&longitude=-79.8711&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min&timezone=America%2FToronto&forecast_days=1")
      .then(r=>r.json()).then(d=>{
        if(!d?.current)return;const c=d.current,dy=d.daily;
        const dirs=["N","NE","E","SE","S","SW","W","NW"];
        const dir=dirs[Math.round((c.wind_direction_10m||0)/45)%8];
        const wmo=WMO[c.weather_code]||"🌤 --";
        setW({temp:Math.round(c.temperature_2m),cond:wmo.slice(2).trim(),icon:wmo.slice(0,2).trim(),hum:c.relative_humidity_2m,wind:`${Math.round(c.wind_speed_10m)} km/h ${dir}`,hi:Math.round(dy.temperature_2m_max[0]),lo:Math.round(dy.temperature_2m_min[0])});
      }).catch(()=>{});
  },[]);
  if(!w)return<div className="hm-weather"><div className="hm-spin"style={{width:16,height:16}}/></div>;
  return(
    <div className="hm-weather">
      <div className="hm-weather-top">
        <span className="hm-weather-temp">{w.temp}°</span>
        <span className="hm-weather-icon">{w.icon}</span>
      </div>
      <div className="hm-weather-cond">{w.cond}</div>
      <div className="hm-weather-row">
        <span>💧{w.hum}%</span><span>💨{w.wind}</span><span>↑{w.hi}° ↓{w.lo}°</span>
      </div>
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
  const feat=fil.slice(0,3),rest=fil.slice(3);
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

        /* ── Weather ── */
        .hm-weather{padding:14px 16px;background:linear-gradient(135deg,var(--bg3),var(--bg4));border:1px solid var(--border);border-radius:10px;display:flex;flex-direction:column;gap:4px;min-height:70px;justify-content:center;align-items:center}
        .hm-weather-top{display:flex;align-items:baseline;gap:6px;width:100%}
        .hm-weather-temp{font-size:32px;font-weight:700;font-family:var(--head);line-height:1;color:var(--tx)}
        .hm-weather-icon{font-size:20px}
        .hm-weather-cond{font-size:12px;color:var(--tx2);width:100%}
        .hm-weather-row{display:flex;gap:10px;font-size:11px;color:var(--tx3);width:100%;margin-top:2px}

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

        /* ── Footer ── */
        .hm-footer{border-top:1px solid var(--border2);padding:20px var(--px);margin-top:24px;text-align:center}
        .hm-footer-brand{font-family:var(--head);font-size:14px;font-weight:700;color:var(--tx3);margin-bottom:4px}
        .hm-footer-text{font-size:10px;color:var(--tx3);max-width:400px;margin:0 auto;line-height:1.5;opacity:.6}

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
          .hm-weather-temp{font-size:36px}
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
              <Weather/>
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
        </footer>
      </div>
    </>
  );
}
