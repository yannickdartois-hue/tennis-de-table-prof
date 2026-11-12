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
const palDe=c=>{const L=DB.classesL[c];return L&&Array.isArray(L.pal)&&L.pal.length===3?L.pal:G26.paliers};
function scoreM(b){let a=0,c=0;for(let i=0;i<b.length;i+=2){if(b[i]==='a')a++;else if(b[i]==='b')c++}return {a,b:c}}
// Totaux d'un joueur (index p) dans une table : bonus R/A/K/T + victoires
function totaux(t,p){const v={R:0,A:0,K:0,T:0};let vic=0;
  t.m.forEach((m,mi)=>{const [ia,ib]=G26.rot[mi],c=ia===p?'a':ib===p?'b':null;if(!c)return;
    for(let i=0;i<m.b.length;i+=2)if(m.b[i]===c&&m.b[i+1]!=='-')v[m.b[i+1]]=(v[m.b[i+1]]||0)+1;
    const s=scoreM(m.b),w=s.a>s.b?'a':s.b>s.a?'b':m.dec;if(m.b.length>=24&&w===c)vic++});
  return {v:KS.map(k=>v[k]||0),vic};
}
function scoreSRP(x){const d=G26.srp.find(s=>s.k===x.k);const b=x.b||'',w=(b.match(/[xp]/g)||[]).length,bo=(b.match(/x/g)||[]).length,sc=w+bo*d.x;return {sc,deg:G26.degre(sc),fini:b.length>=G26.balles}}

/* ---------- Import ---------- */
function ajouterTable(t){
  if(!t||!t.joueurs||t.joueurs.length!==4)throw new Error('Table de SCE incomplète');
  DB.sce=DB.sce||{};
  const id=norm(t.classe)+'|'+t.sce+'|'+t.joueurs.map(norm).sort().join(','),old=DB.sce[id];
  const nb=x=>x.m.reduce((s,m)=>s+m.b.length,0);
  if(old&&(nb(old)>nb(t)||(nb(old)===nb(t)&&(old.ts||0)>=(t.ts||0)))){if(t.bil&&Object.keys(t.bil).length&&!Object.keys(old.bil||{}).length){old.bil=t.bil}return 'déjà à jour'}
  DB.sce[id]=t;t.joueurs.forEach(j=>retenirNom(cleEleve(t.classe,j),j));
  return old?'mise à jour':'nouvelle';
}
function depuisFichier(o){
  return ajouterTable({classe:o.classe||'',seance:+o.seance,sce:+o.sce||1,table:String(o.table||''),joueurs:o.joueurs,ts:Date.parse(o.exportedAt)/1000||0,
    m:(o.matchs||[]).map(m=>({srv:m.srv||'',b:m.b||'',dec:m.dec||null,av:m.av||null})),obs:o.obs||{},bil:o.bilans||{}});
}
function depuisQR(q){
  return ajouterTable({classe:q.c||'',seance:+q.s,sce:+q.n||1,table:String(q.tb||''),joueurs:q.j,ts:q.ts||0,
    m:(q.m||[]).map(([srv,b,dec,av])=>({srv,b:b||'',dec:dec||null,av:av?{a:av[0]?{pj:av[0][0],f:av[0][1],fo:av[0][2]}:null,b:av[1]?{pj:av[1][0],f:av[1][1],fo:av[1][2]}:null}:null})),obs:{},bil:q.bl||{}});
}
function g6DepuisQR(g){if(!g)return null;const [srp,stom]=g;
  return {srp:(srp||[]).map(([k,adv,obs,srv,b,tm])=>({k,adv,obs,srv,b,tm})),stom:(stom||[]).map(([k,at,nv,e,ok])=>({k,at,nv,e,ok}))}}

/* ---------- Historique d'une classe (pour le QR de démarrage) ---------- */
function tablesClasse(c){return Object.values(DB.sce||{}).filter(t=>norm(t.classe)===norm(c))}
function histoire(c){
  const H={};
  tablesClasse(c).sort((a,b)=>a.sce-b.sce||a.seance-b.seance).forEach(t=>t.joueurs.forEach((j,p)=>{
    const h=H[j]||(H[j]={s:{}});h.s[t.sce]=totaux(t,p).v;const ch=t.bil&&t.bil[p];if(ch&&ch.length)h.ch=ch}));
  return H;
}

/* ---------- Réglage dans l'onglet Classes ---------- */
function reglage(c){
  const L=DB.classesL[c],g=L.pa==='g26',p=palDe(c);
  return `<div class="g6reg"><label class="ch" for="pa-${esc(c)}">Parcours de la classe</label>
  <select id="pa-${esc(c)}" data-pa="${esc(c)}"><option value=""${g?'':' selected'}>Étoile 7 axes (actuel)</option><option value="g26"${g?' selected':''}>GAREEPS 2026 (SCE / SRP / STOM)</option></select>
  ${g?`<p class="small" style="margin:6px 0 0">Paliers du polygone (bonus sur les 2 matchs de SCE) : anneau 2 à partir de <input type="number" min="1" max="20" value="${p[0]}" data-pal="${esc(c)}" data-i="0" class="g6pal">, anneau 3 à partir de <input type="number" min="1" max="30" value="${p[1]}" data-pal="${esc(c)}" data-i="1" class="g6pal">, anneau 4 à partir de <input type="number" min="1" max="40" value="${p[2]}" data-pal="${esc(c)}" data-i="2" class="g6pal"></p>
  <p class="small muted" style="margin:4px 0 0">Au début des SCE n°2 et n°3, refais scanner le <b>QR de démarrage</b> : il apporte aux téléphones les polygones et les choix déjà reçus (${Object.keys(histoire(c)).length} élève(s) à ce jour).</p>`:''}</div>`;
}

