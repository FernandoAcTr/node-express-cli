import { closePort, request } from './helpers'

afterAll(async () => {
  closePort()
})

describe('Example collection of request', () => {
  test('Example Request', async () => {
    const { status } = await request().get('/')
    expect(status).toBe(200)
  })
})
