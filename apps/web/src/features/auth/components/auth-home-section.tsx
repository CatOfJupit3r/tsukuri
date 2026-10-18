import { Link } from '@tanstack/react-router';
import { TbLayoutDashboard } from 'react-icons/tb';

import { Button } from '#~/components/ui/button/button';
import { Skeleton } from '#~/components/ui/feedback/skeleton';
import { useMetrics } from '#~/features/auth/hooks/use-metrics';

const CountSkeleton = () => <Skeleton className="h-7 w-[5ch]" />;

/** Home page entry to the signed-in area, with live user numbers. */
export function AuthHomeSection() {
  const { data: metrics, isPending, error } = useMetrics();

  return (
    <div className="mt-10 flex flex-col items-center gap-10">
      <Button size="lg" variant="outline" render={<Link to="/dashboard" />}>
        <TbLayoutDashboard className="size-5" />
        See Dashboard
      </Button>
      <div className="flex w-full items-center justify-center gap-8 border-t border-border pt-10 text-sm text-muted-foreground">
        <div className="flex flex-col items-center">
          <div className="text-lg font-bold text-foreground">
            {isPending || error ? <CountSkeleton /> : metrics?.totalUsers}
          </div>
          <p className="text-xs">Total Users</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col items-center">
          <div className="text-lg font-bold text-foreground">
            {isPending || error ? <CountSkeleton /> : metrics?.activeSessions}
          </div>
          <p className="text-xs">Active Sessions</p>
        </div>
      </div>
    </div>
  );
}
