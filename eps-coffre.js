/* =====================================================================
   eps-coffre.js — commun aux applis PROF (Lycée Georges Pompidou)
   Source : mon-eps/atelier/ecran-de-cours/commun/eps-coffre.js (recopié tel quel).

   Sauvegardes protégées par un mot de passe (RGPD : les fichiers contiennent
   des noms d'élèves).
   - Toute sauvegarde ou archive téléchargée par l'appli (nom de fichier
     contenant « sauvegarde » ou « archive », contenu JSON) passe par une
     fenêtre : mot de passe → fichier chiffré (AES-GCM 256, clé dérivée du
     mot de passe par PBKDF2-SHA-256, 250 000 tours) ; ou « Sans mot de
     passe » → fichier en clair, comme avant. Le téléchargement a toujours
     lieu : l'archivage de fin d'année ne peut pas perdre de données.
   - EPSCoffre.lireFichier(fichier) rend le texte d'un fichier de sauvegarde,
     en demandant le mot de passe s'il est chiffré (anciens fichiers en clair :
     lus tels quels).
   Mot de passe oublié = sauvegarde illisible : personne ne peut la rouvrir.
   ===================================================================== */
(function(){
  'use strict';
  if(window.EPSCoffre)return;
  var ITER=250000,enc=new TextEncoder(),dec=new TextDecoder();
  var b64=function(u){var s='';new Uint8Array(u).forEach(function(c){s+=String.fromCharCode(c)});return btoa(s)};
  var deb64=function(t){return Uint8Array.from(atob(t),function(c){return c.charCodeAt(0)})};
  function cle(mdp,sel,usage){
    return crypto.subtle.importKey('raw',enc.encode(mdp),'PBKDF2',false,['deriveKey']).then(function(k){
      return crypto.subtle.deriveKey({name:'PBKDF2',salt:sel,iterations:ITER,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,[usage])})}
  function chiffrer(texte,mdp,app){
    var sel=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    return cle(mdp,sel,'encrypt').then(function(k){return crypto.subtle.encrypt({name:'AES-GCM',iv:iv},k,enc.encode(texte))}).then(function(c){
      return JSON.stringify({epsCoffre:1,app:app||'',note:'Sauvegarde protégée par mot de passe. À rouvrir avec « Restaurer » dans l’appli qui l’a créée.',kdf:'PBKDF2-SHA256',iter:ITER,sel:b64(sel),iv:b64(iv),donnees:b64(c)})})}
  function estChiffre(texte){try{var o=JSON.parse(texte);return !!(o&&o.epsCoffre&&o.donnees)}catch(e){return false}}
  function dechiffrer(texte,mdp){var o=JSON.parse(texte);
    return cle(mdp,deb64(o.sel),'decrypt').then(function(k){return crypto.subtle.decrypt({name:'AES-GCM',iv:deb64(o.iv)},k,deb64(o.donnees))}).then(function(b){return dec.decode(b)})}

  /* ---------- fenêtre ---------- */
  function style(){
    if(document.getElementById('eps-coffre-style'))return;
    var s=document.createElement('style');s.id='eps-coffre-style';
    s.textContent='.eps-coffre{position:fixed;inset:0;z-index:2147483100;background:rgba(15,20,30,.55);display:flex;align-items:center;justify-content:center;padding:16px}'+
      '.eps-coffre>div{background:#fff;color:#14181f;border-radius:16px;max-width:460px;width:100%;padding:18px;font:17px/1.4 "Atkinson","Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.3)}'+
      '.eps-coffre h3{margin:0 0 6px;font-size:21px}.eps-coffre p{margin:6px 0;font-size:15px;color:#4b5563}'+
      '.eps-coffre input{width:100%;box-sizing:border-box;font:inherit;padding:11px 12px;margin:6px 0;border:1px solid #cfd6e0;border-radius:10px}'+
      '.eps-coffre .err{color:#b91c1c;font-weight:700;min-height:1.3em}'+
      '.eps-coffre .bts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.eps-coffre button{min-height:48px;padding:0 16px;border-radius:12px;border:0;font:inherit;font-weight:700;cursor:pointer;background:#e5e9f0;color:#14181f}'+
      '.eps-coffre button.pri{background:#1c2128;color:#fff}';
    document.head.appendChild(s)}
  function fenetre(html){style();var d=document.createElement('div');d.className='eps-coffre';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.innerHTML='<div>'+html+'</div>';document.body.appendChild(d);var i=d.querySelector('input');if(i)setTimeout(function(){i.focus()},50);return d}
  function demanderPourEnregistrer(){
    return new Promise(function(ok){
      var d=fenetre('<h3>🔒 Protéger la sauvegarde</h3><p>Le fichier contient des noms d’élèves. Avec un mot de passe, il est illisible sans lui, même ouvert dans Excel.</p>'+
        '<input type="password" class="m1" placeholder="Mot de passe (8 caractères ou plus)" autocomplete="new-password"><input type="password" class="m2" placeholder="Le même, une deuxième fois" autocomplete="new-password">'+
        '<p><b>Note ce mot de passe :</b> s’il est oublié, la sauvegarde ne pourra plus être rouverte, par personne.</p><p class="err"></p>'+
        '<div class="bts"><button type="button" class="pri ok">Protéger et télécharger</button><button type="button" class="sans">Sans mot de passe</button></div>');
      var m1=d.querySelector('.m1'),m2=d.querySelector('.m2'),err=d.querySelector('.err');
      d.querySelector('.ok').onclick=function(){
        if(m1.value.length<8){err.textContent='8 caractères au minimum.';return}
        if(m1.value!==m2.value){err.textContent='Les deux mots de passe sont différents.';return}
        var v=m1.value;d.remove();ok(v)};
      d.querySelector('.sans').onclick=function(){d.remove();ok('')};
      m2.onkeydown=function(e){if(e.key==='Enter')d.querySelector('.ok').click()};
    })}
  function demanderPourOuvrir(texte){
    return new Promise(function(ok,ko){
      var d=fenetre('<h3>🔒 Sauvegarde protégée</h3><p>Tape le mot de passe choisi au moment de la sauvegarde.</p><input type="password" class="m1" placeholder="Mot de passe" autocomplete="current-password"><p class="err"></p>'+
        '<div class="bts"><button type="button" class="pri ok">Ouvrir</button><button type="button" class="annule">Annuler</button></div>');
      var m1=d.querySelector('.m1'),err=d.querySelector('.err'),b=d.querySelector('.ok');
      b.onclick=function(){b.disabled=true;err.textContent='';dechiffrer(texte,m1.value).then(function(t){d.remove();ok(t)}).catch(function(){b.disabled=false;err.textContent='Mot de passe incorrect.';m1.select()})};
      d.querySelector('.annule').onclick=function(){d.remove();ko(new Error('Restauration annulée.'))};
      m1.onkeydown=function(e){if(e.key==='Enter')b.click()};
    })}

  function lireFichier(f){return f.text().then(function(t){return estChiffre(t)?demanderPourOuvrir(t):t})}

  /* ---------- branchement sur la fonction telecharger(nom, texte, type) de l'appli ---------- */
  function brancher(){
    var orig=window.telecharger;if(typeof orig!=='function'||orig.__coffre||!window.crypto||!crypto.subtle)return;
    var f=function(nom,texte,type){
      var sauvegarde=/sauvegarde|archive/i.test(String(nom||''))&&typeof texte==='string'&&/^\s*\{/.test(texte)&&!estChiffre(texte);
      if(!sauvegarde)return orig.apply(this,arguments);
      var self=this;
      demanderPourEnregistrer().then(function(mdp){
        if(!mdp)return orig.call(self,nom,texte,type);
        return chiffrer(texte,mdp,String(nom).replace(/_\d{4}-\d{2}-\d{2}.*$/,'')).then(function(c){orig.call(self,String(nom).replace(/\.json$/i,'')+'_protege.json',c,'application/json')})
          .catch(function(){alert('Chiffrement impossible sur cet appareil : la sauvegarde est téléchargée sans mot de passe.');orig.call(self,nom,texte,type)});
      });
    };
    f.__coffre=true;window.telecharger=f;
  }
  window.EPSCoffre={chiffrer:chiffrer,dechiffrer:dechiffrer,estChiffre:estChiffre,lireFichier:lireFichier,brancher:brancher};
  if(document.readyState==='complete')brancher();else window.addEventListener('load',brancher);
})();
