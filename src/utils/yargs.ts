import yargs from 'yargs'

export const argv = yargs.options({
  init: {
    alias: 'i',
    description: 'Init a new Express project',
  },
  'make:module': {
    description: 'Generate a new resource module',
  },
  'make:seeder': {
    description: 'Generate a new seeder class',
  },
  'make:entity': {
    description: 'Generate a new entity class',
  },
  'make:migration': {
    description: 'Generate a new database migration',
  },
  'make:factory': {
    description: 'Generate a new Factory class for a Model',
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
  'install:orm': {
    description: 'Add Database support using an orm',
  },
  'install:auth': {
    description: 'Add basic scaffolding to auth with jwt and passport',
  },
  'install:mailer': {
    description: 'Add support for send mails via nodemailer library',
  },
  'install:tests': {
    description: 'Add a library to do testing and some examples',
  },
  'route:list': {
    description: 'List all routes in the project. Use --omit to remove a prefix from the routes. Example: --omit /api',
  }
}).argv
