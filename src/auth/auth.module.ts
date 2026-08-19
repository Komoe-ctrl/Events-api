import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { NotificateurMotDePasseBrevoService } from './notifications/notificateur-mot-de-passe-brevo.service';
import { NotificateurMotDePasseLogService } from './notifications/notificateur-mot-de-passe-log.service';
import { NOTIFICATEUR_MOT_DE_PASSE } from './notifications/notificateur-mot-de-passe.interface';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        // Lu au demarrage de Nest (apres process.loadEnvFile() dans main.ts),
        // jamais a l'import du module : evite un JWT_SECRET vide si ce module
        // est charge avant que l'env soit peuplee.
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          throw new Error(
            'JWT_SECRET manquant dans les variables environnement.',
          );
        }
        return { secret, signOptions: { expiresIn: '30d' } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // Bascule automatique sur Brevo des que BREVO_API_KEY est configuree,
    // y compris en prod si elle manque encore — jamais d'echec silencieux
    // faute de cle, on retombe sur les logs plutot que de planter au
    // demarrage. AuthService ne connait que l'interface, jamais ce choix.
    {
      provide: NOTIFICATEUR_MOT_DE_PASSE,
      useFactory: () =>
        process.env.BREVO_API_KEY
          ? new NotificateurMotDePasseBrevoService()
          : new NotificateurMotDePasseLogService(),
    },
  ],
})
export class AuthModule {}
