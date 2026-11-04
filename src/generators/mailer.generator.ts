import { IFileSystemGenerator, IInstallerGenerator, IPostGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'

export class MailerGenerator implements IInstallerGenerator, IFileSystemGenerator, IPostGenerator {
  constructor(private readonly ctx: Context) {}

  async installDependencies(): Promise<void> {
    if (this.ctx.has('mailer')) {
      this.ctx.logger.info('The mailer is already installed; skipping dependency installation')
    } else {
      this.ctx.logger.info('================= Installing Mail dependencies =================')
      await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} handlebars nodemailer`, this.ctx.cwd)
      await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} @types/nodemailer`, this.ctx.cwd)
    }
  }

  async createDirectories(): Promise<void> {
    this.ctx.project.ensureDir('src/utils')
  }

  async copyFiles(): Promise<void> {
    const policy = 'overwrite-if-unmodified' as const

    this.ctx.project.copy('src/utils/mailer.ts', 'generator/common/mailer/mailer.ts', policy)
    this.ctx.project.copyDir('src/templates', 'generator/common/mailer/templates', policy)
  }

  async post(): Promise<void> {
    this.ctx.logger.success(
      "A new class called mailer has been installed inside utils directory. You can use it to send emails and notifications via the notification template or create your own email's templates"
    )
  }
}
