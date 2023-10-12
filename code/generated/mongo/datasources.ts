import mongoose from 'mongoose'
import { settings } from '@/config/settings'

mongoose
  .connect(settings.DB.URI!)
  .then((db) => console.log('Mongo is online...'))
  .catch((error) => console.error(error))
