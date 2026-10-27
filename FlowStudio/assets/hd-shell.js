/* hd-shell.js - โครงแอปแบบบ้านสำหรับทุกเว็บไซต์ (rev 1 · 26 ก.ย. 2569)
   ให้: เมนูข้างหลากสี (แต่ละปุ่มสีประจำ), หัวหน้าพร้อมปุ่มย้อนกลับ/หน้าแรก/breadcrumb, แถบสีแบ่งช่องใต้หัว,
        ปุ่มสลับธีม 3 ชุด, ปุ่มโลโก้ + (เริ่มต้นไม่มีโลโก้), hash routing #view/param, ไอคอน SVG, ตกแต่งหัวการ์ดอัตโนมัติ
   ต้องโหลดก่อน: hd-theme.css, hd-fonts.js, (hd-logos.js ถ้าต้องการคลังโลโก้ในตัว), hd-diagram.js (ถ้าใช้ผัง)
   ใช้:
     HDShell.init({
       key:"myapp",                     // คีย์ localStorage (ตั้งค่า ธีม โลโก้)
       brand:["ชื่อ","แอป","2569"],       // ชื่อแบรนด์ 1-3 ท่อน แต่ละท่อนสีต่างกัน
       tagline:"หน่วยงาน",
       home:"dash",
       views:[{id:"dash",label:"ภาพรวม",icon:"home",color:"c-primary",render:el=>{...}}, ...],
       logoLibrary:["mtec","nstda","mhesi","eow"]   // ไม่ใส่ = ไม่มีคลังโลโก้ ให้อัปโหลดเองเท่านั้น
     });
     HDShell.go("view", param)  HDShell.back()  HDShell.render()  HDShell.logos()  HDShell.ic(name,size,color) */
