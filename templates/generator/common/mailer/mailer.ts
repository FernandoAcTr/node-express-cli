import fs from 'fs'
import handlebars from 'handlebars'
import appRoot from 'app-root-path'
import nodemailer from 'nodemailer'
import Mail from 'nodemailer/lib/mailer'
import logger from '@/utils/logger'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import { config } from '@/config'

const { MAILER } = config

export interface MailOptions {
  to: string
  subject: string
  html?: string
  template?: string
  attachments?: Array<Mail.Attachment> | undefined
  payload?: unknown
}

export interface NotificationOptions {
  to: string
  subject: string
  greeting: string
  content: string
  action?: {
    title: string
    url: string
  }
  atte: string
  template?: string
}

/**
 * Punto único de salida SMTP.
 *
 * Los emails concretos se modelan con `Mailable` + `IMail`; este servicio solo
 * conoce transporte y plantillas. `sendNotification` se conserva para los
 * proyectos que ya lo usaban.
 */
export class Mailer {
  public static async sendMail(options: MailOptions): Promise<void> {
    if (process.env.NODE_ENV === 'test') return

    if (!MAILER.HOST || !MAILER.PORT || !MAILER.USERNAME || !MAILER.PASSWORD) {
      logger.error('Mailer configuration is missing')
      return
    }

    if (!options.html && !options.template) {
      throw new Error('Mailer requires either "html" or "template"')
    }

    const html = options.html ?? this.render(options.template!, options.payload)
    const { template: _template, payload: _payload, ...mail } = options

    const transporter = this.createTransporter()

    try {
      await transporter.sendMail({
        from: `${MAILER.FROM_NAME} <${MAILER.FROM_ADDRESS}>`,
        ...mail,
        html,
      })

      logger.debug(`Email sent to ${options.to}`)
    } catch (error) {
      logger.error(error)
      throw error
    }
  }

  public static async sendNotification(options: NotificationOptions): Promise<void> {
    const template = options.template ?? 'notification/notification.hbs'
    const logoPath = `${appRoot}/src/templates/notification/logo.png`

    await this.sendMail({
      to: options.to,
      subject: options.subject,
      template,
      payload: options,
      attachments: [
        {
          filename: 'logo.png',
          path: logoPath,
          cid: 'logo',
        },
      ],
    })
  }

  private static render(template: string, payload: unknown = {}): string {
    const source = fs.readFileSync(`${appRoot}/src/templates/${template}`, 'utf8')

    return handlebars.compile(source)(payload)
  }

  private static createTransporter() {
    const options: SMTPTransport.Options = {
      host: MAILER.HOST!,
      port: Number(MAILER.PORT),
      secure: Number(MAILER.PORT) === 465,
      auth: {
        type: 'LOGIN',
        user: MAILER.USERNAME!,
        pass: MAILER.PASSWORD!,
      },
    }

    return nodemailer.createTransport(options)
  }
}
