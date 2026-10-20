import { Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import z from 'zod';

import { Button } from '#~/components/ui/button/button';
import { useAppForm } from '#~/components/ui/form/field';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#~/components/ui/layout/card';

import { useUpdateUserProfile } from '../../hooks/use-update-user-profile';
import type { UserProfileQueryReturnType } from '../../hooks/use-user-profile';
import { BadgePicker } from '../badge-picker';
import { AccountInformationCard, ProfilePictureCard } from './account-cards';

interface iSettingsProfileFormProps {
  profile?: UserProfileQueryReturnType;
}

export function SettingsProfileForm({ profile }: iSettingsProfileFormProps) {
  const { updateUserProfile, isPending } = useUpdateUserProfile();

  const form = useAppForm({
    defaultValues: {
      bio: profile?.bio ?? '',
    },
    onSubmit: async ({ value }) => {
      updateUserProfile({ bio: value.bio });
    },
    validators: {
      onSubmit: z.object({
        bio: z.string().max(500, 'Bio must be 500 characters or less'),
      }),
    },
  });

  useEffect(() => {
    if (profile?.bio) {
      form.setFieldValue('bio', profile.bio);
    }
  }, [profile?.bio, form]);

  return (
    <form.AppForm>
      <form.Form className="space-y-4 p-0 md:p-0">
        <div className="flex gap-3">
          <Link to="/profile" className="flex-1">
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
          <form.SubmitButton className="flex-1" isDisabled={isPending}>
            {isPending ? 'Saving...' : 'Save Changes'}
          </form.SubmitButton>
        </div>

        <ProfilePictureCard profile={profile} />
        <AccountInformationCard />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Profile Details</CardTitle>
            <CardDescription className="text-xs">Customize how you appear to other users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <form.AppField name="bio">
              {(field) => (
                <field.TextareaField
                  label="Bio"
                  placeholder="Tell others about yourself..."
                  maxLength={500}
                  rows={4}
                  description={`${field.state.value.length}/500 characters`}
                />
              )}
            </form.AppField>
          </CardContent>
        </Card>

        <BadgePicker />
      </form.Form>
    </form.AppForm>
  );
}
