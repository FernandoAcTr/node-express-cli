import { DateTimeAuditableEntity } from './date_time_auditable_entity'
import { Column, BeforeInsert, BeforeUpdate } from 'typeorm'
import { context } from '@/utils/context'

export abstract class AuditableEntity extends DateTimeAuditableEntity {
  @Column()
  created_by_id: number

  @Column()
  updated_by_id: number

  @BeforeInsert()
  auditCreator() {
    if (context.userId) {
      this.created_by_id = context.userId
      this.updated_by_id = context.userId
    }
  }

  @BeforeUpdate()
  auditUpdater() {
    if (context.userId) {
      this.updated_by_id = context.userId
    }
  }

  toJSON(): any {
    const { created_by_id, updated_by_id, ...rest } = this
    return rest
  }
}
