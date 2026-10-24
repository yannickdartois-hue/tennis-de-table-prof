/* =====================================================================
   prof-plus.js — onglets Note et Pilotage, alertes, progression
   Barèmes : documents « Tennis de table — Évaluation de Première » et
   « … de Terminale (hors CCF) » (lycée Pompidou, octobre 2026).
   ===================================================================== */
'use strict';
const r05=x=>Math.round(x*20)/20;               // arrondi au 0,05
const r2=x=>Math.round(x*100)/100;
const fr=x=>x==null||x===''||isNaN(x)?'–':String(r2(x)).replace('.',',');
const estEntier=x=>Number.isInteger(+x);

/* ---------- Réglages de la note, par classe ---------- */
function niveauDefaut(c){return /^\s*t/i.test(c||'')?'T':'1'}
function cfgNote(){
  DB.notes=DB.notes||{};const id=norm(DB.classe);
  return DB.notes[id]||(DB.notes[id]={niveau:niveauDefaut(DB.classe),tours:null,M:5,m:0.6,P:'',el:{}});
}
// Tours notés par défaut : la dernière séance jouée en plusieurs tours, sans son 1er tour (calage).
function toursParDefaut(){
  const K=[...new Set(poulesClasse().map(p=>p.seance))].sort((a,b)=>a-b);
  const parS={};K.forEach(k=>(parS[Math.floor(k)]=parS[Math.floor(k)]||[]).push(k));
  const multi=Object.keys(parS).map(Number).filter(s=>parS[s].length>1).sort((a,b)=>a-b);
  if(multi.length){const s=multi[multi.length-1];return parS[s].filter(k=>!estEntier(k))}
  return [];
}
const toursNotes=C=>C.tours||toursParDefaut();
// Fourchettes de points (mêmes bornes que les documents)
const FOURCH={
  2:[[0,.5],[.75,1],[1.25,1.5],[1.75,2]],
  4:[[0,1],[1.25,2],[2.25,3],[3.25,4]],
  5:[[0,1],[1.25,2.5],[2.75,4],[4.25,5]],
  6:[[0,1.5],[1.75,3],[3.25,4.5],[4.75,6]]};
function selDegres(champ,k,max,val){
  const F=FOURCH[max];let o='<option value="">—</option>';
  F.forEach(([a,b],d)=>{o+=`<optgroup label="Degré ${d+1}">`;for(let x=a;x<=b+1e-9;x+=.25)o+=`<option value="${r2(x)}"${val!=null&&Math.abs(val-x)<1e-6?' selected':''}>${fr(x)}</option>`;o+='</optgroup>'});
  return `<select class="nsel" data-note="${champ}" data-k="${esc(k)}" aria-label="${champ}">${o}</select>`;
}
const REPS={'6/2':[6,2],'4/4':[4,4],'2/6':[2,6]};

/* ---------- Part « table et rang » (Première) ---------- */
function tableRang(k,R,C){
  const T=toursNotes(C),x=R[k]||{};
  const P=+C.P||Math.max(1,...poulesClasse().filter(p=>T.includes(p.seance)).map(p=>p.num));
  const M=+C.M||5,m=+C.m||0.6,S=(M-m)/P;
  const det=T.map(t=>{const c=x[t];if(!c)return {t,abs:true};
    const dec=c.n>1?r05(S*(c.rang-1)/(c.n-1)):0;
    return {t,table:c.num,rang:c.rang,n:c.n,pts:r2(M-S*(c.num-1)-dec)}});
  const ok=det.filter(d=>!d.abs);
  return {det,P,S:r2(S),note:ok.length?r2(ok.reduce((a,d)=>a+d.pts,0)/ok.length):null};
}
/* ---------- Part « victoires dans la poule » (Terminale) ---------- */
function victoires(k,R,C){
  const T=toursNotes(C),x=R[k]||{};
  const det=T.map(t=>{const c=x[t];return c?{t,v:c.v,pts:Math.min(4,1+c.v)}:{t,abs:true}});
  const ok=det.filter(d=>!d.abs);
  return {det,note:ok.length?r2(ok.reduce((a,d)=>a+d.pts,0)/ok.length):null};
}

