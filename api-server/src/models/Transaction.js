const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Transaction = sequelize.define('Transaction', {
  _id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  lat: { type: DataTypes.FLOAT, allowNull: false },
  lon: { type: DataTypes.FLOAT, allowNull: false },
  distance_from_home: { type: DataTypes.FLOAT, allowNull: false },
  repeat_retailer: { type: DataTypes.FLOAT, allowNull: false },
  used_chip: { type: DataTypes.FLOAT, allowNull: false },
  used_pin_number: { type: DataTypes.FLOAT, allowNull: false },
  online_order: { type: DataTypes.FLOAT, allowNull: false },
  fraud_score: { type: DataTypes.FLOAT, defaultValue: -1 },
  status: { type: DataTypes.STRING, defaultValue: 'PENDING' },
  reasoning: { type: DataTypes.TEXT }
}, {
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['userId'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = Transaction;
