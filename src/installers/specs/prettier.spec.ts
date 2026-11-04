import { InstallerSpec } from '../spec'

export const prettierSpec: InstallerSpec = {
  feature: 'prettier',
  description: 'Add prettier to the project',
  devDeps: ['prettier'],
  files: [
    { from: 'generator/common/prettier/.prettierignore', to: '.prettierignore' },
    { from: 'generator/common/prettier/.prettierrc.json', to: '.prettierrc.json' },
  ],
  scripts: {
    'prettier:fix': 'prettier --config .prettierrc.json --write src/**/**/*.ts',
  },
}
