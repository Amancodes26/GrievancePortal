import { db } from '../db/queries';
import ConnectionManager from '../db/connectionManager';
import { GrievanceQueries, TrackingQueries, AttachmentQueries, UtilityQueries } from '../db/queries';

/**
 * DSEU Grievance Service
 * Updated for init.sql schema with history-based tracking
 */

export async function createGrievance(data: {
  grievanceId: string;
  rollNo: string;
  campusId: number;
  issueCode: number;
  subject: string;
  description: string;
  hasAttachments?: boolean;
}) {
  const values = [
    data.grievanceId,
    data.rollNo,
    data.campusId,
    data.issueCode,
    data.subject,
    data.description,
    data.hasAttachments || false
  ];

  const result = await ConnectionManager.query(GrievanceQueries.CREATE, values);
  
  // Create initial tracking entry with new schema
  if (result.rows[0]) {
    await createInitialTracking(data.grievanceId);
  }
  
  return result.rows[0];
}

async function createInitialTracking(grievanceId: string) {
  // Updated for new tracking schema with ResponseText, ResponseBy, etc.
  const trackingValues = [
    grievanceId,
    'Grievance submitted successfully. Under review by admin.', // ResponseText
    'NEW', // AdminStatus
    'SUBMITTED', // StudentStatus
    'SYSTEM', // ResponseBy (system generated)
    null, // RedirectTo
    null, // RedirectFrom
    false, // IsRedirect
    false  // HasAttachments
  ];

  await ConnectionManager.query(TrackingQueries.CREATE, trackingValues);
}

export async function getGrievanceById(id: number) {
  const result = await ConnectionManager.query(GrievanceQueries.GET_BY_ID, [id]);
  return result.rows[0];
}

export async function getGrievanceByGrievanceId(grievanceId: string) {
  const result = await ConnectionManager.query(GrievanceQueries.GET_BY_GRIEVANCE_ID, [grievanceId]);
  return result.rows[0];
}

export async function getAllGrievances() {
  const result = await ConnectionManager.query(GrievanceQueries.GET_ALL);
  return result.rows;
}

export async function getGrievancesByRollNo(rollNo: string) {
  const result = await ConnectionManager.query(GrievanceQueries.GET_BY_ROLLNO, [rollNo]);
  return result.rows;
}

export async function getGrievancesByCampus(campusId: number) {
  const result = await ConnectionManager.query(GrievanceQueries.GET_BY_CAMPUS, [campusId]);
  return result.rows;
}

export async function getGrievancesByRollNoWithDetails(rollNo: string) {
  return await ConnectionManager.transaction(async (client) => {
    const grievancesResult = await client.query(GrievanceQueries.GET_BY_ROLLNO, [rollNo]);
    const grievances = grievancesResult.rows;

    if (grievances.length === 0) {
      return [];
    }

    // Get tracking and attachments for each grievance (updated field names)
    const grievanceIds = grievances.map(g => g.grievanceid);
    
    const [trackingResult, attachmentsResult] = await Promise.all([
      client.query(`
        SELECT t.*, a.Name as AdminName
        FROM Tracking t
        LEFT JOIN Admin a ON t.ResponseBy = a.AdminId
        WHERE t.GrievanceId = ANY($1)
        ORDER BY t.GrievanceId, t.ResponseAt DESC
      `, [grievanceIds]),
      client.query(`SELECT * FROM Attachment WHERE GrievanceId = ANY($1) ORDER BY GrievanceId, UploadedAt DESC`, [grievanceIds])
    ]);

    // Group related data by grievance ID
    const trackingMap = new Map();
    const attachmentsMap = new Map();

    trackingResult.rows.forEach(row => {
      if (!trackingMap.has(row.grievanceid)) trackingMap.set(row.grievanceid, []);
      trackingMap.get(row.grievanceid).push(row);
    });

    attachmentsResult.rows.forEach(row => {
      if (!attachmentsMap.has(row.grievanceid)) attachmentsMap.set(row.grievanceid, []);
      attachmentsMap.get(row.grievanceid).push(row);
    });

    return grievances.map(grievance => ({
      ...grievance,
      tracking: trackingMap.get(grievance.grievanceid) || [],
      attachments: attachmentsMap.get(grievance.grievanceid) || [],
      currentStatus: trackingMap.get(grievance.grievanceid)?.[0] || null
    }));
  });
}

export async function getAllGrievancesWithDetails() {
  // Use the new utility query for better performance
  const result = await ConnectionManager.query(UtilityQueries.GET_GRIEVANCES_WITH_LATEST_STATUS);
  return result.rows;
}

export async function updateGrievance(id: number, fieldsToUpdate: Record<string, any>) {
  const fields = Object.keys(fieldsToUpdate);
  const values = Object.values(fieldsToUpdate);
  const query = GrievanceQueries.UPDATE(fields);
  const result = await ConnectionManager.query(query, [id, ...values]);
  return result.rows[0];
}

export async function updateGrievanceByGrievanceId(grievanceId: string, fieldsToUpdate: Record<string, any>) {
  const fields = Object.keys(fieldsToUpdate);
  const values = Object.values(fieldsToUpdate);
  const query = GrievanceQueries.UPDATE_BY_GRIEVANCE_ID(fields);
  const result = await ConnectionManager.query(query, [grievanceId, ...values]);
  return result.rows[0];
}

