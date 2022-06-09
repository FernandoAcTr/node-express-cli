import winston from 'winston'
import appRoot from 'app-root-path'

const Logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      level: 'warn',
      filename: 'app.log',
      dirname: `${appRoot}/logs/`,
      handleExceptions: true,
      format: winston.format.combine(winston.format.timestamp(), winston.format.simple()),
    }),
    new winston.transports.Console({
      level: 'silly',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => `[${new Date().toISOString()}] ${info.level}: ${info.message}`)
      ),
    }),
  ],
  exitOnError: false,
})

const logger = {
  log: (message: string): winston.Logger => Logger.debug(message),
  info: (message: string, obj?: object): winston.Logger => Logger.info(message, obj),
  error: (message: string, obj?: object): winston.Logger => Logger.error(message, obj),
  warn: (message: string, obj?: object): winston.Logger => Logger.warn(message, obj),
  debug: (message: string, obj?: object): winston.Logger => Logger.debug(message, obj),
  silly: (message: string, obj?: object): winston.Logger => Logger.silly(message, obj),
}
export default logger
