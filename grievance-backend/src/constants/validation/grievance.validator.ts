import { body } from 'express-validator';

export const createGrievanceValidator = [
  body('subject').notEmpty().trim().isLength({ min: 5, max: 100 }),
  body('description').notEmpty().trim().isLength({ min: 20, max: 1000 }),
  body('issue_type').notEmpty().trim(), // Allow any issue type from frontend
  body('campus').notEmpty().trim(),
  body('attachment').optional()
];