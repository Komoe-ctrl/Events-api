import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { ErreurMetier } from '../common/exceptions/erreur-metier.exception';
import {
  Prisma,
  RoleUtilisateur,
  type Utilisateur,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmerReinitialisationDto } from './dto/confirmer-reinitialisation.dto';
import { ConnexionDto } from './dto/connexion.dto';
import { DemandeReinitialisationDto } from './dto/demande-reinitialisation.dto';
import { InscriptionDto } from './dto/inscription.dto';
import { ReponseAuthDto } from './dto/reponse-auth.dto';
import { ReponseGeneriqueDto } from './dto/reponse-generique.dto';
import {
  NOTIFICATEUR_MOT_DE_PASSE,
  type NotificateurMotDePasse,
} from './notifications/notificateur-mot-de-passe.interface';

// Duree de vie courte : assez pour ouvrir un email, pas assez pour qu'un
// lien oublie dans une boite mail traine longtemps comme risque.
const DUREE_VIE_TOKEN_MINUTES = 30;
// Limitation des tentatives sur l'endpoint de demande (regle de domaine :
// securite) : au-dela, la demande est silencieusement ignoree, mais la
// reponse reste identique — sinon le throttling lui-meme fuite de l'info.
const MAX_DEMANDES_PAR_HEURE = 3;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(NOTIFICATEUR_MOT_DE_PASSE)
    private readonly notificateur: NotificateurMotDePasse,
  ) {}

  async inscription(dto: InscriptionDto): Promise<ReponseAuthDto> {
    const motDePasseHash = await argon2.hash(dto.motDePasse);

    let utilisateur: Utilisateur;
    try {
      utilisateur = await this.prisma.utilisateur.create({
        data: {
          nom: dto.nom,
          telephone: dto.telephone,
          email: dto.email,
          motDePasseHash,
          role: dto.role ?? RoleUtilisateur.PARTICIPANT,
        },
      });
    } catch (erreur) {
      throw this.convertirErreurUnicite(erreur);
    }

    return this.construireReponse(utilisateur);
  }

  async connexion(dto: ConnexionDto): Promise<ReponseAuthDto> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { telephone: dto.telephone },
    });

    const motDePasseValide =
      utilisateur !== null &&
      (await argon2.verify(utilisateur.motDePasseHash, dto.motDePasse));

    if (!motDePasseValide || utilisateur === null) {
      throw new ErreurMetier(
        'IDENTIFIANTS_INVALIDES',
        'Numero de telephone ou mot de passe incorrect.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.construireReponse(utilisateur);
  }

  async demanderReinitialisation(
    dto: DemandeReinitialisationDto,
  ): Promise<ReponseGeneriqueDto> {
    // Reponse strictement identique que l'email existe ou non : sinon cet
    // endpoint devient un moyen de savoir qui a un compte (regle de domaine).
    const reponse: ReponseGeneriqueDto = {
      message:
        "Si un compte existe avec cette adresse, un email de reinitialisation a ete envoye.",
    };

    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
    });
    if (!utilisateur) {
      return reponse;
    }

    const uneHeureAvant = new Date(Date.now() - 60 * 60 * 1000);
    const demandesRecentes = await this.prisma.tokenReinitialisation.count({
      where: { utilisateurId: utilisateur.id, createdAt: { gt: uneHeureAvant } },
    });
    if (demandesRecentes >= MAX_DEMANDES_PAR_HEURE) {
      // Throttle silencieux : meme reponse, rien n'est genere ni envoye.
      return reponse;
    }

    // Un seul jeton valide a la fois : la demande precedente est invalidee
    // (expiree immediatement) plutot que de laisser plusieurs liens actifs
    // en parallele. updateMany plutot que deleteMany : un delete effacerait
    // la ligne avant le prochain count() ci-dessus, et la limitation des
    // tentatives ne compterait plus jamais au-dela de 1-2 demandes — verifie
    // empiriquement (5 demandes de suite sans aucun throttle) avant ce choix.
    await this.prisma.tokenReinitialisation.updateMany({
      where: {
        utilisateurId: utilisateur.id,
        utiliseLe: null,
        expireLe: { gt: new Date() },
      },
      data: { expireLe: new Date() },
    });

    const tokenClair = randomBytes(32).toString('hex');
    await this.prisma.tokenReinitialisation.create({
      data: {
        utilisateurId: utilisateur.id,
        tokenHash: this.hacherToken(tokenClair),
        expireLe: new Date(Date.now() + DUREE_VIE_TOKEN_MINUTES * 60 * 1000),
      },
    });

    // AuthService ne sait pas si ce lien part par email ou (plus tard) par
    // SMS, ni comment — seule l'implementation fournie par AuthModule le
    // sait (regle de domaine : isolation de l'envoi).
    await this.notificateur.envoyerLienReinitialisation({
      email: utilisateur.email,
      nom: utilisateur.nom,
      lien: this.construireLienReinitialisation(tokenClair),
    });

    return reponse;
  }

  async reinitialiserMotDePasse(
    dto: ConfirmerReinitialisationDto,
  ): Promise<ReponseGeneriqueDto> {
    const enregistrement = await this.prisma.tokenReinitialisation.findUnique(
      { where: { tokenHash: this.hacherToken(dto.token) } },
    );

    if (!enregistrement) {
      throw new ErreurMetier(
        'TOKEN_INVALIDE',
        'Ce lien de reinitialisation est invalide.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (enregistrement.utiliseLe !== null) {
      throw new ErreurMetier(
        'TOKEN_DEJA_UTILISE',
        'Ce lien de reinitialisation a deja ete utilise.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (enregistrement.expireLe.getTime() < Date.now()) {
      throw new ErreurMetier(
        'TOKEN_EXPIRE',
        'Ce lien de reinitialisation a expire. Demandes-en un nouveau.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const motDePasseHash = await argon2.hash(dto.nouveauMotDePasse);

    // Transaction : le mot de passe change et le jeton est marque utilise
    // ensemble, ou aucun des deux — jamais un jeton brule sans effet, ni un
    // jeton reutilisable apres avoir deja servi.
    await this.prisma.$transaction([
      this.prisma.utilisateur.update({
        where: { id: enregistrement.utilisateurId },
        data: { motDePasseHash },
      }),
      this.prisma.tokenReinitialisation.update({
        where: { id: enregistrement.id },
        data: { utiliseLe: new Date() },
      }),
    ]);

    return { message: 'Mot de passe reinitialise avec succes.' };
  }

  private hacherToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Format provisoire : la cible reelle (deep link mobile vs page web
  // intermediaire) est une decision cote app, hors perimetre de ce lot API.
  private construireLienReinitialisation(tokenClair: string): string {
    const base = process.env.APP_URL ?? 'http://localhost:8081';
    return `${base}/reinitialiser-mot-de-passe?token=${tokenClair}`;
  }

  private construireReponse(utilisateur: Utilisateur): ReponseAuthDto {
    const jeton = this.jwtService.sign({
      sub: utilisateur.id,
      telephone: utilisateur.telephone,
      role: utilisateur.role,
    });

    return {
      jeton,
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        telephone: utilisateur.telephone,
        email: utilisateur.email,
        role: utilisateur.role,
        createdAt: utilisateur.createdAt,
      },
    };
  }

  private convertirErreurUnicite(erreur: unknown): never {
    if (
      erreur instanceof Prisma.PrismaClientKnownRequestError &&
      erreur.code === 'P2002'
    ) {
      const cibles = erreur.meta?.target;
      const champs = Array.isArray(cibles) ? cibles : [];
      if (champs.includes('telephone')) {
        throw new ErreurMetier(
          'TELEPHONE_DEJA_UTILISE',
          'Ce numero de telephone est deja utilise.',
          HttpStatus.CONFLICT,
        );
      }
      if (champs.includes('email')) {
        throw new ErreurMetier(
          'EMAIL_DEJA_UTILISE',
          'Cette adresse email est deja utilisee.',
          HttpStatus.CONFLICT,
        );
      }
    }
    throw erreur;
  }
}
