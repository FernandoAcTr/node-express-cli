import { DbType, PackageManager, ProjectType } from './code.generator'

export interface Config {
  project: ProjectType
  orm?: DbType
  package_manger: PackageManager
}
