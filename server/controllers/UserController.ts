import { Order } from "sequelize";
import UserService from "../services/UserService";
import { NextFunction, Request, Response } from "express";
import AuthService from "../services/AuthService";

export default class UserController {
  private userService: UserService;
  private authService: AuthService;

  constructor(userService: UserService) {
    this.userService = userService;
    this.authService = new AuthService();
  }

  private async resolveCurrentUser(req: Request) {
    if (!req.user?.id) {
      return null;
    }

    const existingUser = await this.authService.getUserBySuperbaseId(req.user.id);
    if (existingUser) {
      return existingUser;
    }

    if (req.user.email) {
      const userByEmail = await this.userService.getUserByEmail(req.user.email);
      if (userByEmail) {
        userByEmail.set("supabase_id", req.user.id);
        if (!userByEmail.get("currency")) {
          userByEmail.set("currency", "INR");
        }
        return await userByEmail.save();
      }
    }

    if (!req.user.email) {
      return null;
    }

    return await this.userService.createUser({
      supabase_id: req.user.id,
      first_name: req.user.first_name || "Pocket",
      last_name: req.user.last_name || "User",
      email: req.user.email,
      currency: "INR"
    });
  }

  async getAll(req: Request, res: Response) {
    try {

      const options: {limit?: number, page?: number, order?: Order} = {};
      
      if(req.query.limit) options.limit = parseInt((req.query.limit as string));
      if(req.query.page) options.page = parseInt((req.query.page as string));
      if (req.query.sort) options.order = [[req.query.sort as string, req.query.order ? req.query.order as string : "asc"]]

      const result = await this.userService.getAllUsers(options);

      if (!result.users || result.users.length === 0) {
        res.status(204).send();
        return;
      }

      const usersList = result.users.map(user => ({
        id: user.get("id"),
        first_name: user.get("first_name"),
        last_name: user.get("last_name"),
        email: user.get("email"),
        currency: user.get("currency")
      }));

      res.json({
        users: usersList,
        meta: result.meta
      });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      })
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      // @ts-ignore
      if (!req.user) {
        res.status(204).send();
        return;
      }

      const user = {
        // @ts-ignore
        first_name: req.user.first_name,
        // @ts-ignore
        last_name: req.user.last_name,
        // @ts-ignore
        email: req.user.email,
        // @ts-ignore
        currency: req.user.currency
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

  async getById(req: Request, res: Response, next: NextFunction, userId: string) {
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

  async updateById(req: Request, res: Response) {
    try {
      // @ts-ignore
      const user = req.user;

      if (!user) {
        throw new Error(`No user found with the id ${req.params.userId}`);
      }

      const updatedUser = await this.userService.updateUserById(user.id, req.body);

      res.json({
        message: "user updated successfully",
        users: [
            {
              id: updatedUser.get("id"),
              first_name: updatedUser.get("first_name"),
              last_name: updatedUser.get("last_name"),
              email: updatedUser.get("email"),
              currency: updatedUser.get("currency")
            }
        ]
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
        throw new Error(`No user found with the id ${req.params.userId}`);
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
        email: userDetails.email,
        currency: userDetails.currency
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

  async getMe(req: Request, res: Response) {
    try {
      const user = await this.resolveCurrentUser(req);

      if (!user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      res.json({
        users: [{
          id: user.get("id"),
          first_name: user.get("first_name"),
          last_name: user.get("last_name"),
          email: user.get("email"),
          currency: user.get("currency")
        }]
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "something went wrong" });
    }
  }

  async updateMe(req: Request, res: Response) {
    try {
      const user = await this.resolveCurrentUser(req);

      if (!user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      const updatedUser = await this.userService.updateUserById(user.get("id") as string, req.body);

      res.json({
        message: "user updated successfully",
        users: [{
          id: updatedUser.get("id"),
          first_name: updatedUser.get("first_name"),
          last_name: updatedUser.get("last_name"),
          email: updatedUser.get("email"),
          currency: updatedUser.get("currency")
        }]
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "something went wrong" });
    }
  }
}