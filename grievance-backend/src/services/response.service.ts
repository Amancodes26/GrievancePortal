import { getPool } from "../db";
import { ResponseQueries } from '../db/queries';

export async function createResponse(data: {
  issue_id: number; // This is actually the grievance database ID (numeric), not the string issue_id
  response_text: string;
  response_by: string;
  status?: string;
  stage: string;
  attachment?: string | null;
  redirect?: string | null;
}) {
  const values = [
    data.issue_id, // Database ID for foreign key to grievance table
    data.response_text,
    data.response_by,
    data.status || 'pending',
    data.stage,
    data.attachment,
    data.redirect
  ];

  const result = await getPool().query(ResponseQueries.CREATE, values);
  const newResponse = result.rows[0];
  
  // Get the grievance to fetch the actual issue_id (string) for response
  const grievanceResult = await getPool().query(`SELECT Issuse_Id FROM grievance WHERE id = $1`, [data.issue_id]);
  if (grievanceResult.rows[0]) {
    newResponse.issue_id = grievanceResult.rows[0].issuse_id; // Replace with string issue_id
  }
  
  return newResponse;
}

export async function getResponsesByIssueId(issueId: string) {
  const result = await getPool().query(ResponseQueries.GET_BY_ISSUE_ID, [issueId]);
  return result.rows;
}

export async function getAllResponses() {
  const result = await getPool().query(ResponseQueries.GET_ALL);
  return result.rows;
}

export async function deleteResponse(id: string) {
  const result = await getPool().query(ResponseQueries.DELETE, [id]);
  return result.rows[0];
}