/* ---------- Onglet GAREEPS : suivi ---------- */
function cellule(v,pal){const lv=G26.niveau(v,pal),col=['#f1f3f6','#fde2e2','#fff3c4','#d9f0dc','#9fd3a8'][lv];return `<td style="background:${col};text-align:center">${v}</td>`}
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
    ${[1,2,3].map(n=>h.s[n]?h.s[n].map(v=>cellule(v,pal)).join(''):'<td colspan="4" class="muted" style="text-align:center">—</td>').join('')}
    <td>${(h.ch||[]).map(x=>G26.brK[x].ic).join(' ')||'—'}</td>
    ${KS.map(x=>{const z=o.srp[x];return `<td style="text-align:center">${z?'D'+z.best+' <small class="muted">('+z.n+')</small>':'—'}</td>`}).join('')}
    <td style="text-align:center">${n1?n1+' <small class="muted">dont '+n2+' niv. 2</small>':'—'}</td></tr>`};
  return `<h2>GAREEPS 2026 · ${esc(c)}</h2>
  <section class="carte"><p class="small" style="margin-top:0">Polygone : bonus ⚡ rapide, 📐 architecte, 💥 KO, 🎯 tactique sur les 2 matchs de chaque SCE. Couleur = anneau atteint (paliers ${pal.join(' / ')}). SRP : meilleur degré (nombre de matchs complets). STOM : ateliers validés sur 12.</p>
  ${sansTable.filter(([n,L])=>L.length).map(([n,L])=>`<p class="avert small">SCE n°${n} : pas de table reçue pour ${L.map(esc).join(', ')}.</p>`).join('')}
  <div class="tablewrap"><table class="cl"><thead><tr><th rowspan="2">Élève</th>${[1,2,3].map(n=>`<th colspan="4">SCE ${n}</th>`).join('')}<th rowspan="2">Choix</th><th colspan="4">SRP</th><th rowspan="2">STOM</th></tr>
  <tr>${[1,2,3].map(()=>G26.br.map(b=>`<th title="${esc(b.n)}">${b.ic}</th>`).join('')).join('')}${G26.br.map(b=>`<th>${b.ic} ${G26.brK[b.k].srp}</th>`).join('')}</tr></thead>
  <tbody>${noms.map(ligne).join('')}</tbody></table></div></section>
  <section class="carte"><h3>Tables de SCE reçues (${T.length})</h3>${T.length?`<ul class="small">${T.sort((a,b)=>a.sce-b.sce||(+a.table)-(+b.table)).map(t=>`<li>SCE ${t.sce} · séance ${t.seance} · table ${esc(t.table)} : ${t.joueurs.map(j=>esc(j.split(/\s+/)[0])).join(', ')} · ${t.m.filter(m=>m.b.length>=24).length}/4 matchs</li>`).join('')}</ul>`:'<p class="muted small">Aucune pour l’instant : les téléphones des tables envoient leur résultat en fin de cours (Nuage ou QR).</p>'}</section>`;
}
// Fiche élève : SRP / STOM détaillés
function ficheG26(k){
  const L=Object.values(DB.rec).filter(r=>r.k===k&&r.g26).sort((a,b)=>a.seance-b.seance);if(!L.length)return '';
  return `<section class="carte"><h3>GAREEPS 2026 : SRP et STOM</h3><div class="tablewrap"><table class="cl"><thead><tr><th>Séance</th><th>SRP</th><th>Contre</th><th>Score parlant</th><th>Degré</th></tr></thead><tbody>
  ${L.flatMap(r=>(r.g26.srp||[]).map(x=>{const s=scoreSRP(x);return `<tr><td>${r.seance}</td><td>${G26.brK[x.k].ic} ${esc(G26.srp[G26.brK[x.k].srp-1].t)}</td><td>${esc(x.adv||'')}</td><td>${s.sc}${s.fini?'':' (inachevé)'}</td><td>${s.deg}</td></tr>${x.tm?`<tr><td></td><td colspan="4" class="small muted">Temps mort : ${esc(x.tm)}</td></tr>`:''}`})).join('')}</tbody></table></div>
  <p class="small" style="margin-bottom:0">${L.flatMap(r=>(r.g26.stom||[]).map(y=>{const D=G26.stom.find(s=>s.k===y.k),a=D&&D.at[y.at-1];return a?`${G26.brK[y.k].ic} ${esc(a.jeu)} : ${y.ok?'niveau '+y.ok:'non validé'} (${(y.e||[]).filter(v=>v!==''&&v!=null).join(', ')})`:''})).filter(Boolean).join(' · ')||''}</p></section>`;
}

/* ---------- Évènements ---------- */
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.pa!=null){const L=DB.classesL[t.dataset.pa];if(!L)return;if(t.value)L.pa=t.value;else delete L.pa;sauver();rendre();return}
  if(t.dataset&&t.dataset.pal!=null){const L=DB.classesL[t.dataset.pal];const p=(L.pal||G26.paliers).slice();p[+t.dataset.i]=Math.max(1,+t.value||1);
    if(!(p[0]<p[1]&&p[1]<p[2])){alert('Les paliers doivent augmenter : ex. 2, 4, 6.');rendre();return}L.pal=p;sauver();return}
});
const css=document.createElement('style');css.textContent='.g6reg{margin-top:10px;padding-top:10px;border-top:1px dashed var(--trait)}.g6pal{width:58px;min-height:36px;text-align:center}';document.head.appendChild(css);

window.G6P={estG26,palDe,histoire,reglage,vG26,ficheG26,depuisFichier,depuisQR,g6DepuisQR};
})();
