import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import path from 'path'
import { kebabCase, pascalCase } from '../utils/naming'
import { renderTemplate } from '../utils/template'
import { validateIdentifier } from '../utils/validation'
import { validationTemplates } from './validation'

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

    this.moduleName = validateIdentifier(moduleName, 'Module name')
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
    const validation = validationTemplates(config.validation)

    const files: Array<{ path: string; content: string }> = [
      {
        path: path.join(dir, `${moduleDir}.validator.ts`),
        content: renderTemplate(this.ctx.project.template(validation.module), {}),
      },
      {
        path: path.join(dir, `${moduleDir}.service.ts`),
        content: renderTemplate(this.ctx.project.template('generator/module/service.template.ts'), {
          ServiceName: serviceName,
        }),
      },
      {
        path: path.join(dir, `${moduleDir}.controller.ts`),
        content: renderTemplate(this.ctx.project.template('generator/module/controller.template.ts'), {
          ServiceName: serviceName,
          servicefile: moduleDir,
        }),
      },
    ]

    if (config.fileBasedRouting) {
      files.push(
        {
          path: path.join('src/routes', moduleDir, 'index.ts'),
          content: renderTemplate(this.ctx.project.template('generator/module/filerouting/router.template.ts'), {
            modulename: moduleDir,
          }),
        },
        {
          path: path.join('src/routes', moduleDir, '[id]', 'index.ts'),
          content: renderTemplate(this.ctx.project.template('generator/module/filerouting/[id]/router.template.ts'), {
            modulename: moduleDir,
          }),
        }
      )
    } else {
      files.push({
        path: path.join(dir, `${moduleDir}.routes.ts`),
        content: renderTemplate(this.ctx.project.template('generator/module/routes.template.ts'), {
          modulename: moduleDir,
        }),
      })
    }

    // Preflight: si uno de los destinos existe, no se escribe ninguno. Sin esto,
    // `create` fallaba en el primer archivo y dejaba el resto ya escrito.
    this.ctx.project.assertCanCreate(files.map((file) => file.path))

    for (const file of files) {
      this.ctx.project.write(file.path, file.content, policy)
    }
  }
}
