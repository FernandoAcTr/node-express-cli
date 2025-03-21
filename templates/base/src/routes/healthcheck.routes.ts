import { Router } from 'express'
const router = Router()

//importing all routes here
router.get('/healthcheck', (req, res) => {
  res.send('Ok')
})

export default router