export async function getGrievanceWithDetails(grievanceId: string) {
  return await ConnectionManager.transaction(async (client) => {
    // Get the grievance details
    const grievanceResult = await client.query(GrievanceQueries.GET_BY_GRIEVANCE_ID, [grievanceId]);
    if (!grievanceResult.rows[0]) return null;

    const grievance = grievanceResult.rows[0];

    // Get all related data in parallel within the transaction
    const [trackingResult, attachmentsResult] = await Promise.all([
      client.query(TrackingQueries.GET_BY_GRIEVANCE_ID, [grievanceId]),
      client.query(AttachmentQueries.GET_BY_GRIEVANCE_ID, [grievanceId])
    ]);
    
    return {
      ...grievance,
      tracking: trackingResult.rows,
      attachments: attachmentsResult.rows,
      currentStatus: trackingResult.rows[0] || null
    };
  });
}

export async function grievanceExists(grievanceId: string) {
  const result = await ConnectionManager.query(`SELECT EXISTS(SELECT 1 FROM Grievance WHERE GrievanceId = $1) as exists`, [grievanceId]);
  return result.rows[0].exists;
}

export async function deleteGrievance(id: number) {
  const result = await ConnectionManager.query(GrievanceQueries.DELETE, [id]);
  return result.rows[0];
}

export async function deleteGrievanceByGrievanceId(grievanceId: string) {
  const result = await ConnectionManager.query(GrievanceQueries.DELETE_BY_GRIEVANCE_ID, [grievanceId]);
  return result.rows[0];
}

// Tracking-related functions (Updated for new schema)
export async function addGrievanceResponse(
  grievanceId: string, 
  responseText: string,
  adminStatus: 'NEW' | 'PENDING' | 'REDIRECTED' | 'RESOLVED' | 'REJECTED',
  studentStatus: 'SUBMITTED' | 'UNDER_REVIEW' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED',
  responseBy: string,
  hasAttachments: boolean = false
) {
  const values = [grievanceId, responseText, adminStatus, studentStatus, responseBy, hasAttachments];
  const result = await ConnectionManager.query(TrackingQueries.ADD_RESPONSE, values);
  return result.rows[0];
}

export async function redirectGrievance(
  grievanceId: string,
  responseText: string,
  redirectFrom: string,
  redirectTo: string
) {
  const values = [grievanceId, responseText, redirectFrom, redirectTo, redirectFrom];
  const result = await ConnectionManager.query(TrackingQueries.REDIRECT_GRIEVANCE, values);
  return result.rows[0];
}

export async function getGrievanceTracking(grievanceId: string) {
  const result = await ConnectionManager.query(TrackingQueries.GET_BY_GRIEVANCE_ID, [grievanceId]);
  return result.rows;
}

export async function getGrievanceHistory(grievanceId: string) {
  const result = await ConnectionManager.query(TrackingQueries.GET_GRIEVANCE_HISTORY, [grievanceId]);
  return result.rows;
}

export async function getLatestGrievanceStatus(grievanceId: string) {
  const result = await ConnectionManager.query(TrackingQueries.GET_LATEST_BY_GRIEVANCE_ID, [grievanceId]);
  return result.rows[0] || null;
}

export async function getGrievancesByAdminStatus(adminStatus: string) {
  const result = await ConnectionManager.query(TrackingQueries.GET_BY_ADMIN_STATUS, [adminStatus]);
  return result.rows;
}

export async function getGrievancesRedirectedToAdmin(adminId: string) {
  const result = await ConnectionManager.query(TrackingQueries.GET_REDIRECTED_TO_ADMIN, [adminId]);
  return result.rows;
}

// Statistics functions (Updated for new schema)
export async function getGrievanceStats() {
  return await ConnectionManager.transaction(async (client) => {
    const [campusStats, issueStats, recentCount] = await Promise.all([
      client.query(GrievanceQueries.COUNT_BY_CAMPUS),
      client.query(GrievanceQueries.COUNT_BY_ISSUE),
      client.query(GrievanceQueries.COUNT_RECENT)
    ]);

    return {
      byCampus: campusStats.rows,
      byIssueType: issueStats.rows,
      recentCount: recentCount.rows[0]?.count || 0
    };
  });
}

// Additional functions for new schema features
export async function validateGrievanceTransition(grievanceId: string, newAdminStatus: string) {
  const currentStatus = await getLatestGrievanceStatus(grievanceId);
  if (!currentStatus) return false;
  
  // Use validation query from new schema
  const result = await ConnectionManager.query(`
    SELECT CASE 
      WHEN $1 = 'NEW' AND $2 IN ('PENDING', 'REDIRECTED') THEN true
      WHEN $1 = 'PENDING' AND $2 IN ('RESOLVED', 'REJECTED', 'REDIRECTED') THEN true
      WHEN $1 = 'REDIRECTED' AND $2 IN ('PENDING', 'RESOLVED', 'REJECTED') THEN true
      WHEN $1 = 'RESOLVED' THEN false
      WHEN $1 = 'REJECTED' THEN false
      ELSE false
    END as is_valid
  `, [currentStatus.adminstatus, newAdminStatus]);
  
  return result.rows[0]?.is_valid || false;
}

export async function getOrphanedGrievances() {
  const result = await ConnectionManager.query(`
    SELECT g.GrievanceId, g.Subject, g.CreatedAt
    FROM Grievance g
    LEFT JOIN Tracking t ON g.GrievanceId = t.GrievanceId
    WHERE t.GrievanceId IS NULL
  `);
  return result.rows;
}