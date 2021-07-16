import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimiterMiddleware } from './middlewares/rate_limiter'
import { handleErrorMiddleware } from './middlewares/error_handler'
import SocketIO from './socket'

//importin routes
import routes from './router'

//importing configs
import { settings } from './config/settings'

import './config/database'

class App {
  public app: express.Application

  constructor() {
    this.app = express()
    this.config()
    this.middlewares()
    this.routes()
  }

  config() {}

  middlewares() {
    this.app.use(morgan('dev'))
    this.app.use(cors())
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: false }))
    this.app.use(express.static('public'))
  }

  routes() {
    this.app.use(routes)
  }

  start(): Server {
    return this.app.listen(settings.PORT, () => {
      console.log('Server listen on port ' + settings.PORT)
    })
  }
}

const app = new App()
const server = app.start()
const socket = new SocketIO(server)