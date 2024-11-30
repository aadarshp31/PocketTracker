import { DataTypes } from "sequelize";
import { sequelize } from "../config/dbConnection";


const Transaction = sequelize.define('transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  amount: {
    type: DataTypes.DECIMAL(2),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM("income", "expense"),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  category_id: {
    type: DataTypes.UUIDV4,
    references: "category",
    onDelete: "CASCADE"
  },
  user_id: {
    type: DataTypes.UUIDV4,
    references: "user",
    onDelete: "CASCADE"
  }
}, {
  timestamps: true,
  deletedAt: true,
  paranoid: true
});

export default Transaction;