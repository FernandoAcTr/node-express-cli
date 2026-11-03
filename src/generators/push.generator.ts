import { IInstallerGenerator, IPostGenerator } from '../interfaces/generator.interface'
import { configService } from '../services/config.service'
import { shellService } from '../services/shell.service'
import { wirePush } from '../utils/wire_push'

export class PushGenerator implements IInstallerGenerator, IPostGenerator {
  async installDependencies(): Promise<void> {
    console.log('================= Installing web-push ================='.yellow)
    await shellService.execAsync(`${configService.getInstallCommand()} web-push`)
    await shellService.execAsync(`${configService.getDevInstallCommand()} @types/web-push`)
  }

  async post(): Promise<void> {
    const result = wirePush()

    result.changed.forEach((file) => console.log(`Updated ${file}`.green))
    result.skipped.forEach((file) => console.log(`${file} already has the webpush configuration`.green))
    result.warnings.forEach((warning) => console.log(warning.yellow))

    console.log('-------------------------------------------------------------------------------------------'.green)
    console.log('Web push notifications were wired up in src/main.ts'.green)
    console.log(
      'VAPID settings are read from src/config/index.ts: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT'.green
    )
    console.log(`Generate your keys with: ${configService.getRunCommand()} vapid:generate`.green)
    console.log(
      'Then copy them into your .env file. Without keys push notifications stay disabled and the server only logs a warning.'.green
    )
    console.log('-------------------------------------------------------------------------------------------'.green)
  }
}
