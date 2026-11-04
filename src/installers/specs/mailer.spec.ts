import { InstallerSpec } from '../spec'

const MAILER_CONFIG = `  MAILER: {
    HOST: process.env.MAIL_HOST,
    PORT: process.env.MAIL_PORT,
    USERNAME: process.env.MAIL_USERNAME,
    PASSWORD: process.env.MAIL_PASSWORD,
    FROM_ADDRESS: process.env.MAIL_FROM_ADDRESS,
    FROM_NAME: process.env.MAIL_FROM_NAME,
  },`

const MAILER_ENV = `MAIL_HOST=
MAIL_PORT=
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME=`

export const mailerSpec: InstallerSpec = {
  feature: 'mailer',
  description: 'Add class-based emails and notifications via nodemailer',
  deps: ['handlebars', 'nodemailer'],
  devDeps: ['@types/nodemailer'],
  dirs: ['src/utils', 'src/notifications', 'src/templates'],
  files: [{ from: 'generator/common/mailer/mailer.ts', to: 'src/utils/mailer.ts' }],
  copyDir: [
    { from: 'generator/common/mailer/notifications', to: 'src/notifications' },
    { from: 'generator/common/mailer/templates', to: 'src/templates' },
  ],
  wire: [
    { kind: 'config', code: MAILER_CONFIG, key: 'MAILER:' },
    { kind: 'envBlock', marker: 'mailer', code: MAILER_ENV, key: 'MAIL_HOST=' },
  ],
  success: [
    '-------------------------------------------------------------------------------------------',
    'Mailer installed: src/utils/mailer.ts sends SMTP email and renders Handlebars templates',
    'Emails are classes implementing IMail: Mailable.from(email).send(new WelcomeEmail(...))',
    'Notifications are classes implementing INotification: Notifiable.from({ id, email }).notify(...)',
    'Run "node-express-cli install:notifications" to persist notifications and expose HTTP endpoints',
    '-------------------------------------------------------------------------------------------',
  ],
  skippedSuffix: 'already has the mailer configuration',
}
