import 'colors'
import fs from 'fs-extra'
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

  copyCode(dbType: DbType): void {
    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'graphql_api'), './')

    if (dbType === DbType.TYPEORM) {
      fs.copyFile(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'database.ts'), './src/database/database.ts')
      fs.copyFile(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'user.entity.ts'), './src/entities/user.entity.ts')
      fs.copyFile(path.resolve(__dirname, '..', '..', 'code', 'generated', 'typeorm', 'ormconfig.json'), './ormconfig.json')
    } else {
      fs.copyFile(path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'database.ts'), './src/database/database.ts')
      fs.copyFile(path.resolve(__dirname, '..', '..', 'code', 'generated', 'mongo', 'user.model.ts'), './src/entities/user.model.ts')
    }
  }

  installDependencies(): void {
    console.log('================= Installing dependencies ================='.yellow)
    shell.exec('npm install')
  }

  init(dbType: DbType) {
    this.createDirStructure()
    this.copyCode(dbType)
    this.installDependencies()
    this.installDatabase(dbType)
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
