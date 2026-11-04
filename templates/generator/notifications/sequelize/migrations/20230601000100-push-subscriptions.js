'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('push_subscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      endpoint: {
        type: Sequelize.STRING(500),
        allowNull: false,
        unique: true,
      },
      p256dh: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      auth: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('now'),
      },
    })

    await queryInterface.addIndex('push_subscriptions', ['user_id'], {
      name: 'push_subscriptions_user',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('push_subscriptions')
  },
}
