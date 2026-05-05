import express from 'express';
import Middlewares from '../middlewares/Middlewares';
import RecoveryCodeController from '../controllers/RecoveryCodeController';

const recoveryCodeRoute = express.Router();
const controller = new RecoveryCodeController();

// Generate / view recovery codes — requires full MFA session (aal2)
recoveryCodeRoute.post('/generate', Middlewares.verifyAuth, controller.generateCodes.bind(controller));
recoveryCodeRoute.get('/status', Middlewares.verifyAuth, controller.getStatus.bind(controller));

// Use a recovery code to regain access — only requires password session (aal1)
recoveryCodeRoute.post('/use', Middlewares.verifyAal1Auth, controller.useCode.bind(controller));

export default recoveryCodeRoute;
