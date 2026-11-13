/* =====================================================================
   prof-note-g26.js — classes « GAREEPS 2026 » : étoile AFL2 / AFL3 et note
   - Onglet GAREEPS : carte « Étoile AFL2 / AFL3 » (6 descripteurs du radar B
     d'Arnaud, 4 degrés), avec des repères tirés des données reçues
     (projets écrits, SRP observées, matchs ATP arbitrés) ;
   - Onglet Note : barème « GAREEPS 2026 » (provisoire, à valider en équipe) :
       AFL1 /12 = SRP /5 + polygone /5 + ATP /2 (poids réglables par classe), modifiable à la main ;
       AFL2 + AFL3 /8 avec les répartitions habituelles (6/2, 4/4, 2/6).
   Les classes sur le parcours actuel (étoile 7 axes) ne changent pas.
   ===================================================================== */
(function(){
'use strict';
const KS=['R','A','K','T'];
const classeL=()=>Object.keys(DB.classesL).find(x=>norm(x)===norm(DB.classe));
const estG=()=>{const c=classeL();return !!(c&&G6P.estG26(c))};
const q4=x=>Math.round(x*4)/4;
const memeNom=(a,b)=>norm(a||'')===norm(b||'');
const ROLE=()=>(DB.g6role=DB.g6role||{});

/* ---------- Données d'un élève ---------- */
function tables(c){return Object.values(DB.sce||{}).filter(t=>norm(t.classe)===norm(c))}
function srpEleve(k){const L=[];recsClasse().forEach(r=>{if(r.k===k&&r.g26)(r.g26.srp||[]).forEach(x=>L.push(x))});return L}
function scoreSRP(x){const d=G26.srp.find(s=>s.k===x.k),b=x.b||'',w=(b.match(/[xp]/g)||[]).length,bo=(b.match(/x/g)||[]).length,sc=w+bo*d.x;return {sc,deg:G26.degre(sc),fini:b.length>=G26.balles}}
function reperes(c,k,nom){
  let pj=0,obs=0,arb=0;
  tables(c).forEach(t=>{const p=t.joueurs.findIndex(j=>memeNom(j,nom));if(p<0)return;
    t.m.forEach((m,mi)=>{const [ia,ib]=G26.rot[mi],cote=ia===p?'a':ib===p?'b':null;if(cote&&m.av&&m.av[cote]&&m.av[cote].pj)pj++})});
  srpEleve(k).forEach(x=>{if(x.tm)pj++});
  recsClasse().forEach(r=>{if(r.g26)(r.g26.srp||[]).forEach(x=>{if(memeNom(x.obs,nom)&&scoreSRP(x).fini)obs++})});
  Object.values(DB.atp||{}).forEach(m=>{if(norm(m.classe)===norm(c)&&memeNom(m.arb,nom))arb++});
  return {pj,obs,arb};
}
// AFL1 : trois parts calculées
// Poids de l'AFL1 (réglables par classe) : SRP, polygone niveau, polygone progression, ATP. Total attendu : 12.
const W0={srp:5,pn:3,pp:2,atp:2};
function poids(){const C=cfgNote();return Object.assign({},W0,C.g6w||{})}
function afl1(c,k,nom,K){
  const W=poids();
  // SRP : moyenne des degrés des 2 meilleurs matchs complets (degré 4 = tous les points)
  const S=srpEleve(k).map(scoreSRP).filter(s=>s.fini).sort((a,b)=>b.sc-a.sc).slice(0,2);
  const srp=!W.srp?0:S.length?q4(W.srp*S.reduce((a,s)=>a+s.deg,0)/S.length/4):null;
  // Polygone /5 : 3 points pour le total de bonus de la dernière SCE (plein à 2 × dernier palier),
  // 2 points de progression sur les branches choisies en priorité (0,5 par anneau gagné)
  const H=G6P.histoire(c),h=(Object.entries(H).find(([x])=>memeNom(x,nom))||[])[1],pal=G6P.palDe(c);
  let poly=null,prog=null,nS=0,bon=null;
  if(h&&h.s){const N=Object.keys(h.s).map(Number).sort((a,b)=>a-b);nS=N.length;
    if(N.length){const F=h.s[N[N.length-1]],D=h.s[N[0]];bon=F.reduce((a,x)=>a+x,0);
      const fin=W.pn*Math.min(1,bon/(2*pal[2]));
      const t1=tables(c).filter(t=>t.sce===N[0]).map(t=>({t,p:t.joueurs.findIndex(j=>memeNom(j,nom))})).find(x=>x.p>=0);
      const ch1=t1&&t1.t.bil&&t1.t.bil[t1.p]; // priorités choisies après la 1re SCE
      const B=(ch1&&ch1.length?ch1:KS).map(x=>KS.indexOf(x)).filter(i=>i>=0);
      let gain=0;if(N.length>1)B.forEach(i=>{const f=G26.niveau(F[i],pal),d=G26.niveau(D[i],pal);gain+=f>d?f-d:d===4?1:0});
      prog=N.length>1?Math.min(W.pp,gain*W.pp/4):0;poly=q4(fin+prog)}}
  if(!W.pn&&!W.pp)poly=0;
  // ATP /2 : de 2 (1er) à 1 (dernier) si au moins un match joué, 0 sinon
  let atp=null,rang=null;
  if(K){const joue=Object.values(DB.atp||{}).some(m=>norm(m.classe)===norm(c)&&(memeNom(m.a,nom)||memeNom(m.b,nom)));
    const n=K.noms.length;rang=K.rangT[K.noms.find(x=>memeNom(x,nom))];
    atp=joue&&rang?q4(W.atp*(n>1?.5+.5*(n-rang)/(n-1):1)):0}
  if(!W.atp)atp=0;
  const parts=[srp,poly,atp],tot=parts.every(v=>v!=null)?q4(parts.reduce((a,v)=>a+v,0)):null;
  return {srp,poly,prog,nS,bon,atp,rang,tot,nbSRP:S.length};
}
// Degré suggéré pour AFL2 ou AFL3 d'après l'étoile
function degreEtoile(k,afl){const E=ROLE()[k]||{},V=G26.role.filter(r=>r.afl===afl).map(r=>E[r.k]).filter(v=>v);
  return V.length?Math.round(V.reduce((a,v)=>a+v,0)/V.length):null}

/* ---------- Onglet GAREEPS : étoile AFL2 / AFL3 ---------- */
function etoileSVG(E){
  const R=G26.role,n=R.length,cx=70,cy=70,r=52,pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [cx+Math.cos(a)*r*v/4,cy+Math.sin(a)*r*v/4]};
  let g='';for(let l=1;l<=4;l++)g+=`<polygon points="${R.map((_,i)=>pt(i,l).join(',')).join(' ')}" fill="none" stroke="#d5dae1" stroke-width="${l===4?1.2:.6}"/>`;
  const p=R.map((x,i)=>pt(i,E[x.k]||0).join(',')).join(' ');
  return `<svg viewBox="0 0 140 140" width="96" height="96" aria-hidden="true">${g}<polygon points="${p}" fill="rgba(124,58,237,.25)" stroke="#7c3aed" stroke-width="1.5"/>${R.map((x,i)=>{const [a,b]=pt(i,4.9);return `<text x="${a}" y="${b+3}" font-size="9" text-anchor="middle" fill="${x.afl==='AFL2'?'#2563eb':'#16a34a'}">${x.k.toUpperCase()}</text>`}).join('')}</svg>`;
}
function vEtoile(){
  const c=classeL(),noms=liste();if(!noms.length)return '';
  const R=G26.role;
  return `<section class="carte"><h3>Étoile AFL2 / AFL3</h3>
  <p class="small muted" style="margin-top:0">Descripteurs du radar d’Arnaud, degrés 1 à 4. Passe la souris ou le doigt sur un degré pour lire le descripteur. Les repères (projets écrits, SRP observées, matchs ATP arbitrés) viennent des données reçues : ils disent combien, pas comment.</p>
  <div class="tablewrap"><table class="cl g6et"><thead><tr><th>Élève</th>${R.map(r=>`<th title="${esc(r.afl)}"><span class="${r.afl==='AFL2'?'a2':'a3'}">${esc(r.n)}</span></th>`).join('')}<th>Repères</th><th><span class="vh">Étoile</span></th></tr></thead><tbody>
  ${noms.map(j=>{const k=cleEleve(c,j),E=ROLE()[k]||{},P=reperes(c,k,j);
    return `<tr><td><button type="button" class="lien" data-act="fiche" data-k="${esc(k)}">${esc(j)}</button></td>
    ${R.map(r=>`<td><select class="nsel" data-g6r="${r.k}" data-k="${esc(k)}" aria-label="${esc(r.n)} de ${esc(j)}" title="${esc(E[r.k]?r.d[E[r.k]-1]:r.d.map((d,i)=>(i+1)+' : '+d).join(' · '))}"><option value="">—</option>${r.d.map((d,i)=>`<option value="${i+1}"${E[r.k]===i+1?' selected':''} title="${esc(d)}">${i+1}</option>`).join('')}</select></td>`).join('')}
    <td class="small">${P.pj} projet${P.pj>1?'s':''} · ${P.obs} SRP obs. · ${P.arb} arb.</td><td>${R.some(r=>E[r.k])?etoileSVG(E):''}</td></tr>`}).join('')}
  </tbody></table></div>
  <details class="small"><summary>Les descripteurs</summary><ul>${R.map(r=>`<li><b>${esc(r.n)}</b> (${r.afl}) : ${r.d.map((d,i)=>(i+1)+'. '+esc(d)).join(' · ')}</li>`).join('')}</ul></details></section>`;
}
const vG=G6P.vG26;G6P.vG26=function(){return vG()+(estG()?vEtoile():'')};
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||t.dataset.g6r==null)return;
  const k=t.dataset.k,E=ROLE()[k]||(ROLE()[k]={});if(t.value)E[t.dataset.g6r]=+t.value;else delete E[t.dataset.g6r];
  sauver();const y=window.scrollY;rendre();window.scrollTo(0,y)});

