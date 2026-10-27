/* aide.js — mode d'emploi de l'outil prof tennis de table (lu par eps-aide.js) */
window.EPS_AIDE={appli:'Tennis de table · Outil prof',bouton:false,pied:'Toutes les données restent sur cet appareil : pensez à la sauvegarde après chaque import.',publics:[
{id:'prof',titre:'Professeur',chapitres:[
{t:'Démarrer (rentrée)',html:`<ol><li><b>Classes</b> : importez l’export Pronote de chaque classe (xlsx, xls, csv, ou liste collée) et collez le lien d’envoi du Nuage (« Demande de fichier »).</li>
<li>Premier cours : affichez le <b>QR de démarrage</b> ; chaque groupe le scanne dans l’appli élève.</li>
<li>Installez l’outil sur l’écran d’accueil de l’iPad et faites une <b>sauvegarde</b> après chaque import.</li></ol>`},
{t:'Chaque séance',html:`<ul><li><b>Importer</b> : scannez les QR à la suite (la caméra reste ouverte), ou choisissez les fichiers .json / le .zip du Nuage. Réimporter ne crée pas de doublon.</li>
<li><b>Appel</b> : statut automatique (présent, dispensé, rien reçu), corrigeable : en retard, oubli de tenue, absent, absent justifié, oubli d’envoi. L’encadré « Groupes » dit qui n’a rien envoyé.</li>
<li><b>Pilotage</b> → « Poules du jour » : montante-descendante, un QR par poule à afficher table par table.</li>
<li><b>Tournoi</b> : poules et classement de la classe ; deux versions d’une même poule → vous choisissez.</li></ul>`},
{t:'Suivre et noter',html:`<ul><li><b>Élèves</b> : classement du cycle (moyenne des rangs), absences, dispenses, retards, oublis de tenue ; fiche élève avec courbe du rang et étoiles.</li>
<li><b>Note</b> : barèmes de Première et de Terminale (hors CCF). Les suggestions et aides viennent des séances ; c’est vous qui choisissez la note.</li>
<li><b>Exporter</b> : 3 fichiers CSV pour Excel.</li></ul>`},
{t:'Codes oubliés, changement de tablette',html:`<ul><li>Fiche de l’élève → <b>QR de reprise</b> : rend à l’élève son étoile, ses axes, ses matchs à thème et ses poules sur un nouveau carnet.</li>
<li>Copies de secours : arrivent avec l’envoi en ligne ; la clé est dans la sauvegarde de l’outil.</li></ul>`},
{t:'Sauvegarde, fin d’année',html:`<ul><li>Importer → <span class="bouton">Exporter une sauvegarde</span> / « Restaurer » pour passer de l’iPad au PC.</li>
<li>Classes → <span class="bouton">Archiver l’année et repartir à zéro</span>. À la rentrée, l’outil le rappelle s’il contient encore l’année précédente.</li></ul>`},
{t:'Démo pour un collègue',html:`<p>« Découvrir avec une classe fictive » (Importer, Classes) ou <b>…/tennis-de-table-prof/?demo</b> : vos vraies données ne sont pas touchées.</p>`}]}
]};
