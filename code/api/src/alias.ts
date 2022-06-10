import moduleAlias from 'module-alias'

moduleAlias.addAliases({
  '@src': __dirname,
  '@database': __dirname + '/database',
  '@entities': __dirname + '/entities',
  '@middlewares': __dirname + '/middlewares',
  '@helpers': __dirname + '/helpers',
  '@config': __dirname + '/config',
  '@modules': __dirname + '/modules',
})
