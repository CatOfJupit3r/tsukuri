import { Link } from '@tanstack/react-router';
import { LuSettings, LuUser } from 'react-icons/lu';

import { DropdownMenuItem } from '#~/components/ui/overlay/dropdown-menu/dropdown-menu';

export function ProfileMenuItem() {
  return (
    <DropdownMenuItem render={<Link to="/profile" className="flex w-full cursor-pointer items-center gap-2" />}>
      <LuUser className="size-4" />
      Profile
    </DropdownMenuItem>
  );
}

export function SettingsMenuItem() {
  return (
    <DropdownMenuItem render={<Link to="/settings" className="flex w-full cursor-pointer items-center gap-2" />}>
      <LuSettings className="size-4" />
      Settings
    </DropdownMenuItem>
  );
}
