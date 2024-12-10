export default interface Transaction {
  id?: string;
  amount: number;
  start_date?: string,
  end_date?: string,
  category_id?: string | null;
  user_id?: string | null;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}
