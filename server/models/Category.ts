import { DataTypes } from "sequelize";
import { sequelize } from "../config/dbConnection";


const Category = sequelize.define('category', {
  id: {
    type: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM("income", "expense"),
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUIDV4,
    references: "user",
    onDelete: "CASCADE"
  }
}, {
  createdAt: true,
  updatedAt: true
})

export default Category;
