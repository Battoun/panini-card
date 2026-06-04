# Panini WC 2026 – Mes doubles

Application web pour suivre sa collection de vignettes Panini FIFA World Cup 2026 (édition officielle). Synchronisée dans le cloud, accessible depuis n'importe quel appareil.

## Fonctionnalités

### Mon Album
- **992 vignettes** : 20 vignettes spéciales FWC, 960 vignettes équipes (48 équipes × 20), 12 vignettes exclusives Coca-Cola
- **48 équipes** organisées par groupe (A à L) dans l'ordre de l'album
- Incrémentation / décrémentation du nombre de copies par vignette
- **Confirmation avant décrémentation à zéro** — évite les fausses manips
- **Saisie rapide par lot** — tape plusieurs IDs d'un coup (`FRA3 BRA7 ARG12`) pour enregistrer tout un paquet en quelques secondes
- **Échange complet** — dans la saisie rapide, saisir les vignettes reçues et données, avec avertissement si tu donnes une vignette dont tu n'as pas de double
- **Filtres** : Toutes / Manquantes / Collées / Doubles / 🎯 Presque — équipes à 90%+ avec leurs vignettes manquantes
- **Recherche** par nom de joueur, numéro ou équipe
- **Filtre par équipe** avec menu déroulant groupé par poule
- **Barre de progression par groupe** — taux de complétion dans chaque header de groupe A–L
- **Badge ✓ Complète** + toast de célébration quand une équipe atteint 100%

### Statistiques
- Suivi du nombre de paquets ouverts (1 paquet = 7 vignettes = 1,50 €)
- Calcul automatique du budget dépensé et coût moyen par vignette collée
- **3 barres de progression** : standards (980), Coca-Cola (12), total (992)
- Top 5 / Flop 5 équipes par taux de complétion
- Top 3 équipes avec le plus de doubles
- Liste des vignettes en triple ou plus
- **Équipes complètes** — section dédiée avec toutes les équipes à 100%
- **Échanges effectués** — compteurs cartes données / reçues, modifiables manuellement
- **Historique des échanges** — 20 derniers échanges avec bouton Annuler (remet les cartes en place)

### Échanges
- **Mode comparaison** — colle le JSON d'un ami pour voir ce qu'il peut te donner et ce que tu peux lui donner
- Sélection manuelle ou **aléatoire** de la paire de cartes à échanger
- Validation : vérifie que tu as bien un double à donner et que tu n'as pas encore la carte à recevoir
- **Historique persisté** — les 5 derniers échanges dans la comparaison, annulables

### Compte & synchronisation
- **Inscription** avec email, mot de passe et pseudo (unique, visible par les amis)
- **Connexion** sécurisée via Supabase Auth
- **Collection synchronisée dans le cloud** — retrouve exactement la même collection sur tous tes appareils en te connectant
- **Sauvegarde manuelle** — bouton dans Exporter / Partager → Sauvegarder pour forcer la mise en base
- **Page de profil** — pseudo, email, date d'inscription, déconnexion

### Amis
- **Recherche d'amis** par pseudo
- **Demandes d'amis** — envoi, acceptation, refus, annulation
- **Progression de ses amis** — barre de complétion colorée visible sur la carte de chaque ami
- **Détail d'un ami** — modal avec % global, équipes complètes, top 5 équipes, nombre de doubles
- **Échanges disponibles** — onglet dédié dans le modal : cartes que l'ami peut te donner (ses doubles que tu n'as pas) et cartes que tu peux lui donner (tes doubles qu'il n'a pas), calculé en temps réel depuis vos deux collections cloud

### Export / Import
- Export de la liste des doubles (texte lisible)
- **Lien de partage + QR code** — génère un lien encodé et un QR code à scanner
- Export de la liste des manquantes groupée par équipe
- Sauvegarde de la collection complète en JSON (local)
- Restauration depuis un fichier JSON
- Remise à zéro de la collection

### Interface
- **Thème clair / sombre** — toggle dans le header avec détection automatique des préférences système
- **Design responsive** — optimisé mobile (5 cartes par ligne, header pleine largeur, viewport meta)

## Améliorations futures




## Stack technique

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com) v4
- [Supabase](https://supabase.com) — Auth + base de données PostgreSQL (collection cloud, profils, amis)
- Persistance locale via `localStorage` (cache) + synchronisation cloud

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) dans ton navigateur.

### Variables d'environnement requises

Crée un fichier `.env.local` à la racine :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```
