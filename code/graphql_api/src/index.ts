import './alias'
import express from 'express'
import cors from 'cors'
import { ApolloServer } from 'apollo-server-express'

import { schema } from './graphql'

//importing configs
import { settings } from './config/settings'

class App {
  public app: express.Application
  public apolloServer: ApolloServer

  constructor() {
    this.app = express()
  }

  middlewares() {
    this.app.use(cors())
  }

  async start() {
    this.apolloServer = new ApolloServer({
      schema,
      introspection: true,
      formatError: (error) => {
        console.log(error)
        return error
      },
    })
    await this.apolloServer.start()
    this.apolloServer.applyMiddleware({ app: this.app, path: '/graphql' })
    this.middlewares()
    return this.app.listen(settings.PORT, () => {
      console.log('Server listen on port ' + settings.PORT)
    })
  }
}

const app = new App()
export const server = app.start()
