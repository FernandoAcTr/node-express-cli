import { config } from '@/config'
import logger from '@/utils/logger'
import { Mailer } from '@/utils/mailer'
import { AuthUser } from './auth.types'

/**
 * Correos del módulo auth. `install:auth` exige `install:mailer`, así que
 * `@/utils/mailer` siempre existe en un proyecto con auth instalada.
 */
export class AuthMailer {
  async sendPasswordReset(user: AuthUser, token: string): Promise<void> {
    const url = `${config.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`

    await this.send(user, {
      subject: 'Reset your password',
      greeting: `Hi ${user.name},`,
      content: 'We received a request to reset your password. This link expires in 60 minutes.',
      action: { title: 'Reset password', url },
    })
  }

  async sendEmailVerification(user: AuthUser, token: string): Promise<void> {
    const url = `${config.FRONTEND_URL}/verify-email/${user.id}/${token}`

    await this.send(user, {
      subject: 'Verify your email address',
      greeting: `Hi ${user.name},`,
      content: 'Confirm your email address to finish setting up your account.',
      action: { title: 'Verify email', url },
    })
  }

  private async send(
    user: AuthUser,
    message: {
      subject: string
      greeting: string
      content: string
      action: { title: string; url: string }
    }
  ): Promise<void> {
    try {
      Mailer.sendNotification({
        to: user.email,
        subject: message.subject,
        greeting: message.greeting,
        content: message.content,
        atte: user.name,
        action: message.action,
      })
    } catch (error) {
      // Un fallo de correo no debe tumbar el registro ni el flujo de reset.
      logger.warn(`Could not send "${message.subject}" to ${user.email}: ${(error as Error).message}`)
    }
  }
}

export const authMailer = new AuthMailer()
