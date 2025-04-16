import { Command, Generator } from './interfaces/generator.interface'

export async function run(generator: Generator | Command) {
  if ('pre' in generator) {
    await generator.pre()
  }

  if ('createDirectories' in generator) {
    await generator.createDirectories()
    await generator.copyFiles()
  }

  if ('installDependencies' in generator) {
    await generator.installDependencies()
  }

  if ('post' in generator) {
    await generator.post()
  }

  if ('run' in generator) {
    await generator.run()
  }
}
