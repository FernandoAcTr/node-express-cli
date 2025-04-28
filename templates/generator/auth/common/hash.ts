import bcrypt from 'bcrypt'

export class Hash {
  make(password: string): string {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10))
  }

  compare(incomingPassword: string, hashedPassword: string): boolean {
    return bcrypt.compareSync(incomingPassword, hashedPassword)
  }
}

export const hash = new Hash()