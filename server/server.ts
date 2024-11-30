require('dotenv').config();
import express, { Request, Response } from 'express'
import { connectToRelationalDatabase } from './config/dbConnection';
import userRoute from './routes/userRoute';
import { seeder } from './seeder/seeder';
const app = express();

app.use(express.static('public'));
app.use(express.json());

connectToRelationalDatabase().then(async () => {
  await seeder();
});

app.get('/api/', async (req: Request, res: Response) => {
  res.json({
    message: "api is live"
  });
});

app.use('/api/users', userRoute);

app.listen(process.env.PORT, async () => {
  console.info(`server is running at port: ${process.env.PORT}`);
});