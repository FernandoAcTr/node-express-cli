import { IFileSystemGenerator, IPostGenerator, IPreGenerator } from '../interfaces/generator.interface'
import { Context } from '../context'
import { DbType } from '../types'
import { OperationResult, createResult } from '../report'
import { WritePolicy } from '../services/project.service'
import { CliError } from '../errors'
import { generatePrismaClient } from './prisma'
import { validationTemplates } from './validation'

interface MigrationTemplate {
  from: string
  to: string
}

interface NotificationOrmTemplates {
  notificationEntity?: string
  pushEntity?: string
  notificationRepository: string
  pushRepository: string
  notificationMigration?: MigrationTemplate
  pushMigration?: MigrationTemplate
  notificationSchema?: MigrationTemplate
  pushSchema?: MigrationTemplate
}

/**
 * Única pieza que conoce las diferencias entre motores. El servicio, controller,
 * validadores, rutas, store y canales son comunes; cada ORM solo aporta sus
 * entidades, repositorios y migraciones.
 */
const NOTIFICATION_ORMS: Record<DbType, NotificationOrmTemplates> = {
  [DbType.TYPEORM]: {
    notificationEntity: 'generator/notifications/typeorm/entities/notification.entity.ts',
    pushEntity: 'generator/notifications/typeorm/entities/push_subscription.entity.ts',
    notificationRepository: 'generator/notifications/typeorm/notifications.repository.ts',
    pushRepository: 'generator/notifications/typeorm/push.repository.ts',
    notificationMigration: {
      from: 'generator/notifications/typeorm/migrations/1677600000000-notifications.ts',
      to: 'src/database/migrations/1677600000000-notifications.ts',
    },
    pushMigration: {
      from: 'generator/notifications/typeorm/migrations/1677600000100-push-subscriptions.ts',
      to: 'src/database/migrations/1677600000100-push-subscriptions.ts',
    },
  },
  [DbType.SEQUELIZE]: {
    notificationEntity: 'generator/notifications/sequelize/entities/notification.entity.ts',
    pushEntity: 'generator/notifications/sequelize/entities/push_subscription.entity.ts',
    notificationRepository: 'generator/notifications/sequelize/notifications.repository.ts',
    pushRepository: 'generator/notifications/sequelize/push.repository.ts',
    notificationMigration: {
      from: 'generator/notifications/sequelize/migrations/20230601000000-notifications.js',
      to: 'src/database/migrations/20230601000000-notifications.js',
    },
    pushMigration: {
      from: 'generator/notifications/sequelize/migrations/20230601000100-push-subscriptions.js',
      to: 'src/database/migrations/20230601000100-push-subscriptions.js',
    },
  },
  [DbType.MONGO]: {
    notificationEntity: 'generator/notifications/mongo/entities/notification.entity.ts',
    pushEntity: 'generator/notifications/mongo/entities/push_subscription.entity.ts',
    notificationRepository: 'generator/notifications/mongo/notifications.repository.ts',
    pushRepository: 'generator/notifications/mongo/push.repository.ts',
  },
  [DbType.PRISMA]: {
    notificationRepository: 'generator/notifications/prisma/notifications.repository.ts',
    pushRepository: 'generator/notifications/prisma/push.repository.ts',
    notificationSchema: {
      from: 'generator/notifications/prisma/schemas/notifications.prisma',
      to: 'src/database/prisma/schemas/notifications.prisma',
    },
    pushSchema: {
      from: 'generator/notifications/prisma/schemas/push_subscriptions.prisma',
      to: 'src/database/prisma/schemas/push_subscriptions.prisma',
    },
  },
}

export class NotificationsGenerator implements IPreGenerator, IFileSystemGenerator, IPostGenerator {
  /** True si un schema Prisma se creó o actualizó en esta ejecución. */
  private prismaFilesChanged = false

  constructor(private readonly ctx: Context) {}

  private get dbType(): DbType {
    return this.ctx.config.getConfig().orm as DbType
  }

  private get withPush(): boolean {
    return this.ctx.has('push')
  }

  private get withSocket(): boolean {
    return this.ctx.has('socket')
  }

  /** Proyectos antiguos pueden tener `src/socket.ts` sin el emisor estático. */
  private get useSocketChannel(): boolean {
    if (!this.withSocket) return false

    return this.ctx.project.exists('src/socket.ts') && this.ctx.project.read('src/socket.ts').includes('emitToUser')
  }

