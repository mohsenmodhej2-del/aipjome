import { accessOverview } from '../access/service';
import { managementCatalog } from '../catalog/service';
import { fulfillmentQueue } from '../fulfillment/service';
import type { SessionUser } from '../identity/service';

export async function managementDashboard(user: SessionUser) {
  const catalog = await managementCatalog(user);
  const [fulfillments, access] = await Promise.all([
    fulfillmentQueue(user),
    user.role === 'super_admin' ? accessOverview(user) : Promise.resolve({ assignments: [] }),
  ]);
  return { ...catalog, fulfillments, assignments: access.assignments };
}
