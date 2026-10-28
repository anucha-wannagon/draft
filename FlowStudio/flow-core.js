/* flow-core.js - FlowStudio rev 4 (28 ต.ค. 2569) - PPT-style compact properties, draggable connectors/labels, subtitle size, persistent save handle
   โปรแกรมวาดผังกระบวนการและผังบทบาท: แก้ไขบน canvas (เมาส์ / S Pen / นิ้ว) · ไฟล์ .flow.json รูปแบบเดียว
   ส่งออก pptx (รูปทรงแก้ได้) / png / svg / pdf / html / Obsidian .canvas · ใช้ธีมบ้าน 3 ชุดจาก hd-theme.css */
(function(G){"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Math.random().toString(36).slice(2,10);
const COLORS=["c-primary","c-navy","c-sky","c-green","c-yellow","c-orange","c-red","c-brown","c-purple","c-pink","c-grey"];
const COLOR_TH={"c-primary":"Blue","c-navy":"Navy","c-sky":"Sky","c-green":"Green","c-yellow":"Yellow","c-orange":"Orange","c-red":"Red","c-brown":"Brown","c-purple":"Purple","c-pink":"Pink","c-grey":"Grey"};
const SHAPES={rect:"Process",round:"Rounded box",capsule:"Start / End",diamond:"Decision",circle:"Connector",doc:"Document",note:"Note",lane:"Group / Lane"};
const cv=c=>c&&c.startsWith("c-")?`var(--${c})`:(c||"var(--c-primary)");
const hex=c=>{const v=getComputedStyle(document.documentElement).getPropertyValue("--"+c).trim();return v||"#0077B6"};
const GRID=20, snap=v=>Math.round(v/GRID)*GRID;

/* ---------- เอกสาร ---------- */
function blank(title){return {v:1,title:title||"Untitled",w:1600,h:1000,grid:true,nodes:[],edges:[],ink:[],meta:{created:new Date().toISOString()}}}
const S={doc:blank(),sel:new Set(),selEdge:null,selInk:null,pen:{color:"c-red",w:3},tool:"select",zoom:1,pan:{x:0,y:0},undo:[],redo:[],handle:null,fileName:null,dirty:false,clip:null};
G.FS_STATE=S;
const node=id=>S.doc.nodes.find(n=>n.id===id);
const edge=id=>S.doc.edges.find(e=>e.id===id);
function pushUndo(){S.undo.push(JSON.stringify(S.doc));if(S.undo.length>120)S.undo.shift();S.redo=[];S.dirty=true;autosave()}
function undo(){if(!S.undo.length)return;S.redo.push(JSON.stringify(S.doc));S.doc=JSON.parse(S.undo.pop());S.sel.clear();S.selEdge=null;draw();props();msg("Undo")}
function redo(){if(!S.redo.length)return;S.undo.push(JSON.stringify(S.doc));S.doc=JSON.parse(S.redo.pop());S.sel.clear();S.selEdge=null;draw();props();msg("Redo")}
function autosave(){try{localStorage.setItem("flowstudio_auto",JSON.stringify({at:Date.now(),name:S.fileName,doc:S.doc}))}catch(e){}}
function load(doc,name){S.autofit=true;S.doc=migrate(doc);S.fileName=name||null;S.sel.clear();S.selEdge=null;S.selInk=null;S.undo=[];S.redo=[];S.dirty=false;if(document.getElementById("fsSvg")){draw();props();fit()}autosave()}
function migrate(d){d=d||{};const o=blank(d.title);Object.assign(o,d);o.nodes=(o.nodes||[]).map(n=>Object.assign({id:uid(),type:"rect",x:0,y:0,w:200,h:90,text:"",color:"c-primary",fill:"tint"},n));
  o.edges=(o.edges||[]).map(e=>Object.assign({id:uid(),head:"end",route:"ortho",color:"c-navy",label:""},e));o.ink=(o.ink||[]).map(k=>Object.assign({id:uid(),color:"c-red",w:3,pts:[]},k));return o}

/* ---------- เรขาคณิต ---------- */
function anchor(n,side,pos){pos=pos==null?0.5:pos;const x=n.x,y=n.y,w=n.w,h=n.h;
  if(side==="top")return{x:x+w*pos,y:y,dx:0,dy:-1};if(side==="bottom")return{x:x+w*pos,y:y+h,dx:0,dy:1};
  if(side==="left")return{x:x,y:y+h*pos,dx:-1,dy:0};return{x:x+w,y:y+h*pos,dx:1,dy:0}}
function autoSides(a,b){const ax=a.x+a.w/2,ay=a.y+a.h/2,bx=b.x+b.w/2,by=b.y+b.h/2,dx=bx-ax,dy=by-ay;
  if(Math.abs(dx)>Math.abs(dy))return dx>0?["right","left"]:["left","right"];return dy>0?["bottom","top"]:["top","bottom"]}
function endPt(ep){if(ep.node){const n=node(ep.node);if(!n)return null;return anchor(n,ep.side||"right",ep.pos)}return{x:ep.x,y:ep.y,dx:0,dy:0}}
function routePts(e){const a=endPt(e.from),b=endPt(e.to);if(!a||!b)return null;
  if(e.route==="straight")return[a,b];
  const st=28,p2={x:a.x+a.dx*st,y:a.y+a.dy*st},q2={x:b.x+b.dx*st,y:b.y+b.dy*st};
  if(e.via&&e.via.length){const pts=[a,p2];let prev=p2;e.via.forEach(v=>{if(v.x!==prev.x&&v.y!==prev.y)pts.push(a.dx!==0&&prev===p2?{x:v.x,y:prev.y}:{x:prev.x,y:v.y});pts.push(v);prev=v});
    if(q2.x!==prev.x&&q2.y!==prev.y)pts.push(b.dx!==0?{x:prev.x,y:q2.y}:{x:q2.x,y:prev.y});pts.push(q2,b);return pts.filter((p,i)=>i===0||p.x!==pts[i-1].x||p.y!==pts[i-1].y)}
  const aH=a.dx!==0,bH=b.dx!==0,pts=[a,p2];
  if(aH&&bH){if(a.dx!==b.dx){const mx=e.mid!=null?e.mid:(p2.x+q2.x)/2;pts.push({x:mx,y:p2.y},{x:mx,y:q2.y})}else{const mx=a.dx>0?Math.max(p2.x,q2.x):Math.min(p2.x,q2.x);pts.push({x:mx,y:p2.y},{x:mx,y:q2.y})}}
  else if(!aH&&!bH){if(a.dy!==b.dy){const my=e.mid!=null?e.mid:(p2.y+q2.y)/2;pts.push({x:p2.x,y:my},{x:q2.x,y:my})}else{const my=a.dy>0?Math.max(p2.y,q2.y):Math.min(p2.y,q2.y);pts.push({x:p2.x,y:my},{x:q2.x,y:my})}}
  else if(aH&&!bH){pts.push({x:q2.x,y:p2.y})}else{pts.push({x:p2.x,y:q2.y})}
  pts.push(q2,b);return pts.filter((p,i)=>i===0||p.x!==pts[i-1].x||p.y!==pts[i-1].y)}
function midOf(pts,f){let L=0;const seg=[];for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);seg.push(d);L+=d}
  let t=L*(f==null?0.5:f);for(let i=0;i<seg.length;i++){if(t<=seg[i]){const r=seg[i]?t/seg[i]:0;return{x:pts[i].x+(pts[i+1].x-pts[i].x)*r,y:pts[i].y+(pts[i+1].y-pts[i].y)*r}}t-=seg[i]}return pts[0]}
function shapePath(n){const{x,y,w,h}=n;
  if(n.type==="diamond")return`M${x+w/2} ${y} L${x+w} ${y+h/2} L${x+w/2} ${y+h} L${x} ${y+h/2} Z`;
  if(n.type==="doc"){const c=h*0.18;return`M${x} ${y} H${x+w} V${y+h-c} Q${x+w*0.75} ${y+h-c*2.2} ${x+w/2} ${y+h-c} Q${x+w*0.25} ${y+h+c*0.3} ${x} ${y+h-c} Z`}
  return null}
function rx(n){if(n.type==="capsule")return Math.min(n.w,n.h)/2;if(n.type==="round"||n.type==="note"||n.type==="lane")return 12;if(n.type==="circle")return Math.min(n.w,n.h)/2;return 2}

/* ---------- วาด ---------- */
function fillOf(n){const c=cv(n.color);if(n.fill==="solid")return c;if(n.fill==="white")return"var(--card)";if(n.type==="lane")return`color-mix(in srgb,${c} 7%,var(--card))`;return`color-mix(in srgb,${c} 14%,white)`}
function nodeSvg(n){const c=cv(n.color),dk=n.fill==="solid"&&n.color!=="c-yellow",sel=S.sel.has(n.id);
  const dash=n.dash?'stroke-dasharray="8 6"':"",sw=n.type==="lane"?1.5:2,p=shapePath(n);
  const shape=p?`<path d="${p}" fill="${fillOf(n)}" stroke="${c}" stroke-width="${sw}" ${dash}/>`:`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${rx(n)}" fill="${fillOf(n)}" stroke="${c}" stroke-width="${sw}" ${dash}/>`;
  const pad=n.type==="diamond"?{x:n.w*0.18,y:n.h*0.18}:{x:0,y:0};
  const txt=`<foreignObject x="${n.x+pad.x}" y="${n.y+pad.y}" width="${n.w-pad.x*2}" height="${n.h-pad.y*2}" style="pointer-events:none"><div xmlns="http://www.w3.org/1999/xhtml" class="fs-node ${n.type} ${dk?"dk":""}" style="font-size:${n.font||16}px">${n.icon?icon(n.icon,dk?"#fff":c):""}<span><b>${esc(n.text)}</b>${n.sub?`<small style="font-size:${n.subFont||Math.max(10,(n.font||16)-2)}px">${esc(n.sub)}</small>`:""}</span></div></foreignObject>`;
  let g=`<g class="n" data-id="${n.id}" style="cursor:move">${shape}${txt}</g>`;
  if(sel){g+=`<rect class="fs-sel" x="${n.x-4}" y="${n.y-4}" width="${n.w+8}" height="${n.h+8}" rx="6"/>`;
    g+=`<rect class="fs-handle" data-h="${n.id}" x="${n.x+n.w-7}" y="${n.y+n.h-7}" width="14" height="14" rx="3"/>`;
    if(S.sel.size===1)["top","right","bottom","left"].forEach(s=>{const a=anchor(n,s);g+=`<circle class="fs-port" data-port="${n.id}" data-side="${s}" cx="${a.x}" cy="${a.y}" r="7"/>`})}
  return g}
