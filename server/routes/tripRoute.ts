import express from 'express';
import TripController from '../controllers/TripController';
import TripService from '../services/TripService';

const tripRoute = express.Router();
const tripController = new TripController(new TripService());

tripRoute.get('/:tripId/summary', tripController.getSummary.bind(tripController));
tripRoute.get('/:tripId', tripController.getOne.bind(tripController));
tripRoute.get('/', tripController.getAll.bind(tripController));
tripRoute.post('/', tripController.create.bind(tripController));
tripRoute.put('/:tripId', tripController.updateById.bind(tripController));
tripRoute.delete('/:tripId', tripController.deleteById.bind(tripController));

export default tripRoute;
