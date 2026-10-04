# Alentour

Application mobile de découverte, publication et réservation d'événements à
Abidjan (Côte d'Ivoire).

Ce fichier est **identique dans les deux dépôts**. La duplication est
volontaire : chaque côté doit connaître le contrat de l'autre. Toute
modification de ce fichier doit être répercutée dans l'autre dépôt dans la
même session, puis vérifiée par un `diff` entre les deux copies — une
modification n'est terminée que quand ce `diff` ne montre plus rien.

- `alentour` — application mobile Expo / React Native
- `alentour-api` — API NestJS

Détermine dans quel dépôt tu travailles et applique la section correspondante,
en plus du contrat partagé qui s'applique toujours.

---

## Produit

Deux faces :

- **Participants** — découvrent les événements triés par distance depuis leur
  position, réservent une place gratuitement, reçoivent un code de
  confirmation.
- **Organisateurs** — publient des événements et consultent leurs inscrits.

Toute publication est **modérée** : rien n'est visible publiquement avant
validation par un administrateur. La modération se fait depuis l'application
mobile, via un rôle `ADMIN` qui débloque un écran dédié. Il n'y a pas de
back-office séparé.

**Aucun paiement dans cette version.** Le modèle doit néanmoins permettre
d'attacher une table `Paiement` à une `Reservation` plus tard sans migration
destructrice.

---

## Contrat partagé

Cette section fait autorité sur les deux dépôts. Toute modification ici doit
être répercutée des deux côtés dans la même session.

### Nommage en français

Les champs de base de données, les types TypeScript et les clés JSON sont en
français : `titre`, `dateDebut`, `nombrePlaces`, `contactOrganisateur`. Les deux
dépôts utilisent exactement les mêmes noms. Ne traduis jamais un champ en
anglais « pour faire propre » — ça casse le contrat.

### Format d'erreur

Toutes les réponses d'erreur de l'API, sans exception :

```json
{ "erreur": { "code": "CAPACITE_INSUFFISANTE", "message": "..." } }
```

Codes en SCREAMING_SNAKE_CASE. Le `message` est destiné à l'affichage
utilisateur final, rédigé en français.

### Dates

ISO 8601 UTC partout, en entrée comme en sortie. La conversion vers l'heure
locale d'Abidjan est la responsabilité du client mobile.

### Identité

Le **téléphone** est l'identifiant principal, pas l'email — en Côte d'Ivoire
un utilisateur a toujours un numéro, pas toujours une adresse mail. L'email
est néanmoins **obligatoire** à l'inscription : c'est l'unique canal de
récupération de mot de passe (lien de réinitialisation envoyé par email), son
absence bloquerait ce parcours pour le compte concerné.

### Modèle de données canonique

**Utilisateur** — `id`, `nom`, `telephone` (unique), `email` (obligatoire,
unique), `motDePasseHash`, `role` (`PARTICIPANT` | `ORGANISATEUR` | `ADMIN`),
`createdAt`

**Evenement** — `id`, `titre`, `slug`, `description`, `image`, `categorie`
(`CONCERT` | `SOIREE` | `CONFERENCE` | `SPORT` | `CULTURE` | `RELIGIEUX`),
`dateDebut`, `dateFin` (nullable), `prix` (nullable, `null` = gratuit),
`capacite` (nullable, `null` = illimité), `latitude`, `longitude`, `adresse`,
`commune`, `statut` (`EN_ATTENTE` | `PUBLIE` | `REFUSE`),
`motifRefus` (nullable), `organisateurId`, `contactOrganisateur`, `createdAt`,
`updatedAt`

**Reservation** — `id`, `evenementId`, `utilisateurId`, `nombrePlaces`, `code`
(unique, court et lisible, sert de QR code), `statut` (`CONFIRMEE` | `ANNULEE`
| `UTILISEE`), `createdAt`, `utiliseeLe` (nullable)

### Endpoints

Préfixe global `/api`.

```
POST   /auth/inscription
POST   /auth/connexion
POST   /auth/mot-de-passe-oublie      envoie un lien de réinitialisation par email
POST   /auth/mot-de-passe-reinitialisation
GET    /evenements                    filtres : lat, lng, rayonKm, categorie,
                                      dateMin, dateMax
GET    /evenements/:id
POST   /evenements                    authentifié
PATCH  /evenements/:id                propriétaire uniquement
GET    /moi/evenements                mes publications, tous statuts
GET    /moi/reservations
POST   /evenements/:id/reservations
GET    /evenements/:id/reservations   liste des inscrits, propriétaire uniquement
DELETE /reservations/:id              annulation par le participant
POST   /reservations/valider          scan à l'entrée par l'organisateur
GET    /admin/evenements              ADMIN — file de modération
PATCH  /admin/evenements/:id/statut   ADMIN
```

N'invente aucun endpoint hors de cette liste. Si un besoin apparaît,
signale-le, ne l'implémente pas de ton propre chef.

### Règles de domaine

Ces règles sont du métier, pas du style. Les enfreindre produit des bugs
silencieux.

1. **Le tri par distance se fait en SQL**, jamais en JavaScript. `$queryRaw`
   avec la formule de haversine, précédée d'un filtre par bounding box pour
   exploiter l'index sur `(latitude, longitude)`.
2. **Pas de PostGIS.** Le projet doit tourner sur n'importe quel PostgreSQL
   managé sans extension.
3. **La réservation est une transaction.** Vérifier la capacité puis insérer en
   deux requêtes séparées laisse passer les surréservations en concurrence.
   Transaction avec un niveau d'isolation adapté, choix justifié en commentaire.
4. **Une seule réservation active par utilisateur et par événement.**
   Contrainte imposée par la base, pas seulement par le code.
5. **Seuls les événements en statut `PUBLIE` sortent des endpoints publics.**
   Un `EN_ATTENTE` ou `REFUSE` ne fuite jamais, même par accès direct à son
   identifiant.
6. **La propriété est vérifiée côté serveur.** Un organisateur ne modifie que
   ses propres événements. Ne fais jamais confiance à un identifiant transmis
   par le client pour déterminer qui agit.

---

## Dépôt `alentour-api` — backend

### Stack

- NestJS, TypeScript strict
- Prisma + PostgreSQL
- `class-validator` + `class-transformer` pour les DTO
- `@nestjs/swagger` — documentation OpenAPI exposée sur `/docs`
- `@nestjs/jwt` + Passport, mots de passe hachés avec argon2

### Commandes

```bash
npm run start:dev        # serveur de développement
npx prisma migrate dev   # créer et appliquer une migration
npx prisma studio        # inspecter la base
npm run seed             # peupler la base de test
npx tsc --noEmit         # doit passer avant tout commit
npm run test             # tests unitaires
```

### Structure

```
src/
  main.ts               ValidationPipe global, filtre d'exception, Swagger
  app.module.ts
  prisma/               PrismaModule global + PrismaService
  common/
    filters/            filtre d'exception produisant le format d'erreur unique
    guards/             JwtAuthGuard, RolesGuard
    decorators/         @UtilisateurActuel, @Roles
  auth/
  utilisateurs/
  evenements/
  reservations/
  admin/
```

### Règles

- **Les contrôleurs restent minces.** Ils reçoivent un DTO validé, appellent un
  service, retournent le résultat. Aucune requête Prisma dans un contrôleur ;
  toute la logique métier vit dans les services.
- **`ValidationPipe` global** avec `whitelist: true`,
  `forbidNonWhitelisted: true` et `transform: true`. Aucune validation
  manuelle dans les contrôleurs.
- **Le format d'erreur est produit par un filtre d'exception global**, jamais
  construit à la main dans un service.
- **Les rôles passent par un guard**, jamais par un `if` dans un contrôleur.
- **Chaque DTO est décoré pour Swagger.** La documentation OpenAPI est le
  contrat officiel de l'app mobile ; si elle est fausse, l'app casse.
- Aucun `any`, aucun cast de confort.

---

## Dépôt `alentour` — application mobile

### Stack

- Expo SDK 57, React Native 0.86, TypeScript strict
- Expo Router (routage par fichiers)
- NativeWind 4.2 + Tailwind 3.4
- TanStack Query pour l'état serveur
- `expo-location`, `react-native-maps`

### Commandes

```bash
npx expo start           # puis 'a' pour l'émulateur Android
npm run lint             # tsc --noEmit
```

### Structure

```
app/                     routes UNIQUEMENT
  _layout.tsx            providers + Stack
  (tabs)/                Autour de moi, Carte, Favoris
  evenement/[id].tsx
src/
  components/            composants d'UI réutilisables
  features/events/       accès aux données
  lib/                   distance, position, client Query
  types/                 modèles de données
```

### Règles

- **`app/` ne contient que des routes.** Tout fichier utilitaire placé là
  devient un écran fantôme dans la navigation. La logique va dans `src/`.
- **`src/features/*/api.ts` est le seul point de contact avec l'API.** Aucun
  `fetch` ailleurs dans l'application.
- **Style par classes NativeWind**, pas de `StyleSheet.create` sauf pour les
  dimensions calculées dynamiquement.
- **`FlatList` pour toute liste**, jamais `.map()` sur un tableau de données
  distantes.
- Pas de `localStorage` — `AsyncStorage` pour les données ordinaires,
  `SecureStore` pour le jeton d'authentification. **Exception ciblée pour le
  web** : `expo-secure-store` n'a aucune implémentation web (module vide) et
  le navigateur n'a de toute façon pas d'équivalent Keychain/Keystore natif ;
  `src/lib/authStorage.ts` bascule sur `localStorage` uniquement quand
  `Platform.OS === "web"`, sur SecureStore partout ailleurs. Le web est la
  cible de dev principale sur ce poste (émulateur Android non supporté),
  d'où cette exception explicitement actée plutôt qu'un simple contournement.
- Les libellés affichés à l'utilisateur sont en français.

### Pièges d'environnement déjà réglés — ne pas défaire

- `react-dom` est épinglé à `19.2.3` via `overrides` dans `package.json`. Sans
  ça, `expo-router` tire `react-dom@19.2.8` qui exige `react ^19.2.8` alors que
  le SDK 57 fige `react` à `19.2.3` → `ERESOLVE` au premier `npm install`.
- `babel-preset-expo` est déclaré explicitement en devDependency. Le template
  `blank-typescript` ne l'inclut pas et Metro échoue au premier bundle.
- Reanimated 4 utilise le plugin `react-native-worklets/plugin`, pas l'ancien
  `react-native-reanimated/plugin`.
- L'URL de l'API dépend de la cible : `http://10.0.2.2:3000` depuis
  l'émulateur Android, l'IP du poste sur le réseau local depuis un téléphone
  physique.

---

## Ce qu'il ne faut pas faire

- Pas de logique de paiement, pas de dépendance à un prestataire de paiement.
- Pas de nouvelle dépendance sans me demander d'abord.
- Pas de `console.log` laissé dans le code livré.
- Pas de secret en dur. Tout passe par des variables d'environnement, et
  `.env.example` est tenu à jour à chaque ajout.

---

## Workflow Git

- **Jamais de commit direct sur `main`.**
- **Une branche par sujet**, créée depuis `main` à jour (`git checkout main
  && git pull` avant chaque création), nommée `type/description-courte` :
  `feat`, `fix`, `securite`, `chore`, `docs`, `test`.
- **Commits au format Conventional Commits** (`feat:`, `fix:`, `chore:`,
  `docs:`, `securite:`, `test:`…), rédigés en français.
- **Une PR par branche**, ouverte avec `gh pr create` en remplissant le
  template (`.github/pull_request_template.md`).
- **Ne jamais merger soi-même une PR, ne jamais force-push, ne jamais
  modifier la configuration de protection de branche.**
- **S'arrêter après l'ouverture de la PR** et attendre la validation avant
  de continuer.

---

## Méthode de travail

Je suis développeur fullstack et ce projet est le mien : je veux comprendre
chaque décision, pas hériter d'un code que je n'ai pas lu.

- Avance par étapes courtes et **arrête-toi pour validation** après chacune.
  N'enchaîne pas plusieurs couches d'un coup.
- Quand un choix d'implémentation a plusieurs options défendables, **présente
  les options** avec leurs compromis au lieu de trancher seul.
- Explique le *pourquoi* d'une décision d'architecture, pas seulement le
  *comment*.
- **Après toute modification du modèle de données, signale explicitement ce
  qui doit changer dans l'autre dépôt.** C'est la source de bug la plus
  probable de ce projet.

---

## État actuel

Les deux dépôts sont fonctionnels et branchés l'un sur l'autre (audit complet
dans `docs/ETAT_DES_LIEUX.md`, côté `alentour-api`).

- `alentour-api` — API complète pour l'authentification (inscription,
  connexion, récupération de mot de passe par email), les événements
  (recherche géolocalisée en SQL, publication, modération) et les
  réservations (transaction avec verrou de ligne contre la surréservation).
  CORS grand ouvert et absence de rate limiting restent à corriger avant tout
  déploiement au-delà d'un poste de dev.
- `alentour` — écrans participant, organisateur, authentification et
  modération ADMIN entièrement branchés sur l'API réelle, plus aucune donnée
  en dur. Restent à terminer : l'onglet Carte (placeholder, clés Google Maps
  non configurées) et les écrans de récupération de mot de passe (les
  endpoints existent déjà côté API).

Prochaine étape : durcissement sécurité de l'API (CORS restreint, rate
limiting, révocation de session) et alignement des réponses de mutation sur
celles des lectures.
