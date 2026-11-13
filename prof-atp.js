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
  // avatar choisi par l'élève (le plus récent l'emporte)
  const AVS=DB.avatars||(DB.avatars={});[[m.a,m.av1],[m.b,m.av2]].forEach(([n,id])=>{if(!id)return;const k=norm(classe)+'|'+norm(n),x=AVS[k];if(!x||(x.ts||0)<=(+m.ts||0))AVS[k]={id,ts:+m.ts||0}});
}
function depuisFichier(o){(o.matchs||[]).forEach(m=>ajouter(o.classe||'',o.seance,m,'fichier'));return (o.matchs||[]).length+' match(s) ATP'}
function depuisQR(q){(q.m||[]).forEach(([id,a,b,arb,sa,sb,ts,av1,av2])=>ajouter(q.c||'',q.s,{id,a,b,arb,sa,sb,ts,av1,av2},'qr'));return (q.m||[]).length+' match(s) ATP · séance '+q.s}
// Grist : noms courts → noms de la liste de classe
async function lireGrist(c){
  const g=gristDoc();if(!g)throw new Error('Pas de document Grist réglé (onglet Classes).');
  const r=await fetch(g.base+'/api/docs/'+g.id+'/tables/'+A.table+'/records?filter='+encodeURIComponent(JSON.stringify({classe:[c]})));
  if(r.status===404)return 0;if(!r.ok)throw new Error('Grist répond '+r.status);
  const L=(DB.classesL[c]||{}).eleves||[],C=G26.courts(L),inv={};Object.entries(C).forEach(([n,k])=>inv[k]=n);
  let n=0;(await r.json()).records.forEach(({fields:f})=>{if(!f.uid||f.j2==='REFUS')return; // lignes « REFUS » : écrites par cet outil pour les téléphones
const a=inv[f.j1]||f.j1,b=inv[f.j2]||f.j2;
    if(!M()[f.uid])n++;ajouter(c,f.seance,{id:f.uid,a,b,arb:inv[f.arb]||f.arb||'',sa:f.s1,sb:f.s2,ts:f.ts,av1:f.av1||'',av2:f.av2||''},'grist')});
  DB.atpLu=Date.now();sauver();return n;
}

// Refus de la séance → Grist (une ligne par élève, j2 = « REFUS », s1 = nombre), pour les téléphones en ligne
async function envoyerRefus(c){
  const g=gristDoc();if(!g||!c||!navigator.onLine)return;
  const L=(DB.classesL[c]||{}).eleves||[],C=G26.courts(L),E=DB.atpRefusGr||(DB.atpRefusGr={}),rec=[];
  const cles=new Set(Object.keys(R()).concat(Object.keys(E)).filter(k=>k.startsWith(norm(c)+'|')));
  cles.forEach(k=>{const nb=R()[k]||0;if((E[k]||0)===nb)return;const [,ss,nn]=k.split('|'),n=L.find(y=>norm(y)===nn)||nn;
    rec.push({k,nb,r:{require:{uid:'R|'+k},fields:{classe:c,seance:+ss,date:new Date().toISOString().slice(0,10),j1:C[n]||G26.court(n),j2:'REFUS',s1:nb,s2:0,arb:'',ts:Math.round(Date.now()/1000)}}})});
  if(!rec.length)return;
  try{const r=await fetch(g.base+'/api/docs/'+g.id+'/tables/'+A.table+'/records',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({records:rec.map(x=>x.r)})});
    if(r.ok){rec.forEach(x=>{if(x.nb)E[x.k]=x.nb;else delete E[x.k]});sauver()}}catch(e){}
}
/* ---------- Calcul du classement ---------- */
// Renvoie {depart:{nom:pts}, jour:{nom:{pts,v,d,ref}}, total, rangD, rangT} pour la séance s
// Absents et dispensés du jour (onglet Appel, ou QR de démarrage reçu par une tablette borne)
const ABS=['absent','abj','disp'];
function absents(c,s){
  const L=(DB.classesL[c]||{}).eleves||[],ap=DB.appel||{};
  const A=L.filter(n=>ABS.includes(ap[norm(c)+'|'+s+'|'+cleEleve(c,n)]));
  const base=(DB.atpBase||{})[norm(c)];if(!A.length&&base&&base.s===s&&base.ab)return base.ab.slice();
  return A;
}
function classement(c,s){
  const L=(DB.classesL[c]||{}).eleves||[],tous=Object.values(M()).filter(m=>norm(m.classe)===norm(c));
  const seances=[...new Set(tous.map(m=>m.seance).concat(Object.keys(R()).filter(k=>k.startsWith(norm(c)+'|')).map(k=>+k.split('|')[1])))].filter(x=>x<=s).sort((a,b)=>a-b);
  const P={};L.forEach(n=>P[n]=0);let depart=null,jour={},rangG=null;
  // Tablette « borne » alimentée par le QR de démarrage : points de départ reçus, pas d'historique des séances
  const base=(DB.atpBase||{})[norm(c)];let SE=seances;
  if(base&&s>=base.s){Object.entries(base.p||{}).forEach(([n,v])=>{const x=L.find(y=>norm(y)===norm(n))||n;P[x]=+v});SE=seances.filter(x=>x>=base.s)}
  for(const x of SE.concat(SE.includes(s)?[]:[s])){
    if(x===s)depart=Object.assign({},P);
    const MX=tous.filter(m=>m.seance===x),rk=G26.rangsG(L,P,absents(c,x),MX.flatMap(m=>[m.a,m.b])),J={};
    if(x===s)rangG=rk;
    MX.sort((a,b)=>a.ts-b.ts).forEach(m=>{const w=m.sa>m.sb?m.a:m.b,l=w===m.a?m.b:m.a;
      [w,l].forEach(n=>{J[n]=J[n]||{pts:0,v:0,d:0,ref:0};if(P[n]==null)P[n]=0});
      const gn=G26.atpGain(rk[w]||L.length,rk[l]||L.length);J[w].pts+=gn;J[w].v++;J[l].pts+=A.perdu;J[l].d++});
    Object.entries(R()).forEach(([k,nb])=>{const [cc,ss,nn]=k.split('|');if(cc===norm(c)&&+ss===x){const n=L.find(y=>norm(y)===nn)||nn;J[n]=J[n]||{pts:0,v:0,d:0,ref:0};J[n].ref+=nb;J[n].pts+=A.refus*nb}});
    Object.entries(J).forEach(([n,j])=>P[n]=(P[n]||0)+j.pts);
    if(x===s){jour=J;break}
  }
  if(!depart)depart=Object.assign({},P);
  if(!rangG)rangG=G26.rangsG(L,depart,absents(c,s),[]);
  const total={};Object.keys(Object.assign({},depart,P)).forEach(n=>total[n]=(depart[n]||0)+((jour[n]||{}).pts||0));
  const noms=L.length?L:Object.keys(total);
  return {depart,jour,total,rangD:G26.rangs(noms,depart),rangT:G26.rangs(noms,total),rangG,abs:absents(c,s),noms};
}
// Points de départ de la PROCHAINE séance (pour le QR de démarrage)
function pourQR(c){
  const tous=Object.values(M()).filter(m=>norm(m.classe)===norm(c));if(!tous.length)return null;
  const der=Math.max(...tous.map(m=>m.seance)),K=classement(c,der+1);
  const p={};Object.entries(K.depart).forEach(([n,v])=>{if(v)p[n]=Math.round(v*10)/10});const o={s:der+1,p},ab=absents(c,der+1);if(ab.length)o.ab=ab;return o;
}

