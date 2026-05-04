require('dotenv').config({ path: process.env.ENV_FILE_PATH || '.env' });
import express, { Request, Response } from 'express'
import { connectToRelationalDatabase } from './config/dbConnection';
import userRoute from './routes/userRoute';
import { allSeeder } from './seeder/seeder';
import categoryRoute from './routes/categoryRoute';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import transactionRoute from './routes/transactionRoute';
import cors from 'cors'
import Middlewares from './middlewares/Middlewares';
import budgetRoute from './routes/budgetRoute';
import authRoute from './routes/AuthRoutes';
import insightsRoute from './routes/insightsRoute';

const app = express();

// allow cors
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// logger middleware setup
const morganFormat = (process.env.MORGAN_ENV || 'combined') as string;
if (process.env.NODE_ENV === "development") {
  // log file stream setup
  const accessLogWriteStream = fs.createWriteStream(path.join(__dirname, "..", "logs", "access.log"), { flags: "a" });
  app.use(morgan(morganFormat, { stream: accessLogWriteStream }));
} else {
  app.use(morgan(morganFormat));
}

// middlewares setup
app.use(express.static('public'));
app.use(express.json());

// db connection
connectToRelationalDatabase().then(async () => {
  await allSeeder();
});

// base endpoint to check status
app.get('/api/', async (req: Request, res: Response) => {
  res.json({
    message: "api is live"
  });
});

// auth endpoints (no authentication required)
app.use('/api/auth', authRoute);

// Protected routes - apply JWT verification middleware
app.use('/api/users', Middlewares.verifyAuth, userRoute);
app.use('/api/categories', Middlewares.verifyAuth, categoryRoute);
app.use('/api/transactions', Middlewares.verifyAuth, transactionRoute);
app.use('/api/budgets', Middlewares.verifyAuth, budgetRoute);
app.use('/api/insights', Middlewares.verifyAuth, insightsRoute);

// middlewares for api error handling
app.use(Middlewares.notFound);
app.use(Middlewares.errorHandler);

// server init
app.listen(process.env.PORT, async () => {
  console.info(`server is running at port: ${process.env.PORT}`);
});