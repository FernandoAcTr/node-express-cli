import { getRepository, Repository } from 'typeorm';

export class __ServiceName__ {
  private readonly repository: Repository<Object>;

  constructor() {
    this.repository = getRepository(Object);
  }
  
  async store(body: any): Promise<Object> {
    return {}
  }

  async findOne(): Promise<Object> {
    return {}
  }

  async findAll(): Promise<Object[]> {
    return []
  }

  async update(id: any, body: any): Promise<Object> {
    return {}
  }

  async destroy(id: any): Promise<Object> {
    return {}
  }
}