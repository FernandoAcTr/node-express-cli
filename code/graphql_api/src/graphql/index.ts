import { makeExecutableSchema } from '@graphql-tools/schema'
import { helloWorld } from './modules/hello-world'

export const schema = makeExecutableSchema({
  typeDefs: [helloWorld.typeDef],
  resolvers: [helloWorld.resolver],
})
