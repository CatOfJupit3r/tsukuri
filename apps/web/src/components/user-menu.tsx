import { Link, useLocation } from '@tanstack/react-router';
import { LuUser, LuSettings, LuLogOut } from 'react-icons/lu';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#~/components/ui/dropdown-menu';
import { useMe } from '#~/features/user/hooks/use-me';
import AuthService from '#~/services/auth.service';

import { Button } from './ui/button/button';
import { Skeleton } from './ui/skeleton';

export default function UserMenu() {
  const { user, isLoggedIn, isPending, refetch } = useMe();
  const location = useLocation();

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!isLoggedIn) {
    return (
      <Button variant="outline" render={<Link to="/auth" />}>
        Sign In
      </Button>
    );
  }

  const handleSignOut = async () => {
    try {
      await AuthService.getInstance().signOut({
        fetchOptions: { throw: true },
      });
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      await refetch();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>{user.name}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-card" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            {user.email}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link to="/profile" className="flex w-full cursor-pointer items-center gap-2" />}>
            <LuUser className="size-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/settings" className="flex w-full cursor-pointer items-center gap-2" />}>
            <LuSettings className="size-4" />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link
              to="/auth"
              search={{ redirect: location.pathname }}
              className="flex w-full cursor-pointer items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              onClick={handleSignOut}
            />
          }
        >
          <LuLogOut className="size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
