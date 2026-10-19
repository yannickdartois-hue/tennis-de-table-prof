/* =====================================================================
   prof.js — Tennis de table · outil prof
   Récupère les séances des élèves (fichiers JSON, dossier .zip du Nuage,
   QR codes scannés), reconstruit les poules et fait le bilan par élève.
   Données gardées sur cet appareil uniquement (localStorage).
   ===================================================================== */
'use strict';
const CLEP='tte-prof-v1';
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const axe=k=>GA.axes.find(a=>a.k===k);
// Séance 8, tour 2 de poule = « 8.2 » (le tour 1 garde le numéro de séance)
const labS=x=>{x=+x;return Number.isInteger(x)?String(x):Math.floor(x)+' · tour '+Math.round((x%1)*10)};
const labC=x=>{x=+x;return Number.isInteger(x)?'S'+x:'S'+Math.floor(x)+' T'+Math.round((x%1)*10)};
const COURT={strat:'Stratégie',cont:'Continuité',diff:'Mettre en difficulté',eng:'Engagement',ana:'Analyse',coach:'Coach',arb:'Arbitrage'};
function exInfo(n){for(const t of GA.themes){const e=t.ex.find(x=>x.n===String(n));if(e)return {t,e}}return null}
function critere(n,c){const i=exInfo(n);if(!i)return '';const nv=i.e.nv||[],cols=nv.length===3?[2,3,4]:nv.length===2?[3,4]:[4];if(c===1)return 'pas encore atteint';const k=cols.indexOf(c);return k>=0?nv[k]:''}

/* ---------- Base ---------- */
let DB=charger();
function vide(){return {rec:{},poules:{},alias:{},noms:{},vue:'import',classe:'',seance:1,eleve:null,journal:[],classesL:{},appel:{},tri:'nom'}}
function charger(){try{const o=JSON.parse(localStorage.getItem(CLEP));if(o&&o.rec)return Object.assign(vide(),o)}catch(e){}return vide()}
function sauver(){try{localStorage.setItem(CLEP,JSON.stringify(DB))}catch(e){alert('Mémoire de l’appareil pleine : exporte une sauvegarde.')}}
// Identité d'un élève : classe + nom normalisé, avec les fusions décidées par le prof.
function cleEleve(classe,nom){let k=norm(classe)+'|'+norm(nom);const seen=new Set();while(DB.alias[k]&&!seen.has(k)){seen.add(k);k=DB.alias[k]}return k}
function nomAffiche(k){return DB.noms[k]||k.split('|')[1]}
function retenirNom(k,nom){if(!DB.noms[k])DB.noms[k]=nom}

/* ---------- Import ---------- */
function ajouterRecord(r){
  const k=cleEleve(r.classe,r.eleve);retenirNom(k,r.eleve);
  const id=k+'|'+r.seance,old=DB.rec[id];
  if(old&&(old.ts||0)>(r.ts||0)&&old.src==='fichier')return 'déjà à jour';
  DB.rec[id]=Object.assign({k},r);return old?'mis à jour':'nouveau';
}
function ajouterPoule(classe,seance,b,ts){
  if(!b||!b.joueurs||!b.matchs)return;
  const id=norm(classe)+'|'+seance+'|'+b.num,old=DB.poules[id];
  const joues=x=>x.matchs.filter(m=>TTL.etatMatch(m,x.fmt).fini).length;
  const nv={classe,seance:+seance,num:+b.num,fmt:String(b.fmt||'2'),arbDisp:b.arbDisp||'',joueurs:b.joueurs.slice(),matchs:b.matchs.map(m=>({a:m.a,b:m.b,arb:m.arb,f:m.f||null,pj:m.pj||null,pjok:m.pjok||null,co:m.co||null,m:(m.m||[]).map(x=>[+x[0],+x[1]])})),ts:ts||0};
  if(old){
    const sig=x=>x.joueurs.map(norm).join('|')+'#'+JSON.stringify(x.matchs.map(m=>[m.f,m.m]));
    if(sig(old)!==sig(nv)&&old.joueurs.map(norm).join('|')!==nv.joueurs.map(norm).join('|')){
      DB.poulesAlt=DB.poulesAlt||{};const L=DB.poulesAlt[id]||(DB.poulesAlt[id]=[]);
      if(!L.some(x=>sig(x)===sig(nv)))L.push(nv);if(!L.some(x=>sig(x)===sig(old)))L.push(old);
      if(old.choisi)return; // le prof a déjà tranché
    }
    if(joues(old)>joues(nv)||(joues(old)===joues(nv)&&(old.ts||0)>=(nv.ts||0)))return;
  }
  DB.poules[id]=nv;
  nv.joueurs.forEach(j=>retenirNom(cleEleve(classe,j),j));if(nv.arbDisp)retenirNom(cleEleve(classe,nv.arbDisp),nv.arbDisp);
}
// Fichier JSON de l'appli élève
function importerObjet(o,source){
  if(o&&o.carnetTT)throw new Error('C’est la sauvegarde d’un téléphone, pas un fichier de séance.');
  if(!o||o.app!=='tennis-de-table-eleves')throw new Error('Fichier non reconnu');
  const ts=Date.parse(o.exportedAt)/1000||0;
  if(o.poule&&o.poule.brut)ajouterPoule(o.classe,o.seance,o.poule.brut,ts);
  if(o.arbitrePoule&&o.arbitrePoule.brut)ajouterPoule(o.classe,o.seance,o.arbitrePoule.brut,ts);
  (o.tours||[]).forEach(t=>{if(t&&t.brut)ajouterPoule(o.classe,o.seance+'.'+t.tour,t.brut,ts)});
  if(o.type==='poule')return 'poule '+(o.poule?o.poule.numero:'');
  const r={classe:o.classe||'',eleve:o.eleve,seance:+o.seance,date:o.date,ts,src:'fichier',
    axes:(o.axes||[]).map(a=>({k:a.axe,val:!!a.valideAujourdhui})),
    chg:(o.changementsAxe||[]).map(c=>({de:c.de,vers:c.vers,motif:c.motif})),
    ex:(o.exercices||[]).map(e=>({axe:e.axe,n:String(e.exercice),niv:e.niveau||0,rq:e.remarque||'',obs:e.verifiePar||''})),
    bilan:o.bilan||'',disp:!!o.dispense,groupe:o.groupe&&o.groupe.length?o.groupe:null,etoile:o.etoile?o.etoile.map(a=>a.degre||0):null,
    grille:o.grilleCoach||null,
    pouleResume:o.poule?{num:o.poule.numero,n:o.poule.nbJoueurs,rang:o.poule.rang,pts:o.poule.points,v:o.poule.victoires,d:o.poule.defaites,mv:o.poule.mouvement||''}:null};
  return ajouterRecord(r);
}
// QR code (format compact)
function importerQR(q){
  const ts=q.ts||Date.parse(q.d)/1000||0;
  if(q.t==='T')throw new Error('C’est un QR de changement de groupe (pour un téléphone élève).');
  if(q.t==='P'){const pp=q.p.length>=5?q.p:[q.p[0],q.p[1],q.p[2],'',q.p[3]];const [num,fmt,joueurs,arbDisp,ms]=pp;ajouterPoule(q.c,q.s,{num,fmt,joueurs,arbDisp,matchs:ms.map(([a,b,arb,f,sets,pj,pjok,co])=>({a,b,arb,f:f||null,m:sets,pj:pj||null,pjok:pjok||null,co:co?{a:co[0],b:co[1]}:null}))},ts);return 'Poule '+num+' · séance '+q.s}
  if(q.t==='p')return q.e+' : poule seulement';
  const r={classe:q.c||'',eleve:q.e,seance:+q.s,date:q.d,ts,src:'qr',
    axes:(q.x||[]).map(([k,v])=>({k,val:!!v})),
    chg:(q.ch||[]).map(([de,vers,motif])=>({de,vers,motif})),
    ex:(q.ex||[]).map(([a,n,niv,rq,obs])=>({axe:a,n:String(n),niv:niv||0,rq:rq||'',obs:obs||''})),
    bilan:q.b||'',disp:!!q.dp,groupe:q.gr||null,etoile:q.et||null,
    grille:q.g?{c0:q.g[0],c1:q.g[1],c2:q.g[2],c3:q.g[3],cx:q.g[4],projet:q.pj||'',scoreObserve:q.g[1]+2*q.g[2]+3*q.g[3]}:null,
    pouleResume:q.p?{num:q.p[0],n:q.p[1],rang:q.p[2],pts:q.p[3],mv:q.p[5]||'',v:(q.p[6]||[]).filter(m=>m[1]===1).length,d:(q.p[6]||[]).filter(m=>m[1]===0).length}:null};
  const res=ajouterRecord(r);return q.e+' · séance '+q.s+' ('+res+')';
}
async function importerFichiers(files){
  let ok=0,err=[];
  async function un(nom,texte){try{const o=JSON.parse(texte);if(o&&o.app==='tt-secours')await importerSecours(o);else importerObjet(o);ok++}catch(e){err.push(nom+' : '+(e.message||e))}}
  for(const f of files){
    if(/\.zip$/i.test(f.name)){
      try{const z=await JSZip.loadAsync(f);const L=Object.values(z.files).filter(x=>!x.dir&&/\.json$/i.test(x.name));for(const x of L)await un(x.name.split('/').pop(),await x.async('string'))}
      catch(e){err.push(f.name+' : zip illisible')}
    }else if(/\.json$/i.test(f.name)||f.type==='application/json')await un(f.name,await f.text());
    else err.push(f.name+' : ni .json ni .zip');
  }
  journal(ok+' fichier'+(ok>1?'s':'')+' importé'+(ok>1?'s':'')+(err.length?' · '+err.length+' refusé'+(err.length>1?'s':''):''),err);
  choisirClasseParDefaut();sauver();rendre();if(ok)proposerSauvegarde();
}
function journal(t,err){DB.journal.unshift({t,err:err||[],d:new Date().toISOString()});DB.journal=DB.journal.slice(0,20)}
function classes(){const s=new Set(Object.keys(DB.classesL));Object.values(DB.rec).forEach(r=>s.add(r.classe||''));Object.values(DB.poules).forEach(p=>s.add(p.classe||''));return [...s].sort()}
function choisirClasseParDefaut(){const C=classes();if(!C.includes(DB.classe))DB.classe=C[0]||''}

