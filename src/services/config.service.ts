import fs from 'fs'
import path from 'path'
import { Config, DbType, PackageManager } from '../types'
import { version } from '../version'
import { CliError } from '../errors'

export class ConfigService {
  readonly cwd: string
  private readonly configFilePath: string
  private readonly packageFilePath: string

  constructor(cwd: string = process.cwd()) {
    this.cwd = path.resolve(cwd)
    this.configFilePath = path.join(this.cwd, 'cli.config.json')
    this.packageFilePath = path.join(this.cwd, 'package.json')
  }

  /** Devuelve un servicio apuntando a otro directorio (p. ej. el proyecto recién creado). */
  public forDirectory(directory: string): ConfigService {
    return new ConfigService(path.resolve(this.cwd, directory))
  }

  public getConfig(): Config {
    if (!fs.existsSync(this.configFilePath)) {
      return { orm: DbType.TYPEORM, package_manger: PackageManager.NPM, fileBasedRouting: false }
    }

    const parsed = JSON.parse(fs.readFileSync(this.configFilePath).toString())

    return {
      orm: parsed.orm,
      package_manger: parsed.package_manger ?? PackageManager.NPM,
      fileBasedRouting: parsed.fileBasedRouting ?? false,
    }
  }

  public writeConfig(config: Partial<Config>) {
    fs.writeFileSync(this.configFilePath, JSON.stringify({ ...config, version }))
  }

  /**
   * Escribe un script en package.json sin depender de `npm pkg set`, para que
   * funcione igual con yarn, pnpm o bun. Devuelve true si el archivo cambió.
   */
  public setScript(name: string, command: string): boolean {
    if (!fs.existsSync(this.packageFilePath)) {
      throw new CliError(`Could not find ${this.packageFilePath}`, {
        hint: 'Run this command from the root of a generated project.',
      })
    }

    let packageJson: any
    try {
      packageJson = JSON.parse(fs.readFileSync(this.packageFilePath, 'utf-8'))
    } catch {
      throw new CliError(`Could not parse ${this.packageFilePath}`, {
        hint: `Fix the JSON in ${this.packageFilePath} and try again.`,
      })
    }

    packageJson.scripts = packageJson.scripts ?? {}

    if (packageJson.scripts[name] === command) {
      return false
    }

    packageJson.scripts[name] = command
    fs.writeFileSync(this.packageFilePath, `${JSON.stringify(packageJson, null, 2)}\n`)
    return true
  }

  public getInstallCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npm install',
      [PackageManager.YARN]: 'yarn add',
      [PackageManager.PNPM]: 'pnpm add',
      [PackageManager.BUN]: 'bun add',
    }

    return commands[config.package_manger]
  }

  public getDevInstallCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npm install -D',
      [PackageManager.YARN]: 'yarn add -D',
      [PackageManager.PNPM]: 'pnpm add -D',
      [PackageManager.BUN]: 'bun add -d',
    }

    return commands[config.package_manger]
  }

  public getRunCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npm run',
      [PackageManager.YARN]: 'yarn',
      [PackageManager.PNPM]: 'pnpm run',
      [PackageManager.BUN]: 'bun run',
    }

    return commands[config.package_manger]
  }

  public getPackageRunnerCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npx',
      [PackageManager.YARN]: 'yarn dlx',
      [PackageManager.PNPM]: 'pnpm dlx',
      [PackageManager.BUN]: 'bunx',
    }

    return commands[config.package_manger]
  }

  public getTypeScriptExecutionCommand() {
    const config = this.getConfig()

    const commands = {
      [PackageManager.NPM]: 'npx ts-node',
      [PackageManager.YARN]: 'yarn ts-node',
      [PackageManager.PNPM]: 'pnpm ts-node',
      [PackageManager.BUN]: 'bun',
    }

    return commands[config.package_manger]
  }
}
