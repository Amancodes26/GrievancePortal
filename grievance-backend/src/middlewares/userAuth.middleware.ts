import { Response, Request, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { DatabaseService } from "../services/database";
import { StudentInfo } from "../models/StudentInfo";

interface JWTPayload {
  rollNumber: string;
  name: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const verifyJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    }    // Find the user associated with the token
    const user = await DatabaseService.getStudentInfoByRollNo(decoded.rollNumber);
    
    if (!user) {
      res.status(403).json({
        message: "JWT_TOKEN_INVALID_USER_NOT_FOUND",
        status: 403,
        success: false,
      });
      return;
    }        // Set user data in the format expected by controllers
    req.user = {
      rollNumber: user.rollno,  // Map rollno to rollNumber
      rollno: user.rollno,      // Include original rollno field
      name: user.name,
      email: user.email,
      campusid: user.campusid,  // Include campusid field
      role: 'STUDENT'  // Default role, can be enhanced later
    };

    // Also set req.User for compatibility with grievance controller
    req.User = user;

    next();
  } catch (error: any) {
    console.error("Error verifying JWT:", error);
    res.status(403).json({
      message: "GENERAL_ERROR",
      status: 403,
      success: false,
      error: error.message,
    });
  }
};

