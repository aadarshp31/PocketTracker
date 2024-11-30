import { DataTypes } from "sequelize";
import { sequelize } from "../config/dbConnection";


const Category = sequelize.define('category', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  timestamps: true,
  deletedAt: true,
  paranoid: true
})

export default Category;
