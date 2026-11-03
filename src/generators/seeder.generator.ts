import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import fs from 'fs-extra'
import path from 'path'
import { camelCase, pascalCase } from '../utils/naming'
import { renderTemplate } from '../utils/template'
import { CliError } from '../errors'

export class SeederGenerator implements IPreGenerator, IFileSystemGenerator {
  private seederName: string

  constructor(private readonly ctx: Context) {}

  async pre(): Promise<void> {
    this.seederName = await this.ctx.prompter.input({
      message: 'Name of seeder:',
      name: 'name',
    })
    if (!this.seederName) {
      throw new CliError('Seeder name is required', {
        hint: 'Run "node-express-cli make:seeder" again and enter a name.',
      })
    }
  }

  async createDirectories(): Promise<void> {
    fs.mkdirSync('./src/database/seeds', { recursive: true })
  }

  async copyFiles(): Promise<void> {
    const filename = `${camelCase(this.seederName)}.seeder.ts`
    const seederName = `${pascalCase(this.seederName)}Seeder`

    const seeder = renderTemplate(
      path.resolve(__dirname, '../../templates/generator/common/seed/seed.template.ts'),
      { ClassName: seederName }
    )

    fs.writeFileSync(`./src/database/seeds/${filename}`, seeder)
  }
}