/* ---------- Calculs ---------- */
const recsClasse=()=>Object.values(DB.rec).filter(r=>norm(r.classe)===norm(DB.classe));
const poulesClasse=()=>Object.values(DB.poules).filter(p=>norm(p.classe)===norm(DB.classe));
function seancesClasse(){const s=new Set();recsClasse().forEach(r=>s.add(r.seance));poulesClasse().forEach(p=>s.add(p.seance));return [...s].sort((a,b)=>a-b)}
// Résultat de chaque élève dans chaque poule : ligne de classement + ses matchs
function resultatsPoules(){
  const R={};// k -> seance -> {num,n,rang,pts,v,d,mg,mp,pg,pp,matchs:[]}
  poulesClasse().forEach(P=>{
    const n=P.joueurs.length,C=TTL.classement(n,P.matchs,P.fmt);
    P.joueurs.forEach((j,i)=>{
      const k=cleEleve(P.classe,j),c=C.find(x=>x.i===i);
      const ms=P.matchs.filter(m=>m.a===i||m.b===i).map(m=>{const e=TTL.etatMatch(m,P.fmt),cote=m.a===i?'a':'b';const j=cote==='a'?0:1,pj=m.pj&&m.pj[j]!=null?m.pj[j]:null;return {adv:P.joueurs[m.a===i?m.b:m.a],fini:e.fini,gagne:e.fini?e.w===cote:null,score:e.fini?TTL.texteScore(m,P.fmt,cote):'',pj,pjok:pj==null?null:(m.pjok?m.pjok[j]:null)}});
      let mv='';const tous=P.matchs.every(m=>TTL.etatMatch(m,P.fmt).fini);
      const der=Math.max(...poulesClasse().filter(q=>q.seance===P.seance).map(q=>q.num));
      if(tous&&n>1){mv=c.rang===1&&P.num>1?'monte':c.rang===n&&P.num<der?'descend':'reste'}
      (R[k]=R[k]||{})[P.seance]={num:P.num,n,rang:c.rang,pts:c.pts,v:c.v,d:c.d,mg:c.mg,mp:c.mp,pg:c.pg,pp:c.pp,matchs:ms,mv,complet:tous,arb:P.matchs.filter(m=>m.arb===i).length};
    });
  });
  // résumés seuls (fichiers anciens ou QR élève sans QR de poule)
  recsClasse().forEach(r=>{if(r.pouleResume&&!(R[r.k]&&R[r.k][r.seance])){const p=r.pouleResume;(R[r.k]=R[r.k]||{})[r.seance]={num:p.num,n:p.n,rang:p.rang,pts:p.pts,v:p.v,d:p.d,mg:null,mp:null,pg:null,pp:null,matchs:[],mv:p.mv,resume:true}}});
  return R;
}
function liste(){const c=Object.keys(DB.classesL).find(x=>norm(x)===norm(DB.classe));return c?DB.classesL[c].eleves:[]}
function eleves(){
  const s=new Set();liste().forEach(n=>{const k=cleEleve(DB.classe,n);retenirNom(k,n);s.add(k)});
  recsClasse().forEach(r=>s.add(r.k));const R=resultatsPoules();Object.keys(R).forEach(k=>s.add(k));
  Object.keys(arbitrages()).forEach(k=>s.add(k));
  return [...s].sort((a,b)=>nomAffiche(a).localeCompare(nomAffiche(b),'fr'));
}
function bilanEleve(k,R){
  const S=Object.entries((R||resultatsPoules())[k]||{}).sort((a,b)=>a[0]-b[0]);
  const t={seances:S.length,matchs:0,v:0,d:0,mg:0,mp:0,pg:0,pp:0,rangs:[],poules:[],complet:true};
  S.forEach(([,x])=>{t.v+=x.v||0;t.d+=x.d||0;t.matchs+=(x.v||0)+(x.d||0);if(x.mg==null)t.complet=false;else{t.mg+=x.mg;t.mp+=x.mp;t.pg+=x.pg;t.pp+=x.pp}t.rangs.push(x.rang);t.poules.push(x.num)});
  const moy=a=>a.length?Math.round(a.reduce((s,x)=>s+x,0)/a.length*10)/10:null;
  t.pctV=t.matchs?Math.round(t.v/t.matchs*100):null;t.rangMoy=moy(t.rangs);t.pouleMoy=moy(t.poules);
  t.meilleure=t.poules.length?Math.min(...t.poules):null;t.derniere=t.poules.length?t.poules[t.poules.length-1]:null;
  const recs=recsClasse().filter(r=>r.k===k).sort((a,b)=>a.seance-b.seance);
  t.travail=recs.length;t.exos=recs.reduce((s,r)=>s+r.ex.length,0);t.verts=recs.reduce((s,r)=>s+r.ex.filter(e=>e.niv>=3).length,0);
  t.chg=recs.reduce((s,r)=>s+r.chg.length,0);
  const et=recs.filter(r=>r.etoile&&r.etoile.some(Boolean));t.etDebut=et.length?et[0]:null;t.etFin=et.length>1?et[et.length-1]:null;
  t.mtValides=[...new Set(recs.flatMap(r=>r.axes.filter(a=>a.val).map(a=>a.k)))];
  return t;
}

