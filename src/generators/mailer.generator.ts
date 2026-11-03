import path from 'path'
import { IFileSystemGenerator, IInstallerGenerator, IPostGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import fs from 'fs-extra'

export class MailerGenerator implements IInstallerGenerator, IFileSystemGenerator, IPostGenerator {
  constructor(private readonly ctx: Context) {}

  async installDependencies(): Promise<void> {
    this.ctx.logger.info('================= Installing Mail dependencies =================')
    await this.ctx.shell.execAsync(`${this.ctx.config.getInstallCommand()} handlebars nodemailer`)
    await this.ctx.shell.execAsync(`${this.ctx.config.getDevInstallCommand()} @types/nodemailer`)
  }

  async createDirectories(): Promise<void> {
    fs.mkdirSync('./src/utils', { recursive: true })
  }

  async copyFiles(): Promise<void> {
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/mailer/mailer.ts'), './src/utils/mailer.ts')
    fs.copySync(path.resolve(__dirname, '../../templates/generator/common/mailer/templates'), './src/templates')
  }

  async post(): Promise<void> {
    this.ctx.logger.success(
      "A new class called mailer has been installed inside utils directory. You can use it to send emails and notifications via the notification template or create your own email's templates"
    )
  }
}
