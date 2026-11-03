import { Router } from 'express'
const router = Router()

export const PREFIX = '/healthcheck'

//importing all routes here
router.get('/', (req, res) => {
  res.send('Ok')
})

export default router
