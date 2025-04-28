import { AuditableEntity } from './auditable_entity'
import { Column, DeleteDateColumn, BeforeSoftRemove } from 'typeorm'
import { context } from '@/utils/context'

export abstract class SoftDeletableAuditableEntity extends AuditableEntity {
  @DeleteDateColumn()
  deleted_at?: Date

  @Column()
  deleted_by_id?: number

  @BeforeSoftRemove()
  auditDeleter() {
    if (context.userId) {
      this.deleted_by_id = context.userId
    }
  }

  toJSON() {
    const baseJson = super.toJSON()
    const { deleted_by, deleted_by_id, deleted_at, ...rest } = baseJson
    return rest
  }
}
