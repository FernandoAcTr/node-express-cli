import { input } from '@inquirer/prompts'
import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import fs from 'fs-extra'
import path from 'path'
import { camelCase, pascalCase } from '../utils/naming'
import { renderTemplate } from '../utils/template'
import { CliError } from '../errors'

export class SeederGenerator implements IPreGenerator, IFileSystemGenerator {
  private seederName: string

  async pre(): Promise<void> {
    this.seederName = await input({
      message: 'Name of seeder:',
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
