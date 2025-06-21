import { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";
import pool from "../db";
import { AdminOTPQueries } from "../db/queries";
// Type augmentation is handled automatically by the TypeScript compiler
// No need to import the type declaration file at runtime

interface JWTPayload {
  adminId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export const verifyAdminJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token =
    //   req.cookies?.jwtToken ||
      req.header("Authorization")?.replace("Bearer ", "") ||
      req.body?.jwtToken;

    if (!token) {
      res.status(403).json({
        message: "JWT_TOKEN_NOT_FOUND",
        status: 403,
        success: false,
      });
      return;
    }

    // Verify JWT token
    let decoded: JWTPayload | null = null;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "supersecretkey") as JWTPayload;
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        res.status(403).json({
          error: err,
          message: "JWT_TOKEN_EXPIRED",
          status: 403,
          success: false,
        });
        return;
      } else if (err.name === "JsonWebTokenError") {
        res.status(403).json({
          error: err,
          message: "JWT_TOKEN_INVALID",
          status: 403,
          success: false,
        });
        return;
      }
    }

    if (!decoded) {
      res.status(403).json({
        message: "JWT_TOKEN_INVALID",
        status: 403,
        success: false,
      });
      return;
    }    // Find the admin associated with the token
    const result = await pool.query(AdminOTPQueries.FIND_BY_ADMIN_EMAIL, [decoded.email]);

    // console.log("Admin email:", decoded.email);

    if (result.rows.length === 0) {
      res.status(403).json({
        message: "JWT_TOKEN_INVALID_ADMIN_NOT_FOUND",
        status: 403,
        success: false,
      });
      return;
    }

    const admin = result.rows[0];

    // Exclude sensitive information (password)
    const { password, ...adminWithoutPassword } = admin;
    req.admin = adminWithoutPassword;
    
    next();
  } catch (error: any) {
    console.error("Error verifying admin JWT:", error);
    res.status(403).json({
      message: "GENERAL_ERROR",
      status: 403,
      success: false,
      error: error.message,
    });
  }
};
