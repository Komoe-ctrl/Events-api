# État des lieux — Alentour (app mobile + backend)

Document produit en lecture seule, à partir de l'exploration réelle du code
des deux dépôts (`c:\alentour` — app mobile — et `c:\alentour-api` —
backend). Sauf mention contraire, chaque affirmation est **constatée dans le
code**, pas supposée. Quand une hypothèse est nécessaire faute d'information
lisible dans le code, c'est signalé explicitement.

**Constat préalable important** : le fichier `CLAUDE.md` (identique dans les
deux dépôts) contient une section « État actuel » qui affirme que
`src/features/events/api.ts` renvoie des données en dur et que
`alentour-api` est un dépôt vide. **Les deux affirmations sont fausses
aujourd'hui** — cette section est obsolète et n'a pas été mise à jour au fil
du développement. Le reste de `CLAUDE.md` (contrat de nommage, endpoints,
règles de domaine) reste en revanche fiable et confirmé par le code des deux
côtés.

**Structure des dépôts** : deux dépôts Git séparés (pas un monorepo), chacun
avec sa propre branche courante :
- `c:\alentour` — branche `inventaire-confidentialite`, à jour avec origin,
  working tree propre.
- `c:\alentour-api` — branche `lint-warnings-main`, à jour avec origin,
  working tree propre.

Les deux ont de nombreuses branches de feature déjà mergées, cohérent avec
une méthode de développement incrémental par petites étapes validées.

**Correction post-audit (2026-09-21)** : cet audit a été réalisé sur la
branche `inventaire-confidentialite` du dépôt mobile. `git pull` sur `main`
a ensuite révélé que la branche `moderation-admin` (PR #10), déjà mergée sur
`origin/main` mais absente de `inventaire-confidentialite`, implémente
entièrement l'écran de modération ADMIN (`app/moderation.tsx` +
`app/moderation/[id].tsx`, liste + approbation/refus branchés sur l'API
réelle). Toutes les mentions ci-dessous qui décrivaient cet écran comme un
placeholder ont été corrigées en conséquence — signalé explicitement à
chaque endroit concerné plutôt que réécrit silencieusement.

---

## Partie A — App mobile (`c:\alentour`)

### A.1 Stack et santé

**Versions réelles** (`package.json`) : Expo `~57.0.11` (SDK 57), React
Native `0.86.2`, React/React DOM `19.2.3` (forcés via `overrides`),
TypeScript `~6.0.3`, NativeWind `^4.2.6`, Tailwind `^3.4.17`, TanStack Query
`^5.101.4`, Expo Router `~57.0.11`, expo-location `~57.0.8`,
react-native-maps `^1.27.2`, expo-camera `~57.0.3`,
react-native-qrcode-svg, react-native-reanimated `^4.5.1` (+
react-native-worklets), expo-secure-store, AsyncStorage.

`overrides.react-dom/react = 19.2.3` et `babel-preset-expo` en devDependency
explicite : les deux contournements documentés dans `CLAUDE.md` sont bien en
place et toujours nécessaires (confirmé par lecture directe de
`package.json`).

`app.json` : bundle id `ci.alentour.app`, `newArchEnabled: true`,
`typedRoutes: true`. **Clés Google Maps non renseignées** —
`ios.config.googleMapsApiKey` et `android.config.googleMaps.apiKey` sont
encore les placeholders `"REMPLACER_PAR_TA_CLE_IOS"` /
`"REMPLACER_PAR_TA_CLE_ANDROID"`.

**`npx tsc --noEmit`** : ✅ aucune erreur.

**`npx expo-doctor`** : 18/21 checks passés, 3 échecs :
1. Schéma `app.json` invalide : `newArchEnabled` mal placé, `splash`
   déplacé dans les versions récentes d'Expo, `android.edgeToEdgeEnabled`
   non reconnu ; en plus, `android.adaptiveIcon.foregroundImage` pointe vers
   `./assets/adaptive-icon.png`, **fichier absent** du dossier `assets/`
   (qui contient les icônes adaptatives sous d'autres noms :
   `android-icon-foreground.png` etc., jamais raccordées à cette clé).
