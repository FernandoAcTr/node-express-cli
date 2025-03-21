import { IGenerator } from '../interfaces/generator.interface'
import figlet from 'figlet'
import gradient from 'gradient-string'
import { sleep } from '../utils/time'
import { select, input } from '@inquirer/prompts'
import { PackageManager } from '../types'
import { configService } from '../services/config.service'
import path from 'path'
import { shellService } from '../services/shell.service'
import fs from 'fs-extra'

export class BaseGenerator implements IGenerator {
  private projectName: string
  private fileBasedRouting: boolean

  async pre() {
    figlet.text('Node-Express-CLI', { font: 'Standard' }, (err, data) => {
      console.log(gradient.pastel.multiline(data))
    })

    await sleep(500)

    const name = await input({
      message: 'Enter the project name',
    })
    if (!name) {
      console.error('Project name is required')
      process.exit(0)
    }
    const manager = await select({
      message: 'Choose package manager',
      choices: Object.values(PackageManager).map((x) => ({ name: x, value: x })),
    })
    this.fileBasedRouting = await select({
      message: 'Do you want to use file-based routing?',
      choices: [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
      ],
    })

    this.projectName = name

    fs.mkdirSync(`./${this.projectName}`)

    configService.setConfigFilePath(this.projectName)
    configService.writeConfig({
      package_manger: manager,
      fileBasedRouting: this.fileBasedRouting,
    })
  }

  async createDirectories() {
    fs.mkdirSync(`./${this.projectName}/src`, { recursive: true })
    fs.mkdirSync(`./${this.projectName}/src/database`, { recursive: true })
    fs.mkdirSync(`./${this.projectName}/src/routes`, { recursive: true })
    fs.mkdirSync(`./${this.projectName}/src/entities`, { recursive: true })
    fs.mkdirSync(`./${this.projectName}/src/middlewares`, { recursive: true })
    fs.mkdirSync(`./${this.projectName}/src/modules`, { recursive: true })
    fs.mkdirSync(`./${this.projectName}/src/config`, { recursive: true })
    fs.mkdirSync(`./${this.projectName}/src/utils`, { recursive: true })
    if (this.fileBasedRouting) {
      fs.mkdirSync(`./${this.projectName}/src/@types`, { recursive: true })
    }
  }

  async copyFiles() {
    fs.copySync(path.resolve(__dirname, '../../templates/base'), `./${this.projectName}`)

    if (this.fileBasedRouting) {
      fs.copySync(path.resolve(__dirname, '../../templates/generator/common/filerouting/index.ts'), `./${this.projectName}/src/index.ts`)
      fs.copySync(
        path.resolve(__dirname, '../../templates/generator/common/filerouting/global.d.ts'),
        `./${this.projectName}/src/@types/global.d.ts`
      )
      fs.copySync(
        path.resolve(__dirname, '../../templates/generator/common/filerouting/healthcheck.ts'),
        `./${this.projectName}/src/routes/healthcheck.ts`
      )
      fs.rmSync(`./${this.projectName}/src/routes/healthcheck.routes.ts`)
    }
  }

  async installDependencies(): Promise<void> {
    console.log('================= Installing dependencies ================='.yellow)

    await shellService.execAsync(
      `${configService.getInstallCommand()} --prefix ${
        this.projectName
      } app-root-path cors dotenv express express-validator helmet module-alias morgan rate-limiter-flexible winston`
    )
    await shellService.execAsync(
      `${configService.getDevInstallCommand()} --prefix ${
        this.projectName
      } @types/app-root-path @types/cors @types/express @types/module-alias @types/morgan @types/node ts-node tsc-watch tsc-alias`
    )
  }

  async post(): Promise<void> {
    console.log('-------------------------------------------------------------------------------------------'.green)
    console.log("Cool! All ready. The next step is to create an .env file and run the command 'npm run dev'".green)
    console.log(`cd ${this.projectName}`.green)
    console.log('cp .env.example .env'.green)
    console.log('npm run dev'.green)
    console.log('-------------------------------------------------------------------------------------------'.green)
  }
}
