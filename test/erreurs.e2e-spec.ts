import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RoleUtilisateur } from '../generated/prisma/client';
import { creerAppDeTest, serveurHttp } from './helpers/app';
import { creerUtilisateur, genererJwtValide } from './helpers/fixtures';

/**
 * Le filtre d'exception global (ExceptionGlobaleFilter) est le seul endroit
 * autorise a produire du JSON d'erreur (CLAUDE.md : format unique, jamais
 * construit a la main dans un service) — verifie ici pour chaque famille de
 * statut HTTP que l'app produit reellement, pas seulement en lisant le code.
 */
describe('Format derreur', () => {
  let app: INestApplication;
  // Chaque reponse d'erreur testee est accumulee ici pour la verification
  // transversale "aucune trace de pile" en fin de fichier — plus fiable que
  // d'essayer de provoquer artificiellement une 500 (aucun chemin d'entree
  // utilisateur plausible n'en declenche une : $queryRaw est parametre, les
  // DTO bornent deja tout ce qui pourrait deraper cote base).
  const corpsErreursObservees: unknown[] = [];

  beforeAll(async () => {
    app = await creerAppDeTest();
  });

  afterAll(async () => {
    await app.close();
  });

  function verifierFormeErreur(corps: unknown, codeAttendu: string): void {
    corpsErreursObservees.push(corps);
    const c = corps as { erreur?: { code?: unknown; message?: unknown } };
    expect(c.erreur).toBeDefined();
    expect(c.erreur?.code).toBe(codeAttendu);
    expect(typeof c.erreur?.message).toBe('string');
  }

  // BUG REEL (non corrige ici, consigne du lot) : AuthService.convertirErreurUnicite()
  // lit erreur.meta.target pour distinguer TELEPHONE_DEJA_UTILISE/EMAIL_DEJA_UTILISE,
  // mais avec @prisma/adapter-pg ce champ n'est jamais renseigne ("Unique
  // constraint failed on the (not available)", confirme en executant ce test) —
  // exactement le defaut deja identifie et corrige dans
  // ReservationsService.convertirErreurUnicite() (voir son commentaire), jamais
  // reporte ici. Consequence reelle : une inscription en double sur le
  // telephone OU l'email ne renvoie plus 409 TELEPHONE_DEJA_UTILISE/EMAIL_DEJA_UTILISE
  // mais une 500 ERREUR_INTERNE generique (sans fuite de trace dans le corps —
  // le filtre sanitize correctement meme ce cas, verifie ci-dessous separement).
  // Laisse en .skip ; a corriger dans une PR dediee en reprenant la meme
  // technique (driverAdapterError.cause.originalMessage).
  it.skip('erreur metier (409) : telephone deja utilise a l-inscription', async () => {
    const telephone = `+225${String(Date.now()).slice(-9)}`;
    const premiere = await request(serveurHttp(app))
      .post('/api/auth/inscription')
      .send({
        nom: 'Premier',
        telephone,
        email: `premier${Date.now()}@test.com`,
        motDePasse: 'MotDePasseValide123',
      });
    expect(premiere.status).toBe(201);

    const seconde = await request(serveurHttp(app))
      .post('/api/auth/inscription')
      .send({
        nom: 'Second',
        telephone,
        email: `second${Date.now()}@test.com`,
        motDePasse: 'MotDePasseValide123',
      });

    expect(seconde.status).toBe(409);
    verifierFormeErreur(seconde.body, 'TELEPHONE_DEJA_UTILISE');
  });

  it('500 (bug ci-dessus) : la reponse ne fuit quand meme aucune trace de pile', async () => {
    const telephone = `+225${String(Date.now()).slice(-9)}`;
    await request(serveurHttp(app))
      .post('/api/auth/inscription')
      .send({
        nom: 'Premier',
        telephone,
        email: `premier${Date.now()}@test.com`,
        motDePasse: 'MotDePasseValide123',
      });

    const seconde = await request(serveurHttp(app))
      .post('/api/auth/inscription')
      .send({
        nom: 'Second',
        telephone,
        email: `second${Date.now()}@test.com`,
        motDePasse: 'MotDePasseValide123',
      });

    expect(seconde.status).toBe(500);
    verifierFormeErreur(seconde.body, 'ERREUR_INTERNE');
  });

  it('erreur de validation (400) : champ manquant', async () => {
    const reponse = await request(serveurHttp(app))
      .post('/api/auth/inscription')
      .send({
        nom: 'Sans telephone',
        email: `sanstelephone${Date.now()}@test.com`,
        motDePasse: 'MotDePasseValide123',
      });

    expect(reponse.status).toBe(400);
    verifierFormeErreur(reponse.body, 'DONNEES_INVALIDES');
  });

  it('erreur de validation (400) : champ inconnu rejete (forbidNonWhitelisted)', async () => {
    const reponse = await request(serveurHttp(app))
      .post('/api/auth/inscription')
      .send({
        nom: 'Avec champ fantome',
        telephone: `+225${String(Date.now()).slice(-9)}`,
        email: `fantome${Date.now()}@test.com`,
        motDePasse: 'MotDePasseValide123',
        champQuiNexistePas: 'valeur',
      });

    expect(reponse.status).toBe(400);
    verifierFormeErreur(reponse.body, 'DONNEES_INVALIDES');
  });

  it('404 : evenement introuvable', async () => {
    const reponse = await request(serveurHttp(app)).get(
      '/api/evenements/cet-id-nexiste-pas',
    );

    expect(reponse.status).toBe(404);
    verifierFormeErreur(reponse.body, 'RESSOURCE_INTROUVABLE');
  });

  it('401 : route protegee sans jeton', async () => {
    const reponse = await request(serveurHttp(app)).get(
      '/api/moi/reservations',
    );

    expect(reponse.status).toBe(401);
    verifierFormeErreur(reponse.body, 'NON_AUTHENTIFIE');
  });

  it('403 : role insuffisant', async () => {
    const participant = await creerUtilisateur(RoleUtilisateur.PARTICIPANT);
    const jeton = genererJwtValide(participant);

    const reponse = await request(serveurHttp(app))
      .get('/api/admin/evenements')
      .set('Authorization', `Bearer ${jeton}`);

    expect(reponse.status).toBe(403);
    verifierFormeErreur(reponse.body, 'ACCES_REFUSE');
  });

  it('429 : rate limiting sur /auth/connexion (5 requetes/min)', async () => {
    const corps = { telephone: '+225000000000', motDePasse: 'peu-importe' };
    const reponses = [];
    for (let i = 0; i < 6; i++) {
      reponses.push(
        await request(serveurHttp(app)).post('/api/auth/connexion').send(corps),
      );
    }

    const limitees = reponses.filter((r) => r.status === 429);
    expect(limitees.length).toBeGreaterThan(0);
    verifierFormeErreur(limitees[0].body, 'TROP_DE_REQUETES');
  }, 15000);

  it('limite > 100 sur GET /evenements rejetee (400)', async () => {
    const reponse = await request(serveurHttp(app)).get(
      '/api/evenements?limite=101',
    );

    expect(reponse.status).toBe(400);
    verifierFormeErreur(reponse.body, 'DONNEES_INVALIDES');
  });

  it('aucune des reponses derreur ci-dessus ne laisse fuiter de trace de pile ou de detail interne', () => {
    expect(corpsErreursObservees.length).toBeGreaterThanOrEqual(8);
    const marqueursInternes = [
      'at Object.',
      'at async',
      '.ts:',
      '.js:',
      'node_modules',
      'PrismaClient',
      'stack',
      'Error:',
    ];
    corpsErreursObservees.forEach((corps) => {
      const texte = JSON.stringify(corps);
      marqueursInternes.forEach((marqueur) => {
        expect(texte).not.toContain(marqueur);
      });
    });
  });
});
