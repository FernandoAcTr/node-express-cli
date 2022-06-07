import { AppDataSource } from '@database/database'
import { Repository } from 'typeorm'

export class __ServiceName__Updater {
  private readonly repository: Repository<Object>

  constructor() {
    this.repository = AppDataSource.getRepository(Object)
  }

  async update(id: any, body: any): Promise<Object> {
    return {}
  }
}
