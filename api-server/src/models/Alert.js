const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Alert = sequelize.define('Alert', {
  _id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  transactionId: { type: DataTypes.STRING, allowNull: false },
  score: { type: DataTypes.FLOAT, allowNull: false },
  reasoning: { type: DataTypes.TEXT },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.ENUM('UNREAD', 'READ', 'DISMISSED'), defaultValue: 'UNREAD' }
}, {
  timestamps: false,
  indexes: [
    { fields: ['status'] },
    { fields: ['timestamp'] }
  ]
});

module.exports = Alert;
