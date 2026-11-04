import { IInstallerGenerator, IPostGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { Reporter } from '../report'

const WEB_PUSH_IMPORT = "import webpush from 'web-push'"

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

const VAPID_ENV = `# Webpush notifications. Generate keys with: <runner> web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:support@example.com`

export class PushGenerator implements IInstallerGenerator, IPostGenerator {
  constructor(private readonly ctx: Context) {}

  async installDependencies(): Promise<void> {
    if (this.ctx.has('push')) {
      this.ctx.logger.info('web-push is already installed; skipping dependency installation')
      return
    }

    this.ctx.logger.info('================= Installing web-push =================')
    await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} web-push`, this.ctx.cwd)
    await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} @types/web-push`, this.ctx.cwd)
  }

  async post(): Promise<void> {
    const reporter = new Reporter(this.ctx.logger, 'already has the webpush configuration')
    const wiring = this.ctx.wiring

    // Primero se valida y aplica `main.ts`. Si falta algún anchor, no se toca
    // config, env ni package.json para no dejar una feature a medio instalar.
    const main = wiring.transaction((wire) => {
      wire.import(WEB_PUSH_IMPORT)
      wire.main('beforeListen', VAPID_RUNTIME, { key: 'setVapidDetails(' })
    })

    reporter.add(main)

    if (main.warnings.length > 0) {
      return
    }

    const runner = this.ctx.config.getPackageRunnerCommand()

    const files = wiring.transaction((wire) => {
      wire.config(VAPID_CONFIG, { key: 'VAPID:' })
      wire.envBlock('webpush', VAPID_ENV.replace('<runner>', runner), {
        key: 'VAPID_PUBLIC_KEY',
      })
    })

    reporter.add(files)
    reporter.add(wiring.script('vapid:generate', `${runner} web-push generate-vapid-keys`))

    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    this.ctx.logger.success('Web push notifications were wired up in src/main.ts')
    this.ctx.logger.success('VAPID settings are read from src/config/index.ts: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT')
    this.ctx.logger.success(`Generate your keys with: ${this.ctx.config.getRunCommand()} vapid:generate`)
    this.ctx.logger.success(
      'Then copy them into your .env file. Without keys push notifications stay disabled and the server only logs a warning.'
    )
    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
  }
}
