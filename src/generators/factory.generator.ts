import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { kebabCase, pascalCase } from '../utils/naming'
import { renderTemplate } from '../utils/template'
import { validateIdentifier } from '../utils/validation'

export class FactoryGenerator implements IPreGenerator, IFileSystemGenerator {
  private factoryName: string

  constructor(private readonly ctx: Context) {}

  async pre(): Promise<void> {
    const name = await this.ctx.prompter.input({
      message: 'Name of the model that belongs to Factory:',
      name: 'name',
    })

    this.factoryName = validateIdentifier(name, 'Factory model name')
  }

  async createDirectories(): Promise<void> {
    this.ctx.project.ensureDir('src/database/factories')
  }

  async copyFiles(): Promise<void> {
    const factoryName = pascalCase(this.factoryName)
    const fileName = `${kebabCase(this.factoryName)}.factory.ts`

    const factory = renderTemplate(this.ctx.project.template('generator/common/factory/factory.template.ts'), {
      ClassName: factoryName,
    })
    this.ctx.project.write(`src/database/factories/${fileName}`, factory, 'create')
  }
}
