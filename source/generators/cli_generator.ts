import fs from 'fs'

export class CliGenerator {
  generateApiModule(name: string): void {
    const dir = `./src/modules/${name.toLowerCase()}`
    fs.mkdirSync(dir, {
      recursive: true,
    })
    //controller
    const controller = fs
      .readFileSync('./code/api/module/controller.ts')
      .toString()
    fs.writeFileSync(
      `${dir}/${name.toLowerCase()}.controller.ts`,
      controller
    )

    //repository
    const repository = fs
      .readFileSync('./code/api/module/repository.ts')
      .toString()
      .replace(
        '__RepositoryName__',
        `${name[0].toUpperCase()}${name.substr(1).toLowerCase()}Controller`
      )
    fs.writeFileSync(
      `${dir}/${name.toLowerCase()}.repository.ts`,
      repository
    )

    //router
    const routes = fs
      .readFileSync('./code/api/module/routes.ts')
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
      .readFileSync('./code/web/module/controller.ts')
      .toString()
    fs.writeFileSync(
      `${dir}/${name.toLowerCase()}.controller.ts`,
      controller
    )

    //repository
    const repository = fs
      .readFileSync('./code/web/module/repository.ts')
      .toString()
      .replace(
        '__RepositoryName__',
        `${name[0].toUpperCase()}${name.substr(1).toLowerCase()}Controller`
      )
    fs.writeFileSync(
      `${dir}/${name.toLowerCase()}.repository.ts`,
      repository
    )

    //router
    const routes = fs
      .readFileSync('./code/web/module/routes.ts')
      .toString()
      .replace('__modulename__', name.toLowerCase())
    fs.writeFileSync(`${dir}/${name.toLowerCase()}.routes.ts`, routes)
  }
}
