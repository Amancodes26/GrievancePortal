import { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getPool } from "../db";
import { AdminQueries } from "../db/queries";
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

    console.log("Authorization Header:", req.header("Authorization"));
    console.log("Received Token:", token);

    if (!token) {
      console.log("JWT Error: No token found in request.");
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
      console.error("JWT Verification Error:", err); // Log the full error
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

    console.log("Decoded JWT Payload:", decoded);

    if (!decoded) {
      console.log("JWT Error: Token could not be decoded.");
      res.status(403).json({
        message: "JWT_TOKEN_INVALID",
        status: 403,
        success: false,
      });
      return;
    }    // Find the admin associated with the token
    const result = await getPool().query(AdminQueries.GET_BY_EMAIL, [decoded.email]);

    // console.log("Admin email:", decoded.email);
    console.log("Database query result for admin:", result.rows);

    if (result.rows.length === 0) {
      console.log("JWT Error: Admin not found in database for email:", decoded.email);
      res.status(403).json({
        message: "JWT_TOKEN_INVALID_ADMIN_NOT_FOUND",
        status: 403,
        success: false,
      });
      return;
    }    const admin = result.rows[0];

    // Map database column names to expected property names
    const adminInfo = {
      AdminId: admin.adminid,
      Name: admin.name,
      Email: admin.email,
      Role: admin.role,
      CampusId: admin.campusid,
      Department: admin.department,
      IsActive: admin.isactive
    };

    // Exclude sensitive information (password)
    req.admin = {
      ...adminInfo,
      AdminID: adminInfo.AdminId  // Add the required AdminID field
    };
    
    console.log("Successfully authenticated admin:", adminInfo);
    
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
