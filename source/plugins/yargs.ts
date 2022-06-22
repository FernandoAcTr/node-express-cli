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
  'install:mailer': {
    description: 'Add support for send mails via nodemailer library',
  },
}).argv
