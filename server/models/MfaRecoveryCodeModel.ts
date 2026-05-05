import { DataTypes } from 'sequelize';
import { sequelize } from '../config/dbConnection';

const MfaRecoveryCodeModel = sequelize.define('mfa_recovery_code', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'References users.id (application user, not supabase_id)',
  },
  code_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'SHA-256 hex digest of the plaintext recovery code',
  },
  used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['user_id', 'used_at'],
    },
  ],
});

export default MfaRecoveryCodeModel;
