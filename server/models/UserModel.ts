import { DataTypes } from "sequelize";
import { sequelize } from "../config/dbConnection";

const UserModel = sequelize.define('user', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  supabase_id: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true,
    comment: "Links to Supabase auth user ID"
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
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: "INR",
    validate: {
      len: [3, 3]
    }
  }
}, {
  timestamps: true,
  deletedAt: true,
  paranoid: true
});

export default UserModel;