const ICONS={factory:'<path d="M3 21V10l5 3V10l5 3V6l8 4v11z"/>',lab:'<path d="M9 3h6M10 3v6L4 20h16l-6-11V3"/>',gov:'<path d="M3 21h18M5 21V10M19 21V10M3 10l9-6 9 6M9 21v-7h6v7"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',doc:'<path d="M6 3h8l4 4v14H6z M14 3v4h4"/>',truck:'<path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',recycle:'<path d="M7 19l-3-5 3-5M4 14h8M17 5l3 5-3 5M20 10h-8M12 3l2 4M12 21l-2-4"/>',check:'<path d="M4 12l5 5L20 7"/>',flag:'<path d="M5 21V4h12l-2 4 2 4H5"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',coin:'<circle cx="12" cy="12" r="8"/><path d="M9 10h6M9 14h6"/>',alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v1"/>',db:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/>',leaf:'<path d="M4 20c0-9 6-15 16-16-1 10-7 16-16 16z"/><path d="M4 20l9-9"/>'};
const icon=(k,c)=>ICONS[k]?`<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" style="stroke:${c};flex:none;margin-right:8px" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`:"";
function nearestT(pts,p){let L=0,best=0,bd=1e18,acc=0;const seg=[];for(let i=1;i<pts.length;i++){seg.push(Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y));L+=seg[i-1]}
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;let r=l2?((p.x-a.x)*dx+(p.y-a.y)*dy)/l2:0;r=Math.max(0,Math.min(1,r));const q={x:a.x+dx*r,y:a.y+dy*r},d=Math.hypot(p.x-q.x,p.y-q.y);if(d<bd){bd=d;best=(acc+seg[i-1]*r)/(L||1)}acc+=seg[i-1]}return Math.max(0.05,Math.min(0.95,best))}
function edgeSvg(e){const pts=routePts(e);if(!pts)return"";const c=cv(e.color),d=pts.map((p,i)=>(i?"L":"M")+p.x+" "+p.y).join(" "),sel=S.selEdge===e.id;
  const mk=`url(#ah-${e.id})`,start=e.head==="both"?`marker-start="url(#as-${e.id})"`:"",end=e.head==="none"?"":`marker-end="${mk}"`;
  let g=`<defs><marker id="ah-${e.id}" orient="auto" markerWidth="10" markerHeight="10" refX="8" refY="5" markerUnits="userSpaceOnUse"><path d="M0 0 L10 5 L0 10 Z" fill="${c}"/></marker><marker id="as-${e.id}" orient="auto" markerWidth="10" markerHeight="10" refX="2" refY="5" markerUnits="userSpaceOnUse"><path d="M10 0 L0 5 L10 10 Z" fill="${c}"/></marker></defs>`;
  g+=`<path d="${d}" fill="none" stroke="${c}" stroke-width="${e.width||2.5}" ${e.dash?'stroke-dasharray="8 6"':""} stroke-linejoin="round" ${start} ${end}/>`;
  g+=`<path class="fs-edge-hit" data-e="${e.id}" d="${d}"/>`;
  if(e.label){const m=midOf(pts,e.lpos),fs=e.lfont||14,w=e.label.length*fs*0.6+14,h=fs+8;g+=`<rect class="fs-elabelbg" data-elabel="${e.id}" x="${m.x-w/2}" y="${m.y-h/2}" width="${w}" height="${h}" style="cursor:move"/><text class="fs-elabel" data-elabel="${e.id}" x="${m.x}" y="${m.y+fs*0.35}" text-anchor="middle" style="font-size:${fs}px;cursor:move">${esc(e.label)}</text>`}
  if(sel){g+=`<path d="${d}" fill="none" stroke="var(--c-primary)" stroke-width="6" opacity=".25"/>`;pts.forEach((p,i)=>{if(i===0||i===pts.length-1)g+=`<circle class="fs-port" data-eend="${e.id}" data-k="${i?"to":"from"}" cx="${p.x}" cy="${p.y}" r="7"/>`})}
  return`<g class="e">${g}</g>`}
const inkD=k=>k.pts.map((p,i)=>(i?"L":"M")+p[0]+" "+p[1]).join(" ");
function inkSvg(k){if(!k.pts||k.pts.length<1)return"";const d=k.pts.length===1?inkD(k)+" l0.1 0":inkD(k),c=cv(k.color),sel=S.selInk===k.id;
  return`<g class="k">${sel?`<path d="${d}" fill="none" stroke="var(--c-primary)" stroke-width="${(k.w||3)+8}" opacity=".25" stroke-linecap="round" stroke-linejoin="round"/>`:""}<path data-ink="${k.id}" d="${d}" fill="none" stroke="${c}" stroke-width="${k.w||3}" stroke-linecap="round" stroke-linejoin="round" style="cursor:pointer"/></g>`}
function draw(){const svg=document.getElementById("fsSvg");if(!svg)return;const d=S.doc;
  const vb=`${-S.pan.x/S.zoom} ${-S.pan.y/S.zoom} ${svg.clientWidth/S.zoom} ${svg.clientHeight/S.zoom}`;svg.setAttribute("viewBox",vb);
  let g="";if(d.grid){g+='<g class="fs-grid">';for(let x=0;x<=d.w;x+=GRID*5)g+=`<line x1="${x}" y1="0" x2="${x}" y2="${d.h}"/>`;for(let y=0;y<=d.h;y+=GRID*5)g+=`<line x1="0" y1="${y}" x2="${d.w}" y2="${y}"/>`;g+="</g>"}
  g+=`<rect x="0" y="0" width="${d.w}" height="${d.h}" fill="none" stroke="var(--line)" stroke-width="1.5"/>`;
  const lanes=d.nodes.filter(n=>n.type==="lane"),others=d.nodes.filter(n=>n.type!=="lane");
  g+=lanes.map(nodeSvg).join("");g+=d.edges.map(edgeSvg).join("");g+=others.map(nodeSvg).join("");g+=(d.ink||[]).map(inkSvg).join("");
  if(S.marq){const m=S.marq;g+=`<rect class="fs-marquee" x="${Math.min(m.x0,m.x1)}" y="${Math.min(m.y0,m.y1)}" width="${Math.abs(m.x1-m.x0)}" height="${Math.abs(m.y1-m.y0)}"/>`}
  if(S.link){g+=`<path d="M${S.link.x0} ${S.link.y0} L${S.link.x1} ${S.link.y1}" stroke="var(--c-primary)" stroke-width="2" stroke-dasharray="6 4" fill="none"/>`}
  svg.innerHTML=g;const st=document.getElementById("fsStatus");if(st)st.textContent=`${d.title} · ${d.nodes.length} shapes · ${d.edges.length} connectors${S.dirty?" · unsaved":""}`;const zv=document.getElementById("fsZoom");if(zv)zv.textContent=Math.round(S.zoom*100)+"%";scrollbars()}
function fit(){const svg=document.getElementById("fsSvg");if(!svg)return;S.autofit=true;const b=bounds(),W=svg.clientWidth,H=svg.clientHeight,z=Math.min(W/(b.w+40),H/(b.h+40),1.5);S.zoom=z;S.pan={x:(W-b.w*z)/2-b.x*z,y:(H-b.h*z)/2-b.y*z};draw()}
function zoomAt(f,cx,cy){S.autofit=false;const z=Math.max(.2,Math.min(4,S.zoom*f));S.pan.x=cx-(cx-S.pan.x)*z/S.zoom;S.pan.y=cy-(cy-S.pan.y)*z/S.zoom;S.zoom=z;draw()}
/* ---------- scrollbars (shown when the drawing extends beyond the view) ---------- */
function extent(){const svg=document.getElementById("fsSvg"),b=bounds(),z=S.zoom,W=svg.clientWidth,H=svg.clientHeight;
  return{W,H,x0:Math.min(b.x*z+S.pan.x-40,0),x1:Math.max((b.x+b.w)*z+S.pan.x+40,W),y0:Math.min(b.y*z+S.pan.y-40,0),y1:Math.max((b.y+b.h)*z+S.pan.y+40,H)}}
function scrollbars(){const v=document.getElementById("fsSbV"),h=document.getElementById("fsSbH");if(!v||!h)return;const e=extent();
  const tw=e.x1-e.x0,th=e.y1-e.y0;h.hidden=tw<=e.W+2;v.hidden=th<=e.H+2;
  if(!h.hidden){const T=h.clientWidth,w=Math.max(40,e.W/tw*T);h.firstElementChild.style.width=w+"px";h.firstElementChild.style.left=((0-e.x0)/tw*(T))+"px";h.firstElementChild.style.maxWidth=T+"px"}
  if(!v.hidden){const T=v.clientHeight,hh=Math.max(40,e.H/th*T);v.firstElementChild.style.height=hh+"px";v.firstElementChild.style.top=((0-e.y0)/th*(T))+"px"}}
function bindScroll(el,axis){let st=null;el.addEventListener("pointerdown",ev=>{ev.preventDefault();el.setPointerCapture(ev.pointerId);const e=extent(),thumb=el.firstElementChild,r=thumb.getBoundingClientRect(),on=axis==="x"?(ev.clientX>=r.left&&ev.clientX<=r.right):(ev.clientY>=r.top&&ev.clientY<=r.bottom);
    S.autofit=false;if(!on){const tr=el.getBoundingClientRect();if(axis==="x"){const f=(ev.clientX-tr.left)/tr.width;S.pan.x-= (e.x0+f*(e.x1-e.x0)-e.W/2) }else{const f=(ev.clientY-tr.top)/tr.height;S.pan.y-=(e.y0+f*(e.y1-e.y0)-e.H/2)}draw()}
    st={x:ev.clientX,y:ev.clientY,pan:{...S.pan},e:extent(),T:axis==="x"?el.clientWidth:el.clientHeight};el.classList.add("drag")});
  el.addEventListener("pointermove",ev=>{if(!st)return;const e=st.e;if(axis==="x")S.pan.x=st.pan.x-(ev.clientX-st.x)*(e.x1-e.x0)/st.T;else S.pan.y=st.pan.y-(ev.clientY-st.y)*(e.y1-e.y0)/st.T;draw()});
  const up=()=>{st=null;el.classList.remove("drag")};el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up)}
let msgT;function msg(t,bad){const m=document.getElementById("fsMsg");if(!m)return;m.textContent=t;m.style.background=bad?"var(--c-red)":"var(--c-green)";m.style.display="block";clearTimeout(msgT);msgT=setTimeout(()=>m.style.display="none",2600)}

