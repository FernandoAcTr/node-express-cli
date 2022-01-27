import fs from 'fs'
import shell from 'shelljs'
import 'colors'
import { CodeGenerator, DbType } from './code_generator'
import path from 'path'
export class WebCodeGenerator extends CodeGenerator {
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

  fillMiddlewares() {
    //locals
    const locals = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'web', 'locals.ts')
      )
      .toString()
    fs.writeFileSync('./src/middlewares/locals.ts', locals)
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

  makeModule(name: String): void {
    const dir = `./src/modules/${name.toLowerCase()}`
    fs.mkdirSync(dir, {
      recursive: true,
    })
    //controller
    const controller = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'web',
          'module',
          'controller.ts'
        )
      )
      .toString()
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.controller.ts`, controller)

    //service
    const service = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'web',
          'module',
          'service.ts'
        )
      )
      .toString()
      .replace(
        '__ServiceName__',
        `${name[0].toUpperCase()}${name.substring(1).toLowerCase()}Service`
      )
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.service.ts`, service)

    //router
    const routes = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'web',
          'module',
          'routes.ts'
        )
      )
      .toString()
      .replace(/__modulename__/g, name.toLowerCase())
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.routes.ts`, routes)
  }
}
