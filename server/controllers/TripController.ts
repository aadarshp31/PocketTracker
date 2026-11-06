import { Request, Response } from "express";
import TripService from "../services/TripService";
import AuthService from "../services/AuthService";

export default class TripController {
  private tripService: TripService;
  private authService: AuthService;

  constructor(tripService: TripService) {
    this.tripService = tripService;
    this.authService = new AuthService();
  }

  private async getUserIdFromSupabaseId(supabaseId: string): Promise<string | null> {
    const user = await this.authService.getUserBySuperbaseId(supabaseId);
    return user ? (user.get("id") as string) : null;
  }

  async getAll(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const trips = await this.tripService.getAllTrips(userId);

      res.json({ trips });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async getOne(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const trip = await this.tripService.getTripById(req.params.tripId, userId);

      if (!trip) {
        res.status(404).json({
          message: 'Trip not found'
        });
        return;
      }

      res.json({ trips: [trip] });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async create(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const { name, start_date, end_date, budget, color, emoji } = req.body;

      if (!name || !start_date || !end_date) {
        res.status(400).json({
          message: 'name, start_date, and end_date are required'
        });
        return;
      }

      if (end_date < start_date) {
        res.status(400).json({
          message: 'end_date must be on or after start_date'
        });
        return;
      }

      const created = await this.tripService.createTrip({
        user_id: userId,
        name,
        start_date,
        end_date,
        budget: budget ?? null,
        color: color ?? null,
        emoji: emoji ?? null
      });

      res.status(201).json({ trips: [created] });
    } catch (error: any) {
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async updateById(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const { name, start_date, end_date, budget, color, emoji } = req.body;

      if (start_date && end_date && end_date < start_date) {
        res.status(400).json({
          message: 'end_date must be on or after start_date'
        });
        return;
      }

      const updated = await this.tripService.updateTripById(
        req.params.tripId,
        { name, start_date, end_date, budget, color, emoji },
        userId
      );

      res.json({
        message: "trip updated successfully",
        trips: [updated]
      });
    } catch (error: any) {
      if (error.message?.includes('No trip found')) {
        res.status(404).json({
          message: 'Trip not found'
        });
        return;
      }
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async deleteById(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      await this.tripService.deleteTripById(req.params.tripId, userId);

      res.json({
        message: "trip deleted successfully"
      });
    } catch (error: any) {
      if (error.message?.includes('No trip found')) {
        res.status(404).json({
          message: 'Trip not found'
        });
        return;
      }
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }

  async getSummary(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        res.status(401).json({
          message: 'User not authenticated'
        });
        return;
      }

      const userId = await this.getUserIdFromSupabaseId(req.user.id);
      if (!userId) {
        res.status(404).json({
          message: 'User profile not found in database'
        });
        return;
      }

      const summary = await this.tripService.getTripSummary(req.params.tripId, userId);

      res.json({ summary });
    } catch (error: any) {
      if (error.message?.includes('No trip found')) {
        res.status(404).json({
          message: 'Trip not found'
        });
        return;
      }
      res.status(400).json({
        message: "something went wrong"
      });
    }
  }
}
