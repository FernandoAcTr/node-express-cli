import { input } from '@inquirer/prompts'
import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import fs from 'fs-extra'
import path from 'path'

export class FactoryGenerator implements IPreGenerator, IFileSystemGenerator {
  private factoryName: string

  async pre(): Promise<void> {
    const name = await input({
      message: 'Name of the model that belongs to Factory:',
    })
    if (!name) {
      process.exit(0)
    }

    this.factoryName = name
  }

  async createDirectories(): Promise<void> {
    fs.mkdirSync('./src/database/factories', {
      recursive: true,
    })
  }

  async copyFiles(): Promise<void> {
    const factoryName = `${this.factoryName[0].toUpperCase()}${this.factoryName.substring(1).toLowerCase()}`
    const fileName = `${this.factoryName.toLowerCase()}.factory.ts`

    const entity = fs
      .readFileSync(path.resolve(__dirname, '../../templates/generator/common/factory/factory.template.ts'), 'utf-8')
      .toString()
      .replace(/__ClassName__/g, factoryName)
    fs.writeFileSync(`./src/database/factories/${fileName}`, entity)
  }
}
