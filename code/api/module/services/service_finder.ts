import { AppDataSource } from '@database/database'
import { Repository } from 'typeorm'

export class __ServiceName__Finder {
  private readonly repository: Repository<Object>

  constructor() {
    this.repository = AppDataSource.getRepository(Object)
  }

  async findOne(id: any): Promise<Object> {
    return {}
  }

  async findAll(): Promise<Object[]> {
    return []
  }
}
