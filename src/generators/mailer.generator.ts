import path from 'path'
import { IFileSystemGenerator, IInstallerGenerator, IPostGenerator } from '../interfaces/generator.interface'
import { configService } from '../services/config.service'
import { shellService } from '../services/shell.service'
import fs from 'fs-extra'

export class MailerGenerator implements IInstallerGenerator, IFileSystemGenerator, IPostGenerator {
  async installDependencies(): Promise<void> {
    console.log('================= Installing Mail dependencies ================='.yellow)
    await shellService.execAsync(`${configService.getInstallCommand()} handlebars nodemailer`)
    await shellService.execAsync(`${configService.getDevInstallCommand()} @types/nodemailer`)
  }

  async createDirectories(): Promise<void> {
    fs.mkdirSync('./src/utils', { recursive: true })
  }

  async copyFiles(): Promise<void> {
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/mailer/mailer.ts'), './src/utils/mailer.ts')
    fs.copySync(path.resolve(__dirname, '../../templates/generator/common/mailer/templates'), './src/templates')
  }

  async post(): Promise<void> {
    console.log(
      "A new class called mailer has been installed inside utils directory. You can use it to send emails and notifications via the notification template or create your own email's templates"
        .green
    )
  }
}