/* ---------- Onglet ATP ---------- */
let AUTO=null,GRAND=false;
function tableau(c,s,K,grand){
  const ord=K.noms.slice().sort((x,y)=>K.rangT[x]-K.rangT[y]);
  const fl=n=>{const d=K.rangD[n]-K.rangT[n];return d>0?`<span style="color:var(--vert)">▲${d}</span>`:d<0?`<span style="color:var(--alerte)">▼${-d}</span>`:'='};
  return `<div class="tablewrap"><table class="cl${grand?' atpg':''}"><thead><tr><th>Rang</th><th>Joueur</th><th>Départ</th><th>Aujourd’hui</th><th>Total</th><th>V-D</th><th></th><th>Palier</th>${grand?'':'<th>Refus</th>'}</tr></thead><tbody>
  ${ord.map(n=>{const j=K.jour[n]||{pts:0,v:0,d:0,ref:0};return `<tr><td><b>${K.rangT[n]}</b></td><td>${esc(grand?G26.court(n):n)}</td><td>${(K.depart[n]||0).toLocaleString('fr')}</td><td>${j.pts?'+'+j.pts.toLocaleString('fr'):'—'}</td><td><b>${(K.total[n]||0).toLocaleString('fr')}</b></td><td>${j.v}-${j.d}</td><td>${fl(n)}</td><td>${(p=>p.ic+' '+p.n)(palier(K.total[n]||0))}</td>
  ${grand?'':`<td style="white-space:nowrap"><button class="bt mini" type="button" data-act="atpref" data-n="${esc(n)}" data-v="1" title="Match refusé : ${A.refus} points">−2</button>${j.ref?` <button class="bt mini" type="button" data-act="atpref" data-n="${esc(n)}" data-v="-1" title="Annuler un refus">↶ ${j.ref}</button>`:''}</td>`}</tr>`}).join('')}</tbody></table></div>`;
}
function vATP(){
  const c=classeL();if(!c)return '<h2>Tournoi ATP</h2><p class="muted">Choisis une classe.</p>';
  const s=DB.seance||1,K=classement(c,s),nb=Object.values(M()).filter(m=>norm(m.classe)===norm(c)&&m.seance===s).length,g=gristDoc();
  return `<h2>Tournoi ATP · ${esc(c)}</h2>
  <div class="rangee noprint"><label class="small">Séance <select id="atp-s">${Array.from({length:12},(_,i)=>i+1).map(i=>`<option${i===s?' selected':''}>${i}</option>`).join('')}</select></label>
  ${g?`<button class="bt" type="button" data-act="atplire">↻ Actualiser depuis Grist</button><label class="small"><input type="checkbox" id="atp-auto"${AUTO?' checked':''}> toutes les 10 s</label>`:'<span class="small muted">Pas de Grist : les matchs arrivent avec les séances (Importer).</span>'}
  <button class="bt orange" type="button" data-act="atpborne">📷 Mode borne (tablette sur trépied)</button><button class="bt" type="button" data-act="atpgrand">⛶ Plein écran sans caméra</button></div>
  <p class="small muted">Mode borne : le tableau en grand et la caméra allumée en bas à gauche. Après chaque match, l’arbitre y montre le QR affiché par son téléphone ; le classement et les effets se mettent à jour, même sans internet. Branche la tablette sur secteur. <b>Borne sur une autre tablette que la tienne</b> : ouvre l’outil prof dessus, lance le mode borne et montre-lui le <b>QR de démarrage</b> de la classe (onglet Classes) : elle reçoit la liste, le classement de départ, les paliers et les avatars.</p>
  <p class="small muted">${nb} match${nb>1?'s':''} reçu${nb>1?'s':''} pour la séance ${s}${DB.atpLu&&g?' · Grist lu à '+new Date(DB.atpLu).toLocaleTimeString('fr',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):''}. Barème d’Arnaud : de ${A.dessous[4]} à ${A.dessus[4]} points selon l’écart de rang au début de la séance, ${A.perdu} pour une défaite, ${A.refus} pour un refus.</p>
  <p class="small${K.abs.length?'':' muted'}">${K.abs.length?`<b>Absents ou dispensés (onglet Appel, séance ${s}) :</b> ${K.abs.map(n=>esc(prenom(n))).join(', ')}. Ils ne comptent pas dans l’écart de rang.`:`Règle des absents : les élèves notés absents ou dispensés dans l’onglet <b>Appel</b> (séance ${s}) ne comptent pas dans l’écart de rang. Fais l’appel <b>avant</b> de montrer le QR de démarrage pour que les téléphones le sachent.`} À points égaux, rang égal.</p>
  <section class="carte">${tableau(c,s,K,false)}</section>
  <p class="small">Paliers (points cumulés) : 🥈 Argent dès <input type="number" class="g6pal" data-atppal="0" value="${seuils()[0]}" min="1">, 🥇 Or dès <input type="number" class="g6pal" data-atppal="1" value="${seuils()[1]}" min="1">, 💎 Diamant dès <input type="number" class="g6pal" data-atppal="2" value="${seuils()[2]}" min="1"> <span class="muted">(à ajuster après la 1re séance)</span></p>
  <p class="small muted">Le classement de départ de la séance suivante part dans le QR de démarrage (onglet Classes) : fais-le rescanner en début de cours pour que les téléphones l’affichent.</p>`;
}
/* ---------- Paliers (seuils de points cumulés, réglables) ---------- */
const PALIERS=[['br','🥉','BRONZE'],['ar','🥈','ARGENT'],['or','🥇','OR'],['dia','💎','DIAMANT']];
const seuils=()=>Array.isArray(DB.atpPal)&&DB.atpPal.length===3?DB.atpPal:[10,20,30];
function palier(p){const S=seuils();const i=p>=S[2]?3:p>=S[1]?2:p>=S[0]?1:0;const bas=i?S[i-1]:0,haut=S[i];
  return {i,k:PALIERS[i][0],ic:PALIERS[i][1],n:PALIERS[i][2],xp:i===3?100:Math.max(0,Math.min(100,Math.round(100*(p-bas)/(haut-bas))))}}