/* ---------- การโต้ตอบ (pointer events รองรับ เมาส์ นิ้ว S Pen) ---------- */
function toDoc(ev){const svg=document.getElementById("fsSvg"),r=svg.getBoundingClientRect();return{x:(ev.clientX-r.left-S.pan.x)/S.zoom,y:(ev.clientY-r.top-S.pan.y)/S.zoom}}
const ptrs=new Map();let drag=null,pinch=null;
function bind(svg){
  svg.addEventListener("pointerdown",ev=>{ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});svg.setPointerCapture(ev.pointerId);
    if(ptrs.size===2){const a=[...ptrs.values()];pinch={d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),z:S.zoom,cx:(a[0].x+a[1].x)/2,cy:(a[0].y+a[1].y)/2,pan:{...S.pan}};drag=null;return}
    const p=toDoc(ev),t=ev.target,r=svg.getBoundingClientRect();
    if(S.tool==="pan"||ev.button===1||S.space){S.autofit=false;drag={k:"pan",sx:ev.clientX,sy:ev.clientY,pan:{...S.pan}};return}
    if(S.tool==="pen"){pushUndo();const k={id:uid(),color:S.pen.color,w:S.pen.w,pts:[[Math.round(p.x*10)/10,Math.round(p.y*10)/10]]};S.doc.ink.push(k);S.sel.clear();S.selEdge=null;S.selInk=null;drag={k:"ink",s:k};return}
    if(S.tool==="eraser"){drag={k:"erase",pushed:false};eraseAt(ev,drag);return}
    if(t.dataset.ink){S.sel.clear();S.selEdge=null;S.selInk=t.dataset.ink;draw();props();return}
    if(t.dataset.h){const n=node(t.dataset.h);pushUndo();drag={k:"resize",n,x:p.x,y:p.y,w:n.w,h:n.h};return}
    if(t.dataset.port){drag={k:"link",from:t.dataset.port,side:t.dataset.side};S.link={x0:p.x,y0:p.y,x1:p.x,y1:p.y};return}
    if(t.dataset.eend){const e=edge(t.dataset.eend);pushUndo();drag={k:"eend",e,which:t.dataset.k};return}
    if(t.dataset.elabel){const e=edge(t.dataset.elabel);S.sel.clear();S.selInk=null;S.selEdge=e.id;drag={k:"elabel",e,pushed:false};draw();props();return}
    if(t.dataset.e){const e=edge(t.dataset.e);S.sel.clear();S.selInk=null;S.selEdge=e.id;drag={k:"evia",e,pushed:false,moved:false,x:p.x,y:p.y};draw();props();return}
    const g=t.closest&&t.closest("g.n");
    if(S.tool!=="select"&&S.tool!=="pan"&&S.tool!=="connect"&&!g){addNode(S.tool,snap(p.x-100),snap(p.y-45));return}
    if(S.tool==="connect"&&g){drag={k:"link",from:g.dataset.id};S.link={x0:p.x,y0:p.y,x1:p.x,y1:p.y};return}
    if(g){const id=g.dataset.id;if(ev.shiftKey){S.sel.has(id)?S.sel.delete(id):S.sel.add(id)}else if(!S.sel.has(id)){S.sel.clear();S.sel.add(id)}S.selEdge=null;S.selInk=null;
      const n=node(id);const kids=n.type==="lane"&&!ev.altKey?S.doc.nodes.filter(m=>m.type!=="lane"&&m.x>=n.x&&m.y>=n.y&&m.x+m.w<=n.x+n.w&&m.y+m.h<=n.y+n.h).map(m=>m.id):[];
      drag={k:"move",x:p.x,y:p.y,ids:[...new Set([...S.sel,...kids])],start:{},moved:false};drag.ids.forEach(i=>{const m=node(i);drag.start[i]={x:m.x,y:m.y}});draw();props();return}
    if(!ev.shiftKey){S.sel.clear();S.selEdge=null;S.selInk=null}S.marq={x0:p.x,y0:p.y,x1:p.x,y1:p.y};drag={k:"marq"};draw();props()});
  svg.addEventListener("pointermove",ev=>{if(ptrs.has(ev.pointerId))ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
    if(pinch&&ptrs.size===2){const a=[...ptrs.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2,r=svg.getBoundingClientRect();
      const z=Math.max(.2,Math.min(4,pinch.z*d/pinch.d));S.zoom=z;S.pan.x=pinch.pan.x+(cx-pinch.cx)+((cx-r.left)-pinch.pan.x)*(1-z/pinch.z);S.pan.y=pinch.pan.y+(cy-pinch.cy)+((cy-r.top)-pinch.pan.y)*(1-z/pinch.z);draw();return}
    if(!drag)return;const p=toDoc(ev);
    if(drag.k==="pan"){S.pan={x:drag.pan.x+ev.clientX-drag.sx,y:drag.pan.y+ev.clientY-drag.sy};draw()}
    else if(drag.k==="ink"){const q=drag.s.pts[drag.s.pts.length-1],x=Math.round(p.x*10)/10,y=Math.round(p.y*10)/10;if(Math.hypot(x-q[0],y-q[1])>=1.5/S.zoom){drag.s.pts.push([x,y]);draw()}}
    else if(drag.k==="erase"){eraseAt(ev,drag)}
    else if(drag.k==="elabel"){if(!drag.pushed){pushUndo();drag.pushed=true}const pts=routePts(drag.e);if(pts){drag.e.lpos=Math.round(nearestT(pts,p)*100)/100;draw()}}
    else if(drag.k==="evia"){if(Math.hypot(p.x-drag.x,p.y-drag.y)<4/S.zoom&&!drag.moved)return;drag.moved=true;if(!drag.pushed){pushUndo();drag.pushed=true}drag.e.via=[{x:snap(p.x),y:snap(p.y)}];draw()}
    else if(drag.k==="move"){const dx=snap(p.x-drag.x),dy=snap(p.y-drag.y);if(dx||dy)drag.moved=true;if(!drag.pushed&&drag.moved){pushUndo();drag.pushed=true}drag.ids.forEach(i=>{const m=node(i),s=drag.start[i];m.x=s.x+dx;m.y=s.y+dy});draw()}
    else if(drag.k==="resize"){drag.n.w=Math.max(40,snap(drag.w+p.x-drag.x));drag.n.h=Math.max(30,snap(drag.h+p.y-drag.y));draw()}
    else if(drag.k==="link"){S.link.x1=p.x;S.link.y1=p.y;draw()}
    else if(drag.k==="eend"){const g=document.elementFromPoint(ev.clientX,ev.clientY),gg=g&&g.closest&&g.closest("g.n");const ep=gg?{node:gg.dataset.id}:{x:snap(p.x),y:snap(p.y)};
      if(gg){const n=node(gg.dataset.id),o=drag.which==="from"?endPt(drag.e.to):endPt(drag.e.from);ep.side=o?autoSides(n,{x:o.x,y:o.y,w:0,h:0})[0]:"right"}drag.e[drag.which]=ep;draw()}
    else if(drag.k==="marq"){S.marq.x1=p.x;S.marq.y1=p.y;draw()}});
  const up=ev=>{ptrs.delete(ev.pointerId);if(ptrs.size<2)pinch=null;if(!drag)return;const p=toDoc(ev);
    if(drag.k==="ink"){if(drag.s.pts.length<2)drag.s.pts.push([drag.s.pts[0][0]+0.5,drag.s.pts[0][1]]);S.dirty=true;autosave()}
    if(drag.k==="link"){const g=document.elementFromPoint(ev.clientX,ev.clientY),gg=g&&g.closest&&g.closest("g.n");S.link=null;
      if(gg&&gg.dataset.id!==drag.from){pushUndo();const a=node(drag.from),b=node(gg.dataset.id),sd=autoSides(a,b);const e={id:uid(),from:{node:a.id,side:drag.side||sd[0]},to:{node:b.id,side:sd[1]},head:"end",route:"ortho",color:"c-navy",label:""};S.doc.edges.push(e);S.selEdge=e.id;S.sel.clear();msg("Connected")}}
    else if(drag.k==="marq"){const m=S.marq;S.marq=null;const x0=Math.min(m.x0,m.x1),x1=Math.max(m.x0,m.x1),y0=Math.min(m.y0,m.y1),y1=Math.max(m.y0,m.y1);if(x1-x0>6&&y1-y0>6)S.doc.nodes.forEach(n=>{if(n.type!=="lane"&&n.x>=x0&&n.y>=y0&&n.x+n.w<=x1&&n.y+n.h<=y1)S.sel.add(n.id)})}
    drag=null;draw();props()};
  svg.addEventListener("pointerup",up);svg.addEventListener("pointercancel",up);
  svg.addEventListener("wheel",ev=>{ev.preventDefault();const r=svg.getBoundingClientRect();if(ev.ctrlKey||ev.metaKey){zoomAt(ev.deltaY<0?1.1:0.9,ev.clientX-r.left,ev.clientY-r.top);return}S.autofit=false;const k=ev.deltaMode===1?16:1;if(ev.shiftKey&&!ev.deltaX){S.pan.x-=ev.deltaY*k}else{S.pan.x-=ev.deltaX*k;S.pan.y-=ev.deltaY*k}draw()},{passive:false});
  svg.addEventListener("dblclick",ev=>{const g=ev.target.closest&&ev.target.closest("g.n");if(g){S.sel.clear();S.sel.add(g.dataset.id);S.selEdge=null;draw();props();const pp=document.getElementById("fsProps");if(pp&&getComputedStyle(pp).display==="none")togglePanel();const t=document.getElementById("pText");if(t){t.focus();t.select()}}});
}
function eraseAt(ev,dr){const els=document.elementsFromPoint?document.elementsFromPoint(ev.clientX,ev.clientY):[document.elementFromPoint(ev.clientX,ev.clientY)];const el=els.find(x=>x&&x.dataset&&x.dataset.ink);if(!el)return;if(!dr.pushed){pushUndo();dr.pushed=true}S.doc.ink=S.doc.ink.filter(k=>k.id!==el.dataset.ink);draw()}
addEventListener("keydown",ev=>{if(!document.getElementById("fsSvg"))return;const tag=(ev.target.tagName||"").toLowerCase();if(tag==="input"||tag==="textarea"||tag==="select")return;
  if(ev.key===" "){S.space=true;ev.preventDefault()}
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="z"){ev.preventDefault();ev.shiftKey?redo():undo()}
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="y"){ev.preventDefault();redo()}
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="s"){ev.preventDefault();save()}
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="c"){copy()}
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="v"){paste()}
  if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==="a"){ev.preventDefault();S.doc.nodes.forEach(n=>S.sel.add(n.id));draw();props()}
  if(ev.key==="Delete"||ev.key==="Backspace"){del()}
  if(ev.key==="Escape"){S.tool="select";S.sel.clear();S.selEdge=null;S.selInk=null;toolbar();draw();props()}
  if(ev.key.startsWith("Arrow")&&S.sel.size){ev.preventDefault();pushUndo();const d=ev.shiftKey?GRID:1;S.sel.forEach(i=>{const n=node(i);if(ev.key==="ArrowLeft")n.x-=d;if(ev.key==="ArrowRight")n.x+=d;if(ev.key==="ArrowUp")n.y-=d;if(ev.key==="ArrowDown")n.y+=d});draw()}});
