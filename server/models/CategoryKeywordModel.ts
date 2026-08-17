import { DataTypes } from 'sequelize';
import { sequelize } from '../config/dbConnection';

const CategoryKeywordModel = sequelize.define('category_keyword', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'categories',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  keywords: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'category_id'],
    },
    {
      fields: ['user_id'],
    },
  ],
});

export default CategoryKeywordModel;
