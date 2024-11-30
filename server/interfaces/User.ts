export default interface User {
  id?: string;
  first_name: string;
  last_name: string;
  email: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly deletedAt?: string;
}