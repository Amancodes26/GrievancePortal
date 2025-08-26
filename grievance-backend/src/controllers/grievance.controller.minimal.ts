import { Request, Response } from 'express';
import ConnectionManager from '../db/connectionManager';
import { GrievanceQueries, TrackingQueries } from '../db/queries';

/**
 * Working controller that actually saves data to the database
 */

// Test function to verify the endpoint is reachable
export const createGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('🎯 createGrievance called!');
    console.log('User:', req.user);
    console.log('Body:', req.body);
    
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const { subject, description, issueCode, campusId, hasAttachments } = req.body;

    // Validate required fields
    if (!subject || !description || !issueCode) {
      res.status(400).json({
        success: false,
        message: 'Subject, description, and issueCode are required',
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    // Generate unique grievance ID
    const grievanceId = `GRV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    
    console.log(`🔥 Inserting grievance into database: ${grievanceId}`);
    
    // Insert into database using the actual query
    const values = [
      grievanceId,                    // $1 - GrievanceId
      req.user.rollNumber,           // $2 - RollNo  
      campusId || 1,                 // $3 - CampusId (default to 1)
      issueCode,                     // $4 - IssueCode
      subject,                       // $5 - Subject
      description,                   // $6 - Description
      hasAttachments || false        // $7 - HasAttachments
    ];

    console.log('📝 SQL Values:', values);

    const result = await ConnectionManager.query(GrievanceQueries.CREATE, values);
    const savedGrievance = result.rows[0];
    
    console.log('✅ Grievance saved to database:', savedGrievance);

    // Get the first available admin ID for system tracking entry
    const adminResult = await ConnectionManager.query('SELECT AdminId FROM Admin LIMIT 1');
    const systemAdminId = adminResult.rows[0]?.adminid || 'ADMIN001';

    // Also create initial tracking entry
    const trackingValues = [
      grievanceId,
      'Grievance submitted successfully. Under review by admin.',
      'NEW',
      'SUBMITTED',
      systemAdminId, // Use real admin ID instead of 'SYSTEM'
      null, // RedirectTo
      null, // RedirectFrom  
      false, // IsRedirect
      hasAttachments || false
    ];

    await ConnectionManager.query(TrackingQueries.CREATE, trackingValues);
    console.log('✅ Initial tracking entry created with admin:', systemAdminId);

    res.status(201).json({
      success: true,
      message: 'Grievance created and saved to database successfully!',
      data: {
        id: savedGrievance.id,
        grievanceId: savedGrievance.grievanceid,
        rollno: savedGrievance.rollno,
        campusId: savedGrievance.campusid,
        issueCode: savedGrievance.issuecode,
        subject: savedGrievance.subject,
        description: savedGrievance.description,
        hasAttachments: savedGrievance.hasattachments,
        createdAt: savedGrievance.createdat
      }
    });
  } catch (error) {
    console.error('❌ Error in createGrievance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create grievance in database',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Minimal implementations for other functions  
export const getGrievanceById = async (req: Request, res: Response): Promise<void> => {
  res.json({ message: 'getGrievanceById - Not implemented yet' });
};

export const getGrievances = async (req: Request, res: Response): Promise<void> => {
  res.json({ message: 'getGrievances - Not implemented yet' });
};

export const updateGrievance = async (req: Request, res: Response): Promise<void> => {
  res.json({ message: 'updateGrievance - Not implemented yet' });
};

export const deleteGrievance = async (req: Request, res: Response): Promise<void> => {
  res.json({ message: 'deleteGrievance - Not implemented yet' });
};
