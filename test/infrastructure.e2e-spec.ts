import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RoleUtilisateur, StatutEvenement } from '../generated/prisma/client';
import { creerAppDeTest, serveurHttp } from './helpers/app';
import {
  creerEvenement,
  creerUtilisateur,
  genererJwtValide,
} from './helpers/fixtures';

/**
 * Auto-test de l'infrastructure e2e elle-meme (etape 0 du lot 4) : prouve
 * que l'app demarre contre la base de test, que les fixtures ecrivent des
 * donnees visibles via HTTP, qu'un jeton fixture passe le JwtAuthGuard, et
 * surtout que la troncature entre tests fonctionne reellement — sans cette
 * derniere verification, un oubli dans test/helpers/setup.ts passerait
 * inapercu jusqu'a ce qu'une vraie suite (etape 1+) en souffre.
 */
describe('Infrastructure de test e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await creerAppDeTest();
  });

  afterAll(async () => {
    await app.close();
  });

  it("l'application demarre et repond via HTTP", async () => {
    const reponse = await request(serveurHttp(app)).get('/api/evenements');
    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual([]);
  });

  it('une fixture Evenement PUBLIE est visible depuis un endpoint public', async () => {
    const organisateur = await creerUtilisateur(RoleUtilisateur.ORGANISATEUR);
    await creerEvenement(organisateur.id, StatutEvenement.PUBLIE);

    const reponse = await request(serveurHttp(app)).get('/api/evenements');
    expect(reponse.status).toBe(200);
    expect(reponse.body).toHaveLength(1);
  });

  it('la base a ete tronquee avant ce test (isolation entre tests)', async () => {
    // Si la troncature post-test (test/helpers/setup.ts) n'avait pas
    // tourne apres le test precedent, cet evenement serait encore present.
    const reponse = await request(serveurHttp(app)).get('/api/evenements');
    expect(reponse.body).toEqual([]);
  });

  it('un jeton fixture (genererJwtValide) est accepte par une route protegee', async () => {
    const utilisateur = await creerUtilisateur(RoleUtilisateur.PARTICIPANT);
    const jeton = genererJwtValide(utilisateur);

    const reponse = await request(serveurHttp(app))
      .get('/api/moi/reservations')
      .set('Authorization', `Bearer ${jeton}`);

    expect(reponse.status).toBe(200);
    expect(reponse.body).toEqual([]);
  });

  it('une route protegee refuse une requete sans jeton', async () => {
    const reponse = await request(serveurHttp(app)).get(
      '/api/moi/reservations',
    );
    expect(reponse.status).toBe(401);
  });
});
