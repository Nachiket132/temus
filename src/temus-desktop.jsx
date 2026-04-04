import { useState, useRef, useEffect, useCallback } from "react";

const F = () => <style>{`
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;1,400&family=Geist+Mono:wght@300;400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  ::placeholder{color:#3a3428;opacity:1;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:#2a2520;border-radius:4px;}
  textarea,input{font-family:inherit;}
  button{cursor:pointer;}
  button:focus,input:focus,textarea:focus{outline:none;}
  @keyframes pulseBorder{0%,100%{border-color:#c8873a44;}50%{border-color:#c8873a;}}
  @keyframes pulsePlaceholder{0%,100%{opacity:0.4;}50%{opacity:1;}}
  @keyframes pulseGreenDot{0%,100%{opacity:0.5;}50%{opacity:1;}}
  .pulse-title::placeholder{animation:pulsePlaceholder 2.5s ease-in-out infinite;}
`}</style>;

/* ── Tokens ── */
const C = {
  win:"#0f0e0c", bar:"#141210", side:"#111009", main:"#0c0b09",
  card:"#1a1714", border:"#1e1c18", borderHi:"#2e2a22",
  amber:"#c8873a", amberDim:"#7a5020", amberBg:"#1c140a",
  text:"#ddd4c0", sub:"#8a7e6e", muted:"#5a5040", faint:"#2a2520",
  green:"#5aaa72", greenBg:"#0d1a10", blue:"#5a8ec8", blueBg:"#0d1420",
  red:"#c05a4a", teal:"#4a9e8a", tealBg:"#0d1a18",
  purple:"#8a6ec8", purpleBg:"#130f1e", coral:"#c87850", coralBg:"#1a110a",
  pink:"#c85a8a", pinkBg:"#1a0d14",
  guideText:"#7a6e5e",
};

/* ── Tag config ── */
const TAGS = {
  "":           { c:C.amber,  bg:C.amberBg,   b:C.amberDim,  s:["spark","problem","vision","questions","resources","nextstep"], pl:"General",       pd:"Analyse my idea and help me think it through.", desc:"General blueprint" },
  "Business":   { c:C.amber,  bg:C.amberBg,   b:C.amberDim,  s:["spark","problem","vision","questions","resources","nextstep"], pl:"Business Plan",  pd:"Create a full business plan — market, revenue model, GTM strategy, milestones.", desc:"Full business plan" },
  "Product":    { c:C.blue,   bg:C.blueBg,    b:C.blue+"44", s:["spark","problem","vision","questions","resources","nextstep"], pl:"Product Research",pd:"Research the market — real competitors, feature gaps, TAM, MVP scope.", desc:"Market research" },
  "Personal":   { c:C.green,  bg:C.greenBg,   b:C.green+"44",s:["spark","vision","questions","resources","nextstep"],          pl:"Growth Plan",    pd:"Build a personal growth plan with 30-day habits and resources.", desc:"Personal growth" },
  "Learning":   { c:C.teal,   bg:C.tealBg,    b:C.teal+"44", s:["spark","vision","nextstep"],                                  pl:"Learning Roadmap",pd:"Build a complete learning roadmap — phases, resources, projects, timeline.", desc:"3 sections only" },
  "Content":    { c:C.coral,  bg:C.coralBg,   b:C.coral+"44",s:["spark","problem","vision","questions","nextstep"],            pl:"Content Strategy",pd:"Create a content strategy — pillars, platform, 4-week calendar, monetisation.", desc:"Content strategy" },
  "Research":   { c:C.purple, bg:C.purpleBg,  b:C.purple+"44",s:["spark","problem","vision","questions","resources","nextstep"],pl:"Research Framework",pd:"Build a structured research framework with methodology and sources.", desc:"Deep research" },
  "Side project":{ c:C.pink,  bg:C.pinkBg,   b:C.pink+"44", s:["spark","problem","vision","questions","resources","nextstep"], pl:"Ship Fast Plan", pd:"Define MVP scope, tech stack, and how to find the first 10 users.", desc:"Ship fast plan" },
};

const SECS = {
  spark:     { icon:"✦", label:"The Spark",        guide:"What's the raw idea? Don't filter. Don't edit. Just pour it out." },
  problem:   { icon:"◎", label:"Problem",           guide:"Who is hurting right now? What does their frustration look like?" },
  vision:    { icon:"◈", label:"Vision",            guide:"Two years from now, if this works perfectly — describe that world." },
  questions: { icon:"?", label:"Open Questions",    guide:"Everything you don't know yet. The blind spots are the real risk." },
  resources: { icon:"⬡", label:"Resources",         guide:"What do you have? What's missing? Be brutally honest." },
  nextstep:  { icon:"→", label:"First Move",        guide:"One action. The smallest possible thing that moves this forward." },
};

const STATUS = ["Raw Idea","Blueprinted","In Progress","Shipped","Shelved"];
const STATUS_C = { "Raw Idea":C.muted, "Blueprinted":C.amber, "In Progress":C.blue, "Shipped":C.green, "Shelved":C.faint };

/* AI bullet descriptions per tag */
const AI_BULLETS = {
  "":           ["Analyse idea strengths and weaknesses","Identify gaps in your thinking","Suggest concrete next steps"],
  "Business":   ["Generate market analysis and GTM strategy","Build revenue model with pricing tiers","Create 90-day milestone roadmap"],
  "Product":    ["Research TAM/SAM/SOM and competitors","Identify feature gaps and MVP scope","Benchmark pricing in your market"],
  "Personal":   ["Map internal blockers and growth levers","Build 30-day habit-forming action plan","Define 3-month success metrics"],
  "Learning":   ["Structure beginner → advanced phases","Curate best resources per stage","Create project-based timeline"],
  "Content":    ["Define pillars and platform strategy","Build 4-week content calendar","Map monetisation opportunities"],
  "Research":   ["Sharpen research question and methodology","Identify primary and secondary sources","Flag potential biases and blind spots"],
  "Side project":["Ruthlessly scope the MVP feature set","Recommend tech stack for solo dev","Plan first-10-users acquisition"],
};