(function(G){"use strict";
const S={cfg:{},opt:null,cur:null,param:null,depth:0};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ICON={home:'<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',gantt:'<path d="M4 5h9M7 10h11M5 15h7M10 20h10"/>',factory:'<path d="M3 21V10l5 3V10l5 3V6l8 4v11z"/><path d="M7 17h2M12 17h2M17 17h2"/>',filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',team:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 15c3 0 5 1.8 5 4.5"/>',chat:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',flask:'<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',coin:'<circle cx="12" cy="12" r="9"/><path d="M9.5 8h3.8a2 2 0 0 1 0 4H9.5M9.5 12h4.2a2 2 0 0 1 0 4H9.5M9.5 8v8M11.5 6v2M11.5 16v2"/>',db:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',alert:'<path d="M12 3 2 20h20z"/><path d="M12 9v5M12 17h.01"/>',check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',x:'<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',leaf:'<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="m5 19 7-7"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',trend:'<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',map:'<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',recycle:'<path d="M7 7 9.5 3h5L17 7M17 7l-2 1M17 7l1 2M20 13l2 4-2.5 4H14M14 21l1-2M14 21l-2-1M7 21H4.5L2 17l2.5-4M4.5 13l2 .5M4.5 13l-.5 2"/>',link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'};
const ic=(n,sz,col)=>`<svg class="ico" width="${sz||18}" height="${sz||18}" viewBox="0 0 24 24" fill="none" style="stroke:${col||"currentColor"}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]||ICON.target}</svg>`;
const THEMES={vivid:"สดใส",earth:"เอิร์ธโทน",eco:"รักษ์โลก"};
const SW={vivid:["#0077B6","#F2B705","#F77F00","#2F9E44"],earth:["#3D6A8A","#D4A437","#C06C2F","#5E7D4F"],eco:["#2D6A4F","#2A9D8F","#E9C46A","#6A994E"]};
const cv=c=>c&&c.startsWith("c-")?`var(--${c})`:c;
const save=()=>{try{localStorage.setItem(S.opt.key+"_shell",JSON.stringify(S.cfg))}catch(e){}};
const logos=()=>S.cfg.logos||(S.cfg.logos=[]);
const lsrc=l=>l.src&&l.src.startsWith("builtin:")?((G.HD_LOGOS||{})[l.src.slice(8)]||{}).src||"":l.src;
const LIB_NAME={mtec:"MTEC",nstda:"สวทช.",mhesi:"อว.",eow:"End-of-Waste"};

const CSS=`
.hs{display:flex;min-height:100vh;font-family:"Kanit","Leelawadee UI",Tahoma,sans-serif;font-size:15px;line-height:1.55;color:var(--ink);background:var(--bg)}
.hs button,.hs input,.hs select,.hs textarea{font-family:inherit;font-size:14.5px}
.hs-side{width:236px;flex:0 0 236px;background:var(--side2);display:flex;flex-direction:column;height:100vh;position:sticky;top:0}
.hs-brand{display:flex;gap:10px;align-items:center;padding:16px 16px 12px;border-bottom:1px solid rgba(255,255,255,.08)}
.hs-brand .lg{width:38px;height:38px;border-radius:10px;background:var(--c-orange);display:grid;place-items:center;color:#fff;flex:0 0 38px}
.hs-brand b{display:block;font-weight:600;font-size:16px;line-height:1.3}.hs-brand .b0{color:var(--c-yellow)}.hs-brand .b1{color:var(--c-sky)}.hs-brand .b2{color:var(--c-orange)}
.hs-brand small{color:color-mix(in srgb,var(--c-green) 55%,white);font-size:14px}
.hs-nav{flex:1;overflow-y:auto;padding:10px 8px}
.hs-nav button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border:0;background:none;cursor:pointer;border-radius:10px;margin:2px 0;padding:9px 10px;font-weight:500;color:color-mix(in srgb,var(--vc) 50%,white)}
.hs-nav button .ni{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;flex:0 0 28px;background:color-mix(in srgb,var(--vc) 26%,transparent);color:color-mix(in srgb,var(--vc) 45%,white)}
.hs-nav button:hover{background:color-mix(in srgb,var(--vc) 16%,transparent);color:#fff}
.hs-nav button.on{background:var(--vc);color:#fff;box-shadow:0 4px 14px color-mix(in srgb,var(--vc) 45%,transparent)}.hs-nav button.on .ni{background:rgba(255,255,255,.22);color:#fff}
.hs-nav button.dk.on,.hs-nav button.dk.on .ni{color:var(--ink)}
.hs-main{flex:1;min-width:0;height:100vh;overflow-y:auto}
.hs-top{position:sticky;top:0;z-index:20;background:var(--card);padding:10px 24px 14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.hs-top::after{content:"";position:absolute;left:0;right:0;bottom:0;height:4px;background:linear-gradient(90deg,var(--c-primary) 0 14.28%,var(--c-green) 0 28.56%,var(--c-yellow) 0 42.84%,var(--c-orange) 0 57.12%,var(--c-red) 0 71.4%,var(--c-purple) 0 85.68%,var(--c-sky) 0 100%)}
.hs-top .sp{flex:1}.hs-b{border-radius:8px;padding:5px 12px;cursor:pointer;font-weight:600;border:1px solid}
.hs-back{background:color-mix(in srgb,var(--c-sky) 14%,white);border-color:color-mix(in srgb,var(--c-sky) 50%,white);color:color-mix(in srgb,var(--c-sky) 70%,black)}
.hs-home{background:color-mix(in srgb,var(--c-green) 14%,white);border-color:color-mix(in srgb,var(--c-green) 50%,white);color:color-mix(in srgb,var(--c-green) 70%,black)}
.hs-theme{display:none}.hx-themes{display:inline-flex;gap:4px;background:color-mix(in srgb,var(--c-yellow) 14%,white);border:1px solid color-mix(in srgb,var(--c-yellow) 50%,white);border-radius:10px;padding:3px}.hx-th{border:0;border-radius:8px;padding:4px 10px;cursor:pointer;font-weight:600;font-size:14px;display:inline-flex;gap:6px;align-items:center;background:transparent;color:color-mix(in srgb,var(--c-amber) 80%,black);font-family:inherit}.hx-th:hover{background:rgba(255,255,255,.7)}.hx-th.on{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.15);color:var(--ink)}.hx-sw{display:inline-flex;gap:2px}.hx-sw i{width:9px;height:9px;border-radius:50%;display:block}
.hs-theme-old{background:color-mix(in srgb,var(--c-yellow) 22%,white);border-color:color-mix(in srgb,var(--c-yellow) 60%,white);color:color-mix(in srgb,var(--c-amber) 80%,black);display:inline-flex;gap:6px;align-items:center}
.hs-pg{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:#fff;background:var(--vc)}
.hs-top h1{font-size:20px;font-weight:500;margin:0;color:color-mix(in srgb,var(--vc) 82%,black)}.hs-crumb{font-size:14px;color:var(--muted)}.hs-crumb a{text-decoration:none;font-weight:500}
.hs-logos{display:flex;gap:6px;align-items:center}.hs-lb{background:#fff;border-radius:8px;padding:3px 8px;height:36px;display:inline-flex;align-items:center;border:1px solid var(--line);cursor:pointer}.hs-lb img{height:28px;max-width:120px;object-fit:contain}
.hs-add{width:36px;height:36px;border-radius:8px;border:2px dashed var(--c-pink);background:color-mix(in srgb,var(--c-pink) 8%,white);color:var(--c-pink);font-size:20px;cursor:pointer}
.hs-wrap{padding:20px 24px 80px;max-width:1400px}
.hs-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin-bottom:16px}
.hs-card h3{font-size:16px;font-weight:500;margin:0 0 10px}.hs-hico{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:8px;margin-right:8px;vertical-align:middle}
.hs-modal{position:fixed;inset:0;background:rgba(0,0,0,.35);display:none;align-items:center;justify-content:center;z-index:60}.hs-modal.on{display:flex}
.hs-box{background:var(--card);border-radius:12px;width:min(820px,96vw);max-height:92vh;overflow-y:auto;padding:18px 20px}
.hs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}.hs-lc{border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--card);cursor:pointer}.hs-lc .im{height:70px;display:grid;place-items:center;background:#fff;border-radius:8px;border:1px solid var(--line);margin-bottom:6px}.hs-lc .im img{max-height:60px;max-width:170px}
.hs-hint{font-size:14px;color:var(--muted)}
@media(max-width:760px){.hs{display:block}.hs-side{position:static;width:auto;height:auto}.hs-nav{display:flex;overflow-x:auto}.hs-nav button{white-space:nowrap;width:auto}.hs-main{height:auto}}`;

function frame(){const o=S.opt,b=(o.brand||["แอป"]).map((t,i)=>`<span class="b${i}">${esc(t)}</span>`).join(" ");
  document.body.insertAdjacentHTML("afterbegin",`<style>${CSS}</style><div class="hs"><aside class="hs-side"><div class="hs-brand"><span class="lg">${ic(o.brandIcon||"recycle",22,"#fff")}</span><div><b>${b}</b><small>${esc(o.tagline||"")}</small></div></div><nav class="hs-nav" id="hsNav"></nav></aside>
  <div class="hs-main" id="hsMain"><header class="hs-top" id="hsTop"><button class="hs-b hs-back" onclick="HDShell.back()">← ย้อนกลับ</button><button class="hs-b hs-home" onclick="HDShell.go(HDShell.home())">หน้าแรก</button><span class="hs-pg" id="hsPg"></span><div><div class="hs-crumb" id="hsCrumb"></div><h1 id="hsTitle"></h1></div><span class="sp"></span><div class="hx-themes" id="hsTheme" role="radiogroup" aria-label="เลือกธีมสี"></div><div class="hs-logos" id="hsLogos"></div></header><div class="hs-wrap" id="hsView"></div></div></div>
  <div class="hs-modal" id="hsModal" onclick="if(event.target===this)HDShell.closeM()"><div class="hs-box" id="hsBox"></div></div>`)}
function nav(){const o=S.opt;document.getElementById("hsNav").innerHTML=o.views.map(v=>`<button class="${v.id===S.cur?"on":""} ${v.color==="c-yellow"?"dk":""}" style="--vc:${cv(v.color||"c-primary")}" onclick="HDShell.go('${v.id}')"><span class="ni">${ic(v.icon,17)}</span>${esc(v.label)}</button>`).join("")}
function route(){const[v,p]=(location.hash||"#"+S.opt.home).slice(1).split("/");S.cur=S.opt.views.some(x=>x.id===v)?v:S.opt.home;S.param=p==null?null:decodeURIComponent(p);closeM();render()}
function render(){const o=S.opt,v=o.views.find(x=>x.id===S.cur),home=o.views.find(x=>x.id===o.home),top=document.getElementById("hsTop");
  top.style.setProperty("--vc",cv(v.color||"c-primary"));document.getElementById("hsPg").innerHTML=ic(v.icon,20,v.color==="c-yellow"?"var(--ink)":"#fff");
  document.getElementById("hsTitle").textContent=v.label+(S.param&&v.titleOf?": "+v.titleOf(S.param):"");
  document.getElementById("hsCrumb").innerHTML=S.cur===o.home?"หน้าแรก":`<a href="#" style="color:${cv(home.color||"c-primary")}" onclick="HDShell.go('${o.home}');return false">หน้าแรก</a> › ${esc(v.label)}`;
  nav();themeBtn();logoBar();const el=document.getElementById("hsView");el.innerHTML="";v.render(el,S.param);decorate(el);document.getElementById("hsMain").scrollTop=0}
const KW=[[/งบ|บาท/,"coin","c-amber"],[/แผน|กำหนดการ|เวลา/,"calendar","c-pink"],[/ผัง|ไดอะแกรม|กระบวนการ/,"recycle","c-primary"],[/เตือน|ประเด็น|ล่าช้า/,"alert","c-red"],[/ทีม|ผู้ใช้/,"team","c-purple"],[/ไฟล์|เอกสาร/,"file","c-brown"],[/ข้อมูล/,"db","c-sky"],[/ความก้าวหน้า|ผล/,"trend","c-green"]];
function decorate(root){root.querySelectorAll(".hs-card h3:not([data-d])").forEach((h,i)=>{h.dataset.d=1;const k=KW.find(x=>x[0].test(h.textContent))||[0,"target",["c-primary","c-green","c-orange","c-sky","c-purple","c-pink"][i%6]],c=cv(k[2]);h.insertAdjacentHTML("afterbegin",`<span class="hs-hico" style="color:${c};background:color-mix(in srgb,${c} 13%,transparent)">${ic(k[1],16)}</span>`)})}
/* ธีม: ปุ่มเลือก 3 ธีมคลิกได้ทุกหน้า เก็บค่าร่วมที่ localStorage "house_theme" (ใช้ร่วมกับ house-skin.js) */
const curTheme=()=>{let v;try{v=JSON.parse(localStorage.getItem("house_theme"))}catch(e){}return THEMES[v]?v:(THEMES[S.cfg.theme]?S.cfg.theme:"vivid")};
function themeBtn(){const t=curTheme();document.documentElement.dataset.theme=t;const b=document.getElementById("hsTheme");if(b)b.innerHTML=Object.keys(THEMES).map(k=>`<button class="hx-th ${k===t?"on":""}" role="radio" aria-checked="${k===t}" onclick="HDShell.setTheme('${k}')"><span class="hx-sw">${SW[k].map(c=>`<i style="background:${c}"></i>`).join("")}</span>${THEMES[k]}</button>`).join("")}
function setTheme(k){if(!THEMES[k])return;S.cfg.theme=k;save();try{localStorage.setItem("house_theme",JSON.stringify(k))}catch(e){}render()}
function toggleTheme(){const k=Object.keys(THEMES);setTheme(k[(k.indexOf(curTheme())+1)%k.length])}
/* ---- โลโก้: เริ่มต้นว่าง · ปุ่ม + เพิ่มจากไฟล์หรือคลังในตัว · คลิกโลโก้เพื่อจัดการ ---- */
function logoBar(){const el=document.getElementById("hsLogos");el.innerHTML=logos().filter(l=>l.header!==false).map(l=>`<button class="hs-lb" title="${esc(l.name)}" onclick="HDShell.openLogos()"><img src="${lsrc(l)}" alt="${esc(l.name)}"></button>`).join("")+`<button class="hs-add" title="เพิ่มโลโก้" onclick="HDShell.addLogo()">+</button>`}
function openM(h){document.getElementById("hsBox").innerHTML=`<button onclick="HDShell.closeM()" style="float:right;border:0;background:none;font-size:22px;cursor:pointer">×</button>`+h;document.getElementById("hsModal").classList.add("on")}
function closeM(){const m=document.getElementById("hsModal");if(m)m.classList.remove("on")}
function addLogo(){const have=logos().map(l=>l.id),lib=(S.opt.logoLibrary||[]).filter(k=>!have.includes(k)&&G.HD_LOGOS&&G.HD_LOGOS[k]);
  openM(`<h3>เพิ่มโลโก้</h3><p class="hs-hint">เลือกไฟล์ภาพจากเครื่อง${lib.length?" หรือเลือกจากคลังโลโก้":""}</p><div class="hs-grid"><div class="hs-lc" onclick="HDShell.pickFile()"><div class="im" style="font-size:30px;color:var(--c-pink)">+</div><b>เลือกไฟล์จากเครื่อง</b></div>${lib.map(k=>`<div class="hs-lc" onclick="HDShell.addLib('${k}')"><div class="im"><img src="${G.HD_LOGOS[k].src}"></div><b>${esc(LIB_NAME[k]||k)}</b></div>`).join("")}</div>`)}
function addLib(k){logos().push({id:k,name:LIB_NAME[k]||k,src:"builtin:"+k,header:true});save();closeM();logoBar()}
function pickFile(){const f=document.createElement("input");f.type="file";f.accept="image/*";f.onchange=()=>{const file=f.files[0];if(!file)return;const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,480/im.width,160/im.height),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);
  logos().push({id:"L"+Date.now().toString(36),name:file.name.replace(/\.[^.]+$/,""),src:c.toDataURL("image/png"),header:true});save();closeM();logoBar()};im.src=rd.result};rd.readAsDataURL(file)};f.click()}
