import UserModel from "../models/UserModel";
import dummyDataJson from './data.json';
import UserService from "../services/UserService";
import CategoryModel from "../models/CategoryModel";
import CategoryService from "../services/CategoryService";
import TransactionService from "../services/TransactionService";
import TransactionModel from "../models/TransactionModel";

export async function allSeeder() {
  await seedUsers();
  await seedCategories();
  await seedTransactions();
}

export async function seedUsers() {
  try {
    const singleUser = await UserModel.findOne();

    if (singleUser) {
      return;
    }

    await new UserService().createBulk(dummyDataJson.users)
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