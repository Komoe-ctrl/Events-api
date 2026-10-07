import type { Server } from 'node:http';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { ExceptionGlobaleFilter } from '../../src/common/filters/exception-globale.filter';

/**
 * Reproduit la configuration globale de main.ts (prefixe, ValidationPipe,
 * filtre d'exception) necessaire pour que le comportement observe en test
 * corresponde a celui de l'app reelle. Omis volontairement : CORS et
 * Swagger (bootstrap() complet), sans effet sur les requetes HTTP internes
 * que supertest adresse directement au serveur.
 */
export async function creerAppDeTest(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ExceptionGlobaleFilter());
  await app.init();
  return app;
}

// INestApplication.getHttpServer() est type `any` : ce wrapper fournit un
// type concret a supertest une seule fois ici plutot que de repeter un cast
// (ou une suppression eslint no-unsafe-argument) dans chaque fichier
// *.e2e-spec.ts.
export function serveurHttp(app: INestApplication): Server {
  return app.getHttpServer() as Server;
}
