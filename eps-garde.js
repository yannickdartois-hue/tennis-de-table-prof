/* =====================================================================
   eps-garde.js — commun aux applis PROF (Lycée Georges Pompidou)
   Source : mon-eps/atelier/ecran-de-cours/commun/eps-garde.js (recopié tel quel).

   Les données de l'outil prof ne sont que sur cet appareil : si l'iPad est
   réinitialisé ou si le navigateur vide son stockage, tout est perdu.
   Ce module surveille les modifications et pousse à la sauvegarde :
   - il repère chaque modification des données de l'outil (clé localStorage
     de l'appli) et chaque sauvegarde téléchargée (fichier dont le nom
     contient « sauvegarde » ou « archive », via la fonction telecharger()) ;
   - données modifiées depuis plus d'1 heure sans sauvegarde : bandeau rouge
     « Sauvegarder maintenant » (un toucher, le bouton de l'appli est utilisé :
     même fichier, mot de passe proposé par eps-coffre.js) ;
   - à l'ouverture de l'outil, plus de 24 h sans sauvegarde : fenêtre.
   Ne change rien aux données. Rien en démo. À charger APRÈS eps-coffre.js.
   L'appli peut préciser sa clé : window.EPS_GARDE={cle:'gym-prof-v1'}.
   ===================================================================== */
