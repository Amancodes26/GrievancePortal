import { Request, Response, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db";
import { DatabaseService } from "../services/database";
import { AdminOTPQueries } from "../db/queries";
import { OTPService } from "../services/otpService";
import {
  OTP_EXPIRY_MINUTES,
  OTP_MAX_ATTEMPTS
} from "../constants/otpConstants";
import { getCurrentISTTime, getTimeDifferenceInMinutes } from "../utils/timeUtils";

// Simple admin login for testing (bypasses OTP)
export const simpleAdminLogin: RequestHandler = async (req, res) => {
  const { email, password } = req.body;
  console.log("Simple admin login attempt:", { email, password });
  
  if (!email || !password) {
    res.status(400).json({ success: false, message: "Email and password are required" });
    return;
  }
  
  try {
    const result = await pool.query(AdminOTPQueries.FIND_BY_ADMIN_EMAIL, [email]);
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
    
    console.log(admin.email, "logged in successfully via simple login");
    
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
    console.error("Simple admin login error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Admin login: check credentials, send OTP
export const adminLogin: RequestHandler = async (req, res) => {
  const { email, password } = req.body;
  console.log("Admin login attempt:", { email, password });  if (!email || !password) {
    res.status(400).json({ success: false, message: "Email and password are required" });
    return;
  }
  try {
    const result = await pool.query(AdminOTPQueries.FIND_BY_ADMIN_EMAIL, [email]);
    if (result.rows.length === 0) {
      res.status(401).json({ success: false, message: "Invalid email or password" });
      return;
    }
    const admin = result.rows[0];
    console.log(admin);
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid password or password" });
      return;
    }    // Use OTP service for admin OTP handling
    const adminid = admin.adminid;
    const userName = admin.name || "Admin";
    
    const otpResult = await OTPService.handleAdminOTPRequest(adminid, email, userName);
    
    if (otpResult.success) {
      res.status(200).json({ 
        success: true, 
        message: otpResult.message 
      });
    } else {
      res.status(429).json({ 
        success: false, 
        message: otpResult.message 
      });
    }
  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ success: false, message: "Internal server error while sending admin OTP" });
  }
};

// Verify admin OTP: if valid, return JWT
export const verifyAdminOtp: RequestHandler = async (req, res) => {
  const { otp, email } = req.body;
  if (!otp || !email) {
    res.status(400).json({ success: false, message: "OTP and email are required" });
    return;
  }
  try {    // Find admin by email
    const result = await pool.query(AdminOTPQueries.FIND_BY_ADMIN_EMAIL, [email]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Admin not found" });
      return;
    }
    const admin = result.rows[0];
    const adminid = admin.adminid;
    // Get latest OTP for this admin
    const storedOTP = await DatabaseService.findLatestAdminOTP(adminid, email);
    if (!storedOTP) {
      res.status(400).json({ success: false, message: "No OTP requested. Please login again." });
      return;
    }
    // Check if OTP is null (expired)
    if (storedOTP.otp === null) {
      res.status(400).json({ success: false, message: "OTP expired. Please login again." });
      return;
    }
    // Check expiry
    const currentTime = getCurrentISTTime();
    const otpCreatedAt = new Date(storedOTP.createdat!);
    const timeDifferenceMinutes = getTimeDifferenceInMinutes(otpCreatedAt, currentTime);
    if (timeDifferenceMinutes > OTP_EXPIRY_MINUTES) {
      await DatabaseService.expireAdminOTP(adminid, email);
      res.status(400).json({ success: false, message: "OTP expired. Please login again." });
      return;
    }
    // Check value
    if (storedOTP.otp !== parseInt(otp)) {
      // Decrement attempt
      let attempt = (storedOTP.attempt ?? OTP_MAX_ATTEMPTS) - 1;
      if (attempt <= 0) {
        // Freeze
        await DatabaseService.updateAdminOTPAttempt(adminid, email, 0, currentTime, null);
        res.status(429).json({ success: false, message: "Too many attempts. Please login again after 1 hour." });
        return;
      } else {
        await DatabaseService.updateAdminOTPAttempt(adminid, email, attempt, currentTime, storedOTP.otp);
        res.status(400).json({ success: false, message: `Invalid OTP. Remaining attempts: ${attempt}` });
        return;
      }
    }
    // OTP is valid, expire it
    await DatabaseService.expireAdminOTP(adminid, email);
    const token = jwt.sign(
      { adminId: admin.adminid, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || "supersecretkey",
      { expiresIn: "2h" }
    );
    console.log(admin.email, "logged in successfully"); 
    res.status(200).json({ success: true, token });
  } catch (err) {
    console.error("Admin OTP verify error:", err);
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
    const result = await pool.query(AdminOTPQueries.FIND_BY_ADMIN_EMAIL, [email]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Admin not found" });
      return;
    }    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await pool.query(AdminOTPQueries.UPDATE_ADMIN_PASSWORD, [hashedPassword, email]);
    res.status(200).json({ success: true, message: "Password updated successfully" });
    return;
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error" });
    return;
  }
};

// Resend admin OTP
export const resendAdminOtp: RequestHandler = async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    res.status(400).json({ success: false, message: "Email is required" });
    return;
  }

  try {
    // Find admin by email
    const result = await pool.query(AdminOTPQueries.FIND_BY_ADMIN_EMAIL, [email]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: "Admin not found" });
      return;
    }

    const admin = result.rows[0];
    const adminid = admin.adminid;
    const userName = admin.name || "Admin";
    
    // Use OTP service for admin OTP resend
    const otpResult = await OTPService.resendAdminOtp(adminid, email, userName);
    
    if (otpResult.success) {
      res.status(200).json({ 
        success: true, 
        message: otpResult.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: otpResult.message 
      });
    }
  } catch (err) {
    console.error("Admin OTP resend error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
