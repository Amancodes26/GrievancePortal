import { db } from '../db/queries';
import { GrievanceHistoryQueries } from '../db/queries';

export async function createHistory(data: {
  grievance_id: number; // This is the grievance database ID (numeric), not the string issue_id
  from_status: string;
  to_status: string;
  action_by: string;
  action_type: string;
  note: string;
  date_time: number;
}) {
  const values = [
    data.grievance_id, // Database ID for foreign key to grievance table
    data.from_status,
    data.to_status,
    data.action_by,
    data.action_type,
    data.note
  ];

  const result = await db.query(GrievanceHistoryQueries.CREATE, values);
  return result.rows[0];
}

export async function getGrievanceHistory(grievance_id: string) {
  const result = await db.query(GrievanceHistoryQueries.GET_BY_ISSUE_ID, [grievance_id]);
  return result.rows;
}

export async function getRecentActions(limit = 10) {
  const result = await db.query(GrievanceHistoryQueries.GET_ALL + ` LIMIT $1`, [limit]);
  return result.rows;
}
