import { select } from '@inquirer/prompts'
import { IGenerator } from '../interfaces/generator.interface'
import { DbType } from '../types'
import { configService } from '../services/config.service'
import fs from 'fs'
import { shellService } from '../services/shell.service'
import path from 'path'

export class OrmGenerator implements IGenerator {
  private orm: DbType

  async pre(): Promise<void> {
    const orm = await select({
      message: 'Choose an ORM',
      choices: Object.values(DbType).map((x) => ({ name: x, value: x })),
    })

    const config = configService.getConfig()
    config.orm = orm
    configService.writeConfig(config)

    this.orm = orm
  }

  async createDirectories(): Promise<void> {
    const dirs = ['./src/database/seeds', './src/database/factories', './src/entities']
    if (this.orm == DbType.TYPEORM || this.orm == DbType.SEQUELIZE) {
      dirs.push('./src/database/migrations')
    }
    if (this.orm == DbType.PRISMA) {
      dirs.push('./src/database/prisma')
    }

    dirs.forEach((dir) => fs.mkdirSync(dir, { recursive: true }))
  }

  async copyFiles(): Promise<void> {
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/seed/seeder.ts'), './src/database/seeder.ts')
    fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/common/seed/seed.ts'), './src/database/seed.ts')

    if (this.orm == DbType.TYPEORM) {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/orm/typeorm/datasources.ts'), './src/database/datasources.ts')
    } else if (this.orm == DbType.SEQUELIZE) {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/orm/sequelize/datasources.ts'), './src/database/datasources.ts')
      fs.copyFileSync(
        path.resolve(__dirname, '../../templates/generator/orm/sequelize/sequelize-cli.json'),
        './src/database/sequelize-cli.json'
      )
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/orm/sequelize/.sequelizerc'), './.sequelizerc')
    } else if (this.orm == DbType.PRISMA) {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/orm/prisma/schema.prisma'), './src/database/prisma/schema.prisma')
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/orm/prisma/client.ts'), './src/database/client.ts')
    } else if (this.orm == DbType.MONGO) {
      fs.copyFileSync(path.resolve(__dirname, '../../templates/generator/orm/mongo/datasources.ts'), './src/database/datasources.ts')
    }
  }

  async post(): Promise<void> {
    if (this.orm == DbType.TYPEORM) {
      const indexContent = fs.readFileSync('./src/index.ts', 'utf-8')
      if (!indexContent.includes('reflect-metadata')) {
        const lines = indexContent.split('\n')
        lines.splice(0, 0, "import 'reflect-metadata'")
        fs.writeFileSync('./src/index.ts', lines.join('\n'))
      }

      console.log('-------------------------------------------------------------------------------------------'.green)
      console.log('You must install specific database driver like mysql or pg'.yellow)
      console.log('You need to initialize the AppDataSource manually.'.green)
      console.log('-------------------------------------------------------------------------------------------'.green)
    } else if (this.orm == DbType.SEQUELIZE) {
      console.log('-------------------------------------------------------------------------------------------'.green)
      console.log('You must install specific database driver like mysql2 or pg'.yellow)
      console.log(`You can use the .authenticate() function to test if the connection is OK`.green)
      console.log(`sequelize.authenticate().then((x) => logger.info('🚀 Database is ready'))`.green)
      console.log('-------------------------------------------------------------------------------------------'.green)
    } else if (this.orm == DbType.PRISMA) {
      const packageContent = fs.readFileSync('./package.json', 'utf-8')
      const packageJson = JSON.parse(packageContent)
      packageJson['prisma'] = JSON.stringify(
        { schema: './src/database/prisma/schema.prisma', seed: 'ts-node src/database/prisma/seed.ts' },
        null,
        2
      )
      fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2))

      console.log('-------------------------------------------------------------------------------------------'.green)
      console.log(`You need to create your first migration. Run ${configService.getConfig().package_manger} run m:run`.green)
      console.log('-------------------------------------------------------------------------------------------'.green)
    } else if (this.orm == DbType.MONGO) {
      console.log('-------------------------------------------------------------------------------------------'.green)
      console.log('Now you need to import datasources.ts in your index.ts in order to connect with mongo'.green)
      console.log('-------------------------------------------------------------------------------------------'.green)
    }
  }

  async installDependencies(): Promise<void> {
    console.log('================= Installing ORM ================='.yellow)

    await shellService.execAsync(`${configService.getInstallCommand()} @faker-js/faker`)
    shellService.exec('npm pkg set scripts.db:seed="npm run build && node build/database/seeder.js"')

    if (this.orm == DbType.TYPEORM) {
      await shellService.execAsync(`${configService.getInstallCommand()} typeorm reflect-metadata`)
      shellService.exec(
        'npm pkg set scripts.typeorm="node ./node_modules/typeorm/cli.js -d build/database/datasources.js"'
      )
      shellService.exec('npm pkg set scripts.m:run="npm run typeorm migration:run"')
      shellService.exec('npm pkg set scripts.m:revert="npm run typeorm migration:revert"')
      shellService.exec('npm pkg set scripts.m:generate="npm run typeorm migration:generate"')
      shellService.exec('npm pkg set scripts.m:create="npx typeorm migration:create"')
      shellService.exec('npm pkg set scripts.m:drop="npm run typeorm schema:drop"')
      shellService.exec('npm pkg set scripts.m:run:fresh="npm run m:drop && npm run m:run && npm run db:seed"')
    } else if (this.orm == DbType.SEQUELIZE) {
      await shellService.execAsync(`${configService.getInstallCommand()} sequelize`)
      await shellService.execAsync(`${configService.getDevInstallCommand()} sequelize-cli`)
      shellService.exec('npm pkg set scripts.db:migrate="npx sequelize-cli db:migrate"')
      shellService.exec('npm pkg set scripts.db:migrate:undo="npx sequelize-cli db:migrate:undo"')
      shellService.exec('npm pkg set scripts.db:migrate:fresh="npx sequelize-cli db:migrate:undo:all && npx sequelize-cli db:migrate"')
      shellService.exec('npm pkg set scripts.db:make:migration="npx sequelize-cli migration:generate --name"')
    } else if (this.orm == DbType.PRISMA) {
      await shellService.execAsync(`${configService.getInstallCommand()} @prisma/client`)
      await shellService.execAsync(`${configService.getDevInstallCommand()} prisma`)
      shellService.exec('npm pkg set scripts.m:run="npx prisma migrate dev --schema src/database/prisma/schema.prisma"')
      shellService.exec('npm pkg set scripts.m:run:deploy="npx prisma migrate deploy --schema src/database/prisma/schema.prisma"')
      shellService.exec('npm pkg set scripts.m:reset="npx prisma migrate reset --schema src/database/prisma/schema.prisma"')
      shellService.exec('npm pkg set scripts.m:generate="npx prisma generate --schema src/database/prisma/schema.prisma"')
    } else if (this.orm == DbType.MONGO) {
      await shellService.execAsync(`${configService.getInstallCommand()} mongoose`)
    }
  }
}
