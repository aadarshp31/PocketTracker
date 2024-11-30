import UserModel from "../models/UserModel";
import dummyDataJson from './data.json';
import UserService from "../services/UserService";

export async function seeder() {
  const singleUser = await UserModel.findOne();

  if (singleUser) {
    return;
  }

  new UserService().createBulk(dummyDataJson.users)
    .then(() => {
      console.log("dummy users created successfully");
    }).catch((error: any) => {
      console.info('seeder failed: ', error);
    });
}