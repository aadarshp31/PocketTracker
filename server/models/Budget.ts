import { DataTypes } from "sequelize";
import { sequelize } from "../config/dbConnection";

const Budget = sequelize.define('budget', {
  id: {
    type: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(2),
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
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  createdAt: true,
  updatedAt: true
});

export default Budget;