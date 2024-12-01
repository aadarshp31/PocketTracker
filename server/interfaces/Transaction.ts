export default interface Transaction {
  id?: string;
  amount: number;
  type: string;
  description: string;
  date?: string,
  category_id?: string | null;
  user_id?: string | null;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}
