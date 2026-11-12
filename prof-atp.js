/* =====================================================================
   prof-atp.js — Tournoi ATP (règlement d'Arnaud Boissière), classes en parcours GAREEPS 2026
   - Les matchs arrivent des téléphones (fichier « …_atp.json », QR « ATP ») et, en direct,
     du document Grist du tournoi (un seul document pour toutes les classes ; prénom + initiale).
   - Classement de départ d'une séance = points cumulés des séances précédentes, chaque match
     étant compté avec le classement du début de SA séance.
   - Onglet « ATP » : classement de la séance (départ, points du jour, mouvement), refus,
     plein écran pour le vidéoprojecteur, actualisation automatique depuis Grist.
   ===================================================================== */
(function(){
'use strict';
const A=G26.atp;
const classeL=()=>Object.keys(DB.classesL).find(x=>norm(x)===norm(DB.classe));
const prenom=n=>String(n||'').split(/\s+/).find(x=>!(x.length>1&&x===x.toUpperCase()))||String(n||'').split(/\s+/)[0];
const gristDoc=()=>{const u=DB.gristATP;if(!u)return null;const m=/^(https:\/\/[^/]+)\/(?:o\/[^/]+\/)?(?:doc\/)?([A-Za-z0-9]{8,})/.exec(u);return m?{base:m[1],id:m[2]}:null};
const M=()=>DB.atp||(DB.atp={});
const R=()=>DB.atpRefus||(DB.atpRefus={});

/* ---------- Import ---------- */
function ajouter(classe,seance,m,src){
  if(!m||!m.id||!m.a||!m.b)return;const x=M()[m.id];
  if(x&&x.src==='fichier'&&src!=='fichier')return; // le fichier du téléphone fait foi (noms complets)
  M()[m.id]={id:m.id,classe,seance:+seance,a:m.a,b:m.b,arb:m.arb||'',sa:+m.sa,sb:+m.sb,ts:+m.ts||0,src};
}
function depuisFichier(o){(o.matchs||[]).forEach(m=>ajouter(o.classe||'',o.seance,m,'fichier'));return (o.matchs||[]).length+' match(s) ATP'}
function depuisQR(q){(q.m||[]).forEach(([id,a,b,arb,sa,sb,ts])=>ajouter(q.c||'',q.s,{id,a,b,arb,sa,sb,ts},'qr'));return (q.m||[]).length+' match(s) ATP · séance '+q.s}
// Grist : noms courts → noms de la liste de classe
async function lireGrist(c){
  const g=gristDoc();if(!g)throw new Error('Pas de document Grist réglé (onglet Classes).');
  const r=await fetch(g.base+'/api/docs/'+g.id+'/tables/'+A.table+'/records?filter='+encodeURIComponent(JSON.stringify({classe:[c]})));
  if(r.status===404)return 0;if(!r.ok)throw new Error('Grist répond '+r.status);
  const L=(DB.classesL[c]||{}).eleves||[],C=G26.courts(L),inv={};Object.entries(C).forEach(([n,k])=>inv[k]=n);
  let n=0;(await r.json()).records.forEach(({fields:f})=>{if(!f.uid)return;const a=inv[f.j1]||f.j1,b=inv[f.j2]||f.j2;
    if(!M()[f.uid])n++;ajouter(c,f.seance,{id:f.uid,a,b,arb:inv[f.arb]||f.arb||'',sa:f.s1,sb:f.s2,ts:f.ts},'grist')});
  DB.atpLu=Date.now();sauver();return n;
}

/* ---------- Calcul du classement ---------- */
// Renvoie {depart:{nom:pts}, jour:{nom:{pts,v,d,ref}}, total, rangD, rangT} pour la séance s
function classement(c,s){
  const L=(DB.classesL[c]||{}).eleves||[],tous=Object.values(M()).filter(m=>norm(m.classe)===norm(c));
  const seances=[...new Set(tous.map(m=>m.seance).concat(Object.keys(R()).filter(k=>k.startsWith(norm(c)+'|')).map(k=>+k.split('|')[1])))].filter(x=>x<=s).sort((a,b)=>a-b);
  const P={};L.forEach(n=>P[n]=0);let depart=null,jour={};
  for(const x of seances.concat(seances.includes(s)?[]:[s])){
    if(x===s)depart=Object.assign({},P);
    const rk=G26.rangs(L,P),J={};
    tous.filter(m=>m.seance===x).sort((a,b)=>a.ts-b.ts).forEach(m=>{const w=m.sa>m.sb?m.a:m.b,l=w===m.a?m.b:m.a;
      [w,l].forEach(n=>{J[n]=J[n]||{pts:0,v:0,d:0,ref:0};if(P[n]==null)P[n]=0});
      const gn=G26.atpGain(rk[w]||L.length,rk[l]||L.length);J[w].pts+=gn;J[w].v++;J[l].pts+=A.perdu;J[l].d++});
    Object.entries(R()).forEach(([k,nb])=>{const [cc,ss,nn]=k.split('|');if(cc===norm(c)&&+ss===x){const n=L.find(y=>norm(y)===nn)||nn;J[n]=J[n]||{pts:0,v:0,d:0,ref:0};J[n].ref+=nb;J[n].pts+=A.refus*nb}});
    Object.entries(J).forEach(([n,j])=>P[n]=(P[n]||0)+j.pts);
    if(x===s){jour=J;break}
  }
  if(!depart)depart=Object.assign({},P);
  const total={};Object.keys(Object.assign({},depart,P)).forEach(n=>total[n]=(depart[n]||0)+((jour[n]||{}).pts||0));
  const noms=L.length?L:Object.keys(total);
  return {depart,jour,total,rangD:G26.rangs(noms,depart),rangT:G26.rangs(noms,total),noms};
}
// Points de départ de la PROCHAINE séance (pour le QR de démarrage)
function pourQR(c){
  const tous=Object.values(M()).filter(m=>norm(m.classe)===norm(c));if(!tous.length)return null;
  const der=Math.max(...tous.map(m=>m.seance)),K=classement(c,der+1);
  const p={};Object.entries(K.depart).forEach(([n,v])=>{if(v)p[n]=Math.round(v*10)/10});return {s:der+1,p};
}

/* ---------- Onglet ATP ---------- */
let AUTO=null,GRAND=false;
function tableau(c,s,K,grand){
  const ord=K.noms.slice().sort((x,y)=>K.rangT[x]-K.rangT[y]);
  const fl=n=>{const d=K.rangD[n]-K.rangT[n];return d>0?`<span style="color:var(--vert)">▲${d}</span>`:d<0?`<span style="color:var(--alerte)">▼${-d}</span>`:'='};
  return `<div class="tablewrap"><table class="cl${grand?' atpg':''}"><thead><tr><th>Rang</th><th>Joueur</th><th>Départ</th><th>Aujourd’hui</th><th>Total</th><th>V-D</th><th></th>${grand?'':'<th>Refus</th>'}</tr></thead><tbody>
  ${ord.map(n=>{const j=K.jour[n]||{pts:0,v:0,d:0,ref:0};return `<tr><td><b>${K.rangT[n]}</b></td><td>${esc(grand?G26.court(n):n)}</td><td>${(K.depart[n]||0).toLocaleString('fr')}</td><td>${j.pts?'+'+j.pts.toLocaleString('fr'):'—'}</td><td><b>${(K.total[n]||0).toLocaleString('fr')}</b></td><td>${j.v}-${j.d}</td><td>${fl(n)}</td>
  ${grand?'':`<td style="white-space:nowrap"><button class="bt mini" type="button" data-act="atpref" data-n="${esc(n)}" data-v="1" title="Match refusé : ${A.refus} points">−2</button>${j.ref?` <button class="bt mini" type="button" data-act="atpref" data-n="${esc(n)}" data-v="-1" title="Annuler un refus">↶ ${j.ref}</button>`:''}</td>`}</tr>`}).join('')}</tbody></table></div>`;
}
function vATP(){
  const c=classeL();if(!c)return '<h2>Tournoi ATP</h2><p class="muted">Choisis une classe.</p>';
  const s=DB.seance||1,K=classement(c,s),nb=Object.values(M()).filter(m=>norm(m.classe)===norm(c)&&m.seance===s).length,g=gristDoc();
  return `<h2>Tournoi ATP · ${esc(c)}</h2>
  <div class="rangee noprint"><label class="small">Séance <select id="atp-s">${Array.from({length:12},(_,i)=>i+1).map(i=>`<option${i===s?' selected':''}>${i}</option>`).join('')}</select></label>
  ${g?`<button class="bt" type="button" data-act="atplire">↻ Actualiser depuis Grist</button><label class="small"><input type="checkbox" id="atp-auto"${AUTO?' checked':''}> toutes les 10 s</label>`:'<span class="small muted">Pas de Grist : les matchs arrivent avec les séances (Importer).</span>'}
  <button class="bt orange" type="button" data-act="atpgrand">⛶ Plein écran (vidéoprojecteur)</button></div>
  <p class="small muted">${nb} match${nb>1?'s':''} reçu${nb>1?'s':''} pour la séance ${s}${DB.atpLu&&g?' · Grist lu à '+new Date(DB.atpLu).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):''}. Barème d’Arnaud : de ${A.dessous[4]} à ${A.dessus[4]} points selon l’écart de rang au début de la séance, ${A.perdu} pour une défaite, ${A.refus} pour un refus.</p>
  <section class="carte">${tableau(c,s,K,false)}</section>
  <p class="small muted">Le classement de départ de la séance suivante part dans le QR de démarrage (onglet Classes) : fais-le rescanner en début de cours pour que les téléphones l’affichent.</p>`;
}
function peindreGrand(){
  let z=document.getElementById('atp-plein');if(!GRAND){if(z)z.remove();return}
  if(!z){z=document.createElement('div');z.id='atp-plein';document.body.appendChild(z)}
  const c=classeL(),s=DB.seance||1,K=classement(c,s);
  z.innerHTML=`<div class="rangee" style="justify-content:space-between"><h2 style="margin:0">🥇 Tournoi ATP · ${esc(c)} · séance ${s}</h2><button class="bt" type="button" data-act="atpgrand">Fermer</button></div>${tableau(c,s,K,true)}
  <p class="small muted">${gristDoc()?'Mis à jour toutes les 10 secondes.':''}</p>`;
}
async function tic(){const c=classeL();if(!c)return;try{await lireGrist(c)}catch(e){}if(GRAND)peindreGrand();else if(DB.vue==='atp')rendre()}

/* ---------- Réglage du lien Grist (onglet Classes) ---------- */
function reglage(){
  return `<section class="carte"><h3>🥇 Tournoi ATP en direct (Grist)</h3>
  <p class="small muted" style="margin-top:0">Un seul document Grist pour toutes les classes, partagé en « Accès public : éditeur ». Seuls le prénom et l’initiale du nom y sont écrits. Le lien part dans le QR de démarrage des classes en GAREEPS 2026 ; il n’est jamais affiché aux élèves.</p>
  <input type="url" id="atp-gr" value="${esc(DB.gristATP||'')}" placeholder="https://grist.numerique.gouv.fr/o/docs/…/ATP-TT"></section>`;
}

/* ---------- Évènements ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='atplire'){e.stopImmediatePropagation();try{const n=await lireGrist(classeL());journal('Grist : '+n+' nouveau(x) match(s) ATP')}catch(x){alert(x.message)}rendre();return}
  if(a==='atpgrand'){e.stopImmediatePropagation();GRAND=!GRAND;peindreGrand();if(GRAND&&gristDoc()&&!AUTO){AUTO=setInterval(tic,10000);tic()}return}
  if(a==='atpref'){e.stopImmediatePropagation();const k=norm(classeL())+'|'+(DB.seance||1)+'|'+norm(b.dataset.n);R()[k]=Math.max(0,(R()[k]||0)+(+b.dataset.v));if(!R()[k])delete R()[k];sauver();rendre();return}
},true);
document.addEventListener('change',e=>{const t=e.target;
  if(t.id==='atp-s'){DB.seance=+t.value;sauver();rendre()}
  if(t.id==='atp-auto'){if(t.checked){AUTO=setInterval(tic,10000);tic()}else{clearInterval(AUTO);AUTO=null}}
  if(t.id==='atp-gr'){const u=t.value.trim();if(u&&!/^https:\/\//.test(u)){alert('Le lien doit commencer par https://');return}DB.gristATP=u;sauver()}
});
const css=document.createElement('style');css.textContent=`#atp-plein{position:fixed;inset:0;z-index:60;background:var(--craie);padding:20px;overflow:auto}
table.atpg{font-size:clamp(18px,2.4vw,30px)}table.atpg td,table.atpg th{padding:8px 14px}`;document.head.appendChild(css);

window.ATPP={vATP,reglage,pourQR,depuisFichier,depuisQR,classement,lireGrist};
})();