  async pre(): Promise<void> {
    const requirements = [
      { feature: 'orm' as const, hint: 'Run "node-express-cli install:orm" first.' },
      { feature: 'mailer' as const, hint: 'Run "node-express-cli install:mailer" first.' },
      { feature: 'auth' as const, hint: 'Run "node-express-cli install:auth" first.' },
    ]

    for (const requirement of requirements) {
      if (!this.ctx.has(requirement.feature)) {
        throw new CliError(`"install:notifications" requires: ${requirement.feature}`, {
          hint: requirement.hint,
        })
      }
    }

    const orm = this.ctx.config.getConfig().orm as DbType | undefined

    if (!orm) {
      throw new CliError('"install:notifications" requires: orm', {
        hint: 'Run "node-express-cli install:orm" first.',
      })
    }

    if (!NOTIFICATION_ORMS[orm]) {
      throw new CliError(`Notifications are not supported for the ORM "${orm}"`, {
        hint: 'Install notifications in a project created with one of the supported ORMs.',
      })
    }
  }

  async createDirectories(): Promise<void> {
    const config = this.ctx.config.getConfig()

    this.ctx.project.ensureDir('src/entities')
    this.ctx.project.ensureDir('src/modules/notifications')
    this.ctx.project.ensureDir('src/notifications/channels')

    if (config.fileBasedRouting) {
      this.ctx.project.ensureDir('src/routes/notifications')
    }

    if (this.dbType != DbType.MONGO) {
      this.ctx.project.ensureDir('src/database/migrations')
    }

    if (this.dbType == DbType.PRISMA) {
      this.ctx.project.ensureDir('src/database/prisma/schemas')
    }

    if (this.withPush) {
      this.ctx.project.ensureDir('src/modules/notifications/push')

      if (config.fileBasedRouting) {
        this.ctx.project.ensureDir('src/routes/notifications/push')
      }
    }
  }

  async copyFiles(): Promise<void> {
    const config = this.ctx.config.getConfig()
    const policy: WritePolicy = 'overwrite-if-unmodified'
    const project = this.ctx.project
    const templates = NOTIFICATION_ORMS[this.dbType]
    const validation = validationTemplates(config.validation)

    project.copy('src/modules/notifications/notifications.types.ts', 'generator/notifications/common/notifications.types.ts', policy)
    project.copy('src/modules/notifications/notifications.store.ts', 'generator/notifications/common/notifications.store.ts', policy)
    project.copy('src/modules/notifications/notifications.service.ts', 'generator/notifications/common/notifications.service.ts', policy)
    project.copy(
      'src/modules/notifications/notifications.controller.ts',
      'generator/notifications/common/notifications.controller.ts',
      policy
    )
    project.copy('src/modules/notifications/notifications.validator.ts', validation.notifications, policy)

    if (config.fileBasedRouting) {
      project.copyDir('src/routes/notifications', 'generator/notifications/common/filerouting', policy)
    } else {
      project.copy('src/modules/notifications/notifications.routes.ts', 'generator/notifications/common/notifications.routes.ts', policy)
    }

    project.copy('src/notifications/channels/database.channel.ts', 'generator/notifications/common/channels/database.channel.ts', policy)
    if (this.withSocket && !this.useSocketChannel) {
      this.ctx.logger.warn(
        'The installed src/socket.ts has no Socket.emitToUser; realtime notifications are disabled. Re-run install:socket --force or add the static emitter.'
      )
    }

    project.copy(
      'src/notifications/events.ts',
      this.useSocketChannel ? 'generator/notifications/common/events.socket.ts' : 'generator/notifications/common/events.noop.ts',
      policy
    )

    if (this.useSocketChannel) {
      project.copy('src/notifications/channels/socket.channel.ts', 'generator/notifications/common/channels/socket.channel.ts', policy)
    }

    if (templates.notificationEntity) {
      project.copy('src/entities/notification.entity.ts', templates.notificationEntity, policy)
    }

    project.copy('src/modules/notifications/notifications.repository.ts', templates.notificationRepository, policy)

    if (templates.notificationMigration) {
      project.copy(templates.notificationMigration.to, templates.notificationMigration.from, policy)
    }

    if (templates.notificationSchema) {
      this.copyPrismaSchema(templates.notificationSchema, policy)
    }

    if (this.withPush) {
      this.copyPushFiles(templates, validation.push, policy)
    }

    this.writeChannelsIndex()
  }

