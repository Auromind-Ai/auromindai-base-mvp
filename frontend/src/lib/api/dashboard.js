import client from './client';
import { getWorkspaceIdFromToken } from '../auth';

/**
 * Full dashboard bundle — metrics + revenue + activities + insights
 * Single round-trip, cached 60s on backend.
 */
export async function getDashboardOverview(workspaceId, startDate, endDate) {
  const params = new URLSearchParams();
  const rawId = (workspaceId && workspaceId !== 'null' && workspaceId !== 'undefined')
    ? workspaceId
    : getWorkspaceIdFromToken();

  if (rawId && rawId !== 'null' && rawId !== 'undefined') {
    params.set('workspace_id', rawId);
  }
  if (startDate) params.set('start_date', startDate);
  if (endDate)   params.set('end_date', endDate);

  const queryString = params.toString();
  const url = queryString ? `/dashboard/overview?${queryString}` : '/dashboard/overview';
  return client.get(url);
}
