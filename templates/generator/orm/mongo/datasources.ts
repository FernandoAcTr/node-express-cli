import mongoose from 'mongoose'
import { config } from '@/config'

mongoose
  .connect(config.DB.URI!)
  .then((db) => console.log('Mongo is online...'))
  .catch((error) => console.error(error))
