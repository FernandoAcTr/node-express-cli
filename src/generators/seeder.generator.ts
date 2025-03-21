import { input } from '@inquirer/prompts'
import { IFileSystemGenerator, IPreGenerator } from '../interfaces/generator.interface'
import fs from 'fs-extra'
import path from 'path'

export class SeederGenerator implements IPreGenerator, IFileSystemGenerator {
  private seederName: string

  async pre(): Promise<void> {
    this.seederName = await input({
      message: 'Name of seeder:',
    })
    if (!this.seederName) {
      process.exit(0)
    }
  }

  async createDirectories(): Promise<void> {
    fs.mkdirSync('./src/database/seeds', { recursive: true })
  }

  async copyFiles(): Promise<void> {
    const filename = `${this.seederName[0].toLowerCase()}${this.seederName.substring(1)}.seeder.ts`
    const seederName = `${this.seederName[0].toUpperCase()}${this.seederName.substring(1)}Seeder`

    const seeder = fs
      .readFileSync(path.resolve(__dirname, '../../templates/generator/common/seed/seed.template.ts'))
      .toString()
      .replace(/__ClassName__/g, seederName)

    fs.writeFileSync(`./src/database/seeds/${filename}`, seeder)
  }
}
