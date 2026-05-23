# Panini WC 2026 – Mes doubles

Application web pour suivre sa collection de vignettes Panini FIFA World Cup 2026 (édition officielle). Permet de tracker les vignettes collées, les doubles, et d'analyser sa progression.

## Fonctionnalités

### Mon Album
- **992 vignettes** : 20 vignettes spéciales FWC, 960 vignettes équipes (48 équipes × 20), 12 vignettes exclusives Coca-Cola
- **48 équipes** organisées par groupe (A à L) dans l'ordre de l'album
- Incrémentation / décrémentation du nombre de copies par vignette
- **Saisie rapide par lot** — tape plusieurs IDs d'un coup (`FRA3 BRA7 ARG12`) pour enregistrer tout un paquet en quelques secondes
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

### Export / Import
- Export de la liste des doubles (texte lisible)
- Sauvegarde de la collection complète en JSON
- Restauration depuis un fichier JSON
- Remise à zéro de la collection

## Améliorations futures

### Utilité quotidienne
- **PWA** — installer l'app sur l'écran d'accueil du téléphone comme une vraie app native

### Échanges
- **Échange complet dans la saisie rapide** — lors d'un échange, pouvoir saisir à la fois la vignette reçue (ajoutée à la collection) et la vignette donnée (retirée de la collection), pour que les doubles soient toujours à jour après un échange
- **Liste des manquantes formatée** — générer un texte "il me manque : FRA 3, FRA 7, ARG 2…" prêt à copier-coller pour faciliter les demandes d'échanges
- **QR code / lien de partage** — encoder la liste de doubles dans une URL pour l'envoyer directement à quelqu'un
- **Mode comparaison** — importer le fichier JSON d'un ami (exporté depuis l'app) et comparer automatiquement les deux collections : afficher les vignettes que tu as en double et qu'il lui manque, et inversement celles qu'il a en double et qu'il te manquent. Résultat : une liste d'échanges possibles dans les deux sens, prête à partager.
- **Suivi des échanges** — enregistrer chaque échange réalisé : avec qui, quelles vignettes données, quelles vignettes reçues en retour. Les vignettes données sont automatiquement retirées des doubles disponibles. Un historique permet de retrouver tous les échanges passés avec leur date, et des stats globales indiquent combien de vignettes ont été données et reçues au total via les échanges.

### Statistiques avancées
- **Courbe de progression** — graphique montrant l'évolution de l'album dans le temps
- **Alertes de complétion d'équipe** — badge ou notification quand une équipe atteint 100%

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
