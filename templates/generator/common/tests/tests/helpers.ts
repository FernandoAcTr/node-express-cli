import supertest from 'supertest'
import { server } from '../main'

export const closePort = () => server.close()
export const request = () => supertest(server)


