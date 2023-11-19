import { Router } from 'express'
const router = Router()

//importing all routes here
router.get('/', (req, res) => {
  return res.json({ Hello: 'World' })
})

export default router
