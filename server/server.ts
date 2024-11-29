require('dotenv').config();
import express, { Request, Response } from 'express'
import { connectToRelationalDatabase, sequelize } from './config/dbConnection';
const app = express();

app.use(express.static('public'));

connectToRelationalDatabase();

app.get('/api/', async (req: Request, res: Response) => {
  res.json({
    message: "api is live"
  });
});


app.listen(process.env.PORT, () => {
  console.info(`server is running at port: ${process.env.PORT}`);
});