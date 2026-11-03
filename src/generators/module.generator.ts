import { input } from '@inquirer/prompts'
import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import fs from 'fs'
import path from 'path'
import { configService } from '../services/config.service'
import { kebabCase, pascalCase } from '../utils/naming'
import { renderTemplate } from '../utils/template'
import { CliError } from '../errors'

export class ModuleGenerator implements IPreGenerator, IFileSystemGenerator {
  private moduleName: string

  private get moduleDir(): string {
    return kebabCase(this.moduleName)
  }

  private getModuleDirectory(): string {
    return `./src/modules/${this.moduleDir}`
  }

  async pre(): Promise<void> {
    const moduleName = await input({
      message: 'Name of module:',
    })

    if (!moduleName) {
      throw new CliError('Module name is required', {
        hint: 'Run "node-express-cli make:module" again and enter a name.',
      })
    }

    this.moduleName = moduleName.trim()
  }

  async createDirectories(): Promise<void> {
    const config = configService.getConfig()

    const dir = this.getModuleDirectory()

    fs.mkdirSync(dir, { recursive: true })

    if (config.fileBasedRouting) {
      fs.mkdirSync(`./src/routes/${this.moduleDir}`, { recursive: true })
      fs.mkdirSync(`./src/routes/${this.moduleDir}/[id]`, { recursive: true })
    }
  }

  async copyFiles(): Promise<void> {
    const config = configService.getConfig()
    const dir = this.getModuleDirectory()
    const moduleDir = this.moduleDir
    const serviceName = pascalCase(this.moduleName)

    const validator = renderTemplate(path.resolve(__dirname, `../../templates/generator/module/validator.ts`), {})
    fs.writeFileSync(`${dir}/${moduleDir}.validator.ts`, validator)

    const service = renderTemplate(path.resolve(__dirname, `../../templates/generator/module/service.template.ts`), {
      ServiceName: serviceName,
    })
    fs.writeFileSync(`${dir}/${moduleDir}.service.ts`, service)

    const controller = renderTemplate(
      path.resolve(__dirname, `../../templates/generator/module/controller.template.ts`),
      { ServiceName: serviceName, servicefile: moduleDir }
    )
    fs.writeFileSync(`${dir}/${moduleDir}.controller.ts`, controller)

    if (config.fileBasedRouting) {
      const router1 = renderTemplate(
        path.resolve(__dirname, `../../templates/generator/module/filerouting/router.template.ts`),
        { modulename: moduleDir }
      )
      const router2 = renderTemplate(
        path.resolve(__dirname, `../../templates/generator/module/filerouting/[id]/router.template.ts`),
        { modulename: moduleDir }
      )

      fs.writeFileSync(`./src/routes/${moduleDir}/index.ts`, router1)
      fs.writeFileSync(`./src/routes/${moduleDir}/[id]/index.ts`, router2)
    } else {
      const routes = renderTemplate(path.resolve(__dirname, `../../templates/generator/module/routes.template.ts`), {
        modulename: moduleDir,
      })
      fs.writeFileSync(`${dir}/${moduleDir}.routes.ts`, routes)
    }
  }
}
