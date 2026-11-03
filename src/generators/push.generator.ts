import { IInstallerGenerator, IPostGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { wirePush } from '../utils/wire_push'

export class PushGenerator implements IInstallerGenerator, IPostGenerator {
  constructor(private readonly ctx: Context) {}

  async installDependencies(): Promise<void> {
    this.ctx.logger.info('================= Installing web-push =================')
    await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} web-push`)
    await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} @types/web-push`)
  }

  async post(): Promise<void> {
    const result = wirePush({ packageRunner: this.ctx.config.getPackageRunnerCommand() })

    result.changed.forEach((file) => this.ctx.logger.success(`Updated ${file}`))
    result.skipped.forEach((file) => this.ctx.logger.success(`${file} already has the webpush configuration`))
    result.warnings.forEach((warning) => this.ctx.logger.warn(warning))

    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    this.ctx.logger.success('Web push notifications were wired up in src/main.ts')
    this.ctx.logger.success(
      'VAPID settings are read from src/config/index.ts: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT'
    )
    this.ctx.logger.success(`Generate your keys with: ${this.ctx.config.getRunCommand()} vapid:generate`)
    this.ctx.logger.success(
      'Then copy them into your .env file. Without keys push notifications stay disabled and the server only logs a warning.'
    )
    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
  }
}
