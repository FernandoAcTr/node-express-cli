import { Router } from 'express'
const router = Router()

//importing all routes here
router.get('/', (req, res) => res.render('index'))

export default router
