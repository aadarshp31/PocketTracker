require('dotenv').config();
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

const app = express();

// allow cors
app.use(cors({
  origin: "*",
  allowedHeaders: "*"
}));

// logger middleware setup
if (process.env.NODE_ENV === "development") {
  // log file stream setup
  const accessLogWriteStream = fs.createWriteStream(path.join(__dirname, "..", "logs", "access.log"), { flags: "a" });
  app.use(morgan((process.env.MORGAN_ENV as string), {
    stream: accessLogWriteStream
  }));
}

app.use(morgan((process.env.MORGAN_ENV as string)));

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

// data endpoints
app.use('/api/users', userRoute);
app.use('/api/categories', categoryRoute);
app.use('/api/transactions', transactionRoute);
app.use('/api/budgets', budgetRoute);

// middlewares for api error handling
app.use(Middlewares.notFound);
app.use(Middlewares.errorHandler);

// server init
app.listen(process.env.PORT, async () => {
  console.info(`server is running at port: ${process.env.PORT}`);
});