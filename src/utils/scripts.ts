import { ConfigService } from '../services/config.service'
import { DbType } from '../types'

/**
 * Scripts base del proyecto generado. Se escriben con el runner del package
 * manager elegido, así un proyecto Bun nunca recibe `npm`/`npx`.
 */
export function baseScripts(config: ConfigService): Record<string, string> {
  const run = config.getRunCommand()
  const runner = config.getPackageRunnerCommand()

  return {
    dev: `rimraf build && tsc-watch --noClear --onCompilationComplete tsc-alias --onFirstSuccess tsc-alias --onSuccess "${run} start:compile"`,
    start: 'node build/main.js',
    'start:compile': 'tsc-alias && node build/main.js',
    clean: 'rimraf build && rimraf logs',
    build: 'rimraf build && tsc && tsc-alias',
    'prettier:fix': 'prettier --config .prettierrc.json --write src/**/**/*.ts',
    'vapid:generate': `${runner} web-push generate-vapid-keys`,
  }
}

/** Scripts de migración/seeding que dependen del ORM instalado. */
export function ormScripts(orm: DbType, config: ConfigService): Record<string, string> {
  const run = config.getRunCommand()
  const runner = config.getPackageRunnerCommand()
  const seed = { 'db:seed': `${run} build && node build/database/seeder.js` }

  if (orm === DbType.TYPEORM) {
    return {
      typeorm: `${runner} typeorm -d build/database/datasources.js`,
      'm:run': `${run} build && ${run} typeorm migration:run`,
      'm:revert': `${run} build && ${run} typeorm migration:revert`,
      'm:generate': `${run} build && ${run} typeorm migration:generate`,
      'm:create': `${runner} typeorm migration:create`,
      'm:drop': `${run} build && ${run} typeorm schema:drop`,
      'm:run:fresh': `${run} build && ${run} typeorm schema:drop && ${run} typeorm migration:run`,
      'm:run:fresh:seed': `${run} build && ${run} typeorm schema:drop && ${run} typeorm migration:run && node build/database/seeder.js`,
      ...seed,
    }
  }

  if (orm === DbType.SEQUELIZE) {
    return {
      'db:migrate': `${runner} sequelize-cli db:migrate`,
      'db:migrate:undo': `${runner} sequelize-cli db:migrate:undo`,
      'db:migrate:fresh': `${runner} sequelize-cli db:migrate:undo:all && ${runner} sequelize-cli db:migrate`,
      'db:make:migration': `${runner} sequelize-cli migration:generate --name`,
      ...seed,
    }
  }

  if (orm === DbType.PRISMA) {
    return {
      'm:run': `${runner} prisma migrate dev`,
      'm:run:deploy': `${runner} prisma migrate deploy`,
      'm:reset': `${runner} prisma migrate reset`,
      'm:generate': `${runner} prisma generate`,
      ...seed,
    }
  }

  return seed
}
