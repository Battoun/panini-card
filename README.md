# Panini WC 2026 – Mes doubles

Application web pour suivre sa collection de vignettes Panini FIFA World Cup 2026 (édition officielle). Permet de tracker les vignettes collées, les doubles, et d'analyser sa progression.

## Fonctionnalités

### Mon Album
- **992 vignettes** : 20 vignettes spéciales FWC, 960 vignettes équipes (48 équipes × 20), 12 vignettes exclusives Coca-Cola
- **48 équipes** organisées par groupe (A à L) dans l'ordre de l'album
- Incrémentation / décrémentation du nombre de copies par vignette
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