function openLogos(){openM(`<h3>โลโก้</h3><p class="hs-hint">คลิกเพื่อซ่อน/แสดงที่หัวแอป หรือลบ</p><div class="hs-grid">${logos().map((l,i)=>`<div class="hs-lc"><div class="im"><img src="${lsrc(l)}"></div><b>${esc(l.name)}</b><div style="margin-top:6px;display:flex;gap:6px"><button class="hs-b hs-home" onclick="HDShell.toggleLogo(${i})">${l.header!==false?"ซ่อน":"แสดง"}</button><button class="hs-b hs-back" onclick="HDShell.delLogo(${i})">ลบ</button></div></div>`).join("")}<div class="hs-lc" onclick="HDShell.addLogo()"><div class="im" style="font-size:30px;color:var(--c-pink)">+</div><b>เพิ่มโลโก้</b></div></div>`)}
G.HDShell={
  init(o){S.opt=o;try{S.cfg=JSON.parse(localStorage.getItem(o.key+"_shell")||"{}")}catch(e){S.cfg={}}frame();addEventListener("hashchange",route);addEventListener("keydown",e=>{if(e.altKey&&e.key==="ArrowLeft"){e.preventDefault();G.HDShell.back()}if(e.key==="Escape")closeM()});route();if(document.fonts)document.fonts.ready.then(render)},
  go(v,p){const h=v+(p!=null?"/"+encodeURIComponent(p):"");if(location.hash.slice(1)===h){route();return}S.depth++;location.hash=h},
  back(){if(S.depth>0){S.depth--;history.back()}else this.go(S.opt.home)},home:()=>S.opt.home,render,toggleTheme,setTheme,ic,esc,openM,closeM,
  logos,addLogo,addLib,pickFile,openLogos,toggleLogo(i){const l=logos()[i];l.header=l.header===false;save();openLogos();logoBar()},delLogo(i){logos().splice(i,1);save();openLogos();logoBar()},logoSrc:lsrc};
})(window);
