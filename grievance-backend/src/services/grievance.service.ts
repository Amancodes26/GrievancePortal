import { db } from '../db/queries';
import ConnectionManager from '../db/connectionManager';
import { GrievanceQueries, TrackingQueries, AttachmentQueries } from '../db/queries';

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
  
  // Create initial tracking entry
  if (result.rows[0]) {
    await createInitialTracking(data.grievanceId);
  }
  
  return result.rows[0];
}

async function createInitialTracking(grievanceId: string) {
  const trackingValues = [
    grievanceId,
    'pending', // AdminStatus
    'submitted', // StudentStatus
    'initial', // Stage
    null, // AdminId (not assigned yet)
    null, // AssignedTo
    'Grievance submitted by student' // Comments
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

    // Get tracking and attachments for each grievance
    const grievanceIds = grievances.map(g => g.grievanceid);
    
    const [trackingResult, attachmentsResult] = await Promise.all([
      client.query(`
        SELECT t.*, a.name as adminname, a2.name as assignedtoname
        FROM tracking t
        LEFT JOIN admin a ON t.adminid = a.adminid
        LEFT JOIN admin a2 ON t.assignedto = a2.adminid
        WHERE t.grievanceid = ANY($1)
        ORDER BY t.grievanceid, t.updatedat DESC
      `, [grievanceIds]),
      client.query(`SELECT * FROM attachment WHERE grievanceid = ANY($1) ORDER BY grievanceid, uploadedat DESC`, [grievanceIds])
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
  return await ConnectionManager.transaction(async (client) => {
    const grievancesResult = await client.query(GrievanceQueries.GET_ALL);
    const grievances = grievancesResult.rows;

    if (grievances.length === 0) {
      return [];
    }

    // Get tracking and attachments for all grievances
    const grievanceIds = grievances.map(g => g.grievanceid);
    
    const [trackingResult, attachmentsResult] = await Promise.all([
      client.query(`
        SELECT t.*, a.name as adminname, a2.name as assignedtoname
        FROM tracking t
        LEFT JOIN admin a ON t.adminid = a.adminid
        LEFT JOIN admin a2 ON t.assignedto = a2.adminid
        WHERE t.grievanceid = ANY($1)
        ORDER BY t.grievanceid, t.updatedat DESC
      `, [grievanceIds]),
      client.query(`SELECT * FROM attachment WHERE grievanceid = ANY($1) ORDER BY grievanceid, uploadedat DESC`, [grievanceIds])
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

// Tracking-related functions
export async function updateGrievanceStatus(
  grievanceId: string, 
  adminStatus: string, 
  studentStatus: string, 
  stage: string, 
  adminId: string, 
  comments?: string
) {
  const values = [grievanceId, adminStatus, studentStatus, stage, adminId, comments || ''];
  const result = await ConnectionManager.query(TrackingQueries.UPDATE_STATUS, values);
  return result.rows[0];
}

export async function getGrievanceTracking(grievanceId: string) {
  const result = await ConnectionManager.query(TrackingQueries.GET_BY_GRIEVANCE_ID, [grievanceId]);
  return result.rows;
}

export async function getLatestGrievanceStatus(grievanceId: string) {
  const result = await ConnectionManager.query(TrackingQueries.GET_LATEST_BY_GRIEVANCE_ID, [grievanceId]);
  return result.rows[0] || null;
}

export async function assignGrievanceToAdmin(grievanceId: string, adminId: string, assignedTo: string, comments?: string) {
  const values = [
    grievanceId,
    'assigned', // AdminStatus
    'in_progress', // StudentStatus  
    'assigned', // Stage
    adminId,
    assignedTo,
    comments || `Grievance assigned to admin ${assignedTo}`
  ];
  
  const result = await ConnectionManager.query(TrackingQueries.CREATE, values);
  return result.rows[0];
}

export async function getGrievancesByAdminStatus(adminStatus: string) {
  const result = await ConnectionManager.query(TrackingQueries.GET_BY_ADMIN_STATUS, [adminStatus]);
  return result.rows;
}

export async function getGrievancesAssignedToAdmin(adminId: string) {
  const result = await ConnectionManager.query(TrackingQueries.GET_ASSIGNED_TO_ADMIN, [adminId]);
  return result.rows;
}

// Statistics functions
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