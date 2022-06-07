import fs from 'fs'
import shell from 'shelljs'
import 'colors'
import path from 'path'

export class CliGenerator {
  installPrettier() {
    console.log('================= Installing Prettier ================='.yellow)
    shell.exec('npm i -D prettier')
    const prettier = fs.readFileSync(path.resolve(__dirname, '..', '..', 'code', 'prettierrc.json')).toString()
    fs.writeFileSync('.prettierrc.json', prettier)
    fs.writeFileSync('.prettierignore', 'build')
    shell.exec('npm set-script prettier:fix "prettier --config .prettierrc.json --write src/**/**/*.ts"')
  }

  installEslint() {
    console.log('================= Installing Eslint ================='.yellow)
    shell.exec(
      'npm install -D eslint eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin'
    )
    const eslint = fs.readFileSync(path.resolve(__dirname, '..', '..', 'code', 'eslintrc.js')).toString()
    fs.writeFileSync('.eslintrc.js', eslint)
    shell.exec('npm set-script lint "eslint . --ext .ts"')
    shell.exec('npm set-script lint:fix "eslint . --ext .ts --fix"')
  }

  installSocket() {
    console.log('================= Installing Socket.io ================='.yellow)
    shell.exec('npm i socket.io')
    const index = fs.readFileSync(path.resolve(__dirname, '..', '..', 'code', 'api', 'index_socket.ts')).toString()
    const socket = fs.readFileSync(path.resolve(__dirname, '..', '..', 'code', 'socket.ts')).toString()
    const socketController = fs
      .readFileSync(path.resolve(__dirname, '..', '..', 'code', 'socket.controller.ts'))
      .toString()

    fs.writeFileSync('./src/socket.ts', socket)
    fs.writeFileSync('./src/socket.controller.ts', socketController)
    fs.writeFileSync('./src/index.ts', index)
  }
}
