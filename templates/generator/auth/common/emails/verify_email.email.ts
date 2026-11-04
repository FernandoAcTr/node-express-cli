import { IMail } from '@/notifications/emails/mailable'
import { MailOptions } from '@/utils/mailer'

export class VerifyEmailEmail implements IMail {
  constructor(
    private readonly name: string,
    private readonly verificationUrl: string
  ) {}

  configure(): Omit<MailOptions, 'to'> {
    return {
      subject: 'Verify your email address',
      template: 'auth/verify-email.hbs',
      payload: {
        name: this.name,
        verificationUrl: this.verificationUrl
      }
    }
  }
}
