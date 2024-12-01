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
    type: DataTypes.ENUM("income", "expense"),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
  },
  date: {
    type: DataTypes.DATE,
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
  }
}, {
  timestamps: true
});

export default TransactionModel;