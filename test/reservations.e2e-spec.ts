import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  RoleUtilisateur,
  StatutEvenement,
  StatutReservation,
} from '../generated/prisma/client';
import { creerAppDeTest, serveurHttp } from './helpers/app';
import {
  creerEvenement,
  creerUtilisateur,
  genererJwtValide,
} from './helpers/fixtures';

/**
 * Point le plus critique du projet (CLAUDE.md, regle de domaine n.3) : la
 * transaction FOR UPDATE de ReservationsService.creer() et l'index unique
 * partiel Reservation_active_unique. Verifie reellement en desactivant
 * chacune des deux protections en local — observation documentee dans la
 * PR, pas seulement affirmee ici.
 */
describe('Reservations', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await creerAppDeTest();
  });

  afterAll(async () => {
    await app.close();
  });

  async function creerOrganisateurEtEvenement(
    overrides: Parameters<typeof creerEvenement>[2] = {},
  ) {
    const organisateur = await creerUtilisateur(RoleUtilisateur.ORGANISATEUR);
    const evenement = await creerEvenement(
      organisateur.id,
      StatutEvenement.PUBLIE,
      overrides,
    );
    return { organisateur, evenement };
  }

  async function creerParticipantAvecJeton() {
    const participant = await creerUtilisateur(RoleUtilisateur.PARTICIPANT);
    const jeton = genererJwtValide(participant);
    return { participant, jeton };
  }

  it('reservation nominale : code genere, statut CONFIRMEE, places decrementees', async () => {
    const { evenement } = await creerOrganisateurEtEvenement({ capacite: 5 });
    const { jeton } = await creerParticipantAvecJeton();

    const avant = await request(serveurHttp(app)).get(
      `/api/evenements/${evenement.id}`,
    );
    expect(avant.body.placesRestantes).toBe(5);

    const reponse = await request(serveurHttp(app))
      .post(`/api/evenements/${evenement.id}/reservations`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ nombrePlaces: 2 });

    expect(reponse.status).toBe(201);
    expect(reponse.body.statut).toBe(StatutReservation.CONFIRMEE);
    expect(reponse.body.nombrePlaces).toBe(2);
    expect(reponse.body.code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ34679]{8}$/);

    const apres = await request(serveurHttp(app)).get(
      `/api/evenements/${evenement.id}`,
    );
    expect(apres.body.placesRestantes).toBe(3);
  });

  it('concurrence : sur une seule place, une seule des N requetes paralleles reussit', async () => {
    const { evenement } = await creerOrganisateurEtEvenement({ capacite: 1 });
    const nombreParticipants = 5;
    const participants = await Promise.all(
      Array.from({ length: nombreParticipants }, () =>
        creerParticipantAvecJeton(),
      ),
    );

    // Promise.all : les N requetes partent avant qu'aucune n'ait recu de
    // reponse — un enchainement sequentiel (await dans une boucle) ne
    // testerait rien, chaque requete verrouillant puis relachant la ligne
    // avant la suivante, sans jamais se chevaucher reellement.
    const reponses = await Promise.all(
      participants.map(({ jeton }) =>
        request(serveurHttp(app))
          .post(`/api/evenements/${evenement.id}/reservations`)
          .set('Authorization', `Bearer ${jeton}`)
          .send({ nombrePlaces: 1 }),
      ),
    );

    const reussies = reponses.filter((r) => r.status === 201);
    const refusees = reponses.filter((r) => r.status === 409);

    expect(reussies).toHaveLength(1);
    expect(refusees).toHaveLength(nombreParticipants - 1);
    expect(reussies[0].body.statut).toBe(StatutReservation.CONFIRMEE);
    refusees.forEach((r) => {
      expect(r.body.erreur.code).toBe('CAPACITE_INSUFFISANTE');
    });
  }, 20000);

  it('double reservation : un meme utilisateur ne peut pas avoir deux reservations actives sur le meme evenement', async () => {
    const { evenement } = await creerOrganisateurEtEvenement({ capacite: 5 });
    const { jeton } = await creerParticipantAvecJeton();

    const premiere = await request(serveurHttp(app))
      .post(`/api/evenements/${evenement.id}/reservations`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ nombrePlaces: 1 });
    expect(premiere.status).toBe(201);

    const seconde = await request(serveurHttp(app))
      .post(`/api/evenements/${evenement.id}/reservations`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ nombrePlaces: 1 });

    // L'index unique partiel (Reservation_active_unique) doit remonter une
    // erreur metier propre, jamais une 500 brute (verifie en le desactivant
    // temporairement en local — voir la description de la PR).
    expect(seconde.status).toBe(409);
    expect(seconde.body.erreur.code).toBe('RESERVATION_DEJA_ACTIVE');
  });

  it('annulation : places restituees, puis nouvelle reservation possible sur le meme evenement', async () => {
    const { evenement } = await creerOrganisateurEtEvenement({ capacite: 1 });
    const { jeton: jetonA } = await creerParticipantAvecJeton();
    const { jeton: jetonB } = await creerParticipantAvecJeton();

    const reservation = await request(serveurHttp(app))
      .post(`/api/evenements/${evenement.id}/reservations`)
      .set('Authorization', `Bearer ${jetonA}`)
      .send({ nombrePlaces: 1 });
    expect(reservation.status).toBe(201);

    const annulation = await request(serveurHttp(app))
      .delete(`/api/reservations/${reservation.body.id}`)
      .set('Authorization', `Bearer ${jetonA}`);
    expect(annulation.status).toBe(200);
    expect(annulation.body.statut).toBe(StatutReservation.ANNULEE);

    const placesApresAnnulation = await request(serveurHttp(app)).get(
      `/api/evenements/${evenement.id}`,
    );
    expect(placesApresAnnulation.body.placesRestantes).toBe(1);

    // La capacite liberee doit etre utilisable par n'importe qui, pas
    // seulement reouverte pour l'utilisateur qui a annule.
    const nouvelleReservation = await request(serveurHttp(app))
      .post(`/api/evenements/${evenement.id}/reservations`)
      .set('Authorization', `Bearer ${jetonB}`)
      .send({ nombrePlaces: 1 });
    expect(nouvelleReservation.status).toBe(201);
  });

  it('impossible de reserver un evenement non PUBLIE (EN_ATTENTE)', async () => {
    // creerOrganisateurEtEvenement() force PUBLIE (utilise par les autres
    // tests de ce fichier) : statut EN_ATTENTE cree directement ici.
    const organisateur = await creerUtilisateur(RoleUtilisateur.ORGANISATEUR);
    const evenementEnAttente = await creerEvenement(
      organisateur.id,
      StatutEvenement.EN_ATTENTE,
    );
    const { jeton } = await creerParticipantAvecJeton();

    const reponse = await request(serveurHttp(app))
      .post(`/api/evenements/${evenementEnAttente.id}/reservations`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ nombrePlaces: 1 });

    expect(reponse.status).toBe(409);
    expect(reponse.body.erreur.code).toBe('EVENEMENT_NON_DISPONIBLE');
  });

  // Reservation sur un evenement PUBLIE mais dont la date est passee :
  // AUCUNE verification de dateDebut n'existe dans ReservationsService.creer()
  // (confirme en lisant le code, pas une supposition) — seul le statut est
  // verifie. Un evenement PUBLIE d'hier reste donc reservable aujourd'hui.
  // Ce test, ecrit conformement a la regle attendue, echoue contre le code
  // actuel : laisse en .skip plutot que corrige ici (consigne du lot :
  // signaler un bug reel sans le corriger dans la PR de test). Signale au
  // demandeur, PR dediee a prevoir.
  it.skip('impossible de reserver un evenement PUBLIE dont la date est passee', async () => {
    const { evenement } = await creerOrganisateurEtEvenement({
      capacite: 5,
      dateDebut: new Date(Date.now() - 86_400_000),
    });
    const { jeton } = await creerParticipantAvecJeton();

    const reponse = await request(serveurHttp(app))
      .post(`/api/evenements/${evenement.id}/reservations`)
      .set('Authorization', `Bearer ${jeton}`)
      .send({ nombrePlaces: 1 });

    expect(reponse.status).toBe(409);
  });
});