/* ---------- Indicateurs tirés des séances (aides, jamais une note automatique) ---------- */
function indicateurs(k,R){
  const recs=recsClasse().filter(r=>r.k===k).sort((a,b)=>a.seance-b.seance);
  const Ss=[...new Set(seancesClasse().map(Math.floor))];
  const A=arbitrages();
  const recues=Ss.filter(s=>recsClasse().some(r=>r.k===k&&r.seance===s)||Object.keys(R[k]||{}).some(x=>Math.floor(+x)===s)).length;
  const ex=recs.flatMap(r=>r.ex.filter(e=>e.niv)), hauts=ex.filter(e=>e.niv>=3).length, hautsV=ex.filter(e=>e.niv>=3&&e.obs).length;
  // validations faites pour les autres (rôle d'observateur, AFL3)
  const moi=norm(nomAffiche(k)),valid=recsClasse().reduce((a,r)=>a+r.ex.filter(e=>e.obs&&norm(e.obs)===moi).length,0);
  // projets de jeu annoncés en match (choix tactiques)
  const pjs=Object.values(R[k]||{}).flatMap(c=>c.matchs.filter(m=>m.pj!=null&&m.fini)),pjOk=pjs.filter(m=>m.pjok===true).length,pjDiff=new Set(pjs.map(m=>m.pj)).size;
  const mt=new Set(recs.flatMap(r=>r.axes.filter(a=>a.val).map(a=>a.k)));
  const chg=recs.reduce((a,r)=>a+r.chg.length,0);
  const arb=Object.values(R[k]||{}).reduce((a,c)=>a+(c.arb||0),0)+Object.values(A[k]||{}).reduce((a,c)=>a+c.matchs,0);
  const roles=recs.flatMap(r=>r.ex.filter(e=>/^R/.test(e.n)&&e.niv>=3));
  // étoile : moyenne des axes AFL1 (début → fin)
  const et=recs.filter(r=>r.etoile&&r.etoile.some(Boolean));
  const moyAFL1=e=>{const v=e.slice(0,3).filter(Boolean);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
  // codes du coach notés au tableau de marque : comme joueur (0-3, x) et comme arbitre-coach (AFL3)
  const codes=[0,0,0,0,0];let coach=0;
  poulesClasse().forEach(P=>P.matchs.forEach(m=>{if(!m.co)return;
    ['a','b'].forEach(s=>{if(cleEleve(P.classe,P.joueurs[m[s]])===k&&m.co[s])m.co[s].forEach((v,i)=>codes[i]+=v)});
    const ar=P.arbDisp||(m.arb!=null?P.joueurs[m.arb]:'');if(ar&&cleEleve(P.classe,ar)===k)coach++}));
  return {seances:Ss.length,recues,ex:ex.length,hauts,hautsV,valid,pj:pjs.length,pjOk,pjDiff,mt:mt.size,chg,arb,roles:roles.length,codes,coach,
    etDeb:et.length?moyAFL1(et[0].etoile):null,etFin:et.length>1?moyAFL1(et[et.length-1].etoile):null};
}
function suggestionAFL2(I){
  const t=I.seances?I.recues/I.seances:0;
  if(t<.5)return 1;
  if(t<.75||I.chg>=2)return 2;
  if(t>=.9&&I.mt>=2&&I.chg===0)return 4;
  return I.mt>=1?3:2;
}
function suggestionAFL3(I){const r=I.roles+(I.valid>=3?1:0)+(I.coach>=3?1:0);if(!I.arb&&!r)return 1;if(!r)return 2;return r>=2&&I.arb>=4?4:3}
// Choix tactiques : projets annoncés avant les matchs et réalisés
function suggestionTactique(I){if(!I.pj)return 1;const t=I.pjOk/I.pj;if(t<.5)return 2;return t>=2/3&&I.pjDiff>=3?4:(I.pjDiff>=2?3:2)}
// Alerte : auto-évaluation haute alors que les résultats en match sont faibles
function alertes(k,R,I){
  const L=[],CC=classementCycle(R)[k],n=Object.keys(classementCycle(R)).length;
  const basTiers=CC&&n>=6&&CC.place>n*2/3;
  if(basTiers&&I.ex>=3&&I.hauts/I.ex>=.7)L.push('Niveaux d’exercices très hauts (vert) mais classement dans le dernier tiers : à vérifier en observant.');
  if(basTiers&&I.etFin!=null?I.etFin>=3:basTiers&&I.etDeb!=null&&I.etDeb>=3)L.push('Étoile AFL1 « bien maîtrisé » ou plus, mais classement dans le dernier tiers.');
  if(I.chg>=2)L.push(I.chg+' changements d’axe sans match à thème validé.');
  if(I.hauts>=3&&I.hautsV/I.hauts<.3)L.push('Niveaux verts rarement vérifiés par un observateur ('+I.hautsV+' sur '+I.hauts+').');
  return L;
}

/* ---------- Onglet Note ---------- */
function noteEleve(k,R,C){
  const e=C.el[k]||{},rep=REPS[e.rep||'4/4'],T=C.niveau==='T';
  const res=T?victoires(k,R,C):tableRang(k,R,C);
  const parts=T?[e.tech,e.serv,res.note,e.afl2,e.afl3]:[e.tech,e.tact,res.note,e.afl2,e.afl3];
  const tot=parts.every(v=>v!=null&&v!=='')?r2(parts.reduce((a,v)=>a+(+v),0)):null;
  return {e,rep,res,tot};
}
function vNote(){
  const L=eleves();if(!L.length)return `<h2>Note</h2><p class="muted">Aucune donnée pour cette classe.</p>`;
  const C=cfgNote(),R=resultatsPoules(),T=C.niveau==='T',TN=toursNotes(C);
  const K=[...new Set(poulesClasse().map(p=>p.seance))].sort((a,b)=>a-b);
  const tr=tableRang('',R,C);
  return `<h2>Note · ${esc(DB.classe)}</h2>
  <div class="rangee noprint"><button class="bt orange" type="button" data-act="saisierapide">Saisie rapide, élève par élève</button><span class="small muted">4 gros boutons par critère, − / + pour ajuster, Suivant.</span></div>
  <section class="carte"><h3>Réglages</h3>
    <div class="grille2">
      <label>Barème <select data-ncfg="niveau"><option value="1"${!T?' selected':''}>Première : table et rang /5</option><option value="T"${T?' selected':''}>Terminale : victoires dans la poule /4</option></select></label>
      ${T?'':`<label>Nombre de tables P <input data-ncfg="P" type="number" min="1" max="20" value="${esc(C.P)}" placeholder="auto : ${tr.P}"></label>
      <label>Note max M <input data-ncfg="M" type="number" step="0.1" value="${esc(C.M)}"></label><label>Dernier de la dernière table m <input data-ncfg="m" type="number" step="0.1" value="${esc(C.m)}"></label>`}
    </div>
    <p class="small"><b>Tours notés</b> (le 1er tour sert de calage) :</p>
    <div class="rangee">${K.length?K.map(x=>`<label class="coche mini"><input type="checkbox" data-ntour="${x}" ${TN.includes(x)?'checked':''}> ${labS(x)}</label>`).join(''):'<span class="muted small">aucune poule reçue</span>'}</div>
    ${T?`<p class="small muted">Victoires dans la poule : 0 = 1 point ; 1 = 2 ; 2 = 3 ; 3 = 4. Moyenne si plusieurs tours sont cochés.</p>`
       :`<p class="small muted">Note d’un tour = M − S × (table − 1) − décote du rang, avec S = (M − m) ÷ P = ${fr(tr.S)}. Décote = S × (rang − 1) ÷ (joueurs − 1), arrondie au 0,05 (groupe de 3 : 0 / 0,2 / 0,4 ; groupe de 4 : 0 / 0,15 / 0,25 / 0,4). Note = moyenne des tours joués.</p>`}
  </section>
  <div class="tablewrap"><table class="cl bil note"><thead><tr><th>Élève</th><th>Rép. AFL2/3</th>
    <th>Technique /${T?4:5}</th><th>${T?'Service /4':'Tactique /2'}</th><th>${T?'Victoires /4':'Table et rang /5'}</th><th>AFL2</th><th>AFL3</th><th>Total /20</th><th>Aides</th></tr></thead><tbody>
  ${L.map(k=>{const N=noteEleve(k,R,C),I=indicateurs(k,R),A=alertes(k,R,I),e=N.e;
    const det=N.res.det.map(d=>d.abs?`${labC(d.t)} abs.`:T?`${labC(d.t)} ${d.v} V`:`${labC(d.t)} T${d.table}·${d.rang}/${d.n} = ${fr(d.pts)}`).join('<br>');
    return `<tr><td><button class="lien" type="button" data-act="fiche" data-k="${esc(k)}">${esc(nomAffiche(k))}</button>${A.length?` <span class="badge st-oubli" title="${esc(A.join(' '))}">⚠</span>`:''}</td>
      <td><select class="nsel" data-note="rep" data-k="${esc(k)}">${Object.keys(REPS).map(r=>`<option${(e.rep||'4/4')===r?' selected':''}>${r}</option>`).join('')}</select></td>
      <td>${selDegres('tech',k,T?4:5,e.tech)}</td>
      <td>${T?selDegres('serv',k,4,e.serv)+`<br><input class="pct" type="number" min="0" max="100" data-note="servPct" data-k="${esc(k)}" value="${e.servPct==null?'':e.servPct}" placeholder="% 3 frappes" title="Part des points de service gagnés en 3 frappes (relevé de l’observateur)">`:selDegres('tact',k,2,e.tact)}<div class="small muted">${I.pj?`projets ${I.pjOk}/${I.pj} réalisés · ${I.pjDiff} différent${I.pjDiff>1?'s':''}`:'aucun projet annoncé'}${T?'':` · suggestion D${suggestionTactique(I)}`}</div></td>
      <td><b>${fr(N.res.note)}</b><div class="small muted">${det}</div></td>
      <td>${selDegres('afl2',k,N.rep[0],e.afl2)}<div class="small muted">sur ${N.rep[0]} · suggestion D${suggestionAFL2(I)}</div></td>
      <td>${selDegres('afl3',k,N.rep[1],e.afl3)}<div class="small muted">sur ${N.rep[1]} · suggestion D${suggestionAFL3(I)}</div></td>
      <td><b class="tot">${fr(N.tot)}</b></td>
      <td class="small aides">${I.recues}/${I.seances} séances · ${I.hauts}/${I.ex} exos vert (${I.hautsV} vérifiés) · ${I.valid} validation${I.valid>1?'s':''} faite${I.valid>1?'s':''} · ${I.mt} MT validé${I.mt>1?'s':''} · ${I.chg} chgt axe · ${I.arb} arbitrage${I.arb>1?'s':''}${I.coach?` · ${I.coach} match${I.coach>1?'s':''} codé${I.coach>1?'s':''} en coach`:''}${I.codes.some(Boolean)?` · codes reçus 0:${I.codes[0]} 1:${I.codes[1]} 2:${I.codes[2]} 3:${I.codes[3]} x:${I.codes[4]}`:''}${I.etDeb!=null?` · étoile AFL1 ${fr(I.etDeb)}${I.etFin!=null?'→'+fr(I.etFin):''}`:''}${A.length?`<div class="alerte">${A.map(esc).join('<br>')}</div>`:''}</td></tr>`}).join('')}
  </tbody></table></div>
  <p class="small muted">Technique, ${T?'service':'tactique'}, AFL2 et AFL3 : c’est toi qui choisis le degré et la note ; les « suggestions » et les aides viennent des séances reçues (assiduité, exercices, matchs à thème, arbitrages) et ne sont qu’un repère. ${T?'Service : seuils 15 / 25 / 35 % des points de service gagnés en 3 frappes, encore à vérifier en S6.':''}</p>
  <div class="rangee noprint"><button class="bt orange" type="button" data-act="csvnote">Exporter les notes (CSV)</button><button class="bt" type="button" data-act="imprimer">Imprimer</button></div>`;
}
function exporterNotes(){
  const C=cfgNote(),R=resultatsPoules(),T=C.niveau==='T';
  const rows=[['Classe','Élève','Barème','Répartition AFL2/AFL3','Technique',T?'Service':'Tactique',T?'% points de service en 3 frappes':'',T?'Victoires /4':'Table et rang /5','Détail des tours','AFL2','AFL3','Total /20','Alertes']];
  eleves().forEach(k=>{const N=noteEleve(k,R,C),e=N.e,I=indicateurs(k,R);
    rows.push([DB.classe,nomAffiche(k),T?'Terminale':'Première',e.rep||'4/4',dec(e.tech),dec(T?e.serv:e.tact),T?(e.servPct==null?'':e.servPct):'',dec(N.res.note),
      N.res.det.map(d=>d.abs?labC(d.t)+' absent':T?labC(d.t)+' '+d.v+' V':labC(d.t)+' table '+d.table+' rang '+d.rang+'/'+d.n+' = '+String(d.pts).replace('.',',')).join(' ; '),
      dec(e.afl2),dec(e.afl3),dec(N.tot),alertes(k,R,I).join(' ')])});
  telecharger('TT_'+(DB.classe||'classe').replace(/[^A-Za-z0-9]+/g,'')+'_notes.csv',csv(rows));
}

/* ---------- Onglet Pilotage ---------- */
function vPilotage(){
  const K=[...new Set(poulesClasse().map(p=>p.seance))].sort((a,b)=>a-b);
  const R=resultatsPoules();
  let h=`<h2>Pilotage · ${esc(DB.classe)}</h2>`;
  // 1. Poules de la suite (montante-descendante)
  if(K.length){
    DB.pilote=K.includes(DB.pilote)?DB.pilote:K[K.length-1];
    const P=poulesClasse().filter(p=>p.seance===DB.pilote).sort((a,b)=>a.num-b.num),nb=P.length?Math.max(...P.map(p=>p.num)):0;
    const nouv={};
    P.forEach(p=>{const n=p.joueurs.length,C=TTL.classement(n,p.matchs,p.fmt),tous=p.matchs.every(m=>TTL.etatMatch(m,p.fmt).fini);
      C.forEach(c=>{let dest=p.num;if(tous&&n>1&&p.mouv!==false){if(c.rang===1&&p.num>1)dest=p.num-1;else if(c.rang===n&&p.num<nb)dest=p.num+1}
        (nouv[dest]=nouv[dest]||[]).push({nom:p.joueurs[c.i],de:p.num,rang:c.rang,inc:!tous})})});
    h+=`<section class="carte"><h3>Poules pour la suite</h3><p class="small muted">D’après ${labS(DB.pilote)} : le 1er monte, le dernier descend. À recopier dans l’appli au tour suivant.</p>
      <div class="strip noprint">${K.map(x=>`<button type="button" data-act="pilote" data-v="${x}" class="${x===DB.pilote?'ici':''}">${labS(x)}</button>`).join('')}</div>
      <div class="poules">${Object.keys(nouv).map(Number).sort((a,b)=>a-b).map(t=>`<div class="carte"><b>Poule ${t}</b><ol>${nouv[t].map(j=>`<li>${esc(j.nom)} <span class="small muted">${j.de<t?'↓ de '+j.de:j.de>t?'↑ de '+j.de:''}${j.inc?' (poule incomplète)':''}</span></li>`).join('')}</ol></div>`).join('')}</div>
      <p class="small muted">Absents et dispensés du jour : à retirer à la main. Les élèves sans poule reçue n’apparaissent pas.</p></section>`;
  }
  // 2. Regroupement par thème (dernière séance de travail)
  const Si=[...new Set(recsClasse().map(r=>r.seance))].sort((a,b)=>a-b),der=Si[Si.length-1];
  if(der){
    const parT={};recsClasse().filter(r=>r.seance===der&&!r.disp).forEach(r=>{const th=new Set(r.ex.map(e=>{const i=exInfo(e.n);return i?i.t.n:null}).filter(Boolean));
      (th.size?[...th]:['?']).forEach(t=>(parT[t]=parT[t]||[]).push(nomAffiche(r.k)))});
    let table=1;
    h+=`<section class="carte"><h3>Thèmes travaillés · séance ${der}</h3><p class="small muted">Pour organiser les tables à la séance suivante (groupes de 3 par thème). Table 12, moitié relevée : exercices 9 (mur) et 23 à 26 (services).</p>
      <table class="cl"><thead><tr><th>Thème</th><th>Élèves</th><th>Tables proposées</th></tr></thead><tbody>
      ${Object.keys(parT).sort((a,b)=>(+a||99)-(+b||99)).map(t=>{const L=parT[t],nt=Math.ceil(L.length/3),tabs=[...Array(nt)].map(()=>table++).filter(x=>x<=11);
        const th=t==='?'?null:GA.themes.find(x=>x.n===+t);
        return `<tr><td>${th?`${th.n} · ${esc(th.t)}`:'Sans exercice'}</td><td>${L.length} : ${L.map(esc).join(', ')}</td><td>${tabs.join(', ')||'—'}</td></tr>`}).join('')}</tbody></table></section>`;
  }
  // 3. Élèves à voir en priorité
  const prio=[];
  eleves().forEach(k=>{const recs=recsClasse().filter(r=>r.k===k).sort((a,b)=>a.seance-b.seance),I=indicateurs(k,R),why=[];
    const cnt={};recs.forEach(r=>r.ex.forEach(e=>{(cnt[e.n]=cnt[e.n]||[]).push(e.niv||0)}));
    Object.entries(cnt).forEach(([n,v])=>{if(v.length>=3&&Math.max(...v)<3)why.push(`bloqué sur l’exercice ${n} (${v.length} séances, jamais vert)`)});
    if(I.chg>=2)why.push(I.chg+' changements d’axe non validés');
    const Ss=[...new Set(seancesClasse().map(Math.floor))].sort((a,b)=>a-b).slice(-2),A=arbitrages();
    if(Ss.length===2&&Ss.every(s=>['rien','absent'].includes(statut(k,s,R,A).c)))why.push('rien reçu aux 2 dernières séances');
    alertes(k,R,I).filter(a=>!/changements d’axe/.test(a)).forEach(a=>why.push(a));
    if(why.length)prio.push([k,why])});
  h+=`<section class="carte"><h3>À voir en priorité</h3>${prio.length?`<ul>${prio.map(([k,w])=>`<li><button class="lien" type="button" data-act="fiche" data-k="${esc(k)}">${esc(nomAffiche(k))}</button> : ${w.map(esc).join(' ; ')}</li>`).join('')}</ul>`:'<p class="muted">Personne à signaler.</p>'}</section>
  <div class="rangee noprint"><button class="bt" type="button" data-act="imprimer">Imprimer</button></div>`;
  return h;
}

/* ---------- Fiche élève : progression ---------- */
function courbeRang(k,R){
  const {rangs,nb}=rangsClasse(R),x=rangs[k]||{},K=Object.keys(x).map(Number).sort((a,b)=>a-b);
  if(K.length<2)return '';
  const W=540,H=170,pl=36,pr=36,pt=14,pb=28,maxN=Math.max(...K.map(s=>nb[s]));
  const X=i=>pl+i*(W-pl-pr)/(K.length-1),Y=r=>pt+(r-1)*(H-pt-pb)/Math.max(1,maxN-1);
  const pts=K.map((s,i)=>`${X(i)},${Y(x[s])}`).join(' ');
  return `<section class="carte"><h3>Rang dans la classe</h3><svg viewBox="0 0 ${W} ${H}" class="courbe" role="img" aria-label="Rang dans la classe séance par séance">
    <line x1="${pl}" y1="${Y(1)}" x2="${W-pr}" y2="${Y(1)}" class="g"/><line x1="${pl}" y1="${Y(maxN)}" x2="${W-pr}" y2="${Y(maxN)}" class="g"/>
    <text x="${pl-6}" y="${Y(1)+4}" text-anchor="end">1er</text><text x="${pl-6}" y="${Y(maxN)+4}" text-anchor="end">${maxN}e</text>
    <polyline points="${pts}" class="l"/>${K.map((s,i)=>`<circle cx="${X(i)}" cy="${Y(x[s])}" r="4" class="p"/><text x="${X(i)}" y="${H-8}" text-anchor="middle">${labC(s)}</text><text x="${X(i)}" y="${Y(x[s])-8}" text-anchor="middle" class="v">${x[s]}</text>`).join('')}
  </svg></section>`;
}
function radarEtoiles(k){
  const recs=recsClasse().filter(r=>r.k===k&&r.etoile&&r.etoile.some(Boolean)).sort((a,b)=>a.seance-b.seance);
  if(!recs.length)return '';
  const a=recs[0],b=recs.length>1?recs[recs.length-1]:null,N=7,cx=150,cy=125,R=90;
  const pt=(i,v)=>{const t=-Math.PI/2+i*2*Math.PI/N,r=R*v/4;return [cx+r*Math.cos(t),cy+r*Math.sin(t)]};
  const poly=(e,cl)=>`<polygon class="${cl}" points="${e.map((v,i)=>pt(i,v||0).join(',')).join(' ')}"/>`;
  const lab=['Stratégie','Continuité','Mettre en diff.','Engagement','Analyse','Coach','Arbitrage'];
  let g=`<svg viewBox="0 0 300 250" class="radar2" role="img" aria-label="Étoile de début et de fin">`;
  for(let d=1;d<=4;d++)g+=`<polygon class="ring" points="${lab.map((_,i)=>pt(i,d).join(',')).join(' ')}"/>`;
  lab.forEach((l,i)=>{const [x,y]=pt(i,4.9);g+=`<text x="${x}" y="${y}" text-anchor="middle">${l}</text>`});
  g+=poly(a.etoile,'deb')+(b?poly(b.etoile,'fin'):'')+'</svg>';
  return `<section class="carte"><h3>Étoile : début et fin</h3>${g}<p class="small"><span class="leg deb"></span> séance ${a.seance}${b?` · <span class="leg fin"></span> séance ${b.seance}`:''}</p></section>`;
}

/* ---------- Noms hors liste : fusion proposée ---------- */
function lev(a,b){const m=a.length,n=b.length,d=[...Array(n+1).keys()];for(let i=1;i<=m;i++){let p=d[0];d[0]=i;for(let j=1;j<=n;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return d[n]}
function suggestion(k){
  const L=liste().map(n=>cleEleve(DB.classe,n)),nom=k.split('|')[1];
  let best=null;L.forEach(c=>{const d=lev(nom,c.split('|')[1]);if(!best||d<best[1])best=[c,d]});
  if(!best||best[1]>Math.max(3,nom.length/3))return '';
  return ` <button class="bt mini" type="button" data-act="fusionvers" data-k="${esc(k)}" data-v="${esc(best[0])}">= ${esc(nomAffiche(best[0]))} ?</button>`;
}
function fusionner(src,dst){
  if(!src||!dst||src===dst)return;
  DB.alias[src]=dst;
  Object.keys(DB.rec).forEach(id=>{const r=DB.rec[id];if(r.k===src){delete DB.rec[id];const nid=dst+'|'+r.seance;if(!DB.rec[nid]||(DB.rec[nid].ts||0)<(r.ts||0))DB.rec[nid]=Object.assign(r,{k:dst})}});
  const C=cfgNote();if(C.el[src]&&!C.el[dst]){C.el[dst]=C.el[src]}delete C.el[src];
}

/* ---------- Branchement dans prof.js ---------- */
function codesFiche(k,R){
  const I=indicateurs(k,R),c=I.codes,g=c[0]+c[1]+c[2]+c[3];if(!g&&!c[4]&&!I.coach)return '';
  return `<section class="carte"><h3>Codes du coach en match</h3>
    ${g||c[4]?`<p>Points gagnés : <b>0</b> ${c[0]} · <b>1</b> ${c[1]} · <b>2</b> ${c[2]} · <b>3</b> ${c[3]} — fautes faciles <b>x</b> ${c[4]}</p>
    <p class="small muted">Score observé (1×1 + 2×2 + 3×3) : ${c[1]+2*c[2]+3*c[3]}${g?' · part des points gagnés « construits » (1, 2, 3) : '+Math.round(100*(c[1]+c[2]+c[3])/g)+' %':''}</p>`:''}
    ${I.coach?`<p class="small">A codé ${I.coach} match${I.coach>1?'s':''} comme arbitre-coach (AFL3).</p>`:''}</section>`;
}
window.PLUS={
  actions:['pilote','csvnote','fusionvers'],
  clic(a,b){
    if(a==='pilote'){DB.pilote=+b.dataset.v;return}
    if(a==='csvnote'){exporterNotes();return false}
    if(a==='fusionvers'){if(!confirm('Fusionner « '+nomAffiche(b.dataset.k)+' » avec « '+nomAffiche(b.dataset.v)+' » ?'))return false;fusionner(b.dataset.k,b.dataset.v);return}
  },
  change(t){
    if(t.dataset.ncfg){const C=cfgNote(),f=t.dataset.ncfg;C[f]=f==='niveau'?t.value:(t.value===''?'':+t.value);sauver();rendre();return true}
    if(t.dataset.ntour!=null){const C=cfgNote(),x=+t.dataset.ntour,L=new Set(toursNotes(C));if(t.checked)L.add(x);else L.delete(x);C.tours=[...L].sort((a,b)=>a-b);sauver();rendre();return true}
    if(t.dataset.note){const C=cfgNote(),k=t.dataset.k,f=t.dataset.note,e=C.el[k]||(C.el[k]={});
      e[f]=t.value===''?null:(f==='rep'?t.value:+t.value);
      if(f==='rep'){const R=REPS[t.value];if(e.afl2>R[0])e.afl2=null;if(e.afl3>R[1])e.afl3=null}
      sauver();rendre();return true}
    return false;
  },
  fiche:(k,R)=>courbeRang(k,R)+radarEtoiles(k)+codesFiche(k,R),
  suggestion
};
rendre();
