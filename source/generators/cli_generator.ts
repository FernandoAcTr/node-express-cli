import fs from 'fs'
import shell from 'shelljs'
import 'colors'

export class CliGenerator {
  generateApiModule(name: string): void {
    const dir = `./src/modules/${name.toLowerCase()}`
    fs.mkdirSync(dir, {
      recursive: true,
    })
    //controller
    const controller = fs
      .readFileSync('code/api/module/controller.ts')
      .toString()
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.controller.ts`, controller)

    //repository
    const repository = fs
      .readFileSync('code/api/module/repository.ts')
      .toString()
      .replace(
        '__RepositoryName__',
        `${name[0].toUpperCase()}${name.substr(1).toLowerCase()}Controller`
      )
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.repository.ts`, repository)

    //router
    const routes = fs
      .readFileSync('code/api/module/routes.ts')
      .toString()
      .replace('__modulename__', name.toLowerCase())
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.routes.ts`, routes)
  }

  generateWebModule(name: string): void {
    const dir = `./src/modules/${name.toLowerCase()}`
    fs.mkdirSync(dir, {
      recursive: true,
    })
    //controller
    const controller = fs
      .readFileSync('code/web/module/controller.ts')
      .toString()
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.controller.ts`, controller)

    //repository
    const repository = fs
      .readFileSync('code/web/module/repository.ts')
      .toString()
      .replace(
        '__RepositoryName__',
        `${name[0].toUpperCase()}${name.substr(1).toLowerCase()}Controller`
      )
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.repository.ts`, repository)

    //router
    const routes = fs
      .readFileSync('code/web/module/routes.ts')
      .toString()
      .replace('__modulename__', name.toLowerCase())
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.routes.ts`, routes)
  }

  installPrettier() {
    console.log(
      '================= Installing Prettier ================='.yellow
    )
    shell.exec('npm i -D prettier')
    const prettier = fs.readFileSync('code/prettierrc.json').toString()
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
    const eslint = fs.readFileSync('code/eslintrc.js').toString()
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
    if (api) index = fs.readFileSync('code/api/index_socket.ts').toString()
    else index = fs.readFileSync('code/web/index_socket.ts').toString()
    const socket = fs.readFileSync('code/socket.ts').toString()
    const socketController = fs
      .readFileSync('code/socket.controller.ts')
      .toString()

    fs.writeFileSync('./src/socket.ts', socket)
    fs.writeFileSync('./src/socket.controller.ts', socketController)
    fs.writeFileSync('./src/index.ts', index)
  }
}
