import 'colors'
import fs from 'fs'
import path from 'path'
import shell from 'shelljs'
import { CodeGenerator, DbType } from './code_generator'

export class GraphqlCodeGenerator extends CodeGenerator {
  createDirStructure(): void {
    fs.mkdirSync('./src', {
      recursive: true,
    })

    fs.mkdirSync('./src/database', {
      recursive: true,
    })

    fs.mkdirSync('./src/graphql', {
      recursive: true,
    })

    fs.mkdirSync('./src/graphql/modules', {
      recursive: true,
    })

    fs.mkdirSync('./src/graphql/modules/default', {
      recursive: true,
    })

    fs.mkdirSync('./src/config', {
      recursive: true,
    })

    fs.mkdirSync('./src/interfaces', {
      recursive: true,
    })
  }

  fillMiddlewares(): void {
    //
  }

  fillRouter(): void {
    //
  }

  fillIndex(): void {
    const index = fs.readFileSync(path.resolve(__dirname, '..', '..', 'code', 'graphql', 'index.ts')).toString()
    const schemaIndex = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'graphql', 'schema.index.ts'))
      .toString()
    fs.writeFileSync('./src/index.ts', index)
    fs.writeFileSync('./src/graphql/index.ts', schemaIndex)
  }

  installDependencies(): void {
    console.log('================= Installing dependencies ================='.yellow)
    shell.exec(
      'npm i express cors dotenv bcrypt jsonwebtoken @graphql-tools/schema apollo-server-express graphql lodash'
    )
  }

  installDevDependencies(): void {
    console.log('================= Installing dev dependencies ================='.yellow)
    shell.exec(
      'npm i -D @types/express @types/bcrypt @types/jsonwebtoken @types/lodash @types/node ts-node tsc-watch typescript'
    )
  }

  addScripts(): void {
    shell.exec(`npm set-script dev 'tsc-watch --onSuccess "node build/index"'`)
    shell.exec('npm set-script clean "rm -rf build"')
    shell.exec('npm set-script build "tsc"')
    shell.exec('npm set-script start "node build"')
  }

  createDefaultModule() {
    const schema = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'graphql', 'module', 'default', 'default.schema.ts'))
      .toString()
    const resolver = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'graphql', 'module', 'default', 'default.resolver.ts'))
      .toString()
    const index = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'graphql', 'module', 'default', 'index.ts'))
      .toString()
    fs.writeFileSync('./src/graphql/modules/default/default.schema.ts', schema)
    fs.writeFileSync('./src/graphql/modules/default/default.resolver.ts', resolver)
    fs.writeFileSync('./src/graphql/modules/default/index.ts', index)
  }

  init(dbType: DbType): void {
    this.createDirStructure()
    this.createConfigFiles()
    this.fillDatabase(dbType)
    this.fillMiddlewares()
    this.fillSettings()
    this.fillRouter()
    this.fillIndex()
    this.createDefaultModule()
    this.installDependencies()
    this.installDevDependencies()
    this.addScripts()
  }

  makeModule(name: String): void {
    const modulename = name.toLowerCase()
    const entityName = name[0].toUpperCase() + name.substr(1).toLowerCase()
    const dir = `./src/graphql/modules/${modulename}s`
    fs.mkdirSync(dir, {
      recursive: true,
    })
    const repository = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'graphql', 'module', 'module.repository.ts'))
      .toString()
      .replace(new RegExp('__EntityName__', 'g'), entityName)

    const schema = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'graphql', 'module', 'module.schema.ts'))
      .toString()
      .replace(new RegExp('__EntityName__', 'g'), entityName)
      .replace(new RegExp('__modulename__', 'g'), modulename)
    const resolver = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'graphql', 'module', 'module.resolver.ts'))
      .toString()
      .replace(new RegExp('__EntityName__', 'g'), entityName)
      .replace(new RegExp('__modulename__', 'g'), modulename)

    const index = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'graphql', 'module', 'module.index.ts'))
      .toString()
      .replace(new RegExp('__EntityName__', 'g'), entityName)
      .replace(new RegExp('__modulename__', 'g'), modulename)

    fs.writeFileSync(`${dir}/${modulename}.schema.ts`, schema)
    fs.writeFileSync(`${dir}/${modulename}.resolver.ts`, resolver)
    fs.writeFileSync(`${dir}/${modulename}.repository.ts`, repository)
    fs.writeFileSync(`${dir}/index.ts`, index)
  }
}
