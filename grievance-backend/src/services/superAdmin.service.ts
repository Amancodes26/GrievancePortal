import bcrypt from 'bcrypt';
import pool from '../db';

interface CreateAdminInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'academic' | 'exam' | 'campus';
}

export async function createAdmin({ name, email, phone, password, role }: CreateAdminInput) {
  // Check if email already exists
  const existing = await pool.query('SELECT * FROM Admin WHERE Email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new Error('Email already exists');
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Generate a unique AdminId
  const adminId = `${role.toUpperCase()}_${Date.now().toString().slice(-6)}`;
  
  const insert = await pool.query(
    `INSERT INTO Admin (AdminId, Name, Email, Password, Role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING AdminId, Name, Email, Role`,
    [
      adminId,
      name,
      email,
      hashedPassword,
      role,
    ]
  );
  
  return insert.rows[0];
}

// Dummy export to keep module status
export const dummy = true;
