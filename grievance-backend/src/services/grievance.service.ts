import { db } from '../db/queries';
import ConnectionManager from '../db/connectionManager';
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

  const result = await ConnectionManager.query(GrievanceQueries.CREATE, values);
  return result.rows[0];
}

export async function getGrievanceById(id: string) {
  const result = await ConnectionManager.query(GrievanceQueries.GET_BY_ID, [id]);
  return result.rows[0];
}

export async function getAllGrievances() {
  const result = await ConnectionManager.query(GrievanceQueries.GET_ALL);
  return result.rows;
}

export async function getGrievancesByRollNo(rollno: string) {
  const result = await ConnectionManager.query(GrievanceQueries.GET_BY_ROLLNO, [rollno]);
  return result.rows;
}

export async function getGrievancesByRollNoWithDetails(rollno: string) {
  // Use transaction to ensure connection reuse
  return await ConnectionManager.transaction(async (client) => {
    const grievancesResult = await client.query(GrievanceQueries.GET_BY_ROLLNO, [rollno]);
    const grievances = grievancesResult.rows;

    if (grievances.length === 0) {
      return [];
    }

    // Get all grievance IDs for batch queries
    const grievanceIds = grievances.map(g => g.id);
    
    // Batch query for responses and history
    const [responsesResult, historyResult] = await Promise.all([
      client.query(`SELECT * FROM response WHERE issuse_id = ANY($1) ORDER BY issuse_id, date ASC`, [grievanceIds]),
      client.query(`SELECT * FROM grievancehistory WHERE issuse_id = ANY($1) ORDER BY issuse_id, date ASC`, [grievanceIds])
    ]);

    // Group related data by grievance ID
    const responsesMap = new Map();
    const historyMap = new Map();

    responsesResult.rows.forEach(row => {
      if (!responsesMap.has(row.issuse_id)) responsesMap.set(row.issuse_id, []);
      responsesMap.get(row.issuse_id).push(row);
    });

    historyResult.rows.forEach(row => {
      if (!historyMap.has(row.issuse_id)) historyMap.set(row.issuse_id, []);
      historyMap.get(row.issuse_id).push(row);
    });

    // Combine data
    return grievances.map(grievance => ({
      ...grievance,
      responses: responsesMap.get(grievance.id) || [],
      history: historyMap.get(grievance.id) || []
    }));
  });
}

export async function getAllGrievancesWithDetails() {
  // Use transaction to ensure connection reuse
  return await ConnectionManager.transaction(async (client) => {
    const grievancesResult = await client.query(GrievanceQueries.GET_ALL);
    const grievances = grievancesResult.rows;

    if (grievances.length === 0) {
      return [];
    }

    // Get all grievance IDs for batch queries
    const grievanceIds = grievances.map(g => g.id);
    
    // Batch query for responses and history
    const [responsesResult, historyResult] = await Promise.all([
      client.query(`SELECT * FROM response WHERE issuse_id = ANY($1) ORDER BY issuse_id, date ASC`, [grievanceIds]),
      client.query(`SELECT * FROM grievancehistory WHERE issuse_id = ANY($1) ORDER BY issuse_id, date ASC`, [grievanceIds])
    ]);

    // Group related data by grievance ID
    const responsesMap = new Map();
    const historyMap = new Map();

    responsesResult.rows.forEach(row => {
      if (!responsesMap.has(row.issuse_id)) responsesMap.set(row.issuse_id, []);
      responsesMap.get(row.issuse_id).push(row);
    });

    historyResult.rows.forEach(row => {
      if (!historyMap.has(row.issuse_id)) historyMap.set(row.issuse_id, []);
      historyMap.get(row.issuse_id).push(row);
    });

    // Combine data
    return grievances.map(grievance => ({
      ...grievance,
      responses: responsesMap.get(grievance.id) || [],
      history: historyMap.get(grievance.id) || []
    }));
  });
}

export async function updateGrievance(id: string, fieldsToUpdate: Record<string, any>) {
  const fields = Object.keys(fieldsToUpdate);
  const values = Object.values(fieldsToUpdate);
  const query = GrievanceQueries.UPDATE(fields);
  const result = await ConnectionManager.query(query, [id, ...values]);
  return result.rows[0];
}

export async function getGrievanceWithResponses(id: string) {
  // Use transaction to ensure connection reuse
  return await ConnectionManager.transaction(async (client) => {
    // Get the grievance details
    const grievanceResult = await client.query(GrievanceQueries.GET_BY_ID, [id]);
    if (!grievanceResult.rows[0]) return null;

    const grievance = grievanceResult.rows[0];

    // Get all related data in parallel within the transaction
    const [responsesResult, historyResult, attachmentsResult] = await Promise.all([
      client.query(ResponseQueries.GET_BY_ISSUE_ID, [grievance.id]),
      client.query(GrievanceHistoryQueries.GET_BY_ISSUE_ID, [grievance.id]),
      client.query(AttachmentQueries.GET_BY_ISSUE_ID, [grievance.id])
    ]);
    
    return {
      ...grievance,
      responses: responsesResult.rows,
      history: historyResult.rows,
      attachments: attachmentsResult.rows
    };
  });
}