(function(){
  'use strict';
  if(window.EPSGarde)return;
  var CLES=['gym-prof-v1','dfp-v1','tte-prof-v1','bde-prof-v1','ctp-v1','spp-v1'];
  var HEURE=36e5,JOUR=864e5;
  var LS;try{LS=window.localStorage}catch(e){return}
  var origSet=Storage.prototype.setItem;
  var CLE=(window.EPS_GARDE&&window.EPS_GARDE.cle)||null;
  function trouverCle(){if(CLE)return CLE;for(var i=0;i<CLES.length;i++){try{if(LS.getItem(CLES[i])!=null)return CLE=CLES[i]}catch(e){}}return null}
  function kg(){return 'eps-garde:'+(trouverCle()||'?')}
  function lire(){try{return JSON.parse(LS.getItem(kg()))||{}}catch(e){return {}}}
  function ecrire(o){try{origSet.call(LS,kg(),JSON.stringify(o))}catch(e){}}
  function demo(){try{if(/[?&]demo\b/.test(location.search))return true;if(typeof DEMO!=='undefined'&&DEMO)return true}catch(e){}return false}
  function duree(ms){var h=Math.round(ms/HEURE);if(h<1)return 'moins d’une heure';if(h<48)return h+' h';return Math.round(ms/JOUR)+' jours'}

  /* ---------- 1. Modifications des données ---------- */
  var dernier=null;
  Storage.prototype.setItem=function(k,v){
    var r=origSet.apply(this,arguments);
    try{
      if(this===LS&&!demo()){
        if(!CLE&&CLES.indexOf(k)>=0)CLE=k;
        if(k===CLE&&v!==dernier){dernier=v;var e=lire();if(!e.sale)e.sale=Date.now();e.n=(e.n||0)+1;ecrire(e);planifier()}
      }
    }catch(e){}
    return r;
  };
  try{dernier=trouverCle()?LS.getItem(CLE):null}catch(e){}
  /* première fois : des données existent mais aucune sauvegarde connue */
  try{if(dernier&&!demo()){var e0=lire();if(!e0.vu){e0.vu=Date.now();if(!e0.der&&!e0.sale)e0.sale=Date.now();ecrire(e0)}}}catch(e){}

  /* ---------- 2. Sauvegardes téléchargées ---------- */
  function marquer(){var e=lire();e.sale=0;e.n=0;e.der=Date.now();ecrire(e);majBandeau()}
  function brancher(){
    var orig=window.telecharger;if(typeof orig!=='function'||orig.__garde)return;
    var f=function(nom){if(/sauvegarde|archive/i.test(String(nom||''))&&!demo())marquer();return orig.apply(this,arguments)};
    f.__garde=true;window.telecharger=f;
  }

  /* ---------- 3. Affichage ---------- */
  function styles(){
    if(document.getElementById('eps-garde-style'))return;
    var s=document.createElement('style');s.id='eps-garde-style';
    s.textContent='.eps-garde{position:fixed;left:50%;transform:translateX(-50%);top:8px;z-index:9998;display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;'+
      'max-width:calc(100% - 24px);background:#b42318;color:#fff;border-radius:12px;padding:8px 10px 8px 14px;font:600 15px/1.3 system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.25)}'+
      '.eps-garde button{font:700 15px system-ui,sans-serif;min-height:44px;border-radius:9px;border:0;padding:0 14px;cursor:pointer}'+
      '.eps-garde .ok{background:#fff;color:#b42318}.eps-garde .x{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.7)}'+
      '.eps-garde-voile{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}'+
      '.eps-garde-fen{background:#fff;color:#1d2327;border-radius:16px;max-width:440px;width:100%;padding:20px;font:16px/1.45 system-ui,sans-serif}'+
      '.eps-garde-fen h3{margin:0 0 8px;font-size:20px}.eps-garde-fen .bts{display:flex;gap:10px;justify-content:space-between;margin-top:14px;flex-wrap:wrap}'+
      '.eps-garde-fen button{font:700 16px system-ui,sans-serif;min-height:48px;border-radius:10px;padding:0 16px;cursor:pointer;border:1.5px solid #1d2327;background:#fff;color:#1d2327}'+
      '.eps-garde-fen .ok{background:#b42318;border-color:#b42318;color:#fff}';
    document.head.appendChild(s);
  }
  var masqueJusqua=0;
  function sauvegarder(){
    var b=document.createElement('button');b.type='button';b.dataset.act='sauvegarde';b.hidden=true;
    document.body.appendChild(b);b.click();setTimeout(function(){b.remove()},0);
  }
  function majBandeau(){
    var el=document.querySelector('.eps-garde');
    var e=lire(),age=e.sale?Date.now()-e.sale:0;
    var montrer=!demo()&&e.sale&&age>HEURE&&Date.now()>masqueJusqua;
    if(!montrer){if(el)el.remove();return}
    styles();
    var txt='⚠ Données modifiées et pas sauvegardées depuis '+duree(age)+(e.der?'':' (aucune sauvegarde sur cet appareil)')+'.';
    if(!el){el=document.createElement('div');el.className='eps-garde';el.setAttribute('role','alert');
      el.innerHTML='<span></span><button type="button" class="ok">⬇ Sauvegarder maintenant</button><button type="button" class="x" aria-label="Plus tard">Plus tard</button>';
      el.querySelector('.ok').onclick=sauvegarder;
      el.querySelector('.x').onclick=function(){masqueJusqua=Date.now()+HEURE;majBandeau()};
      document.body.appendChild(el)}
    el.querySelector('span').textContent=txt;
  }
  var tPlan=null;
  function planifier(){clearTimeout(tPlan);tPlan=setTimeout(majBandeau,500)}
  function fenetreOuverture(){
    var e=lire();if(demo()||!e.sale)return;
    var depuis=e.der?Date.now()-e.der:Date.now()-e.sale;
    if(depuis<JOUR||Date.now()-e.sale<HEURE)return;
    styles();
    var v=document.createElement('div');v.className='eps-garde-voile';
    v.innerHTML='<div class="eps-garde-fen" role="dialog" aria-modal="true"><h3>💾 Sauvegarde à faire</h3>'+
      '<p>Vos données ont changé et '+(e.der?'la dernière sauvegarde date de <b>'+duree(Date.now()-e.der)+'</b>':'<b>aucune sauvegarde</b> n’a été faite sur cet appareil')+'.</p>'+
      '<p style="font-size:14px;color:#475569">Elles ne sont que sur cet appareil. Rangez le fichier dans votre espace personnel (Nuage, Drive, Fichiers).</p>'+
      '<div class="bts"><button type="button" class="x">Plus tard</button><button type="button" class="ok">⬇ Sauvegarder maintenant</button></div></div>';
    v.querySelector('.x').onclick=function(){v.remove()};
    v.querySelector('.ok').onclick=function(){v.remove();sauvegarder()};
    document.body.appendChild(v);
  }
  function demarrer(){setTimeout(function(){brancher();majBandeau();fenetreOuverture()},50)}
  if(document.readyState==='complete')demarrer();else window.addEventListener('load',demarrer);
  setInterval(majBandeau,5*60*1000);
  window.EPSGarde={etat:lire,marquer:marquer,sauvegarder:sauvegarder,maj:majBandeau};
})();
