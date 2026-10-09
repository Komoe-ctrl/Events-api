# Alentour — API

API NestJS pour Alentour, application mobile de découverte, publication et
réservation d'événements à Abidjan (Côte d'Ivoire). Authentification par
téléphone, recherche d'événements géolocalisée, réservations avec gestion de
capacité, modération par un rôle `ADMIN`.

Le contrat de données complet (modèle canonique, endpoints, règles de
domaine, format d'erreur) vit dans [`CLAUDE.md`](./CLAUDE.md) — fichier
identique au dépôt `alentour` (application mobile), qui consomme cette API.
Pour un état des lieux détaillé du projet (couverture fonctionnelle, dette
technique connue), voir [`docs/ETAT_DES_LIEUX.md`](./docs/ETAT_DES_LIEUX.md).

## Prérequis

- Node.js 22 ou plus récent
- PostgreSQL (une instance standard, sans extension — le projet n'utilise
  pas PostGIS, voir la règle de domaine n.2 dans `CLAUDE.md`)
- Deux bases distinctes : une pour le développement, une pour les tests
  e2e (cette dernière est entièrement tronquée entre chaque test — ne
  jamais faire pointer la configuration de test vers une base contenant
  de vraies données, voir `.env.test.example`)

## Installation

```bash
npm install
cp .env.example .env
# completer .env (voir "Variables d'environnement" ci-dessous)
npx prisma migrate deploy
npm run seed            # optionnel : peuple la base avec des donnees de demo
npm run start:dev
```

L'API est alors disponible sur `http://localhost:3000/api`, et sa
documentation interactive (Swagger) sur `http://localhost:3000/docs`.

## Variables d'environnement

Voir [`.env.example`](./.env.example) pour le modèle complet, commenté.
Résumé :

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | Oui | Connexion PostgreSQL (dev/prod) |
| `JWT_SECRET` | Oui | Secret de signature des jetons d'authentification |
| `APP_URL` | Non | Base du lien envoyé par email pour la réinitialisation de mot de passe |
| `BREVO_API_KEY` | Non | Envoi réel des emails via Brevo. Non définie : le lien de réinitialisation est simplement journalisé (comportement par défaut en dev) |
| `BREVO_EXPEDITEUR_EMAIL` / `BREVO_EXPEDITEUR_NOM` | Non | Expéditeur des emails envoyés via Brevo |
| `CORS_ORIGINS` | Non | Origines navigateur autorisées (séparées par des virgules). Vide par défaut : aucune origine navigateur autorisée — ne concerne que les clients web (Expo web), pas les cibles natives |

Pour les tests e2e, voir [`.env.test.example`](./.env.test.example) — modèle
à copier en `.env.test.local` (ignoré par git), avec une base PostgreSQL
dédiée et distincte de celle du développement.

## Commandes

```bash
npm run start:dev        # serveur de developpement (watch mode)
npm run start:prod       # lance le build de production (dist/main.js)
npm run build            # compile en dist/

npx prisma migrate dev   # cree et applique une migration
npx prisma studio        # inspecte la base graphiquement
npm run seed             # peuple la base de developpement avec des donnees de demo

npx tsc --noEmit         # verification de types, doit passer avant tout commit
npm run lint             # eslint --fix
npm run lint:ci          # eslint sans correction automatique (utilise en CI)

npm run test             # tests unitaires (Jest)
npm run test:e2e         # tests e2e (Jest + supertest, base de test dediee — voir ci-dessus)
```

## Architecture

```text
src/
  main.ts               Bootstrap : ValidationPipe global, filtre d'exception, Swagger
  app.module.ts
  prisma/                PrismaModule global + PrismaService (Prisma 7, adapter pg)
  common/
    filters/             Filtre d'exception produisant le format d'erreur unique
    guards/               JwtAuthGuard, RolesGuard, throttler personnalise
    decorators/           @UtilisateurActuel, @Roles
  auth/                  Inscription, connexion, reinitialisation de mot de passe, revocation de session
  evenements/            Recherche geolocalisee (SQL, formule de haversine), publication, edition
  reservations/          Reservation avec transaction + verrou, annulation, scan a l'entree
  admin/                 File de moderation, publication/refus d'un evenement
test/
  helpers/               Fixtures et bootstrap d'application partages par les suites e2e
  *.e2e-spec.ts          Suites e2e (infrastructure, reservations, auth/permissions, erreurs)
```

Chaque module suit la même structure : un contrôleur mince (reçoit un DTO
validé, appelle un service, retourne le résultat), un service qui porte
toute la logique métier, des DTO décorés pour Swagger. Détail complet des
règles de domaine et du modèle de données dans
[`CLAUDE.md`](./CLAUDE.md).

## Documentation API

La documentation OpenAPI (Swagger), générée depuis les décorateurs des DTO
et contrôleurs, est le contrat officiel consommé par l'application mobile.
Disponible sur `/docs` une fois le serveur lancé.
