import { Router } from 'express'
const router = Router()

//importing all routes here
router.get('/', (req, res) => {
  res.json({ Hello: 'World' })
})

export default router