2. `expo-font` (peer dependency de `@expo/vector-icons`) absent de
   `package.json` — risque de crash hors Expo Go signalé par l'outil.
3. 12 paquets Expo en retard de patchs sur le SDK 57 (`expo`, `expo-router`,
   `react-native`, `expo-camera`, `expo-location`, `expo-secure-store`,
   etc.) — écarts mineurs, pas de breaking change identifié.

### A.2 Architecture

```
app/                          routes uniquement
  _layout.tsx                 Stack racine, providers (Query, Auth), police
  (tabs)/                     Autour de moi / Carte / Profil
  connexion.tsx, inscription.tsx
  evenement/[id].tsx          fiche + réservation
  evenement/[id]/inscrits.tsx organisateur
  evenement/[id]/scanner.tsx  organisateur, scan QR
  reservation/[id].tsx        billet + QR
  mes-reservations.tsx, mes-evenements.tsx
  publier.tsx, modifier-evenement/[id].tsx
  moderation.tsx              ADMIN

src/
  components/                 UI réutilisable
  features/{auth,events,reservations}/api.ts   seul point de contact HTTP par domaine
  lib/                        apiClient, authStorage, reservationCache, distance,
                               date, navigation, telephone, legal, usePosition,
                               useObtenirPositionActuelle, queryClient
  types/                      event.ts, reservation.ts, utilisateur.ts
```

Conventions respectées : nommage français pour le domaine, alias `@/`,
`FlatList`/`SectionList` pour toute liste distante, style NativeWind
exclusif (`StyleSheet` seulement pour deux dimensions calculées), un seul
point d'appel HTTP par domaine (`api.ts`).

### A.3 Écrans et navigation (état réel constaté)

| Route | Rôle | État |
|---|---|---|
| `(tabs)/index.tsx` (Autour de moi) | Commun | Fonctionnel, données réelles |
| `(tabs)/carte.tsx` | Commun | **Placeholder pur** — texte statique, aucune `MapView` |
| `(tabs)/profil.tsx` | Commun | Fonctionnel, menu conditionné par rôle |
| `connexion.tsx` / `inscription.tsx` | Public | Fonctionnel, données réelles |
| `evenement/[id].tsx` | Commun | Fonctionnel, données réelles |
| `reservation/[id].tsx` | Participant | Fonctionnel, avec repli offline (cache) |
| `mes-reservations.tsx` | Participant | Fonctionnel |
| `mes-evenements.tsx` | Organisateur | Fonctionnel |
| `publier.tsx` / `modifier-evenement/[id].tsx` | Organisateur | Fonctionnel |
| `evenement/[id]/inscrits.tsx` | Organisateur | Fonctionnel |
| `evenement/[id]/scanner.tsx` | Organisateur | Fonctionnel (saisie manuelle + caméra) |
| `moderation.tsx` + `moderation/[id].tsx` | Admin | Fonctionnel, données réelles *(corrigé — voir note post-audit : placeholder au moment du checkout audité, implémenté depuis sur `main` via `moderation-admin`)* |

### A.4 Données

Aucune donnée en dur nulle part dans `src/features/*/api.ts` — tous les
appels sont de vrais appels réseau via `appelApi` (`src/lib/apiClient.ts`),
qui lit `EXPO_PUBLIC_API_URL` (`.env` : `http://localhost:3000/api`,
`.env.example` : `http://10.0.2.2:3000/api` pour l'émulateur Android, avec
note pour téléphone physique).

Fonctions exportées côté `events` : `recupererEvenements`,
`recupererEvenement`, `creerEvenement`, `modifierEvenement`,
`recupererMesEvenements`, `recupererEvenementsAModerer`, `modererEvenement`
(ces deux dernières consommées par `app/moderation.tsx` et
`app/moderation/[id].tsx` — voir note post-audit).

