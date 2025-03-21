export interface IFileSystemGenerator {
  createDirectories(): Promise<void>
  copyFiles(): Promise<void>
}

export interface IPreGenerator {
  pre(): Promise<void>
}

export interface IPostGenerator {
  post(): Promise<void>
}

export interface IInstallerGenerator {
  installDependencies(): Promise<void>
}
export interface IGenerator extends IFileSystemGenerator, IPreGenerator, IPostGenerator, IInstallerGenerator {}

export type Generator = IFileSystemGenerator | IPreGenerator | IPostGenerator | IInstallerGenerator