// Série en cours (victoires d'affilée dans la séance)
function combos(c,s){const C={};Object.values(M()).filter(m=>norm(m.classe)===norm(c)&&m.seance===s).sort((a,b)=>a.ts-b.ts).forEach(m=>{const w=m.sa>m.sb?m.a:m.b,l=w===m.a?m.b:m.a;C[w]=(C[w]||0)+1;C[l]=0});return C}
const fr=v=>(+v||0).toLocaleString('fr');
const avDe=(c,n,px)=>window.G26AV?G26AV.html(((DB.avatars||{})[norm(c)+'|'+norm(n)]||{}).id,n,px):'';
const ordinal=r=>r+(r===1?'ST':r===2?'ND':r===3?'RD':'TH');

/* ---------- Plein écran façon borne d'arcade ---------- */
let VUS=null,FILE=[],EN_COURS=false,AVANT={};
function peindreGrand(){
  let z=document.getElementById('atp-plein');if(!GRAND){if(z)z.remove();VUS=null;FILE=[];return}
  if(!z){z=document.createElement('div');z.id='atp-plein';document.body.appendChild(z)}
  const c=classeL(),s=DB.seance||1,K=classement(c,s),CB=combos(c,s);
  const fxAvant=(document.getElementById('ar-fx')||{}).innerHTML||'';
  const ms=Object.values(M()).filter(m=>norm(m.classe)===norm(c)&&m.seance===s).sort((a,b)=>b.ts-a.ts);
  // nouveaux matchs depuis le dernier affichage → effets
  if(VUS===null){VUS=new Set(ms.map(m=>m.id));AVANT=Object.assign({},K.rangT)}
  else ms.slice().reverse().forEach(m=>{if(!VUS.has(m.id)){VUS.add(m.id);FILE.push(m)}});
  const ord=K.noms.slice().sort((x,y)=>K.rangT[x]-K.rangT[y]),nb=ord.length,col=nb>12?2:1;
  const ligne=n=>{const r=K.rangT[n],j=K.jour[n]||{},P=palier(K.total[n]||0),d=K.rangD[n]-r,nouv=(AVANT[n]||r)-r>0;
    return `<div class="ar-row${r===1?' r1':''}"><span class="rk">${ordinal(r)}</span><span class="nm"><span class="ar-av">${avDe(c,n,64)}</span>${esc(G26.court(n).toUpperCase())}${CB[n]>=2?` <span class="cb">COMBO×${CB[n]}</span>`:''}${nouv?' <span class="new">NEW!</span>':''}</span>
    <span class="tier ${P.k}">${P.ic} ${P.n}</span><span class="xp"><i style="width:${P.xp}%"></i></span><span class="pt">${fr(K.total[n])}</span><span class="mv">${r===1?'👑':d>0?'<b class="up">▲'+d+'</b>':d<0?'<b class="dn">▼'+(-d)+'</b>':'='}</span></div>`};
  const tete='<div class="ar-row h"><span>RANG</span><span>JOUEUR</span><span>PALIER</span><span>XP</span><span>PTS</span><span></span></div>';
  const moitie=Math.ceil(nb/col),cols=Array.from({length:col},(_,i)=>ord.slice(i*moitie,(i+1)*moitie));
  z.innerHTML=`<div class="ar-sun"></div><div class="ar-grid"></div>
  <div class="ar-hd"><h1>TOURNOI ATP · HIGH SCORES</h1><span class="live">● ${gristDoc()?'LIVE':'SCORES'} · ${esc(c)} · S${s}</span><button class="bt mini" type="button" data-act="atpgrand">Fermer</button></div>
  <div class="ar-tb ar-c${col}">${cols.map(L=>`<div class="ar-col">${tete}${L.map(ligne).join('')}</div>`).join('')}</div>
  <div class="ar-tick">${ms.slice(0,6).map(m=>{const w=m.sa>m.sb?m.a:m.b,l=w===m.a?m.b:m.a;return `▶ ${esc(G26.court(w).toUpperCase())} BAT ${esc(G26.court(l).toUpperCase())} ${Math.max(m.sa,m.sb)}-${Math.min(m.sa,m.sb)} +${fr(G26.atpGain(K.rangG[w]||nb,K.rangG[l]||nb))} XP`}).join(' ')||'▶ EN ATTENTE DES PREMIERS MATCHS… INSERT COIN'}</div>
  <div class="ar-scan"></div><div id="ar-fx"></div>`;
  document.getElementById('ar-fx').innerHTML=fxAvant;
  AVANT=Object.assign({},K.rangT);
  if(!EN_COURS)jouer();
}
const attendre=t=>new Promise(r=>setTimeout(r,t));
async function jouer(){
  EN_COURS=true;
  while(FILE.length&&GRAND){
    const m=FILE.shift(),c=classeL(),s=DB.seance||1,K=classement(c,s),CB=combos(c,s),nb=K.noms.length;
    const w=m.sa>m.sb?m.a:m.b,l=w===m.a?m.b:m.a,rW=K.rangG[w]||nb,rL=K.rangG[l]||nb,gain=G26.atpGain(rW,rL);
    const boss=(rL===1&&(K.depart[l]||0)>0)||rW-rL>=3,serre=Math.abs(m.sa-m.sb)<=2;const FX=h=>{const f=document.getElementById('ar-fx');if(f)f.innerHTML=h};if(!document.getElementById('ar-fx'))break;
    const W=esc(G26.court(w).toUpperCase()),L=esc(G26.court(l).toUpperCase()),sc=`${Math.max(m.sa,m.sb)}-${Math.min(m.sa,m.sb)}`;
    const cont=`<div class="ar-cont"><div class="ar-cav">${avDe(c,l,72)}</div><div class="t">CONTINUE ? ▶ YES</div><p>${esc(G26.court(l))} a tout donné${serre?` : ${sc}, à ${Math.abs(m.sa-m.sb)} point${Math.abs(m.sa-m.sb)>1?'s':''} !`:'.'}</p><div class="g">+${fr(A.perdu)} XP · BONUS COURAGE 💪</div></div>`;
    if(boss){
      const etoiles=['7%;top:16%','88%;top:20%','12%;top:72%','84%;top:74%','48%;top:6%','30%;top:84%'].map((p,i)=>`<span class="star" style="left:${p};animation-delay:${i*.15}s">${['⭐','🌟','✨'][i%3]}</span>`).join('');
      FX(`<div class="ar-ov boss"><div><div class="bt">BOSS VAINCU !</div>
      <div class="vs"><div class="pc gw"><div class="ar-big">${avDe(c,w,120)}</div><small>PLAYER · ${ordinal(rW)}</small><b>${W}</b><div class="hp"><i style="width:${Math.round(100*Math.max(m.sa,m.sb)/11)}%;background:#4ade80"></i></div></div><span class="vsx">VS</span>
      <div class="pc gl"><div class="ar-big ko">${avDe(c,l,120)}</div><small>BOSS · ${ordinal(rL)}${rL===1?' 👑':''}</small><b>${L}</b><div class="hp"><i class="vide"></i></div></div></div>
      <div class="gain">+${fr(gain)} XP</div><div class="lvup">★ RANK UP · ${ordinal(K.rangT[w])} ★</div></div>${etoiles}</div>`);
      await attendre(4200);
    }else{
      const pieces=Array.from({length:9},(_,i)=>`<span class="coin" style="left:${12+i*9}%;animation-delay:${(i%4)*.12}s">★</span>`).join('');
      FX(`<div class="ar-ov vic"><div><div class="ar-big saut">${avDe(c,w,150)}</div><div class="bt">VICTOIRE !</div><div class="qui">${W} <span>${sc} · CONTRE ${L}</span></div>
      <div class="gain">+${fr(gain)} XP</div>${CB[w]>=2?`<div class="combo">COMBO ×${CB[w]} 🔥</div>`:''}</div>${pieces}</div>`);
      await attendre(2600);
    }
    FX(cont);await attendre(2000);FX('');await attendre(300);
  }
  EN_COURS=false;
}
/* ---------- Mode borne : tablette sur trépied, caméra allumée, l'arbitre scanne le QR du match ---------- */
let CAM=null; // {stream,video,timer,face,dernier,dernierT,wake}
function bip(ok){try{const A=new (window.AudioContext||window.webkitAudioContext)(),o=A.createOscillator(),g=A.createGain();o.type='square';o.frequency.value=ok?880:220;g.gain.value=.06;o.connect(g);g.connect(A.destination);o.start();
  if(ok)o.frequency.setValueAtTime(1320,A.currentTime+.08);o.stop(A.currentTime+(ok?.18:.3));setTimeout(()=>A.close(),500)}catch(e){}}