Types métier (`src/types/`) :
- `Evenement` : id, titre, slug, description, image, categorie, dateDebut,
  dateFin, prix, capacite, **placesRestantes**, latitude, longitude,
  adresse, commune, statut, motifRefus, organisateurId,
  contactOrganisateur, createdAt, updatedAt, distanceKm? (déclarés
  non-optionnels sauf dateFin/prix/capacite/motifRefus/distanceKm)
- `Reservation` : id, evenementId, utilisateurId, nombrePlaces, code,
  statut, createdAt, utiliseeLe, evenement? (EvenementResume)
- `Utilisateur` : id, nom, telephone, email, role, createdAt (**email
  non-optionnel** dans le type)

Hooks TanStack Query : queryKeys cohérentes (`["evenements", coords]`,
`["evenement", id]`, `["reservations","moi"]`, `["evenements","moi"]`,
`["evenements", id, "inscrits"]`, etc.), `staleTime: 5 min`, `retry: 2`.

### A.5 Géolocalisation et carte

`expo-location` : deux hooks (`usePosition`, `useObtenirPositionActuelle`),
permission foreground uniquement, gestion explicite du refus (bandeau non
bloquant sur l'écran d'accueil, saisie manuelle sur le formulaire de
publication). Le tri par distance réel vient du **serveur** (champ
`distanceKm` renvoyé par l'API) ; `src/lib/distance.ts` ne fait que du
formatage d'affichage côté client.

`react-native-maps` est installé mais **jamais importé nulle part** dans le
code. L'onglet Carte est un placeholder de 12 lignes. Clés Google Maps non
configurées.

### A.6 Fonctionnalités

| Fonctionnalité | État |
|---|---|
| Auth (inscription/connexion) | Complet, branché sur l'API réelle |
| Mot de passe oublié | **Absent côté app** alors que l'API expose les deux endpoints |
| Publication d'événement | Complet |
| Réservation (création, annulation, billet QR) | Complet, avec gestion fine des conflits de capacité |
| Paiement | Absent, conforme à la contrainte du projet |
| Liste des inscrits + scan QR (organisateur) | Complet |
| Modération (ADMIN) | Complet *(corrigé — voir note post-audit)* |
| États chargement/erreur/vide | Gérés systématiquement sur tous les écrans à données |

---

## Partie B — Backend NestJS (`c:\alentour-api`)

### B.1 Stack et santé

NestJS `^11`, Prisma `^7.9.1` (nouveau générateur `prisma-client`,
`@prisma/adapter-pg`, sortie dans `../generated/prisma`), TypeScript `^5.7`
strict, `class-validator`/`class-transformer`, `@nestjs/jwt` +
`passport-jwt`, `argon2`, `@nestjs/swagger` `^11`.

**`npx tsc --noEmit`** : ✅ aucune erreur.
**`npx prisma validate`** : ✅ schéma valide.

Pas de docker-compose dans le dépôt. `.env.example` déclare `DATABASE_URL`,
`JWT_SECRET`, `APP_URL`, `BREVO_API_KEY`, `BREVO_EXPEDITEUR_EMAIL`,
`BREVO_EXPEDITEUR_NOM` — tenu à jour.

### B.2 Architecture

Modules : `PrismaModule` (global), `AuthModule`, `EvenementsModule`,
`ReservationsModule`, `AdminModule`. `AppController`/`AppService` restent le
résidu du starter Nest (`GET /api` → "Hello World!"), sans rôle métier.

`src/common/` : `ErreurMetier` (exception métier avec code), filtre
d'exception global qui produit `{ erreur: { code, message } }` pour toute
exception (métier ou générique), `JwtAuthGuard`, `RolesGuard` (message
français explicite), décorateurs `@Roles`/`@UtilisateurActuel`, utilitaires
`code-reservation.ts` (alphabet excluant les caractères ambigus) et
`slug.ts`.

Pattern port/adapter pour l'email de réinitialisation :
`NotificateurMotDePasse` (interface) avec deux implémentations —
log en dev, Brevo réel si `BREVO_API_KEY` est présente. Pas de
`ConfigModule` NestJS ; variables lues via `process.env` + `loadEnvFile()`
natif de Node.

### B.3 Base de données

Schéma (`prisma/schema.prisma`) conforme au contrat `CLAUDE.md`, avec des
ajouts internes non exposés au mobile :

- `Utilisateur` : id, nom, telephone (unique), **email (unique, NOT
  NULL)**, motDePasseHash, role, createdAt.
- `TokenReinitialisation` (interne, jamais sérialisé) : id, utilisateurId,
  tokenHash (SHA-256, pas argon2 — justifié en commentaire car haute
  entropie générée serveur), expireLe, utiliseLe, createdAt. Index sur
  `utilisateurId`.
- `Evenement` : conforme au contrat, index `(latitude, longitude)` pour la
  bounding box, `(statut, dateDebut)` pour modération/listing public,
  `(organisateurId)` pour `/moi/evenements`. `onDelete: Restrict` vers
  `Utilisateur`.
- `Reservation` : conforme au contrat, index `(utilisateurId)` et
  `(evenementId, statut)`. `onDelete: Restrict` vers `Evenement` et
  `Utilisateur`.

**Règle « une seule réservation active »** implémentée par un **index
unique partiel Postgres** ajouté à la main dans la migration
`20260813155314_initialisation` : `CREATE UNIQUE INDEX
"Reservation_active_unique" ON "Reservation"("evenementId","utilisateurId")
WHERE "statut" IN ('CONFIRMEE','UTILISEE')` — non générable par Prisma seul,
mais bien présent en base.

**Migrations** (2, dans l'ordre) : `initialisation` (schéma complet), puis
`email_obligatoire_et_reinitialisation` — **rend l'email obligatoire**
(`NOT NULL`) avec backfill des comptes existants
(`<telephone>@sans-email.invalid`) et ajoute `TokenReinitialisation`.

**PostGIS** : absent, confirmé. Tri par distance via haversine en SQL brut
(`$queryRaw`), précédé d'un filtre bounding box — conforme au contrat.

**Seed** (`prisma/seed.ts`) : 3 utilisateurs (1 ADMIN, 2 ORGANISATEUR), 15
événements sur plusieurs communes d'Abidjan, tous les statuts représentés.

Script séparé `scripts/anonymiser-utilisateur.ts` : anonymisation RGPD
manuelle (jamais automatique), contourne le `onDelete: Restrict` en gardant
la ligne mais en neutralisant les données identifiantes.

### B.4 Endpoints

Préfixe global `/api`. Tableau complet :

| Méthode | Chemin | Guard | État |
|---|---|---|---|
| GET | `/api` | — | Stub résiduel du starter, hors contrat |
| POST | `/api/auth/inscription` | — | Complet |
| POST | `/api/auth/connexion` | — | Complet |
| POST | `/api/auth/mot-de-passe-oublie` | — | Complet (hors contrat CLAUDE.md initial, ajouté depuis), **non consommé par le front** |
| POST | `/api/auth/mot-de-passe-reinitialisation` | — | Complet, **non consommé par le front** |
| GET | `/api/evenements` | — | Complet (recherche géo ou liste filtrée) |
| GET | `/api/evenements/:id` | — | Complet, 404 si non PUBLIE |
| POST | `/api/evenements` | JWT + Roles(ORGANISATEUR, ADMIN) | Complet — force `EN_ATTENTE`, renvoie l'`Evenement` Prisma brut (pas `EvenementPublicDto`) |
| PATCH | `/api/evenements/:id` | JWT (propriété vérifiée en service) | Complet — remet en `EN_ATTENTE` si republié/refusé, renvoie l'`Evenement` brut |
| GET | `/api/moi/evenements` | JWT | Complet |
| POST | `/api/evenements/:id/reservations` | JWT | Complet — transaction `FOR UPDATE` |
| GET | `/api/evenements/:id/reservations` | JWT (propriétaire/admin) | Complet |
| DELETE | `/api/reservations/:id` | JWT | Complet |
| POST | `/api/reservations/valider` | JWT + Roles(ORGANISATEUR, ADMIN) | Complet |
| GET | `/api/moi/reservations` | JWT | Complet |
| GET | `/api/admin/evenements` | JWT + Roles(ADMIN) | Complet |
| PATCH | `/api/admin/evenements/:id/statut` | JWT + Roles(ADMIN) | Complet — renvoie l'`Evenement` brut |

Deux endpoints d'auth (mot de passe oublié/réinitialisation) existent en
plus du contrat listé dans `CLAUDE.md` — ajout légitime au fil du
développement (commits `Recuperation de mot de passe...`), mais **`CLAUDE.md`
n'a pas été mis à jour** pour les y inclure.

### B.5 Sécurité et règles métier

- JWT `HS256`, secret obligatoire (`JWT_SECRET`), durée de vie fixe **30
  jours**, **aucun refresh token**, payload `{ sub, telephone, role }`.
- Hash mot de passe : **argon2**.
- `ValidationPipe` global : `whitelist: true`, `forbidNonWhitelisted: true`,
  `transform: true`.
- **Aucun rate limiting global** (`@nestjs/throttler` absent). Seule
  limitation applicative : 3 demandes de réinitialisation/heure/utilisateur.
  **`/auth/connexion` n'a aucune protection contre le bruteforce.**
- **CORS grand ouvert** (`app.enableCors()` sans restriction), avec un TODO
  explicite dans le code : *"a restreindre a des origines connues avant
  tout deploiement... releve lors de l'inventaire de confidentialite"* —
  non résolu à ce jour.
- Transaction de réservation : `$transaction` + `SELECT ... FOR UPDATE`
  (verrou de ligne explicite sur l'`Evenement`), isolation **READ
  COMMITTED** (pas SERIALIZABLE), choix justifié en commentaire dans le
  code (contention limitée à la ligne verrouillée, évite d'imposer une
  logique de retry globale). Contrainte d'unicité de réservation active
  garantie par l'index partiel Postgres, pas seulement par le code.
- Propriété d'un événement vérifiée côté service (jamais côté client), avec
  contournement explicite pour `ADMIN`.
- Paiement : absent, confirmé — aucune dépendance, aucun champ de statut de
  paiement sur `Reservation`.

### B.6 Tests et documentation

- **Aucun test métier** : le seul fichier de test (`app.controller.spec.ts`)
  et le seul test e2e (`test/app.e2e-spec.ts`) couvrent uniquement le
  "Hello World!" résiduel du starter Nest. Rien sur l'auth, les événements,
  les réservations, la modération, les transactions ou le filtre d'erreur.
- Swagger configuré (`/docs`), tous les DTOs décorés `@ApiProperty` —
  documentation à jour pour ce qui est déclaré en DTO (mais les 3
  endpoints qui renvoient le type Prisma brut documentent une forme
  différente de ce qu'ils retournent réellement, cf. B.4).
- README.md : encore celui généré par défaut par `@nestjs/cli`, aucune
  information spécifique au projet.

---

## Partie C — Écart front ↔ back

### C.1 Tableau de correspondance

| Besoin du front | Endpoint backend | État | Écart constaté |
|---|---|---|---|
| Accueil : `recupererEvenements` | `GET /evenements` | ✅ branché | Aucun — filtres et forme de réponse alignés |
| Fiche événement : `recupererEvenement` | `GET /evenements/:id` | ✅ branché | Aucun |
| Publication : `creerEvenement` | `POST /evenements` | ✅ branché | **Réponse = `Evenement` Prisma brut, sans `placesRestantes`**, alors que le type front `Evenement` le déclare non-optionnel |
| Édition : `modifierEvenement` | `PATCH /evenements/:id` | ✅ branché | Même écart que ci-dessus |
| `recupererMesEvenements` | `GET /moi/evenements` | ✅ branché | Aucun — `EvenementPublicDto[]`, `placesRestantes` inclus |
| Réservation : `creerReservation` | `POST /evenements/:id/reservations` | ✅ branché | Réponse = `Reservation` Prisma brut (le type front `Reservation.evenement` étant optionnel, pas de rupture) |
| Annulation : `annulerReservation` | `DELETE /reservations/:id` | ✅ branché | Aucun |
| Scan : `validerReservation` | `POST /reservations/valider` | ✅ branché | Aucun |
| `recupererMesReservations` | `GET /moi/reservations` | ✅ branché | Aucun (nested `evenement` attendu et fourni) |
| `recupererInscrits` | `GET /evenements/:id/reservations` | ✅ branché | Aucun |
| Auth : `connexion` / `inscription` | `POST /auth/connexion` / `/inscription` | ✅ branché | Aucun écart de forme constaté |
| `recupererEvenementsAModerer` / `modererEvenement` | `GET /admin/evenements` / `PATCH /admin/evenements/:id/statut` | ✅ branché | Aucun *(corrigé — voir note post-audit : non branché sur le checkout audité, `moderation-admin` merge sur `main` depuis)* |
| — (aucune fonction front) | `POST /auth/mot-de-passe-oublie` | ⚠️ endpoint prêt, **aucun écran front** | Endpoint backend non consommé |
| — (aucune fonction front) | `POST /auth/mot-de-passe-reinitialisation` | ⚠️ endpoint prêt, **aucun écran front** | Idem |

### C.2 Endpoints dont le front a besoin mais qui n'existent pas côté back

Aucun constaté. Toutes les fonctions de `src/features/*/api.ts` côté mobile
correspondent à un endpoint backend existant et complet.

### C.3 Endpoints backend existants mais pas encore utilisés par le front

- `POST /auth/mot-de-passe-oublie` et `POST /auth/mot-de-passe-reinitialisation`
  — aucune fonction ni écran côté mobile ne les appelle. Fonctionnalité
  backend complète, jamais exposée à l'utilisateur final de l'app.

### C.4 Incohérences de modèle

1. **`email` : contrat vs code.** `CLAUDE.md` (les deux dépôts) décrit
   l'email comme *optionnel* ("Le téléphone est l'identifiant principal...
   L'email est optionnel"). Le code dit le contraire des deux côtés : la
   migration `email_obligatoire_et_reinitialisation` rend la colonne `NOT
   NULL`, le DTO `InscriptionDto` l'exige (`@IsEmail()` sans
   `@IsOptional()`), et le type front `Utilisateur.email` n'est pas
   optionnel. **Le contrat documenté et le code divergent** — l'un des deux
   est faux et doit être corrigé pour que `CLAUDE.md` reste fiable.
2. **`placesRestantes` absent des réponses de mutation.** Les endpoints de
   lecture (`GET /evenements`, `/evenements/:id`, `/moi/evenements`,
   `/admin/evenements`) renvoient `EvenementPublicDto` avec
   `placesRestantes` calculé. Les endpoints d'écriture
   (`POST /evenements`, `PATCH /evenements/:id`,
   `PATCH /admin/evenements/:id/statut`) renvoient le type Prisma brut
   `Evenement`, qui n'a pas ce champ calculé. Le type front `Evenement`
   déclare pourtant `placesRestantes` comme présent partout. Sans
   conséquence aujourd'hui (les écrans invalident puis refetch plutôt que
   consommer directement le retour de la mutation), mais latent : un futur
   usage direct du retour de mutation (`onSuccess`) recevrait `undefined`
   silencieusement.
3. **Statut `BROUILLON` : chemin d'accès introuvable.** Le contrat prévoit
   ce statut, le seed en crée un, mais aucun endpoint actuel ne permet d'y
   arriver : `POST /evenements` force `EN_ATTENTE`, et
   `PATCH /evenements/:id` ne remet en `EN_ATTENTE` que depuis `PUBLIE`
   ou `REFUSE`, jamais vers `BROUILLON`. Reste soit un vestige, soit une
   fonctionnalité "enregistrer en brouillon" jamais implémentée d'un côté
   comme de l'autre.
4. **Deux endpoints hors contrat `CLAUDE.md`** : `mot-de-passe-oublie` et
   `mot-de-passe-reinitialisation` existent dans le code backend mais pas
   dans la liste des endpoints autorisés du `CLAUDE.md`. Ajout légitime
   (fonctionnalité réelle et complète), mais le document de contrat n'a pas
   été mis à jour en conséquence.

---

## Risques et dette technique

### Bloquant

- **CORS grand ouvert** en l'état (`app.enableCors()` sans restriction) —
  reconnu par un TODO dans le code lui-même, non résolu. À corriger avant
  toute exposition au-delà d'un poste de dev.
- **Divergence email optionnel/obligatoire** entre `CLAUDE.md` et le code
  (les deux dépôts) — touche le flux d'inscription, central. Le contrat
  partagé n'est plus fiable sur ce point tant que ce n'est pas tranché.

### Important

- Aucun rate limiting sur `/auth/connexion` — bruteforce possible sur le
  mot de passe.
- Couverture de test métier nulle côté API (transactions, propriété,
  visibilité des statuts, format d'erreur — rien n'est testé
  automatiquement).
- Pas de refresh token : session fixe 30 jours, aucune révocation
  possible.
- Onglet Carte entièrement placeholder, clés Google Maps non configurées,
  `react-native-maps` jamais importé malgré son installation.
- Pas d'écran mot de passe oublié côté mobile alors que l'API est complète.
- `expo-doctor` : icône adaptative Android manquante, clés `app.json`
  obsolètes/mal placées, `expo-font` non déclaré, 12 paquets Expo en retard
  de patchs.
- README de l'API resté celui du starter NestJS, sans aucune information
  projet.
- Réponses de mutation (`Evenement` brut) incohérentes avec les réponses de
  lecture (`EvenementPublicDto`) — cf. Partie C.4.2.

### Mineur

- Pas de pagination sur aucune liste (événements, réservations, inscrits,
  file de modération) — sans conséquence à l'échelle actuelle (15
  événements de seed), à surveiller si le volume grandit.
- `AppController`/`AppService` résiduels du starter Nest, montés sous
  `/api` sans rôle métier.
- Statut `BROUILLON` inatteignable via l'API actuelle (cf. Partie C.4.3).
- `react-native-maps` alourdit le bundle sans être utilisé tant que la
  carte n'est pas branchée.

---

## Questions ouvertes

Points que je n'ai pas pu trancher en lisant le code — à décider par toi :

1. **Email** : faut-il le rendre à nouveau optionnel (revert de la
   migration + DTO + type front) pour respecter le contrat `CLAUDE.md`
   original, ou au contraire acter qu'il est désormais obligatoire et
   corriger `CLAUDE.md` des deux côtés ? La formulation "seul moyen de
   récupérer l'accès à votre compte" dans la politique de confidentialité
   (session précédente) suggère que le choix "obligatoire" est peut-être
   déjà assumé en pratique — mais ce n'est pas documenté comme une décision
   actée.
2. **`BROUILLON`** : statut mort, ou fonctionnalité "enregistrer un
   brouillon avant de soumettre" encore à construire (formulaire de
   publication actuel n'a pas de bouton "Enregistrer en brouillon", juste
   "Publier") ?