/* ---------- Protection des données ---------- */
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
const installee=()=>{try{return navigator.standalone===true||matchMedia('(display-mode: standalone)').matches}catch(e){return false}};
function sauvegarder(){DB.saveAt=Date.now();sauver();telecharger('TT_prof_sauvegarde_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(Object.assign({ttProf:1},DB)),'application/json')}
// Après un import : propose une sauvegarde si la dernière date de plus d'un jour.
function proposerSauvegarde(){if(Date.now()-(DB.saveAt||0)>864e5&&confirm('Données importées. Enregistrer une sauvegarde maintenant ? (La dernière date de plus d’un jour.)'))sauvegarder()}
function bandeauSauvegarde(){
  if(!Object.keys(DB.rec).length&&!Object.keys(DB.poules).length)return '';
  const j=DB.saveAt?Math.floor((Date.now()-DB.saveAt)/864e5):null;
  const msg=j==null?'Aucune sauvegarde : si l’iPad efface les données, tout est perdu.':j>=7?`Dernière sauvegarde il y a ${j} jours.`:j>=2?`Dernière sauvegarde il y a ${j} jours.`:'';
  const inst=installee()?'':'<span>Installe l’outil sur l’écran d’accueil (Safari → Partager → « Sur l’écran d’accueil ») : sinon Safari peut effacer ses données après 7 jours sans ouverture.</span>';
  if(!msg&&!inst)return '';
  return `<div class="bandeau${j==null||j>=7?' rouge':''} noprint">${msg?`<span>${msg}</span><button class="bt mini noir" type="button" data-act="sauvegarde">Sauvegarder maintenant</button>`:''}${inst}</div>`;
}

/* ---------- Affichage ---------- */
const DOT=c=>`<i class="dot p${c}" title="${esc(GA.deg[c-1]||'')}"></i>`;
const famCl=k=>{const a=axe(k);return a?{AFL1:'a1',AFL2:'a2',AFL3:'a3'}[a.afl]:''};
function rendre(){
  const C=classes();
  $('#classes').innerHTML=C.length?`<label class="small">Classe <select id="selClasse">${C.map(c=>`<option${c===DB.classe?' selected':''}>${esc(c||'(sans classe)')}</option>`).join('')}</select></label>`:'';
  const O=[['classes','Classes'],['import','Importer'],['appel','Appel'],['tournoi','Tournoi'],['pilotage','Pilotage'],['eleves','Élèves'],['note','Note'],['export','Exporter']];
  $('#onglets').innerHTML=O.map(o=>`<button type="button" data-act="vue" data-v="${o[0]}" class="${DB.vue===o[0]?'ici':''}">${o[1]}</button>`).join('');
  const V={note:()=>window.vNote?vNote():'',pilotage:()=>window.vPilotage?vPilotage():'',classes:vClasses,appel:vAppel,import:vImport,tournoi:vTournoi,eleves:vEleves,export:vExport,fiche:vFiche};
  $('#main').innerHTML=bandeauSauvegarde()+V[DB.vue]();
}
function vImport(){
  const nR=Object.keys(DB.rec).length,nP=Object.keys(DB.poules).length;
  return `<h2>Récupérer les séances</h2>
  <div class="grille2">
    <section class="carte"><h3>QR codes</h3><p class="small muted">Les élèves montrent leurs QR en fin de séance : scanne-les à la suite, la caméra reste ouverte.</p>
      <button class="bt orange" type="button" data-act="scanner">Scanner les QR codes</button></section>
    <section class="carte"><h3>Fichiers</h3><p class="small muted">Les fichiers .json déposés par les élèves, ou le dossier du Nuage téléchargé en .zip. Sur ordinateur, tu peux aussi les glisser ici.</p>
      <label class="bt noir" for="fic">Choisir des fichiers</label><input id="fic" type="file" multiple accept=".json,.zip,application/json,application/zip" hidden></section>
  </div>
  <section class="carte"><h3>Dans l’outil</h3><p>${nR} séance${nR>1?'s':''} d’élèves · ${nP} poule${nP>1?'s':''}. Réimporter les mêmes fichiers ne crée pas de doublon.</p>
    ${DB.journal.length?`<ul class="small">${DB.journal.slice(0,6).map(j=>`<li>${new Date(j.d).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · ${esc(j.t)}${j.err.length?`<ul>${j.err.slice(0,8).map(e=>`<li class="err">${esc(e)}</li>`).join('')}</ul>`:''}</li>`).join('')}</ul>`:''}</section>
  ${vSecours()}
  <section class="carte"><h3>Passer de l’iPad au PC</h3><p class="small muted">Les données restent sur cet appareil. Exporte une sauvegarde, range-la dans ton espace personnel, puis restaure-la sur l’autre appareil.</p>
    <div class="rangee"><button class="bt mini" type="button" data-act="sauvegarde">Exporter une sauvegarde</button><label class="bt mini" for="resto">Restaurer une sauvegarde</label><input id="resto" type="file" accept=".json" hidden>
    <button class="bt mini danger" type="button" data-act="effacer">Tout effacer</button></div></section>`;
}
function vTournoi(){
  const S=seancesClasse();if(!S.length)return `<h2>Tournoi</h2><p class="muted">Aucune donnée pour cette classe : importe d’abord des séances.</p>`;
  if(!S.includes(DB.seance))DB.seance=S[S.length-1];
  const P=poulesClasse().filter(p=>p.seance===DB.seance).sort((a,b)=>a.num-b.num);
  const R=resultatsPoules();
  const AR=arbitrages();
  const sansPoule=eleves().filter(k=>!(R[k]&&R[k][DB.seance])&&!(AR[k]&&AR[k][DB.seance])&&recsClasse().some(r=>r.k===k&&r.seance===DB.seance&&!r.disp));
  return `<h2>Tournoi · séance ${labS(DB.seance)}</h2>
  <div class="strip">${S.map(s=>`<button type="button" data-act="seance" data-v="${s}" class="${s===DB.seance?'ici':''}">${labS(s)}</button>`).join('')}</div>
  ${P.length?'':'<p class="muted">Aucune poule complète reçue pour cette séance.</p>'}
  <div class="poules">${P.map(p=>{const n=p.joueurs.length,C=TTL.classement(n,p.matchs,p.fmt),tous=p.matchs.every(m=>TTL.etatMatch(m,p.fmt).fini);
    return `<section class="carte"><h3>Poule ${p.num} <span class="small muted">· ${n} joueurs · ${p.fmt==='1'?'1 manche':p.fmt+' manches gagnantes'}</span></h3>
      ${p.arbDisp?`<p class="small">Arbitre : <b>${esc(p.arbDisp)}</b> (dispensé)</p>`:''}
      ${(()=>{const id=norm(p.classe)+'|'+p.seance+'|'+p.num,L=(DB.poulesAlt||{})[id];if(!L||L.length<2)return '';
        return `<div class="avert small">Versions différentes reçues pour cette poule${p.choisi?' (choix fait)':''} :<br>${L.map((x,i)=>`<button class="bt mini" type="button" data-act="version" data-id="${esc(id)}" data-v="${i}">${x.joueurs.map(esc).join(', ')}</button>`).join(' ')}</div>`})()}
      <table class="cl"><thead><tr><th>Rang</th><th>Joueur</th><th>Pts</th><th>V</th><th>D</th><th>Manches</th><th>Points</th><th></th></tr></thead><tbody>
      ${C.map(c=>{const k=cleEleve(p.classe,p.joueurs[c.i]);const der=Math.max(...P.map(q=>q.num));const mv=tous&&n>1?(c.rang===1&&p.num>1?'↑':c.rang===n&&p.num<der?'↓':''):'';
        return `<tr><td>${c.rang}</td><td><button class="lien" type="button" data-act="fiche" data-k="${esc(k)}">${esc(p.joueurs[c.i])}</button></td><td><b>${c.pts}</b></td><td>${c.v}</td><td>${c.d}</td><td>${c.mg}-${c.mp}</td><td>${c.pg}-${c.pp}</td><td class="mv">${mv}</td></tr>`}).join('')}</tbody></table>
      <details><summary class="small">Les ${p.matchs.length} matchs</summary><ul class="matchs">${p.matchs.map(m=>{const e=TTL.etatMatch(m,p.fmt);
        return `<li>${esc(p.joueurs[m.a])} – ${esc(p.joueurs[m.b])} : ${e.fini?`<b>${esc(TTL.texteScore(m,p.fmt,'a'))}</b>`:'<span class="muted">non joué</span>'}${m.arb!=null?` <span class="muted">· arb. ${esc(p.joueurs[m.arb])}</span>`:''}</li>`}).join('')}</ul></details></section>`}).join('')}</div>
  ${(()=>{const {rangs,nb}=rangsClasse(R);const L=Object.keys(rangs).filter(k=>rangs[k][DB.seance]).sort((a,b)=>rangs[a][DB.seance]-rangs[b][DB.seance]);
    return L.length?`<section class="carte"><h3>Classement de la classe · séance ${labS(DB.seance)}</h3><p class="small muted">Poule 1 d’abord, puis le rang dans la poule.</p><div class="tablewrap"><table class="cl"><thead><tr><th>Classe</th><th>Élève</th><th>Poule</th><th>Rang poule</th><th>Pts</th><th>V-D</th></tr></thead><tbody>
      ${L.map(k=>{const c=R[k][DB.seance];return `<tr><td><b>${rangs[k][DB.seance]}</b>/${nb[DB.seance]}</td><td>${esc(nomAffiche(k))}</td><td>${c.num}</td><td>${c.rang}/${c.n}</td><td>${c.pts}</td><td>${c.v}-${c.d}</td></tr>`}).join('')}</tbody></table></div></section>`:''})()}
  ${sansPoule.length?`<section class="carte"><h3>Sans poule reçue</h3><p class="small">${sansPoule.map(k=>esc(nomAffiche(k))).join(', ')}</p><p class="small muted">Leur poule n’a pas été envoyée (QR « Poule » ou fichier du téléphone qui a saisi les scores).</p></section>`:''}`;
}
function vEleves(){
  const L=eleves();if(!L.length)return `<h2>Élèves</h2><p class="muted">Aucune donnée pour cette classe.</p>`;
  const S=seancesClasse(),R=resultatsPoules(),A=arbitrages(),CC=classementCycle(R),RC=rangsClasse(R).rangs;
  if(DB.tri==='classement')L.sort((a,b)=>((CC[a]||{}).place||999)-((CC[b]||{}).place||999));
  return `<h2>Élèves · ${esc(DB.classe||'')}</h2><p class="small muted">Pour chaque séance : n° de poule, rang dans la poule et (rang dans la classe). Touche un nom pour voir sa fiche.</p>
  <div class="rangee" style="margin-bottom:8px"><span class="small">Trier par :</span><button class="bt mini${DB.tri!=='classement'?' noir':''}" type="button" data-act="tri" data-v="nom">Nom</button><button class="bt mini${DB.tri==='classement'?' noir':''}" type="button" data-act="tri" data-v="classement">Classement du cycle</button></div>
  <div class="tablewrap"><table class="cl bil"><thead><tr><th>Élève</th><th>Classement</th><th>Rang classe moy.</th>${S.map(s=>`<th>${labC(s)}</th>`).join('')}<th>Abs.</th><th>Disp.</th><th>Matchs</th><th>V</th><th>D</th><th>% V</th><th>Manches G-P</th><th>Points G-P</th><th>Poule moy.</th><th>Exos</th><th>Chgt axe</th></tr></thead><tbody>
  ${L.map(k=>{const t=bilanEleve(k,R),x=R[k]||{};const recs=new Set(recsClasse().filter(r=>r.k===k).map(r=>r.seance));
    const st=S.map(s=>statut(k,s,R,A).c),cc=CC[k];
    return `<tr><td><button class="lien" type="button" data-act="fiche" data-k="${esc(k)}">${esc(nomAffiche(k))}</button></td><td><b>${cc?cc.place:'–'}</b></td><td>${cc?String(cc.moy).replace('.',','):'–'}</td>${S.map((s,j)=>{const c=x[s];if(c)return `<td class="rg r${Math.min(c.rang,4)}">P${c.num}·${c.rang}/${c.n} <small>(${(RC[k]||{})[s]})</small></td>`;const v=st[j];return `<td class="${v==='rien'?'vide':''}">${v==='disp'?'Disp.':v==='absent'||v==='abj'?'Abs.':recs.has(s)?'✓':'–'}</td>`}).join('')}
    <td>${st.filter(v=>v==='absent'||v==='abj').length||''}</td><td>${st.filter(v=>v==='disp').length||''}</td>
    <td>${t.matchs}</td><td>${t.v}</td><td>${t.d}</td><td>${t.pctV==null?'–':t.pctV+' %'}</td><td>${t.complet?t.mg+'-'+t.mp:'–'}</td><td>${t.complet?t.pg+'-'+t.pp:'–'}</td><td>${t.pouleMoy==null?'–':String(t.pouleMoy).replace('.',',')}</td><td>${t.exos}${t.verts?` <span class="small muted">(${t.verts} vert)</span>`:''}</td><td>${t.chg||''}</td></tr>`}).join('')}
  </tbody></table></div>
  <p class="small muted">Classement du cycle : moyenne des rangs dans la classe sur les séances jouées. « ✓ » : séance reçue sans poule. « – » : rien reçu (voir l’onglet Appel). Couleur : rang dans la poule.</p>`;
}
function vFiche(){
  const k=DB.eleve;if(!k)return vEleves();
  const R=resultatsPoules(),t=bilanEleve(k,R),x=R[k]||{},A=arbitrages(),RC=rangsClasse(R),CC=classementCycle(R)[k];
  const recs=recsClasse().filter(r=>r.k===k).sort((a,b)=>a.seance-b.seance);
  const S=[...new Set(Object.keys(x).map(Number).concat(recs.map(r=>r.seance)).concat(Object.keys(A[k]||{}).map(Number)))].sort((a,b)=>a-b);
  const autres=eleves().filter(e=>e!==k);
  const etoile=(r,lab)=>r?`<div><b>${lab} (séance ${r.seance})</b><div class="et">${GA.axes.map((a,i)=>`<span>${DOT(r.etoile[i]||0)} ${COURT[a.k]}</span>`).join('')}</div></div>`:'';
  return `<div class="rangee noprint"><button class="bt mini" type="button" data-act="vue" data-v="eleves">← Élèves</button><button class="bt mini" type="button" data-act="imprimer">Imprimer la fiche</button></div>
  <h2>${esc(nomAffiche(k))}</h2>
  <div class="chiffres"><div><b>${t.matchs}</b>matchs</div><div><b>${t.v}-${t.d}</b>V-D</div><div><b>${t.pctV==null?'–':t.pctV+'%'}</b>victoires</div><div><b>${t.complet?t.mg+'-'+t.mp:'–'}</b>manches</div><div><b>${t.complet?t.pg+'-'+t.pp:'–'}</b>points</div><div><b>${t.pouleMoy==null?'–':String(t.pouleMoy).replace('.',',')}</b>poule moy.</div><div><b>${CC?CC.place:'–'}</b>classement${CC?` (moy. ${String(CC.moy).replace('.',',')})`:''}</div></div>
  ${window.PLUS&&PLUS.fiche?PLUS.fiche(k,R):''}
  ${t.etDebut?`<section class="carte"><h3>Étoile</h3>${etoile(t.etDebut,'Début')}${etoile(t.etFin,'Fin')}</section>`:''}
  ${t.mtValides.length?`<p><b>Matchs à thème validés :</b> ${t.mtValides.map(a=>`<span class="fam ${famCl(a)}">${esc(COURT[a]||a)}</span>`).join(' ')}</p>`:''}
  ${S.map(s=>{const p=x[s],r=recs.find(y=>y.seance===s);
    const st=statut(k,Math.floor(s),R,A),ar=(A[k]||{})[s],rc=(RC.rangs[k]||{})[s];
    return `<section class="carte"><h3>Séance ${labS(s)}${r&&r.date?` <span class="small muted">· ${new Date(r.date).toLocaleDateString('fr-FR')}</span>`:''} <span class="badge st-${st.c}">${STATUTS[st.c]}</span>${rc?` <span class="badge">${rc}e de la classe</span>`:''}</h3>
    ${ar?`<p>Arbitre (dispensé) de la poule ${ar.num} : ${ar.matchs} match${ar.matchs>1?'s':''} arbitré${ar.matchs>1?'s':''}.</p>`:''}
    ${p?`<p><b>Poule ${p.num}</b> · rang ${p.rang}/${p.n} · ${p.pts} pts · ${p.v} V, ${p.d} D${p.mg!=null?` · manches ${p.mg}-${p.mp} · points ${p.pg}-${p.pp}`:''}${p.mv?` · <b>${p.mv}</b>`:''}${p.arb?` · ${p.arb} arbitrage${p.arb>1?'s':''}`:''}</p>
      ${p.matchs.length?`<ul class="matchs">${p.matchs.map(m=>`<li class="${m.gagne?'g':m.gagne===false?'p':''}">${m.gagne?'Gagné':m.gagne===false?'Perdu':'Non joué'} contre ${esc(m.adv)} ${m.score?`: ${esc(m.score)}`:''}${m.pj!=null?` <span class="small">· projet « ${esc(TTL.PROJETS[m.pj])} »${m.pjok===true?' ✓ réalisé':m.pjok===false?' ✗ non réalisé':''}</span>`:''}</li>`).join('')}</ul>`:p.resume?'<p class="small muted">Résumé seulement (détail des matchs non reçu).</p>':''}`:''}
    ${r?`<div class="travail">${r.axes.map(a=>`<span class="fam ${famCl(a.k)}">${esc(COURT[a.k]||a.k)}${a.val?' ✓ validé':''}</span>`).join(' ')}
      ${r.ex.length?`<ul>${r.ex.map(e=>{const i=exInfo(e.n);return `<li>${e.niv?DOT(e.niv):'<i class="dot"></i>'} Ex. ${esc(e.n)}${i?' · '+esc(i.e.t):''}${e.niv?` <span class="small muted">— ${esc(critere(e.n,e.niv))}</span>${e.obs?` <span class="badge st-present">vérifié par ${esc(e.obs)}</span>`:' <span class="badge">non vérifié</span>'}`:''}${e.rq?` <i>« ${esc(e.rq)} »</i>`:''}</li>`}).join('')}</ul>`:''}
      ${r.chg.map(c=>`<p class="avert small">Changement d’axe non validé : ${esc(COURT[c.de]||c.de)} → ${esc(COURT[c.vers]||c.vers||'aucun')} · « ${esc(c.motif)} »</p>`).join('')}
      ${r.grille?`<p class="small">Grille du coach : score observé ${r.grille.scoreObserve}${r.grille.projet?` · projet : « ${esc(r.grille.projet)} »`:''}</p>`:''}
      ${r.bilan?`<p class="small"><b>Bilan :</b> ${esc(r.bilan)}</p>`:''}</div>`:''}</section>`}).join('')}
  <section class="carte"><h3>QR de reprise</h3><p class="small muted">Si l’élève change de tablette ou si son groupe a oublié son code : ce QR lui rend son étoile, ses axes, ses matchs à thème validés et ses poules (d’après ce qu’il t’a envoyé). Dans son groupe : Mon groupe → « Scanner le QR de l’élève qui arrive ».</p>
    <button class="bt noir" type="button" data-act="reprise" data-k="${esc(k)}">Afficher le QR de reprise</button></section>
  ${autres.length?`<section class="carte"><h3>Même élève sous un autre nom ?</h3><p class="small muted">Si ${esc(nomAffiche(k))} apparaît aussi avec une faute de frappe, fusionne les deux.</p>
    <div class="rangee"><select id="fusion"><option value="">— Choisir —</option>${autres.map(a=>`<option value="${esc(a)}">${esc(nomAffiche(a))}</option>`).join('')}</select><button class="bt mini" type="button" data-act="fusionner">Fusionner dans ${esc(nomAffiche(k))}</button></div></section>`:''}`;
}
function vExport(){
  return `<h2>Exporter pour la note</h2><p class="muted small">Fichiers .csv à ouvrir dans Excel ou LibreOffice (séparateur point-virgule). Classe : ${esc(DB.classe||'—')}.</p>
  <div class="grille2">
    <section class="carte"><h3>Bilan par élève</h3><p class="small muted">Une ligne par élève : classement du cycle, absences, dispenses, matchs, V, D, % de victoires, manches et points gagnés-perdus, poule moyenne, meilleure et dernière poule, rang moyen, exercices, changements d’axe.</p><button class="bt orange" type="button" data-act="csv" data-v="bilan">Télécharger</button></section>
    <section class="carte"><h3>Tournoi séance par séance</h3><p class="small muted">Une ligne par élève et par séance : poule, rang, points, V, D, manches, points.</p><button class="bt noir" type="button" data-act="csv" data-v="tournoi">Télécharger</button></section>
    <section class="carte"><h3>Séances de travail</h3><p class="small muted">Une ligne par exercice : axes, exercice, niveau atteint, critère, matchs à thème validés, changements d’axe, bilan.</p><button class="bt noir" type="button" data-act="csv" data-v="seances">Télécharger</button></section>
  </div>`;
}

/* ---------- Arbitres dispensés, appel, classements de classe ---------- */
function arbitrages(){const A={};poulesClasse().forEach(P=>{if(!P.arbDisp)return;const k=cleEleve(P.classe,P.arbDisp);(A[k]=A[k]||{})[P.seance]={num:P.num,matchs:P.matchs.filter(m=>TTL.etatMatch(m,P.fmt).fini).length}});return A}
const STATUTS={present:'Présent',disp:'Dispensé',absent:'Absent',abj:'Absent justifié',oubli:'Oubli d’envoi',rien:'Rien reçu'};
function statut(k,s,R,A){
  const o=DB.appel[norm(DB.classe)+'|'+s+'|'+k];if(o)return {c:o,manuel:true};
  const r=DB.rec[k+'|'+s];
  if(r&&r.disp)return {c:'disp'};
  if(A[k]&&A[k][s])return {c:'disp'};
  if(r||(R[k]&&Object.keys(R[k]).some(x=>Math.floor(+x)===+s)))return {c:'present'};
  return {c:'rien'};
}
// Rang dans la classe à une séance : poule 1 d'abord, puis rang dans la poule (montante-descendante).
function rangsClasse(R){
  const parS={};
  Object.entries(R).forEach(([k,x])=>Object.entries(x).forEach(([s,c])=>(parS[s]=parS[s]||[]).push({k,num:c.num,rang:c.rang})));
  const out={},nb={};
  Object.entries(parS).forEach(([s,L])=>{L.sort((a,b)=>a.num-b.num||a.rang-b.rang);nb[s]=L.length;L.forEach((e,i)=>{(out[e.k]=out[e.k]||{})[s]=i+1})});
  return {rangs:out,nb};
}
// Classement du cycle : moyenne des rangs dans la classe (puis plus de séances jouées, puis % de victoires).
function classementCycle(R){
  const {rangs}=rangsClasse(R);
  const L=Object.entries(rangs).map(([k,x])=>{const v=Object.values(x);const t=bilanEleve(k,R);return {k,moy:v.reduce((a,b)=>a+b,0)/v.length,n:v.length,pct:t.pctV||0}});
  L.sort((a,b)=>a.moy-b.moy||b.n-a.n||b.pct-a.pct);
  const pos={};L.forEach((e,i)=>{pos[e.k]={place:i+1,moy:Math.round(e.moy*10)/10,n:e.n}});
  return pos;
}

async function qrReprise(k){
  const R=resultatsPoules(),recs=recsClasse().filter(r=>r.k===k).sort((a,b)=>a.seance-b.seance);
  const h={s:recs.filter(r=>r.axes.length||(r.etoile&&r.etoile.some(Boolean))).map(r=>[r.seance,[(r.axes[0]||{}).k||'',(r.axes[1]||{}).k||''],r.axes.filter(a=>a.val).map(a=>a.k),r.etoile&&r.etoile.some(Boolean)?r.etoile:0]),
    p:Object.entries(R[k]||{}).map(([s,x])=>[+s,x.num,x.rang,x.n,x.v,x.d,x.mv==='monte'?'monte en poule '+(x.num-1):x.mv==='descend'?'descend en poule '+(x.num+1):x.mv==='reste'?'reste en poule '+x.num:''])};
  const txt=await TTQR.encoder({a:'TTE',v:1,t:'T',c:DB.classe,e:nomAffiche(k),h});
  let svg;try{svg=TTQR.svgQR(txt)}catch(e){svg='<p class="avert">Historique trop long pour un QR.</p>'}
  const d=document.createElement('div');d.className='qr-plein';
  d.innerHTML=`<div><h2>${esc(nomAffiche(k))} · reprise</h2><p>Mon groupe → « Scanner le QR de l’élève qui arrive »</p><div class="qrbox">${svg}</div><button class="bt noir" type="button">Fermer</button></div>`;
  d.querySelector('button').onclick=()=>d.remove();document.body.appendChild(d);
}

/* ---------- Classes : import des listes Pronote ---------- */
function decouperNom(t){
  t=String(t||'').replace(/\s+/g,' ').trim();if(!t)return null;
  const w=t.split(' '),maj=x=>x===x.toUpperCase()&&/[A-ZÀ-Ý]/.test(x);
  const nom=w.filter(maj),pre=w.filter(x=>!maj(x));
  if(nom.length&&pre.length)return pre.join(' ')+' '+nom.join(' ');
  return t; // déjà « Prénom Nom » ou tout en majuscules
}
function lireLignes(rows,classeDefaut){
  rows=rows.map(r=>(r||[]).map(c=>c==null?'':String(c).trim()));
  const hi=rows.findIndex(r=>r.some(c=>/^(é|e)l(è|e)ve|^nom\b|^nom$|pr(é|e)nom/i.test(c)));
  const H=hi>=0?rows[hi].map(c=>norm(c)):[];
  const col=re=>H.findIndex(h=>re.test(h));
  const iNom=col(/^nom( de famille)?$/),iPre=col(/^prenom/),iEl=col(/^eleve|^nom prenom|^nom et prenom|^identite/),iCl=col(/^classe/);
  const out={};
  rows.slice(hi+1).forEach(r=>{
    let n='';
    if(iNom>=0&&iPre>=0&&r[iNom])n=r[iPre]+' '+r[iNom].toUpperCase();
    else if(iEl>=0)n=decouperNom(r[iEl]);
    else if(hi<0)n=decouperNom(r[0]);
    if(!n||/^(total|effectif)/i.test(n))return;
    const c=(iCl>=0&&r[iCl])||classeDefaut;if(!c)return;
    (out[c]=out[c]||new Set()).add(n.trim());
  });
  return out;
}
async function importerListe(files,texte,classeDefaut){
  let lots=[];
  for(const f of files||[]){
    const wb=XLSX.read(await f.arrayBuffer(),{type:'array'});
    wb.SheetNames.forEach(sn=>lots.push(XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,raw:false,defval:''})));
  }
  if(texte&&texte.trim())lots.push(texte.trim().split(/\r?\n/).map(l=>l.split(/\t|;/)));
  const tout={};lots.forEach(rows=>Object.entries(lireLignes(rows,classeDefaut)).forEach(([c,set])=>{(tout[c]=tout[c]||new Set());set.forEach(n=>tout[c].add(n))}));
  const C=Object.keys(tout);
  if(!C.length){alert(classeDefaut?'Aucun nom trouvé dans ce fichier.':'Pas de colonne « Classe » dans le fichier : écris le nom de la classe avant d’importer.');return}
  C.forEach(c=>{const old=DB.classesL[c]||{lien:''};DB.classesL[c]={eleves:[...tout[c]].sort((a,b)=>a.split(' ').slice(-1)[0].localeCompare(b.split(' ').slice(-1)[0],'fr')||a.localeCompare(b,'fr')),lien:old.lien||''}});
  journal('Listes importées : '+C.map(c=>c+' ('+tout[c].size+')').join(', '));
  DB.classe=C[0];sauver();rendre();
}
async function qrDemarrage(c){
  const L=DB.classesL[c],k=await clePublique(),txt=await TTQR.encoder({a:'TTE',v:1,t:'C',c,l:L.eleves,u:L.lien||'',k});
  let svg;try{svg=TTQR.svgQR(txt)}catch(e){svg='<p class="avert">Liste trop longue pour un seul QR.</p>'}
  const d=document.createElement('div');d.className='qr-plein';
  d.innerHTML=`<div><h2>Classe ${esc(c)} · tennis de table</h2><p>Dans l’appli élève : Groupe → « Scanner le QR de la classe »</p><div class="qrbox">${svg}</div><button class="bt noir" type="button">Fermer</button></div>`;
  d.querySelector('button').onclick=()=>d.remove();document.body.appendChild(d);
}
function vClasses(){
  const C=Object.keys(DB.classesL).sort();
  return `<h2>Classes</h2>
  <section class="carte"><h3>Importer une liste Pronote</h3>
    <p class="small muted">Pronote : liste des élèves de la classe → Exporter (xlsx, xls ou csv). Si le fichier a une colonne « Classe », plusieurs classes peuvent être importées d’un coup. Tu peux aussi coller la liste (un élève par ligne, « NOM Prénom »).</p>
    <div class="grille2"><div><label class="ch" for="cl-nom">Classe (si le fichier ne la donne pas)</label><input id="cl-nom" type="text" placeholder="1G3"></div>
    <div><label class="ch">Fichier</label><label class="bt noir" for="cl-fic">Choisir le fichier Pronote</label><input id="cl-fic" type="file" accept=".xlsx,.xls,.csv,.ods,.txt" hidden multiple></div></div>
    <label class="ch" for="cl-txt">Ou coller la liste</label><textarea id="cl-txt" rows="4" placeholder="DUPONT Marie&#10;MARTIN Léo"></textarea>
    <div class="rangee" style="margin-top:8px"><button class="bt mini" type="button" data-act="clcoller">Importer la liste collée</button></div></section>
  ${C.length?C.map(c=>{const L=DB.classesL[c];return `<section class="carte"><h3>${esc(c)} <span class="small muted">· ${L.eleves.length} élèves</span></h3>
    <label class="ch">Lien d’envoi en ligne de cette classe (Nuage, « Demande de fichier ») — jamais visible par les élèves</label>
    <input type="url" data-cl="${esc(c)}" class="cl-lien" value="${esc(L.lien)}" placeholder="https://nuage03.apps.education.fr/s/…">
    <div class="rangee" style="margin-top:10px"><button class="bt orange" type="button" data-act="qrdem" data-v="${esc(c)}">QR de démarrage</button>
      <details><summary class="small">Voir la liste</summary><ol class="small">${L.eleves.map(n=>`<li>${esc(n)}</li>`).join('')}</ol></details>
      <button class="bt mini danger" type="button" data-act="clsuppr" data-v="${esc(c)}">Retirer la classe</button></div>
    <p class="small muted">Le QR contient la liste et le lien : si tu les modifies, les groupes rescannent le nouveau QR (Groupe → Changer de classe).</p></section>`}).join(''):'<p class="muted">Aucune classe pour l’instant.</p>'}
  <section class="carte"><h3>Fin d’année</h3><p class="small muted">Télécharge une sauvegarde complète, puis vide l’outil pour la rentrée suivante.</p><button class="bt mini danger" type="button" data-act="archiver">Archiver l’année et repartir à zéro</button></section>`;
}
function vAppel(){
  const S=[...new Set(seancesClasse().map(Math.floor).concat([1,2,3,4,5,6,7,8,9]))].sort((a,b)=>a-b);
  if(!Number.isInteger(DB.seance))DB.seance=Math.floor(DB.seance);
  const R=resultatsPoules(),A=arbitrages(),L=eleves(),inList=new Set(liste().map(n=>cleEleve(DB.classe,n)));
  if(!L.length)return `<h2>Appel</h2><p class="muted">Importe d’abord la liste de la classe (onglet Classes).</p>`;
  const st=L.map(k=>[k,statut(k,DB.seance,R,A)]);
  const cpt={};st.forEach(([,x])=>cpt[x.c]=(cpt[x.c]||0)+1);
  return `<h2>Appel · séance ${DB.seance}</h2>
  <div class="strip">${S.map(s=>`<button type="button" data-act="seance" data-v="${s}" class="${s===DB.seance?'ici':''}">${labS(s)}</button>`).join('')}</div>
  <p>${Object.entries(cpt).map(([c,n])=>`<span class="badge st-${c}">${STATUTS[c]} : ${n}</span>`).join(' ')}</p>
  ${seancesClasse().includes(DB.seance)?'':'<p class="muted small">Rien n’a encore été reçu pour cette séance.</p>'}
  <div class="tablewrap"><table class="cl"><thead><tr><th>Élève</th><th>Statut</th><th>Corriger</th></tr></thead><tbody>
  ${st.map(([k,x])=>`<tr class="st-${x.c}"><td><button class="lien" type="button" data-act="fiche" data-k="${esc(k)}">${esc(nomAffiche(k))}</button>${inList.has(k)||!inList.size?'':' <span class="badge">hors liste</span>'+(window.PLUS&&PLUS.suggestion?PLUS.suggestion(k):'')}</td><td>${STATUTS[x.c]}${x.manuel?' <span class="small muted">(corrigé)</span>':''}</td>
    <td><select data-appel="${esc(k)}"><option value="">auto</option>${['present','disp','absent','abj','oubli'].map(c=>`<option value="${c}"${x.manuel&&x.c===c?' selected':''}>${STATUTS[c]}</option>`).join('')}</select></td></tr>`).join('')}
  </tbody></table></div>
  ${groupesAppel(DB.seance)}
  <p class="small muted">Auto : séance ou poule reçue = présent ; case « dispensé » cochée par l’élève (ou arbitre dispensé de poule) = dispensé ; rien = rien reçu. « Hors liste » : nom absent de la liste Pronote, à fusionner depuis sa fiche.</p>`;
}

