/* =====================================================================
   tests/circuit.js — test automatique des 3 applis tennis de table
   À lancer avant chaque mise en ligne. Classe fictive, aucune vraie donnée.

   Préparer (une fois) : npm i playwright   (ou playwright déjà installé)
   Servir le dossier qui contient les 3 dépôts côte à côte :
       python3 -m http.server 8810
   Lancer :
       node tennis-de-table-prof/tests/circuit.js
   Options : BASE=http://localhost:8810  CYCLE=tennis-de-table (ou cycle-tennis-de-table)
   Sortie : une ligne OK / ÉCHEC par vérification, code de sortie 1 si un échec.
   ===================================================================== */
'use strict';
const { chromium } = require('playwright');
const BASE=(process.env.BASE||'http://localhost:8810').replace(/\/$/,'');
const CYCLE=process.env.CYCLE||'tennis-de-table';
const PROF=BASE+'/tennis-de-table-prof/',ELEVE=BASE+'/tennis-de-table-eleves/',OUTILS=BASE+'/'+CYCLE+'/outils.html',ECRAN=BASE+'/'+CYCLE+'/';
let echecs=0;
const ok=(nom,cond,detail)=>{console.log((cond?'OK     ':'ÉCHEC  ')+nom+(detail!=null?'  ('+detail+')':''));if(!cond)echecs++};

