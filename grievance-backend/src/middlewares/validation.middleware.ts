import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateGrievance = [
  body('subject')
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  
  body('issue_type')
    .notEmpty()
    .withMessage('Issue type is required')
    .isIn(['ACADEMIC', 'FACILITY', 'TECHNICAL', 'ADMINISTRATIVE', 'OTHER'])
    .withMessage('Invalid issue type'),
  
  body('campus')
    .notEmpty()
    .withMessage('Campus is required'),
  
  body('attachment')
    .optional()
    .isString()
    .withMessage('Attachment must be a string'),
];

export const validateGrievanceUpdate = [
  body('status')
    .optional()
    .isIn(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'])
    .withMessage('Invalid status'),
  
  body('subject')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  
  body('description')
    .optional()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return;
  }
  
  next();
};
