import UserModel from "../models/UserModel";
import dummyDataJson from './data.json';
import UserService from "../services/UserService";
import CategoryModel from "../models/CategoryModel";
import CategoryService from "../services/CategoryService";
import TransactionService from "../services/TransactionService";
import TransactionModel from "../models/TransactionModel";
import BudgetModel from "../models/BudgetModel";
import BudgetService from "../services/BudgetService";

const TEST_SUPABASE_UID = "381c3a3b-7e8f-45cd-af23-98b7a1fe8727";

export async function allSeeder() {
  await seedUsers();
  await seedCategories();
  await seedTransactions();
  await seedBudgets();
}

export async function seedUsers() {
  try {
    const singleUser = await UserModel.findOne();

    if (singleUser) {
      return;
    }

    const usersWithTestUid = dummyDataJson.users.map((user, index) => (
      index === 0 ? { ...user, supabase_id: TEST_SUPABASE_UID } : user
    ));

    await new UserService().createBulk(usersWithTestUid)
    console.log("<-------- dummy users created successfully -------->");
  } catch (error) {
    console.info('<-------- seeder failed for users --------> : ', error);
  }
}

export async function seedCategories() {
  try {
    const singleCategory = await CategoryModel.findOne();

    if (singleCategory) {
      return;
    }

    // @ts-ignore
    await new CategoryService().createBulk(dummyDataJson.category)
    console.log("<-------- dummy categories created successfully -------->");
  } catch (error) {
    console.info('<-------- seeder failed for categories --------> : ', error);
  }
}

export async function seedTransactions() {
  try {
    const singleTransaction = await TransactionModel.findOne();

    if (singleTransaction) {
      return;
    }

    // @ts-ignore
    await new TransactionService().createBulk(dummyDataJson.transactions)
    console.log("<-------- dummy transactions created successfully -------->");
  } catch (error) {
    console.info('<-------- seeder failed for transactions --------> : ', error);
  }
}

export async function seedBudgets() {
  try {
    const singleBudget = await BudgetModel.findOne();

    if (singleBudget) {
      return;
    }

    // @ts-ignore
    await new BudgetService().createBulk(dummyDataJson.budgets)
    console.log("<-------- dummy budgets created successfully -------->");
  } catch (error) {
    console.info('<-------- seeder failed for budgets --------> : ', error);
  }
}