import { InstallerSpec } from '../spec'

const VAPID_RUNTIME = `// webpush
if (config.VAPID.PRIVATE_KEY && config.VAPID.PUBLIC_KEY) {
  webpush.setVapidDetails(config.VAPID.SUBJECT, config.VAPID.PUBLIC_KEY, config.VAPID.PRIVATE_KEY)
} else {
  logger.warn('VAPID keys not configured — push notifications disabled')
}`

const VAPID_CONFIG = `  VAPID: {
    PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    SUBJECT: process.env.VAPID_SUBJECT || 'mailto:support@example.com',
  },`

export const pushSpec: InstallerSpec = {
  feature: 'push',
  description: 'Add web push notifications support via web-push',
  deps: ['web-push'],
  devDeps: ['@types/web-push'],
  wire: [
    { kind: 'import', statement: "import webpush from 'web-push'" },
    { kind: 'main', anchor: 'beforeListen', code: VAPID_RUNTIME, key: 'setVapidDetails(' },
    { kind: 'config', code: VAPID_CONFIG, key: 'VAPID:' },
    {
      kind: 'envBlock',
      marker: 'webpush',
      key: 'VAPID_PUBLIC_KEY',
      code: (config) => `# Webpush notifications. Generate keys with: ${config.getPackageRunnerCommand()} web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:support@example.com`,
    },
  ],
  scripts: (config) => ({
    'vapid:generate': `${config.getPackageRunnerCommand()} web-push generate-vapid-keys`,
  }),
  success: (config) => [
    '-------------------------------------------------------------------------------------------',
    'Web push notifications were wired up in src/main.ts',
    'VAPID settings are read from src/config/index.ts: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT',
    `Generate your keys with: ${config.getRunCommand()} vapid:generate`,
    'Then copy them into your .env file. Without keys push notifications stay disabled and the server only logs a warning.',
    '-------------------------------------------------------------------------------------------',
  ],
  skippedSuffix: 'already has the webpush configuration',
}
