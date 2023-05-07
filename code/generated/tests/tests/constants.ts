import axios from 'axios'
import fs from 'fs'
import { settings } from '../config/settings'
export const URL = `http://localhost:${settings.PORT}`

export const haveProperties = (object: any, properties: string[]) => {
  for (const property of properties) {
    if (property.includes('.')) {
      const parts = property.split('.')

      let current = object[parts[0]]
      if (!haveProperties(current, parts.slice(1))) return false
    } else {
      if (!Boolean(object[property])) return false
    }
  }

  return true
}

export const login = async (email: string, password: string) => {
  if (fs.existsSync('./src/tests/user.json')) {
    const user = JSON.parse(fs.readFileSync('./src/tests/user.json').toString())
    return axios.create({ baseURL: URL, headers: { Authorization: 'Bearer ' + user.token } })
  }
  const { data } = await axios.post(`${URL}/auth/login`, { email, password })
  fs.writeFileSync('./src/tests/user.json', JSON.stringify(data))

  return axios.create({ baseURL: URL, headers: { Authorization: 'Bearer ' + data.token } })
}

export const loginAsAdmin = () => {
  return login('foo@gmail.com', '123')
}
