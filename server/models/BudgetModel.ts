import { DataTypes, DATE } from "sequelize";
import { sequelize } from "../config/dbConnection";

const BudgetModel = sequelize.define('budget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
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
  start_date: {
    type: DataTypes.DATE,
    defaultValue: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    // last date of current month
    defaultValue: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
    allowNull: false
  }
}, {
  timestamps: true
});

export default BudgetModel;