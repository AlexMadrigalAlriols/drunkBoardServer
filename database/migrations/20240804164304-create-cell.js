'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('Cells', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      number: {
        type: Sequelize.INTEGER
      },
      board_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Boards',
          key: 'id'
        }
      },
      type: {
        type: Sequelize.STRING
      },
      event: {
        type: Sequelize.STRING
      },
      background: {
        type: Sequelize.STRING
      },
      text: {
        type: Sequelize.STRING
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Cellss');
  }
};
