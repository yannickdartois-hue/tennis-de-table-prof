/* =====================================================================
   prof-oubli.js — retrouver le code secret oublié d'un groupe
   (même principe que l'outil gym)
   - Une paire de clés ECDH P-256 est créée dans l'outil (DB.oubli) ; la
     clé privée ne quitte pas l'appareil (elle voyage seulement dans la
     sauvegarde de l'outil). La clé publique part dans le QR de la classe
     (champ ek), ajoutée ici sans modifier prof.js.
   - « Code oublié ? » sur l'appareil d'un groupe affiche un QR (t:'O') :
     tous les scanners de l'outil le reconnaissent et affichent le code.
   Chargé après prof.js.
   ===================================================================== */
(function(){
'use strict';
const APP='TTE',PREF='tt';
const b64u=u=>{let s='';new Uint8Array(u).forEach(x=>s+=String.fromCharCode(x));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const deb64u=t=>{t=String(t).replace(/-/g,'+').replace(/_/g,'/');while(t.length%4)t+='=';return Uint8Array.from(atob(t),c=>c.charCodeAt(0))};
const h=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const OUBLI={
  async cles(){
    if(DB.oubli&&DB.oubli.priv&&DB.oubli.pub)return DB.oubli;
    const kp=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveKey']);
    DB.oubli={priv:await crypto.subtle.exportKey('jwk',kp.privateKey),pub:b64u(await crypto.subtle.exportKey('raw',kp.publicKey))};
    sauver();return DB.oubli;
  },
  async lire(oc){
    const c=await OUBLI.cles();
    const priv=await crypto.subtle.importKey('jwk',c.priv,{name:'ECDH',namedCurve:'P-256'},false,['deriveKey']);
    const pub=await crypto.subtle.importKey('raw',deb64u(oc.e),{name:'ECDH',namedCurve:'P-256'},false,[]);
    const k=await crypto.subtle.deriveKey({name:'ECDH',public:pub},priv,{name:'AES-GCM',length:256},false,['decrypt']);
    const t=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:deb64u(oc.i)},k,deb64u(oc.d)));
    if(t.indexOf(PREF+'|')!==0||!/^\d{4}$/.test(t.slice(PREF.length+1)))throw 0;return t.slice(PREF.length+1);
  }
};
const _enc=TTQR.encoder;
TTQR.encoder=async function(o){
  if(o&&o.a===APP&&o.t==='C'&&!o.ek&&!(typeof DEMO!=='undefined'&&DEMO))o=Object.assign({},o,{ek:(await OUBLI.cles()).pub});
  return _enc.call(this,o);
};
function montrer(noms,classe,code){
  const d=document.createElement('div');d.className='voile';
  d.innerHTML=`<div style="background:#fff;color:#111;border-radius:18px;padding:20px;max-width:460px;margin:10vh auto;text-align:center;box-shadow:0 10px 40px #0006"><p style="margin:0;color:#555">${h(classe||'')} · code oublié</p>
    <h2 style="margin:4px 0">${h((noms||[]).join(', ')||'Groupe')}</h2>
    <p style="font-size:64px;font-weight:800;letter-spacing:.15em;margin:10px 0">${h(code)}</p>
    <p>Dites-le au groupe (sans l’afficher à toute la classe).</p>
    <button type="button" style="font:inherit;font-weight:700;padding:12px 24px;border-radius:12px;border:2px solid #111;background:#111;color:#fff">Fermer</button></div>`;
  d.querySelector('button').onclick=()=>d.remove();document.body.appendChild(d);
}
const _scan=TTQR.scanner;
TTQR.scanner=function(onCode,opts){
  return _scan.call(this,async t=>{
    let o=null;try{o=await TTQR.decoder(t)}catch(e){}
    if(o&&o.t==='O'&&o.o){
      let code;try{code=await OUBLI.lire(o.o)}catch(e){throw new Error('Code illisible : ce groupe a été protégé par un autre appareil prof (restaurez votre sauvegarde).')}
      setTimeout(()=>montrer(o.n,o.c,code),300);
      return 'Code de '+((o.n||[]).join(', ')||'ce groupe')+' : '+code;
    }
    return onCode(t);
  },opts);
};
window.OubliProf=OUBLI;
})();
