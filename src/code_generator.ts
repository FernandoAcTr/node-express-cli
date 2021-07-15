interface CodeGenerator {
  createDirStructure(): void
  createConfigFiles(): void
  fillDatabase(): void
  fillMiddlewares(): void
  fillSettings(): void
  fillRouter(): void
  fillIndex(): void
  installDependencies(): void
  installDevDependencies(): void
  addScripts(): void
  init(): void
}
