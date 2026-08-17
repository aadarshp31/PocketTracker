import express from 'express';
import CategoryKeywordController from '../controllers/CategoryKeywordController';
import CategoryKeywordService from '../services/CategoryKeywordService';

const categoryKeywordRoute = express.Router();
const categoryKeywordController = new CategoryKeywordController(new CategoryKeywordService());

categoryKeywordRoute.get('/', categoryKeywordController.getAll.bind(categoryKeywordController));
categoryKeywordRoute.post('/', categoryKeywordController.addKeyword.bind(categoryKeywordController));
categoryKeywordRoute.delete('/:mappingId/keywords/:keyword', categoryKeywordController.removeKeyword.bind(categoryKeywordController));

export default categoryKeywordRoute;
