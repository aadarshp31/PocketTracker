import crypto from 'crypto';
import { Op } from 'sequelize';
import MfaRecoveryCodeModel from '../models/MfaRecoveryCodeModel';

const TOTAL_CODES = 10;
const CODE_BYTES = 8; // 64-bit entropy → 16 hex chars → formatted as xxxx-xxxx-xxxx-xxxx

function hashCode(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

function formatCode(hex: string): string {
  // hex is 16 chars; split into 4 groups of 4
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

function normalizeCode(input: string): string {
  return input.replace(/\s/g, '').toLowerCase();
}

export default class RecoveryCodeService {
  /**
   * Delete all existing codes for a user, generate TOTAL_CODES fresh ones,
   * persist their hashes, and return the plaintext codes (shown once only).
   */
  async generateCodes(userId: string): Promise<string[]> {
    // Remove previous codes atomically
    await MfaRecoveryCodeModel.destroy({ where: { user_id: userId } });

    const plaintextCodes: string[] = [];
    const records = [];

    for (let i = 0; i < TOTAL_CODES; i++) {
      const hex = crypto.randomBytes(CODE_BYTES).toString('hex');
      const plaintext = formatCode(hex);
      plaintextCodes.push(plaintext);
      records.push({ user_id: userId, code_hash: hashCode(normalizeCode(plaintext)) });
    }

    await MfaRecoveryCodeModel.bulkCreate(records);
    return plaintextCodes;
  }

  /**
   * Verify a recovery code. If valid and unused, mark it as used and return true.
   * Returns false for unknown or already-used codes.
   */
  async verifyAndUseCode(userId: string, code: string): Promise<boolean> {
    const hash = hashCode(normalizeCode(code));

    const record = await MfaRecoveryCodeModel.findOne({
      where: {
        user_id: userId,
        code_hash: hash,
        used_at: { [Op.is]: null },
      },
    });

    if (!record) {
      return false;
    }

    await record.update({ used_at: new Date() });
    return true;
  }

  /**
   * Return total and remaining (unused) code counts for a user.
   */
  async getStatus(userId: string): Promise<{ total: number; remaining: number }> {
    const total = await MfaRecoveryCodeModel.count({ where: { user_id: userId } });
    const used = await MfaRecoveryCodeModel.count({
      where: { user_id: userId, used_at: { [Op.not]: null } },
    });
    return { total, remaining: total - used };
  }
}
