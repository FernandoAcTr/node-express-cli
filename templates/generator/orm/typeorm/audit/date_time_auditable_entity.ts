import { decorate } from 'ts-mixer'
import { BaseEntity, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class DateTimeAuditableEntity extends BaseEntity {
  @decorate(CreateDateColumn())
  created_at: Date;

  @decorate(UpdateDateColumn())
  updated_at: Date;
}