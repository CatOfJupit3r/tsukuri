import { LuCalendar } from 'react-icons/lu';

import { useMe } from '#~/features/auth/hooks/use-me';

import type { UserProfileQueryReturnType } from '../../hooks/use-user-profile';
import { AvatarWithBadge } from '../avatar-with-badge';

interface iProfileIdentityProps {
  profile?: UserProfileQueryReturnType;
}

export function ProfileIdentity({ profile }: iProfileIdentityProps) {
  const { user } = useMe();

  return (
    <div className="flex gap-4">
      <AvatarWithBadge
        imageUrl={user?.image}
        fallback={user?.name?.[0] ?? user?.username?.[0] ?? 'U'}
        selectedBadge={profile?.selectedBadge}
        size="lg"
      />
      <div>
        <h1 className="text-2xl font-bold text-foreground">{user?.name || user?.username}</h1>
        <p className="text-muted-foreground">@{user?.username}</p>
        {profile?.bio ? <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {user?.createdAt ? (
            <div className="flex items-center gap-1">
              <LuCalendar className="size-3" />
              Joined{' '}
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