addEventListener("keyup",ev=>{if(ev.key===" ")S.space=false});

/* ---------- คำสั่งแก้ไข ---------- */
const DEF={rect:[200,90],round:[200,90],capsule:[180,60],diamond:[200,120],circle:[70,70],doc:[180,100],note:[220,110],lane:[600,300]};
function addNode(type,x,y){pushUndo();const[w,h]=DEF[type]||[200,90];const n={id:uid(),type,x,y,w,h,text:type==="lane"?"Group":type==="note"?"Note":SHAPES[type].split(" ")[0],sub:"",color:type==="diamond"?"c-orange":type==="capsule"?"c-navy":type==="note"?"c-yellow":type==="lane"?"c-grey":"c-primary",fill:"tint"};
  if(type==="lane")S.doc.nodes.unshift(n);else S.doc.nodes.push(n);S.sel.clear();S.sel.add(n.id);S.selEdge=null;S.tool="select";toolbar();draw();props();const t=document.getElementById("pText");if(t){t.focus();t.select()}}
function del(){if(!S.sel.size&&!S.selEdge&&!S.selInk)return;pushUndo();if(S.selInk){S.doc.ink=S.doc.ink.filter(k=>k.id!==S.selInk);S.selInk=null}if(S.selEdge){S.doc.edges=S.doc.edges.filter(e=>e.id!==S.selEdge);S.selEdge=null}
  S.doc.nodes=S.doc.nodes.filter(n=>!S.sel.has(n.id));S.doc.edges=S.doc.edges.filter(e=>!(e.from.node&&S.sel.has(e.from.node))&&!(e.to.node&&S.sel.has(e.to.node)));S.sel.clear();draw();props();msg("Deleted")}
function copy(){if(!S.sel.size)return;const ids=[...S.sel];S.clip={nodes:S.doc.nodes.filter(n=>S.sel.has(n.id)),edges:S.doc.edges.filter(e=>ids.includes(e.from.node)&&ids.includes(e.to.node))};msg("Copied")}
function paste(){if(!S.clip)return;pushUndo();const map={};S.sel.clear();S.clip.nodes.forEach(n=>{const m=JSON.parse(JSON.stringify(n));m.id=uid();map[n.id]=m.id;m.x+=GRID*2;m.y+=GRID*2;S.doc.nodes.push(m);S.sel.add(m.id)});
  S.clip.edges.forEach(e=>{const f=JSON.parse(JSON.stringify(e));f.id=uid();f.from.node=map[f.from.node];f.to.node=map[f.to.node];S.doc.edges.push(f)});draw();props();msg("Pasted")}
function align(k){const ns=[...S.sel].map(node);if(ns.length<2)return;pushUndo();
  const L=Math.min(...ns.map(n=>n.x)),R=Math.max(...ns.map(n=>n.x+n.w)),T=Math.min(...ns.map(n=>n.y)),B=Math.max(...ns.map(n=>n.y+n.h));
  if(k==="left")ns.forEach(n=>n.x=L);if(k==="right")ns.forEach(n=>n.x=R-n.w);if(k==="hc")ns.forEach(n=>n.x=(L+R)/2-n.w/2);
  if(k==="top")ns.forEach(n=>n.y=T);if(k==="bottom")ns.forEach(n=>n.y=B-n.h);if(k==="vc")ns.forEach(n=>n.y=(T+B)/2-n.h/2);
  if(k==="dh"){const s=[...ns].sort((a,b)=>a.x-b.x),tot=s.reduce((a,n)=>a+n.w,0),gap=(R-L-tot)/(s.length-1);let x=L;s.forEach(n=>{n.x=x;x+=n.w+gap})}
  if(k==="dv"){const s=[...ns].sort((a,b)=>a.y-b.y),tot=s.reduce((a,n)=>a+n.h,0),gap=(B-T-tot)/(s.length-1);let y=T;s.forEach(n=>{n.y=y;y+=n.h+gap})}
  if(k==="samew"){const w=ns[0].w,h=ns[0].h;ns.forEach(n=>{n.w=w;n.h=h})}draw()}
function order(front){if(!S.sel.size)return;pushUndo();const sel=S.doc.nodes.filter(n=>S.sel.has(n.id)),rest=S.doc.nodes.filter(n=>!S.sel.has(n.id));S.doc.nodes=front?rest.concat(sel):sel.concat(rest);draw()}

/* ---------- แผงคุณสมบัติ ---------- */
const OPEN=(()=>{try{return JSON.parse(localStorage.getItem("flowstudio_sections")||"{}")}catch(e){return{}}})();
function secToggle(k,open){OPEN[k]=open;try{localStorage.setItem("flowstudio_sections",JSON.stringify(OPEN))}catch(e){}}
function props(){const el=document.getElementById("fsProps");if(!el)return;
  const sw=(cur,fn)=>`<div class="swatches">${COLORS.map(c=>`<span class="${c===cur?"on":""}" title="${COLOR_TH[c]}" style="background:${cv(c)}" onclick="FS.${fn}('${c}')"></span>`).join("")}</div>`;
  const step=(label,minus,plus,val)=>`<div class="st"><span class="sl">${label}</span><button onclick="${minus}">−</button><span class="sv">${val}</span><button onclick="${plus}">+</button></div>`;
  const sec=(k,title,body,def)=>`<details class="sec" ${(OPEN[k]??def)?"open":""} ontoggle="FS.secToggle('${k}',this.open)"><summary>${title}</summary><div class="sb">${body}</div></details>`;
  const sel=(label,onch,opts,cur)=>`<label>${label}<select onchange="${onch}">${opts.map(o=>`<option value="${o[0]}" ${cur===o[0]?"selected":""}>${o[1]}</option>`).join("")}</select></label>`;
  const SIDE=[["right","Right"],["left","Left"],["top","Top"],["bottom","Bottom"]];const close=`<button class="pclose" title="Close" onclick="FS.togglePanel(false)">×</button>`;
  let html="";
  if(S.selInk){const k=S.doc.ink.find(x=>x.id===S.selInk);if(!k){S.selInk=null;return props()}
    html=`<div class="ph">${close}Pen stroke</div>${sec("ink","Line",step("Width",`FS.setInk('w',${Math.max(1,(k.w||3)-1)})`,`FS.setInk('w',${Math.min(16,(k.w||3)+1)})`,k.w||3)+sw(k.color,"setInkColor")+`<button class="danger" onclick="FS.del()">Delete stroke</button>`,true)}`}
  else if(S.selEdge){const e=edge(S.selEdge);if(!e){S.selEdge=null;return props()}
    html=`<div class="ph">${close}Connector</div>
    ${sec("elabel","Label",`<input type="text" id="pLabel" value="${esc(e.label)}" placeholder="Text on the line" oninput="FS.setE('label',this.value)">`+step("Label size","FS.bumpLabel(-1)","FS.bumpLabel(1)",(e.lfont||14)+" px")+`<p class="hint">Drag the label along the line to move it.</p>`,true)}
    ${sec("eline","Line",step("Width","FS.bumpWidth(-0.5)","FS.bumpWidth(0.5)",e.width||2.5)+sw(e.color,"setEColor")+`<div class="row">${sel("Arrow","FS.setE('head',this.value)",[["end","End"],["both","Both ends"],["none","None"]],e.head)}${sel("Style","FS.setE('dash',this.value==='1')",[["0","Solid"],["1","Dashed"]],e.dash?"1":"0")}</div>`,true)}
    ${sec("eroute","Routing",`<div class="row">${sel("Route","FS.setE('route',this.value)",[["ortho","Orthogonal"],["straight","Straight"]],e.route)}<label>Bend point<input type="text" value="${esc((e.via||[]).map(v=>v.x+","+v.y).join("; "))}" placeholder="x,y" onchange="FS.setVia(this.value)"></label></div>
      <div class="row">${sel("From side","FS.setSide('from',this.value)",SIDE,e.from.side)}${sel("To side","FS.setSide('to',this.value)",SIDE,e.to.side)}</div>
      <div class="row"><label>From pos<input type="number" step="0.1" min="0.1" max="0.9" value="${e.from.pos??0.5}" onchange="FS.setPos('from',this.value)"></label><label>To pos<input type="number" step="0.1" min="0.1" max="0.9" value="${e.to.pos??0.5}" onchange="FS.setPos('to',this.value)"></label></div>
      <p class="hint">Drag the line itself to bend it through that point; drag an end circle onto another shape to reconnect.</p><div class="row"><button onclick="FS.flipEdge()">Flip direction</button><button onclick="FS.setVia('')">Straighten</button></div>`,false)}
    <button class="danger" onclick="FS.del()">Delete connector</button>`}
  else if(S.sel.size===1){const n=node([...S.sel][0]);if(!n){S.sel.clear();return props()}
    html=`<div class="ph">${close}${SHAPES[n.type]||"Shape"}</div>
    ${sec("ntext","Text",`<input type="text" id="pText" value="${esc(n.text)}" placeholder="Main text" oninput="FS.setN('text',this.value)"><textarea placeholder="Subtitle (second line)" oninput="FS.setN('sub',this.value)">${esc(n.sub||"")}</textarea>`+step("Main text size","FS.bumpFont(-1)","FS.bumpFont(1)",(n.font||16)+" px")+step("Subtitle size","FS.bumpFont(-1,null,'sub')","FS.bumpFont(1,null,'sub')",(n.subFont||Math.max(10,(n.font||16)-2))+" px"),true)}
    ${sec("nsize","Size",step("Box size","FS.bumpSize(0.9)","FS.bumpSize(1.1)",n.w+" × "+n.h)+`<div class="row"><label>W<input type="number" value="${n.w}" onchange="FS.setN('w',+this.value)"></label><label>H<input type="number" value="${n.h}" onchange="FS.setN('h',+this.value)"></label></div>`,true)}
    ${sec("nstyle","Style",sw(n.color,"setNColor")+`<div class="row">${sel("Shape","FS.setN('type',this.value)",Object.keys(SHAPES).map(k=>[k,SHAPES[k]]),n.type)}${sel("Fill","FS.setN('fill',this.value)",[["tint","Tint"],["solid","Solid"],["white","White"]],n.fill)}</div><div class="row">${sel("Icon","FS.setN('icon',this.value)",[["","None"]].concat(Object.keys(ICONS).map(k=>[k,k])),n.icon||"")}${sel("Border","FS.setN('dash',this.value==='1')",[["0","Solid"],["1","Dashed"]],n.dash?"1":"0")}</div>`,false)}
    ${sec("narr","Arrange",`<div class="row"><button onclick="FS.order(true)">Bring to front</button><button onclick="FS.order(false)">Send to back</button></div><div class="row"><button onclick="FS.copy();FS.paste()">Duplicate</button></div><p class="hint">Drag a port (circle on the border) to another shape to connect · drag the corner handle to resize</p>`,false)}
    <button class="danger" onclick="FS.del()">Delete shape</button>`}
  else if(S.sel.size>1){html=`<div class="ph">${close}${S.sel.size} shapes</div>
    ${sec("mtext","Text and size",step("Text size","FS.bumpFont(-1)","FS.bumpFont(1)","all")+step("Subtitle size","FS.bumpFont(-1,null,'sub')","FS.bumpFont(1,null,'sub')","all")+step("Box size","FS.bumpSize(0.9)","FS.bumpSize(1.1)","all"),true)}
    ${sec("malign","Align",`<div class="row"><button onclick="FS.align('left')">Left</button><button onclick="FS.align('hc')">Center</button><button onclick="FS.align('right')">Right</button></div><div class="row"><button onclick="FS.align('top')">Top</button><button onclick="FS.align('vc')">Middle</button><button onclick="FS.align('bottom')">Bottom</button></div><div class="row"><button onclick="FS.align('dh')">Distribute H</button><button onclick="FS.align('dv')">Distribute V</button><button onclick="FS.align('samew')">Same size</button></div>`,true)}
    ${sec("mstyle","Color (all)",sw("","setNColor"),false)}
    <button class="danger" onclick="FS.del()">Delete ${S.sel.size} shapes</button>`}
  else if(S.tool==="pen"||S.tool==="eraser"){html=`<div class="ph">${close}${S.tool==="pen"?"Pen":"Eraser"}</div>${sec("pen","Pen",`<p class="hint">${S.tool==="pen"?"Draw freehand with mouse, finger or S Pen. Width and colour are in the tray above the canvas.":"Drag over pen strokes to remove them."}</p>`+(S.tool==="pen"?`<div class="row">${[2,3,5,8,12].map(w=>`<button class="${S.pen.w===w?"on":""}" onclick="FS.setPen('w',${w})"><i style="display:block;width:${w+5}px;height:${w+5}px;border-radius:50%;background:currentColor;margin:auto"></i></button>`).join("")}</div>`+sw(S.pen.color,"setPenColor"):"")+`<div class="row"><button onclick="FS.tool('${S.tool==="pen"?"eraser":"pen"}')">${S.tool==="pen"?"Eraser":"Pen"}</button><button onclick="FS.tool('select')">Done</button></div>`,true)}`}
  else{const d=S.doc;html=`<div class="ph">${close}Diagram</div>
    ${sec("dtitle","Diagram",`<input type="text" value="${esc(d.title)}" placeholder="Title" onchange="FS.setDoc('title',this.value)"><div class="row"><label>Width<input type="number" value="${d.w}" onchange="FS.setDoc('w',+this.value)"></label><label>Height<input type="number" value="${d.h}" onchange="FS.setDoc('h',+this.value)"></label><label class="ck"><input type="checkbox" ${d.grid?"checked":""} onchange="FS.setDoc('grid',this.checked)"> Grid</label></div><p class="hint">${S.fileName?"File: "+esc(S.fileName)+(S.handle?" (Save overwrites it)":""):"Not saved to a file yet"}</p>`,true)}
    ${sec("dall","Whole diagram",step("All text","FS.bumpAll('font',-1)","FS.bumpAll('font',1)","±1 px")+step("All labels","FS.bumpAll('label',-1)","FS.bumpAll('label',1)","±1 px")+step("All lines","FS.bumpAll('line',-0.5)","FS.bumpAll('line',0.5)","±0.5")+step("All shapes","FS.bumpAll('size',0.9)","FS.bumpAll('size',1.1)","±10%")+step("Pen strokes","FS.bumpAll('ink',-1)","FS.bumpAll('ink',1)","±1"),false)}
    ${sec("dhelp","Quick guide",`<p class="hint">Click a shape, connector or label to edit it here · Shape ▾ then click on the canvas to add · drag to move · Shift+click multi-select · wheel scrolls, Shift+wheel sideways, Ctrl+wheel or pinch zooms · Space+drag or Pan (hand) moves the view · Pen draws, Eraser removes strokes · Ctrl+Z undo · Delete removes the selection</p>`,false)}`}
  el.innerHTML=html;
  const wrap=document.getElementById("fsWrap");if(wrap&&getComputedStyle(el).display==="none"||wrap&&wrap.classList.contains("panel")){const want=S.sel.size||S.selEdge||S.selInk;wrap.classList.toggle("panel",!!want&&!S.panelClosed);if(!want)S.panelClosed=false}}
