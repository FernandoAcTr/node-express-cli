import fs from 'fs'
import shell from 'shelljs'
import 'colors'
import path from 'path'

export class CliGenerator {
  generateApiModule(name: string): void {
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
          'api',
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
          'api',
          'module',
          'service.ts'
        )
      )
      .toString()
      .replace(
        '__ServiceName__',
        `${name[0].toUpperCase()}${name.substring(1).toLowerCase()}Repository`
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
          'api',
          'module',
          'routes.ts'
        )
      )
      .toString()
      .replace('__modulename__', name.toLowerCase())
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.routes.ts`, routes)

    //validator
    const validator = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'api',
          'module',
          'validator.ts'
        )
      )
      .toString()
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.validator.ts`, validator)
  }

  generateWebModule(name: string): void {
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

    //repository
    const repository = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'web',
          'module',
          'repository.ts'
        )
      )
      .toString()
      .replace(
        '__RepositoryName__',
        `${name[0].toUpperCase()}${name.substr(1).toLowerCase()}Controller`
      )
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.repository.ts`, repository)

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
      .replace('__modulename__', name.toLowerCase())
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.routes.ts`, routes)
  }

  generateGraphqlModule(name: string) {
    const modulename = name.toLowerCase()
    const entityName = name[0].toUpperCase() + name.substr(1).toLowerCase()
    const dir = `./src/graphql/modules/${modulename}s`
    fs.mkdirSync(dir, {
      recursive: true,
    })
    const repository = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'graphql',
          'module',
          'module.repository.ts'
        )
      )
      .toString()
      .replace(new RegExp('__EntityName__', 'g'), entityName)

    const schema = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'graphql',
          'module',
          'module.schema.ts'
        )
      )
      .toString()
      .replace(new RegExp('__EntityName__', 'g'), entityName)
      .replace(new RegExp('__modulename__', 'g'), modulename)
    const resolver = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'graphql',
          'module',
          'module.resolver.ts'
        )
      )
      .toString()
      .replace(new RegExp('__EntityName__', 'g'), entityName)
      .replace(new RegExp('__modulename__', 'g'), modulename)

    const index = fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          'code',
          'graphql',
          'module',
          'module.index.ts'
        )
      )
      .toString()
      .replace(new RegExp('__EntityName__', 'g'), entityName)
      .replace(new RegExp('__modulename__', 'g'), modulename)

    fs.writeFileSync(`${dir}/${modulename}.schema.ts`, schema)
    fs.writeFileSync(`${dir}/${modulename}.resolver.ts`, resolver)
    fs.writeFileSync(`${dir}/${modulename}.repository.ts`, repository)
    fs.writeFileSync(`${dir}/index.ts`, index)
  }

  installPrettier() {
    console.log(
      '================= Installing Prettier ================='.yellow
    )
    shell.exec('npm i -D prettier')
    const prettier = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'prettierrc.json')
      )
      .toString()
    fs.writeFileSync('.prettierrc.json', prettier)
    fs.writeFileSync('.prettierignore', 'build')
    shell.exec(
      'npm set-script prettier:fix "prettier --config .prettierrc.json --write src/**/**/*.ts"'
    )
  }

  installEslint() {
    console.log('================= Installing Eslint ================='.yellow)
    shell.exec(
      'npm install -D eslint eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin'
    )
    const eslint = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'eslintrc.js'))
      .toString()
    fs.writeFileSync('.eslintrc.js', eslint)
    shell.exec('npm set-script lint "eslint . --ext .ts"')
    shell.exec('npm set-script lint:fix "eslint . --ext .ts --fix"')
  }

  installSocket(api: boolean) {
    console.log(
      '================= Installing Socket.io ================='.yellow
    )
    shell.exec('npm i socket.io')
    let index = ''
    if (api)
      index = fs
        .readFileSync(
          path.resolve(__dirname, '..', '..', 'code', 'api', 'index_socket.ts')
        )
        .toString()
    else
      index = fs
        .readFileSync(
          path.resolve(__dirname, '..', '..', 'code', 'web', 'index_socket.ts')
        )
        .toString()
    const socket = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'socket.ts'))
      .toString()
    const socketController = fs
      .readFileSync(
        path.resolve(__dirname, '..', '..', 'code', 'socket.controller.ts')
      )
      .toString()

    fs.writeFileSync('./src/socket.ts', socket)
    fs.writeFileSync('./src/socket.controller.ts', socketController)
    fs.writeFileSync('./src/index.ts', index)
  }
}
