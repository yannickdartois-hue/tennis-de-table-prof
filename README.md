# Tennis de table · outil prof (GAREEPS)

Lycée Georges Pompidou. Récupère les séances envoyées par l'appli élève (`tennis-de-table-eleves`), reconstruit les poules et fait le bilan pour la note. Fonctionne hors ligne sur iPad et PC.

Adresse : https://yannickdartois-hue.github.io/tennis-de-table-prof/

## Chaque année, sans toucher au code
1. **Classes** : importer l'export Pronote de chaque classe (xlsx, xls, csv, ou coller la liste) et coller le lien d'envoi en ligne (Nuage, « Demande de fichier ») de la classe.
2. **1er cours** : afficher le **QR de démarrage** de la classe ; chaque groupe le scanne dans l'appli élève.
3. **Chaque séance** : **Importer** (scanner les QR à la suite, ou fichiers .json / .zip du Nuage), **Appel** (présent, dispensé, rien reçu, corrections), **Tournoi** (poules et classement de la classe), **Élèves** (classement du cycle = moyenne des rangs ; fiche par élève, fusion de noms, **QR de reprise**), **Exporter** (3 CSV pour Excel).
4. **Fin d'année** : Classes → « Archiver l'année et repartir à zéro ».

Les données restent sur l'appareil : « Exporter une sauvegarde » / « Restaurer » (onglet Importer) pour passer de l'iPad au PC.

## Fichiers partagés avec l'appli élève
`donnees.js`, `logique.js`, `scan.js`, `qrcode.js`, `jsqr.js` sont des copies de ceux de `tennis-de-table-eleves` : en cas de modification, garder la même version dans les deux dépôts (les formats de QR et de fichiers en dépendent).

Bibliothèques : qrcode-generator (MIT), jsQR (Apache 2.0), JSZip (MIT), SheetJS (Apache 2.0). Polices : SIL OFL.

## Note, pilotage, suivi (19/10/2026) — `prof-plus.js`
- **Note** : barèmes des documents « Tennis de table — Évaluation de Première » et « … de Terminale (hors CCF) ».
  - Première : technique /5, tactique /2, **table et rang /5** = moyenne des tours notés (le 1er tour = calage) ; note d'un tour = M − S × (table − 1) − décote du rang, S = (M − m) ÷ P (M = 5, m = 0,6, P = nombre de tables, modifiables) ; décote arrondie au 0,05 (groupe de 3 : 0 / 0,2 / 0,4 ; de 4 : 0 / 0,15 / 0,25 / 0,4) ; AFL2 / AFL3 selon la répartition 6/2, 4/4, 2/6.
  - Terminale : technique /4, service /4 (avec le % de points de service gagnés en 3 frappes), victoires dans la poule /4 (0 V = 1 … 3 V = 4).
  - Technique, tactique/service, AFL2, AFL3 : choisis par le prof dans les fourchettes de degrés ; « suggestions » et aides tirées des séances (assiduité, exercices, matchs à thème, arbitrages), jamais une note automatique. Alertes ⚠ quand l'auto-évaluation est haute et le classement bas. Export CSV.
- **Pilotage** : poules du tour ou de la séance suivante (montante-descendante), élèves regroupés par thème avec tables proposées, élèves à voir en priorité.
- **Fiche élève** : courbe du rang dans la classe, étoile de début et de fin superposées, impression.
- **Fiabilité** : deux versions différentes d'une même poule → choix manuel ; nom hors liste → fusion proposée avec le nom le plus proche de la liste Pronote.
- **Tours** : séance 8, tour 2 = « 8.2 » (l'appli élève gère jusqu'à 4 tours par séance).

## Sauvegarde, observateur, projets (19/10/2026)
- Bandeau de sauvegarde (rouge sans sauvegarde ou au-delà de 7 jours), proposition de sauvegarde après chaque import, stockage persistant demandé au navigateur, invitation à installer l'outil sur l'écran d'accueil (sinon Safari peut effacer les données après 7 jours sans ouverture).
- Note : niveaux verts « vérifiés » par un observateur, validations faites pour les autres (AFL3), projets de jeu annoncés et réalisés (aide et suggestion pour « choix tactiques »), alerte si les niveaux verts sont rarement vérifiés.

## Groupes, codes du coach, copies de secours (19/10/2026)
- **Appel** : encadré « Groupes » — qui n'a rien envoyé (d'après le dernier groupe connu de chaque élève) et quels groupes ont envoyé (QR / en ligne, heure).
- **Codes du coach** (0-3, x) relevés au tableau de marque : visibles dans la fiche élève et dans les aides de la note ; les matchs codés comme arbitre-coach comptent pour la suggestion AFL3.
- **Copies de secours** (onglet Importer) : la clé est créée au premier « QR de démarrage » et rangée dans la sauvegarde de l'outil. Les fichiers `secours_….json` s'importent comme les autres ; « Télécharger le carnet » donne un fichier à reprendre sur une tablette (Mon groupe → Reprendre un carnet). Sans sauvegarde de l'outil, la clé et donc les copies sont perdues.
- Bandeau « Nouvelle version » quand l'outil est mis à jour.

## Mode démo (19/10/2026) — `prof-demo.js`
Bouton « Découvrir avec une classe fictive » (onglets Importer et Classes), ou adresse `…/tennis-de-table-prof/?demo`. Classe « DÉMO » de 24 élèves, 8 séances (poules montantes-descendantes, 4 tours en séance 8, absents, un dispensé, un changement de groupe à la séance 5, un groupe qui n'a envoyé que sa poule en séance 6, codes du coach). Les vraies données restent en mémoire et ne sont pas touchées : en démo rien n'est enregistré ; import, sauvegarde, restauration et effacement sont bloqués. « Quitter la démo » revient aux vraies données.

L'Appel signale aussi les élèves dont la **poule** est arrivée mais pas la **séance** (exercices et étoile restés sur la tablette).

## Poules du jour (19/10/2026) — `prof-poules.js`
Pilotage → « Poules du jour » : proposition à partir d'une séance (1er monte, dernier descend) ou du classement de la classe, modifiable le jour même (absent, dispensé, ↑/↓ d'une poule, arbitre dispensé, rééquilibrage 3 à 5, séance, tour, format). Un QR par poule (`t:'Q'`), affichable table par table ou imprimable sur une feuille. L'appli élève le scanne (Poule → « Scanner le QR de la poule ») : le formulaire se remplit et reste modifiable.

## Test automatique (avant chaque mise en ligne)
`tests/circuit.js` rejoue le circuit sur une classe fictive : import CSV, conflit de scores, tournoi du cycle, saisie rapide des notes, exports, code élève et anti-essais, hors ligne des 3 applis, débordements (téléphone, iPad, Galaxy Tab), cibles tactiles. Mode d'emploi en tête du fichier.
