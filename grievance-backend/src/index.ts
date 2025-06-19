import app from './app';
import './db';
import {config} from 'dotenv';
config();

const PORT = process.env.PORT || 5000;



app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Try accessing the test endpoint at:  http://localhost:${PORT}/api/test`);
});