function bumpFont(d,ids,key){ids=ids||[...S.sel];if(!ids.length)return;pushUndo();ids.forEach(i=>{const n=node(i);if(!n)return;if(key==="sub")n.subFont=Math.max(8,Math.min(50,(n.subFont||Math.max(10,(n.font||16)-2))+d));else n.font=Math.max(10,Math.min(60,(n.font||16)+d))});draw();props()}
function bumpLabel(d){const e=edge(S.selEdge);if(!e)return;pushUndo();e.lfont=Math.max(8,Math.min(40,(e.lfont||14)+d));draw();props()}
function bumpSize(f,ids){ids=ids||[...S.sel];if(!ids.length)return;pushUndo();ids.forEach(i=>{const n=node(i);if(!n)return;const cx=n.x+n.w/2,cy=n.y+n.h/2;n.w=Math.max(40,snap(n.w*f));n.h=Math.max(30,snap(n.h*f));n.x=snap(cx-n.w/2);n.y=snap(cy-n.h/2)});draw();props()}
function bumpWidth(d,ids){ids=ids||(S.selEdge?[S.selEdge]:[]);if(!ids.length)return;pushUndo();ids.forEach(i=>{const e=edge(i);if(e)e.width=Math.max(1,Math.min(10,(e.width||2.5)+d))});draw();props()}
function bumpAll(k,d){pushUndo();const D=S.doc;if(k==="font")D.nodes.forEach(n=>{n.font=Math.max(10,Math.min(60,(n.font||16)+d));if(n.subFont)n.subFont=Math.max(8,n.subFont+d)});if(k==="label")D.edges.forEach(e=>e.lfont=Math.max(8,Math.min(40,(e.lfont||14)+d)));if(k==="line")D.edges.forEach(e=>e.width=Math.max(1,Math.min(10,(e.width||2.5)+d)));if(k==="size")D.nodes.forEach(n=>{const cx=n.x+n.w/2,cy=n.y+n.h/2;n.w=Math.max(40,snap(n.w*d));n.h=Math.max(30,snap(n.h*d));n.x=snap(cx-n.w/2);n.y=snap(cy-n.h/2)});if(k==="ink")D.ink.forEach(x=>x.w=Math.max(1,Math.min(16,(x.w||3)+d)));draw();props()}
function setInk(k,v){const x=S.doc.ink.find(i=>i.id===S.selInk);if(!x)return;pushUndo();x[k]=v;draw();props()}
function setPen(k,v){S.pen[k]=v;props();penTray()}
function setN(k,v){const ids=[...S.sel];if(!ids.length)return;if(!["text","sub"].includes(k))pushUndo();else{if(!S.textUndo){pushUndo();S.textUndo=true;setTimeout(()=>S.textUndo=false,1500)}}ids.forEach(i=>{const n=node(i);if(n)n[k]=v});S.dirty=true;autosave();draw();if(!["text","sub"].includes(k))props()}
function setNColor(c){setN("color",c)}
function setInkColor(c){setInk("color",c)}
function setPenColor(c){setPen("color",c)}
function setE(k,v){const e=edge(S.selEdge);if(!e)return;if(k!=="label")pushUndo();e[k]=v;S.dirty=true;autosave();draw();if(k!=="label")props()}
function setEColor(c){setE("color",c)}
function setSide(w,v){const e=edge(S.selEdge);if(!e)return;pushUndo();e[w].side=v;draw()}
function setPos(w,v){const e=edge(S.selEdge);if(!e)return;pushUndo();e[w].pos=+v;draw()}
function setVia(t){const e=edge(S.selEdge);if(!e)return;pushUndo();const v=t.split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const[a,b]=x.split(',').map(Number);return{x:a,y:b}}).filter(p=>!isNaN(p.x)&&!isNaN(p.y));e.via=v.length?v:undefined;draw()}
function flipEdge(){const e=edge(S.selEdge);if(!e)return;pushUndo();[e.from,e.to]=[e.to,e.from];draw();props()}
function setDoc(k,v){pushUndo();S.doc[k]=v;draw();props()}

