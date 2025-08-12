import { Request, Response, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPool } from "../db";
import { AdminQueries } from "../db/queries";

// Admin login with email and password (no OTP)
export const adminLogin: RequestHandler = async (req, res) => {
  const { email, password } = req.body;
  console.log("Admin login attempt:", { email, password });
  
  if (!email || !password) {
    res.status(400).json({ success: false, message: "Email and password are required" });
    return;
  }
  
  try {
    const result = await getPool().query(AdminQueries.GET_BY_EMAIL, [email]);
    if (result.rows.length === 0) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }
    
    const admin = result.rows[0];
    console.log("Found admin:", admin);
    
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }
    
    // Generate JWT token directly (no OTP required)
    const token = jwt.sign(
      { 
        adminId: admin.adminid, 
        email: admin.email, 
        role: admin.role,
        name: admin.name,
        campusId: admin.campusid
      },
      process.env.JWT_SECRET || "supersecretkey",
      { expiresIn: "24h" }
    );
    
    console.log(admin.email, "logged in successfully");
    
    res.status(200).json({ 
      success: true, 
      message: "Login successful",
      token,
      admin: {
        id: admin.adminid,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        campusId: admin.campusid
      }
    });
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Admin set/change password (DB)
export const setAdminPassword: RequestHandler = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    res.status(400).json({ success: false, message: "Email and new password are required" });
    return;
  }  try {
    const result = await getPool().query(AdminQueries.GET_BY_EMAIL, [email]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Admin not found" });
      return;
    }    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await getPool().query(AdminQueries.UPDATE_PASSWORD, [hashedPassword, email]);
    res.status(200).json({ success: true, message: "Password updated successfully" });
    return;
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
    return;
  }
};