function newIdea(){ return { id:Date.now(), title:"Untitled Blueprint", tag:"", status:"Raw Idea", locked:false, created:Date.now(), sections:Object.fromEntries(Object.keys(SECS).map(k=>[k,""])) }; }

function buildPrompt(idea){
  const cfg = TAGS[idea.tag]||TAGS[""];
  const sids = cfg.s;
  const vals = sids.filter(s=>idea.sections[s]?.trim()).map(s=>`[${SECS[s].label.toUpperCase()}]\n${idea.sections[s]}`).join("\n\n");
  if(!vals) return "";
  const header = `TEMUS BLUEPRINT — ${idea.title}\n${"─".repeat(40)}\n\n${vals}\n\n${"─".repeat(40)}\n`;
  const tasks = {
    "Business": `Based on this blueprint, write a full business plan:\n1. Executive Summary\n2. Market Opportunity\n3. Revenue Model & Pricing\n4. Competitive Landscape\n5. Go-To-Market Strategy\n6. Key Risks\n7. 90-day Milestones`,
    "Product": `Based on this blueprint, research and write:\n1. Market Size (TAM/SAM/SOM)\n2. Top 5 competitors — name them, strengths & weaknesses\n3. Feature gap this product fills\n4. Pricing benchmarks\n5. Technical feasibility\n6. Ruthless MVP scope`,
    "Personal": `Based on this blueprint, build a personal growth plan:\n1. The deeper goal beneath this idea\n2. Internal blockers (mindset, habits)\n3. 30-day action plan\n4. Recommended resources\n5. What success looks like in 3 months`,
    "Learning": `Based on this blueprint, build a complete learning roadmap:\n1. Learning phases (beginner → advanced)\n2. Best resources per phase\n3. Projects to build at each stage\n4. Realistic timeline (1hr/day)\n5. First action to take today`,
    "Content": `Based on this blueprint, create a content strategy:\n1. Audience definition\n2. Content pillars (3–5 themes)\n3. Best formats and platforms\n4. 4-week content calendar\n5. Monetisation options`,
    "Research": `Based on this blueprint, build a research framework:\n1. Sharpen the research question\n2. Methodology recommendation\n3. Primary & secondary sources\n4. Potential biases to watch\n5. First 3 research tasks this week`,
    "Side project": `Based on this blueprint, give me a ship-fast plan:\n1. Ruthless MVP — must-have vs. cut\n2. Specific tech stack recommendation\n3. Build timeline for solo dev on weekends\n4. How to find the first 10 users before building\n5. Week-by-week plan for next 4 weeks`,
  };
  return header + (tasks[idea.tag] || `Help me think through this idea. Identify gaps, risks, and what to focus on first.`);
}

/* ── Growable textarea ── */
function GTA({ value, onChange, placeholder, disabled }){
  const r=useRef(null);
  useEffect(()=>{ if(r.current){r.current.style.height="auto";r.current.style.height=Math.max(120,r.current.scrollHeight)+"px";} },[value]);
  return <textarea ref={r} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} rows={4}
    style={{ display:"block",width:"100%",background:"transparent",border:"none",resize:"none",overflow:"hidden",
      fontFamily:"'Lora',serif",fontSize:17,lineHeight:2.0,color:disabled?C.muted:C.text,caretColor:C.amber,letterSpacing:"0.01em",position:"relative",zIndex:1 }}/>;
}

