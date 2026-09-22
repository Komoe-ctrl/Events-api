import { Logger, ValidationPipe } from '@nestjs/common';
import type { CustomOrigin } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ExceptionGlobaleFilter } from './common/filters/exception-globale.filter';

try {
  process.loadEnvFile();
} catch {
  // Pas de fichier .env (ex. prod/CI) : les variables sont deja dans l'environnement.
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS ne s'applique qu'aux navigateurs (Expo web) : le header Origin
  // n'est envoye que par un navigateur, jamais par les cibles natives
  // (Android/iOS) ni par un client serveur-a-serveur (curl, l'app mobile
  // elle-meme hors web) — ces requetes continuent de passer sans etre
  // concernees par la restriction ci-dessous.
  // CORS_ORIGINS : liste blanche separee par des virgules, vide par defaut
  // (aucune origine navigateur autorisee tant qu'elle n'est pas explicitement
  // configuree). Releve lors de l'inventaire de confidentialite : le
  // app.enableCors() precedent, sans restriction, etait ouvert a toute
  // origine.
  const originsAutorisees = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origine) => origine.trim())
    .filter((origine) => origine.length > 0);

  const origin: CustomOrigin = (requestOrigin, callback) => {
    if (!requestOrigin || originsAutorisees.includes(requestOrigin)) {
      callback(null, true);
      return;
    }
    // Pas d'erreur levee : on omet simplement les en-tetes CORS, le
    // navigateur bloque alors la lecture de la reponse cote client.
    // C'est le comportement standard du package cors — lever une erreur
    // ici la ferait remonter comme une 500 generique via le filtre
    // d'exception global, ce qui n'apporte rien de plus.
    callback(null, false);
  };
  app.enableCors({ origin });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new ExceptionGlobaleFilter());

  const config = new DocumentBuilder()
    .setTitle('Alentour API')
    .setDescription(
      "Decouverte, publication et reservation d'evenements a Abidjan",
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((erreur: unknown) => {
  // Sans ce .catch, un echec de demarrage (port deja pris, DATABASE_URL
  // invalide, JWT_SECRET manquant...) rejette une promesse non geree :
  // Node journalise un avertissement generique et le process peut rester
  // bloque sans jamais vraiment demarrer ni sortir clairement en erreur —
  // ingerable en production, ou seul le code de sortie du process est
  // observable par l'orchestrateur (systemd, Docker, etc.).
  new Logger('Bootstrap').error(
    "Echec du demarrage de l'application",
    erreur instanceof Error ? erreur.stack : String(erreur),
  );
  process.exit(1);
});
