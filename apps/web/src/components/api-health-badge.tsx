import { Badge } from '#~/components/ui/feedback/badge';
import { useHealthCheck } from '#~/hooks/queries/use-health-check';

const HEALTHY_STATUS = 'OK';

/** Whether the API answers its health check. */
export function ApiHealthBadge() {
  const { data, isPending, error } = useHealthCheck();

  if (isPending) return <Badge variant="outline">Checking service status...</Badge>;
  if (error || data?.status !== HEALTHY_STATUS) return <Badge variant="destructive">Service unhealthy</Badge>;
  return <Badge variant="secondary">Service is live</Badge>;
}
