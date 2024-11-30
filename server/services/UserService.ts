import UserModel from "../models/UserModel";
import User from "../interfaces/User";

export default class UserService {

  constructor() { }

  async getAllUsers(limit = 100) {
    return await UserModel.findAll({ limit });
  }

  async getUserById(userId: string) {
    return await UserModel.findByPk(userId);
  }

  async getUserByEmail(email: string) {
    return await UserModel.findOne({
      where: {
        "email": email
      }
    });
  }

  async createUser(userDetails: User) {
    return await UserModel.create({
      first_name: userDetails.first_name,
      last_name: userDetails.last_name,
      email: userDetails.email
    })
  }

  async updateUserById(id: string, userDetails: User) {
    const user = await UserModel.findByPk(id);

    if (user === null) {
      throw new Error(`No user found with the id ${id}`);
    }

    if (userDetails.first_name) user.set("first_name", userDetails.first_name);
    if (userDetails.last_name) user.set("last_name", userDetails.last_name);
    if (userDetails.email) user.set("email", userDetails.email);
    return await user.save();
  }

  async deleteUserById(id: string) {
    const user = await UserModel.findByPk(id);

    if (user === null) {
      throw new Error(`No user found with the email id ${id}`);
    }

    if (user.isSoftDeleted()) {
      throw new Error(`User has already been deleted on date ${user.get("deletedAt")}`);
    }

    await user.destroy();
  }
  
  async createBulk(users: User[]) {
    const records = users.map((user) => ({first_name: user.first_name, last_name: user.last_name, email: user.email}));
    const createdRecords= await UserModel.bulkCreate(records);
    return createdRecords;
  }
}