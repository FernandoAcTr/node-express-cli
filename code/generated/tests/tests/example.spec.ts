import { loginAsAdmin } from './constants'

describe('Example collection of request', () => {
  test('Example Request', async () => {
    const axios = await loginAsAdmin()
    const { status } = await axios.get('/')
    expect(status).toBe(200)
  })
})
