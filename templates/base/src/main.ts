import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import helmet from 'helmet'
import logger from './utils/logger'
import rateLimiter from './middlewares/rate_limiter.js'
import handleErrorMiddleware from './middlewares/error_handler'
import { config } from './config'
import { registerRoutes } from './routing'
// @nec:imports

console.debug('Applied config: ', config)

// @nec:before-app
const app = express()
const router = express.Router()

registerRoutes(router)

app.use(morgan('[:date[iso]] (:status) ":method :url HTTP/:http-version" :response-time ms - [:res[content-length]]'))
app.use(cors({ origin: '*' }))
app.use(rateLimiter)
app.use(helmet())
// @nec:before-json
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(router)
app.use(handleErrorMiddleware)

// @nec:before-listen
export const server = app.listen(config.PORT, () => {
  logger.info(`🚀 Server listen on port ${config.PORT}`)
})
// @nec:after-listen
