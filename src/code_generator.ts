import fs from 'fs'

export class CodeGenerator {
  createDirStructure(webapp = false) {
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

    if (webapp) {
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

  init() {
    this.createDirStructure()
    this.createConfigFiles()
  }
}
