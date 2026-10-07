/**
 * Prepare la base de test puis lance la suite e2e.
 *
 * En CI, DATABASE_URL est deja fournie par le workflow (service Postgres
 * dedie) : le chargement de fichier est alors sautee. En local, charge
 * .env.test.local (prioritaire, ignore par git) ou .env.test — voir
 * .env.test.example pour le modele a copier.
 *
 * Usage : npm run test:e2e
 */
import { spawnSync } from 'node:child_process';

if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile('.env.test.local');
  } catch {
    try {
      process.loadEnvFile('.env.test');
    } catch {
      console.error(
        'Aucune base de test configuree : copiez .env.test.example vers ' +
          '.env.test.local et renseignez DATABASE_URL (une base DEDIEE aux ' +
          'tests, distincte de la base de dev — voir le commentaire dans ce ' +
          "fichier, elle est tronquee entre chaque test)." +
          '\n',
      );
      process.exit(1);
    }
  }
}

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL absente apres chargement de .env.test(.local).\n',
  );
  process.exit(1);
}

// node directement sur le point d'entree resolu (pas npx/shell:true) :
// evite l'avertissement DEP0190 (args non echappes passes a un shell) et la
// resolution supplementaire de npx — les deux binaires sont deja presents
// dans node_modules a ce stade (devDependencies installees).
function executer(args: string[]): void {
  const resultat = spawnSync(process.execPath, args, {
    stdio: 'inherit',
    env: process.env,
  });
  if (resultat.status !== 0) {
    process.exit(resultat.status ?? 1);
  }
}

executer(['node_modules/prisma/build/index.js', 'migrate', 'deploy']);

// --experimental-vm-modules : le nouveau moteur WASM de Prisma 7 charge son
// compilateur de requetes via un import() dynamique ; le contexte vm
// sandboxe de Jest le refuse sans ce flag ("A dynamic import callback was
// invoked without --experimental-vm-modules"). N'affecte pas l'app reelle
// (nest start, node dist/main) : seul le bac a sable de Jest est concerne.
// --forceExit : le moteur WASM de Prisma (pool de connexions pg sous-jacent)
// et/ou supertest laissent par moments un handle ouvert apres la fin de la
// suite ("Jest did not exit one second after..."), observe de facon
// intermittente en local. Sans ce flag, le process reste bloque
// indefiniment au lieu d'echouer ou de reussir proprement — inacceptable en
// CI (le job ne se terminerait jamais). $disconnect() est deja appele
// (test/helpers/setup.ts, app.close()) : ce flag couvre ce qui reste malgre
// ca, pas un substitut a une fermeture propre.
// --runInBand : tous les fichiers *.e2e-spec.ts partagent la meme base
// Postgres (truncatee entre chaque test) — des workers paralleles se
// marcheraient dessus (troncature d'un worker pendant qu'un autre lit/ecrit)
// en plus d'ouvrir plusieurs pools de connexions simultanes pour une suite
// qui reste petite. Execution sequentielle dans le process principal, sans
// la couche jest-worker (observee instable ici : "Jest worker encountered N
// child process exceptions").
executer([
  '--experimental-vm-modules',
  'node_modules/jest/bin/jest.js',
  '--config',
  './test/jest-e2e.json',
  '--runInBand',
  '--forceExit',
]);