  async post(): Promise<OperationResult> {
    const result = createResult()

    if (this.dbType == DbType.PRISMA) {
      await generatePrismaClient(this.ctx, this.prismaFilesChanged || !this.ctx.has('notifications'))
    }

    const wiring = this.ctx.wiring.transaction((wiring) => {
      wiring.import("import './notifications/channels'", { key: './notifications/channels' })
    })

    this.merge(result, wiring)

    if (result.warnings.length > 0) {
      return result
    }

    this.ctx.logger.success('-------------------------------------------------------------------------------------------')
    this.ctx.logger.success('Notifications installed: Notifiable channels can now persist notifications')
    this.ctx.logger.success('HTTP endpoints are mounted under /api/notifications (or /notifications with file-based routing)')
    if (this.withPush) this.ctx.logger.success('Push subscriptions are stored per user; configure VAPID keys in .env')
    if (this.useSocketChannel) this.ctx.logger.success('Realtime notification:changed events are emitted to the user room')
    this.ctx.logger.success('Run the database migrations for your ORM before using the endpoints')
    this.ctx.logger.success('-------------------------------------------------------------------------------------------')

    return result
  }

  private copyPushFiles(templates: NotificationOrmTemplates, pushValidator: string, policy: WritePolicy): void {
    const config = this.ctx.config.getConfig()
    const project = this.ctx.project

    project.copy('src/modules/notifications/push/types/push.types.ts', 'generator/notifications/push/types/push.types.ts', policy)
    project.copy('src/modules/notifications/push/push.service.ts', 'generator/notifications/push/common/push.service.ts', policy)
    project.copy('src/modules/notifications/push/push.controller.ts', 'generator/notifications/push/common/push.controller.ts', policy)
    project.copy('src/modules/notifications/push/push.validator.ts', pushValidator, policy)

    if (config.fileBasedRouting) {
      project.copyDir('src/routes/notifications/push', 'generator/notifications/push/filerouting', policy)
    } else {
      project.copy('src/modules/notifications/push/push.routes.ts', 'generator/notifications/push/common/push.routes.ts', policy)
    }

    project.copy('src/notifications/channels/push.channel.ts', 'generator/notifications/common/channels/push.channel.ts', policy)

    if (templates.pushEntity) {
      project.copy('src/entities/push_subscription.entity.ts', templates.pushEntity, policy)
    }

    project.copy('src/modules/notifications/push/push.repository.ts', templates.pushRepository, policy)

    if (templates.pushMigration) {
      project.copy(templates.pushMigration.to, templates.pushMigration.from, policy)
    }

    if (templates.pushSchema) {
      this.copyPrismaSchema(templates.pushSchema, policy)
    }
  }

  private copyPrismaSchema(template: MigrationTemplate, policy: WritePolicy): void {
    const result = this.ctx.project.copy(template.to, template.from, policy)

    this.prismaFilesChanged = this.prismaFilesChanged || result.status !== 'skipped'
  }

  private writeChannelsIndex(): void {
    const lines = ["import './database.channel'"]

    if (this.withPush) lines.push("import './push.channel'")
    if (this.useSocketChannel) lines.push("import './socket.channel'")

    lines.push(
      "import { notificationStore } from '@/modules/notifications/notifications.store'",
      "import { registerNotificationStore } from '@/notifications/registry'",
      '',
      'registerNotificationStore(notificationStore)',
      ''
    )

    this.ctx.project.write('src/notifications/channels/index.ts', lines.join('\n'), 'overwrite-if-unmodified')
  }

  private merge(target: OperationResult, next: OperationResult): void {
    for (const file of next.changed) {
      if (!target.changed.includes(file)) {
        target.changed.push(file)
      }
    }

    for (const file of next.skipped) {
      if (!target.skipped.includes(file)) {
        target.skipped.push(file)
      }
    }

    for (const warning of next.warnings) {
      if (!target.warnings.includes(warning)) {
        target.warnings.push(warning)
        this.ctx.logger.warn(warning)
      }
    }
  }
}
