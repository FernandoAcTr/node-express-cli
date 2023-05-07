import axios from 'axios'
import { URL, haveProperties, login } from './constants'

describe('Authentication', () => {
  test('It is possible to do login', async () => {
    const { data, status } = await axios.post(`${URL}/auth/login`, { email: 'foo@gmail.com', password: '123' })

    expect(status).toBe(200)
    expect(haveProperties(data, ['token', 'user', 'refresh_token'])).toBe(true)
  })

  test('Login Function', async () => {
    const auth = await login('viandy@gmail.com', '123')
    expect(auth).toBeTruthy()
  })
})
