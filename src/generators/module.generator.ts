import { input } from '@inquirer/prompts'
import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import fs from 'fs'
import path from 'path'
import { configService } from '../services/config.service'

export class ModuleGenerator implements IPreGenerator, IFileSystemGenerator {
  private moduleName: string

  private getModuleDirectory(): string {
    return `./src/modules/${this.moduleName.toLowerCase()}`
  }

  private getServicesDirectory(): string {
    return `./src/modules/${this.moduleName.toLowerCase()}/services`
  }

  async pre(): Promise<void> {
    const moduleName = await input({
      message: 'Name of module:',
    })

    if (!moduleName) {
      console.error('Module name is required')
      process.exit(0)
    }

    this.moduleName = moduleName.toLowerCase()
  }

  async createDirectories(): Promise<void> {
    const config = configService.getConfig()

    const dir = this.getModuleDirectory()
    const servicesDir = this.getServicesDirectory()

    fs.mkdirSync(dir, { recursive: true })
    fs.mkdirSync(servicesDir, { recursive: true })

    if (config.fileBasedRouting) {
      fs.mkdirSync(`./src/routes/${this.moduleName}`, { recursive: true })
      fs.mkdirSync(`./src/routes/${this.moduleName}/[id]`, { recursive: true })
    }
  }

  async copyFiles(): Promise<void> {
    const config = configService.getConfig()
    const dir = this.getModuleDirectory()
    const servicesDir = this.getServicesDirectory()

    const validator = fs.readFileSync(path.resolve(__dirname, `../../templates/generator/module/validator.ts`), 'utf-8')
    fs.writeFileSync(`${dir}/${this.moduleName}.validator.ts`, validator)

    const serviceName = `${this.moduleName[0].toUpperCase()}${this.moduleName.substring(1).toLowerCase()}`
    const service = fs
      .readFileSync(path.resolve(__dirname, `../../templates/generator/module/service.template.ts`), 'utf-8')
      .replace(/__ServiceName__/g, serviceName)
    fs.writeFileSync(`${servicesDir}/${this.moduleName}.service.ts`, service)

    const controller = fs
      .readFileSync(path.resolve(__dirname, `../../templates/generator/module/controller.template.ts`), 'utf-8')
      .replace(/__ServiceName__/g, serviceName)
      .replace(/__servicefile__/g, this.moduleName)
    fs.writeFileSync(`${dir}/${this.moduleName}.controller.ts`, controller)

    if (config.fileBasedRouting) {
      let router1 = fs.readFileSync(path.resolve(__dirname, `../../templates/generator/module/filerouting/router.template.ts`), 'utf-8')
      router1 = router1.replace(/__modulename__/g, this.moduleName)
      let router2 = fs.readFileSync(
        path.resolve(__dirname, `../../templates/generator/module/filerouting/[id]/router.template.ts`),
        'utf-8'
      )
      router2 = router2.replace(/__modulename__/g, this.moduleName)

      fs.writeFileSync(`./src/routes/${this.moduleName}/index.ts`, router1)
      fs.writeFileSync(`./src/routes/${this.moduleName}/[id]/index.ts`, router2)
    } else {
      const routes = fs
        .readFileSync(path.resolve(__dirname, `../../templates/generator/module/routes.template.ts`), 'utf-8')
        .replace(/__modulename__/g, this.moduleName)
      fs.writeFileSync(`${dir}/routes.ts`, routes)
    }
  }
}