/* ---------- Groupes : qui n'a pas envoyé ? ---------- */
const cleGroupe=L=>L.map(cleEleveC).sort().join('#');
function cleEleveC(n){return cleEleve(DB.classe,n)}
function groupesAppel(n){
  const recs=recsClasse(),recu=new Set(recs.filter(r=>Math.floor(r.seance)===n).map(r=>r.k));
  poulesClasse().filter(p=>Math.floor(p.seance)===n).forEach(p=>p.joueurs.concat(p.arbDisp?[p.arbDisp]:[]).forEach(j=>recu.add(cleEleveC(j))));
  // groupes qui ont envoyé cette séance
  const env={};recs.filter(r=>r.seance===n&&r.groupe).forEach(r=>{const g=cleGroupe(r.groupe);(env[g]=env[g]||{noms:r.groupe,src:new Set,ts:0}).src.add(r.src==='qr'?'QR':'en ligne');env[g].ts=Math.max(env[g].ts,r.ts||0)});
  // dernier groupe connu de chaque élève avant cette séance
  const dernier={};recs.filter(r=>r.seance<n&&r.groupe).sort((a,b)=>a.seance-b.seance).forEach(r=>dernier[r.k]={noms:r.groupe,s:r.seance});
  const manq={};Object.entries(dernier).forEach(([k,g])=>{if(recu.has(k))return;const c=cleGroupe(g.noms);(manq[c]=manq[c]||{noms:g.noms,s:g.s,qui:[]}).qui.push(k)});
  const E=Object.values(env),M=Object.values(manq);
  if(!E.length&&!M.length)return '';
  const heure=t=>t?new Date(t*1000).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
  return `<section class="carte"><h3>Groupes · séance ${n}</h3>
    ${M.length?`<p style="color:var(--alerte)"><b>⚠ Rien reçu de :</b></p><ul>${M.map(g=>`<li><b>${g.qui.map(k=>esc(nomAffiche(k))).join(' · ')}</b> <span class="small muted">(groupe de la séance ${g.s} : ${g.noms.map(esc).join(', ')})</span></li>`).join('')}</ul><p class="small muted">Absents ou envoi oublié ? Le carnet reste sur leur tablette : il suffit de rouvrir la séance ${n} et d’envoyer.</p>`:''}
    ${E.length?`<p><b>✓ Ont envoyé :</b></p><ul class="small">${E.map(g=>`<li>${g.noms.map(esc).join(' · ')} — ${[...g.src].join(' + ')} ${heure(g.ts)}</li>`).join('')}</ul>`:''}</section>`;
}

