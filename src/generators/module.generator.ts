import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import path from 'path'
import { kebabCase, pascalCase } from '../utils/naming'
import { renderTemplate } from '../utils/template'
import { CliError } from '../errors'

export class ModuleGenerator implements IPreGenerator, IFileSystemGenerator {
  private moduleName: string

  constructor(private readonly ctx: Context) {}

  private get moduleDir(): string {
    return kebabCase(this.moduleName)
  }

  private getModuleDirectory(): string {
    return path.join('src/modules', this.moduleDir)
  }

  async pre(): Promise<void> {
    const moduleName = await this.ctx.prompter.input({
      message: 'Name of module:',
      name: 'name',
    })

    if (!moduleName) {
      throw new CliError('Module name is required', {
        hint: 'Run "node-express-cli make:module" again and enter a name.',
      })
    }

    this.moduleName = moduleName.trim()
  }

  async createDirectories(): Promise<void> {
    const config = this.ctx.config.getConfig()

    this.ctx.project.ensureDir(this.getModuleDirectory())

    if (config.fileBasedRouting) {
      this.ctx.project.ensureDir(path.join('src/routes', this.moduleDir))
      this.ctx.project.ensureDir(path.join('src/routes', this.moduleDir, '[id]'))
    }
  }

  async copyFiles(): Promise<void> {
    const config = this.ctx.config.getConfig()
    const dir = this.getModuleDirectory()
    const moduleDir = this.moduleDir
    const serviceName = pascalCase(this.moduleName)
    const policy = 'create' as const

    const validator = renderTemplate(this.ctx.project.template('generator/module/validator.ts'), {})
    this.ctx.project.write(path.join(dir, `${moduleDir}.validator.ts`), validator, policy)

    const service = renderTemplate(this.ctx.project.template('generator/module/service.template.ts'), {
      ServiceName: serviceName,
    })
    this.ctx.project.write(path.join(dir, `${moduleDir}.service.ts`), service, policy)

    const controller = renderTemplate(this.ctx.project.template('generator/module/controller.template.ts'), {
      ServiceName: serviceName,
      servicefile: moduleDir,
    })
    this.ctx.project.write(path.join(dir, `${moduleDir}.controller.ts`), controller, policy)

    if (config.fileBasedRouting) {
      const router1 = renderTemplate(this.ctx.project.template('generator/module/filerouting/router.template.ts'), {
        modulename: moduleDir,
      })
      const router2 = renderTemplate(this.ctx.project.template('generator/module/filerouting/[id]/router.template.ts'), {
        modulename: moduleDir,
      })

      this.ctx.project.write(path.join('src/routes', moduleDir, 'index.ts'), router1, policy)
      this.ctx.project.write(path.join('src/routes', moduleDir, '[id]', 'index.ts'), router2, policy)
    } else {
      const routes = renderTemplate(this.ctx.project.template('generator/module/routes.template.ts'), {
        modulename: moduleDir,
      })
      this.ctx.project.write(path.join(dir, `${moduleDir}.routes.ts`), routes, policy)
    }
  }
}
