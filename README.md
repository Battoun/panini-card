# Panini WC 2026 – Mes doubles

Application web pour suivre sa collection de vignettes Panini FIFA World Cup 2026 (édition officielle). Permet de tracker les vignettes collées, les doubles, et d'analyser sa progression.

## Fonctionnalités

### Mon Album
- **992 vignettes** : 20 vignettes spéciales FWC, 960 vignettes équipes (48 équipes × 20), 12 vignettes exclusives Coca-Cola
- **48 équipes** organisées par groupe (A à L) dans l'ordre de l'album
- Incrémentation / décrémentation du nombre de copies par vignette
- **Saisie rapide par lot** — tape plusieurs IDs d'un coup (`FRA3 BRA7 ARG12`) pour enregistrer tout un paquet en quelques secondes
- **Échange complet** — dans la saisie rapide, saisir les vignettes reçues (ajoutées) et les vignettes données (retirées), avec avertissement si tu donnes une vignette dont tu n'as pas de double
- **Filtres** : Toutes / Manquantes / Collées / Doubles
- **Recherche** par nom de joueur, numéro ou équipe
- **Filtre par équipe** avec menu déroulant groupé par poule

### Statistiques
- Suivi du nombre de paquets ouverts (1 paquet = 7 vignettes = 1,50 €)
- Calcul automatique du budget dépensé et coût moyen par vignette collée
- Barre de progression de l'album (% de complétion)
- Top 5 / Flop 5 équipes par taux de complétion
- Top 3 équipes avec le plus de doubles
- Liste des vignettes en triple ou plus
- **Équipes complètes** — section dédiée listant toutes les équipes à 100%, avec badge vert dans l'album et toast de célébration au moment où tu colles la dernière vignette d'une équipe

### Export / Import
- Export de la liste des doubles (texte lisible)
- **Lien de partage + QR code** — génère un lien encodé et un QR code à scanner ; la personne qui ouvre le lien voit directement ta liste de doubles disponibles
- Export de la liste des manquantes groupée par équipe, prête à copier-coller pour les échanges
- Sauvegarde de la collection complète en JSON
- Restauration depuis un fichier JSON
- Remise à zéro de la collection

### Interface
- **Thème clair / sombre** — toggle dans le header pour basculer entre mode clair et mode sombre, avec détection automatique des préférences système et sauvegarde de la préférence

## Améliorations futures

### Échanges
- **Mode comparaison** — importer le fichier JSON d'un ami (exporté depuis l'app) et comparer automatiquement les deux collections : afficher les vignettes que tu as en double et qu'il lui manque, et inversement celles qu'il a en double et qu'il te manquent. Résultat : une liste d'échanges possibles dans les deux sens, prête à partager.
- **Suivi des échanges** — enregistrer chaque échange réalisé : avec qui, quelles vignettes données, quelles vignettes reçues en retour. Les vignettes données sont automatiquement retirées des doubles disponibles. Un historique permet de retrouver tous les échanges passés avec leur date, et des stats globales indiquent combien de vignettes ont été données et reçues au total via les échanges.


## Stack technique

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- Persistance via `localStorage` (aucun backend requis)

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) dans ton navigateur.
