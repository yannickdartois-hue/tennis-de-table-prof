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
