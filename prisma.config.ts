import { defineConfig, env } from 'prisma/config';

try {
  process.loadEnvFile();
} catch {
  // Pas de fichier .env (ex. prod/CI) : les variables sont deja dans l'environnement.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
