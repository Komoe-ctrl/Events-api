import { prismaTest, truncateTout } from './db';

// Partage par tous les fichiers *.e2e-spec.ts (setupFilesAfterEach dans
// jest-e2e.json) : aucun fichier de test n'a besoin de se souvenir de
// nettoyer la base lui-meme.
afterEach(async () => {
  await truncateTout();
});

afterAll(async () => {
  await prismaTest.$disconnect();
});
