import { IMail } from '@/notifications/emails/mailable'
import { MailOptions } from '@/utils/mailer'

export class PasswordResetEmail implements IMail {
  constructor(
    private readonly name: string,
    private readonly resetUrl: string
  ) {}

  configure(): Omit<MailOptions, 'to'> {
    return {
      subject: 'Reset your password',
      template: 'auth/password-reset.hbs',
      payload: {
        name: this.name,
        resetUrl: this.resetUrl
      }
    }
  }
}
