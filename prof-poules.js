/* =====================================================================
   prof-poules.js — Pilotage : « Poules du jour »
   Le prof part de la proposition (1er monte, dernier descend), la modifie
   le jour même (absents, dispensés, déplacements, rééquilibrage), puis
   chaque table scanne le QR de sa poule : l'appli élève pré-remplit le
   formulaire, que les élèves peuvent encore corriger.
   ===================================================================== */
'use strict';
const PQ_MOTIF={abs:'absent',disp:'dispensé',nv:'sans poule'};
function planCourant(){DB.plans=DB.plans||{};return DB.plans[DB.classe]||null}
function setPlan(p){DB.plans=DB.plans||{};DB.plans[DB.classe]=p}
// Proposition : à partir des poules d'une séance (montée-descente), sinon du classement de la classe, sinon de la liste
function proposerPoules(baseKey){
  const P=poulesClasse().filter(p=>p.seance===baseKey).sort((a,b)=>a.num-b.num);
  let ordre=[];
  if(P.length){
    const nb=Math.max(...P.map(p=>p.num)),nouv={};
    P.forEach(p=>{const n=p.joueurs.length,C=TTL.classement(n,p.matchs,p.fmt).slice().sort((x,y)=>x.rang-y.rang),tous=p.matchs.every(m=>TTL.etatMatch(m,p.fmt).fini);
      C.forEach(c=>{let d=p.num;if(tous&&n>1&&p.mouv!==false){if(c.rang===1&&p.num>1)d=p.num-1;else if(c.rang===n&&p.num<nb)d=p.num+1}
        (nouv[d]=nouv[d]||[]).push({nom:p.joueurs[c.i],r:c.rang,de:p.num})})});
    Object.keys(nouv).map(Number).sort((a,b)=>a-b).forEach(t=>{nouv[t].sort((x,y)=>(x.de-y.de)||(x.r-y.r));ordre.push(nouv[t].map(x=>x.nom))});
  }
  const places=new Set(ordre.flat().map(norm)),liste=liste_classe();
  const hors=liste.filter(n=>!places.has(norm(n))).map(nom=>({nom,m:'nv'}));
  if(!ordre.length){ // pas encore de poule : classement de la classe s'il existe, sinon ordre de la liste
    const CC=classementCycle(resultatsPoules()),L=liste.slice().sort((a,b)=>((CC[cleEleve(DB.classe,a)]||{}).place||999)-((CC[cleEleve(DB.classe,b)]||{}).place||999));
    hors.length=0;ordre=decouper(L);
  }
  const prochaine=Math.floor(Math.max(0,...seancesClasse()))+1;
  return {de:P.length?baseKey:null,seance:Math.min(9,prochaine||1),tour:1,fmt:'2',poules:ordre.map(noms=>({noms,arb:''})),hors};
}
function liste_classe(){const L=liste();return L.length?L.slice():eleves().map(nomAffiche)}
function decouper(L){
  const n=L.length;if(!n)return [];const k=Math.max(1,Math.round(n/4)),base=Math.floor(n/k),plus=n%k,out=[];let i=0;
  for(let j=0;j<k;j++){const t=base+(j<plus?1:0);out.push(L.slice(i,i+t));i+=t}
  return out;
}
function reequilibrer(p){
  const arbs=p.poules.map(x=>x.arb);const L=p.poules.flatMap(x=>x.noms);
  p.poules=decouper(L).map((noms,i)=>({noms,arb:arbs[i]||''}));
}
function vPoulesDuJour(){
  const K=[...new Set(poulesClasse().map(p=>p.seance))].sort((a,b)=>a-b);
  let p=planCourant();
  let h=`<section class="carte" id="pq"><h3>Poules du jour</h3>
    <p class="small muted">Une proposition que tu modifies au moment de l’appel : absents, dispensés, déplacements. Ensuite, chaque table scanne le QR de sa poule (Poule → « Scanner le QR de la poule ») : le formulaire se remplit, les élèves peuvent encore corriger.</p>
    <div class="rangee noprint"><span class="small">Partir de :</span>${K.length?K.map(x=>`<button type="button" class="bt mini" data-act="pqgen" data-v="${x}">${labS(x)}</button>`).join(''):''}
      <button type="button" class="bt mini" data-act="pqgen" data-v="">${K.length?'Classement de la classe':'Liste de la classe'}</button></div>`;
  if(!p)return h+`<p class="muted small" style="margin-top:8px">Choisis la base de la proposition.</p></section>`;
  const opt=(v,L)=>L.map(([a,b])=>`<option value="${a}"${String(v)===String(a)?' selected':''}>${b}</option>`).join('');
  h+=`<div class="grille3 noprint" style="margin-top:10px">
      <label class="small">Séance <select data-pq="seance">${opt(p.seance,[...Array(9)].map((_,i)=>[i+1,i+1]))}</select></label>
      <label class="small">Tour <select data-pq="tour">${opt(p.tour,[[1,'1'],[2,'2'],[3,'3'],[4,'4']])}</select></label>
      <label class="small">Format <select data-pq="fmt">${opt(p.fmt,[['1','1 manche'],['2','2 manches gagnantes'],['3','3 manches gagnantes']])}</select></label></div>
    <p class="small muted">${p.de!=null?'Proposition d’après '+labS(p.de)+' (le 1er monte, le dernier descend).':'Proposition d’après le classement de la classe.'} Touche un nom pour le déplacer ou le retirer.</p>`;
  const disp=p.hors.filter(x=>x.m==='disp').map(x=>x.nom);
  h+=`<div class="poules">${p.poules.map((q,i)=>{const n=q.noms.length,alerte=n<3||n>5;
    return `<div class="carte pq-poule${alerte?' pq-alerte':''}"><div class="rangee" style="justify-content:space-between"><b>Poule ${i+1}</b><span class="small${alerte?'':' muted'}">${n} joueur${n>1?'s':''}${n<3?' : trop peu':n>5?' : trop':''}</span></div>
      <ol class="pq-liste">${q.noms.map((nom,j)=>`<li><button type="button" class="lien" data-act="pqsel" data-p="${i}" data-j="${j}">${esc(nom)}</button>${PQ_SEL&&PQ_SEL.p===i&&PQ_SEL.j===j?`<div class="rangee pq-act noprint">
        <button type="button" class="bt mini" data-act="pqmove" data-v="-1" ${i?'':'disabled'}>↑ Poule ${i}</button><button type="button" class="bt mini" data-act="pqmove" data-v="1">↓ Poule ${i+2}</button>
        <button type="button" class="bt mini" data-act="pqhors" data-v="abs">Absent</button><button type="button" class="bt mini" data-act="pqhors" data-v="disp">Dispensé</button></div>`:''}</li>`).join('')}</ol>
      ${disp.length||q.arb?`<label class="small noprint">🧑‍⚖️ Arbitre dispensé <select data-pq="arb" data-p="${i}"><option value="">—</option>${[...new Set(disp.concat(q.arb?[q.arb]:[]))].map(d=>`<option${d===q.arb?' selected':''}>${esc(d)}</option>`).join('')}</select></label>`:''}
      ${q.arb?`<p class="small">Arbitre : ${esc(q.arb)}</p>`:''}
      <div class="rangee noprint" style="margin-top:6px"><button type="button" class="bt mini orange" data-act="pqqr" data-v="${i}" ${n>=2?'':'disabled'}>QR de la poule</button></div></div>`}).join('')}</div>`;
  if(p.hors.length)h+=`<div class="carte" style="margin-top:10px"><b>Hors poules</b><ul class="pq-liste">${p.hors.map((x,i)=>`<li>${esc(x.nom)} <span class="small muted">(${PQ_MOTIF[x.m]})</span>
      <select class="noprint" data-pq="remettre" data-v="${i}"><option value="">Mettre dans…</option>${p.poules.map((_,j)=>`<option value="${j}">Poule ${j+1}</option>`).join('')}<option value="new">Nouvelle poule</option></select></li>`).join('')}</ul></div>`;
  h+=`<div class="rangee noprint" style="margin-top:10px"><button type="button" class="bt mini" data-act="pqequil">Rééquilibrer (poules de 3 à 5)</button><button type="button" class="bt mini noir" data-act="pqtous">Tous les QR, table par table</button><button type="button" class="bt mini" data-act="pqimpr">Imprimer les QR</button></div></section>`;
  return h;
}
let PQ_SEL=null;
const qrPoule=(p,i)=>({a:'TTE',v:1,t:'Q',c:DB.classe,s:+p.seance,tr:+p.tour,p:[i+1,String(p.fmt),p.poules[i].noms.slice(),p.poules[i].arb||'',1]});
async function montrerQRPoule(i,tous){
  const p=planCourant();if(!p||!p.poules[i])return;
  const txt=await TTQR.encoder(qrPoule(p,i));let svg;try{svg=TTQR.svgQR(txt)}catch(e){svg='<p>QR trop long.</p>'}
  let d=document.querySelector('.qr-plein');if(!d){d=document.createElement('div');d.className='qr-plein';document.body.appendChild(d)}
  const q=p.poules[i];
  d.innerHTML=`<div><h2>Poule ${i+1} · séance ${p.seance}${p.tour>1?' · tour '+p.tour:''}</h2><p>${q.noms.map(esc).join(' · ')}${q.arb?' — arbitre : '+esc(q.arb):''}</p><div class="qrbox">${svg}</div>
    <p class="small">Appli élève → Poule → « Scanner le QR de la poule »</p>
    <div class="rangee" style="justify-content:center">${tous?`<button class="bt" type="button" data-act="pqnav" data-v="${i-1}" ${i?'':'disabled'}>← Poule ${i}</button>`:''}<button class="bt noir" type="button" data-act="pqfermer">Fermer</button>${tous&&i<p.poules.length-1?`<button class="bt orange" type="button" data-act="pqnav" data-v="${i+1}">Poule ${i+2} →</button>`:''}</div></div>`;
}
async function imprimerQR(){
  const p=planCourant();if(!p)return;
  let h=`<h2>${esc(DB.classe)} · poules de la séance ${p.seance}${p.tour>1?' · tour '+p.tour:''}</h2><div class="pq-impr">`;
  for(let i=0;i<p.poules.length;i++){const q=p.poules[i];if(q.noms.length<2)continue;
    h+=`<div class="pq-carte"><b>Poule ${i+1}</b><div>${TTQR.svgQR(await TTQR.encoder(qrPoule(p,i)))}</div><small>${q.noms.map(esc).join('<br>')}${q.arb?'<br>Arbitre : '+esc(q.arb):''}</small></div>`}
  const z=document.createElement('div');z.id='impr-qr';z.innerHTML=h+'</div>';document.body.appendChild(z);document.body.classList.add('imprQR');
  setTimeout(()=>{window.print();setTimeout(()=>{z.remove();document.body.classList.remove('imprQR')},500)},200);
}
function pqRendre(){sauver();rendre();const z=document.getElementById('pq');if(z&&PQ_SEL)z.scrollIntoView({block:'nearest'})}
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b||!/^pq/.test(b.dataset.act))return;
  e.stopImmediatePropagation();const a=b.dataset.act,v=b.dataset.v,p=planCourant();
  switch(a){
    case 'pqgen':{if(p&&!confirm('Remplacer la proposition en cours ?'))return;setPlan(proposerPoules(v===''?null:+v));PQ_SEL=null;pqRendre();return}
    case 'pqsel':{const s={p:+b.dataset.p,j:+b.dataset.j};PQ_SEL=PQ_SEL&&PQ_SEL.p===s.p&&PQ_SEL.j===s.j?null:s;rendre();return}
    case 'pqmove':{if(!PQ_SEL)return;const q=p.poules[PQ_SEL.p],nom=q.noms.splice(PQ_SEL.j,1)[0],t=PQ_SEL.p+(+v);
      if(t>=p.poules.length)p.poules.push({noms:[],arb:''});
      if(+v<0)p.poules[t].noms.push(nom);else p.poules[t].noms.unshift(nom);
      p.poules=p.poules.filter(x=>x.noms.length||x.arb);PQ_SEL=null;pqRendre();return}
    case 'pqhors':{if(!PQ_SEL)return;const nom=p.poules[PQ_SEL.p].noms.splice(PQ_SEL.j,1)[0];p.hors.push({nom,m:v});
      p.poules=p.poules.filter(x=>x.noms.length);PQ_SEL=null;pqRendre();return}
    case 'pqequil':reequilibrer(p);PQ_SEL=null;pqRendre();return;
    case 'pqqr':montrerQRPoule(+v,false);return;
    case 'pqtous':montrerQRPoule(0,true);return;
    case 'pqnav':montrerQRPoule(+v,true);return;
    case 'pqfermer':{const d=document.querySelector('.qr-plein');if(d)d.remove();return}
    case 'pqimpr':imprimerQR();return;
  }
},true);
document.addEventListener('change',e=>{
  const t=e.target,f=t.dataset&&t.dataset.pq;if(!f)return;
  e.stopImmediatePropagation();const p=planCourant();if(!p)return;
  if(f==='seance'||f==='tour')p[f]=+t.value;
  else if(f==='fmt')p.fmt=t.value;
  else if(f==='arb'){const i=+t.dataset.p;p.poules.forEach((q,j)=>{if(j!==i&&q.arb===t.value&&t.value)q.arb=''});p.poules[i].arb=t.value}
  else if(f==='remettre'){if(t.value==='')return;const x=p.hors.splice(+t.dataset.v,1)[0];
    p.poules.forEach(q=>{if(q.arb===x.nom)q.arb=''});
    if(t.value==='new')p.poules.push({noms:[x.nom],arb:''});else p.poules[+t.value].noms.push(x.nom)}
  pqRendre();
},true);
const vPilotageAvantPoules=vPilotage;
vPilotage=function(){const h=vPilotageAvantPoules();const i=h.indexOf('</h2>');return i<0?vPoulesDuJour()+h:h.slice(0,i+5)+vPoulesDuJour()+h.slice(i+5)};
const st2=document.createElement('style');
st2.textContent=`.pq-liste{margin:6px 0 0;padding-left:22px}.pq-liste li{margin:4px 0}.pq-act{margin:4px 0 6px}
.pq-alerte{border-color:var(--alerte)!important}.pq-alerte .small{color:var(--alerte)}
.grille3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
#impr-qr{display:none}
@media print{body.imprQR>*:not(#impr-qr){display:none!important}body.imprQR #impr-qr{display:block}
.pq-impr{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.pq-carte{border:1px solid #999;border-radius:8px;padding:8px;text-align:center;break-inside:avoid}.pq-carte svg{width:100%;height:auto}}`;
document.head.appendChild(st2);
rendre();
