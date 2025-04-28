import { decorate } from 'ts-mixer'
import { Column } from 'typeorm'

export class Verifiable {
  @decorate(Column())
  email_verified_at?: Date

  get isVerified(): boolean {
    return !!this.email_verified_at
  }

  verify() {
    this.email_verified_at = new Date()
  }
}