function msgCam(t,ok){const m=document.querySelector('#borne-cam .bc-msg');if(!m)return;m.textContent=t;m.className='bc-msg'+(ok===true?' ok':ok===false?' err':'');clearTimeout(msgCam.t);msgCam.t=setTimeout(()=>{m.textContent='Montre le QR de ton match ici';m.className='bc-msg'},3500)}
async function lu(txt){
  const q=await TTQR.decoder(txt),c=classeL();
  if(q.t!=='C'&&q.c&&norm(q.c)!==norm(c))throw new Error('QR de la classe '+q.c+' : la borne affiche '+c+'.');
  if(q.t==='A'){const neufs=(q.m||[]).filter(x=>!M()[x[0]]).length;depuisQR(q);
    if(+q.s!==(DB.seance||1)&&neufs){DB.seance=+q.s}sauver();
    if(!neufs){msgCam('Déjà compté ✓',true);bip(true);return}
    msgCam(neufs>1?neufs+' matchs ajoutés':'Match ajouté !',true);bip(true);peindreGrand();return}
  if(q.t==='C'){ // QR de démarrage : alimente une tablette borne qui n'est pas celle du prof
    const L=DB.classesL[q.c]||(DB.classesL[q.c]={eleves:[],lien:''});L.eleves=q.l||L.eleves;if(q.pa)L.pa=q.pa;if(q.pal)L.pal=q.pal;
    if(q.atp){DB.atpBase=DB.atpBase||{};DB.atpBase[norm(q.c)]=q.atp;DB.seance=q.atp.s}if(q.ap)DB.atpPal=q.ap;
    if(q.avs){const AVS=DB.avatars||(DB.avatars={});Object.entries(q.avs).forEach(([n,id])=>{const k=norm(q.c)+'|'+norm(n);if(!AVS[k])AVS[k]={id,ts:0}})}
    DB.classe=q.c;sauver();VUS=null;peindreGrand();msgCam('Classe '+q.c+' chargée : '+(q.l||[]).length+' élèves'+(q.atp?', séance '+q.atp.s:''),true);bip(true);return}
  if(q.t==='V'){const AVS=DB.avatars||(DB.avatars={});AVS[norm(c)+'|'+norm(q.e)]={id:q.av,ts:q.ts||0};sauver();
    msgCam('Avatar de '+G26.court(q.e)+' : '+((window.G26AV&&G26AV.parId[q.av])||{n:q.av}).n,true);bip(true);peindreGrand();return}
  throw new Error('Ce QR n’est pas un match ATP.');
}
async function camDemarrer(face){
  camArreter();
  const z=document.createElement('div');z.id='borne-cam';
  z.innerHTML=`<video playsinline muted></video><div class="bc-vis"></div><p class="bc-msg">Montre le QR de ton match ici</p><div class="bc-bt"><button type="button" class="bt mini" data-act="atpcamface" title="Changer de caméra">🔄</button></div>`;
  document.body.appendChild(z);
  const video=z.querySelector('video');CAM={video,face:face||'user',dernier:'',dernierT:0};
  video.classList.toggle('miroir',CAM.face==='user');
  try{CAM.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:CAM.face,width:{ideal:1280}},audio:false});video.srcObject=CAM.stream;await video.play().catch(()=>{})}
  catch(e){msgCam('Autorise la caméra dans les réglages du navigateur.',false);return}
  try{CAM.wake=await navigator.wakeLock.request('screen')}catch(e){}
  const cv=document.createElement('canvas'),ctx=cv.getContext('2d',{willReadFrequently:true});
  const tic=async()=>{if(!CAM)return;
    if(video.readyState>=2&&video.videoWidth){const w=video.videoWidth,h=video.videoHeight,k=Math.min(1,800/Math.max(w,h));cv.width=Math.round(w*k);cv.height=Math.round(h*k);ctx.drawImage(video,0,0,cv.width,cv.height);
      const r=window.jsQR&&jsQR(ctx.getImageData(0,0,cv.width,cv.height).data,cv.width,cv.height,{inversionAttempts:'dontInvert'});
      if(r&&r.data&&(r.data!==CAM.dernier||Date.now()-CAM.dernierT>5000)){CAM.dernier=r.data;CAM.dernierT=Date.now();try{await lu(r.data)}catch(x){msgCam(x.message||String(x),false);bip(false)}}}
    if(CAM)CAM.timer=setTimeout(tic,200)};
  tic();
}
function camArreter(){if(!CAM&&!document.getElementById('borne-cam'))return;if(CAM){clearTimeout(CAM.timer);if(CAM.stream)CAM.stream.getTracks().forEach(t=>t.stop());try{CAM.wake&&CAM.wake.release()}catch(e){}}CAM=null;const z=document.getElementById('borne-cam');if(z)z.remove()}

