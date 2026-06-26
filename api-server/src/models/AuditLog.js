const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const AuditLog = sequelize.define('AuditLog', {
  _id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  action: { type: DataTypes.STRING, allowNull: false },
  transactionId: { type: DataTypes.STRING, allowNull: false },
  userId: { type: DataTypes.STRING, allowNull: false },
  details: { type: DataTypes.TEXT },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  timestamps: false,
  indexes: [
    { fields: ['transactionId'] },
    { fields: ['timestamp'] }
  ]
});

module.exports = AuditLog;
