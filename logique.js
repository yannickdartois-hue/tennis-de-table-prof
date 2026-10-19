/* =====================================================================
   logique.js — calculs sans affichage (poules, export, QR)
   Tennis de table · appli élève · Lycée Georges Pompidou
   ===================================================================== */
(function(root){
'use strict';

/* ---------- Projets de jeu annoncés avant un match (index partagé appli élève / outil prof) ---------- */
const PROJETS=['Servir court, puis attaquer','Servir long, puis attaquer','Jouer sur le revers adverse','Jouer sur le coup droit adverse',
  'Déplacer droite-gauche','Faire reculer, puis amortir','Tenir l’échange sans faute','Smasher la balle haute','Couper pour gêner','Lifter pour accélérer'];
// Serveur au tableau de marque : changement tous les 2 points, puis à chaque point à partir de 10-10.
function serveur(premier,a,b){const t=a+b,k=(a>=10&&b>=10)?10+(t-20):Math.floor(t/2);return k%2===0?premier:(premier==='a'?'b':'a')}
function mancheFinie(a,b){return (a>=11||b>=11)&&Math.abs(a-b)>=2}

/* ---------- Poules ---------- */
// Ordre « tous contre tous » (méthode du cercle). Renvoie une liste de [i,j].
function ordreMatchs(n){
  const ids=[...Array(n).keys()];
  if(n%2)ids.push(-1);
  const m=ids.length,tours=[];
  for(let r=0;r<m-1;r++){
    for(let k=0;k<m/2;k++){
      const a=ids[k],b=ids[m-1-k];
      if(a>=0&&b>=0)tours.push(a<b?[a,b]:[b,a]);
    }
    ids.splice(1,0,ids.pop());
  }
  return tours;
}
// Arbitre : un joueur qui ne joue pas ce match, celui qui a le moins arbitré.
function creerMatchs(n){
  const cnt=Array(n).fill(0);
  return ordreMatchs(n).map(([a,b],i,all)=>{
    let libres=[...Array(n).keys()].filter(x=>x!==a&&x!==b);
    // éviter d'arbitrer juste avant de jouer, si possible
    const suiv=all[i+1]||[];
    const pref=libres.filter(x=>!suiv.includes(x));
    if(pref.length)libres=pref;
    let arb=null;
    if(libres.length){arb=libres.sort((x,y)=>cnt[x]-cnt[y]||x-y)[0];cnt[arb]++}
    return {a,b,arb,m:[],f:null};
  });
}
const MANCHES={'1':1,'2':2,'3':3}; // nombre de manches gagnantes
function etatMatch(mt,fmt){
  const need=MANCHES[fmt]||2;
  if(mt.f==='a')return {fini:true,w:'b',ma:0,mb:need,pa:0,pb:11*need,forfait:true};
  if(mt.f==='b')return {fini:true,w:'a',ma:need,mb:0,pa:11*need,pb:0,forfait:true};
  let ma=0,mb=0,pa=0,pb=0;
  for(const s of mt.m||[]){
    if(!s||s[0]===''||s[1]===''||s[0]==null||s[1]==null)continue;
    const x=+s[0],y=+s[1];
    if(!isFinite(x)||!isFinite(y)||x===y)continue;
    pa+=x;pb+=y;if(x>y)ma++;else mb++;
    if(ma>=need||mb>=need)break;
  }
  const fini=ma>=need||mb>=need;
  return {fini,w:fini?(ma>mb?'a':'b'):null,ma,mb,pa,pb,forfait:false};
}
function stats(n,matchs,fmt,filtre){
  const S=[...Array(n).keys()].map(i=>({i,pts:0,j:0,v:0,d:0,mg:0,mp:0,pg:0,pp:0}));
  for(const mt of matchs){
    if(filtre&&!(filtre.has(mt.a)&&filtre.has(mt.b)))continue;
    const e=etatMatch(mt,fmt);if(!e.fini)continue;
    const A=S[mt.a],B=S[mt.b];
    A.j++;B.j++;A.mg+=e.ma;A.mp+=e.mb;B.mg+=e.mb;B.mp+=e.ma;A.pg+=e.pa;A.pp+=e.pb;B.pg+=e.pb;B.pp+=e.pa;
    const W=e.w==='a'?A:B,L=e.w==='a'?B:A;
    W.v++;L.d++;W.pts+=2;L.pts+=(e.forfait?0:1);
  }
  return S;
}
const ratio=(g,p)=>p===0?(g>0?1e9:0):g/p;
// Classement FFTT : points (V 2, D 1, forfait 0), puis entre ex aequo :
// points des matchs entre eux, quotient des manches, quotient des points.
function classement(n,matchs,fmt){
  const S=stats(n,matchs,fmt);
  const groupes={};S.forEach(s=>(groupes[s.pts]=groupes[s.pts]||[]).push(s.i));
  const ordre=[];
  Object.keys(groupes).map(Number).sort((a,b)=>b-a).forEach(p=>{
    const g=groupes[p];
    if(g.length===1){ordre.push(g[0]);return}
    const sub=stats(n,matchs,fmt,new Set(g));
    g.sort((x,y)=>sub[y].pts-sub[x].pts
      ||ratio(sub[y].mg,sub[y].mp)-ratio(sub[x].mg,sub[x].mp)
      ||ratio(sub[y].pg,sub[y].pp)-ratio(sub[x].pg,sub[x].pp)
      ||ratio(S[y].mg,S[y].mp)-ratio(S[x].mg,S[x].mp)
      ||ratio(S[y].pg,S[y].pp)-ratio(S[x].pg,S[x].pp)
      ||x-y);
    ordre.push(...g);
  });
  return ordre.map((i,k)=>Object.assign({rang:k+1},S[i]));
}
function texteScore(mt,fmt,depuis){ // score vu par le joueur « depuis » ('a' ou 'b')
  const e=etatMatch(mt,fmt);
  if(e.forfait)return depuis===e.w?'victoire par forfait':'forfait';
  const sets=(mt.m||[]).filter(s=>s&&s[0]!==''&&s[1]!==''&&s[0]!=null&&s[1]!=null&&+s[0]!==+s[1]).map(s=>depuis==='a'?s[0]+'-'+s[1]:s[1]+'-'+s[0]);
  const mm=depuis==='a'?e.ma+'-'+e.mb:e.mb+'-'+e.ma;
  return mm+(sets.length?' ('+sets.join(', ')+')':'');
}
// Résumé de la poule pour un joueur (index i), pour son fichier.
function resumePoule(P,i){
  const n=P.joueurs.length,C=classement(n,P.matchs,P.fmt),me=C.find(c=>c.i===i);
  const total=P.matchs.length,joues=P.matchs.filter(m=>etatMatch(m,P.fmt).fini).length;
  let mouvement=null;
  if(P.mouv&&joues===total&&total>0){
    if(me.rang===1&&P.num>1)mouvement='monte en poule '+(P.num-1);
    else if(me.rang===n)mouvement='descend en poule '+(P.num+1);
    else mouvement='reste en poule '+P.num;
  }
  return {
    numero:P.num,nbJoueurs:n,format:P.fmt==='1'?'1 manche':P.fmt+' manches gagnantes',
    rang:me.rang,points:me.pts,victoires:me.v,defaites:me.d,manches:me.mg+'-'+me.mp,pointsMarques:me.pg+'-'+me.pp,
    termine:joues===total,mouvement,
    matchs:P.matchs.filter(m=>m.a===i||m.b===i).map(m=>{
      const e=etatMatch(m,P.fmt),cote=m.a===i?'a':'b',adv=P.joueurs[m.a===i?m.b:m.a],j=cote==='a'?0:1;
      const pj=m.pj&&m.pj[j]!=null?m.pj[j]:null,ok=m.pjok&&m.pjok[j]!=null?m.pjok[j]:null;
      return {contre:adv,joue:e.fini,gagne:e.fini?e.w===cote:null,score:e.fini?texteScore(m,P.fmt,cote):'',
        projet:pj==null?null:PROJETS[pj],projetReussi:pj==null?null:ok};
    }),
    arbitrages:P.matchs.filter(m=>m.arb===i).length,
    classement:C.map(c=>({rang:c.rang,joueur:P.joueurs[c.i],points:c.pts,v:c.v,d:c.d}))
  };
}

/* ---------- Noms de fichiers ---------- */
function slug(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'').slice(0,24)}
function nomFichier(classe,eleve,seance,suffixe){
  const parts=String(eleve||'').trim().split(/\s+/);
  const prenom=parts[0]||'',nom=parts.slice(1).join(' ');
  const who=slug(nom?nom:prenom)+(nom?slug(prenom).slice(0,1).toUpperCase():'');
  return (slug(classe)||'Classe')+'_'+(who||'Eleve')+'_S'+seance+(suffixe?'_'+suffixe:'')+'.json';
}

/* ---------- QR : version compacte d'un fichier ---------- */
const cut=(s,n)=>{s=String(s||'');return s.length>n?s.slice(0,n-1)+'…':s};
function versQR(o){
  const q={a:'TTE',v:1,c:o.classe,e:o.eleve,s:o.seance,d:o.date,ts:Math.round(Date.now()/1000)};
  if(o.type==='poule'){q.t='p'}
  else{
    q.x=(o.axes||[]).map(a=>[a.axe,a.valideAujourdhui?1:0]);
    if(o.changementsAxe&&o.changementsAxe.length)q.ch=o.changementsAxe.map(c=>[c.de,c.vers,cut(c.motif,40)]);
    q.ex=(o.exercices||[]).map(e=>[e.axe,e.exercice,e.niveau||0,cut(e.remarque,60),cut(e.verifiePar||'',30)]);
    if(o.bilan)q.b=cut(o.bilan,150);
    if(o.dispense)q.dp=1;
    if(o.arbitrePoule)q.ap=[o.arbitrePoule.numero,o.arbitrePoule.matchs];
    if(o.etoile)q.et=o.etoile.map(a=>a.degre||0);
    if(o.grilleCoach){const g=o.grilleCoach;q.g=[g.c0,g.c1,g.c2,g.c3,g.cx];if(g.projet)q.pj=cut(g.projet,80)}
  }
  if(o.poule){const p=o.poule;q.p=[p.numero,p.nbJoueurs,p.rang,p.points,p.termine?1:0,p.mouvement||'',p.matchs.map(m=>[m.contre,m.gagne==null?-1:m.gagne?1:0,m.score]),p.arbitrages]}
  return q;
}
function b64url(bytes){let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function chaineQR(o){
  const json=JSON.stringify(versQR(o)),raw=new TextEncoder().encode(json);
  try{
    if(typeof CompressionStream==='function'){
      const cs=new CompressionStream('deflate-raw');
      const buf=await new Response(new Blob([raw]).stream().pipeThrough(cs)).arrayBuffer();
      return 'TTE1:'+b64url(new Uint8Array(buf));
    }
  }catch(e){}
  return 'TTE0:'+b64url(raw);
}

root.TTL={PROJETS,serveur,mancheFinie,ordreMatchs,creerMatchs,etatMatch,classement,texteScore,resumePoule,nomFichier,slug,versQR,chaineQR};
})(typeof window!=='undefined'?window:globalThis);
