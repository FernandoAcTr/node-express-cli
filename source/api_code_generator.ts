import fs from 'fs'
import shell from 'shelljs'

export class ApiCodeGenerator implements CodeGenerator {
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
    //validator
    const validator = fs
      .readFileSync('./code/api/validator.middleware.ts')
      .toString()
    fs.writeFileSync('./src/middlewares/validator.middleware.ts', validator)

    //express-validators
    const express_validators = fs
      .readFileSync('./code/api/express_validators.ts')
      .toString()
    fs.writeFileSync(
      './src/middlewares/express_validators.ts',
      express_validators
    )

    //error handler
    const error_handler = fs
      .readFileSync('./code/api/error_handler.ts')
      .toString()
    fs.writeFileSync(
      './src/middlewares/error_handler.middleware.ts',
      error_handler
    )

    //rate limiter
    const rate_limiter = fs
      .readFileSync('./code/api/rate_limiter.middleware.ts')
      .toString()
    fs.writeFileSync(
      './src/middlewares/rate_limiter.middleware.ts',
      rate_limiter
    )
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
    const index = fs.readFileSync('./code/api/index.ts').toString()
    fs.writeFileSync('./src/index.ts', index)
  }
  installDependencies(): void {
    console.log('================= Installing modules ================='.yellow)
    shell.exec(
      'npm i express express-validator cors bcrypt jsonwebtoken dotenv passport passport-jwt morgan helmet rate-limiter-flexible'
    )
  }
  installDevDependencies(): void {
    throw new Error('Method not implemented.')
  }
  addScripts(): void {
    throw new Error('Method not implemented.')
  }

  init() {
    this.createDirStructure()
    this.createConfigFiles()
    this.fillDatabase()
    this.fillMiddlewares()
    this.fillSettings()
    this.fillRouter()
    this.fillIndex()
  }
}
