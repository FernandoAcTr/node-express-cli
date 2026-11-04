import { config } from '@/config'
import logger from '@/utils/logger'
import { IMail, Mailable } from '@/notifications/emails/mailable'
import { PasswordResetEmail } from '@/notifications/emails/password_reset.email'
import { VerifyEmailEmail } from '@/notifications/emails/verify_email.email'
import { AuthUser } from './auth.types'

/**
 * Correos del módulo auth. `install:auth` exige `install:mailer`, así que
 * `Mailable` y las clases de email siempre existen en un proyecto con auth.
 */
export class AuthMailer {
  async sendPasswordReset(user: AuthUser, token: string): Promise<void> {
    const url = `${config.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`

    await this.send(user, new PasswordResetEmail(user.name, url), 'Reset your password')
  }

  async sendEmailVerification(user: AuthUser, token: string): Promise<void> {
    const url = `${config.FRONTEND_URL}/verify-email/${user.id}/${token}`

    await this.send(user, new VerifyEmailEmail(user.name, url), 'Verify your email address')
  }

  private async send(user: AuthUser, email: IMail, subject: string): Promise<void> {
    try {
      await Mailable.from(user.email).send(email)
    } catch (error) {
      // Un fallo de correo no debe tumbar el registro ni el flujo de reset.
      logger.warn(`Could not send "${subject}" to ${user.email}: ${(error as Error).message}`)
    }
  }
}

export const authMailer = new AuthMailer()