/* ── Copy panel ── */
function CopyDrawer({ idea, onClose }){
  const ta=useRef(null); const [ok,setOk]=useState(false); const [mode,setMode]=useState("smart");
  const cfg=TAGS[idea.tag]||TAGS[""];
  const prompt=buildPrompt(idea);
  const raw=(cfg.s.filter(s=>idea.sections[s]?.trim()).map(s=>`[${SECS[s].label}]\n${idea.sections[s]}`).join("\n\n"));
  const text=mode==="smart"?prompt:raw;
  const bullets=AI_BULLETS[idea.tag]||AI_BULLETS[""];

  function copy(){
    if(ta.current){ta.current.select();}
    try{document.execCommand("copy");setOk(true);setTimeout(()=>setOk(false),2000);return;}catch(e){}
    navigator.clipboard?.writeText(text).then(()=>{setOk(true);setTimeout(()=>setOk(false),2000);});
  }

  useEffect(()=>{
    function kd(e){
      if((e.metaKey||e.ctrlKey)&&e.key==="Enter"){ e.preventDefault(); copy(); }
    }
    window.addEventListener("keydown",kd);
    return ()=>window.removeEventListener("keydown",kd);
  },[text]);

  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:"absolute",inset:0,zIndex:200,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end" }}>
      <div style={{ width:"100%",background:C.card,borderTop:`1px solid ${C.borderHi}`,padding:"20px 24px 24px" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex",gap:4,background:C.side,borderRadius:5,padding:2,width:"fit-content",marginBottom:10 }}>
              {[["smart","Smart prompt"],["raw","Raw notes"]].map(([m,l])=>(
                <button key={m} onClick={()=>setMode(m)} style={{ background:mode===m?C.card:"transparent",border:mode===m?`1px solid ${C.border}`:"1px solid transparent",borderRadius:3,color:mode===m?C.text:C.muted,fontFamily:"'Geist Mono',monospace",fontSize:9,padding:"5px 12px",letterSpacing:"0.06em",transition:"all 0.15s" }}>{l}</button>
              ))}
            </div>
            {mode==="smart"&&idea.tag&&(
              <div style={{ fontFamily:"'Geist Mono',monospace",fontSize:9,color:cfg.c,letterSpacing:"0.08em" }}>
                {cfg.pd}
              </div>
            )}
            {!idea.tag&&mode==="smart"&&(
              <div style={{ fontFamily:"'Geist Mono',monospace",fontSize:9,color:C.amberDim }}>
                Set a tag for a specialised prompt (Business plan, Product research, Learning roadmap...)
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background:"none",border:`1px solid ${C.border}`,color:C.muted,fontFamily:"'Geist Mono',monospace",fontSize:10,padding:"8px 12px",borderRadius:4,transition:"all 0.15s" }}>esc</button>
        </div>

        {/* What AI will do */}
        {mode==="smart"&&(
          <div style={{ marginBottom:12,padding:"10px 12px",background:C.side,borderRadius:5,border:`1px solid ${C.border}` }}>
            <div style={{ fontFamily:"'Geist Mono',monospace",fontSize:8,color:C.faint,letterSpacing:"0.1em",marginBottom:6 }}>WHAT AI WILL DO</div>
            {bullets.map((b,i)=>(
              <div key={i} style={{ fontFamily:"'Geist Mono',monospace",fontSize:9,color:C.sub,marginBottom:3,display:"flex",alignItems:"center",gap:6 }}>
                <span style={{ color:cfg.c,fontSize:7 }}>●</span>{b}
              </div>
            ))}
          </div>
        )}

        <textarea ref={ta} readOnly value={text||"Fill at least one section first."} onClick={e=>e.target.select()}
          style={{ width:"100%",height:200,background:C.side,border:`1px solid ${C.border}`,borderRadius:5,padding:"10px 12px",fontFamily:"'Geist Mono',monospace",fontSize:10,lineHeight:1.7,color:C.sub,resize:"none" }}/>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6 }}>
          <span style={{ fontFamily:"'Geist Mono',monospace",fontSize:8,color:C.faint }}>{text.length} characters</span>
          <span style={{ fontFamily:"'Geist Mono',monospace",fontSize:8,color:C.faint }}>⌘Enter to copy</span>
        </div>

        {/* Full width copy button */}
        <button onClick={copy} style={{ width:"100%",marginTop:12,background:ok?C.greenBg:cfg.bg,border:`1px solid ${ok?C.green:cfg.b}`,color:ok?C.green:cfg.c,fontFamily:"'Geist Mono',monospace",fontSize:11,padding:"10px 18px",borderRadius:5,letterSpacing:"0.08em",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
          {ok?"✓ copied to clipboard":"⎘ copy to clipboard"}
        </button>
      </div>
    </div>
  );
}

/* ── Default demo ideas ── */
const DEFAULT_IDEAS = [
  { id:1,title:"RushBrew 2.0 — Campus Expansion",tag:"Business",status:"In Progress",locked:false,created:Date.now()-86400000*3,
    sections:{ spark:"Deploy multiple RushBrew kiosks across Ahmedabad and Surat college campuses as a franchise model.",problem:"Students and gym-goers have no access to quality pre-workout drinks on demand. Vending machines only sell junk.",vision:"20 machines across Gujarat by end of 2026. N-One branded kiosks in every major college campus.",questions:"Minimum order qty for powder mix supplier? FSSAI license per machine location?",resources:"",nextstep:"" }
  },
  { id:2,title:"TenderPilot — AI tender finder",tag:"Side project",status:"Raw Idea",locked:false,created:Date.now()-86400000,
    sections:{ spark:"A web app where D and C class contractors type what work they do and get a daily digest of matching government tenders.",problem:"",vision:"",questions:"",resources:"",nextstep:"" }
  },
];

/* ── Main App ── */
export default function Temus(){
  const [ideas,setIdeas]=useState(()=>{
    try {
      const saved=localStorage.getItem("temus_blueprints");
      if(saved) return JSON.parse(saved);
    } catch(e){}
    return DEFAULT_IDEAS;
  });
  const [sel,setSel]=useState(()=>{
    try {
      const saved=localStorage.getItem("temus_last_sel");
      if(saved) return JSON.parse(saved);
    } catch(e){}
    return 1;
  });
  const [secIdx,setSecIdx]=useState(0);
  const [showCopy,setShowCopy]=useState(false);
  const [showStatusMenu,setShowStatusMenu]=useState(false);
  const [showTagMenu,setShowTagMenu]=useState(false);
  const [cmdOpen,setCmdOpen]=useState(false);
  const [cmdQ,setCmdQ]=useState("");
  const [sideCollapsed,setSideCollapsed]=useState(false);

  // Persist ideas to localStorage on every change
  useEffect(()=>{
    localStorage.setItem("temus_blueprints",JSON.stringify(ideas));
  },[ideas]);

  // Persist selected blueprint id
  useEffect(()=>{
    localStorage.setItem("temus_last_sel",JSON.stringify(sel));
  },[sel]);

  const idea=ideas.find(i=>i.id===sel)||ideas[0];
  const cfg=TAGS[idea?.tag||""]||TAGS[""];
  const sids=cfg.s;
  const secId=sids[secIdx]||sids[0];
  const sec=SECS[secId];
  const val=idea?.sections[secId]||"";

  const fillCount=sids.filter(s=>idea?.sections[s]?.trim()).length;
  const canLock=fillCount>=Math.min(3,sids.length);

  /* total word count for entire blueprint */
  const totalWords=sids.reduce((sum,sid)=>{
    const w=idea?.sections[sid]?.trim().split(/\s+/).filter(Boolean).length||0;
    return sum+w;
  },0);

  /* max words per section for progress bars */
  const wordCounts=sids.map(sid=>idea?.sections[sid]?.trim().split(/\s+/).filter(Boolean).length||0);
  const maxWords=Math.max(...wordCounts,1);

  function upd(patch){ setIdeas(p=>p.map(i=>i.id===idea.id?{...i,...patch}:i)); }
  function updSec(v){ upd({sections:{...idea.sections,[secId]:v}}); }
  function addIdea(){ const n=newIdea(); setIdeas(p=>[n,...p]); setSel(n.id); setSecIdx(0); }
  function deleteIdea(id){
    if(!window.confirm("Delete this blueprint?")) return;
    setIdeas(p=>{
      const next=p.filter(i=>i.id!==id);
      if(next.length===0){ const n=newIdea(); setSel(n.id); setSecIdx(0); return [n]; }
      if(sel===id){ setSel(next[0].id); setSecIdx(0); }
      return next;
    });
  }
  function goSec(i){ setSecIdx(Math.max(0,Math.min(sids.length-1,i))); }

  // keyboard shortcuts
  useEffect(()=>{
    function kd(e){
      if((e.metaKey||e.ctrlKey)&&e.key==="k"){ e.preventDefault(); setCmdOpen(p=>!p); }
      if(e.key==="Escape"){ setCmdOpen(false); setShowCopy(false); }
      if((e.metaKey||e.ctrlKey)&&e.key==="n"){ e.preventDefault(); addIdea(); }
      if((e.metaKey||e.ctrlKey)&&e.key==="Enter"&&!showCopy){ e.preventDefault(); goSec(secIdx+1); }
    }
    window.addEventListener("keydown",kd);
    return ()=>window.removeEventListener("keydown",kd);
  },[secIdx,showCopy]);

  // when tag changes, reset secIdx
  useEffect(()=>{ setSecIdx(0); },[idea?.tag]);

  if(!idea) return null;

  const gridBg={ backgroundImage:`linear-gradient(${C.faint}18 1px,transparent 1px),linear-gradient(90deg,${C.faint}18 1px,transparent 1px)`,backgroundSize:"36px 36px" };

  /* command palette commands grouped */
  const cmdGroups = [
    { group:"NAVIGATION", items:[
      { label:"Next section",  key:"⌘↵",  action:()=>{ goSec(secIdx+1); setCmdOpen(false); } },
      { label:"Prev section",  key:"←",   action:()=>{ goSec(secIdx-1); setCmdOpen(false); } },
      ...sids.map((sid,i)=>({ label:`Go to ${SECS[sid].label}`, key:`${i+1}`, action:()=>{ goSec(i); setCmdOpen(false); } })),
    ]},
    { group:"ACTIONS", items:[
      { label:"Copy to AI",    key:"",     action:()=>{ setShowCopy(true); setCmdOpen(false); } },
      { label:`Lock blueprint${canLock?"":" (need more sections)"}`, key:"", action:()=>{ if(canLock){upd({locked:true,status:"Blueprinted"});} setCmdOpen(false); } },
      { label:"Delete current blueprint", key:"", action:()=>{ setCmdOpen(false); deleteIdea(idea.id); } },
    ]},
    { group:"BLUEPRINTS", items:[
      { label:"New blueprint", key:"⌘N", action:()=>{ addIdea(); setCmdOpen(false); } },
      ...ideas.map(i=>({ label:`Open: ${i.title}`, key:"", action:()=>{ setSel(i.id); setSecIdx(0); setCmdOpen(false); } })),
    ]},
  ];

  return(
    <div style={{ width:"100%",height:"100vh",background:C.win,display:"flex",flexDirection:"column",fontFamily:"'Geist Mono',monospace",userSelect:"none",overflow:"hidden",position:"relative" }}>
      <F/>

      {/* ══ TITLE BAR ══ */}
      <div style={{ height:38,background:C.bar,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",flexShrink:0,paddingLeft:14,gap:0,position:"relative",WebkitAppRegion:"drag" }}>
        {/* Traffic lights */}
        <div style={{ width:70 }}/>
        {/* Window title */}
        <div style={{ position:"absolute",left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ fontSize:11,color:C.amber,fontWeight:500,letterSpacing:"0.06em" }}>TEMUS</span>
          <span style={{ color:C.faint,fontSize:11 }}>·</span>
          {idea.locked&&<span style={{ color:C.amber,fontSize:11 }}>◈</span>}
          <span style={{ fontSize:11,color:C.muted,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
            {idea.title||"Untitled Blueprint"}
          </span>
        </div>
        {/* Right side — ⌘K pill */}
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:4,paddingRight:12,WebkitAppRegion:"no-drag" }}>
          <button onClick={()=>setCmdOpen(true)} style={{ background:C.amberBg,border:`1px solid ${C.amberDim}44`,borderRadius:5,color:C.amberDim,fontSize:9,padding:"3px 10px",letterSpacing:"0.06em",display:"flex",alignItems:"center",gap:4,transition:"all 0.15s" }}>
            <span style={{ fontSize:8,opacity:0.7 }}>⌘</span><span>K</span>
          </button>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{ flex:1,display:"flex",overflow:"hidden" }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width:sideCollapsed?40:220,flexShrink:0,background:C.side,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",transition:"width 0.2s ease",overflow:"hidden" }}>

          {!sideCollapsed&&<>
            {/* New + collapse */}
            <div style={{ padding:"10px 10px 8px",display:"flex",gap:6,borderBottom:`1px solid ${C.border}` }}>
              <button onClick={addIdea}
                onMouseEnter={e=>{e.currentTarget.style.background=C.amber;e.currentTarget.style.color="#0f0e0c";}}
                onMouseLeave={e=>{e.currentTarget.style.background=C.amberBg;e.currentTarget.style.color=C.amber;}}
                style={{ flex:1,background:C.amberBg,border:`1px solid ${C.amberDim}`,borderRadius:4,color:C.amber,fontSize:9,padding:"6px 0",letterSpacing:"0.08em",transition:"all 0.15s" }}>+ new</button>
              <button onClick={()=>setSideCollapsed(true)} style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:4,color:C.muted,fontSize:12,padding:"4px 0",width:28,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s" }}>‹</button>
            </div>

            {/* Ideas list */}
            <div style={{ flex:1,overflowY:"auto",padding:"6px 6px" }}>
              <div style={{ fontSize:8,color:C.faint,letterSpacing:"0.12em",padding:"6px 6px 4px" }}>BLUEPRINTS</div>
              {ideas.map(i=>{
                const c2=TAGS[i.tag]||TAGS[""];
                const isSel=i.id===sel;
                return(
                  <div key={i.id} onClick={()=>{setSel(i.id);setSecIdx(0);}}
                    style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:5,background:isSel?C.card:"transparent",border:isSel?`1px solid ${C.border}`:"1px solid transparent",borderLeft:isSel?`2px solid ${C.amber}`:"2px solid transparent",marginBottom:2,cursor:"pointer",transition:"all 0.15s",position:"relative" }}
                    onMouseEnter={e=>{ if(!isSel){e.currentTarget.style.background=C.faint+"44";e.currentTarget.style.transform="translateX(2px)";} const arrow=e.currentTarget.querySelector('[data-arrow]'); if(arrow)arrow.style.opacity="0.5"; const del=e.currentTarget.querySelector('[data-del]'); if(del)del.style.opacity="1"; }}
                    onMouseLeave={e=>{ if(!isSel){e.currentTarget.style.background="transparent";e.currentTarget.style.transform="translateX(0)";} const arrow=e.currentTarget.querySelector('[data-arrow]'); if(arrow)arrow.style.opacity="0"; const del=e.currentTarget.querySelector('[data-del]'); if(del)del.style.opacity="0"; }}>
                    <div style={{ width:6,height:6,borderRadius:"50%",flexShrink:0,background:i.locked?C.amber:c2.c+"55" }}/>
                    <span style={{ fontSize:12,color:isSel?C.text:C.muted,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.3 }}>{i.title}</span>
                    <button data-del="" onClick={e=>{e.stopPropagation();deleteIdea(i.id);}}
                      style={{ background:"none",border:"none",color:C.muted,fontSize:14,lineHeight:1,padding:"0 2px",opacity:0,transition:"opacity 0.15s, color 0.15s",flexShrink:0 }}
                      onMouseEnter={e=>e.currentTarget.style.color=C.red}
                      onMouseLeave={e=>e.currentTarget.style.color=C.muted}>×</button>
                    <span data-arrow="" style={{ fontSize:10,color:C.faint,opacity:0,transition:"opacity 0.15s" }}>→</span>
                  </div>
                );
              })}
            </div>

            {/* Separator */}
            <div style={{ height:1,background:`linear-gradient(90deg,transparent,${C.border},transparent)`,margin:"0 10px" }}/>

            {/* Section nav */}
            <div style={{ borderTop:"none",padding:"6px 6px" }}>
              <div style={{ fontSize:8,color:C.faint,letterSpacing:"0.12em",padding:"4px 6px 6px" }}>SECTIONS</div>
              {sids.map((sid,i)=>{
                const s=SECS[sid]; const filled=idea.sections[sid]?.trim(); const active=i===secIdx;
                return(
                  <div key={sid} onClick={()=>goSec(i)}
                    style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:4,background:active?cfg.bg+"cc":"transparent",border:active?`1px solid ${cfg.b}`:"1px solid transparent",marginBottom:1,cursor:"pointer",transition:"all 0.15s" }}
                    onMouseEnter={e=>{ if(!active){e.currentTarget.style.background=C.faint+"33";e.currentTarget.style.transform="translateX(2px)";} }}
                    onMouseLeave={e=>{ if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.transform="translateX(0)";} }}>
                    <div style={{ width:5,height:5,borderRadius:"50%",flexShrink:0,background:filled?cfg.c:active?cfg.c+"44":C.faint }}/>
                    <span style={{ fontSize:11,color:active?cfg.c:filled?C.sub:C.muted,letterSpacing:"0.06em",flex:1 }}>{s.label}</span>
                    {filled&&<span style={{ fontSize:9,color:cfg.c+"88" }}>✓</span>}
                  </div>
                );
              })}
            </div>
          </>}

          {sideCollapsed&&(
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"10px 0",gap:8 }}>
              <button onClick={()=>setSideCollapsed(false)} style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:4,color:C.muted,fontSize:12,padding:"4px 0",width:28,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s" }}>›</button>
              <button onClick={addIdea} style={{ background:"none",border:`1px solid ${C.amberDim}`,borderRadius:4,color:C.amber,fontSize:11,padding:"4px 6px",transition:"all 0.15s" }}>+</button>
            </div>
          )}
        </div>

        {/* ── MAIN CANVAS ── */}
        <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:C.main,...gridBg }}>

          {/* Toolbar strip */}
          <div style={{ height:40,borderBottom:`1px solid ${C.border}`,background:C.bar+"cc",display:"flex",alignItems:"center",padding:"0 16px",gap:8,flexShrink:0 }}>

            {/* Section label in toolbar */}
            <span style={{ fontSize:10,fontWeight:700,color:C.muted,letterSpacing:"0.06em",marginRight:4 }}>{sec.label.toUpperCase()}</span>

            <div style={{ width:1,height:16,background:C.border,margin:"0 4px" }}/>

            {/* Tag selector */}
            <div style={{ position:"relative" }}>
              <button onClick={()=>{setShowTagMenu(p=>!p);setShowStatusMenu(false);}}
                style={{ background:idea.tag?cfg.bg:"none",border:`1px solid ${idea.tag?cfg.b:C.border}`,borderRadius:6,color:idea.tag?cfg.c:C.muted,fontSize:9,padding:"4px 10px",letterSpacing:"0.06em",display:"flex",alignItems:"center",gap:5,transition:"all 0.15s" }}>
                {idea.tag?<><div style={{ width:6,height:6,borderRadius:"50%",background:cfg.c }}/>{idea.tag}</>:"tag"}
                <span style={{ color:C.faint }}>▾</span>
              </button>
              {showTagMenu&&(
                <div style={{ position:"absolute",top:"110%",left:0,zIndex:100,background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:5,minWidth:200,overflow:"hidden" }}>
                  {[{k:"",l:"No tag"},...Object.keys(TAGS).filter(k=>k).map(k=>({k,l:k}))].map(({k,l})=>{
                    const c2=TAGS[k]||TAGS[""];
                    return(
                      <div key={k} onClick={()=>{upd({tag:k});setShowTagMenu(false);}}
                        style={{ display:"flex",alignItems:"flex-start",gap:8,padding:"8px 12px",cursor:"pointer",fontFamily:"'Geist Mono',monospace",fontSize:9,color:k?c2.c:C.muted,transition:"all 0.15s" }}
                        onMouseEnter={e=>e.currentTarget.style.background=C.side}
                        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        {k&&<div style={{ width:6,height:6,borderRadius:"50%",background:c2.c,flexShrink:0,marginTop:3 }}/>}
                        <div style={{ flex:1 }}>
                          <div>{l}</div>
                          {k&&<div style={{ fontSize:8,color:C.muted,marginTop:2 }}>{TAGS[k].desc}</div>}
                        </div>
                        {k&&<span style={{ color:C.faint,fontSize:8,marginTop:1 }}>{TAGS[k].s.length}s</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status */}
            <div style={{ position:"relative" }}>
              <button onClick={()=>{setShowStatusMenu(p=>!p);setShowTagMenu(false);}}
                style={{ background:"none",border:`1px solid ${STATUS_C[idea.status]||C.border}44`,borderRadius:6,color:STATUS_C[idea.status]||C.muted,fontSize:9,padding:"4px 10px",letterSpacing:"0.06em",display:"flex",alignItems:"center",gap:5,transition:"all 0.15s" }}>
                <div style={{ width:5,height:5,borderRadius:"50%",background:STATUS_C[idea.status]||C.muted }}/>
                {idea.status}<span style={{ color:C.faint }}>▾</span>
              </button>
              {showStatusMenu&&(
                <div style={{ position:"absolute",top:"110%",left:0,zIndex:100,background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:5,minWidth:140,overflow:"hidden" }}>
                  {STATUS.map(s=>(
                    <div key={s} onClick={()=>{upd({status:s});setShowStatusMenu(false);}}
                      style={{ padding:"8px 12px",cursor:"pointer",fontFamily:"'Geist Mono',monospace",fontSize:9,color:STATUS_C[s]||C.muted,display:"flex",alignItems:"center",gap:6,transition:"all 0.15s" }}
                      onMouseEnter={e=>e.currentTarget.style.background=C.side}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{ width:5,height:5,borderRadius:"50%",background:STATUS_C[s]||C.muted }}/>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex:1 }}/>

            {/* Progress dots */}
            <div style={{ display:"flex",gap:3,alignItems:"center" }}>
              {sids.map((s,i)=>(
                <div key={s} onClick={()=>goSec(i)} style={{ width:i===secIdx?20:6,height:6,borderRadius:3,background:i===secIdx?cfg.c:idea.sections[s]?.trim()?cfg.c+"55":C.faint,transition:"all 0.25s ease",cursor:"pointer" }}/>
              ))}
              <span style={{ fontSize:8,color:C.faint,marginLeft:4 }}>{fillCount}/{sids.length}</span>
            </div>

            {/* Copy to AI */}
            <button onClick={()=>setShowCopy(true)}
              style={{ background:cfg.bg,border:`1px solid ${cfg.b}`,color:cfg.c,fontSize:9,padding:"6px 16px",borderRadius:4,letterSpacing:"0.06em",display:"flex",alignItems:"center",gap:5,transition:"all 0.15s" }}>
              ⎘
              <span>copy to ai</span>
              {idea.tag&&<span style={{ background:cfg.c+"22",borderRadius:20,padding:"1px 8px",fontSize:8 }}>{idea.tag}</span>}
            </button>

            {/* Lock */}
            {!idea.locked
              ? <button onClick={()=>canLock&&upd({locked:true,status:"Blueprinted"})} style={{ background:canLock?cfg.bg:"none",border:`1px solid ${canLock?cfg.c:C.faint}`,color:canLock?cfg.c:C.faint,fontSize:9,padding:"4px 12px",borderRadius:4,letterSpacing:"0.06em",transition:"all 0.15s",animation:canLock?"pulseBorder 2s ease-in-out infinite":"none" }}>
                  {canLock?"◈ lock":`${Math.min(3,sids.length)-fillCount} more`}
                </button>
              : <div style={{ fontSize:9,color:C.amber,letterSpacing:"0.08em",display:"flex",alignItems:"center",gap:4 }}>
                  <span>◈</span><span>locked</span>
                  <button onClick={()=>upd({locked:false})} style={{ background:"none",border:`1px solid ${C.border}`,color:C.muted,fontSize:8,padding:"2px 6px",borderRadius:3,marginLeft:2,transition:"all 0.15s" }}>unlock</button>
                </div>
            }
          </div>

          {/* Writing area */}
          <div style={{ flex:1,overflowY:"auto",display:"flex",flexDirection:"column" }}>
            <div style={{ maxWidth:640,width:"100%",margin:"0 auto",padding:"56px 48px 80px",flex:1 }}>

              {/* Idea title */}
              <input value={idea.title} disabled={idea.locked}
                className={!idea.title?"pulse-title":""}
                onChange={e=>upd({title:e.target.value})}
                style={{ width:"100%",background:"transparent",border:"none",fontFamily:"'Lora',serif",fontSize:28,color:idea.title?C.text:C.muted,fontStyle:idea.title?"normal":"italic",caretColor:C.amber,marginBottom:32,letterSpacing:"0.02em",lineHeight:1.3 }}
                placeholder="Idea title..."/>

              {/* Section header */}
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
                <span style={{ fontSize:13,color:C.amberDim,letterSpacing:"0.1em",fontWeight:500 }}>{String(secIdx+1).padStart(2,"0")}</span>
                <span style={{ color:cfg.c,fontSize:12 }}>{sec.icon}</span>
                <span style={{ fontSize:10,color:cfg.c,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:700 }}>{sec.label}</span>
              </div>

              {/* Guide question */}
              <div style={{ fontFamily:"'Lora',serif",fontStyle:"italic",fontSize:22,color:C.guideText,lineHeight:1.7,marginBottom:24,letterSpacing:"0.01em" }}>
                {sec.guide}
              </div>

              {/* Gradient divider */}
              <div style={{ height:1,background:`linear-gradient(90deg,transparent,${C.border},transparent)`,marginBottom:22 }}/>

              {/* Text input area with dot grid watermark */}
              <div style={{ position:"relative",minHeight:160 }}>
                {/* Dot grid pattern */}
                <div style={{ position:"absolute",inset:0,backgroundImage:"radial-gradient(circle, #2a2520 1px, transparent 1px)",backgroundSize:"24px 24px",opacity:0.15,pointerEvents:"none",zIndex:0 }}/>

                {/* Empty state watermark */}
                {!val.trim()&&(
                  <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",fontSize:80,color:cfg.c,opacity:0.05,pointerEvents:"none",zIndex:0,lineHeight:1 }}>
                    {sec.icon}
                  </div>
                )}

                <GTA value={val} onChange={e=>updSec(e.target.value)} placeholder="Write freely..." disabled={idea.locked}/>
              </div>

              {val.trim()&&<div style={{ marginTop:10,fontSize:8,color:C.faint }}>{val.trim().split(/\s+/).filter(Boolean).length} words</div>}

              {/* Nav arrows — bottom right, smaller */}
              <div style={{ display:"flex",gap:6,marginTop:40,justifyContent:"flex-end" }}>
                <button onClick={()=>goSec(secIdx-1)} disabled={secIdx===0}
                  style={{ background:"none",border:`1px solid ${secIdx===0?C.faint:C.border}`,borderRadius:4,color:secIdx===0?C.faint:C.muted,fontSize:9,padding:"5px 12px",height:32,letterSpacing:"0.06em",transition:"all 0.15s" }}>← prev</button>
                <button onClick={()=>goSec(secIdx+1)} disabled={secIdx===sids.length-1}
                  style={{ background:"none",border:`1px solid ${secIdx===sids.length-1?C.faint:C.border}`,borderRadius:4,color:secIdx===sids.length-1?C.faint:C.muted,fontSize:9,padding:"5px 12px",height:32,letterSpacing:"0.06em",transition:"all 0.15s" }}>next →</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — idea meta ── */}
        <div style={{ width:180,flexShrink:0,borderLeft:`1px solid ${C.border}`,background:C.side,display:"flex",flexDirection:"column",padding:"14px 12px",gap:14 }}>

          <div>
            <div style={{ fontSize:10,color:C.faint,letterSpacing:"0.06em",marginBottom:8 }}>BLUEPRINT INFO</div>
            <div style={{ fontSize:9,color:C.muted,marginBottom:3 }}>Created</div>
            <div style={{ fontSize:10,color:C.sub }}>{new Date(idea.created).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div>
          </div>

          <div style={{ height:1,background:C.border }}/>

          <div>
            <div style={{ fontSize:9,color:C.muted,marginBottom:6 }}>Fill progress</div>
            <div style={{ height:3,background:C.faint,borderRadius:2,overflow:"hidden",marginBottom:5,position:"relative" }}>
              <div style={{ height:"100%",background:cfg.c,width:`${(fillCount/sids.length)*100}%`,transition:"width 0.4s",borderRadius:2,boxShadow:`0 0 8px ${cfg.c}66` }}/>
            </div>
            <div style={{ fontSize:8,color:cfg.c }}>{fillCount}/{sids.length} sections</div>
            {/* Blueprint score */}
            <div style={{ marginTop:6,fontSize:9,color:C.sub,display:"flex",alignItems:"center",gap:4 }}>
              <span style={{ fontWeight:500,color:fillCount===sids.length?C.green:cfg.c }}>{fillCount}/{sids.length}</span>
              <span style={{ color:C.muted,fontSize:8 }}>blueprint score</span>
            </div>
          </div>

          <div style={{ height:1,background:C.border }}/>

          <div>
            <div style={{ fontSize:10,color:C.faint,letterSpacing:"0.06em",marginBottom:8 }}>SECTIONS</div>
            {sids.map((sid,i)=>{
              const filled=idea.sections[sid]?.trim();
              const active=i===secIdx;
              return(
                <div key={sid} onClick={()=>goSec(i)}
                  style={{ display:"flex",alignItems:"center",gap:6,padding:"4px 6px",borderRadius:3,cursor:"pointer",marginBottom:2,background:active?cfg.bg:"transparent",borderLeft:active?`2px solid ${cfg.c}`:"2px solid transparent",transition:"all 0.15s" }}
                  onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=C.faint+"33"; }}
                  onMouseLeave={e=>{ if(!active) e.currentTarget.style.background=active?cfg.bg:"transparent"; }}>
                  <div style={{ width:4,height:4,borderRadius:"50%",flexShrink:0,background:filled?cfg.c:active?cfg.c+"44":C.faint }}/>
                  <span style={{ fontSize:9,color:active?cfg.c:filled?C.sub:C.muted,letterSpacing:"0.06em" }}>{SECS[sid].label}</span>
                </div>
              );
            })}
          </div>

          <div style={{ height:1,background:C.border }}/>

          {/* Word counts with progress bars */}
          <div>
            <div style={{ fontSize:10,color:C.faint,letterSpacing:"0.06em",marginBottom:8 }}>WORD COUNT</div>
            {sids.map((sid,i)=>{
              const w=wordCounts[i];
              return w>0?(
                <div key={sid} style={{ marginBottom:5 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:2 }}>
                    <span style={{ fontSize:9,color:C.muted }}>{SECS[sid].label}</span>
                    <span style={{ fontSize:9,color:C.sub }}>{w}w</span>
                  </div>
                  <div style={{ height:2,background:C.faint,borderRadius:1,overflow:"hidden" }}>
                    <div style={{ height:"100%",background:cfg.c+"66",width:`${Math.min(100,(w/maxWords)*100)}%`,borderRadius:1,transition:"width 0.3s" }}/>
                  </div>
                </div>
              ):null;
            })}
          </div>

          <div style={{ flex:1 }}/>

          {/* Keyboard shortcuts */}
          <div style={{ borderTop:`1px solid ${C.border}`,paddingTop:12 }}>
            <div style={{ fontSize:10,color:C.faint,letterSpacing:"0.06em",marginBottom:8 }}>SHORTCUTS</div>
            {[["⌘K","Command palette"],["⌘N","New blueprint"],["⌘↵","Next section"]].map(([k,l])=>(
              <div key={k} style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                <span style={{ fontSize:8,color:C.muted }}>{l}</span>
                <span style={{ fontSize:8,color:C.amberDim,background:C.amberBg,padding:"1px 5px",borderRadius:3 }}>{k}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <div style={{ height:24,background:C.bar,borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 14px",gap:16,flexShrink:0,position:"relative" }}>
        {/* Faint amber top gradient line */}
        <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${C.amber}1a,transparent)` }}/>
        <span style={{ fontSize:8,color:C.amberDim,letterSpacing:"0.1em" }}>TEMUS</span>
        <span style={{ fontSize:8,color:C.faint }}>·</span>
        <span style={{ fontSize:8,color:STATUS_C[idea.status]||C.muted,letterSpacing:"0.06em" }}>{idea.status}</span>
        {idea.tag&&<><span style={{ fontSize:8,color:C.faint }}>·</span><span style={{ fontSize:8,color:cfg.c }}>{idea.tag}</span></>}
        <span style={{ fontSize:8,color:C.faint }}>·</span>
        <span style={{ fontSize:8,color:C.muted }}>{SECS[secId]?.label}</span>
        <div style={{ flex:1 }}/>
        <span style={{ fontSize:8,color:C.faint,display:"flex",alignItems:"center",gap:4 }}>
          <span style={{ display:"inline-block",width:5,height:5,borderRadius:"50%",background:C.green,animation:"pulseGreenDot 2s ease-in-out infinite" }}/>
          auto-saved
        </span>
        {idea.locked&&<><span style={{ fontSize:8,color:C.faint }}>·</span><span style={{ fontSize:8,color:C.amber }}>◈ locked</span></>}
        <span style={{ fontSize:8,color:C.faint }}>·</span>
        <span style={{ fontSize:8,color:C.muted }}>{totalWords}w total</span>
      </div>

      {/* ── COMMAND PALETTE ── */}
      {cmdOpen&&(
        <div onClick={e=>{ if(e.target===e.currentTarget){setCmdOpen(false);setCmdQ("");} }}
          style={{ position:"absolute",inset:0,zIndex:300,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:80 }}>
          <div style={{ width:480,background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:8,overflow:"hidden" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:`1px solid ${C.border}` }}>
              <span style={{ color:C.muted,fontSize:12 }}>⌘</span>
              <input autoFocus value={cmdQ} onChange={e=>setCmdQ(e.target.value)}
                placeholder="Search or run a command..."
                style={{ flex:1,background:"transparent",border:"none",color:C.text,fontSize:14,fontFamily:"'Geist Mono',monospace",letterSpacing:"0.04em" }}/>
              <span style={{ fontSize:9,color:C.faint,padding:"2px 6px",border:`1px solid ${C.border}`,borderRadius:3 }}>esc</span>
            </div>
            <div style={{ padding:6,maxHeight:360,overflowY:"auto" }}>
              {cmdGroups.map(({group,items})=>{
                const filtered=items.filter(c=>!cmdQ||c.label.toLowerCase().includes(cmdQ.toLowerCase()));
                if(filtered.length===0) return null;
                return(
                  <div key={group}>
                    <div style={{ fontSize:8,color:C.faint,letterSpacing:"0.12em",padding:"8px 12px 4px" }}>{group}</div>
                    {filtered.map((c,i)=>(
                      <div key={i} onClick={c.action}
                        style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",borderRadius:5,cursor:"pointer",fontSize:11,color:C.text,borderLeft:"2px solid transparent",transition:"all 0.15s" }}
                        onMouseEnter={e=>{e.currentTarget.style.background=C.amberBg;e.currentTarget.style.borderLeftColor=C.amber;}}
                        onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderLeftColor="transparent";}}>
                        <span>{c.label}</span>
                        {c.key&&<span style={{ fontSize:9,color:C.amberDim,background:C.amberBg,padding:"2px 7px",borderRadius:3,border:`1px solid ${C.amberDim}44` }}>{c.key}</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Copy drawer */}
      {showCopy&&<CopyDrawer idea={idea} onClose={()=>setShowCopy(false)}/>}
    </div>
  );
}
