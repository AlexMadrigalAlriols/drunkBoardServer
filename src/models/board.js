'use strict';
const {
  Model
} = require('sequelize');
const cell = require('./cell');
const user = require('./user');
module.exports = (sequelize, DataTypes) => {
  class Board extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Board.hasMany(models.Cell, { as: 'cells', foreignKey: 'board_id' });
      Board.belongsTo(models.User);
    }
  }
  Board.init({
    name: DataTypes.STRING,
    cover: DataTypes.STRING,
    user_id: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Board',
    underscored: true
  });
  return Board;
};