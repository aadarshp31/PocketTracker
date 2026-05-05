export default interface MfaRecoveryCode {
  id?: string;
  user_id: string;
  code_hash: string;
  used_at?: string | null;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}