export async function grievanceExists(id: string) {
  const result = await ConnectionManager.query(`SELECT EXISTS(SELECT 1 FROM Grievance WHERE id = $1) as exists`, [id]);
  return result.rows[0].exists;
}

export async function getGrievancesByRollNoWithCompleteDetails(rollno: string) {
  // Use transaction to ensure connection reuse and better performance
  return await ConnectionManager.transaction(async (client) => {
    // Get grievances for this roll number
    const grievancesResult = await client.query(GrievanceQueries.GET_BY_ROLLNO, [rollno]);
    const grievances = grievancesResult.rows;

    if (grievances.length === 0) {
      return [];
    }

    // Get all grievance IDs for batch queries
    const grievanceIds = grievances.map(g => g.id);
    
    // Batch query for responses
    const responsesResult = await client.query(
      `SELECT * FROM response WHERE issuse_id = ANY($1) ORDER BY issuse_id, date ASC`,
      [grievanceIds]
    );
    
    // Batch query for history
    const historyResult = await client.query(
      `SELECT * FROM grievancehistory WHERE issuse_id = ANY($1) ORDER BY issuse_id, date ASC`,
      [grievanceIds]
    );
    
    // Batch query for attachments
    const attachmentsResult = await client.query(
      `SELECT * FROM attachment WHERE issuse_id = ANY($1) ORDER BY issuse_id, uploadedat ASC`,
      [grievanceIds]
    );

    // Group related data by grievance ID
    const responsesMap = new Map();
    const historyMap = new Map();
    const attachmentsMap = new Map();

    responsesResult.rows.forEach(row => {
      if (!responsesMap.has(row.issuse_id)) responsesMap.set(row.issuse_id, []);
      responsesMap.get(row.issuse_id).push(row);
    });

    historyResult.rows.forEach(row => {
      if (!historyMap.has(row.issuse_id)) historyMap.set(row.issuse_id, []);
      historyMap.get(row.issuse_id).push(row);
    });

    attachmentsResult.rows.forEach(row => {
      if (!attachmentsMap.has(row.issuse_id)) attachmentsMap.set(row.issuse_id, []);
      attachmentsMap.get(row.issuse_id).push(row);
    });

    // Combine data
    return grievances.map(grievance => ({
      ...grievance,
      responses: responsesMap.get(grievance.id) || [],
      history: historyMap.get(grievance.id) || [],
      attachments: attachmentsMap.get(grievance.id) || []
    }));
  });
}

export async function getAllGrievancesWithCompleteDetails() {
  // Use a single query with JOINs instead of multiple queries to reduce connection usage
  return await ConnectionManager.transaction(async (client) => {
    // Get all grievances first
    const grievancesResult = await client.query(GrievanceQueries.GET_ALL);
    const grievances = grievancesResult.rows;

    if (grievances.length === 0) {
      return [];
    }

    // Get all grievance IDs for batch queries
    const grievanceIds = grievances.map(g => g.id);
    
    // Batch query for responses
    const responsesResult = await client.query(
      `SELECT * FROM response WHERE issuse_id = ANY($1) ORDER BY issuse_id, date ASC`,
      [grievanceIds]
    );
    
    // Batch query for history
    const historyResult = await client.query(
      `SELECT * FROM grievancehistory WHERE issuse_id = ANY($1) ORDER BY issuse_id, date ASC`,
      [grievanceIds]
    );
    
    // Batch query for attachments
    const attachmentsResult = await client.query(
      `SELECT * FROM attachment WHERE issuse_id = ANY($1) ORDER BY issuse_id, uploadedat ASC`,
      [grievanceIds]
    );

    // Group related data by grievance ID
    const responsesMap = new Map();
    const historyMap = new Map();
    const attachmentsMap = new Map();

    responsesResult.rows.forEach(row => {
      if (!responsesMap.has(row.issuse_id)) responsesMap.set(row.issuse_id, []);
      responsesMap.get(row.issuse_id).push(row);
    });

    historyResult.rows.forEach(row => {
      if (!historyMap.has(row.issuse_id)) historyMap.set(row.issuse_id, []);
      historyMap.get(row.issuse_id).push(row);
    });

    attachmentsResult.rows.forEach(row => {
      if (!attachmentsMap.has(row.issuse_id)) attachmentsMap.set(row.issuse_id, []);
      attachmentsMap.get(row.issuse_id).push(row);
    });

    // Combine data
    return grievances.map(grievance => ({
      ...grievance,
      responses: responsesMap.get(grievance.id) || [],
      history: historyMap.get(grievance.id) || [],
      attachments: attachmentsMap.get(grievance.id) || []
    }));
  });
}

export async function getGrievanceByIssueId(issue_id: string) {
  const result = await ConnectionManager.query(GrievanceQueries.GET_BY_ISSUE_ID, [issue_id]);
  return result.rows[0];
}

export async function updateGrievanceByIssueId(issue_id: string, fieldsToUpdate: Record<string, any>) {
  const fields = Object.keys(fieldsToUpdate);
  const values = Object.values(fieldsToUpdate);
  const query = GrievanceQueries.UPDATE_BY_ISSUE_ID(fields);
  const result = await ConnectionManager.query(query, [issue_id, ...values]);
  return result.rows[0];
}