(async()=>{
  const b=await chromium.launch();const erreurs=[];
  const page=async(ctx,u)=>{const p=await ctx.newPage();p.on('pageerror',e=>erreurs.push(u+' : '+e.message));p.on('dialog',d=>{p._alertes=(p._alertes||[]).concat(d.message());d.accept()});await p.goto(u);await p.waitForTimeout(800);return p};
  const ipad=await b.newContext({viewport:{width:1180,height:820},hasTouch:true});

  /* ---------- 1. Outil prof : import des listes ---------- */
  const P=await page(ipad,PROF);await P.evaluate(()=>localStorage.clear());await P.reload();await P.waitForTimeout(600);
  const imp=async(nom,octets)=>P.evaluate(async([n,b])=>{const f=new File([Uint8Array.from(atob(b),c=>c.charCodeAt(0))],n,{type:'text/csv'});await importerListe([f],'','');return DB.classesL},[nom,Buffer.from(octets).toString('base64')]);
  let C=await imp('utf8.csv',Buffer.from('Nom;Prénom;Classe\nÉLOI;Zoé;1T1\nMARTIN;Léa;1T1\nBERNARD;Hugo;1T1\nPETIT;Inès;1T1\nDUBOIS;Tom;1T1\nMOREAU;Sarah;1T1\n','utf8'));
  ok('CSV UTF-8 point-virgule',C['1T1']&&C['1T1'].eleves.length===6,C['1T1']&&C['1T1'].eleves.join(', '));
  C=await imp('win.csv',Buffer.from('Nom,Prénom,Classe\nÉLOI,Zoé,1T2\n','latin1'));
  ok('CSV Windows virgule',C['1T2']&&C['1T2'].eleves[0]==='Zoé ÉLOI',C['1T2']&&C['1T2'].eleves[0]);
  ok('Tri par nom',C['1T1'].eleves[0]==='Hugo BERNARD',C['1T1'].eleves[0]);
  ok('Particules',await P.evaluate(()=>decouperNom('de VILLIERS Paul')==='Paul de VILLIERS'&&decouperNom('van der BERG Anna')==='Anna van der BERG'));

  /* ---------- 2. Deux tablettes, deux scores pour la même poule ---------- */
  const alt=await P.evaluate(()=>{const J=['Léa MARTIN','Hugo BERNARD','Inès PETIT'];const mk=s=>({num:1,fmt:'2',joueurs:J,matchs:[{a:0,b:1,arb:2,m:s},{a:0,b:2,arb:1,m:[[11,5],[11,6]]},{a:1,b:2,arb:0,m:[[11,4],[11,3]]}]});
    ajouterPoule('1T1',2,mk([[11,3],[11,4]]),100);ajouterPoule('1T1',2,mk([[3,11],[4,11]]),200);return Object.values(DB.poulesAlt||{})[0]});
  ok('Conflit de scores signalé',alt&&alt.length===2);

  /* ---------- 3. Tournoi joué sans tablettes (page outils du cycle) ---------- */
  const O=await page(ipad,OUTILS);
  ok('Le cycle propose les classes de l’outil prof',await O.evaluate(()=>Object.keys(rosterAll()).includes('1T1')));
  await O.evaluate(()=>{tView('md')});await O.waitForTimeout(300);
  await O.evaluate(()=>{document.getElementById('tg-n').value='Léa\nHugo\nInès\nTom\nSarah\nZoé';document.getElementById('tg-k').value='1T1';document.getElementById('tg-s').value='Séance 3';document.getElementById('tg-c').value=2;tStart();
    const t=tCurT(),r=tCurR(t);r.tables.forEach((tb,ti)=>mdPairs(tb.length).forEach((p,pi)=>{r.sc[mdKey(ti,p)]=[7,3+pi]}));tsSave(t)});
  await P.reload();await P.waitForTimeout(600);
  await P.evaluate(()=>[...document.querySelectorAll('nav button')].find(b=>b.textContent.includes('Importer')).click());await P.waitForTimeout(300);
  ok('Tournoi du cycle listé dans l’outil prof',await P.$('[data-act=cyimp]')!=null);
  await P.click('[data-act=cyimp]');await P.waitForTimeout(300);
  const pc=await P.evaluate(()=>Object.values(DB.poules).filter(p=>p.seance===3).map(p=>p.joueurs.join('/')));
  ok('Tournoi importé en poules, prénoms complétés',pc.length===2&&pc[0].includes('Léa MARTIN'),pc.join(' | '));

  /* ---------- 4. Note : saisie rapide ---------- */
  await P.evaluate(()=>{DB.classe='1T1';sauver();[...document.querySelectorAll('nav button')].find(b=>b.textContent.includes('Note')).click()});await P.waitForTimeout(300);
  await P.click('[data-act=saisierapide]');await P.waitForTimeout(150);
  for(let i=0;i<4;i++)await P.locator('.sr-c').nth(i).locator('[data-sr=deg][data-d="2"]').click();
  await P.click('[data-sr=fermer]');await P.waitForTimeout(150);
  const n1=await P.evaluate(()=>{const k=eleves()[0],e=cfgNote().el[k]||{};return [e.tech,e.tact,e.afl2,e.afl3]});
  ok('Saisie rapide : 4 touches = 4 critères notés',n1.every(v=>v!=null),n1.join(' / '));

  /* ---------- 5. Exports ---------- */
  for(const v of ['bilan','tournoi','seances']){
    await P.evaluate(()=>[...document.querySelectorAll('nav button')].find(b=>b.textContent.includes('Exporter')).click());await P.waitForTimeout(200);
    const dl=await Promise.all([P.waitForEvent('download',{timeout:5000}).catch(()=>null),P.click(`[data-act=csv][data-v=${v}]`).catch(()=>null)]);
    ok('Export CSV '+v,!!dl[0]);
  }

  /* ---------- 6. Appli élève : code et anti-essais ---------- */
  const tab=await b.newContext({viewport:{width:1280,height:800},hasTouch:true});
  const E=await page(tab,ELEVE);await E.evaluate(()=>localStorage.clear());await E.reload();await E.waitForTimeout(600);
  const r=await E.evaluate(async()=>{ROOT.classes['1T1']={classe:'1T1',eleves:['Léa MARTIN','Hugo BERNARD'],lien:'',k:''};await nouveauGroupe('1T1','2468');const id=ACTIF;await verrouiller();
    const msg=[];for(let i=0;i<6;i++){try{await ouvrir(id,'0000')}catch(e){msg.push(e.message)}}
    let bloque='';try{await ouvrir(id,'2468')}catch(e){bloque=e.message}
    ROOT.groupes[id].essais.t=0;let ouvert=false;try{await ouvrir(id,'2468');ouvert=!!S}catch(e){}
    return {msg,bloque,ouvert,reste:!!ROOT.groupes[id].essais}});
  ok('Code faux compté',/4 essais/.test(r.msg[0]),r.msg[0]);
  ok('Attente après 5 erreurs',/attendez/.test(r.msg[4])&&/Trop d’essais/.test(r.bloque),r.msg[4]);
  ok('Bon code accepté après l’attente, compteur remis à zéro',r.ouvert&&!r.reste);

  /* ---------- 7. Hors ligne ---------- */
  for(const [nom,ctx,u] of [['outil prof',ipad,PROF],['appli élève',tab,ELEVE],['cycle',ipad,ECRAN]]){
    const p=await page(ctx,u);await p.evaluate(async()=>{if(navigator.serviceWorker)await navigator.serviceWorker.ready});await p.reload();await p.waitForTimeout(1500);
    await ctx.setOffline(true);let bon=false;try{await p.reload();await p.waitForTimeout(800);bon=(await p.evaluate(()=>document.body.innerText.length))>200}catch(e){}
    await ctx.setOffline(false);ok('Hors ligne : '+nom,bon);await p.close();
  }

  /* ---------- 8. Affichage : rien ne déborde, cibles tactiles ---------- */
  for(const [nom,vw] of [['téléphone',{width:390,height:844}],['iPad paysage',{width:1180,height:820}],['Galaxy Tab',{width:1280,height:800}]]){
    const ctx=await b.newContext({viewport:vw,hasTouch:true});
    for(const u of [PROF,ELEVE,ECRAN]){const p=await page(ctx,u);const d=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);ok('Pas de débordement ('+nom+') '+u.replace(BASE,''),d<=1,d+' px');await p.close()}
    await ctx.close();
  }
  const Pd=await page(ipad,PROF);await Pd.click('[data-act=demo]').catch(()=>{});await Pd.waitForTimeout(500);
  let petit=0;for(const t of ['Appel','Tournoi','Élèves','Note']){await Pd.evaluate(t=>[...document.querySelectorAll('nav button')].find(b=>b.textContent.includes(t)).click(),t);await Pd.waitForTimeout(200);
    petit+=await Pd.evaluate(()=>[...document.querySelectorAll('main button, main select')].filter(e=>{const R=e.getBoundingClientRect();return R.width&&R.height<43.5}).length)}
  ok('Cibles tactiles ≥ 44 px (outil prof)',petit===0,petit+' trop petites');

  ok('Aucune erreur JavaScript',!erreurs.length,erreurs.slice(0,3).join(' · '));
  await b.close();
  console.log(echecs?`\n${echecs} échec(s).`:'\nTout est bon.');process.exit(echecs?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
