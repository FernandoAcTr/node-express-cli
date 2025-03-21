import { Router } from 'express'
import * as Controller from './__modulename__.controller'
import { storeValidators, updateValidators } from './__modulename__.validator';

const router = Router()

router.get('/api/__modulename__', Controller.index)
//
router.get('/api/__modulename__/:id', Controller.show)
//
router.post('/api/__modulename__/', storeValidators, Controller.store)
//
router.put('/api/__modulename__/:id', updateValidators, Controller.update)
//
router.delete('/api/__modulename__/:id', Controller.destroy)

export default router
