import './alias'
import express from 'express'
import http from 'http'
import cors from 'cors'
import logger from './helpers/logger'
import { resolve } from 'path'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'
import { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@apollo/server/express4'

import { schema } from './graphql'

//importing configs
import { settings } from './config/settings'

class App {
  public app: express.Express

  constructor() {
    this.app = express()
    this.middlewares()
  }

  middlewares() {
    this.app.use(cors({ origin: '*' }))
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: false }))
    this.app.get('/graphql', (req, res) => res.sendFile(resolve('welcome.html')))
  }

  async start() {
    const httpServer = http.createServer(this.app)
    const server = new ApolloServer({
      schema,
      introspection: true,
      plugins: [ApolloServerPluginDrainHttpServer({ httpServer }), ApolloServerPluginLandingPageDisabled()],
    })

    await server.start()
    logger.info('🚀 GraphQL server started')

    this.app.use(
      '/graphql',
      expressMiddleware(server, {
        context: async ({ req }) => ({
          token: req.headers.token,
        }),
      })
    )

    return httpServer.listen(settings.PORT, () => {
      logger.info(`🚀 Server listen on port ${settings.PORT}`)
    })
  }
}

const app = new App()
export const server = app.start()
