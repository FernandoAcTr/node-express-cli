import { Request, Response, NextFunction, Handler } from 'express'

declare global {
  type RestController = {
    GET?: Handler | Handler[]
    POST?: Handler | Handler[]
    PUT?: Handler | Handler[]
    DELETE?: Handler | Handler[]
    PATCH?: Handler | Handler[]
    HEAD?: Handler | Handler[]
    OPTIONS?: Handler | Handler[]
  }
}

export {}
