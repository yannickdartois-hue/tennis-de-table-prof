/* =====================================================================
   prof-demo-g26.js — démo du parcours GAREEPS 2026 dans l'outil prof
   Classe fictive « DÉMO G26 » (16 élèves) : SCE n°1 et n°2, SRP, STOM,
   tournoi ATP sur 5 séances avec avatars et paliers.
   « ▶ Démo de la borne » : le mode borne arcade reçoit un faux match toutes les
   7 secondes (effets, montées, combos, avatars), sans caméra ni élèves.
   Rien n'est enregistré : mêmes règles que la démo existante (prof-demo.js).
   Ouverture : bouton dans la carte « Découvrir », ou adresse …/?demo=g26
   ===================================================================== */
(function(){
'use strict';
const CL='DÉMO G26';
const NOMS=['ARNAUD Lucas','BENOIT Emma','BLANC Hugo','BRUN Léa','CARON Nathan','CHEVALIER Inès','DUBOIS Tom','DURAND Zoé','FAURE Sacha','FONTAINE Chloé','GARNIER Enzo','GIRARD Manon','GUERIN Noah','HENRY Lina','LAMBERT Théo','LEROY Jade'];
const ABS6=['FAURE Sacha','HENRY Lina'],ICI=NOMS.filter(n=>!ABS6.includes(n));
const r=alea(20261113),r7=alea(7),ent=(a,b)=>a+Math.floor(r()*(b-a+1)),pick=L=>L[Math.floor(r()*L.length)];
const niv={};NOMS.forEach((n,i)=>niv[n]=4+((i*5)%16)/2+r()*3); // niveau caché
const gagne=(a,b)=>r()<1/(1+Math.exp((niv[b]-niv[a])*.45));
const jour=s=>new Date(Date.now()-(6-s)*7*864e5).toISOString().slice(0,10);
// profil de bonus de chaque élève (ce qu'il réussit le mieux)
const prof={};NOMS.forEach(n=>prof[n]=[r(),r(),r(),r()]);
function balles(A,B){ // 12 balles, 2 chars par balle : côté + bonus
  let s='';for(let i=0;i<12;i++){const w=gagne(A,B)?'a':'b',P=prof[w==='a'?A:B],x=r();
    const k=x<P[0]*.35?'R':x<P[0]*.35+P[1]*.3?'A':x<P[0]*.35+P[1]*.3+P[2]*.25?'K':x<P[0]*.35+P[1]*.3+P[2]*.25+P[3]*.2?'T':'-';s+=w+k}
  return s;
}
// fiches avant-match et observations de démo (tirage séparé : ne change pas le reste de la démo)
const PJ=['Je sers coupé sur son revers puis j’attaque la balle haute.','Je joue long dans son coup droit, puis court dans son revers.','Je fixe son revers et je finis en coup droit.','Je sers rapide au corps et je crie PAN sur le retour haut.'];
const pk=L=>L[Math.floor(r7()*L.length)];
function avDemo(mi){const un=mi<2,f=()=>un?{fo:[...new Set([pk(G26.forts),pk(G26.forts)])],pj:pk(PJ)}:{f:{[Object.keys(G26.faibles)[0]]:[pk(Object.values(G26.faibles)[0].L)]},pj:pk(PJ)};return {a:f(),b:f()}}
function obsDemo(){const o={};[[2,0],[3,1],[0,2],[1,3]].forEach(([x,y])=>{const F=Object.entries(G26.faibles)[Math.floor(r7()*Object.keys(G26.faibles).length)];o[x+'>'+y]={[F[0]]:[pk(F[1].L)]}});return o}
function construire(){
  const d=vide();d.classesL[CL]={eleves:NOMS.slice(),lien:'',pa:'g26',pal:[2,4,6]};d.classe=CL;d.vue='atp';d.seance=6;d.atpPal=[17,21,25]; // seuils de démo : les 4 paliers sont représentés
  const sauv=DB;DB=d;
  try{
    // SCE n°1 (séance 1) et n°2 (séance 5) : tables de 4 de niveau voisin
    [[1,1],[2,5]].forEach(([n,s])=>{const ord=NOMS.slice().sort((x,y)=>niv[y]-niv[x]+(r()-.5)*2*(n-1));
      for(let t=0;t<4;t++){const J=ord.slice(t*4,t*4+4);
        const bil={};J.forEach((j,p)=>{const v=prof[j].map((x,i)=>[x,i]).sort((a,b)=>a[0]-b[0]).map(x=>'RAKT'[x[1]]);bil[p]=v.slice(0,3)});
        G6P.depuisFichier({classe:CL,seance:s,sce:n,table:String(t+1),joueurs:J,exportedAt:new Date(Date.now()-(6-s)*7*864e5).toISOString(),
          matchs:G26.rot.map(([a,b],mi)=>({srv:'a',b:balles(J[a],J[b]),av:avDemo(mi)})),obs:obsDemo(),bilans:bil})}});
    // SRP et STOM des séances 2 à 4
    NOMS.forEach((n,i)=>{for(let s=2;s<=4;s++){
      const k=pick(['R','A','K','T']),srp=[];for(let m=0;m<ent(1,2);m++){let b='';for(let x=0;x<12;x++){const w=gagne(n,pick(NOMS));b+=w?(r()<.35+niv[n]/40?'x':'p'):'o'}srp.push({k,adv:pick(NOMS.filter(x=>x!==n)),obs:pick(NOMS),srv:'a',b,tm:k==='T'?'Jouer sur son revers':''})}
      const stom=[{k,at:ent(1,3),nv:1,e:[ent(4,9),ent(6,12)],ok:r()<.7?(r()<.4?2:1):0}];
      ajouterRecord({classe:CL,eleve:n,seance:s,date:jour(s),ts:Date.now()/1000-(6-s)*604800,src:'fichier',axes:[],chg:[],ex:[],bilan:'',disp:false,groupe:null,etoile:null,grille:null,g15:null,om:null,pouleResume:null,g26:{srp,stom}})}});
    // Tournoi ATP : 5 séances de 3 à 4 matchs chacun
    d.atp={};let id=0,ts=1;
    for(let s=1;s<=5;s++)for(let m=0;m<20;m++){const a=pick(NOMS),b=pick(NOMS.filter(x=>x!==a)),w=gagne(a,b),l=ent(3,9);
      d.atp['d'+(++id)]={id:'d'+id,classe:CL,seance:s,a,b,arb:NOMS.filter(x=>x!==a&&x!==b)[Math.floor(r7()*14)],sa:w?11:l,sb:w?l:11,ts:ts++,src:'fichier'}}
    // séance 6 : 2 absents (règle des absents du tournoi ATP)
    d.appel=d.appel||{};ABS6.forEach(n=>d.appel[norm(CL)+'|6|'+norm(CL)+'|'+norm(n)]='absent');
    // étoile AFL2 / AFL3 déjà cochée pour 12 élèves sur 16
    d.g6role={};NOMS.slice(0,12).forEach(n=>{const o={};G26.role.forEach(x=>o[x.k]=Math.max(1,Math.min(4,Math.round(niv[n]/3)+Math.floor(r7()*3)-1)));d.g6role[norm(CL)+'|'+norm(n)]=o});
    // avatars : chacun a choisi un personnage de son palier
    const K=ATPP.classement(CL,6);d.avatars={};
    NOMS.forEach(n=>{const p=G26AV.palier(K.depart[n]||0,d.atpPal),L=G26AV.AV.filter(a=>a.t<=p);d.avatars[norm(CL)+'|'+norm(n)]={id:pick(L.filter(a=>a.t===p).concat(L)).id,ts:1}});
  }finally{DB=sauv}
  return d;
}
function entrer(){
  if(DEMO){if(norm(DB.classe)===norm(CL))return;quitterDemo()}
  let d;try{d=construire()}catch(e){alert('Démo impossible : '+(e.message||e));return}
  DB_REEL=DB;DB=d;DEMO=true;rendre();window.scrollTo(0,0);
}
/* ----- Démo de la borne : un faux match toutes les 7 s ----- */
let TIMER=null;
function demoBorne(){
  if(!DEMO||norm(DB.classe)!==norm(CL))entrer();
  DB.vue='atp';DB.seance=6;rendre();
  document.querySelector('[data-act=atpgrand]').click();
  clearInterval(TIMER);let n=0;
  const coup=()=>{if(!document.getElementById('atp-plein')||!DEMO){clearInterval(TIMER);TIMER=null;return}
    const K=ATPP.classement(CL,6),ord=NOMS.slice().sort((x,y)=>K.rangD[x]-K.rangD[y]);
    // de temps en temps un exploit : un joueur du bas bat un du haut
    let a,b;n++;const O=ord.filter(x=>ICI.includes(x));if(n%3===0){a=O[ent(7,O.length-1)];b=O[ent(0,2)]}else{a=pick(ICI);b=pick(ICI.filter(x=>x!==a))}
    const w=n%3===0?true:gagne(a,b),l=ent(4,10),i='z'+Date.now();
    DB.atp[i]={id:i,classe:CL,seance:6,a,b,sa:w?11:l,sb:w?l:11,ts:Math.round(Date.now()/1000),src:'qr'};ATPP._peindre()};
  setTimeout(coup,1500);TIMER=setInterval(coup,7000);
}
/* ----- Boutons ----- */
const carte=()=>`<section class="carte demo-carte"><h3>🎮 Découvrir le parcours GAREEPS 2026</h3><p class="small muted">Classe fictive de 16 élèves : SCE n°1 et n°2, SRP, STOM, tournoi ATP sur 5 séances avec avatars. Tes vraies données ne sont pas touchées.</p>
  <div class="rangee"><button class="bt" type="button" data-act="demog26">Ouvrir la démo GAREEPS 2026</button><button class="bt orange" type="button" data-act="demoborne">▶ Démo de la borne</button></div></section>`;
const vI=vImport;vImport=function(){return vI()+(DEMO?'':carte())};
const vC=vClasses;vClasses=function(){return vC()+(DEMO?'':carte())};
const vA=ATPP.vATP;ATPP.vATP=function(){return vA()+(DEMO&&norm(DB.classe)===norm(CL)?`<section class="carte"><h3>🎮 Démo de la borne</h3><p class="small muted">Un faux match arrive toutes les 7 secondes : effets, montées, combos et avatars. Ferme le plein écran pour arrêter.</p><button class="bt orange" type="button" data-act="demoborne">▶ Lancer la démo de la borne</button></section>`:'')};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;
  if(b.dataset.act==='demog26'){e.stopImmediatePropagation();entrer();return}
  if(b.dataset.act==='demoborne'){e.stopImmediatePropagation();demoBorne();return}
},true);
if(/[?&]demo=g26\b/.test(location.search))setTimeout(entrer,0);
})();
