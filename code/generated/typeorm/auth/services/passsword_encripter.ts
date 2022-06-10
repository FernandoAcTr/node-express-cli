import bcrypt from 'bcrypt'

export class PasswordEncrypter {
  encrypt(password: string): string {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10))
  }

  compare(incomingPassword: string, userPassword: string): boolean {
    return bcrypt.compareSync(incomingPassword, userPassword)
  }
}
