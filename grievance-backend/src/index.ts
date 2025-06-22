import app from './app';
import {config} from 'dotenv';
config();

console.log('Loading environment configuration...');

const PORT = process.env.PORT || 5000;

// Initialize database connection
console.log('Initializing database connection...');
import './db';

// For local development
if (process.env.NODE_ENV !== 'production') {
  console.log('Starting server...');
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Try accessing the test endpoint at:  http://localhost:${PORT}/api/test`);
  });
}

// Export for Vercel serverless functions
export default app;