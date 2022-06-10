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
  'install:eslint': {
    description: 'Add eslint to the project',
  },
  'install:socket': {
    description: 'Add Socket.io to the project',
  },
  'install:database': {
    description: 'Add Database support (Typeorm or Mongo) to the project',
  },
  'install:auth': {
    description: 'Add basic scaffolding to auth with jwt and passport',
  },
}).argv
