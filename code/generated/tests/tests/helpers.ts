import supertest from 'supertest'
import { server } from '../index'

export const closePort = () => server.close()
export const request = () => supertest(server)


