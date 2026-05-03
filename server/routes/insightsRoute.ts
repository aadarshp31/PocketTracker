import express from "express";
import InsightsController from "../controllers/InsightsController";
import InsightsService from "../services/InsightsService";

const insightsRoute = express.Router();
const insightsController = new InsightsController(new InsightsService());

insightsRoute.get("/summary", insightsController.getSummary.bind(insightsController));
insightsRoute.get("/monthly-trend", insightsController.getMonthlyTrend.bind(insightsController));
insightsRoute.get("/categories", insightsController.getCategories.bind(insightsController));
insightsRoute.get("/daily-pattern", insightsController.getDailyPattern.bind(insightsController));
insightsRoute.get("/spikes", insightsController.getSpikes.bind(insightsController));
insightsRoute.get("/projection", insightsController.getProjection.bind(insightsController));

export default insightsRoute;
