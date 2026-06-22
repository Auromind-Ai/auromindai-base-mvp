import client from './client';
import { getWorkspaceIdFromToken } from '../auth';

/**
 * Full dashboard bundle — metrics + revenue + activities + insights
 * Single round-trip, cached 60s on backend.
 */
export async function getDashboardOverview(workspaceId, startDate, endDate) {
  const wid = workspaceId || getWorkspaceIdFromToken();
  let url = `/dashboard/overview?workspace_id=${wid}`;
  if (startDate) url += `&start_date=${startDate}`;
  if (endDate) url += `&end_date=${endDate}`;
  return client.get(url);
}