3. **Carte** : Google Maps reste-t-il le choix retenu (achat/configuration
   des clés à faire), ou une alternative doit-elle être évaluée avant d'
   investir dans cette dépendance ?
4. **Refresh token** : session fixe de 30 jours acceptée comme design
   définitif pour cette version, ou faut-il prévoir un mécanisme de
   révocation/rafraîchissement ?
5. **CORS en production** : quelles origines exactes doivent être
   autorisées (uniquement les cibles natives n'ont pas besoin de CORS ;
   reste à savoir si une version web déployée est prévue, et sur quel
   domaine) ?
6. **Volume attendu en V1** : à quelle échelle (nombre d'événements actifs,
   de réservations simultanées) le projet doit-il tenir sans pagination ni
   optimisation supplémentaire ?

---

## Plan de reprise

1. **Trancher l'incohérence `email`** (bloquant, Partie C.4.1). À faire :
   décider optionnel vs obligatoire, aligner migration Prisma / DTO
   `InscriptionDto` / type front `Utilisateur` / `CLAUDE.md` des deux
   dépôts. **Terminé quand** : les quatre endroits (schéma, DTO, type
   front, doc contrat) disent la même chose, vérifié par lecture croisée.

2. **Restreindre CORS avant toute exposition au-delà du poste de dev**. À
   faire : remplacer `app.enableCors()` par une liste d'origines explicite
   (variable d'environnement type `CORS_ORIGINS`). **Terminé quand** : une
   requête depuis une origine non listée échoue, testé manuellement.

3. **Aligner la forme des réponses de mutation sur celle des lectures**. À
   faire : faire renvoyer `EvenementPublicDto` (avec `placesRestantes`) par
   `POST /evenements`, `PATCH /evenements/:id` et
   `PATCH /admin/evenements/:id/statut`, comme les endpoints `GET`
   équivalents. **Terminé quand** : les trois endpoints renvoient une forme
   identique à leur équivalent en lecture, vérifié par lecture du service.

4. ~~Brancher l'écran de modération~~ — **déjà fait** : `moderation-admin`
   (mergé sur `main` depuis, absent du checkout audité) implémente
   `app/moderation.tsx` + `app/moderation/[id].tsx` en entier. Voir note
   post-audit en tête de document.

5. **Décider du sort de l'onglet Carte** et agir en conséquence : soit
   configurer de vraies clés Google Maps et brancher `react-native-maps`,
   soit documenter explicitement le report dans `CLAUDE.md` (pour ne pas
   laisser un onglet mort si l'app est publiée en l'état). **Terminé
   quand** : soit la carte affiche les événements réels, soit le report est
   acté et écrit noir sur blanc.

6. **Ajouter les écrans mot de passe oublié côté mobile** (l'API est déjà
   complète). À faire : écran de demande (email) + écran de confirmation
   (token + nouveau mot de passe), branchés sur les deux endpoints
   existants. **Terminé quand** : un utilisateur peut réinitialiser son mot
   de passe de bout en bout depuis l'app, sans intervention manuelle.

7. **Combler le vide de tests critiques côté API**. À faire : au minimum,
   tests sur la transaction de réservation en concurrence (deux requêtes
   simultanées sur la dernière place), la vérification de propriété d'un
   événement, le filtrage des statuts non publics sur les endpoints
   publics, et le format d'erreur global. **Terminé quand** : `npm run
   test` couvre ces 4 scénarios avec un cas positif et un cas négatif
   chacun.

8. **Nettoyage avant mise en production**. À faire : retirer
   `AppController`/`AppService` résiduels, corriger les 3 avertissements
   `expo-doctor` (icône adaptative manquante, clés `app.json` obsolètes,
   `expo-font` manquant), mettre à jour les paquets Expo en retard de
   patch, réécrire le README de l'API pour qu'il décrive réellement le
   projet. **Terminé quand** : `expo-doctor` ne remonte plus d'erreur et le
   README de l'API décrit le domaine métier et les commandes de setup.
