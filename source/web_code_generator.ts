import fs from 'fs'
import shell from 'shelljs'
import 'colors'

export class WebCodeGenerator implements CodeGenerator {
  createDirStructure() {
    fs.mkdirSync('./src', {
      recursive: true,
    })

    fs.mkdirSync('./src/database', {
      recursive: true,
    })

    fs.mkdirSync('./src/database/migrations', {
      recursive: true,
    })

    fs.mkdirSync('./src/middlewares', {
      recursive: true,
    })

    fs.mkdirSync('./src/entities', {
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
    const gitignore = fs.readFileSync('./code/gitignore').toString()
    fs.writeFileSync('.gitignore', gitignore)
    //ormconfig
    const ormconfig = fs.readFileSync('./code/ormconfig.json').toString()
    fs.writeFileSync('ormconfig.json', ormconfig)
    //env
    const env = fs.readFileSync('./code/env').toString()
    fs.writeFileSync('.env', env)
    //readme
    fs.writeFileSync('README.md', '')
    //tsconfig
    const tsconfig = fs.readFileSync('./code/tsconfig.json').toString()
    fs.writeFileSync('tsconfig.json', tsconfig)
  }

  fillDatabase() {
    const database = fs.readFileSync('./code/database.ts').toString()
    fs.writeFileSync('./src/database/database.ts', database)
  }

  fillMiddlewares() {
    //locals
    const locals = fs.readFileSync('./code/web/locals.ts').toString()
    fs.writeFileSync('./src/middlewares/locals.ts', locals)
  }

  fillSettings(): void {
    const settings = fs.readFileSync('./code/settings.ts').toString()
    fs.writeFileSync('./src/config/settings.ts', settings)
  }

  fillRouter(): void {
    const router = fs.readFileSync('./code/router.ts').toString()
    fs.writeFileSync('./src/router.ts', router)
  }

  fillIndex(): void {
    const index = fs.readFileSync('./code/web/index.ts').toString()
    fs.writeFileSync('./src/index.ts', index)
  }

  fillViews(): void {
    fs.writeFileSync('./src/views/index.hbs', '')
    fs.writeFileSync('./src/views/layouts/main.hbs', '')
  }

  installDependencies(): void {
    console.log('================= Installing modules ================='.yellow)
    shell.exec(
      'npm i express express-session dotenv passport passport-local morgan express-handlebars csurf typeorm connect-flash'
    )
  }

  installDevDependencies(): void {
    console.log(
      '================= Installing dev modules ================='.yellow
    )
    shell.exec(
      'npm i -D @types/express @types/express-session @types/passport @types/passport-local @types/morgan @types/express-handlebars @types/csurf @types/connect-flash @types/node typescript tsc-watch concurrently nodemon ts-node'
    )
  }

  addScripts(): void {
    shell.exec(
      `npm set-script watch-ts 'tsc-watch --onSuccess "node build/index"'`
    )
    shell.exec(
      'npm set-script watch-hbs "mkdir build & nodemon -e hbs -w src/views -x cp -r src/views build"'
    )
    shell.exec('npm set-script clean "rm -rf build & rm -rf node_modules"')
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

  init() {
    this.createDirStructure()
    this.createConfigFiles()
    this.fillDatabase()
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
