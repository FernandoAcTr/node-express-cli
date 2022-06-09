import fs from 'fs-extra'
import shell from 'shelljs'
import 'colors'
import path from 'path'

export class CliGenerator {
  installPrettier() {
    console.log('================= Installing Prettier ================='.yellow)
    shell.exec('npm i -D prettier')

    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'prettier'), './')
    shell.exec('npm set-script prettier:fix "prettier --config .prettierrc.json --write src/**/**/*.ts"')
  }

  installEslint() {
    console.log('================= Installing Eslint ================='.yellow)
    shell.exec(
      'npm install -D eslint eslint-config-prettier eslint-plugin-prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin'
    )

    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'eslint'), './')

    shell.exec('npm set-script lint "eslint . --ext .ts"')
    shell.exec('npm set-script lint:fix "eslint . --ext .ts --fix"')
  }

  installSocket() {
    console.log('================= Installing Socket.io ================='.yellow)
    shell.exec('npm i socket.io')

    fs.copySync(path.resolve(__dirname, '..', '..', 'code', 'generated', 'socketio'), './src')
  }
}
