/* =====================================================================
   prof-saisie.js — Note : saisie rapide au doigt, élève par élève
   Le tableau de l'onglet Note reste tel quel (vue d'ensemble, export).
   Ici : un élève à l'écran, 4 gros boutons de degré par critère,
   − / + pour ajuster dans le degré, Suivant. Même barème, mêmes données.
   ===================================================================== */
'use strict';
let SR=null;
const SR_NOM={tech:'Technique',tact:'Tactique',serv:'Service',afl2:'AFL2',afl3:'AFL3'};
function srCrit(T,N,I){
  return [['tech',T?4:5,''],[T?'serv':'tact',T?4:2,''],['afl2',N.rep[0],'suggestion D'+suggestionAFL2(I)],['afl3',N.rep[1],'suggestion D'+suggestionAFL3(I)]];
}
function srDeg(max,v){if(v==null||v==='')return 0;const F=FOURCH[max];for(let d=0;d<F.length;d++)if(v<=F[d][1]+1e-9)return d+1;return F.length}
function srRendre(){
  let o=document.getElementById('sr');
  const L=eleves();if(SR==null||!L.length){if(o)o.remove();return}
  SR=Math.max(0,Math.min(L.length-1,SR));
  const k=L[SR],C=cfgNote(),R=resultatsPoules(),T=C.niveau==='T',N=noteEleve(k,R,C),I=indicateurs(k,R),e=N.e;
  const lignes=srCrit(T,N,I).map(([f,max,sug])=>{const v=e[f],dg=srDeg(max,v);
    return `<div class="sr-c"><div class="sr-l"><b>${SR_NOM[f]}</b> <span class="muted">/${max}${sug?' · '+sug:''}</span></div>
      <div class="sr-d">${FOURCH[max].map(([a,b],d)=>`<button type="button" class="sr-b n${d+1}${dg===d+1?' on':''}" data-sr="deg" data-f="${f}" data-max="${max}" data-d="${d}"><i class="p${d+1}"></i>D${d+1}<small>${fr(a)}–${fr(b)}</small></button>`).join('')}</div>
      <div class="sr-v"><button type="button" class="sr-pm" data-sr="pm" data-f="${f}" data-max="${max}" data-v="-1" aria-label="moins 0,25">−</button><b>${v==null||v===''?'—':fr(v)}</b><button type="button" class="sr-pm" data-sr="pm" data-f="${f}" data-max="${max}" data-v="1" aria-label="plus 0,25">+</button></div></div>`}).join('');
  const html=`<div class="sr-in" role="dialog" aria-label="Saisie rapide des notes">
    <div class="sr-h"><div><div class="small muted">${SR+1} / ${L.length} · ${esc(DB.classe)}</div><h2>${esc(nomAffiche(k))}</h2></div><button type="button" class="bt mini" data-sr="fermer">Fermer</button></div>
    <div class="sr-res"><span>${T?'Victoires /4':'Table et rang /5'} : <b>${fr(N.res.note)}</b></span><span>Total /20 : <b class="tot">${fr(N.tot)}</b></span></div>
    <div class="sr-rep"><span class="small">Répartition AFL2/AFL3</span>${Object.keys(REPS).map(r=>`<button type="button" class="bt mini${(e.rep||'4/4')===r?' on':''}" data-sr="rep" data-v="${r}">${r}</button>`).join('')}</div>
    ${lignes}
    <div class="sr-nav"><button type="button" class="bt" data-sr="nav" data-v="-1" ${SR?'':'disabled'}>‹ Précédent</button><button type="button" class="bt orange" data-sr="nav" data-v="1" ${SR<L.length-1?'':'disabled'}>Suivant ›</button></div>
  </div>`;
  if(!o){o=document.createElement('div');o.id='sr';o.className='sr';document.body.appendChild(o)}
  o.innerHTML=html;
}
function srPoser(k,f,v){const C=cfgNote(),e=C.el[k]||(C.el[k]={});e[f]=v;sauver()}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act="saisierapide"],[data-sr]');if(!b)return;
  e.stopImmediatePropagation();
  if(b.dataset.act==='saisierapide'){SR=0;srRendre();return}
  const a=b.dataset.sr,L=eleves(),k=L[SR],C=cfgNote(),el=C.el[k]||(C.el[k]={});
  if(a==='fermer'){SR=null;srRendre();rendre();return}
  if(a==='nav'){SR+=+b.dataset.v;srRendre();document.querySelector('.sr-in').scrollTop=0;return}
  if(a==='rep'){el.rep=b.dataset.v;const R=REPS[b.dataset.v];if(el.afl2>R[0])el.afl2=null;if(el.afl3>R[1])el.afl3=null;sauver();srRendre();return}
  const f=b.dataset.f,max=+b.dataset.max,F=FOURCH[max];
  if(a==='deg'){const [lo,hi]=F[+b.dataset.d],v=el[f];
    // dans le degré : on garde la valeur ; sinon le milieu du degré (au 0,25 près)
    srPoser(k,f,v!=null&&v!==''&&v>=lo-1e-9&&v<=hi+1e-9?v:r2(lo+Math.floor((hi-lo)/2/.25)*.25));srRendre();return}
  if(a==='pm'){const v=el[f]==null||el[f]===''?0:+el[f];srPoser(k,f,r2(Math.max(0,Math.min(max,v+(+b.dataset.v)*.25))));srRendre();return}
},true);
document.addEventListener('keydown',e=>{if(SR==null)return;if(e.key==='Escape'){SR=null;srRendre();rendre()}});
