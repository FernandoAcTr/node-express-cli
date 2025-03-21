import fs from 'fs'
import handlebars from 'handlebars'
import appRoot from 'app-root-path'
import nodemailer from 'nodemailer'
import Mail from 'nodemailer/lib/mailer'
import logger from '@/utils/logger'
import SMTPTransport from 'nodemailer/lib/smtp-transport'
import { config } from '@/config'

const { MAILER } = config

interface MailOptions {
  to: string
  subject: string
  html: string
  attachments?: Array<Mail.Attachment> | undefined
}

interface NotificationOptions {
  to: string
  subject: string
  greeting: string
  content: string
  action?: {
    title: string
    url: string
  }
  atte: string
}

export class Mailer {
  public static async sendMail(options: MailOptions): Promise<void> {
    const transporter = this.createTransporter()
    try {
      const info = await transporter.sendMail({
        from: `${MAILER.FROM_NAME} <${MAILER.FROM_ADDRESS}>`,
        ...options,
      })

      logger.log(`Email sent to ${options.to}`)
      console.log(info)
    } catch (error: any) {
      logger.error(error)
    }
  }

  public static sendNotification(options: NotificationOptions) {
    const template = fs.readFileSync(`${appRoot}/src/templates/notification/notification.hbs`, 'utf8')
    const logoPath = `${appRoot}/src/templates/notification/logo.png`

    const html = handlebars.compile(template)(options)
    this.sendMail({
      to: options.to,
      subject: options.subject,
      html,
      attachments: [
        {
          filename: 'logo.png',
          path: logoPath,
          cid: 'logo',
        },
      ],
    })
  }

  private static createTransporter() {
    const options: SMTPTransport.Options = {
      host: MAILER.HOST!,
      port: Number(MAILER.PORT),
      secure: false, //true for 465, false for other ports
      auth: {
        type: 'LOGIN',
        user: MAILER.USERNAME!,
        pass: MAILER.PASSWORD!,
      },
    }

    const transporter = nodemailer.createTransport(options)

    return transporter
  }
}