/* ---------- Copies de secours des carnets (chiffrées pour le prof) ---------- */
const b64u=u=>{let x='';new Uint8Array(u).forEach(c=>x+=String.fromCharCode(c));return btoa(x).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const deb64=t=>Uint8Array.from(atob(t.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function clePublique(){
  if(!crypto.subtle)return '';
  if(!DB.cle){const p=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveKey']);
    DB.cle={pub:b64u(await crypto.subtle.exportKey('raw',p.publicKey)),priv:await crypto.subtle.exportKey('jwk',p.privateKey)};sauver()}
  return DB.cle.pub;
}
async function ouvrirSecours(o){
  if(!DB.cle)throw new Error('Copie de secours : clé du professeur absente (restaure ta sauvegarde).');
  const priv=await crypto.subtle.importKey('jwk',DB.cle.priv,{name:'ECDH',namedCurve:'P-256'},false,['deriveKey']);
  const pub=await crypto.subtle.importKey('raw',deb64(o.epk),{name:'ECDH',namedCurve:'P-256'},false,[]);
  const cle=await crypto.subtle.deriveKey({name:'ECDH',public:pub},priv,{name:'AES-GCM',length:256},false,['decrypt']);
  try{return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:deb64(o.iv)},cle,deb64(o.data)))}
  catch(e){throw new Error('Copie de secours chiffrée avec une autre clé (autre appareil prof ?).')}
}
async function importerSecours(o){
  const txt=await ouvrirSecours(o),c=JSON.parse(txt);if(!c.carnetTT)throw new Error('Copie de secours illisible');
  DB.secours=DB.secours||{};const id=norm(o.classe)+'|'+(o.noms||[]).map(norm).sort().join('#'),old=DB.secours[id];
  if(old&&(old.seance>o.seance||(old.seance===o.seance&&old.date>o.date)))return;
  DB.secours[id]={classe:o.classe,noms:o.noms,seance:o.seance,date:o.date,epk:o.epk,iv:o.iv,data:o.data};
}
function vSecours(){
  const L=Object.entries(DB.secours||{}).filter(([,x])=>!DB.classe||norm(x.classe)===norm(DB.classe)).sort((a,b)=>a[1].noms.join().localeCompare(b[1].noms.join(),'fr'));
  return `<section class="carte"><h3>Copies de secours des carnets</h3>
    <p class="small muted">À chaque envoi en ligne, le carnet complet du groupe arrive aussi, chiffré : seul cet outil (ta clé) peut l’ouvrir. Si une tablette est perdue ou réinitialisée, télécharge le carnet ici puis, sur la nouvelle tablette : Mon groupe → « Reprendre un carnet ». Les élèves choisiront un nouveau code.</p>
    ${L.length?`<ul>${L.map(([id,x])=>`<li><b>${x.noms.map(esc).join(' · ')}</b> <span class="small muted">${esc(x.classe)} · séance ${x.seance} · ${esc(x.date)}</span> <button class="bt mini" type="button" data-act="secours" data-v="${esc(id)}">Télécharger le carnet</button></li>`).join('')}</ul>`:'<p class="muted small">Aucune copie reçue pour l’instant (elles arrivent avec l’envoi en ligne, après le QR de démarrage).</p>'}
    ${DB.cle?'':'<p class="small avert">La clé est créée au premier « QR de démarrage » : garde une sauvegarde de l’outil, sans elle les copies ne s’ouvrent plus.</p>'}</section>`;
}
async function telechargerSecours(id){
  const x=DB.secours&&DB.secours[id];if(!x)return;
  try{const txt=await ouvrirSecours(x);telecharger('carnet_'+x.classe+'_'+x.noms.map(n=>n.split(/\s+/)[0]).join('-')+'.json',txt,'application/json')}
  catch(e){alert(e.message||e)}
}

