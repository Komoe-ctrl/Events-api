import { Logger, ValidationPipe } from '@nestjs/common';
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

  // Necessaire pour Expo web (navigateur, soumis a CORS), pas pour les
  // cibles natives (Android emulateur/telephone). Ouvert en dev ; a
  // restreindre a des origines connues avant tout deploiement.
  // TODO(deploiement) : restreindre via { origin: [...] } aux domaines reels
  // (app web + admin) avant toute mise en production — releve lors de
  // l'inventaire de confidentialite, actuellement ouvert a toute origine.
  app.enableCors();

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
