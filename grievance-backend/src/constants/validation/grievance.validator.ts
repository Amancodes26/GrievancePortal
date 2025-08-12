import { body, param, query } from 'express-validator';
import { ADMIN_STATUS, STUDENT_STATUS, ADMIN_ROLES, DEPARTMENTS } from '../grievanceConstants';

// Grievance creation validation (aligned with Grievance model)
export const createGrievanceValidator = [
  body('issueCode')
    .isInt({ min: 1 })
    .withMessage('Issue code must be a valid positive integer'),
  body('subject')
    .notEmpty()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  body('description')
    .notEmpty()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  body('hasAttachments')
    .optional()
    .isBoolean()
    .withMessage('hasAttachments must be a boolean value')
];

// Tracking/Response creation validation (aligned with Tracking model)
export const createTrackingResponseValidator = [
  body('responseText')
    .notEmpty()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Response text must be between 10 and 1000 characters'),
  body('adminStatus')
    .isIn(ADMIN_STATUS)
    .withMessage(`Admin status must be one of: ${ADMIN_STATUS.join(', ')}`),
  body('studentStatus')
    .isIn(STUDENT_STATUS)
    .withMessage(`Student status must be one of: ${STUDENT_STATUS.join(', ')}`),
  body('redirectTo')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Redirect target must be specified if redirecting'),
  body('isRedirect')
    .optional()
    .isBoolean()
    .withMessage('isRedirect must be a boolean value'),
  body('hasAttachments')
    .optional()
    .isBoolean()
    .withMessage('hasAttachments must be a boolean value')
];

// Admin creation validation (aligned with AdminInfo model)
export const createAdminValidator = [
  body('name')
    .notEmpty()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Valid Indian mobile number is required'),
  body('role')
    .isIn(ADMIN_ROLES)
    .withMessage(`Role must be one of: ${ADMIN_ROLES.join(', ')}`),
  body('department')
    .isIn(DEPARTMENTS)
    .withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`),
  body('campusId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Campus ID must be a valid positive integer'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character')
];

// Admin update validation
export const updateAdminValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Valid Indian mobile number is required'),
  body('role')
    .optional()
    .isIn(ADMIN_ROLES)
    .withMessage(`Role must be one of: ${ADMIN_ROLES.join(', ')}`),
  body('department')
    .optional()
    .isIn(DEPARTMENTS)
    .withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`),
  body('campusId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Campus ID must be a valid positive integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Parameter validation
export const grievanceIdValidator = [
  param('grievanceId')
    .notEmpty()
    .trim()
    .matches(/^ISSUE-\d{6}-\d{5}$/)
    .withMessage('Invalid grievance ID format')
];

export const adminIdValidator = [
  param('adminId')
    .notEmpty()
    .trim()
    .withMessage('Admin ID is required')
];

export const rollNoValidator = [
  param('rollno')
    .notEmpty()
    .trim()
    .withMessage('Roll number is required')
];

// Query parameter validation
export const paginationValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn([...ADMIN_STATUS, ...STUDENT_STATUS])
    .withMessage('Invalid status value'),
  query('department')
    .optional()
    .isIn(DEPARTMENTS)
    .withMessage(`Department must be one of: ${DEPARTMENTS.join(', ')}`)
];

// File upload validation
export const fileUploadValidator = [
  body('fileType')
    .optional()
    .isIn(['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 
           'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
    .withMessage('Invalid file type'),
  body('fileSize')
    .optional()
    .isInt({ max: 10 * 1024 * 1024 }) // 10MB
    .withMessage('File size cannot exceed 10MB')
];

// Authentication validation
export const loginValidator = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const studentLoginValidator = [
  body('rollno')
    .notEmpty()
    .trim()
    .withMessage('Roll number is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Export all validators
export const validators = {
  createGrievance: createGrievanceValidator,
  createTrackingResponse: createTrackingResponseValidator,
  createAdmin: createAdminValidator,
  updateAdmin: updateAdminValidator,
  grievanceId: grievanceIdValidator,
  adminId: adminIdValidator,
  rollNo: rollNoValidator,
  pagination: paginationValidator,
  fileUpload: fileUploadValidator,
  login: loginValidator,
  studentLogin: studentLoginValidator
};