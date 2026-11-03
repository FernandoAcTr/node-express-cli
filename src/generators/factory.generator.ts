import { input } from '@inquirer/prompts'
import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import fs from 'fs-extra'
import path from 'path'
import { kebabCase, pascalCase } from '../utils/naming'
import { renderTemplate } from '../utils/template'
import { CliError } from '../errors'

export class FactoryGenerator implements IPreGenerator, IFileSystemGenerator {
  private factoryName: string

  async pre(): Promise<void> {
    const name = await input({
      message: 'Name of the model that belongs to Factory:',
    })
    if (!name) {
      throw new CliError('Factory model name is required', {
        hint: 'Run "node-express-cli make:factory" again and enter a name.',
      })
    }

    this.factoryName = name
  }

  async createDirectories(): Promise<void> {
    fs.mkdirSync('./src/database/factories', {
      recursive: true,
    })
  }

  async copyFiles(): Promise<void> {
    const factoryName = pascalCase(this.factoryName)
    const fileName = `${kebabCase(this.factoryName)}.factory.ts`

    const factory = renderTemplate(
      path.resolve(__dirname, '../../templates/generator/common/factory/factory.template.ts'),
      { ClassName: factoryName }
    )
    fs.writeFileSync(`./src/database/factories/${fileName}`, factory)
  }
}
