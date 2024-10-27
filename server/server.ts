import express, { Request, Response } from 'express'
import authRoutes from './routes/authRoutes';
require('dotenv').config();
const app = express();

app.use(express.static('public'))

app.get('/api/', (req: Request, res: Response) => {
  res.json({
    message: "api is live"
  });
});


app.use("/api/auth", authRoutes);

app.listen(process.env.PORT, () => {
  console.info(`server is running at port: ${process.env.PORT}`);
});