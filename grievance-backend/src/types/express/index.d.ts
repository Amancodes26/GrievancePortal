import { User } from '../user';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
// This file extends the Express Request interface to include a user property
// that contains user information. This allows us to access the user
// information in our route handlers and middleware.