/* ---------- เครื่องมือ ---------- */
const IC={pen:'<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M13 7l3 3"/>',eraser:'<path d="M3 17l7 4h5l6-6-9-9-9 9z"/><path d="M8 12l7 7"/>',hand:'<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6"/><path d="M11 11V4a1.5 1.5 0 0 1 3 0v7"/><path d="M14 11V6a1.5 1.5 0 0 1 3 0v8"/><path d="M8 13l-2-2a1.5 1.5 0 0 0-2.2 2l3.6 5A6 6 0 0 0 12 21h1a4 4 0 0 0 4-4v-3"/>',undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',select:'<path d="M5 3l14 8-6 2-3 6z"/>',connect:'<circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 7l10 10"/>',copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',shape:'<rect x="3" y="4" width="8" height="7" rx="1.5"/><circle cx="17" cy="8" r="4"/><path d="M7 14l4 7H3z"/><rect x="13" y="14" width="8" height="7" rx="3.5"/>'};
const ic2=(k,sz)=>`<svg class="ico" width="${sz||16}" height="${sz||16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k]||""}</svg>`;
const TOOLS=[["select","Select / Move","c-navy","select"],["pan","Pan (hand)","c-sky","hand"],["connect","Connect","c-green","connect"],["pen","Pen","c-red","pen"],["eraser","Eraser","c-orange","eraser"]];
const SHAPE_TC={diamond:"c-orange",capsule:"c-navy",note:"c-amber",lane:"c-grey"};
function toolbar(){const el=document.getElementById("fsTools");if(!el)return;const shapeOn=!!SHAPES[S.tool];
  const b=(id,label,tc,inner,on)=>`<button class="${on?"on":""}" style="--tc:var(--${tc})" title="${label}" onclick="FS.tool('${id}')">${inner}<span class="lb">${label}</span></button>`;
  el.innerHTML=`<h4>Tools</h4>${TOOLS.map(t=>b(t[0],t[1],t[2],ic2(t[3]),S.tool===t[0])).join("")}
  <h4>Add</h4><span class="dd"><button class="${shapeOn?"on":""}" style="--tc:var(--${SHAPE_TC[S.tool]||"c-primary"})" title="Add shape: choose a type, then click on the canvas" onclick="FS.menu('fsShapeMenu')">${ic2("shape")}<span class="lb">${shapeOn?SHAPES[S.tool]:"Shape"} ▾</span></button>
    <div class="menu" id="fsShapeMenu">${Object.keys(SHAPES).map(k=>`<button onclick="FS.tool('${k}');FS.menu()"><span class="sw ${k==="capsule"?"cap":k==="diamond"?"dia":k==="note"?"note":k==="lane"?"lane":k==="circle"?"circ":""}" style="--tc:var(--${SHAPE_TC[k]||"c-primary"})"></span>${SHAPES[k]}</button>`).join("")}</div></span>
  <h4>Edit</h4><button title="Undo (Ctrl+Z)" onclick="FS.undo()">${ic2("undo")}<span class="lb">Undo</span></button><button title="Redo (Ctrl+Y)" onclick="FS.redo()">${ic2("redo")}<span class="lb">Redo</span></button><button title="Duplicate the selection" onclick="FS.copy();FS.paste()">${ic2("copy")}<span class="lb">Duplicate</span></button><button title="Delete the selected shape, connector or stroke" onclick="FS.del()" style="color:var(--c-red)">${ic2("trash")}<span class="lb">Delete selected</span></button>`}
function tool(t){S.tool=t;S.panelClosed=false;toolbar();penTray();props();const svg=document.getElementById("fsSvg");if(svg)svg.style.cursor=t==="pan"?"grab":t==="select"?"default":t==="eraser"?"cell":"crosshair"}
function penTray(){const el=document.getElementById("fsPenTray");if(!el)return;if(S.tool!=="pen"&&S.tool!=="eraser"){el.hidden=true;return}el.hidden=false;el.innerHTML=S.tool==="eraser"?`<span class="lab">Eraser: drag over strokes to remove them</span><button onclick="FS.tool('pen')">Pen</button><button onclick="FS.tool('select')">Done</button>`:`<span class="lab">Pen</span>${[2,3,5,8,12].map(w=>`<button class="${S.pen.w===w?"on":""}" title="Width ${w}" onclick="FS.setPen('w',${w})"><i style="width:${w+4}px;height:${w+4}px"></i></button>`).join("")}<span class="sep"></span>${["c-red","c-primary","c-green","c-orange","c-purple","c-navy","c-grey"].map(c=>`<button class="swb ${S.pen.color===c?"on":""}" title="${COLOR_TH[c]}" onclick="FS.setPen('color','${c}')" style="--sc:${cv(c)}"><i></i></button>`).join("")}<span class="sep"></span><button onclick="FS.tool('eraser')">${ic2("eraser")}</button><button onclick="FS.tool('select')">Done</button>`}

/* ---------- ไฟล์ ---------- */
const JSONTXT=()=>JSON.stringify(S.doc,null,1);
const dl=(name,data,type)=>{const b=data instanceof Blob?data:new Blob([data],{type:type||"application/octet-stream"}),u=URL.createObjectURL(b),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)};
const base=()=>(S.fileName||S.doc.title||"flow").replace(/\.flow\.json$/,"").replace(/[\\/:*?"<>|]/g,"_");
const HDB={open(){return new Promise((ok,no)=>{const r=indexedDB.open("flowstudio",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})},
  async set(k,v){try{const db=await this.open();await new Promise((ok,no)=>{const t=db.transaction("kv","readwrite");t.objectStore("kv").put(v,k);t.oncomplete=ok;t.onerror=()=>no(t.error)})}catch(e){}},
  async get(k){try{const db=await this.open();return await new Promise((ok,no)=>{const t=db.transaction("kv","readonly"),r=t.objectStore("kv").get(k);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}catch(e){return null}}};
async function restoreHandle(){if(!G.showSaveFilePicker)return;const h=await HDB.get("handle");if(h&&h.name===S.fileName){S.handle=h}}
async function ensureWrite(h){if(!h.queryPermission)return true;let p=await h.queryPermission({mode:"readwrite"});if(p==="granted")return true;p=await h.requestPermission({mode:"readwrite"});return p==="granted"}
async function save(as){try{if(S.handle&&!as){if(!(await ensureWrite(S.handle))){msg("Write permission was not granted",true);return}}
  if(G.showSaveFilePicker&&(as||!S.handle)){S.handle=await G.showSaveFilePicker({suggestedName:base()+".flow.json",types:[{description:"FlowStudio",accept:{"application/json":[".json"]}}]});S.fileName=S.handle.name;HDB.set("handle",S.handle)}
  if(S.handle){const w=await S.handle.createWritable();await w.write(JSONTXT());await w.close()}else dl(base()+".flow.json",JSONTXT(),"application/json");S.dirty=false;autosave();draw();props();msg("Saved "+(S.fileName||""))}catch(e){if(e.name!=="AbortError")msg("Save failed: "+e.message,true)}}
async function open(){try{if(G.showOpenFilePicker){const[h]=await G.showOpenFilePicker({types:[{description:"FlowStudio / Obsidian canvas",accept:{"application/json":[".json",".canvas"]}}]});const f=await h.getFile();const t=await f.text();loadText(t,f.name);if(f.name.endsWith(".flow.json")){S.handle=h;HDB.set("handle",h)}}else{const i=document.createElement("input");i.type="file";i.accept=".json,.canvas";i.onchange=async()=>{const f=i.files[0];loadText(await f.text(),f.name)};i.click()}}catch(e){if(e.name!=="AbortError")msg("Open failed: "+e.message,true)}}
function loadText(t,name){let d;try{d=JSON.parse(t)}catch(e){msg("File is not JSON",true);return}
  if(d.nodes&&d.nodes.some(n=>n.type==="text"||n.type==="file"||n.type==="group")&&!d.v)d=fromObsidian(d);
  S.handle=null;load(d,name);recent(name);msg("Opened "+name)}
function recent(name){try{const r=JSON.parse(localStorage.getItem("flowstudio_recent")||"[]").filter(x=>x.name!==name);r.unshift({name,at:Date.now(),doc:S.doc});localStorage.setItem("flowstudio_recent",JSON.stringify(r.slice(0,12)))}catch(e){}}
function newDoc(){if(S.dirty&&!confirm("Current diagram is not saved. Create a new one?"))return;S.handle=null;load(blank("Untitled"));msg("New diagram")}

/* ---------- Obsidian canvas ---------- */
function fromObsidian(c){const d=blank("From Obsidian");const cmap=v=>{if(!v)return"c-primary";const m={1:"c-red",2:"c-orange",3:"c-yellow",4:"c-green",5:"c-sky",6:"c-purple"};if(m[v])return m[v];return nearest(v)};
  let minx=Infinity,miny=Infinity;c.nodes.forEach(n=>{minx=Math.min(minx,n.x);miny=Math.min(miny,n.y)});
  c.nodes.forEach(n=>{const t=(n.text||n.file||n.label||"").split("\n"),main=t[0].replace(/^#+\s*|\*\*/g,""),sub=t.slice(1).join(" ").replace(/\*\*/g,"");d.nodes.push({id:n.id,type:n.type==="group"?"lane":"round",x:n.x-minx+40,y:n.y-miny+40,w:n.width,h:n.height,text:n.type==="group"?(n.label||""):main,sub:n.type==="group"?"":sub,color:cmap(n.color),fill:"tint"})});
  (c.edges||[]).forEach(e=>d.edges.push({id:e.id,from:{node:e.fromNode,side:e.fromSide||"right"},to:{node:e.toNode,side:e.toSide||"left"},label:e.label||"",head:e.toEnd==="none"?"none":"end",route:"ortho",color:cmap(e.color)}));
  let mx=0,my=0;d.nodes.forEach(n=>{mx=Math.max(mx,n.x+n.w);my=Math.max(my,n.y+n.h)});d.w=Math.max(1200,mx+80);d.h=Math.max(800,my+80);return d}
function nearest(h){const rgb=x=>[parseInt(x.slice(1,3),16),parseInt(x.slice(3,5),16),parseInt(x.slice(5,7),16)];const t=rgb(h);let best="c-primary",bd=1e9;COLORS.forEach(c=>{const v=rgb(hex(c)),dd=v.reduce((a,b,i)=>a+(b-t[i])**2,0);if(dd<bd){bd=dd;best=c}});return best}
function toObsidian(){const d=S.doc,nodes=d.nodes.map(n=>({id:n.id,type:"text",text:(n.text?"**"+n.text+"**":"")+(n.sub?"\n"+n.sub:""),x:n.x,y:n.y,width:n.w,height:n.h,color:hex(n.color)}));
  const edges=d.edges.filter(e=>e.from.node&&e.to.node).map(e=>({id:e.id,fromNode:e.from.node,fromSide:e.from.side||"right",toNode:e.to.node,toSide:e.to.side||"left",label:e.label||undefined,color:hex(e.color),toEnd:e.head==="none"?"none":undefined,fromEnd:e.head==="both"?"arrow":undefined}));
  dl(base()+".canvas",JSON.stringify({nodes,edges},null,1),"application/json");msg("Obsidian canvas exported")}

/* ---------- ส่งออกภาพ / PDF / HTML ---------- */
function bounds(){const d=S.doc;let x0=d.w,y0=d.h,x1=0,y1=0;const add=(x,y)=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)};
  d.nodes.forEach(n=>{add(n.x,n.y);add(n.x+n.w,n.y+n.h)});(d.ink||[]).forEach(k=>(k.pts||[]).forEach(q=>add(q[0],q[1])));d.edges.forEach(e=>{const p=routePts(e);if(p){p.forEach(q=>add(q.x,q.y));if(e.label){const m=midOf(p,e.lpos),fs=e.lfont||14,w=e.label.length*fs*0.6+14;add(m.x-w/2,m.y-fs);add(m.x+w/2,m.y+fs)}}});if(!d.nodes.length&&!(d.ink||[]).length)return{x:0,y:0,w:d.w,h:d.h};return{x:x0-40,y:y0-40,w:x1-x0+80,h:y1-y0+80}}
function resolveVars(s){const cs=getComputedStyle(document.documentElement);return s.replace(/var\(--([\w-]+)\)/g,(m,k)=>cs.getPropertyValue("--"+k).trim()||m).replace(/color-mix\(in srgb,(#[0-9A-Fa-f]{6}) (\d+)%,(white|#[0-9A-Fa-f]{6})\)/g,(m,c,p,w)=>mix(c,+p,w==="white"?"#FFFFFF":w))}
function mix(a,p,b){const r=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)),A=r(a),B=r(b);return"#"+A.map((v,i)=>Math.round(v*p/100+B[i]*(100-p)/100).toString(16).padStart(2,"0")).join("")}
function standaloneSvg(){const d=S.doc,b=bounds(),keep={sel:new Set(S.sel),se:S.selEdge};S.sel=new Set();S.selEdge=null;
  const lanes=d.nodes.filter(n=>n.type==="lane"),others=d.nodes.filter(n=>n.type!=="lane");const ki=S.selInk;S.selInk=null;let g=lanes.map(nodeSvg).join("")+d.edges.map(edgeSvg).join("")+others.map(nodeSvg).join("")+(d.ink||[]).map(inkSvg).join("");S.sel=keep.sel;S.selEdge=keep.se;S.selInk=ki;
  const css=`.fs-node{font-family:'Kanit',sans-serif;font-size:16px;line-height:1.3;color:${hex("ink")};display:flex;align-items:center;justify-content:center;text-align:center;height:100%;box-sizing:border-box;padding:6px 10px;word-break:break-word;overflow:hidden}.fs-node b{font-weight:600}.fs-node small{display:block;font-size:14px;color:${hex("muted")};margin-top:2px}.fs-node.lane{align-items:flex-start;justify-content:flex-start;font-weight:600;padding:8px 12px}.fs-node.note{align-items:flex-start;justify-content:flex-start;text-align:left;font-size:14px}.fs-node.dk{color:#fff}.fs-node.dk small{color:rgba(255,255,255,.85)}.fs-elabel{font-family:'Kanit',sans-serif;font-size:14px;fill:${hex("ink")}}.fs-elabelbg{fill:${hex("card")};stroke:${hex("line")};stroke-width:.5}.fs-edge-hit{fill:none;stroke:transparent;stroke-width:16}`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${b.w}" height="${b.h}" viewBox="${b.x} ${b.y} ${b.w} ${b.h}"><style>${(G.HD_FONTCSS||"")}${css}</style><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${hex("card")}"/>${g}</svg>`;
  return{svg:resolveVars(svg),b}}
function exportSvg(){const{svg}=standaloneSvg();dl(base()+".svg",svg,"image/svg+xml");msg("SVG exported")}
function exportPng(scale){const{svg,b}=standaloneSvg(),img=new Image(),s=scale||2;img.onload=()=>{const c=document.createElement("canvas");c.width=b.w*s;c.height=b.h*s;const x=c.getContext("2d");x.scale(s,s);x.drawImage(img,0,0);c.toBlob(bl=>{dl(base()+".png",bl);msg("PNG exported")})};img.onerror=()=>msg("Image export failed",true);img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)}
function exportPdf(){const{svg,b}=standaloneSvg(),w=window.open("","_blank");if(!w){msg("Pop-up blocked by browser",true);return}
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(S.doc.title)}</title><style>${G.HD_FONTCSS||""}@page{size:${b.w>b.h?"landscape":"portrait"};margin:10mm}body{margin:0;font-family:Kanit,sans-serif}svg{width:100%;height:auto}h1{font-size:16px;color:#5A6B7B;font-weight:500;margin:0 0 6px}</style></head><body><h1>${esc(S.doc.title)}</h1>${svg}<script>setTimeout(()=>window.print(),600)<\/script></body></html>`);w.document.close();msg("Print dialog opened: choose Save as PDF")}
function exportHtml(){const{svg}=standaloneSvg();const h=`<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(S.doc.title)}</title><style>${G.HD_FONTCSS||""}body{margin:0;background:#FBF5E9;font-family:Kanit,sans-serif;color:#1F2933}header{padding:10px 16px;background:#fff;border-bottom:1px solid #E6DCC8;font-size:16px;font-weight:600}main{padding:12px;overflow:auto}svg{max-width:100%;height:auto;background:#fff;border:1px solid #E6DCC8;border-radius:12px}</style></head><body><header>${esc(S.doc.title)}</header><main>${svg}</main><script type="application/json" id="flow">${JSONTXT().replace(/<\//g,"<\\/")}<\/script></body></html>`;dl(base()+".html",h,"text/html");msg("HTML exported (diagram data embedded)")}

/* ---------- ส่งออก PPTX (รูปทรงแก้ได้ใน PowerPoint) ---------- */
function loadScript(src){return new Promise((ok,no)=>{if(G.PptxGenJS)return ok();const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>no(new Error("Cannot load "+src));document.head.appendChild(s)})}
async function exportPptx(){try{await loadScript("lib/pptxgen.bundle.js")}catch(e){msg(e.message,true);return}
  const d=S.doc,b=bounds(),P=new G.PptxGenJS();P.layout="LAYOUT_WIDE";const W=13.333,H=7.5,M=0.4,sc=Math.min((W-2*M)/b.w,(H-1.2-M)/b.h);const X=x=>M+(x-b.x)*sc,Y=y=>1.0+(y-b.y)*sc,L=v=>v*sc;
  const s=P.addSlide();s.addText(d.title,{x:0.4,y:0.25,w:12.5,h:0.6,fontFace:"Kanit",fontSize:24,bold:true,color:hex("c-navy").slice(1)});
  const SH={rect:P.ShapeType.rect,round:P.ShapeType.roundRect,capsule:P.ShapeType.roundRect,diamond:P.ShapeType.diamond,circle:P.ShapeType.ellipse,doc:P.ShapeType.flowChartDocument,note:P.ShapeType.roundRect,lane:P.ShapeType.roundRect};
  const lanes=d.nodes.filter(n=>n.type==="lane"),others=d.nodes.filter(n=>n.type!=="lane");
  const nodeOut=n=>{const c=hex(n.color).slice(1),dk=n.fill==="solid"&&n.color!=="c-yellow",fill=n.fill==="solid"?c:n.fill==="white"?hex("card").slice(1):mix("#"+c,n.type==="lane"?7:14,"#FFFFFF").slice(1);
    const o={x:X(n.x),y:Y(n.y),w:L(n.w),h:L(n.h),fill:{color:fill},line:{color:c,width:n.type==="lane"?1:1.5,dashType:n.dash?"dash":"solid"},fontFace:"Kanit",fontSize:Math.max(10,Math.round((n.font||16)*sc*72/96*1.1)),color:dk?"FFFFFF":hex("ink").slice(1),align:n.type==="lane"||n.type==="note"?"left":"center",valign:n.type==="lane"||n.type==="note"?"top":"middle",margin:4};
    if(n.type==="capsule"||n.type==="round"||n.type==="note"||n.type==="lane")o.rectRadius=n.type==="capsule"?L(Math.min(n.w,n.h))/2:0.08;
    const runs=[{text:n.text,options:{bold:true,breakLine:!!n.sub}}];if(n.sub)runs.push({text:n.sub,options:{fontSize:Math.max(8,Math.round((n.subFont||Math.max(10,(n.font||16)-2))*sc*72/96*1.1)),color:dk?"FFFFFF":hex("muted").slice(1)}});
    s.addText(runs,Object.assign(o,{shape:SH[n.type]||P.ShapeType.rect}))};
  lanes.forEach(nodeOut);
  d.edges.forEach(e=>{const pts=routePts(e);if(!pts)return;const c=hex(e.color).slice(1);
    for(let i=1;i<pts.length;i++){const a=pts[i-1],q=pts[i],last=i===pts.length-1,first=i===1;const x0=Math.min(a.x,q.x),y0=Math.min(a.y,q.y),w=Math.abs(q.x-a.x),h=Math.abs(q.y-a.y);
      const o={x:X(x0),y:Y(y0),w:L(w)||0.01,h:L(h)||0.01,line:{color:c,width:Math.max(0.75,(e.width||2.5)*0.8),dashType:e.dash?"dash":"solid"},flipH:q.x<a.x,flipV:q.y<a.y};
      if(last&&e.head!=="none")o.line.endArrowType="triangle";if(first&&e.head==="both")o.line.beginArrowType="triangle";s.addShape(P.ShapeType.line,o)}
    if(e.label){const m=midOf(pts,e.lpos),w=Math.max(0.6,e.label.length*0.11*(e.lfont||14)/14);s.addText(e.label,{x:X(m.x)-w/2,y:Y(m.y)-0.14,w:w,h:0.28,fontFace:"Kanit",fontSize:Math.max(8,Math.round((e.lfont||14)*sc*72/96*1.1)),color:hex("ink").slice(1),fill:{color:hex("card").slice(1)},align:"center",valign:"middle",margin:0})}});
  others.forEach(nodeOut);
  (d.ink||[]).forEach(k=>{if(!k.pts||k.pts.length<2)return;try{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;k.pts.forEach(q=>{x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1])});const w=Math.max(x1-x0,1),h=Math.max(y1-y0,1);
    s.addShape(P.ShapeType.custGeom,{x:X(x0),y:Y(y0),w:L(w),h:L(h),line:{color:hex(k.color).slice(1),width:Math.max(0.75,(k.w||3)*0.8)},fill:{type:"none"},points:k.pts.map((q,i)=>({x:L(q[0]-x0),y:L(q[1]-y0),moveTo:i===0}))})}catch(e){}});
  await P.writeFile({fileName:base()+".pptx"});msg("PPTX exported (shapes editable in PowerPoint)")}

/* ---------- Pages ---------- */
const EXPORTS=[["exportPptx","PPTX (editable shapes)"],["exportPng","PNG image"],["exportSvg","SVG vector"],["exportPdf","PDF (print)"],["exportHtml","HTML page"],["toObsidian","Obsidian canvas"]];
function renderEditor(el){el.classList.add("fs-editor");el.innerHTML=`<div class="fs-wrap" id="fsWrap"><div class="fs-tools" id="fsTools"></div>
  <div class="fs-stage" id="fsStage"><div class="fs-bar">
    <button title="New" onclick="FS.newDoc()">${HDShell.ic("file",15)}<span class="lb">New</span></button><button title="Open" onclick="FS.open()">Open</button><button class="hot" title="Save (Ctrl+S)" onclick="FS.save()">Save</button><button title="Save as" onclick="FS.save(true)">Save as</button><span class="sep"></span>
    <span class="dd"><button onclick="FS.menu('fsExp')">Export ▾</button><div class="menu" id="fsExp">${EXPORTS.map(x=>`<button onclick="FS.${x[0]}();FS.menu()">${x[1]}</button>`).join("")}</div></span><span class="sep"></span>
    <button title="Zoom out" onclick="FS.zoomAt(1/1.2)">−</button><span class="zv" id="fsZoom">100%</span><button title="Zoom in" onclick="FS.zoomAt(1.2)">+</button><button title="Fit to screen" onclick="FS.fit()">Fit</button>
    <button class="pp" title="Properties" onclick="FS.togglePanel()">${HDShell.ic("gantt",15)}<span class="lb">Properties</span></button></div>
    <div class="fs-pen" id="fsPenTray" hidden></div><svg id="fsSvg" class="main"></svg><div class="fs-sb v" id="fsSbV" hidden><i></i></div><div class="fs-sb h" id="fsSbH" hidden><i></i></div><div class="fs-status" id="fsStatus"></div><div class="fs-msg" id="fsMsg"></div></div>
  <div class="fs-props" id="fsProps"></div></div>`;
  const svg=document.getElementById("fsSvg");bind(svg);bindScroll(document.getElementById("fsSbV"),"y");bindScroll(document.getElementById("fsSbH"),"x");toolbar();penTray();props();
  let last=null;new ResizeObserver(()=>{sizeStage();const r=svg.getBoundingClientRect();if(S.autofit&&r.width>50&&r.height>50&&(!last||Math.abs(last.w-r.width)>2||Math.abs(last.h-r.height)>2)){last={w:r.width,h:r.height};fit()}else draw()}).observe(svg);
  addEventListener("resize",sizeStage);addEventListener("orientationchange",()=>setTimeout(sizeStage,300));
  document.addEventListener("click",ev=>{if(!ev.target.closest(".dd"))menu()});
  if(!S.booted){S.booted=true;try{const a=JSON.parse(localStorage.getItem("flowstudio_auto")||"null");if(a&&a.doc&&a.doc.nodes&&a.doc.nodes.length){S.doc=migrate(a.doc);S.fileName=a.name||null;restoreHandle().then(()=>props())}}catch(e){}}
  S.autofit=true;sizeStage();requestAnimationFrame(()=>{sizeStage();fit()})}
function sizeStage(){const w=document.getElementById("fsWrap");if(!w)return;const top=w.getBoundingClientRect().top,h=Math.max(360,window.innerHeight-top-10);w.style.height=h+"px"}
function menu(id){document.querySelectorAll(".fs-bar .menu,.fs-tools .menu").forEach(m=>{m.classList.toggle("on",!!id&&m.id===id&&!m.classList.contains("on"))})}
function togglePanel(on){const w=document.getElementById("fsWrap");if(!w)return;const v=on==null?!w.classList.contains("panel"):!!on;w.classList.toggle("panel",v);S.panelClosed=!v}
function renderFiles(el){el.classList.remove("fs-editor");let r=[];try{r=JSON.parse(localStorage.getItem("flowstudio_recent")||"[]")}catch(e){}
  el.innerHTML=`<div class="hs-card"><h3>Samples and templates</h3><div class="fs-list">${(G.FS_SAMPLES||[]).map((s,i)=>`<div class="it"><b>${esc(s.title)}</b><small>${s.nodes.length} shapes · ${s.edges.length} connectors</small><div class="act"><button onclick="FS.openSample(${i})">Open in editor</button></div></div>`).join("")}</div></div>
  <div class="hs-card"><h3>Recent files (stored in this browser)</h3>${r.length?`<div class="fs-list">${r.map((x,i)=>`<div class="it"><b>${esc(x.name)}</b><small>${new Date(x.at).toLocaleString()}</small><div class="act"><button onclick="FS.openRecent(${i})">Open</button></div></div>`).join("")}</div>`:`<p class="hs-hint">None yet. Use "Open" in the editor to open a .flow.json file or an Obsidian .canvas file.</p>`}</div>
  <div class="hs-card"><h3>Where files live</h3><p>On a PC, "Save" writes directly to the folder you choose (Chrome/Edge). On a tablet the file is downloaded to the Download folder; move it to Google Drive > FlowStudio to continue on the PC. Every edit is also auto-saved in this browser, so the last diagram comes back when the app is reopened.</p></div>`}
function renderPaste(el){el.classList.remove("fs-editor");el.innerHTML=`<div class="hs-card"><h3>Paste from Claude</h3><p>Send a sketch to Claude (skill <b>sketch-to-flow</b>), then paste the JSON it returns here. An Obsidian .canvas JSON also works.</p>
  <textarea id="fsPasteBox" style="width:100%;min-height:260px;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:10px;font-family:monospace;font-size:13px" placeholder='{"v":1,"title":"...","nodes":[...],"edges":[...]}'></textarea>
  <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="hs-b" style="background:var(--c-primary);color:#fff;border:0;border-radius:10px;padding:10px 18px;font-size:15px;cursor:pointer" onclick="FS.pasteJson()">Import and open in editor</button><button class="hs-b" style="border:1px solid var(--line);background:var(--card);border-radius:10px;padding:10px 18px;font-size:15px;cursor:pointer" onclick="FS.copyJson()">Copy current diagram as JSON</button></div><p id="fsPasteMsg" class="hs-hint"></p></div>`}
function pasteJson(){const t=document.getElementById("fsPasteBox").value.trim();if(!t)return;loadText(t,"Pasted from Claude");HDShell.go("editor")}
async function copyJson(){try{await navigator.clipboard.writeText(JSONTXT());document.getElementById("fsPasteMsg").textContent="Copied. Paste it into the chat with Claude to have the diagram revised."}catch(e){document.getElementById("fsPasteBox").value=JSONTXT()}}
function openSample(i){const s=G.FS_SAMPLES[i];if(S.dirty&&!confirm("Current diagram is not saved. Open the sample instead?"))return;S.handle=null;load(JSON.parse(JSON.stringify(s)),null);HDShell.go("editor")}
function openRecent(i){const r=JSON.parse(localStorage.getItem("flowstudio_recent")||"[]")[i];if(!r)return;S.handle=null;load(r.doc,r.name);HDShell.go("editor")}
function renderHelp(el){el.classList.remove("fs-editor");el.innerHTML=`<div class="hs-card"><h3>Workflow</h3><ol><li>Sketch in Samsung Notes (or on paper) and share the image to the Claude app.</li><li>Claude reads it with the sketch-to-flow skill and returns a .flow.json file (or JSON text).</li><li>Open the file, or paste the text on the "Paste from Claude" page, then adjust with mouse, finger or S Pen.</li><li>Save as .flow.json (opens on both PC and tablet) and export PPTX / PNG / SVG / PDF / HTML / Obsidian from the Export menu.</li></ol></div>
  <div class="hs-card"><h3>Mouse, touch and S Pen</h3><p><b>Wheel</b> scrolls up/down · <b>Shift+wheel</b> scrolls sideways · <b>Ctrl+wheel</b> or two-finger pinch zooms · scrollbars appear at the right and bottom edges whenever the drawing is larger than the window; drag them or click on the track · <b>Pan</b> tool (or hold Space, or middle mouse button) drags the view · <b>Pen</b> draws freehand strokes with mouse, finger or S Pen; choose width and colour in the tray above the canvas; strokes are saved in the file and exported · <b>Eraser</b> removes strokes by dragging over them · tap a stroke with Select to change its width or colour · <b>Font size / Box size / Line width</b> steppers (− +) are in the Properties panel for the selected item, and "Whole diagram" steppers change everything at once</p></div>
  <div class="hs-card"><h3>File format (.flow.json)</h3><pre>{
 "v": 1, "title": "Diagram title", "w": 1600, "h": 1000, "grid": true,
 "nodes": [
  {"id": "k1", "type": "round", "x": 120, "y": 160, "w": 220, "h": 100,
   "text": "IEAT", "sub": "Role 1 Rules", "color": "c-primary", "fill": "tint",
   "icon": "gov", "dash": false, "font": 16}
 ],
 "ink": [ {"id": "p1", "color": "c-red", "w": 3, "pts": [[100,100],[140,120]]} ],
 "edges": [
  {"id": "e1", "from": {"node": "k1", "side": "bottom", "pos": 0.5},
   "to": {"node": "sb", "side": "top"}, "label": "MOU ?",
   "head": "end", "route": "ortho", "dash": false, "color": "c-navy", "width": 2.5}
 ]
}</pre>
  <p><b>type</b> rect · round · capsule · diamond · circle · doc · note · lane (lanes are drawn at the back; dragging a lane moves its contents, hold Alt to move the lane only)<br><b>color</b> c-primary c-navy c-sky c-green c-yellow c-orange c-red c-brown c-purple c-pink c-grey (follows the 3 themes)<br><b>fill</b> tint · solid (white text) · white<br><b>icon</b> ${Object.keys(ICONS).join(" · ")}<br><b>side</b> top right bottom left · <b>pos</b> position along the side 0.1-0.9 (when two connectors leave the same side) · <b>head</b> end both none · <b>route</b> ortho straight · <b>via</b> [{"x":80,"y":900}] waypoints to route around other shapes · a free end uses {"x":..,"y":..} instead of node</p></div>
  <div class="hs-card"><h3>Keyboard shortcuts</h3><p>Ctrl+Z / Ctrl+Y undo, redo · Ctrl+C / Ctrl+V copy, paste · Ctrl+A select all · Ctrl+S save · Delete · Arrow keys nudge 1 px (Shift = 20 px) · hold Space to pan · Esc back to Select · double-click to edit text</p></div>`}

G.FS={renderEditor,menu,secToggle,togglePanel,bumpFont,bumpLabel,bumpSize,bumpWidth,bumpAll,setInk,setInkColor,setPen,setPenColor,renderFiles,renderPaste,renderHelp,tool,undo,redo,copy,paste,del,align,order,setN,setNColor,setE,setEColor,setSide,setPos,setVia,flipEdge,setDoc,save,open,newDoc,exportSvg,exportPng,exportPdf,exportHtml,exportPptx,toObsidian,zoomAt:(f)=>{const s=document.getElementById("fsSvg");zoomAt(f,s.clientWidth/2,s.clientHeight/2)},fit,pasteJson,copyJson,openSample,openRecent,load,state:S};
})(window);
