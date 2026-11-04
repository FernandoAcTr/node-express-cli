import { IGenerator } from '../interfaces/generator.interface'
import figlet from 'figlet'
import gradient from 'gradient-string'
import { sleep } from '../utils/time'
import { PackageManager, ValidationLibrary } from '../types'
import { Context } from '../context'
import { NonInteractivePrompter } from '../prompts'
import { ConfigService } from '../services/config.service'
import { ProjectService } from '../services/project.service'
import path from 'path'
import fs from 'fs-extra'
import { CliError } from '../errors'
import { baseScripts } from '../utils/scripts'
import { validateProjectName } from '../utils/validation'
import { validationTemplates } from './validation'

export class BaseGenerator implements IGenerator {
  private projectName: string
  private packageManager: PackageManager
  private fileBasedRouting: boolean
  private validation: ValidationLibrary
  private projectConfig: ConfigService
  private projectService: ProjectService
  private createdProjectDir = false

  constructor(private readonly ctx: Context) {}

  private get projectDir(): string {
    return this.projectService?.cwd ?? path.join(this.ctx.cwd, this.projectName)
  }

  async pre() {
    this.ctx.logger.info(gradient.pastel.multiline(figlet.textSync('Node-Express-CLI', { font: 'Standard' })))

    if (process.stdout.isTTY && !(this.ctx.prompter instanceof NonInteractivePrompter)) {
      await sleep(500)
    }

    const name = await this.ctx.prompter.input({
      message: 'Enter the project name',
      name: 'name',
    })
    this.projectName = validateProjectName(name)

    this.packageManager = await this.ctx.prompter.select<PackageManager>({
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
    this.validation =
      (await this.ctx.prompter.select<ValidationLibrary>({
        message: 'Choose validation library',
        name: 'validation',
        choices: Object.values(ValidationLibrary).map((x) => ({ name: x, value: x })),
        default: ValidationLibrary.EXPRESS_VALIDATOR,
      })) ?? ValidationLibrary.EXPRESS_VALIDATOR

    if (fs.existsSync(this.projectDir)) {
      throw new CliError(`The directory "${this.projectName}" already exists`, {
        hint: 'Choose a different project name or remove the existing directory.',
      })
    }

    this.projectService = this.ctx.project.forDirectory(this.projectName)
    this.projectConfig = this.ctx.config.forDirectory(this.projectName)
  }

  async createDirectories() {
    if (!this.projectConfig || !this.projectService) {
      throw new CliError('Project configuration was not initialized')
    }

    if (fs.existsSync(this.projectDir)) {
      throw new CliError(`The directory "${this.projectName}" already exists`, {
        hint: 'Choose a different project name or remove the existing directory.',
      })
    }

    this.projectService.ensureDir('')
    this.createdProjectDir = true
    this.projectConfig.writeConfig({
      package_manger: this.packageManager,
      fileBasedRouting: this.fileBasedRouting,
      validation: this.validation,
    })
    this.projectService.record('cli.config.json')

    this.projectService.ensureDir('src/database')
    this.projectService.ensureDir('src/entities')
    this.projectService.ensureDir('src/middlewares')
    this.projectService.ensureDir('src/modules')
    this.projectService.ensureDir('src/config')
    this.projectService.ensureDir('src/utils')
    this.projectService.ensureDir('src/routing')

    if (this.fileBasedRouting) {
      this.projectService.ensureDir('src/routes')
      this.projectService.ensureDir('src/@types')
    }
  }

  async copyFiles() {
    if (!this.projectConfig || !this.projectService) {
      throw new CliError('Project configuration was not initialized')
    }

    const project = this.projectService

    project.copyDir('', 'base', 'overwrite-if-unmodified')

    const gitignore = project.read('gitignore')
    project.remove('gitignore')
    project.write('.gitignore', gitignore)

    const routingTemplate = this.fileBasedRouting ? 'filebased.ts' : 'modules.ts'
    project.copy('src/routing/index.ts', `base/src/routing/${routingTemplate}`)
    project.remove('src/routing/modules.ts')
    project.remove('src/routing/filebased.ts')

    if (this.fileBasedRouting) {
      project.copy('src/@types/global.d.ts', 'generator/common/filerouting/global.d.ts')
      project.copy('src/routes/healthcheck.ts', 'generator/common/filerouting/healthcheck.ts')
      project.remove('src/modules/healthcheck/routes.ts')
    }

    project.copy('src/middlewares/validator.ts', validationTemplates(this.validation).middleware, 'overwrite-if-unmodified')

    this.projectConfig.setPackageName(this.projectName)
    this.projectConfig.setScripts(baseScripts(this.projectConfig))
    project.record('package.json')
  }

  async installDependencies(): Promise<void> {
    if (!this.projectConfig) {
      throw new CliError('Project configuration was not initialized')
    }

    this.ctx.logger.info('================= Installing dependencies =================')

    const validationPackage = this.validation === ValidationLibrary.ZOD ? 'zod@^4' : ValidationLibrary.EXPRESS_VALIDATOR

    await this.ctx.shell.execAsync(
      `${this.projectConfig.getInstallCommand()} app-root-path cors dotenv express ${validationPackage} helmet morgan rate-limiter-flexible ts-mixer express-http-context`,
      this.projectDir
    )
    await this.ctx.shell.execAsync(
      `${this.projectConfig.getDevInstallCommand()} @types/app-root-path @types/cors @types/express @types/morgan @types/node ts-node tsc-watch tsc-alias rimraf typescript@^5`,
      this.projectDir
    )
  }

  async post(): Promise<void> {
    const run = this.projectConfig.getRunCommand()

    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    this.ctx.logger.success(`Cool! All ready. The next step is to create an .env file and run the command '${run} dev'`)
    this.ctx.logger.success(`cd ${this.projectName}`)
    this.ctx.logger.success('cp .env.example .env')
    this.ctx.logger.success(`${run} dev`)
    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
  }

  /** Borra el proyecto si `init` falla después de haberlo creado. */
  async rollback(): Promise<void> {
    if (!this.createdProjectDir) {
      return
    }

    if (fs.existsSync(this.projectDir)) {
      fs.rmSync(this.projectDir, { recursive: true, force: true })
    }

    this.createdProjectDir = false
  }
}
