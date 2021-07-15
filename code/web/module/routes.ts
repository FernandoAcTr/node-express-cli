import { Router } from 'express'
import * as Controller from './__modulename__.controller'

const router = Router()

router.get('/', Controller.index)
router.get('/{id}', Controller.show)
router.get('/create', Controller.create)
router.get('/{id}/edit', Controller.edit)
router.post('/', Controller.store)
router.put('/{id}', Controller.update)
router.delete('/{id}', Controller.destroy)

export default router
