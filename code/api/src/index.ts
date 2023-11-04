import './alias'
import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import helmet from 'helmet'
import logger from './helpers/logger'
import routes from './router'
import { rateLimiterMiddleware } from './middlewares/rate_limiter'
import { settings } from './config/settings'
import { handleErrorMiddleware } from './middlewares/error_handler'

class Server {
  public app: express.Application

  constructor() {
    this.app = express()
    this.middlewares()
    this.routes()
  }

  middlewares() {
    this.app.use(morgan('[:date[iso]] (:status) ":method :url HTTP/:http-version" :response-time ms - [:res[content-length]]'))
    this.app.use(cors({origin: '*'}))
    this.app.use(rateLimiterMiddleware)
    this.app.use(helmet())
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: false }))
  }

  routes() {
    this.app.use(routes)
    this.app.use(handleErrorMiddleware)
  }

  start() {
    this.app.listen(settings.PORT, () => {
      logger.info('🚀 Server listen on port ' + settings.PORT)
    })
  }
}

const server = new Server()
server.start()
