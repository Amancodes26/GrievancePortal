import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes/index';
import { errorHandler } from './utils/errorHandler';


export const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api', apiRoutes);


app.use(errorHandler);
// Test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({ message: 'Test endpoint is working!' });
});
// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});
export default app;
