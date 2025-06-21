import { Request, Response } from "express";

/**
 * Get admin profile - returns authenticated admin data
 */
export const getAdminProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    // req.admin is populated by verifyAdminJWT middleware
    if (!req.admin) {
      res.status(401).json({
        message: "Admin authentication required",
        status: 401,
        success: false,
      });
      return;
    }

    res.status(200).json({
      message: "Admin profile retrieved successfully",
      status: 200,
      success: true,
      data: req.admin
    });
  } catch (error: any) {
    console.error("Error getting admin profile:", error);
    res.status(500).json({
      message: "Internal server error",
      status: 500,
      success: false,
      error: error.message,
    });
  }
};

/**
 * Get admin dashboard - returns dashboard data for authenticated admin
 */
export const getAdminDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    // req.admin is populated by verifyAdminJWT middleware
    if (!req.admin) {
      res.status(401).json({
        message: "Admin authentication required",
        status: 401,
        success: false,
      });
      return;
    }

    // TODO: Add actual dashboard logic here
    // This could include statistics, recent activities, etc.
    const dashboardData = {
      adminInfo: req.admin,
      statistics: {
        totalUsers: 0, // TODO: implement actual count
        totalStudents: 0, // TODO: implement actual count
        recentLogins: [], // TODO: implement recent login tracking
      },
      recentActivities: [], // TODO: implement activity tracking
      systemStatus: {
        status: "operational",
        lastUpdated: new Date().toISOString(),
      }
    };

    res.status(200).json({
      message: "Admin dashboard accessed successfully",
      status: 200,
      success: true,
      data: dashboardData
    });
  } catch (error: any) {
    console.error("Error getting admin dashboard:", error);
    res.status(500).json({
      message: "Internal server error",
      status: 500,
      success: false,
      error: error.message,
    });
  }
};