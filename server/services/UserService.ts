import UserModel from "../models/UserModel";
import User from "../interfaces/User";
import { Order } from "sequelize";

export default class UserService {

  constructor() { }

  async getAllUsers(options: { page?: number, limit?: number, order?: Order  } = { page: 1, limit: 10 }) {
    const count = await UserModel.count({
      where: {
        deletedAt: null
      }
    });

    options.page = options.page ? options.page : 1;
    options.limit = options.limit ? options.limit : 10;

    const totalPages = Math.ceil(count / options.limit);
    const offset = (options.page - 1) * options.limit;

    const users =  await UserModel.findAll({...options, offset: offset, where: { deletedAt: null }});

    return {
      users,
      meta: {
        page: options.page,
        limit: options.limit,
        totalPages: totalPages,
        totalCount: count
      }
    };
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
    const records = users.map((user) => ({id: user.id, first_name: user.first_name, last_name: user.last_name, email: user.email, createdAt: user.createdAt, updatedAt: user.updatedAt}));
    const createdRecords= await UserModel.bulkCreate(records);
    return createdRecords;
  }
}