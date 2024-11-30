import UserModel from "../models/UserModel";
import dummyDataJson from './data.json';
import UserService from "../services/UserService";
import CategoryModel from "../models/CategoryModel";
import CategoryService from "../services/CategoryService";

export async function allSeeder() {
  await seedUsers();
  await seedCategories();
}

export async function seedUsers() {
  try {
    const singleUser = await UserModel.findOne();

    if (singleUser) {
      return;
    }

    await new UserService().createBulk(dummyDataJson.users)
    console.log("dummy users created successfully");
  } catch (error) {
    console.info('seeder failed for users: ', error);
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
    console.log("dummy categories created successfully");
  } catch (error) {
    console.info('seeder failed for categories: ', error);
  }
}