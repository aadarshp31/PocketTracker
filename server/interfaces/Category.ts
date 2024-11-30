export default interface Category {
  id?: string;
  name: string;
  type: string;
  user_id?: string | null;
  is_default: boolean;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly deletedAt?: string;
}
