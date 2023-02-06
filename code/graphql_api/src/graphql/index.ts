import { makeExecutableSchema } from '@graphql-tools/schema'
import { merge } from 'lodash'

//Import Schemas
import { Default } from './modules/default'

export const schema = makeExecutableSchema({
  typeDefs: [Default.typeDef],
  resolvers: merge(Default.resolver),
})
