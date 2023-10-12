import fs from 'fs'
import { Config } from '../interfaces/config'
import { DbType, PackageManager, ProjectType } from '../interfaces/code.generator'

export class ConfigService {
  getConfig(): Config {
    if (!fs.existsSync('cli.config.json')) {
      return { project: ProjectType.API, orm: DbType.TYPEORM, package_manger: PackageManager.NPM }
    }

    const parsed = JSON.parse(fs.readFileSync('cli.config.json').toString())

    return {
      project: parsed.project ?? ProjectType.API,
      orm: parsed.orm,
      package_manger: parsed.package_manger ?? PackageManager.NPM,
    }
  }

  writeConfig(config: Partial<Config>) {
    fs.writeFileSync('cli.config.json', JSON.stringify(config))
  }

  getInstallCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npm install',
      [PackageManager.YARN]: 'yarn',
      [PackageManager.PNPM]: 'pnpm install',
      [PackageManager.BUN]: 'bun install',
    }

    return commands[config.package_manger]
  }

  getDevInstallCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npm install -D',
      [PackageManager.YARN]: 'yarn add -D',
      [PackageManager.PNPM]: 'pnpm install -D',
      [PackageManager.BUN]: 'bun install -D',
    }

    return commands[config.package_manger]
  }
}

export const configService = new ConfigService()
