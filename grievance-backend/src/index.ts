import app from './app';
import {config} from 'dotenv';
config();

console.log('Loading environment configuration...');

const PORT = process.env.PORT || 5000;

console.log('Starting server...');

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Try accessing the test endpoint at:  http://localhost:${PORT}/api/test`);
});

console.log('Initializing database connection...');
import './db';