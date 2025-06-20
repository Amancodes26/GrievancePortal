import { db } from '../db/queries';
import { GrievanceQueries, ResponseQueries, GrievanceHistoryQueries, AttachmentQueries } from '../db/queries';

export async function createGrievance(data: {
  issue_id: string;
  rollno: string;
  campus: string;
  subject: string;
  description: string;
  issue_type: string;
  status: string;
  attachment?: string | null;
}) {
  const values = [
    data.issue_id,
    data.rollno,
    data.campus,
    data.subject,
    data.description,
    data.issue_type,
    data.status,
    data.attachment
  ];

  const result = await db.query(GrievanceQueries.CREATE, values);
  return result.rows[0];
}

export async function getGrievanceById(id: string) {
  const result = await db.query(GrievanceQueries.GET_BY_ID, [id]);
  return result.rows[0];
}

export async function getAllGrievances() {
  const result = await db.query(GrievanceQueries.GET_ALL);
  return result.rows;
}

export async function getGrievancesByRollNo(rollno: string) {
  const result = await db.query(GrievanceQueries.GET_BY_ROLLNO, [rollno]);
  return result.rows;
}

export async function getGrievancesByRollNoWithDetails(rollno: string) {
  const grievancesResult = await db.query(GrievanceQueries.GET_BY_ROLLNO, [rollno]);
  const grievances = grievancesResult.rows;

  // For each grievance, get its responses and history
  const grievancesWithDetails = await Promise.all(
    grievances.map(async (grievance) => {
      // Get responses for this grievance using the grievance ID (not issue_id)
      const responsesResult = await db.query(ResponseQueries.GET_BY_ISSUE_ID, [grievance.id]);
      
      // Get history for this grievance using the grievance ID
      const historyResult = await db.query(GrievanceHistoryQueries.GET_BY_ISSUE_ID, [grievance.id]);

      return {
        ...grievance,
        responses: responsesResult.rows,
        history: historyResult.rows
      };
    })
  );

  return grievancesWithDetails;
}

export async function getAllGrievancesWithDetails() {
  const grievancesResult = await db.query(GrievanceQueries.GET_ALL);
  const grievances = grievancesResult.rows;

  // For each grievance, get its responses and history
  const grievancesWithDetails = await Promise.all(
    grievances.map(async (grievance) => {
      // Get responses for this grievance using the grievance ID
      const responsesResult = await db.query(ResponseQueries.GET_BY_ISSUE_ID, [grievance.id]);
      
      // Get history for this grievance using the grievance ID
      const historyResult = await db.query(GrievanceHistoryQueries.GET_BY_ISSUE_ID, [grievance.id]);

      return {
        ...grievance,
        responses: responsesResult.rows,
        history: historyResult.rows
      };
    })
  );

  return grievancesWithDetails;
}

export async function updateGrievance(id: string, fieldsToUpdate: Record<string, any>) {
  const fields = Object.keys(fieldsToUpdate);
  const values = Object.values(fieldsToUpdate);
  const query = GrievanceQueries.UPDATE(fields);
  const result = await db.query(query, [id, ...values]);
  return result.rows[0];
}

export async function getGrievanceWithResponses(id: string) {
  // Get the grievance details
  const grievanceResult = await db.query(GrievanceQueries.GET_BY_ID, [id]);
  if (!grievanceResult.rows[0]) return null;

  const grievance = grievanceResult.rows[0];

  // Get responses for this grievance using the numeric grievance ID (not the string issue_id)
  const responsesResult = await db.query(ResponseQueries.GET_BY_ISSUE_ID, [grievance.id]);
  
  // Get history for this grievance using the numeric grievance ID (not the string issue_id)
  const historyResult = await db.query(GrievanceHistoryQueries.GET_BY_ISSUE_ID, [grievance.id]);
  
  // Get attachments for this grievance using the numeric grievance ID (not the string issue_id)
  const attachmentsResult = await db.query(AttachmentQueries.GET_BY_ISSUE_ID, [grievance.id]);
  
  return {
    ...grievance,
    responses: responsesResult.rows,
    history: historyResult.rows,
    attachments: attachmentsResult.rows
  };
}

export async function grievanceExists(id: string) {
  const result = await db.query(`SELECT EXISTS(SELECT 1 FROM Grievance WHERE id = $1) as exists`, [id]);
  return result.rows[0].exists;
}

export async function getGrievancesByRollNoWithCompleteDetails(rollno: string) {
  const grievancesResult = await db.query(GrievanceQueries.GET_BY_ROLLNO, [rollno]);
  const grievances = grievancesResult.rows;

  // For each grievance, get its responses, history, and attachments using numeric grievance ID
  const grievancesWithCompleteDetails = await Promise.all(
    grievances.map(async (grievance) => {
      // Get responses for this grievance using the numeric grievance ID
      const responsesResult = await db.query(ResponseQueries.GET_BY_ISSUE_ID, [grievance.id]);
      
      // Get history for this grievance using the numeric grievance ID
      const historyResult = await db.query(GrievanceHistoryQueries.GET_BY_ISSUE_ID, [grievance.id]);
      
      // Get attachments for this grievance using the numeric grievance ID
      const attachmentsResult = await db.query(AttachmentQueries.GET_BY_ISSUE_ID, [grievance.id]);

      return {
        ...grievance,
        responses: responsesResult.rows,
        history: historyResult.rows,
        attachments: attachmentsResult.rows
      };
    })
  );

  return grievancesWithCompleteDetails;
}

export async function getAllGrievancesWithCompleteDetails() {
  const grievancesResult = await db.query(GrievanceQueries.GET_ALL);
  const grievances = grievancesResult.rows;

  // For each grievance, get its responses, history, and attachments using numeric grievance ID
  const grievancesWithCompleteDetails = await Promise.all(
    grievances.map(async (grievance) => {
      // Get responses for this grievance using the numeric grievance ID
      const responsesResult = await db.query(ResponseQueries.GET_BY_ISSUE_ID, [grievance.id]);
      
      // Get history for this grievance using the numeric grievance ID
      const historyResult = await db.query(GrievanceHistoryQueries.GET_BY_ISSUE_ID, [grievance.id]);
      
      // Get attachments for this grievance using the numeric grievance ID
      const attachmentsResult = await db.query(AttachmentQueries.GET_BY_ISSUE_ID, [grievance.id]);

      return {
        ...grievance,
        responses: responsesResult.rows,
        history: historyResult.rows,
        attachments: attachmentsResult.rows
      };
    })
  );

  return grievancesWithCompleteDetails;
}

export async function getGrievanceByIssueId(issue_id: string) {
  const result = await db.query(GrievanceQueries.GET_BY_ISSUE_ID, [issue_id]);
  return result.rows[0];
}

export async function updateGrievanceByIssueId(issue_id: string, fieldsToUpdate: Record<string, any>) {
  const fields = Object.keys(fieldsToUpdate);
  const values = Object.values(fieldsToUpdate);
  const query = GrievanceQueries.UPDATE_BY_ISSUE_ID(fields);
  const result = await db.query(query, [issue_id, ...values]);
  return result.rows[0];
}