import { Link } from '@tanstack/react-router';
import { LuSettings, LuTrophy } from 'react-icons/lu';

import { Loader } from '#~/components/loader';
import { Button } from '#~/components/ui/button/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#~/components/ui/feedback/empty';
import { Card, CardContent } from '#~/components/ui/layout/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#~/components/ui/layout/tabs';

import { useUserProfile } from '../../hooks/use-user-profile';
import { PublicCodeCard } from '../invite-code-card';
import { ProfileIdentity } from './profile-identity';

function ProfileSettingsLink() {
  return (
    <div className="flex gap-2">
      <Link to="/settings">
        <Button variant="outline" size="sm" className="gap-2">
          <LuSettings className="size-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </Link>
    </div>
  );
}

function ProfileAchievementsTabs() {
  return (
    <Tabs defaultValue="achievements" className="w-full">
      <TabsList className="grid w-full grid-cols-1">
        <TabsTrigger value="achievements">Achievements</TabsTrigger>
      </TabsList>

      <TabsContent value="achievements" className="mt-4">
        <Empty className="border border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LuTrophy className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Achievements</EmptyTitle>
            <EmptyDescription>Complete more challenges to unlock achievements!</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </TabsContent>
    </Tabs>
  );
}

export function ProfileView() {
  const { data: profile, isPending: isProfileLoading } = useUserProfile();

  if (isProfileLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <Card className="mb-6">
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <ProfileIdentity profile={profile} />
              <ProfileSettingsLink />
            </div>
          </CardContent>
        </Card>

        {profile?.publicCode ? (
          <div className="mb-6">
            <PublicCodeCard publicCode={profile.publicCode} />
          </div>
        ) : null}

        <ProfileAchievementsTabs />
      </div>
    </div>
  );
}