/* ---------- Onglet Note : barème GAREEPS 2026 ---------- */
function cfg(){const C=cfgNote();if(!C.g6init){C.niveau='G';C.g6init=1}return C}
function ligne(k,C,c,K){
  const nom=nomAffiche(k),e=C.el[k]||{},rep=REPS[e.rep||'4/4'],A=afl1(c,k,nom,K);
  const a1=e.a1!=null&&e.a1!==''?+e.a1:A.tot;
  const parts=[a1,e.afl2,e.afl3],tot=parts.every(v=>v!=null&&v!=='')?r2(parts.reduce((s,v)=>s+(+v),0)):null;
  return {nom,e,rep,A,a1,tot};
}
function vNoteG(){
  const c=classeL(),L=eleves();if(!L.length)return `<h2>Note</h2><p class="muted">Aucune donnée pour cette classe.</p>`;
  const C=cfg(),K=window.ATPP?ATPP.classement(c,999):null,W=poids(),SW=W.srp+W.pn+W.pp+W.atp,dW=x=>String(x).replace('.',',');
  const sug=d=>d?`<span class="sug" title="degré moyen de l’étoile (onglet GAREEPS)">D${d}</span>`:'';
  return `<h2>Note · ${esc(DB.classe)}</h2>
  <details class="carte reglnote noprint"><summary><b>Barème</b> <span class="small muted">GAREEPS 2026 · AFL1 /12 = SRP /${dW(W.srp)} + polygone /${dW(W.pn+W.pp)} + ATP /${dW(W.atp)} · AFL2 + AFL3 /8</span>${SW!==12?' <span class="badge st-oubli">⚠ poids</span>':''}</summary>
    <label>Barème <select data-ncfg="niveau"><option value="G" selected>GAREEPS 2026</option><option value="1">Première : table et rang /5</option><option value="T">Terminale : victoires dans la poule /4</option></select></label>
    <p class="small" style="margin-bottom:4px"><b>Poids de l’AFL1</b> (pour cette classe, total 12) :</p>
    <div class="rangee g6w">
      <label>SRP <input type="number" min="0" max="12" step="0.5" data-g6w="srp" value="${W.srp}"></label>
      <label>Polygone : niveau <input type="number" min="0" max="12" step="0.5" data-g6w="pn" value="${W.pn}"></label>
      <label>Polygone : progression <input type="number" min="0" max="12" step="0.5" data-g6w="pp" value="${W.pp}"></label>
      <label>ATP <input type="number" min="0" max="12" step="0.5" data-g6w="atp" value="${W.atp}"></label>
      <button class="bt mini" type="button" data-g6wraz="1">Valeurs de départ (5 / 3 / 2 / 2)</button></div>
    ${SW!==12?`<p class="small alerte">Total des poids : ${dW(SW)} au lieu de 12. Le total sur 20 sera faux tant que ce n’est pas corrigé.</p>`:`<p class="small muted">Total : 12 ✓. Mets 0 pour ne pas compter une part.</p>`}
    <ul class="small">
      <li><b>SRP /${dW(W.srp)}</b> : moyenne des degrés des 2 meilleurs matchs complets (degré 4 = tous les points).</li>
      <li><b>Polygone niveau /${dW(W.pn)}</b> : total de bonus à la dernière SCE, tous les points dès ${2*G6P.palDe(c)[2]} bonus (2 × le dernier palier).</li>
      <li><b>Polygone progression /${dW(W.pp)}</b> : ${dW(W.pp/4)} par anneau gagné depuis la 1re SCE sur les branches choisies en priorité (une branche déjà au dernier anneau compte comme gagnée).</li>
      <li><b>ATP /${dW(W.atp)}</b> : de ${dW(W.atp)} (1er) à ${dW(W.atp/2)} (dernier) selon le classement final, 0 sans aucun match. Le classement mesure le niveau, pas les progrès : garde-lui peu de poids.</li>
      <li>Tu peux remplacer l’AFL1 calculée par ta propre note (case AFL1).</li></ul>
    <p class="small avert">Barème provisoire : à valider en équipe (et avec Arnaud s’il en a fixé un).</p>
  </details>
  <div class="tablewrap"><table class="cl bil note compacte"><thead><tr><th>Élève</th><th>Rép.</th><th>SRP /${dW(W.srp)}</th><th>Polyg. /${dW(W.pn+W.pp)}</th><th>ATP /${dW(W.atp)}</th><th>AFL1 /12</th><th>AFL2</th><th>AFL3</th><th>/20</th></tr></thead><tbody>
  ${L.map(k=>{const N=ligne(k,C,c,K),A=N.A,e=N.e;
    return `<tr><td><button class="lien" type="button" data-act="fiche" data-k="${esc(k)}">${esc(N.nom)}</button></td>
    <td><select class="nsel" data-note="rep" data-k="${esc(k)}">${Object.keys(REPS).map(r=>`<option${(e.rep||'4/4')===r?' selected':''}>${r}</option>`).join('')}</select></td>
    <td title="${A.nbSRP} match(s) complet(s) retenu(s)">${fr(A.srp)}</td>
    <td title="${A.nS} SCE reçue(s)${A.bon!=null?' · '+A.bon+' bonus':''}${A.prog!=null?' · progression '+fr(A.prog):''}">${fr(A.poly)}${A.nS===1?' <small class="muted">(1 SCE)</small>':''}</td>
    <td title="${A.rang?'rang '+A.rang:''}">${fr(A.atp)}</td>
    <td style="white-space:nowrap">${e.a1!=null&&e.a1!==''?`<s class="muted small" title="note calculée">${fr(A.tot)}</s> `:`<b>${fr(A.tot)}</b> `}<input class="pct g6a1" type="number" min="0" max="12" step="0.25" data-note="a1" data-k="${esc(k)}" value="${e.a1==null?'':e.a1}" placeholder="modifier" title="Ta note d’AFL1, si tu ne retiens pas la note calculée" aria-label="AFL1 retenue pour ${esc(N.nom)}"></td>
    <td>${selDegres('afl2',k,N.rep[0],e.afl2)}${sug(degreEtoile(k,'AFL2'))}</td>
    <td>${selDegres('afl3',k,N.rep[1],e.afl3)}${sug(degreEtoile(k,'AFL3'))}</td>
    <td><b class="tot">${fr(N.tot)}</b></td></tr>`}).join('')}
  </tbody></table></div>
  <p class="small muted">AFL1 : la note calculée est en gras ; écris ta note dans la case pour la remplacer (vide la case pour revenir au calcul). « D3 » = degré moyen de l’étoile AFL2 / AFL3 de l’onglet GAREEPS, un repère. Une part manquante (pas de SRP complète, pas de SCE reçue) laisse la note vide.</p>
  <div class="rangee noprint"><button class="bt orange" type="button" data-act="csvnote">Exporter les notes (CSV)</button><button class="bt" type="button" data-act="imprimer">Imprimer</button></div>`;
}
const vN=vNote;
window.vNote=function(){
  if(!estG())return vN();
  const C=cfg();if(C.niveau==='G')return vNoteG();
  // barème Première / Terminale choisi pour une classe GAREEPS : on garde le retour possible
  return vN().replace('<option value="1"','<option value="G">GAREEPS 2026</option><option value="1"');
};
const xN=exporterNotes;
window.exporterNotes=function(){
  if(!estG()||cfg().niveau!=='G')return xN();
  const C=cfg(),c=classeL(),K=window.ATPP?ATPP.classement(c,999):null,E=ROLE();
  const rows=[['Classe','Élève','Barème','Répartition AFL2/AFL3','SRP','Polygone','ATP','AFL1 calculée /12','AFL1 retenue /12','AFL2','AFL3','Total /20'].concat(G26.role.map(r=>r.n+' ('+r.afl+')'))];
  eleves().forEach(k=>{const N=ligne(k,C,c,K),A=N.A;
    rows.push([DB.classe,N.nom,'GAREEPS 2026',N.e.rep||'4/4',dec(A.srp),dec(A.poly),dec(A.atp),dec(A.tot),dec(N.a1),dec(N.e.afl2),dec(N.e.afl3),dec(N.tot)].concat(G26.role.map(r=>(E[k]||{})[r.k]||'')))});
  telecharger('TT_'+(DB.classe||'classe').replace(/[^A-Za-z0-9]+/g,'')+'_notes.csv',csv(rows));
};
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||t.dataset.g6w==null)return;
  const C=cfgNote(),W=C.g6w=Object.assign({},W0,C.g6w||{});W[t.dataset.g6w]=Math.max(0,Math.min(12,+t.value||0));sauver();rendre();
  const d=document.querySelector('details.reglnote');if(d)d.open=true});
document.addEventListener('click',e=>{if(!e.target.closest('[data-g6wraz]'))return;delete cfgNote().g6w;sauver();rendre();
  const d=document.querySelector('details.reglnote');if(d)d.open=true});
const css=document.createElement('style');css.textContent='.g6et th{font-size:.8em;line-height:1.15}.g6et .a2{color:#2563eb}.g6et .a3{color:#16a34a}.g6et td{vertical-align:middle}.g6et .nsel{min-width:52px;width:58px}.g6a1{width:84px}.g6w input{width:64px;min-height:36px;text-align:center}.g6w label{font-size:.9em}';document.head.appendChild(css);
window.G6N={afl1,reperes,degreEtoile};
})();
