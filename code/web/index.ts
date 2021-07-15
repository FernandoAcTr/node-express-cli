import express from 'express'
import handlerbars from 'express-handlebars'
import session from 'express-session'
import passport from 'passport'
import flash from 'connect-flash'
import path from 'path'
import csurf from 'csurf'
import locals from './middlewares/locals'
import morgan from 'morgan'

//importin routes
import routes from './router'

//importing configs
import { settings } from './config/settings'

class Server {
  public app: express.Application

  constructor() {
    this.app = express()
    this.config()
    this.middlewares()
    this.routes()
  }

  config() {
    //Espress hbs engine
    this.app.set('views', path.join(__dirname, 'views'))
    this.app.engine(
      '.hbs',
      handlerbars({
        extname: '.hbs',
        layoutsDir: path.join(this.app.get('views'), 'layouts'),
        partialsDir: path.join(this.app.get('views'), 'partials'),
        defaultLayout: 'main',
      })
    )
    this.app.set('view engine', 'hbs')
  }

  middlewares() {
    this.app.use(morgan('dev'))
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: false }))
    this.app.use(
      session({
        name: 'misesion',
        secret: settings.SECRET,
        resave: false,
        saveUninitialized: false,
      })
    )
    this.app.use(flash())
    this.app.use(passport.initialize())
    this.app.use(passport.session())
    this.app.use(csurf())
    this.app.use(locals)
    this.app.use(express.static(path.resolve('public')))
  }

  routes() {
    this.app.use(routes)
  }

  start() {
    this.app.listen(settings.PORT, () => {
      console.log('Server listen on port ' + settings.PORT)
    })
  }
}

const server = new Server()
server.start()
