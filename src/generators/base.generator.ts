import { IGenerator } from '../interfaces/generator.interface'
import figlet from 'figlet'
import gradient from 'gradient-string'
import { sleep } from '../utils/time'
import { PackageManager } from '../types'
import { Context } from '../context'
import { ConfigService } from '../services/config.service'
import path from 'path'
import fs from 'fs-extra'
import { CliError } from '../errors'

export class BaseGenerator implements IGenerator {
  private projectName: string
  private fileBasedRouting: boolean
  private projectConfig: ConfigService

  constructor(private readonly ctx: Context) {}

  private get projectDir(): string {
    return path.join(this.ctx.cwd, this.projectName)
  }

  async pre() {
    this.ctx.logger.info(gradient.pastel.multiline(figlet.textSync('Node-Express-CLI', { font: 'Standard' })))

    await sleep(500)

    const name = await this.ctx.prompter.input({
      message: 'Enter the project name',
      name: 'name',
    })
    if (!name) {
      throw new CliError('Project name is required', {
        hint: 'Run "node-express-cli init" again and enter a name.',
      })
    }
    const manager = await this.ctx.prompter.select<PackageManager>({
      message: 'Choose package manager',
      name: 'package-manager',
      choices: Object.values(PackageManager).map((x) => ({ name: x, value: x })),
      default: PackageManager.NPM,
    })
    this.fileBasedRouting = await this.ctx.prompter.select<boolean>({
      message: 'Do you want to use file-based routing?',
      name: 'file-based-routing',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
      default: false,
    })

    this.projectName = name

    if (fs.existsSync(this.projectDir)) {
      throw new CliError(`The directory "${this.projectName}" already exists`, {
        hint: 'Choose a different project name or remove the existing directory.',
      })
    }

    fs.mkdirSync(this.projectDir)

    this.projectConfig = this.ctx.config.forDirectory(this.projectName)
    this.projectConfig.writeConfig({
      package_manger: manager,
      fileBasedRouting: this.fileBasedRouting,
    })
  }

  async createDirectories() {
    const src = path.join(this.projectDir, 'src')
    fs.mkdirSync(path.join(src, 'database'), { recursive: true })
    fs.mkdirSync(path.join(src, 'entities'), { recursive: true })
    fs.mkdirSync(path.join(src, 'middlewares'), { recursive: true })
    fs.mkdirSync(path.join(src, 'modules'), { recursive: true })
    fs.mkdirSync(path.join(src, 'config'), { recursive: true })
    fs.mkdirSync(path.join(src, 'utils'), { recursive: true })
    if (this.fileBasedRouting) {
      fs.mkdirSync(path.join(src, 'routes'), { recursive: true })
      fs.mkdirSync(path.join(src, '@types'), { recursive: true })
    }
  }

  async copyFiles() {
    fs.copySync(path.resolve(__dirname, '../../templates/base'), this.projectDir)

    const gitignore = path.join(this.projectDir, 'gitignore')
    if (fs.existsSync(gitignore)) {
      fs.moveSync(gitignore, path.join(this.projectDir, '.gitignore'), { overwrite: true })
    }

    if (this.fileBasedRouting) {
      fs.copySync(
        path.resolve(__dirname, '../../templates/generator/common/filerouting/index.ts'),
        path.join(this.projectDir, 'src/main.ts')
      )
      fs.copySync(
        path.resolve(__dirname, '../../templates/generator/common/filerouting/global.d.ts'),
        path.join(this.projectDir, 'src/@types/global.d.ts')
      )
      fs.copySync(
        path.resolve(__dirname, '../../templates/generator/common/filerouting/healthcheck.ts'),
        path.join(this.projectDir, 'src/routes/healthcheck.ts')
      )
      const healthcheckRoutes = path.join(this.projectDir, 'src/modules/healthcheck/routes.ts')
      if (fs.existsSync(healthcheckRoutes)) {
        fs.rmSync(healthcheckRoutes)
      }
    }
  }

  async installDependencies(): Promise<void> {
    if (!this.projectConfig) {
      throw new CliError('Project configuration was not initialized')
    }

    this.ctx.logger.info('================= Installing dependencies =================')

    await this.ctx.shell.execAsync(
      `${this.projectConfig.getInstallCommand()} app-root-path cors dotenv express express-validator helmet morgan rate-limiter-flexible ts-mixer express-http-context`,
      this.projectDir
    )
    await this.ctx.shell.execAsync(
      `${this.projectConfig.getDevInstallCommand()} @types/app-root-path @types/cors @types/express @types/morgan @types/node ts-node tsc-watch tsc-alias rimraf typescript@^5`,
      this.projectDir
    )
  }

  async post(): Promise<void> {
    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    this.ctx.logger.success(
      "Cool! All ready. The next step is to create an .env file and run the command 'npm run dev'"
    )
    this.ctx.logger.success(`cd ${this.projectName}`)
    this.ctx.logger.success('cp .env.example .env')
    this.ctx.logger.success('npm run dev')
    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
  }
}
