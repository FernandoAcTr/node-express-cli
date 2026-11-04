import fs from 'fs'
import path from 'path'
import { Config, DbType, PackageManager } from '../types'
import { version } from '../version'
import { CliError } from '../errors'

interface PackageJson {
  scripts?: Record<string, string>
  [key: string]: unknown
}

export interface SetScriptsResult {
  changed: string[]
  skipped: string[]
}

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
      return {
        orm: undefined,
        package_manger: PackageManager.NPM,
        fileBasedRouting: false,
        version,
        features: [],
      }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(fs.readFileSync(this.configFilePath, 'utf-8'))
    } catch {
      throw new CliError(`Could not parse ${this.configFilePath}`, {
        hint: `Fix the JSON in ${this.configFilePath} and try again.`,
      })
    }

    if (!isRecord(parsed)) {
      throw new CliError(`Invalid configuration in ${this.configFilePath}`, {
        hint: 'cli.config.json must contain a JSON object.',
      })
    }

    return {
      orm: isDbType(parsed.orm) ? parsed.orm : undefined,
      package_manger: isPackageManager(parsed.package_manger) ? parsed.package_manger : PackageManager.NPM,
      fileBasedRouting: parsed.fileBasedRouting === true,
      version: typeof parsed.version === 'string' ? parsed.version : version,
      features: normalizeFeatures(parsed.features),
    }
  }

  /**
   * Escribe la configuración haciendo merge con la existente. Nunca borra
   * `features`, `orm` ni claves que no se pasen explícitamente.
   */
  public writeConfig(config: Partial<Config>): Config {
    const exists = fs.existsSync(this.configFilePath)
    const current = exists ? this.getConfig() : undefined
    const raw = exists ? (JSON.parse(fs.readFileSync(this.configFilePath, 'utf-8')) as Record<string, unknown>) : {}
    const next: Config = {
      ...raw,
      orm: config.orm ?? current?.orm,
      package_manger: config.package_manger ?? current?.package_manger ?? PackageManager.NPM,
      fileBasedRouting: config.fileBasedRouting ?? current?.fileBasedRouting ?? false,
      version,
      features: normalizeFeatures(config.features ?? current?.features ?? []),
    }

    fs.mkdirSync(path.dirname(this.configFilePath), { recursive: true })
    fs.writeFileSync(this.configFilePath, `${JSON.stringify(next, null, 2)}\n`)

    return next
  }

  /** Marca una feature como instalada. Devuelve true si cambió el archivo. */
  public markFeature(feature: string): boolean {
    const config = this.getConfig()

    if (config.features.includes(feature)) {
      return false
    }

    this.writeConfig({ features: [...config.features, feature] })
    return true
  }

  /** True si la feature está registrada en `cli.config.json`. */
  public hasFeature(feature: string): boolean {
    return this.getConfig().features.includes(feature)
  }

  /**
   * Escribe uno o varios scripts en package.json sin depender de `npm pkg set`,
   * para que funcione igual con yarn, pnpm o bun.
   */
  public setScripts(scripts: Record<string, string>): SetScriptsResult {
    const packageJson = this.readPackageJson()
    const currentScripts = packageJson.scripts ?? {}
    const changed: string[] = []
    const skipped: string[] = []

    for (const [name, command] of Object.entries(scripts)) {
      if (currentScripts[name] === command) {
        skipped.push(name)
        continue
      }

      currentScripts[name] = command
      changed.push(name)
    }

    if (changed.length > 0) {
      packageJson.scripts = currentScripts
      this.writePackageJson(packageJson)
    }

    return { changed, skipped }
  }

  /** Devuelve true si el script cambió. */
  public setScript(name: string, command: string): boolean {
    return this.setScripts({ [name]: command }).changed.length > 0
  }

  /** Devuelve el comando del script o `undefined` si no existe. */
  public getScript(name: string): string | undefined {
    return this.readPackageJson().scripts?.[name]
  }

  /** Escribe el nombre del paquete en package.json. Devuelve true si cambió. */
  public setPackageName(name: string): boolean {
    const packageJson = this.readPackageJson()

    if (packageJson.name === name) {
      return false
    }

    packageJson.name = name
    this.writePackageJson(packageJson)
    return true
  }

  /** Elimina una clave de primer nivel de package.json. */
  public deletePackageField(field: string): boolean {
    const packageJson = this.readPackageJson()

    if (!(field in packageJson)) {
      return false
    }

    delete packageJson[field]
    this.writePackageJson(packageJson)
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

  private readPackageJson(): PackageJson {
    if (!fs.existsSync(this.packageFilePath)) {
      throw new CliError(`Could not find ${this.packageFilePath}`, {
        hint: 'Run this command from the root of a generated project.',
      })
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(this.packageFilePath, 'utf-8'))

      if (!isRecord(parsed)) {
        throw new CliError(`Invalid ${this.packageFilePath}`, {
          hint: 'package.json must contain a JSON object.',
        })
      }

      return parsed
    } catch (error) {
      if (error instanceof CliError) {
        throw error
      }

      throw new CliError(`Could not parse ${this.packageFilePath}`, {
        hint: `Fix the JSON in ${this.packageFilePath} and try again.`,
      })
    }
  }

  private writePackageJson(packageJson: PackageJson): void {
    fs.writeFileSync(this.packageFilePath, `${JSON.stringify(packageJson, null, 2)}\n`)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDbType(value: unknown): value is DbType {
  return typeof value === 'string' && Object.values(DbType).includes(value as DbType)
}

function isPackageManager(value: unknown): value is PackageManager {
  return typeof value === 'string' && Object.values(PackageManager).includes(value as PackageManager)
}

function normalizeFeatures(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(value.filter((feature): feature is string => typeof feature === 'string' && feature.length > 0))]
}
