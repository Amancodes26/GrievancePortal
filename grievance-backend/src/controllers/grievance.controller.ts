import { Request, Response, NextFunction } from 'express';
import * as grievanceService from '../services/grievance.service';
import { Grievance } from '../models/Grievance';

//create a new grievance
export const createGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract user info from JWT token (set by middleware)
    if (!req.User) {
      res.status(403).json({
        message: 'User not authenticated',
        success: false,
      });
      return;
    }
    const grievanceData: Grievance = req.body;
    const serviceData = {
      ...grievanceData,
      attachment: grievanceData.attachment ? String(grievanceData.attachment) : null
    };
    // Ensure required fields are present
    if (!serviceData.subject || !serviceData.description || !serviceData.attachment || !req.User.rollno || !serviceData.issue_type) {
      res.status(400).json({
        message: 'Subject, description, attachment, roll number, and issue type are required',
        success: false,
      });
      return;
    }
    // Generate unique issue ID
    const issueId = `ISSUE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    serviceData.issue_id = issueId;

       
    const newGrievance = await grievanceService.createGrievance(serviceData);
    res.status(201).json({
      message: 'Grievance created successfully',
      data: newGrievance,
      success: true,
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error creating grievance',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

//get grievance by id
export const getGrievanceById = async (req: Request, res: Response, next: NextFunction) => {
  try{
    const {id } = req.params;
    if (!id) {
      res.status(400).json({
        message: 'Grievance ID is required',
        success: false,
      });
      return;
    }
    const grievance = await grievanceService.getGrievanceById(id);
    if (!grievance) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }
    res.status(200).json({
      message: 'Grievance retrieved successfully',
      data: grievance,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving grievance',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};
//get all grievances
export const getAllGrievances = async (req: Request, res: Response): Promise<void> => {
  try {
    const grievances = await grievanceService.getAllGrievances();
    res.status(200).json({
      message: 'Grievances retrieved successfully',
      data: grievances,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving grievances',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};
// Get user's own grievances
export const getMyGrievances = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.User) {
      res.status(403).json({
        message: 'User not authenticated',
        success: false,
      });
      return;
    }
    const userRollNo = req.User.rollno;
    const grievances = await grievanceService.getGrievancesByRollNo(userRollNo);
    res.status(200).json({
      message: 'Grievances retrieved successfully',
      data: grievances,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving grievances',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

//update grievance status will implement later
export const updateGrievanceStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      res.status(400).json({
        message: 'Grievance ID and status are required',
        success: false,
      });
      return;
    }

    const updatedGrievance = await grievanceService.updateGrievance(id, status);
    
    if (!updatedGrievance) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    res.status(200).json({
      message: 'Grievance status updated successfully',
      data: updatedGrievance,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error updating grievance status',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
}
//delete grievance
export const deleteGrievance = async (req: Request, res: Response): Promise<void
> => {
  try {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({
        message: 'Grievance ID is required',
        success: false,
      });
      return;
    }

    const deletedGrievance = await grievanceService.deleteGrievance(id);
    
    if (!deletedGrievance) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    res.status(200).json({
      message: 'Grievance deleted successfully',
      data: deletedGrievance,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error deleting grievance',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};
// src/controllers/grievance.controller.ts
// This controller handles all grievance-related operations such as creating, retrieving, updating, and deleting grievances
// Export all functions for use in routes
export default {
  createGrievance,
  getGrievanceById,
  getAllGrievances,
  getMyGrievances,
  updateGrievanceStatus,
  deleteGrievance
};
