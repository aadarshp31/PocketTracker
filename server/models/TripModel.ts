import { DataTypes } from "sequelize";
import { sequelize } from "../config/dbConnection";

const TripModel = sequelize.define('trip', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: true
  },
  emoji: {
    type: DataTypes.STRING(10),
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['user_id', 'start_date', 'end_date'],
      name: 'idx_trips_user_dates'
    }
  ]
});

export default TripModel;
