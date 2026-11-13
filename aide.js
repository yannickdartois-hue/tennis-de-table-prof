/* aide.js — mode d'emploi de l'outil prof tennis de table (lu par eps-aide.js) */
window.EPS_AIDE={appli:'Tennis de table · Outil prof',bouton:false,pied:'Toutes les données restent sur cet appareil : pensez à la sauvegarde après chaque import.',publics:[
{id:'prof',titre:'Professeur',chapitres:[
{t:'🔑 Code du cours (chaque cours)',html:`<ol>
<li>Les élèves utilisent leur téléphone : sans verrou, ils pourraient remplir chez eux des séances à l’avance. Le code du cours l’empêche.</li>
<li>Début de cours : Classes → <span class="bouton">🔑 Code du cours</span>, vérifiez la séance, écrivez les 4 chiffres au tableau.</li>
<li>Chaque groupe tape le code : la séance du jour s’ouvre sur son téléphone pendant 2 heures. Sans code, l’appli se consulte mais on ne peut rien saisir.</li>
<li>Le code ne vaut que pour cette séance et ce jour-là. Pour préparer un cours, changez la date : le code s’affiche à l’avance. Aucune connexion nécessaire.</li>
</ol><p class="astuce">Une seule fois après cette mise à jour : refaites scanner le <b>QR de démarrage</b> (il apporte la clé de la classe). Tant qu’un téléphone ne l’a pas rescanné, il n’est pas verrouillé.</p>`},

{t:'Démarrer (rentrée)',html:`<ol><li><b>Classes</b> : importez l’export Pronote de chaque classe (xlsx, xls, csv, ou liste collée) et collez le lien d’envoi du Nuage (« Demande de fichier »).</li><li><b>Toutes les classes d’un coup</b> : le fichier fait par la page « Mes classes » du portail mon-EPS. <b>Élève arrivé en cours d’année</b> : collez « NOM Prénom » avec le nom de la classe → « Ajouter ces élèves ». Classe déjà présente : l’appli demande toujours « Ajouter » ou « Remplacer la liste ». Ensuite, faites rescanner le QR de démarrage.</li>
<li>Premier cours : affichez le <b>QR de démarrage</b> ; chaque groupe le scanne dans l’appli élève.</li>
<li>Installez l’outil sur l’écran d’accueil de l’iPad et faites une <b>sauvegarde</b> après chaque import.</li></ol>`},
{t:'Chaque séance',html:`<ul><li><b>Importer</b> : scannez les QR à la suite (la caméra reste ouverte), ou choisissez les fichiers .json / le .zip du Nuage. Réimporter ne crée pas de doublon.</li>
<li><b>Appel</b> : statut automatique (présent, dispensé, rien reçu), corrigeable : en retard, oubli de tenue, absent, absent justifié, oubli d’envoi. L’encadré « Groupes » dit qui n’a rien envoyé.</li>
<li><b>Pilotage</b> → « Poules du jour » : montante-descendante, un QR par poule à afficher table par table.</li>
<li><b>Tournoi</b> : poules et classement de la classe ; deux versions d’une même poule → vous choisissez.</li></ul>`},
{t:'Suivre et noter',html:`<ul><li><b>Élèves</b> : classement du cycle (moyenne des rangs), absences, dispenses, retards, oublis de tenue ; fiche élève avec courbe du rang et étoiles.</li>
<li><b>Note</b> : barèmes de Première et de Terminale (hors CCF). Les suggestions et aides viennent des séances ; c’est vous qui choisissez la note.</li>
<li><b>Exporter</b> : 3 fichiers CSV pour Excel.</li></ul>`},
{t:'Codes oubliés, changement de tablette',html:`<p>Le groupe touche « Code oublié ? ». Si un QR s’affiche, scannez-le avec le scanner de l’outil : le code s’affiche. Sinon (carnet pas encore protégé), la marche à suivre est dans l’onglet Classes, carte « Un groupe a oublié son code ».</p><p>Pour protéger les groupes : faites rescanner le QR de la classe, puis chaque groupe ouvre son carnet avec son code. Gardez votre sauvegarde : elle contient la clé qui lit les codes.</p><ul><li><b>Changement de tablette</b> : fiche de l’élève → <b>QR de reprise</b> : rend à l’élève son étoile, ses axes, ses matchs à thème et ses poules sur un nouveau carnet.</li><li>Copies de secours : arrivent avec l’envoi en ligne ; la clé est dans la sauvegarde de l’outil.</li></ul>`},
{t:'Sauvegarde, fin d’année',html:`<ul><li>Importer → <span class="bouton">Exporter une sauvegarde</span> / « Restaurer » pour passer de l’iPad au PC.</li>
<li>Classes → <span class="bouton">Archiver l’année et repartir à zéro</span>. À la rentrée, l’outil le rappelle s’il contient encore l’année précédente.</li></ul>`},
{t:'Démo pour un collègue',html:`<p>« Découvrir avec une classe fictive » (Importer, Classes) ou <b>…/tennis-de-table-prof/?demo</b> : vos vraies données ne sont pas touchées.</p>`},
{t:'Parcours GAREEPS 2026 (par classe)',html:`<ol><li><b>Classes</b> → « Parcours de la classe » : <b>Étoile 7 axes (actuel)</b> ou <b>GAREEPS 2026 (SCE / SRP / STOM)</b>. Les autres classes ne changent pas.</li>
<li>Réglez les paliers du polygone (2 / 4 / 6 par défaut), puis faites scanner le <b>QR de démarrage</b>.</li>
<li><b>Au début des SCE n°2 et n°3, refaites scanner le QR de démarrage</b> : il apporte aux téléphones les polygones et les choix déjà reçus.</li>
<li>Onglet <b>GAREEPS</b> : polygones des 3 SCE, choix, meilleur degré par SRP, ateliers STOM validés, tables reçues et élèves sans table.</li></ol>
<p class="astuce">La SCE se joue à 4 avec un seul téléphone ; la table envoie un fichier « …_Table4_S5_sce2.json » ou un QR « SCE ».</p>`},
{t:'Tournoi ATP et Grist (en direct)',html:`<ul><li>Barème d’Arnaud : 5,5 à 1 point selon l’écart de rang au début de la séance, 0,5 pour une défaite, −2 pour un refus (bouton « −2 » de l’onglet <b>ATP</b>).</li>
<li><b>Direct par internet</b> : un seul document Grist pour toutes les classes, partagé en « Accès public : éditeur » (aucune clé). Collez son adresse dans Classes → « Tournoi ATP en direct », puis refaites scanner le QR de démarrage. Seuls prénom et initiale vont dans Grist.</li>
<li>Sans internet, les matchs arrivent par la borne ou avec l’envoi des séances. Un match n’est jamais compté deux fois.</li>
<li>Paliers des avatars (onglet ATP) : 10 / 20 / 30 points par défaut, à ajuster après la 1re séance.</li></ul>`},
{t:'Mode borne (tablette sur trépied)',html:`<ol><li>Onglet <b>ATP</b> → <span class="bouton">📷 Mode borne</span> : tableau arcade en grand, caméra en bas à gauche (🔄 pour changer de caméra). Branchez la tablette sur secteur, son activé.</li>
<li>Après chaque match, l’arbitre montre le QR de son téléphone : bip, effet (victoire, boss vaincu), classement à jour.</li>
<li><b>Borne sur une autre tablette</b> : ouvrez l’outil prof dessus, lancez le mode borne et montrez-lui le <b>QR de démarrage</b> de la classe (liste, classement de départ, paliers, avatars).</li></ol>`},
{t:'Étoile AFL2 / AFL3 et note GAREEPS',html:`<ul><li>Onglet <b>GAREEPS</b>, en bas : l’<b>étoile AFL2 / AFL3</b>, avec 6 descripteurs (projet de jeu, concentration, motivation, observateur, attitude, arbitrage) notés de 1 à 4. Les repères (projets écrits, SRP observées, matchs arbitrés) disent combien de fois, pas si c’était bien fait.</li>
<li>Onglet <b>Note</b> : barème <b>GAREEPS 2026</b> (provisoire). L’AFL1 /12 = SRP /5 (2 meilleurs matchs) + polygone /5 (bonus de la dernière SCE et anneaux gagnés sur les priorités) + ATP /2. Pour la remplacer, écris ta note dans la case.</li>
<li>AFL2 et AFL3 : tu choisis dans les fourchettes habituelles ; « D3 » rappelle le degré moyen de l’étoile.</li></ul>`},
{t:'Démos pour les collègues',html:`<ul><li><b>…/tennis-de-table-prof/?demo=g26</b> : classe fictive de 16 élèves (SCE, SRP, STOM, ATP, avatars).</li>
<li><span class="bouton">▶ Démo de la borne</span> : un faux match toutes les 7 secondes, idéal en salle des profs.</li>
<li><b>…/tennis-de-table-eleves/?demo=g26</b> : l’appli élève sur le parcours GAREEPS 2026.</li></ul>`}]}
]};
