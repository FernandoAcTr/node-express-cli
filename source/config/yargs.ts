import yargs from 'yargs'

export const argv = yargs.options({
  init: {
    alias: 'i',
    description: 'Init a new Express project',
  },
  'make:module': {
    description: 'Generate a new resource module',
  },
  'install:prettier': {
    description: 'Add prettier to the project',
  },
}).argv