/* ---------- Export CSV ---------- */
function csv(lignes){return '﻿'+lignes.map(l=>l.map(v=>{v=v==null?'':String(v);return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}).join(';')).join('\r\n')}
const dec=x=>x==null?'':String(x).replace('.',',');
function telecharger(nom,texte,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([texte],{type:type||'text/csv;charset=utf-8'}));a.download=nom;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
function exporter(type){
  const R=resultatsPoules(),L=eleves(),cl=DB.classe||'classe',slug=s=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'');
  let rows;
  if(type==='bilan'){
    const CC=classementCycle(R),A=arbitrages(),Ss=seancesClasse();
    rows=[['Classe','Élève','Classement du cycle','Rang classe moyen','Absences','Dispenses','Séances jouées','Matchs','Victoires','Défaites','% victoires','Manches gagnées','Manches perdues','Points gagnés','Points perdus','Poule moyenne','Meilleure poule','Dernière poule','Rang moyen','Séances de travail','Exercices','Niveaux vert ou vert foncé','Changements d’axe non validés','Matchs à thème validés']];
    L.forEach(k=>{const t=bilanEleve(k,R),cc=CC[k],st=Ss.map(s=>statut(k,s,R,A).c);rows.push([DB.classe,nomAffiche(k),cc?cc.place:'',cc?dec(cc.moy):'',st.filter(v=>v==='absent'||v==='abj').length,st.filter(v=>v==='disp').length,t.seances,t.matchs,t.v,t.d,t.pctV,t.complet?t.mg:'',t.complet?t.mp:'',t.complet?t.pg:'',t.complet?t.pp:'',dec(t.pouleMoy),t.meilleure,t.derniere,dec(t.rangMoy),t.travail,t.exos,t.verts,t.chg,t.mtValides.map(a=>COURT[a]).join(', ')])});
  }else if(type==='tournoi'){
    const RC=rangsClasse(R);
    rows=[['Classe','Élève','Séance','Rang dans la classe','Poule','Rang','Joueurs','Points','Victoires','Défaites','Manches gagnées','Manches perdues','Points gagnés','Points perdus','Ensuite','Arbitrages']];
    L.forEach(k=>Object.entries(R[k]||{}).sort((a,b)=>a[0]-b[0]).forEach(([s,x])=>rows.push([DB.classe,nomAffiche(k),s,(RC.rangs[k]||{})[s]||'',x.num,x.rang,x.n,x.pts,x.v,x.d,x.mg,x.mp,x.pg,x.pp,x.mv,x.arb||''])));
  }else{
    rows=[['Classe','Élève','Séance','Date','Dispensé','Axe 1','Axe 2','Exercice','Titre','Niveau','Critère atteint','Remarque','Matchs à thème validés ce jour','Changements d’axe','Bilan']];
    recsClasse().sort((a,b)=>nomAffiche(a.k).localeCompare(nomAffiche(b.k),'fr')||a.seance-b.seance).forEach(r=>{
      const base=[DB.classe,nomAffiche(r.k),r.seance,r.date||'',r.disp?'oui':'',COURT[(r.axes[0]||{}).k]||'',COURT[(r.axes[1]||{}).k]||''];
      const fin=[r.axes.filter(a=>a.val).map(a=>COURT[a.k]).join(', '),r.chg.map(c=>(COURT[c.de]||c.de)+' → '+(COURT[c.vers]||c.vers||'')+' ('+c.motif+')').join(' ; '),r.bilan];
      if(!r.ex.length)rows.push(base.concat(['','','','','']).concat(fin));
      r.ex.forEach(e=>{const i=exInfo(e.n);rows.push(base.concat([e.n,i?i.e.t:'',e.niv?GA.deg[e.niv-1]:'',e.niv?critere(e.n,e.niv):'',e.rq]).concat(fin))});
    });
  }
  telecharger('TT_'+slug(cl)+'_'+type+'.csv',csv(rows));
}

