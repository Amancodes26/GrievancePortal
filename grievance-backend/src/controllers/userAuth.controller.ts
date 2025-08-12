import { Request, Response, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getPool } from "../db";
import { StudentInfoQueries } from "../db/queries";

// Check if roll number exists
const rollNumberExist: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { rollNumber } = req.params;

    const result = await getPool().query(StudentInfoQueries.GET_BY_ROLLNO, [rollNumber]);
    
    if (result.rows.length === 0) {
      res.status(400).json({ message: "User not found" });
      return;
    }

    const user = result.rows[0];
    console.log(user);

    if (!user.email) {
      res
        .status(400)
        .json({ message: "Email not found, Contact your campus incharge" });
      return;
    }

    // Create partial email
    const email = user.email;
    const [local, domain] = email.split("@");
    let partialEmail = email;

    if (local.length > 6) {
      partialEmail =
        local.substring(0, 2) +
        "*".repeat(local.length - 4) +
        local.substring(local.length - 2) +
        "@" +
        domain;
    }

    const isVerified = user.isverified;

    const data = {
      rollNumber: user.rollno,
      email: partialEmail,
      isVerified,
    };

    res.status(200).json(data);
  } catch (error) {
    console.error("Error checking roll number:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while checking roll number",
    });
  }
};

// Verify email matches for user (no OTP)
const verifyPartialEmail: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { rollNumber, email } = req.params;

    const result = await getPool().query(StudentInfoQueries.GET_BY_ROLLNO, [rollNumber]);
    
    if (result.rows.length === 0) {
      res.status(400).json({ message: "User not found" });
      return;
    }

    const user = result.rows[0];

    if (email !== user.email) {
      res.status(400).json({
        message: "Email does not match our records",
        verified: false,
      });
      return;
    }

    res.status(200).json({
      verified: true,
      message: "Email verified successfully. You can now set your password.",
    });
  } catch (error) {
    console.error("Error verifying partial email:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error while verifying email",
    });
  }
};

// Set password (simplified - no OTP verification needed)
const setPassword: RequestHandler = async (req :Request, res: Response) => {
  try {
    const { rollNumber, password } = req.body;

    if (!rollNumber || !password) {
      res.status(400).json({
        success: false,
        message: "rollNumber and password are required",
      });
      return;
    }

    const result = await getPool().query(StudentInfoQueries.GET_BY_ROLLNO, [rollNumber]);
    
    if (result.rows.length === 0) {
      res.status(400).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user with new password and set as verified
    await getPool().query(
      `UPDATE StudentInfo SET 
        Password = $1, 
        IsVerified = $2, 
        UpdatedAt = (NOW() AT TIME ZONE 'Asia/Kolkata')
      WHERE RollNo = $3 RETURNING *`,
      [hashedPassword, true, rollNumber]
    );

    res.status(200).json({
      success: true,
      message: "Password set successfully",
    });
  } catch (error) {
    console.error("Set password error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Login
const login: RequestHandler = async (req :Request, res :Response) => {
  try {
    const { rollNumber, password } = req.body;

    if (!rollNumber || !password) {
      res.status(400).json({
        success: false,
        message: "rollNumber and password are required",
      });
      return;
    }

    const result = await getPool().query(StudentInfoQueries.GET_BY_ROLLNO, [rollNumber]);
    
    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: "Invalid rollNumber or password",
      });
      return;
    }

    const user = result.rows[0];

    if (!user.password) {
      res.status(401).json({
        success: false,
        message: "Invalid rollNumber or password",
      });
      return;
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid rollNumber or password",
      });
      return;
    }

    // Create JWT
    const token = jwt.sign(
      {
        rollNumber: user.rollno,
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET || "supersecretkey",
      { expiresIn: "24h" }
    );

    const options = {
      httpOnly: false, // can be accessed by frontend too
      secure: false, // Set to true only in production (for HTTPS)
      sameSite: "none" as const, // Allows cross-origin cookie transmission (important for cross-origin requests)
    };

    res
      .status(200)
      .cookie("jwtToken", token, options) // Set JWT in cookie
      .json({
        success: true,
        token,
        user: {
          rollNumber: user.rollno,
          name: user.name,
          email: user.email,
        },
      });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export {
  rollNumberExist,
  verifyPartialEmail,
  login,
  setPassword,
};
