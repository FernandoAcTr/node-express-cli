import { AppDataSource } from '@database/database'
import { Repository } from 'typeorm'

export class __ServiceName__Destroyer {
  private readonly repository: Repository<Object>

  constructor() {
    this.repository = AppDataSource.getRepository(Object)
  }

  async destroy(id: any): Promise<Object> {
    return {}
  }

  async delete(id: any): Promise<Object> {
    return {}
  }
}
