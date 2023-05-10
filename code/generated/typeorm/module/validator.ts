import { validateBody } from '@middlewares/validator'
import { check } from 'express-validator';

export const storeValidators = [validateBody];

export const updateValidators = [validateBody];