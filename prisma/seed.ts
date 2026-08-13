import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import {
  CategorieEvenement,
  PrismaClient,
  RoleUtilisateur,
  StatutEvenement,
} from '../generated/prisma/client';
import { genererSlug } from '../src/common/utils/slug';

try {
  process.loadEnvFile();
} catch {
  // .env absent : les variables sont deja dans l'environnement.
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface EvenementSeed {
  titre: string;
  description: string;
  categorie: CategorieEvenement;
  commune: string;
  latitude: number;
  longitude: number;
  adresse: string;
  dateDebut: Date;
  prix: number | null;
  capacite: number | null;
  statut: StatutEvenement;
  motifRefus?: string;
  organisateurId: string;
  contactOrganisateur: string;
}

function image(seed: string): string {
  return `https://picsum.photos/seed/${seed}/800/600`;
}

function dansNJours(n: number, heure = 20): Date {
  const date = new Date();
  date.setDate(date.getDate() + n);
  date.setHours(heure, 0, 0, 0);
  return date;
}

async function main() {
  const motDePasseHash = await argon2.hash('motdepasse123');

  const admin = await prisma.utilisateur.create({
    data: {
      nom: 'Admin Alentour',
      telephone: '+2250700000001',
      email: 'admin@alentour.ci',
      motDePasseHash,
      role: RoleUtilisateur.ADMIN,
    },
  });

  const aya = await prisma.utilisateur.create({
    data: {
      nom: 'Aya Kouassi',
      telephone: '+2250700000002',
      email: 'aya.kouassi@alentour.ci',
      motDePasseHash,
      role: RoleUtilisateur.ORGANISATEUR,
    },
  });

  const ibrahim = await prisma.utilisateur.create({
    data: {
      nom: 'Ibrahim Traore',
      telephone: '+2250700000003',
      email: 'ibrahim.traore@alentour.ci',
      motDePasseHash,
      role: RoleUtilisateur.ORGANISATEUR,
    },
  });

  console.log('Utilisateurs crees :', {
    admin: admin.telephone,
    organisateurs: [aya.telephone, ibrahim.telephone],
  });

  const evenements: EvenementSeed[] = [
    {
      titre: 'Nuit Zouglou au Palais de la Culture',
      description:
        "Une soiree hommage aux pionniers du zouglou, avec plusieurs groupes en live sur la scene du Palais de la Culture de Treichville.",
      categorie: CategorieEvenement.CONCERT,
      commune: 'Treichville',
      latitude: 5.2926,
      longitude: -4.0067,
      adresse: 'Palais de la Culture, Boulevard de Marseille',
      dateDebut: dansNJours(7),
      prix: 5000,
      capacite: 300,
      statut: StatutEvenement.PUBLIE,
      organisateurId: aya.id,
      contactOrganisateur: aya.telephone,
    },
    {
      titre: 'Conference Tech Abidjan 2026',
      description:
        "Rencontre des acteurs de la tech ivoirienne : startups, developpeurs et investisseurs, autour de conferences et de tables rondes.",
      categorie: CategorieEvenement.CONFERENCE,
      commune: 'Plateau',
      latitude: 5.32,
      longitude: -4.022,
      adresse: 'Sofitel Hotel Ivoire, Plateau',
      dateDebut: dansNJours(23, 9),
      prix: null,
      capacite: 150,
      statut: StatutEvenement.PUBLIE,
      organisateurId: ibrahim.id,
      contactOrganisateur: ibrahim.telephone,
    },
    {
      titre: 'Soiree Afrobeats au Cocody Bay',
      description: "Selecta afrobeats et coupe-decale face a la lagune, terrasse et bar a cocktails.",
      categorie: CategorieEvenement.SOIREE,
      commune: 'Cocody',
      latitude: 5.36,
      longitude: -3.99,
      adresse: 'Cocody Bay, Riviera',
      dateDebut: dansNJours(9, 22),
      prix: 10000,
      capacite: 200,
      statut: StatutEvenement.PUBLIE,
      organisateurId: aya.id,
      contactOrganisateur: aya.telephone,
    },
    {
      titre: "Tournoi de football des quartiers d'Abobo",
      description: "Tournoi inter-quartiers ouvert a tous, finale et remise des trophees en fin de journee.",
      categorie: CategorieEvenement.SPORT,
      commune: 'Abobo',
      latitude: 5.43,
      longitude: -4.015,
      adresse: 'Stade municipal, Abobo',
      dateDebut: dansNJours(17, 14),
      prix: null,
      capacite: null,
      statut: StatutEvenement.PUBLIE,
      organisateurId: ibrahim.id,
      contactOrganisateur: ibrahim.telephone,
    },
    {
      titre: "Exposition d'art contemporain ivoirien",
      description: "Une trentaine d'artistes exposent peinture, sculpture et photographie contemporaine.",
      categorie: CategorieEvenement.CULTURE,
      commune: 'Plateau',
      latitude: 5.322,
      longitude: -4.018,
      adresse: 'Galerie Cecile Fakhoury, Plateau',
      dateDebut: dansNJours(28, 10),
      prix: 2000,
      capacite: 100,
      statut: StatutEvenement.PUBLIE,
      organisateurId: aya.id,
      contactOrganisateur: aya.telephone,
    },
    {
      titre: 'Messe de rentree a la Basilique',
      description: 'Messe solennelle de rentree paroissiale, ouverte a tous les fideles.',
      categorie: CategorieEvenement.RELIGIEUX,
      commune: 'Treichville',
      latitude: 5.295,
      longitude: -4.01,
      adresse: 'Paroisse Saint-Paul, Treichville',
      dateDebut: dansNJours(19, 9),
      prix: null,
      capacite: null,
      statut: StatutEvenement.PUBLIE,
      organisateurId: ibrahim.id,
      contactOrganisateur: ibrahim.telephone,
    },
    {
      titre: 'Marcory Live Music Festival',
      description: 'Festival de musiques actuelles sur deux scenes, tetes d\'affiche locales et internationales.',
      categorie: CategorieEvenement.CONCERT,
      commune: 'Marcory',
      latitude: 5.286,
      longitude: -3.975,
      adresse: 'Espace Latrille Events, Marcory',
      dateDebut: dansNJours(33, 18),
      prix: 7500,
      capacite: 500,
      statut: StatutEvenement.PUBLIE,
      organisateurId: aya.id,
      contactOrganisateur: aya.telephone,
    },
    {
      titre: 'Yop Comedy Show',
      description: 'Plateau d\'humoristes ivoiriens, premiere partie assuree par de jeunes talents locaux.',
      categorie: CategorieEvenement.SOIREE,
      commune: 'Yopougon',
      latitude: 5.345,
      longitude: -4.085,
      adresse: 'Le Boulevard des Arts, Yopougon',
      dateDebut: dansNJours(12, 20),
      prix: 3000,
      capacite: 250,
      statut: StatutEvenement.PUBLIE,
      organisateurId: ibrahim.id,
      contactOrganisateur: ibrahim.telephone,
    },
    {
      titre: 'Conference Entrepreneuriat Feminin',
      description: 'Temoignages et ateliers pratiques pour les femmes entrepreneures d\'Abidjan.',
      categorie: CategorieEvenement.CONFERENCE,
      commune: 'Cocody',
      latitude: 5.348,
      longitude: -3.985,
      adresse: 'Centre de conferences, Cocody Angre',
      dateDebut: dansNJours(26, 9),
      prix: null,
      capacite: 120,
      statut: StatutEvenement.PUBLIE,
      organisateurId: aya.id,
      contactOrganisateur: aya.telephone,
    },
    {
      titre: 'Match de gala Asec vs Africa Sports',
      description: 'Derby ivoirien en match amical, ambiance garantie dans les tribunes.',
      categorie: CategorieEvenement.SPORT,
      commune: 'Treichville',
      latitude: 5.29,
      longitude: -4.005,
      adresse: 'Stade Robert Champroux, Treichville',
      dateDebut: dansNJours(15, 16),
      prix: 2000,
      capacite: 1000,
      statut: StatutEvenement.PUBLIE,
      organisateurId: ibrahim.id,
      contactOrganisateur: ibrahim.telephone,
    },
    {
      titre: 'Nuit du Coupe-Decale',
      description: 'Les meilleurs DJ coupe-decale de la ville enchainent les sets jusqu\'au petit matin.',
      categorie: CategorieEvenement.SOIREE,
      commune: 'Yopougon',
      latitude: 5.342,
      longitude: -4.08,
      adresse: 'Le Nid, Yopougon Selmer',
      dateDebut: dansNJours(38, 23),
      prix: 5000,
      capacite: 400,
      statut: StatutEvenement.EN_ATTENTE,
      organisateurId: aya.id,
      contactOrganisateur: aya.telephone,
    },
    {
      titre: "Festival Gospel d'Abobo",
      description: 'Chorales et artistes gospel se succedent sur scene pour une soiree de louange.',
      categorie: CategorieEvenement.RELIGIEUX,
      commune: 'Abobo',
      latitude: 5.425,
      longitude: -4.02,
      adresse: 'Esplanade municipale, Abobo',
      dateDebut: dansNJours(30, 18),
      prix: null,
      capacite: null,
      statut: StatutEvenement.EN_ATTENTE,
      organisateurId: ibrahim.id,
      contactOrganisateur: ibrahim.telephone,
    },
    {
      titre: 'Foire Artisanale de Cocody',
      description: "Exposants d'artisanat local, mode et decoration, restauration sur place.",
      categorie: CategorieEvenement.CULTURE,
      commune: 'Cocody',
      latitude: 5.355,
      longitude: -3.995,
      adresse: 'Place de la mairie, Cocody',
      dateDebut: dansNJours(36, 10),
      prix: null,
      capacite: 300,
      statut: StatutEvenement.EN_ATTENTE,
      organisateurId: aya.id,
      contactOrganisateur: aya.telephone,
    },
    {
      titre: 'Soiree clandestine non autorisee',
      description: 'Soiree privee dans un lieu non precise.',
      categorie: CategorieEvenement.SOIREE,
      commune: 'Marcory',
      latitude: 5.28,
      longitude: -3.97,
      adresse: 'Adresse a confirmer',
      dateDebut: dansNJours(6, 23),
      prix: 1000,
      capacite: 50,
      statut: StatutEvenement.REFUSE,
      motifRefus: "Lieu et organisateur responsable non identifiables, contraire aux regles de publication.",
      organisateurId: ibrahim.id,
      contactOrganisateur: ibrahim.telephone,
    },
    {
      titre: 'Idee de concert acoustique',
      description: "Brouillon en cours de redaction, details du lieu et de la date a confirmer.",
      categorie: CategorieEvenement.CONCERT,
      commune: 'Plateau',
      latitude: 5.318,
      longitude: -4.022,
      adresse: 'A definir',
      dateDebut: dansNJours(45, 20),
      prix: null,
      capacite: null,
      statut: StatutEvenement.BROUILLON,
      organisateurId: aya.id,
      contactOrganisateur: aya.telephone,
    },
  ];

  for (const evenement of evenements) {
    const slug = genererSlug(evenement.titre);
    await prisma.evenement.create({
      data: {
        titre: evenement.titre,
        slug,
        description: evenement.description,
        image: image(slug),
        categorie: evenement.categorie,
        dateDebut: evenement.dateDebut,
        prix: evenement.prix,
        capacite: evenement.capacite,
        latitude: evenement.latitude,
        longitude: evenement.longitude,
        adresse: evenement.adresse,
        commune: evenement.commune,
        statut: evenement.statut,
        motifRefus: evenement.motifRefus,
        organisateurId: evenement.organisateurId,
        contactOrganisateur: evenement.contactOrganisateur,
      },
    });
  }

  console.log(`${evenements.length} evenements crees.`);
}

main()
  .catch((erreur: unknown) => {
    console.error(erreur);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
