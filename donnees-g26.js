/* =====================================================================
   donnees-g26.js — Parcours « GAREEPS 2026 » (SCE / SRP / STOM)
   D'après les fiches d'Arnaud Boissière (GAREEPS, version « cycle terminal »),
   avec les ajustements décidés le 12/11/2026 :
   - 4e branche « Tactique » au polygone (4 intentions = 4 branches = 4 SRP = 4 STOM) ;
   - « PAN ! » obligatoire pour le bonus KO, en SCE comme en SRP 3 ;
   - score parlant des SRP lu match par match, tranches sans chevauchement ;
   - paliers du polygone provisoires (réglables par le professeur) ;
   - atelier 3 de la STOM tactique renommé « le stratège ».
   Fichier IDENTIQUE dans tennis-de-table-eleves et tennis-de-table-prof.
   ===================================================================== */
const G26={
  // Les 4 branches du polygone = les 4 bonus = les 4 intentions
  br:[
    {k:'R',n:'Rapide',ic:'⚡',col:'#2563EB',srp:1,
     def:'2 frappes ou moins après son service',
     int:'Servir avec intention',sf:'Servir de façon régulière, plus fort, où je veux, avec effets (lifté ou coupé).',
     ip:['Poser des problèmes dès la mise en jeu.','Obtenir une balle d’attaque sur un retour timide.']},
    {k:'A',n:'Architecte',ic:'📐',col:'#16A34A',srp:2,
     def:'sans toucher la zone centrale adverse',
     int:'Proposer des trajectoires variées',sf:'Jouer hors du centre de la demi-table adverse, fixer le point faible, jouer un coup de plus que l’adversaire.',
     ip:['Obliger l’adversaire à s’adapter à des trajectoires différentes.','Le fatiguer.']},
    {k:'K',n:'KO',ic:'💥',col:'#DC2626',srp:3,
     def:'après avoir crié « PAN ! »',
     int:'Rompre l’échange au bon moment',sf:'Repérer une balle d’attaque favorable et frapper plus tôt ou plus fort pour rompre volontairement l’échange.',
     ip:['Marquer vite et économiser ses forces.','Obliger l’adversaire à ne pas donner de balle facile (le démotiver).']},
    {k:'T',n:'Tactique',ic:'🎯',col:'#7C3AED',srp:4,
     def:'avec son projet de jeu',
     int:'Identifier les caractéristiques adverses',sf:'Décrypter le jeu adverse pour mieux le contrer et appuyer là où cela le gêne.',
     ip:['Jouer là où ça gêne l’adversaire.','Ne plus perdre contre le même style de joueur.']}
  ],
  // Paliers du polygone (total sur les 2 matchs de la SCE) : 0-1 / 2-3 / 4-5 / 6 et +. Réglables par le prof (QR de classe).
  paliers:[2,4,6],
  // Score parlant d'un match de SRP : degré 1 < 20 ≤ degré 2 < 60 ≤ degré 3 < 80 ≤ degré 4
  degres:[20,60,80],
  // Étiquettes de la fiche « avant le match »
  faibles:{
    tech:{n:'Technique',L:['Revers','Coup droit','Service','Balles coupées','Balles liftées','Balles rapides']},
    tac:{n:'Tactique',L:['Joue toujours au centre','N’attaque jamais','Attaque trop tôt','Joue toujours au même endroit']},
    mob:{n:'Mobilité',L:['Lent sur les côtés','Collé à la table','Recule trop','Mal placé après son coup']},
    aff:{n:'Affectif',L:['S’énerve vite','Se déconcentre','Se décourage','Rien de particulier']}
  },
  forts:['Coup droit','Revers','Service coupé','Service rapide','Smash','Régularité','Placement'],
  srp:[
    {n:1,k:'R',t:'Le rapide',titre:'Servir avec intention',x:20,
     obj:'Le service est la 1re action tactique du point : tu peux faire ce que tu veux pour embêter l’adversaire, et tu as du temps !',
     bon:'Point gagné en 2 frappes ou moins après mon service',serv:true,
     q:[['Est-ce que je vise une zone particulière au service ? Laquelle et pourquoi ?','Est-ce que je sers fort ? Vite ? Quelle différence et quel intérêt ?','Est-ce que je sers avec effet ? Lequel ? Quelles conséquences sur la trajectoire ?'],
        ['Est-ce que je prends mon temps avant de servir ? Quel intérêt ?','Qu’est-ce que je dois regarder ?','Est-ce que j’imagine le déroulement du point après mon service ?']]},
    {n:2,k:'A',t:'L’architecte',titre:'Jouer dans les espaces libres (direction et profondeur)',x:10,
     obj:'Jouer où n’est pas mon adversaire et le déplacer.',
     bon:'Point gagné sans toucher « la zone interdite » pendant l’échange',
     q:[['Pourquoi jouer où n’est pas l’adversaire ?','Qu’est-ce qu’un « espace libre » ?','Que signifie « fixer l’adversaire » ? Où est-ce le plus intéressant ?'],
        ['Quels sont les paramètres des trajectoires ?','Quel intérêt de varier longueur et direction ?','Est-ce intéressant de se fixer des « routines » ? (« 3 fois long sur le revers puis amorti sur le coup droit »…)']]},
    {n:3,k:'K',t:'Le KO',titre:'Rompre l’échange au bon moment',x:10,
     obj:'Identifier une balle facile à attaquer pour volontairement jouer plus vite ou plus fort et terminer le point.',
     bon:'Point gagné juste après avoir crié « PAN ! » (attaque ou frappe suivante)',
     q:[['Qu’est-ce qu’une balle facilement attaquable ? (trajectoire, vitesse, point de chute)','Quelle différence entre jouer vite et jouer fort ?','Est-ce que j’anticipe et je construis ma rupture ?'],
        ['Suis-je plus à l’aise en coup droit ou en revers ?','Suis-je capable d’accélérer en coup droit ? En revers ?','Quelles conséquences sur mon jeu de jambes et mon placement ?']]},
    {n:4,k:'T',t:'Le tactique',titre:'Identifier les caractéristiques adverses',x:20,tm:6,
     obj:'Décrypter le jeu adverse pour mieux le contrer. Temps mort à 6 balles avec mon observateur ; balles 7 à 12 : j’appuie sur son point faible majeur.',
     bon:'Balles 7 à 12 : point gagné avec la tactique décidée au temps mort',
     q:[['Mon adversaire est-il plus à l’aise en coup droit ou en revers ?','Marque-t-il beaucoup de points gagnants ? Comment ?','Est-il mobile ou plutôt fixe ?'],
        ['Quel serait le point faible technique de mon adversaire ?','Comment puis-je l’exploiter ?']]}
  ],
  // STOM : 3 ateliers chacune. s = seuils [niveau 1, niveau 2] ; moins = « moins de » (museler) ;
  // ex = ton exercice le plus proche (image + vidéo) ; pr = ressemblance ('' quasi identique, 'proche', 'partielle').
  stom:[
    {k:'R',t:'Le rapide',titre:'Servir avec intention',at:[
      {n:1,t:'Servir sur une zone choisie',jeu:'Le jeu des cibles',b:20,u:'cible touchée',
       c:'Toucher le plus de fois possible sa cible sur 20 balles. Le joueur pose sa cible où il veut sur la demi-table adverse, en zone profonde (après les bandes posées sur la table).',
       cr:['Balle dans la paume, je la lance vers le haut d’environ 20 cm','Je la frappe quand elle redescend, avec un rebond dans mon camp (plus le rebond est loin de moi, plus le service est long)','J’oriente mon tamis vers la zone visée et je dose la force de ma frappe'],
       nv:['13 fois la grande cible','10 fois la petite cible'],s:[13,10],ex:'24',pr:'proche'},
      {n:2,t:'Servir fort',jeu:'Le jeu de massacre',b:10,u:'gobelet renversé',
       c:'Détruire les tours de gobelets sur 10 balles.',
       cr:['Je fais un rebond proche du milieu de ma table','Ma trajectoire est tendue et frôle le filet','Je dose la force de ma frappe tout en accompagnant la balle'],
       nv:['Faire tomber 1 tour (3 gobelets)','Renverser 6 gobelets'],s:[3,6],ex:'23',pr:'proche'},
      {n:3,t:'Servir avec les effets coupé et lifté',jeu:'La trancheuse',b:10,u:'effet réussi',
       c:'Réaliser les effets coupé et lifté au service sur 10 balles. Un Pom’do peut aider.',
       cr:['Je lance ma balle vers le haut','Coupé : je la tranche en biais vers le bas ; lifté : en biais vers le haut','J’oriente mon tamis vers la zone visée','Je fouette la balle avec mon poignet'],
       nv:['Réussir 5 effets','Réussir 7 effets en annonçant la demi-table visée'],s:[5,7],ex:'25',pr:'partielle'}]},
    {k:'A',t:'L’architecte',titre:'Jouer dans les espaces libres',at:[
      {n:1,t:'Éviter la zone centrale',jeu:'La zone interdite',b:10,u:'échanges d’un trait',
       c:'Sur 10 balles, réaliser le plus d’échanges avec mon partenaire sans toucher la zone centrale de son côté.',
       cr:['J’oriente mon tamis vers la zone visée en prise « revolver »','Je dose la force de ma frappe','J’alterne gauche / droite / court / long'],
       nv:['10 échanges d’un trait hors de la zone interdite','Idem en alternant gauche et droite'],s:[10,10],ex:'16',pr:''},
      {n:2,t:'Déplacer l’adversaire de gauche à droite',jeu:'L’essuie-glace',b:10,u:'échanges d’un trait',
       c:'Sur 10 balles, jouer alternativement à gauche et à droite sur mes 2 partenaires, qui ne jouent que sur mon coup droit. Réaliser le plus d’échanges avec une balle.',
       cr:['Je prépare mon coup droit en ouvrant le coude et en tirant la raquette vers l’arrière','Pour frapper, je replie le coude en tenant fort ma raquette','En revers, je reste face à la table : frappe « frisbee »','J’oriente mon tamis vers la zone visée'],
       nv:['10 échanges d’un trait en coup droit','10 échanges d’un trait en revers'],s:[10,10],ex:'17',pr:''},
      {n:3,t:'Savoir où jouer avant de frapper',jeu:'Le voyant',b:10,u:'échanges d’un trait',
       c:'Sur 10 balles, réaliser le plus d’échanges en annonçant avant de frapper le numéro de la zone visée.',
       cr:['Je connais le numéro des zones','J’annonce la zone visée avant de frapper','J’oriente mon tamis vers la zone visée','Je suis mobile, en appui sur la plante des pieds, pour frapper plus de balles avec mon côté fort'],
       nv:['7 échanges d’un trait, coup droit seulement','10 échanges d’un trait'],s:[7,10],ex:'19',pr:'proche'}]},
    {k:'K',t:'Le KO',titre:'Rompre l’échange au bon moment',at:[
      {n:1,t:'Accélérer chaque balle en coup droit',jeu:'La gifle',b:20,u:'smash',
       c:'Réaliser des smashs grâce aux partenaires qui, en jouant par le bas, visent la zone centrale de ma table. Un Pom’do peut aider.',
       cr:['Balle haute et lente au milieu de ma table : j’arme mon coup droit à hauteur d’épaule en dépliant le coude','Je frappe au sommet du rebond, le coude toujours sous la raquette','Je transfère mon poids vers la jambe avant en tournant le buste ; l’avant-bras se replie'],
       nv:['13 smashs qui touchent la demi-table adverse','10 smashs gagnants (non retournés)'],s:[13,10],ex:'31',pr:''},
      {n:2,t:'Attendre la balle favorable',jeu:'Le détective',b:20,u:'point gagné',
       c:'Jouer alternativement à gauche et à droite, zone revers interdite. À un moment, un partenaire joue une balle en cloche et lente : l’attaquer pour rompre l’échange.',
       cr:['Je prépare mon coup droit en tirant la raquette vers l’arrière','Pour frapper, je replie le coude en tenant fort la raquette et j’oriente mon tamis vers la zone visée'],
       nv:['7 points gagnés par accélération sur la balle facile','10 points gagnés'],s:[7,10],ex:'32',pr:'proche'},
      {n:3,t:'Prévoir la rupture',jeu:'Le chasseur',b:20,u:'point gagné après « PAN ! »',
       c:'Sur 20 balles, annoncer « PAN ! » avant de frapper, au moment où je compte terminer le point. Partenaire « neutre » : il ne prend pas l’avantage.',
       cr:['Je manœuvre mon partenaire pour obtenir une balle facile','Quand je repère une balle favorable, j’annonce « PAN ! »'],
       nv:['8 points gagnés juste après « PAN ! », partenaire neutre','Idem, partenaire « adversaire »'],s:[8,8],ex:'33',pr:''}]},
    {k:'T',t:'Le tactique',titre:'Identifier les caractéristiques adverses',at:[
      {n:1,t:'Servir varié',jeu:'L’incertitude',b:20,u:'point gagné vite',
       c:'Réaliser des services variés en vitesse, direction, hauteur et effet pour voir comment s’adapte le relanceur et où il est le moins à l’aise.',
       cr:['Avant de servir, je regarde le placement de l’adversaire et s’il est droitier ou gaucher ; dans le doute, je sers côté revers','Je modifie mes services à chaque point jusqu’à marquer facilement ; si je marque vite, je continue'],
       nv:['6 points gagnés en moins de 4 frappes, service compris','10 points gagnés en moins de 3 frappes'],s:[6,10],ex:null,pr:'nouveau'},
      {n:2,t:'Fixer le point faible adverse',jeu:'Le fixateur',b:20,u:'point gagné',
       c:'Jouer toutes mes frappes du même côté tant que je ne perds pas 2 points d’affilée ; sinon je change de côté. Je peux changer de côté seulement pour rompre l’échange.',
       cr:['Je commence côté revers, souvent le côté faible','J’utilise surtout mon coup fort pour viser ; je suis mobile','J’attends la faute adverse en variant mes trajectoires, ou je romps dans l’espace libre'],
       nv:['7 points gagnés en fixant un même côté','10 points gagnés'],s:[7,10],ex:'4',pr:'proche'},
      {n:3,t:'Museler l’adversaire',jeu:'Le stratège',b:20,u:'point marqué par l’adversaire avec son bonus',moins:true,
       c:'Mon adversaire annonce son bonus (rapide, architecte ou KO). Je dois à tout prix l’empêcher de marquer avec.',
       cr:['Dès que l’adversaire annonce son bonus, je cherche comment le contrer et j’en parle avec mon observateur','Je gagne du temps, je joue sur son point faible, je soigne déplacement, placement, replacement','Je suis mon plan de jeu pour le contrer'],
       nv:['Il marque moins de 8 points avec son bonus','Il marque moins de 5 points avec son bonus'],s:[8,5],ex:null,pr:'nouveau'}]}
  ],
  // Étoile AFL2 / AFL3 : descripteurs repris du « radar B » d'Arnaud (4 niveaux).
  role:[
    {k:'pj',afl:'AFL2',n:'Projet de jeu',d:['Non renseigné','Sommaire','Adapté','Pertinent pour gagner le match']},
    {k:'cc',afl:'AFL2',n:'Concentration',d:['Se laisse perturber facilement','Joue sans se soucier du déroulement du point','Lucide sur l’échange en cours','Idem, et anticipe l’évolution du match']},
    {k:'mo',afl:'AFL2',n:'Motivation',d:['Jet de raquette, râle contre l’adversaire','Râle contre soi','Reste calme en toutes circonstances','S’encourage et positive']},
    {k:'ob',afl:'AFL3',n:'Observateur',d:['Non préoccupé','Des erreurs','Appliqué','Fiable et utile pour le joueur']},
    {k:'at',afl:'AFL3',n:'Attitude',d:['Triche volontairement','Désaccords manifestes','Accepte de remettre le point en jeu','Loyal et positif']},
    {k:'ar',afl:'AFL3',n:'Arbitrage',d:['Ne connaît pas le règlement','Des erreurs','Maîtrise le règlement','Sait justifier une décision']}
  ],
  // Ordre des 4 matchs à la table : [joueur 1, joueur 2, observateur du 1, observateur du 2] (index 0 à 3 = A, B, C, D).
  // Au match suivant, chacun affronte celui qu'il vient d'observer.
  rot:[[0,1,2,3],[2,3,0,1],[0,2,1,3],[1,3,0,2]],
  balles:12
};
G26.brK=Object.fromEntries(G26.br.map(b=>[b.k,b]));
// Score parlant d'un match de SRP et son degré
G26.degre=s=>s>=G26.degres[2]?4:s>=G26.degres[1]?3:s>=G26.degres[0]?2:1;
// Niveau du polygone (0 à 4) pour un nombre de bonus
G26.niveau=(n,pal)=>{const p=pal||G26.paliers;return n>=p[2]?4:n>=p[1]?3:n>=p[0]?2:n>0?1:0};
if(typeof module!=='undefined')module.exports=G26;
