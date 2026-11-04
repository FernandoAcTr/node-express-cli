import { IMail } from './mailable'
import { MailOptions } from '@/utils/mailer'

/**
 * Ejemplo de email modelado como clase. Crea tus propios `*.email.ts`
 * implementando `IMail` y envíalos con `Mailable.from(...).send(new ...)`.
 */
export class WelcomeEmail implements IMail {
  constructor(
    private readonly name: string,
    private readonly url: string
  ) {}

  configure(): Omit<MailOptions, 'to'> {
    return {
      subject: 'Welcome',
      template: 'emails/welcome.hbs',
      payload: {
        name: this.name,
        url: this.url
      }
    }
  }
}
