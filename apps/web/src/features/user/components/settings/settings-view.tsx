import { useState } from 'react';

import { Loader } from '#~/components/loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#~/components/ui/layout/tabs';

import { useUserProfile } from '../../hooks/use-user-profile';
import { DeleteAccountCard } from './delete-account-card';
import { SettingsHeader } from './settings-header';
import { SettingsProfileForm } from './settings-profile-form';
import { useSettingsProfileForm } from './use-settings-profile-form';

export function SettingsView() {
  const { data: profile, isPending: isProfileLoading } = useUserProfile();
  const settingsForm = useSettingsProfileForm(profile);
  const [isDeleteConfirmShown, setIsDeleteConfirmShown] = useState(false);

  if (isProfileLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SettingsHeader />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-4">
            <SettingsProfileForm profile={profile} settingsForm={settingsForm} />
          </TabsContent>

          <TabsContent value="danger" className="mt-6">
            <DeleteAccountCard
              isDeleteConfirmShown={isDeleteConfirmShown}
              onDeleteConfirmShownChange={setIsDeleteConfirmShown}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
