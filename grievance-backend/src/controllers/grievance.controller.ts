/// <reference path="../types/express/index.d.ts" />
import { Request, Response, NextFunction } from 'express';
import * as grievanceService from '../services/grievance.service';
import { linkAttachmentToGrievance } from './grievanceCreateAttachment.controller';
import { validateTemporaryAttachments, linkMultipleAttachmentsToGrievance } from '../services/preGrievanceAttachment.service';
import { Grievance } from '../models/Grievance';
import { PersonalInfo } from '../models/PersonalInfo';

//create a new grievance
export const createGrievance = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract user info from JWT token (set by middleware)
    if (!req.user) {
      res.status(403).json({
        message: 'User not authenticated',
        success: false,
      });
      return;
    }    const grievanceData: Grievance = req.body;
    const { attachment_ids } = req.body; // Array of attachment IDs from pre-uploaded files
    
    const serviceData = {
      issue_id: '', // Will be set below
      rollno: req.user.rollNumber,
      campus: grievanceData.campus,
      subject: grievanceData.subject,
      description: grievanceData.description,
      issue_type: grievanceData.issue_type,
      status: 'PENDING',
      attachment: (attachment_ids && attachment_ids.length > 0) ? 'true' : 'false'
    };
    
    // Ensure required fields are present (attachment is now optional)
    if (!serviceData.subject || !serviceData.description || !req.user.rollNumber || !serviceData.issue_type) {
      res.status(400).json({
        message: 'Subject, description, roll number, and issue type are required',
        success: false,
      });
      return;
    }
      // Validate attachment_ids if provided
    if (attachment_ids && !Array.isArray(attachment_ids)) {
      res.status(400).json({
        message: 'attachment_ids must be an array of attachment IDs',
        success: false,
      });
      return;
    }

    // Validate temporary attachments if provided
    if (attachment_ids && attachment_ids.length > 0) {
      console.log('[GRIEVANCE_CREATE] Validating pre-uploaded attachments:', attachment_ids);
      
      const validationResult = await validateTemporaryAttachments(attachment_ids, req.user.rollNumber);
      
      if (!validationResult.valid) {
        res.status(400).json({
          message: `Invalid attachment IDs: ${validationResult.invalidIds.join(', ')}. These attachments either don't exist, don't belong to you, or are already linked to another grievance.`,
          success: false,
          invalidAttachmentIds: validationResult.invalidIds
        });
        return;
      }
    }

    // Generate unique issue ID
    const issueId = `ISSUE-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    serviceData.issue_id = issueId;

    // Create the grievance
    const newGrievance = await grievanceService.createGrievance(serviceData);
    
    // Link pre-uploaded attachments to the newly created grievance
    let attachmentLinkResult;
    if (attachment_ids && attachment_ids.length > 0) {
      console.log('[GRIEVANCE_CREATE] Linking attachments to grievance:', {
        grievanceId: newGrievance.id,
        attachmentIds: attachment_ids
      });
      
      attachmentLinkResult = await linkMultipleAttachmentsToGrievance(
        attachment_ids,
        newGrievance.id,
        req.user.rollNumber
      );
      
      if (!attachmentLinkResult.success) {
        console.warn('[GRIEVANCE_CREATE] Some attachments failed to link:', attachmentLinkResult.errors);
      }
    }

    // Prepare response
    const responseData: any = {
      message: 'Grievance created successfully',
      data: newGrievance,
      success: true,
    };

    // Include attachment linking results if attachments were processed
    if (attachmentLinkResult) {
      responseData.attachments = {
        linked: attachmentLinkResult.linkedCount,
        failed: attachmentLinkResult.failedCount,
        errors: attachmentLinkResult.errors
      };
      
      if (attachmentLinkResult.failedCount > 0) {
        responseData.message = `Grievance created successfully, but ${attachmentLinkResult.failedCount} out of ${attachment_ids.length} attachments failed to link. Check attachment errors for details.`;
      }
    }

    res.status(201).json(responseData);

  } catch (error) {
    res.status(500).json({
      message: 'Error creating grievance',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
};

//get grievance by id with responses and history
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
    const grievanceWithDetails = await grievanceService.getGrievanceWithResponses(id);
    if (!grievanceWithDetails) {
      res.status(404).json({
        message: 'Grievance not found',
        success: false,
      });
      return;
    }

    // Transform the data to match the required format
    const formattedGrievance = {
      grievance_details: {
        id: grievanceWithDetails.id,
        issue_id: grievanceWithDetails.issuse_id,
        rollno: grievanceWithDetails.rollno,
        campus: grievanceWithDetails.campus,
        subject: grievanceWithDetails.subject,
        description: grievanceWithDetails.description,
        issue_type: grievanceWithDetails.issuse_type,
        status: grievanceWithDetails.status,
        attachment: grievanceWithDetails.attachment,
        date_time: grievanceWithDetails.date
      },
      responses: grievanceWithDetails.responses.map((response: any) => ({
        id: response.id,
        response_text: response.responsetext,
        response_by: response.responseby,
        response_at: response.responseat,
        status: response.status,
        stage: response.stage,
        attachment: response.attachment,
        redirect: response.redirect,
        date: response.date
      })),
      history: grievanceWithDetails.history.map((hist: any) => ({
        id: hist.id,
        from_status: hist.from_status,
        to_status: hist.to_status,
        action_by: hist.action_by,
        stage_type: hist.stage_type,
        note: hist.note,
        date: hist.date
      }))
    };

    res.status(200).json({
      message: 'Grievance with details retrieved successfully',
      data: formattedGrievance,
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
//get all grievances with responses, history, and attachments
export const getAllGrievances = async (req: Request, res: Response): Promise<void> => {
  try {
    const grievances = await grievanceService.getAllGrievancesWithCompleteDetails();
    
    // Transform the data to match the required format - grouped by issue_id
    const grievancesByIssueId: Record<string, any> = {};

    grievances.forEach((grievance: any) => {
      const issueId = grievance.issuse_id;
      
      if (!grievancesByIssueId[issueId]) {
        grievancesByIssueId[issueId] = {
          issue_id: issueId,
          grievance_details: {
            id: grievance.id,
            issue_id: grievance.issuse_id,
            rollno: grievance.rollno,
            campus: grievance.campus,
            subject: grievance.subject,
            description: grievance.description,
            issue_type: grievance.issuse_type,
            status: grievance.status,
            attachment: grievance.attachment,
            date_time: grievance.date
          },
          responses_and_work: {
            responses: grievance.responses.map((response: any) => ({
              id: response.id,
              response_text: response.responsetext,
              response_by: response.responseby,
              response_at: response.responseat,
              status: response.status,
              stage: response.stage,
              attachment: response.attachment,
              redirect: response.redirect,
              date: response.date
            })),
            history: grievance.history.map((hist: any) => ({
              id: hist.id,
              from_status: hist.from_status,
              to_status: hist.to_status,
              action_by: hist.action_by,
              stage_type: hist.stage_type,
              note: hist.note,
              date: hist.date
            })),
            attachments: grievance.attachments.map((attachment: any) => ({
              id: attachment.id,
              file_name: attachment.filename,
              file_path: attachment.filepath,
              uploaded_by: attachment.uploadedby,
              uploaded_at: attachment.uploadedat,
              created_at: attachment.createdat,
              updated_at: attachment.updatedat
            }))
          }
        };
      }
    });

    // Convert to array and sort by date (most recent first)
    const formattedGrievances = Object.values(grievancesByIssueId).sort((a: any, b: any) => 
      new Date(b.grievance_details.date_time).getTime() - new Date(a.grievance_details.date_time).getTime()
    );

    res.status(200).json({
      message: 'All grievances with complete details retrieved successfully',
      data: formattedGrievances,
      total_grievances: formattedGrievances.length,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving grievances',
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      success: false,
    });
  }
}
// Get user's own grievances with responses, history, and attachments
export const getMyGrievances = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(403).json({
        message: 'User not authenticated',
        success: false,
      });
      return;
    }
    const userRollNo = req.user.rollNumber;
    const grievances = await grievanceService.getGrievancesByRollNoWithCompleteDetails(userRollNo);
    
    // Transform the data to match the required format - grouped by issue_id
    const grievancesByIssueId: Record<string, any> = {};

    grievances.forEach((grievance: any) => {
      const issueId = grievance.issuse_id;
      
      if (!grievancesByIssueId[issueId]) {
        grievancesByIssueId[issueId] = {
          issue_id: issueId,
          grievance_details: {
            id: grievance.id,
            issue_id: grievance.issuse_id,
            rollno: grievance.rollno,
            campus: grievance.campus,
            subject: grievance.subject,
            description: grievance.description,
            issue_type: grievance.issuse_type,
            status: grievance.status,
            attachment: grievance.attachment,
            date_time: grievance.date
          },
          responses_and_work: {
            responses: grievance.responses.map((response: any) => ({
              id: response.id,
              response_text: response.responsetext,
              response_by: response.responseby,
              response_at: response.responseat,
              status: response.status,
              stage: response.stage,
              attachment: response.attachment,
              redirect: response.redirect,
              date: response.date
            })),
            history: grievance.history.map((hist: any) => ({
              id: hist.id,
              from_status: hist.from_status,
              to_status: hist.to_status,
              action_by: hist.action_by,
              stage_type: hist.stage_type,
              note: hist.note,
              date: hist.date
            })),
            attachments: grievance.attachments.map((attachment: any) => ({
              id: attachment.id,
              file_name: attachment.filename,
              file_path: attachment.filepath,
              uploaded_by: attachment.uploadedby,
              uploaded_at: attachment.uploadedat,
              created_at: attachment.createdat,
              updated_at: attachment.updatedat
            }))
          }
        };
      }
    });

    // Convert to array and sort by date (most recent first)
    const formattedGrievances = Object.values(grievancesByIssueId).sort((a: any, b: any) => 
      new Date(b.grievance_details.date_time).getTime() - new Date(a.grievance_details.date_time).getTime()
    );

    res.status(200).json({
      message: 'My grievances with complete details retrieved successfully',
      data: formattedGrievances,
      total_grievances: formattedGrievances.length,
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
// Get grievances by roll number with responses, history, and attachments (admin function)
export const getGrievancesByRollNo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rollno } = req.params;
    if (!rollno) {
      res.status(400).json({
        message: 'Roll number is required',
        success: false,
      });
      return;
    }

    const grievances = await grievanceService.getGrievancesByRollNoWithCompleteDetails(rollno);
      // Transform the data to match the required format - grouped by issue_id
    const grievancesByIssueId: Record<string, any> = {};

    grievances.forEach((grievance: any) => {
      const issueId = grievance.issuse_id;
      
      if (!grievancesByIssueId[issueId]) {
        grievancesByIssueId[issueId] = {
          issue_id: issueId,
          grievance_details: {
            id: grievance.id,
            issue_id: grievance.issuse_id,
            rollno: grievance.rollno,
            campus: grievance.campus,
            subject: grievance.subject,
            description: grievance.description,
            issue_type: grievance.issuse_type,
            status: grievance.status,
            attachment: grievance.attachment,
            date_time: grievance.date
          },
          responses_and_work: {
            responses: grievance.responses.map((response: any) => ({
              id: response.id,
              response_text: response.responsetext,
              response_by: response.responseby,
              response_at: response.responseat,
              status: response.status,
              stage: response.stage,
              attachment: response.attachment,
              redirect: response.redirect,
              date: response.date
            })),
            history: grievance.history.map((hist: any) => ({
              id: hist.id,
              from_status: hist.from_status,
              to_status: hist.to_status,
              action_by: hist.action_by,
              stage_type: hist.stage_type,
              note: hist.note,
              date: hist.date
            })),
            attachments: grievance.attachments.map((attachment: any) => ({
              id: attachment.id,
              file_name: attachment.filename,
              file_path: attachment.filepath,
              uploaded_by: attachment.uploadedby,
              uploaded_at: attachment.uploadedat,
              created_at: attachment.createdat,
              updated_at: attachment.updatedat
            }))
          }
        };
      }
    });

    // Convert to array and sort by date (most recent first)
    const formattedGrievances = Object.values(grievancesByIssueId).sort((a: any, b: any) => 
      new Date(b.grievance_details.date_time).getTime() - new Date(a.grievance_details.date_time).getTime()
    );

    res.status(200).json({
      message: 'Grievances with complete details retrieved successfully for roll number',
      data: formattedGrievances,
      total_grievances: formattedGrievances.length,
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

// Get grievance by issue_id (search functionality)
export const getGrievanceByIssueId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { issue_id } = req.params;
    if (!issue_id) {
      res.status(400).json({
        message: 'Issue ID is required',
        success: false,
      });
      return;
    }

    // Search for grievance by issue_id
    const grievanceResult = await grievanceService.getGrievanceByIssueId(issue_id);
    if (!grievanceResult) {
      res.status(404).json({
        message: 'Grievance not found with the provided issue ID',
        success: false,
      });
      return;
    }    // Get complete details for the found grievance (convert id to string)
    const grievanceWithDetails = await grievanceService.getGrievanceWithResponses(grievanceResult.id.toString());
    
    if (!grievanceWithDetails) {
      // If we can't get details, return the basic grievance info
      const formattedGrievance = {
        grievance_details: {
          id: grievanceResult.id,
          issue_id: grievanceResult.issuse_id,
          rollno: grievanceResult.rollno,
          campus: grievanceResult.campus,
          subject: grievanceResult.subject,
          description: grievanceResult.description,
          issue_type: grievanceResult.issuse_type,
          status: grievanceResult.status,
          attachment: grievanceResult.attachment,
          date_time: grievanceResult.date
        },
        responses_and_work: {
          responses: [],
          history: [],
          attachments: []
        }
      };

      res.status(200).json({
        message: 'Grievance found (basic details only)',
        data: formattedGrievance,
        success: true,
      });
      return;
    }
    
    // Transform the data to match the required format
    const formattedGrievance = {
      grievance_details: {
        id: grievanceWithDetails.id,
        issue_id: grievanceWithDetails.issuse_id,
        rollno: grievanceWithDetails.rollno,
        campus: grievanceWithDetails.campus,
        subject: grievanceWithDetails.subject,
        description: grievanceWithDetails.description,
        issue_type: grievanceWithDetails.issuse_type,
        status: grievanceWithDetails.status,
        attachment: grievanceWithDetails.attachment,
        date_time: grievanceWithDetails.date
      },
      responses_and_work: {
        responses: grievanceWithDetails.responses.map((response: any) => ({
          id: response.id,
          response_text: response.responsetext,
          response_by: response.responseby,
          response_at: response.responseat,
          status: response.status,
          stage: response.stage,
          attachment: response.attachment,
          redirect: response.redirect,
          date: response.date
        })),
        history: grievanceWithDetails.history.map((hist: any) => ({
          id: hist.id,
          from_status: hist.from_status,
          to_status: hist.to_status,
          action_by: hist.action_by,
          stage_type: hist.stage_type,
          note: hist.note,
          date: hist.date
        })),
        attachments: grievanceWithDetails.attachments ? grievanceWithDetails.attachments.map((attachment: any) => ({
          id: attachment.id,
          file_name: attachment.filename,
          file_path: attachment.filepath,
          uploaded_by: attachment.uploadedby,
          uploaded_at: attachment.uploadedat,
          created_at: attachment.createdat,
          updated_at: attachment.updatedat
        })) : []
      }
    };

    res.status(200).json({
      message: 'Grievance found and retrieved successfully',
      data: formattedGrievance,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error searching for grievance',
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
  getGrievancesByRollNo,
  getGrievanceByIssueId
};
