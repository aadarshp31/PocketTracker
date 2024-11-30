import UserService from "../services/UserService";
import { NextFunction, Request, Response } from "express";

export default class UserController {
  private userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  async getAllUsers(req: Request, res: Response) {
    try {
      const users = await this.userService.getAllUsers();
      res.json({
        users: users
      });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      })
    }
  }

  async getUser(req: Request, res: Response) {
    try {
      // @ts-ignore
      if (!req.user) {
        res.status(204);
        return;
      }
      
      const user = {
        // @ts-ignore
        first_name: req.user.first_name,
        // @ts-ignore
        last_name: req.user.last_name,
        // @ts-ignore
        email: req.user.email
      }

      res.json({
        users: [user]
      });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction, userId: string) {
    try {
      const user = await this.userService.getUserById(userId);
      // @ts-ignore
      req.user = user;
      next();
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async updateUserById(req: Request, res: Response) {
    try {
      // @ts-ignore
      const user = req.user;

      if (!user) {
        throw new Error(`No user found with the id ${req.params.id}`);
      }

      const updatedUser = await this.userService.updateUserById(user.id, req.body);

      res.json({
        message: "user updated successfully",
        users: [updatedUser]
      });

    } catch (error) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async deleteById(req: Request, res: Response) {
    try {
      // @ts-ignore
      const user = req.user;

      if (!user) {
        throw new Error(`No user found with the id ${req.params.id}`);
      }

      await this.userService.deleteUserById(user.id);

      res.json({
        message: "user deleted successfully",
      });

    } catch (error) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const userDetails = req.body;
      const createdUser = await this.userService.createUser({
        first_name: userDetails.first_name,
        last_name: userDetails.last_name,
        email: userDetails.email
      })
      res.status(201).json({
        users: createdUser
      });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      })
    }
  }

  async createBulk(req: Request, res: Response) {
    try {
      await this.userService.createBulk(req.body);

      res.json({
        message: "bulk users created successfully",
      });

    } catch (error) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }
}