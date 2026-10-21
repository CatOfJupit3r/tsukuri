import { Button } from '#~/components/ui/button/button';
import { Input } from '#~/components/ui/controls/input';
import { Label } from '#~/components/ui/controls/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#~/components/ui/layout/card';
import { useMe } from '#~/features/auth/hooks/use-me';

import type { UserProfileQueryReturnType } from '../../hooks/use-user-profile';
import { AvatarWithBadge } from '../avatar-with-badge';

interface iProfilePictureCardProps {
  profile?: UserProfileQueryReturnType;
}

export function ProfilePictureCard({ profile }: iProfilePictureCardProps) {
  const { user } = useMe();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Profile Picture</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <AvatarWithBadge
          imageUrl={user?.image}
          fallback={user?.name?.[0] ?? user?.username?.[0] ?? 'U'}
          selectedBadge={profile?.selectedBadge}
          size="lg"
        />
        <Button variant="outline" disabled>
          Change Picture
        </Button>
        <p className="text-xs text-muted-foreground">Coming soon</p>
      </CardContent>
    </Card>
  );
}

export function AccountInformationCard() {
  const { user } = useMe();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Account Information</CardTitle>
        <CardDescription className="text-xs">These fields are managed by your authentication provider</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="email" className="text-xs font-medium">
            Email
          </Label>
          <Input id="email" type="email" value={user?.email ?? ''} disabled className="mt-1.5 text-sm" />
        </div>
        <div>
          <Label htmlFor="username" className="text-xs font-medium">
            Username
          </Label>
          <Input id="username" value={user?.username ?? ''} disabled className="mt-1.5 text-sm" />
        </div>
      </CardContent>
    </Card>
  );
}