async function tic(){const c=classeL();if(!c)return;try{await lireGrist(c)}catch(e){}envoyerRefus(c);if(GRAND)peindreGrand();else if(DB.vue==='atp')rendre()}

/* ---------- Réglage du lien Grist (onglet Classes) ---------- */
function reglage(){
  return `<section class="carte"><h3>🥇 Tournoi ATP en direct (Grist)</h3>
  <p class="small muted" style="margin-top:0">Un seul document Grist pour toutes les classes, partagé en « Accès public : éditeur ». Seuls le prénom et l’initiale du nom y sont écrits. Le lien part dans le QR de démarrage des classes en GAREEPS 2026 ; il n’est jamais affiché aux élèves.</p>
  <input type="url" id="atp-gr" value="${esc(DB.gristATP||'')}" placeholder="https://grist.numerique.gouv.fr/o/docs/…/ATP-TT"></section>`;
}

/* ---------- Évènements ---------- */
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='atplire'){e.stopImmediatePropagation();try{const n=await lireGrist(classeL());journal('Grist : '+n+' nouveau(x) match(s) ATP')}catch(x){alert(x.message)}rendre();return}
  if(a==='atpgrand'){e.stopImmediatePropagation();GRAND=!GRAND;peindreGrand();if(!GRAND)camArreter();if(GRAND&&gristDoc()&&!AUTO){AUTO=setInterval(tic,10000);tic()}return}
  if(a==='atpborne'){e.stopImmediatePropagation();GRAND=true;peindreGrand();camDemarrer('user');if(gristDoc()&&!AUTO){AUTO=setInterval(tic,10000);tic()}return}
  if(a==='atpcamface'){e.stopImmediatePropagation();camDemarrer(CAM&&CAM.face==='user'?'environment':'user');return}
  if(a==='atpref'){e.stopImmediatePropagation();const k=norm(classeL())+'|'+(DB.seance||1)+'|'+norm(b.dataset.n);R()[k]=Math.max(0,(R()[k]||0)+(+b.dataset.v));if(!R()[k])delete R()[k];sauver();rendre();envoyerRefus(classeL());return}
},true);
document.addEventListener('change',e=>{const t=e.target;
  if(t.id==='atp-s'){DB.seance=+t.value;sauver();rendre()}
  if(t.id==='atp-auto'){if(t.checked){AUTO=setInterval(tic,10000);tic()}else{clearInterval(AUTO);AUTO=null}}
  if(t.dataset&&t.dataset.atppal!=null){const S=seuils().slice();S[+t.dataset.atppal]=Math.max(1,+t.value||1);if(!(S[0]<S[1]&&S[1]<S[2])){alert('Les paliers doivent augmenter : ex. 10, 20, 30.');rendre();return}DB.atpPal=S;sauver();rendre()}
  if(t.id==='atp-gr'){const u=t.value.trim();if(u&&!/^https:\/\//.test(u)){alert('Le lien doit commencer par https://');return}DB.gristATP=u;sauver()}
});
const css=document.createElement('style');css.textContent=`
#atp-plein{position:fixed;inset:0;z-index:60;overflow:hidden;background:#07031a;color:#fff;font-family:Archivo,Arial,sans-serif}
#atp-plein .ar-sun{position:absolute;left:50%;top:26vh;width:44vh;height:44vh;margin-left:-22vh;border-radius:50%;background:linear-gradient(#ff2fd0,#ff8a00 60%,#ffe600);opacity:.16;-webkit-mask:repeating-linear-gradient(#000 0 2.4vh,transparent 2.4vh 3.4vh);mask:repeating-linear-gradient(#000 0 2.4vh,transparent 2.4vh 3.4vh)}
#atp-plein .ar-grid{position:absolute;left:-50%;right:-50%;bottom:-6vh;height:44vh;transform:perspective(320px) rotateX(62deg);background:linear-gradient(transparent 0 96%,#ff2fd0 96%) 0 0/100% 6vh,linear-gradient(90deg,transparent 0 97%,#00e5ff 97%) 0 0/8vh 100%;opacity:.42;animation:argr 1.6s linear infinite}
@keyframes argr{to{background-position:0 6vh,0 0}}
#atp-plein .ar-scan{position:absolute;inset:0;background:repeating-linear-gradient(rgba(0,0,0,.18) 0 2px,transparent 2px 4px);pointer-events:none;z-index:20}
.ar-hd{position:relative;z-index:2;display:flex;align-items:center;gap:2vw;padding:2.4vh 3vw 1vh}
.ar-hd h1{flex:1;margin:0;font:900 clamp(22px,4.4vh,48px) "Courier New",monospace;letter-spacing:.06em;color:#fff;text-shadow:0 0 6px #ff2fd0,0 0 20px #ff2fd0}
.ar-hd .live{font:900 clamp(13px,2.2vh,22px) "Courier New",monospace;color:#ffe600;text-shadow:0 0 10px #ffe600;animation:arbl 1s steps(2) infinite}
@keyframes arbl{50%{opacity:.25}}
.ar-tb{position:relative;z-index:2;margin:1vh 3vw;border:2px solid #00e5ff;box-shadow:0 0 14px #00e5ff inset,0 0 14px #00e5ff;border-radius:10px;background:rgba(7,3,26,.78);padding:.6vh 1vw;column-gap:2vw;max-height:72vh;overflow:hidden}
.ar-row{break-inside:avoid;display:grid;grid-template-columns:5.5em 1fr 8.5em 7em 4.2em 3em;align-items:center;gap:.6em;padding:.45vh .5em;font:900 clamp(14px,2.7vh,30px) "Courier New",monospace;border-bottom:1px dashed rgba(0,229,255,.25)}
.ar-row.h{font-size:clamp(11px,1.7vh,18px);color:#7dd3fc;border-bottom:2px solid rgba(0,229,255,.5)}
.ar-row .rk{color:#ffe600}.ar-row.r1 .rk{text-shadow:0 0 10px #ffe600}.ar-row.r1 .nm{text-shadow:0 0 8px #00e5ff,0 0 18px #00e5ff}
.ar-row .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ar-row .cb{color:#ff2fd0;text-shadow:0 0 8px #ff2fd0;font-size:.7em}.ar-row .new{color:#ffe600;font-size:.6em;animation:arbl 1s steps(2) infinite}
.ar-row .tier{font:900 .5em Archivo,Arial;padding:.35em .6em;border-radius:6px;text-align:center;letter-spacing:.05em;color:#111}
.tier.dia{background:linear-gradient(135deg,#a5f3fc,#6366f1)}.tier.or{background:linear-gradient(135deg,#fde68a,#d97706)}.tier.ar{background:linear-gradient(135deg,#f1f5f9,#94a3b8)}.tier.br{background:linear-gradient(135deg,#fdba74,#9a3412);color:#fff}
.ar-row .xp{height:.5em;border-radius:6px;background:#1e1b4b;overflow:hidden;border:1px solid #6366f1}.ar-row .xp i{display:block;height:100%;background:linear-gradient(90deg,#22d3ee,#a855f7)}
.ar-row .up{color:#4ade80}.ar-row .dn{color:#f87171}
.ar-tick{position:absolute;z-index:2;left:0;right:0;bottom:0;padding:1.2vh 3vw;background:rgba(255,47,208,.18);border-top:2px solid #ff2fd0;font:900 clamp(12px,2.2vh,22px) "Courier New",monospace;white-space:nowrap;overflow:hidden;color:#fbcfe8}
#ar-fx{position:absolute;inset:0;z-index:15;pointer-events:none}
.ar-ov{position:absolute;inset:0;display:grid;place-items:center;text-align:center;animation:arin .25s ease-out}
@keyframes arin{from{opacity:0;transform:scale(1.15)}to{opacity:1;transform:none}}
.ar-ov.boss{background:radial-gradient(circle,rgba(255,0,80,.35),rgba(7,3,26,.94) 70%)}.ar-ov.vic{background:rgba(7,3,26,.82)}
.ar-ov .bt{font:900 clamp(56px,15vh,170px)/.9 Archivo,Arial;font-stretch:72%;font-style:italic;color:#ffe600;text-shadow:5px 5px 0 #ff2fd0,10px 10px 0 #00e5ff,0 0 40px #ffe600;transform:rotate(-4deg);animation:arpop .5s cubic-bezier(.2,1.6,.4,1)}
@keyframes arpop{from{transform:rotate(-4deg) scale(.3)}to{transform:rotate(-4deg) scale(1)}}
.ar-ov.vic .bt{color:#4ade80;text-shadow:5px 5px 0 #065f46,0 0 30px #22c55e}
.ar-ov .vs{display:flex;align-items:center;justify-content:center;gap:3vw;margin-top:3vh}
.ar-ov .pc{width:28vw;max-width:360px;border:3px solid #fff;border-radius:12px;padding:1.4vh 1vw;background:rgba(7,3,26,.85)}
.ar-ov .pc.gw{border-color:#4ade80;box-shadow:0 0 18px #4ade80}.ar-ov .pc.gl{border-color:#ff2fd0;box-shadow:0 0 18px #ff2fd0}
.ar-ov .pc b{display:block;font:900 clamp(20px,4vh,40px) Archivo,Arial}.ar-ov .pc small{font:900 clamp(12px,2vh,20px) "Courier New";color:#7dd3fc}
.ar-ov .hp{height:2.2vh;border:2px solid #fff;border-radius:4px;margin-top:.8vh;background:#3f0d1c}.ar-ov .hp i{display:block;height:100%}
.ar-ov .hp i.vide{width:100%;background:#ff2fd0;animation:arhp 1.4s .4s ease-in forwards}@keyframes arhp{to{width:0}}
.ar-ov .vsx{font:900 clamp(30px,7vh,70px) Archivo;font-style:italic;color:#ff2fd0;text-shadow:0 0 16px #ff2fd0}
.ar-ov .gain{display:inline-block;margin-top:2.4vh;font:900 clamp(30px,7vh,70px) "Courier New";color:#4ade80;text-shadow:0 0 16px #4ade80}
.ar-ov .lvup,.ar-ov .combo{font:900 clamp(18px,4vh,40px) "Courier New";color:#ffe600;margin-top:1vh;text-shadow:0 0 12px #ffe600}.ar-ov .combo{color:#ff2fd0;text-shadow:0 0 14px #ff2fd0}
.ar-ov .qui{font:900 clamp(24px,5.5vh,56px) Archivo;margin-top:2vh}.ar-ov .qui span{color:#7dd3fc;font:900 clamp(14px,3vh,30px) "Courier New"}
.ar-ov .star{position:absolute;font-size:clamp(24px,5vh,54px);animation:arst 1.2s ease-in-out infinite alternate}@keyframes arst{to{transform:scale(1.5) rotate(25deg)}}
.ar-ov .coin{position:absolute;bottom:-10vh;width:5vh;height:5vh;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff7b0,#facc15 45%,#a16207);box-shadow:0 0 10px #facc15;font:900 2.6vh Archivo;color:#713f12;display:grid;place-items:center;animation:arcoin 1.6s ease-out forwards}
@keyframes arcoin{0%{transform:translateY(0)}55%{transform:translateY(-75vh) rotate(200deg)}100%{transform:translateY(-55vh) rotate(360deg);opacity:0}}
.ar-cont{position:absolute;right:3vw;bottom:9vh;width:min(46vw,520px);border:3px solid #a855f7;box-shadow:0 0 18px #a855f7;border-radius:12px;background:rgba(20,8,48,.95);padding:2vh 1.6vw;animation:arin .25s ease-out}
.ar-cont .t{font:900 clamp(18px,3.8vh,40px) "Courier New";color:#e9d5ff;text-shadow:0 0 10px #a855f7}.ar-cont p{font:700 clamp(14px,2.4vh,24px) Atkinson,Arial;color:#ddd6fe;margin:.6vh 0 0}
.ar-cont .g{font:900 clamp(16px,3.2vh,34px) "Courier New";color:#c4b5fd;margin-top:.8vh}
#atp-plein .bt.mini{position:relative;z-index:25}
.ar-row .nm{display:flex;align-items:center;gap:.35em}.ar-av svg{width:1.5em;height:1.5em;display:block;image-rendering:pixelated}
.ar-big svg{display:block;margin:0 auto .6vh;width:min(16vh,150px);height:min(16vh,150px);image-rendering:pixelated;filter:drop-shadow(0 0 10px rgba(255,255,255,.35))}
.ar-big.ko svg{animation:arko 1.4s .5s forwards}@keyframes arko{to{transform:rotate(90deg) translateY(10%);filter:grayscale(1) brightness(.6)}}
.ar-big.saut svg{width:min(20vh,180px);height:min(20vh,180px);animation:arsaut .5s ease-in-out infinite alternate}@keyframes arsaut{to{transform:translateY(-14%)}}
.ar-cont{display:grid;grid-template-columns:auto 1fr;column-gap:1vw}.ar-cont .ar-cav{grid-row:span 3}.ar-cont .ar-cav svg{width:9vh;height:9vh;image-rendering:pixelated}
#borne-cam{position:fixed;left:2vw;bottom:7vh;z-index:70;width:min(30vw,300px);border:3px solid #ffe600;box-shadow:0 0 18px #ffe600;border-radius:14px;overflow:hidden;background:#000}
#borne-cam video{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}#borne-cam video.miroir{transform:scaleX(-1)}
#borne-cam .bc-vis{position:absolute;left:18%;right:18%;top:10%;aspect-ratio:1;border:3px dashed rgba(255,230,0,.8);border-radius:10px;pointer-events:none}
#borne-cam .bc-msg{margin:0;padding:6px 8px;font:900 15px "Courier New",monospace;color:#ffe600;background:#07031a;text-align:center}
#borne-cam .bc-msg.ok{color:#07031a;background:#4ade80}#borne-cam .bc-msg.err{color:#fff;background:#dc2626}
#borne-cam .bc-bt{position:absolute;right:6px;top:6px}
.ar-tb.ar-c2{display:grid;grid-template-columns:1fr 1fr;gap:0 2vw}.ar-c2 .ar-row{grid-template-columns:3.6em 1fr 6.4em 4.5em 3.4em 2.2em;font-size:clamp(12px,2.2vh,24px)}
.ar-c2 .ar-row .tier{font-size:.5em}
@media (prefers-reduced-motion:reduce){#atp-plein *{animation:none!important}}`;document.head.appendChild(css);

window.ATPP={avatarsClasse:c=>{const o={};Object.entries(DB.avatars||{}).forEach(([k,v])=>{const [cc,n]=k.split('|');if(cc===norm(c)){const x=((DB.classesL[c]||{}).eleves||[]).find(y=>norm(y)===n);if(x)o[x]=v.id}});return Object.keys(o).length?o:undefined},seuils,vATP,reglage,pourQR,depuisFichier,depuisQR,classement,lireGrist,palier,_peindre:()=>peindreGrand(),_lu:t=>lu(t)};
})();
