import { Request, Response, NextFunction } from 'express'

export default (req: Request, res: Response, next: NextFunction) => {
  res.locals.csrfToken = req.csrfToken()
  next()
}
