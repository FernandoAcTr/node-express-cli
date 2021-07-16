import fs from 'fs'
import shell from 'shelljs'
import 'colors'
import { CodeGenerator, DbType } from './code_generator'
import path from 'path'

export class WebCodeGenerator implements CodeGenerator {
  createDirStructure() {
    fs.mkdirSync('./src', {
      recursive: true,
    })

    fs.mkdirSync('./src/database', {
      recursive: true,
    })

    fs.mkdirSync('./src/middlewares', {
      recursive: true,
    })

    fs.mkdirSync('./src/modules', {
      recursive: true,
    })

    fs.mkdirSync('./src/config', {
      recursive: true,
    })

    fs.mkdirSync('./src/views/partials', {
      recursive: true,
    })

    fs.mkdirSync('./src/views/layouts', {
      recursive: true,
    })

    fs.mkdirSync('./public/css', {
      recursive: true,
    })

    fs.mkdirSync('./public/js', {
      recursive: true,
    })
  }

  createConfigFiles() {
    //gitignore
    const gitignore = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'gitignore'))
      .toString()
    fs.writeFileSync('.gitignore', gitignore)
    //env
    const env = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'env'))
      .toString()
    fs.writeFileSync('.env', env)
    //readme
    fs.writeFileSync('README.md', '')
    //tsconfig
    const tsconfig = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'tsconfig.json')
      )
      .toString()
    fs.writeFileSync('tsconfig.json', tsconfig)
  }

  fillDatabase(dbType: DbType) {
    if (dbType === DbType.TYPEORM) {
      //migrations dir
      fs.mkdirSync('./src/database/migrations', {
        recursive: true,
      })
      //entities dir
      fs.mkdirSync('./src/entities', {
        recursive: true,
      })

      //ormconfig
      const ormconfig = fs
        .readFileSync(
          path.resolve(
            __dirname,
            '..',
            '..',
            'code',
            'database',
            'ormconfig.json'
          )
        )
        .toString()
      fs.writeFileSync('ormconfig.json', ormconfig)

      //database
      const database = fs
        .readFileSync(
          path.resolve(__dirname, '..', '..', 'code', 'database', 'database.ts')
        )
        .toString()
      fs.writeFileSync('./src/database/database.ts', database)

      //create user entity
      const user = fs
        .readFileSync(
          path.resolve(
            __dirname,
            '..',
            '..',
            'code',
            'database',
            'user.typeorm.ts'
          )
        )
        .toString()
      fs.writeFileSync('./src/entities/user.entity.ts', user)

      //Install db
      console.log('================= Installing ORM ================='.yellow)
      shell.exec('npm i typeorm')

      //Add scripts
      shell.exec(
        'npm set-script migration:run "ts-node --transpile-only ./node_modules/typeorm/cli.js migration:run"'
      )
      shell.exec(
        'npm set-script migration:revert "ts-node --transpile-only ./node_modules/typeorm/cli.js migration:revert"'
      )
      shell.exec(
        'npm set-script migration:generate "ts-node --transpile-only ./node_modules/typeorm/cli.js migration:generate --name"'
      )
    } else {
      //Install db
      console.log('================= Installing ORM ================='.yellow)
      shell.exec('npm i mongoose')
      //models dir
      fs.mkdirSync('./src/models', {
        recursive: true,
      })
      //database
      const database = fs
        .readFileSync(
          path.resolve(
            __dirname,
            '..',
            '..',
            'code',
            'database',
            'database.mongo.ts'
          )
        )
        .toString()
      fs.writeFileSync('./src/database/database.ts', database)
      //create user model
      const user = fs
        .readFileSync(
          path.resolve(
            __dirname,
            '..',
            '..',
            'code',
            'database',
            'user.mongo.ts'
          )
        )
        .toString()
      fs.writeFileSync('./src/models/user.model.ts', user)
    }
  }

  fillMiddlewares() {
    //locals
    const locals = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'web', 'locals.ts')
      )
      .toString()
    fs.writeFileSync('./src/middlewares/locals.ts', locals)
  }

  fillSettings(): void {
    const settings = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'settings.ts'))
      .toString()
    fs.writeFileSync('./src/config/settings.ts', settings)
  }

  fillRouter(): void {
    const router = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'web', 'router.ts')
      )
      .toString()
    fs.writeFileSync('./src/router.ts', router)
  }

  fillIndex(): void {
    const index = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'web', 'index.ts')
      )
      .toString()
    fs.writeFileSync('./src/index.ts', index)
  }

  fillViews(): void {
    const index = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'web', 'index.hbs')
      )
      .toString()
    const main = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'web', 'main.hbs')
      )
      .toString()
    fs.writeFileSync('./src/views/index.hbs', index)
    fs.writeFileSync('./src/views/layouts/main.hbs', main)
  }

  installDependencies(): void {
    console.log('================= Installing modules ================='.yellow)
    shell.exec(
      'npm i express bcrypt jsonwebtoken express-session dotenv passport passport-local morgan express-handlebars csurf connect-flash'
    )
  }

  installDevDependencies(): void {
    console.log(
      '================= Installing dev modules ================='.yellow
    )
    shell.exec(
      'npm i -D @types/express @types/bcrypt @types/jsonwebtoken @types/express-session @types/passport @types/passport-local @types/morgan @types/express-handlebars @types/csurf @types/connect-flash @types/node typescript tsc-watch concurrently nodemon ts-node'
    )
  }

  addScripts(): void {
    shell.exec(
      `npm set-script watch-ts 'tsc-watch --onSuccess "node build/index"'`
    )
    shell.exec(
      'npm set-script watch-hbs "mkdir build & nodemon -e hbs -w src/views -x cp -r src/views build"'
    )
    shell.exec('npm set-script clean "rm -rf build"')
    shell.exec('npm set-script build "tsc && cp -r src/views build"')
    shell.exec('npm set-script start "node build"')
    shell.exec(`npm set-script dev 'concurrently "npm:watch-*"'`)
    shell.exec(
      'npm set-script migration:run "ts-node ./node_modules/typeorm/cli.js migration:run"'
    )
    shell.exec(
      'npm set-script migration:revert "ts-node ./node_modules/typeorm/cli.js migration:revert"'
    )
    shell.exec(
      'npm set-script migration:generate "ts-node --transpile-only ./node_modules/typeorm/cli.js migration:generate --name"'
    )
  }

  init(dbType: DbType) {
    this.createDirStructure()
    this.createConfigFiles()
    this.fillDatabase(dbType)
    this.fillMiddlewares()
    this.fillSettings()
    this.fillRouter()
    this.fillIndex()
    this.fillViews()
    this.installDependencies()
    this.installDevDependencies()
    this.addScripts()
  }
}
