import { Request, Response, NextFunction } from 'express';

// Simple in-memory store for rate limiting
// In production, use Redis or similar for distributed systems
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
}

function createRateLimiter(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    
    // Get current rate limit data
    const current = rateLimitStore.get(key);
    
    if (!current || now > current.resetTime) {
      // First request or window expired
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      });
      return next();
    }
    
    if (current.count >= config.maxRequests) {
      // Rate limit exceeded
      res.status(429).json({
        message: config.message || 'Too many requests, please try again later',
        success: false,
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
      return;
    }
    
    // Increment count
    current.count++;
    rateLimitStore.set(key, current);
    next();
  };
}

// Rate limit configurations for different admin actions
export const adminActionRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute
  message: 'Too many admin actions, please slow down'
});

export const superAdminRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute (more restrictive)
  message: 'Too many super admin actions, please slow down'
});

export const adminLoginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later'
});

export const grievanceCreationRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 grievance creations per minute
  message: 'Too many grievance submissions, please slow down'
});

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); 