import { Request, Response, NextFunction } from 'express';
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

export function validate(schema: object) {
  const validateFn = ajv.compile(schema);
  return (req: Request, res: Response, next: NextFunction): void => {
    const valid = validateFn(req.body);
    if (!valid) {
      res.status(400).json({
        message: 'Validation failed',
        errors: validateFn.errors
      });
      return;
    }
    next();
  };
}
