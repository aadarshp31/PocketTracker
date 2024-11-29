import { DataTypes } from "sequelize";
import { sequelize } from "../config/dbConnection";


const User = sequelize.define('user', {
  id: {
    type: DataTypes.UUIDV4,
    primaryKey: true,
    autoIncrement: true
  },
  first_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  last_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: false,
    validate: {
      isEmail: {
        msg: "Email is not valid"
      }
    }
  }
}, {
  createdAt: true,
  updatedAt: true
});

export default User;