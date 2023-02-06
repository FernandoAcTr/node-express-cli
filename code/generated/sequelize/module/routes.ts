import { Router } from 'express'
import * as Controller from './__modulename__.controller'
import { storeValidators, updateValidators } from './__modulename__.validator';
import { validateBody } from '@middlewares/validator';

const router = Router()

router.get('/', Controller.index)
//
router.get('/:id', Controller.show)
//
router.post('/', [...storeValidators, validateBody], Controller.store)
//
router.put('/:id', [...updateValidators, validateBody], Controller.update)
//
router.delete('/:id', Controller.destroy)

export default router