/* ---------- Évènements ---------- */
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act,v=b.dataset.v;
  switch(a){
    case 'vue':DB.vue=v;break;
    case 'secours':telechargerSecours(v);return;
    case 'seance':DB.seance=+v;break;
    case 'fiche':DB.eleve=b.dataset.k;DB.vue='fiche';window.scrollTo(0,0);break;
    case 'scanner':{let n0=0;TTQR.scanner(async t=>{const q=await TTQR.decoder(t);const r=importerQR(q);n0++;sauver();return '✓ '+r},{continu:true,titre:'QR codes des élèves',aide:'Montre les QR un par un devant la caméra.',onClose:n=>{if(n)journal(n+' QR code'+(n>1?'s':'')+' scanné'+(n>1?'s':''));choisirClasseParDefaut();sauver();rendre();if(n)proposerSauvegarde()}});return}
    case 'sauvegarde':DB.saveAt=Date.now();sauver();telecharger('TT_prof_sauvegarde_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(Object.assign({ttProf:1},DB)),'application/json');return;
    case 'effacer':if(!confirm('Effacer toutes les données de l’outil sur cet appareil ? (Exporte d’abord une sauvegarde.)'))return;DB=vide();break;
    case 'csv':exporter(v);return;
    case 'tri':DB.tri=v;break;
    case 'version':{const id=b.dataset.id,x=DB.poulesAlt[id][+v];DB.poules[id]=Object.assign({},x,{choisi:true});break}
    case 'imprimer':window.print();return;
    case 'qrdem':qrDemarrage(v);return;
    case 'reprise':qrReprise(b.dataset.k);return;
    case 'clcoller':importerListe([],$('#cl-txt').value,$('#cl-nom').value.trim());return;
    case 'clsuppr':if(!confirm('Retirer la liste de la classe '+v+' ? (Les séances reçues sont gardées.)'))return;delete DB.classesL[v];choisirClasseParDefaut();break;
    case 'archiver':{if(!confirm('Télécharger la sauvegarde de l’année puis tout effacer ?'))return;
      telecharger('TT_prof_archive_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(Object.assign({ttProf:1},DB)),'application/json');
      setTimeout(()=>{if(confirm('La sauvegarde est-elle bien enregistrée ? Effacer maintenant ?')){DB=vide();DB.vue='classes';sauver();rendre()}},800);return}
    case 'fusionner':{const src=$('#fusion').value,dst=DB.eleve;if(!src)return;
      if(!confirm('Fusionner « '+nomAffiche(src)+' » dans « '+nomAffiche(dst)+' » ?'))return;
      DB.alias[src]=dst;Object.keys(DB.rec).forEach(id=>{const r=DB.rec[id];if(r.k===src){delete DB.rec[id];const nid=dst+'|'+r.seance;if(!DB.rec[nid]||(DB.rec[nid].ts||0)<(r.ts||0))DB.rec[nid]=Object.assign(r,{k:dst})}});break}
    default:if(window.PLUS&&PLUS.clic&&PLUS.clic(a,b,e)===false)return;if(!(window.PLUS&&PLUS.actions&&PLUS.actions.includes(a)))return;
  }
  sauver();rendre();
});
document.addEventListener('change',async e=>{
  const t=e.target;
  if(t.id==='selClasse'){DB.classe=t.value==='(sans classe)'?'':t.value;DB.eleve=null;if(DB.vue==='fiche')DB.vue='eleves';sauver();rendre()}
  if(t.id==='fic'&&t.files.length){await importerFichiers([...t.files]);t.value=''}
  if(t.id==='cl-fic'&&t.files.length){try{await importerListe([...t.files],'',$('#cl-nom').value.trim())}catch(x){alert('Fichier illisible : '+(x.message||x))}t.value=''}
  if(t.classList&&t.classList.contains('cl-lien')){const c=t.dataset.cl,u=t.value.trim();if(u&&!/^https:\/\//.test(u)){alert('Le lien doit commencer par https://');return}DB.classesL[c].lien=u;sauver()}
  if(window.PLUS&&PLUS.change&&PLUS.change(t))return;
  if(t.dataset&&t.dataset.appel!=null){const id=norm(DB.classe)+'|'+DB.seance+'|'+t.dataset.appel;if(t.value)DB.appel[id]=t.value;else delete DB.appel[id];sauver();rendre()}
  if(t.id==='resto'&&t.files[0]){try{const o=JSON.parse(await t.files[0].text());if(!o.ttProf)throw 0;if(!confirm('Remplacer les données de cet appareil par cette sauvegarde ?'))return;delete o.ttProf;DB=Object.assign(vide(),o);sauver();rendre()}catch(x){alert('Ce fichier n’est pas une sauvegarde de l’outil prof.')}}
});
['dragover','drop'].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();if(ev==='drop'&&e.dataTransfer.files.length){const F=[...e.dataTransfer.files];if(DB.vue==='classes')importerListe(F,'',($('#cl-nom')||{}).value||'');else{DB.vue='import';importerFichiers(F)}}}));
choisirClasseParDefaut();rendre();
