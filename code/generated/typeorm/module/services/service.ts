import { AppDataSource } from '@database/datasources'
import { Repository } from 'typeorm'

export class __ServiceName__Service {
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

  async update(id: any, body: any): Promise<Object> {
    return {}
  }

  async store(body: any): Promise<Object> {
    return {}
  }

  async destroy(id: any): Promise<Object> {
    return {}
  }

  async delete(id: any): Promise<Object> {
    return {}
  }
}
