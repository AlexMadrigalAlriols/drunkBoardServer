'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Cell extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Cell.belongsTo(models.Board);
    }
  }
  Cell.init({
    event: DataTypes.STRING,
    type: DataTypes.STRING,
    text: DataTypes.STRING,
    background: DataTypes.STRING,
    board_id: DataTypes.INTEGER,
    number: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Cell',
    underscored: true
  });
  return Cell;
};