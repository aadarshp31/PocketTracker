import { DataTypes } from "sequelize";
import { sequelize } from "../config/dbConnection";


const TransactionModel = sequelize.define('transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM("income", "expense", "investment", "transfer"),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
  },
  date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },
  category_id: {
    type: DataTypes.UUID,
    references: {
      model: "categories",
      key: "id"
    },
    onDelete: "CASCADE",
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    references: {
      model: "users",
      key: "id"
    },
    onDelete: "CASCADE",
    allowNull: false
  },
  trip_id: {
    type: DataTypes.UUID,
    references: {
      model: 'trips',
      key: 'id'
    },
    onDelete: 'SET NULL',
    allowNull: true
  },
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['user_id', 'date'],
      name: 'idx_transactions_user_date'
    },
    {
      fields: ['user_id', 'category_id', 'date'],
      name: 'idx_transactions_user_category_date'
    },
    {
      fields: ['trip_id'],
      name: 'idx_transactions_trip_id'
    }
  ]
});

export default TransactionModel;