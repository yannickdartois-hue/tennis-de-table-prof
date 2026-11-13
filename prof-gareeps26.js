/* =====================================================================
   prof-gareeps26.js — Outil prof : parcours « GAREEPS 2026 » (SCE / SRP / STOM)
   - Réglage par classe (Classes) : parcours, paliers du polygone ;
   - le QR de démarrage transmet le parcours et, pour les SCE suivantes,
     les polygones et les choix déjà reçus (chaque élève retrouve son historique
     quel que soit le téléphone de sa table) ;
   - import des tables de SCE (fichier « …_sce1.json » ou QR « SCE ») et des SRP / STOM ;
   - onglet « GAREEPS » : suivi par élève.
   Les classes réglées sur le parcours actuel (étoile 7 axes) ne voient aucun changement.
   ===================================================================== */
(function(){
'use strict';
const KS=['R','A','K','T'];
const estG26=c=>{const L=DB.classesL[c];return !!(L&&L.pa==='g26')};
const classeL=()=>Object.keys(DB.classesL).find(x=>norm(x)===norm(DB.classe));
// Paliers du polygone en % des points gagnés (L.pp). L.pal (ancien réglage en nombre de bonus) part encore pour les téléphones pas à jour.
const palDe=c=>{const L=DB.classesL[c];return L&&Array.isArray(L.pp)&&L.pp.length===3?L.pp:G26.palP};
const palAncien=c=>{const L=DB.classesL[c];return L&&Array.isArray(L.pal)&&L.pal.length===3?L.pal:G26.paliers};
function scoreM(b){let a=0,c=0;for(let i=0;i<b.length;i+=2){if(b[i]==='a')a++;else if(b[i]==='b')c++}return {a,b:c}}
// Totaux d'un joueur (index p) dans une table : bonus R/A/K/T + victoires
function totaux(t,p){const v={R:0,A:0,K:0,T:0};let vic=0,pts=0;
  t.m.forEach((m,mi)=>{const [ia,ib]=G26.rot[mi],c=ia===p?'a':ib===p?'b':null;if(!c)return;
    for(let i=0;i<m.b.length;i+=2)if(m.b[i]===c){pts++;if(m.b[i+1]!=='-')v[m.b[i+1]]=(v[m.b[i+1]]||0)+1}
    const s=scoreM(m.b),w=s.a>s.b?'a':s.b>s.a?'b':m.dec;if(m.b.length>=24&&w===c)vic++});
  const n=KS.map(k=>v[k]||0);return {v:n,vic,pts,pc:G26.pct(n,pts)};
}
function scoreSRP(x){const d=G26.srp.find(s=>s.k===x.k);const b=x.b||'',w=(b.match(/[xp]/g)||[]).length,bo=(b.match(/x/g)||[]).length,sc=w+bo*d.x;return {sc,deg:G26.degre(sc),fini:b.length>=G26.balles}}

/* ---------- Import ---------- */
function ajouterTable(t){
  if(!t||!t.joueurs||t.joueurs.length!==4)throw new Error('Table de SCE incomplète');
  DB.sce=DB.sce||{};
  const id=norm(t.classe)+'|'+t.sce+'|'+t.joueurs.map(norm).sort().join(','),old=DB.sce[id];
  const nb=x=>x.m.reduce((s,m)=>s+m.b.length,0);
  if(old&&(nb(old)>nb(t)||(nb(old)===nb(t)&&(old.ts||0)>=(t.ts||0)))){if(t.bil&&Object.keys(t.bil).length&&!Object.keys(old.bil||{}).length){old.bil=t.bil}return 'déjà à jour'}
  DB.sce[id]=t;t.joueurs.forEach(j=>retenirNom(cleEleve(t.classe,j),j));if(!t.dsp)delete t.dsp;
  return old?'mise à jour':'nouvelle';
}
function depuisFichier(o){
  return ajouterTable({classe:o.classe||'',seance:+o.seance,sce:+o.sce||1,table:String(o.table||''),joueurs:o.joueurs,ts:Date.parse(o.exportedAt)/1000||0,
    m:(o.matchs||[]).map(m=>({srv:m.srv||'',b:m.b||'',dec:m.dec||null,av:m.av||null})),obs:o.obs||{},bil:o.bilans||{},dsp:o.marqueur||''});
}
function depuisQR(q){
  return ajouterTable({classe:q.c||'',seance:+q.s,sce:+q.n||1,table:String(q.tb||''),joueurs:q.j,ts:q.ts||0,
    m:(q.m||[]).map(([srv,b,dec,av])=>({srv,b:b||'',dec:dec||null,av:av?{a:av[0]?{pj:av[0][0],f:av[0][1],fo:av[0][2]}:null,b:av[1]?{pj:av[1][0],f:av[1][1],fo:av[1][2]}:null}:null})),obs:{},bil:q.bl||{},dsp:q.dsp||''});
}
function g6DepuisQR(g){if(!g)return null;const [srp,stom]=g;
  return {srp:(srp||[]).map(([k,adv,obs,srv,b,tm])=>({k,adv,obs,srv,b,tm})),stom:(stom||[]).map(([k,at,nv,e,ok])=>({k,at,nv,e,ok}))}}

/* ---------- Historique d'une classe (pour le QR de démarrage) ---------- */
function tablesClasse(c){return Object.values(DB.sce||{}).filter(t=>norm(t.classe)===norm(c))}
function histoire(c){
  const H={};
  tablesClasse(c).sort((a,b)=>a.sce-b.sce||a.seance-b.seance).forEach(t=>t.joueurs.forEach((j,p)=>{
    const h=H[j]||(H[j]={s:{},p:{}});const x=totaux(t,p);h.s[t.sce]=x.v;h.p[t.sce]=x.pts;const ch=t.bil&&t.bil[p];if(ch&&ch.length)h.ch=ch}));
  return H;
}

/* ---------- Réglage dans l'onglet Classes ---------- */
function reglage(c){
  const L=DB.classesL[c],g=L.pa==='g26',p=palDe(c);
  return `<div class="g6reg"><label class="ch" for="pa-${esc(c)}">Parcours de la classe</label>
  <select id="pa-${esc(c)}" data-pa="${esc(c)}"><option value=""${g?'':' selected'}>Étoile 7 axes (actuel)</option><option value="g26"${g?' selected':''}>GAREEPS 2026 (SCE / SRP / STOM)</option></select>
  ${g?`<p class="small" style="margin:6px 0 0">Paliers du polygone (<b>% des points gagnés</b> avec ce bonus, sur les 2 matchs de SCE) : anneau 2 à partir de <input type="number" min="1" max="98" value="${p[0]}" data-pal="${esc(c)}" data-i="0" class="g6pal">, anneau 3 à partir de <input type="number" min="2" max="99" value="${p[1]}" data-pal="${esc(c)}" data-i="1" class="g6pal">, anneau 4 à partir de <input type="number" min="3" max="100" value="${p[2]}" data-pal="${esc(c)}" data-i="2" class="g6pal"> %</p>
  <p class="small muted" style="margin:4px 0 0">Au début des SCE n°2 et n°3, refais scanner le <b>QR de démarrage</b> : il apporte aux téléphones les polygones et les choix déjà reçus (${Object.keys(histoire(c)).length} élève(s) à ce jour).</p>`:''}</div>`;
}

/* ---------- Onglet GAREEPS : suivi ---------- */
function cellule(pc,n,pal){const lv=G26.niveau(pc,pal),col=['#f1f3f6','#fde2e2','#fff3c4','#d9f0dc','#9fd3a8'][lv];return `<td style="background:${col};text-align:center" title="${n} bonus">${pc}<small>%</small></td>`}
function vG26(){
  const c=classeL();if(!c||!estG26(c))return `<h2>GAREEPS 2026</h2><p class="muted">Choisis une classe réglée sur le parcours GAREEPS 2026 (onglet Classes).</p>`;
  const pal=palDe(c),T=tablesClasse(c),H=histoire(c),noms=liste();
  const S=[...new Set(T.map(t=>t.sce))].sort();
  // SRP et STOM : depuis les séances reçues
  const R={};recsClasse().forEach(r=>{if(!r.g26)return;const k=r.k;const o=R[k]||(R[k]={srp:{},stom:{}});
    (r.g26.srp||[]).forEach(x=>{const s=scoreSRP(x);if(!s.fini)return;const z=o.srp[x.k]||(o.srp[x.k]={n:0,best:0});z.n++;z.best=Math.max(z.best,s.deg)});
    (r.g26.stom||[]).forEach(y=>{const id=y.k+y.at;o.stom[id]=Math.max(o.stom[id]||0,y.ok||0)})});
  const sansTable=S.map(n=>[n,noms.filter(j=>!T.some(t=>t.sce===n&&t.joueurs.some(x=>norm(x)===norm(j))))]);
  const ligne=j=>{const h=H[j]||Object.entries(H).find(([x])=>norm(x)===norm(j))?.[1]||{s:{}},k=cleEleve(c,j),o=R[k]||{srp:{},stom:{}};
    const nst=Object.values(o.stom),n1=nst.filter(x=>x>=1).length,n2=nst.filter(x=>x>=2).length;
    return `<tr><td><button type="button" class="lien" data-act="fiche" data-k="${esc(k)}">${esc(j)}</button></td>
    ${[1,2,3].map(n=>h.s[n]?(pts=>G26.pct(h.s[n],pts).map((pc,i)=>cellule(pc,h.s[n][i],pal)).join(''))(h.p&&h.p[n]!=null?h.p[n]:h.s[n].reduce((a,x)=>a+x,0)):'<td colspan="4" class="muted" style="text-align:center">—</td>').join('')}
    <td>${(h.ch||[]).map(x=>G26.brK[x].ic).join(' ')||'—'}</td>
    ${KS.map(x=>{const z=o.srp[x];return `<td style="text-align:center">${z?'D'+z.best+' <small class="muted">('+z.n+')</small>':'—'}</td>`}).join('')}
    <td style="text-align:center">${n1?n1+' <small class="muted">dont '+n2+' niv. 2</small>':'—'}</td></tr>`};
  return `<h2>GAREEPS 2026 · ${esc(c)}</h2>
  <section class="carte"><p class="small" style="margin-top:0">Polygone : part des points gagnés avec chaque bonus (⚡ rapide, 📐 architecte, 💥 KO, 🎯 tactique) sur les 2 matchs de chaque SCE, en %. Le nombre de bonus s’affiche au survol. Couleur = anneau atteint (paliers ${pal.join(' / ')} %). SRP : meilleur degré (nombre de matchs complets). STOM : ateliers validés sur 12.</p>
  ${sansTable.filter(([n,L])=>L.length).map(([n,L])=>`<p class="avert small">SCE n°${n} : pas de table reçue pour ${L.map(esc).join(', ')}.</p>`).join('')}
  <div class="tablewrap"><table class="cl"><thead><tr><th rowspan="2">Élève</th>${[1,2,3].map(n=>`<th colspan="4">SCE ${n}</th>`).join('')}<th rowspan="2">Choix</th><th colspan="4">SRP</th><th rowspan="2">STOM</th></tr>
  <tr>${[1,2,3].map(()=>G26.br.map(b=>`<th title="${esc(b.n)}">${b.ic}</th>`).join('')).join('')}${G26.br.map(b=>`<th>${b.ic} ${G26.brK[b.k].srp}</th>`).join('')}</tr></thead>
  <tbody>${noms.map(ligne).join('')}</tbody></table></div></section>
  ${vStomClasse(c)}
  <section class="carte"><h3>Tables de SCE reçues (${T.length})</h3>${T.length?`<ul class="small">${T.sort((a,b)=>a.sce-b.sce||(+a.table)-(+b.table)).map(t=>`<li>SCE ${t.sce} · séance ${t.seance} · table ${esc(t.table)} : ${t.joueurs.map(j=>esc(j.split(/\s+/)[0])).join(', ')} · ${t.m.filter(m=>m.b.length>=24).length}/4 matchs${t.dsp?' · 🩹 marqueur '+esc(t.dsp.split(/\s+/)[0]):''}</li>`).join('')}</ul>`:'<p class="muted small">Aucune pour l’instant : les téléphones des tables envoient leur résultat en fin de cours (Nuage ou QR).</p>'}</section>`;
}
/* ---------- Polygone dessiné (même lecture que sur le téléphone de l'élève) ---------- */
const COLS=['#64748B','#EA580C','#7C3AED'];
function polySVG(series,pal){
  const cx=150,cy=140,R=100,ang=[-90,0,90,180].map(a=>a*Math.PI/180),pt=(i,r)=>[cx+Math.cos(ang[i])*r,cy+Math.sin(ang[i])*r];
  let g='';for(let l=1;l<=4;l++)g+=`<polygon points="${[0,1,2,3].map(i=>pt(i,R*l/4).join(',')).join(' ')}" fill="none" stroke="#d5dae1" stroke-width="${l===4?1.4:.8}"/>`;
  [0,1,2,3].forEach(i=>{const [x,y]=pt(i,R);g+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#d5dae1"/>`});
  series.forEach(s=>{const P=s.v.map((v,i)=>{const lv=G26.niveau(v,pal);return pt(i,lv?lv*R/4:R*.06)});
    g+=`<polygon points="${P.map(p=>p.join(',')).join(' ')}" fill="${s.c}" fill-opacity=".14" stroke="${s.c}" stroke-width="2.5"/>`+P.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${s.c}"/>`).join('')});
  const lab=[[cx,cy-R-12,'middle'],[cx+R+8,cy+4,'start'],[cx,cy+R+20,'middle'],[cx-R-8,cy+4,'end']];
  g+=G26.br.map((b,i)=>`<text x="${lab[i][0]}" y="${lab[i][1]}" text-anchor="${lab[i][2]}" font-size="13" font-weight="700" fill="${b.col}">${b.ic} ${esc(b.n)}</text>`).join('');
  return `<svg viewBox="-60 0 420 290" style="width:100%;max-width:400px;display:block;margin:auto" role="img" aria-label="Polygone des bonus">${g}</svg>
  <p class="small" style="text-align:center;margin:2px 0">${series.map(s=>`<span style="color:${s.c};font-weight:700">■ ${esc(s.l)}</span>`).join(' &nbsp; ')}</p>
  <p class="small muted" style="text-align:center;margin:0">Part des points gagnés avec chaque bonus. Anneaux : moins de ${pal[0]} % · ${pal[0]}-${pal[1]-1} % · ${pal[1]}-${pal[2]-1} % · ${pal[2]} % et +</p>`;
}
/* ---------- Bilan détaillé des SCE d'un élève ---------- */
const liste_=v=>Array.isArray(v)?v:v&&typeof v==='object'?Object.values(v).flat():[];
function tablesEleve(c,nom){return tablesClasse(c).map(t=>({t,p:t.joueurs.findIndex(j=>norm(j)===norm(nom))})).filter(x=>x.p>=0).sort((a,b)=>a.t.sce-b.t.sce||a.t.seance-b.t.seance)}
function bilanSCE(c,nom){
  const T=tablesEleve(c,nom),pal=palDe(c);if(!T.length)return '';
  const parSce={};T.forEach(x=>parSce[x.t.sce]=x); // la dernière table reçue pour chaque SCE
  const L=Object.values(parSce);
  const series=L.map(({t,p})=>({l:'SCE '+t.sce,v:totaux(t,p).pc,c:COLS[(t.sce-1)%3]}));
  let h=`<section class="carte"><h3>GAREEPS 2026 : polygone</h3>${polySVG(series,pal)}</section>`;
  L.forEach(({t,p})=>{const x=totaux(t,p);
    const M=t.m.map((m,mi)=>{const [ia,ib]=G26.rot[mi],c2=ia===p?'a':ib===p?'b':null;if(!c2)return null;
      const adv=t.joueurs[c2==='a'?ib:ia];
      let a=0,b=0;for(let i=0;i<m.b.length;i+=2){if(m.b[i]===c2)a++;else b++}
      const av=m.av&&m.av[c2]||null,gagne=a>b||(a===b&&m.dec===c2);
      return {mi,adv,a,b,gagne,fini:m.b.length>=24,dec:a===b&&m.dec?(m.dec===c2?' (décisif gagné)':' (décisif perdu)'):'',pj:av&&av.pj||'',fo:liste_(av&&av.fo),fa:liste_(av&&av.f)}}).filter(Boolean);
    const vu=Object.entries(t.obs||{}).filter(([k])=>+k.split('>')[1]===p).map(([k,o])=>({qui:t.joueurs[+k.split('>')[0]],L:liste_(o)}));
    const ch=t.bil&&t.bil[p]||[];
    h+=`<section class="carte"><h3>SCE n°${t.sce} · séance ${t.seance} · table ${esc(t.table)}${t.dsp?' <small class="muted">(marqueur : '+esc(t.dsp)+')</small>':''}</h3>
    <div class="tablewrap"><table class="cl"><thead><tr><th>Match</th><th>Contre</th><th>Score</th><th>Avant le match</th><th>Projet de jeu</th></tr></thead><tbody>
    ${M.map(m=>`<tr><td>${m.mi+1}</td><td>${esc(m.adv)}</td><td><b>${m.a}-${m.b}</b>${m.dec}${m.fini?(m.gagne?' ✓':''):' <small class="muted">(inachevé)</small>'}</td>
      <td class="small">${m.fo.length?'Mes points forts : '+m.fo.map(esc).join(', '):''}${m.fa.length?'Ses points faibles : '+m.fa.map(esc).join(', '):''}${!m.fo.length&&!m.fa.length?'—':''}</td><td class="small">${m.pj?esc(m.pj):'—'}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="tablewrap"><table class="cl"><thead><tr><th></th>${G26.br.map(b=>`<th style="color:${b.col}">${b.ic} ${esc(b.n)}</th>`).join('')}<th>Points gagnés</th><th>Victoires</th></tr></thead><tbody>
    <tr><td>Bonus</td>${x.v.map((v,i)=>`<td style="text-align:center">${v} <small class="muted">(${x.pc[i]} %)</small></td>`).join('')}<td style="text-align:center">${x.pts}</td><td style="text-align:center">${x.vic} / 2</td></tr></tbody></table></div>
    <p class="small" style="margin:6px 0 0"><b>Vu par son observateur :</b> ${vu.filter(o=>o.L.length).map(o=>`${esc(o.qui)} a relevé ${o.L.map(esc).join(', ')}`).join(' · ')||'<span class="muted">rien de noté</span>'}</p>
    <p class="small" style="margin:4px 0 0"><b>Priorités choisies après cette SCE :</b> ${ch.length?ch.map((k,i)=>`${i+1}. ${G26.brK[k].ic} ${esc(G26.brK[k].n)}`).join(' · '):'<span class="muted">non choisies</span>'}</p></section>`});
  return h;
}
/* ---------- STOM de la classe : élève × atelier ---------- */
function vStomClasse(c){
  const noms=liste(),A=[];G26.stom.forEach(S=>S.at.forEach((a,i)=>A.push({k:S.k,at:i+1,jeu:a.jeu})));
  const M={};recsClasse().forEach(r=>{if(!r.g26)return;(r.g26.stom||[]).forEach(y=>{const id=r.k+'|'+y.k+y.at,o=M[id]||(M[id]={ok:0,e:0});o.ok=Math.max(o.ok,y.ok||0);o.e+=(y.e||[]).filter(v=>v!==''&&v!=null).length})});
  const tot=A.map(a=>noms.filter(j=>{const o=M[cleEleve(c,j)+'|'+a.k+a.at];return o&&(o.ok||o.e)}).length);
  return `<section class="carte"><h3>STOM de la classe</h3><p class="small muted" style="margin-top:0">Case = niveau validé (1 ou 2) ; « · » = essais sans validation. La dernière ligne compte les élèves passés par chaque atelier.</p>
  <div class="tablewrap"><table class="cl compacte"><thead><tr><th>Élève</th>${A.map(a=>`<th title="${esc(a.jeu)}" style="color:${G26.brK[a.k].col};font-size:.8em;line-height:1.1">${G26.brK[a.k].ic}${a.at}<br><span style="color:var(--texte,#333);font-weight:500">${esc(a.jeu.replace(/^(Le |La |L’|L')/,''))}</span></th>`).join('')}</tr></thead><tbody>
  ${noms.map(j=>`<tr><td><button type="button" class="lien" data-act="fiche" data-k="${esc(cleEleve(c,j))}">${esc(j)}</button></td>${A.map(a=>{const o=M[cleEleve(c,j)+'|'+a.k+a.at];
    return `<td style="text-align:center;${o&&o.ok?'background:'+(o.ok>=2?'#9fd3a8':'#d9f0dc'):''}">${o?(o.ok?'<b>'+o.ok+'</b>':'·'):''}</td>`}).join('')}</tr>`).join('')}
  <tr><td><b>Élèves</b></td>${tot.map(n=>`<td style="text-align:center;${n?'':'color:#b91c1c'}"><b>${n}</b></td>`).join('')}</tr></tbody></table></div></section>`;
}
// Fiche élève : polygone, bilans de SCE, SRP / STOM détaillés
function ficheG26(k){
  const c=classeL(),nom=nomAffiche(k),poly=c&&estG26(c)?bilanSCE(c,nom):'';
  const L=Object.values(DB.rec).filter(r=>r.k===k&&r.g26).sort((a,b)=>a.seance-b.seance);if(!L.length)return poly;
  return poly+`<section class="carte"><h3>GAREEPS 2026 : SRP et STOM</h3><div class="tablewrap"><table class="cl"><thead><tr><th>Séance</th><th>SRP</th><th>Contre</th><th>Score parlant</th><th>Degré</th></tr></thead><tbody>
  ${L.flatMap(r=>(r.g26.srp||[]).map(x=>{const s=scoreSRP(x);return `<tr><td>${r.seance}</td><td>${G26.brK[x.k].ic} ${esc(G26.srp[G26.brK[x.k].srp-1].t)}</td><td>${esc(x.adv||'')}</td><td>${s.sc}${s.fini?'':' (inachevé)'}</td><td>${s.deg}</td></tr>${x.tm?`<tr><td></td><td colspan="4" class="small muted">Temps mort : ${esc(x.tm)}</td></tr>`:''}`})).join('')}</tbody></table></div>
  <p class="small" style="margin-bottom:0">${L.flatMap(r=>(r.g26.stom||[]).map(y=>{const D=G26.stom.find(s=>s.k===y.k),a=D&&D.at[y.at-1];return a?`${G26.brK[y.k].ic} ${esc(a.jeu)} : ${y.ok?'niveau '+y.ok:'non validé'} (${(y.e||[]).filter(v=>v!==''&&v!=null).join(', ')})`:''})).filter(Boolean).join(' · ')||''}</p></section>`;
}

/* ---------- Évènements ---------- */
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.pa!=null){const L=DB.classesL[t.dataset.pa];if(!L)return;if(t.value)L.pa=t.value;else delete L.pa;sauver();rendre();return}
  if(t.dataset&&t.dataset.pal!=null){const L=DB.classesL[t.dataset.pal];const p=palDe(t.dataset.pal).slice();p[+t.dataset.i]=Math.max(1,Math.min(100,+t.value||1));
    if(!(p[0]<p[1]&&p[1]<p[2])){alert('Les paliers doivent augmenter : ex. 10, 20, 30 %.');rendre();return}L.pp=p;sauver();return}
});
const css=document.createElement('style');css.textContent='.g6reg{margin-top:10px;padding-top:10px;border-top:1px dashed var(--trait)}.g6pal{width:58px;min-height:36px;text-align:center}';document.head.appendChild(css);

window.G6P={estG26,palDe,palAncien,histoire,reglage,vG26,ficheG26,depuisFichier,depuisQR,g6DepuisQR};
})();
