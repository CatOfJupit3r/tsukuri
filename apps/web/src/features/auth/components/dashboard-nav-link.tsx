import { Link } from '@tanstack/react-router';
import { LuHouse } from 'react-icons/lu';

import { useMe } from '#~/features/auth/hooks/use-me';

/** Header link to the signed-in area, shown once the visitor is signed in. */
export function DashboardNavLink() {
  const { isLoggedIn } = useMe();
  if (!isLoggedIn) return null;

  return (
    <Link
      to="/dashboard"
      className="w-32 rounded-md px-2 py-1 text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-foreground data-[status=active]:font-semibold data-[status=active]:text-background"
    >
      <LuHouse className="mr-1 mb-0.5 inline-block size-4" />
      Dashboard
    </Link>
  );
}
