import 'colors'
import fs from 'fs-extra'
import path from 'path'
import shell from 'shelljs'
import { CodeGenerator } from './code_generator'

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

  copyCode(): void {
    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'graphql_api'), './')
  }

  installDependencies(): void {
    console.log('================= Installing dependencies ================='.yellow)
    shell.exec('npm install @graphql-tools/schema apollo-server-express bcrypt cors dotenv dotenv-parse-variables express graphql lodash')
    shell.exec('npm install -D @types/bcrypt @types/express @types/lodash @types/node @types/dotenv-parse-variables ts-node tsc-watch typescript')
  }

  init() {
    this.createDirStructure()
    this.copyCode()
    this.installDependencies()
  }

  makeModule(name: String): void {
    const modulename = name.toLowerCase()
    const entityName = name[0].toUpperCase() + name.substr(1).toLowerCase()
    const dir = `./src/graphql/modules/${modulename}s`
    fs.mkdirSync(dir, {
      recursive: true,
    })
    const repository = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'graphql', 'module', 'module.repository.ts'))
      .toString()
      .replace(new RegExp('__EntityName__', 'g'), entityName)

    const schema = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'graphql', 'module', 'module.schema.ts'))
      .toString()
      .replace(new RegExp('__EntityName__', 'g'), entityName)
      .replace(new RegExp('__modulename__', 'g'), modulename)
    const resolver = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'graphql', 'module', 'module.resolver.ts'))
      .toString()
      .replace(new RegExp('__EntityName__', 'g'), entityName)
      .replace(new RegExp('__modulename__', 'g'), modulename)

    const index = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'graphql', 'module', 'module.index.ts'))
      .toString()
      .replace(new RegExp('__EntityName__', 'g'), entityName)
      .replace(new RegExp('__modulename__', 'g'), modulename)

    fs.writeFileSync(`${dir}/${modulename}.schema.ts`, schema)
    fs.writeFileSync(`${dir}/${modulename}.resolver.ts`, resolver)
    fs.writeFileSync(`${dir}/${modulename}.repository.ts`, repository)
    fs.writeFileSync(`${dir}/index.ts`, index)
  }
}
