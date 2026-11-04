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
  description: 'Add support for send mails via nodemailer library',
  deps: ['handlebars', 'nodemailer'],
  devDeps: ['@types/nodemailer'],
  dirs: ['src/utils'],
  files: [{ from: 'generator/common/mailer/mailer.ts', to: 'src/utils/mailer.ts' }],
  copyDir: [{ from: 'generator/common/mailer/templates', to: 'src/templates' }],
  wire: [
    { kind: 'config', code: MAILER_CONFIG, key: 'MAILER:' },
    { kind: 'envBlock', marker: 'mailer', code: MAILER_ENV, key: 'MAIL_HOST=' },
  ],
  success: [
    'A new class called mailer has been installed inside utils directory. You can use it to send emails and notifications via the notification template or create your own email templates',
  ],
}
