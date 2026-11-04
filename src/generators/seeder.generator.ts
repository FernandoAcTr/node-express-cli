import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { camelCase, pascalCase } from '../utils/naming'
import { renderTemplate } from '../utils/template'
import { validateIdentifier } from '../utils/validation'

export class SeederGenerator implements IPreGenerator, IFileSystemGenerator {
  private seederName: string

  constructor(private readonly ctx: Context) {}

  async pre(): Promise<void> {
    this.seederName = validateIdentifier(
      await this.ctx.prompter.input({
        message: 'Name of seeder:',
        name: 'name',
      }),
      'Seeder name'
    )
  }

  async createDirectories(): Promise<void> {
    this.ctx.project.ensureDir('src/database/seeds')
  }

  async copyFiles(): Promise<void> {
    const filename = `${camelCase(this.seederName)}.seeder.ts`
    const seederName = `${pascalCase(this.seederName)}Seeder`

    const seeder = renderTemplate(this.ctx.project.template('generator/common/seed/seed.template.ts'), {
      ClassName: seederName,
    })

    this.ctx.project.write(`src/database/seeds/${filename}`, seeder, 'create')
  }
}
