import { Link, useLocation } from '@tanstack/react-router';
import { LuLogOut } from 'react-icons/lu';

import { Button } from '#~/components/ui/button/button';
import { Skeleton } from '#~/components/ui/feedback/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#~/components/ui/overlay/dropdown-menu/dropdown-menu';
import { authClientService } from '#~/features/auth/auth-client.service';
import { useMe } from '#~/features/auth/hooks/use-me';
import { webSlots } from '#~/lib/web-slots';

export function UserMenu() {
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
      await authClientService.getInstance().signOut({
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
          {webSlots.USER_MENU_ITEMS.length > 0 ? <DropdownMenuSeparator /> : null}
          {webSlots.USER_MENU_ITEMS.map((MenuItem) => (
            <MenuItem key={MenuItem.name} />
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link
              to="/auth"
              search={{ redirect: location.pathname }}
              className="flex w-full cursor-pointer items-center gap-2 text-destructive hover:text-destructive/80"
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
