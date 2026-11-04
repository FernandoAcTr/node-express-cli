import { Mailer, MailOptions } from '@/utils/mailer'

export interface IMail {
  configure: () => Omit<MailOptions, 'to'>
}

export interface IMailable {
  email: string
}

/**
 * Envuelve un email modelado como clase (`IMail`) y resuelve el destinatario.
 * El email no conoce SMTP ni el destinatario: solo declara asunto, plantilla y
 * payload en `configure()`.
 */
export class Mailable {
  private constructor(private readonly email: string) {}

  public static from(mailable: string | IMailable): Mailable {
    return new Mailable(typeof mailable === 'string' ? mailable : mailable.email)
  }

  async send(email: IMail): Promise<void> {
    await Mailer.sendMail({ ...email.configure(), to: this.email })
  }
}
