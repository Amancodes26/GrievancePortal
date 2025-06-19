import { db } from '../db/queries';
import { GrievanceQueries } from '../db/queries';

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

export async function updateGrievance(id: string, fieldsToUpdate: Record<string, any>) {
  const fields = Object.keys(fieldsToUpdate);
  const values = Object.values(fieldsToUpdate);

  const query = GrievanceQueries.UPDATE(fields);
  const result = await db.query(query, [id, ...values]);
  return result.rows[0];
}

export async function deleteGrievance(id: string) {
  const result = await db.query(GrievanceQueries.DELETE, [id]);
  return result.rows[0];
}

export async function getGrievanceWithResponses(id: string) {
  // This would need a complex query joining Grievance with Response table
  const grievanceResult = await db.query(GrievanceQueries.GET_BY_ID, [id]);
  if (!grievanceResult.rows[0]) return null;

  // Get responses for this grievance (you'll need to implement ResponseQueries.GET_BY_ISSUE_ID)
  // const responsesResult = await db.query(ResponseQueries.GET_BY_ISSUE_ID, [id]);
  
  return {
    ...grievanceResult.rows[0],
    // responses: responsesResult.rows
  };
}

export async function grievanceExists(id: string) {
  const result = await db.query(`SELECT EXISTS(SELECT 1 FROM Grievance WHERE id = $1) as exists`, [id]);
  return result.rows[0].exists;
}