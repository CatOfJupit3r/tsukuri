import { useEffect } from 'react';
import z from 'zod';

import { useAppForm } from '#~/components/ui/form/field';

import { useUpdateUserProfile } from '../../hooks/use-update-user-profile';
import type { UserProfileQueryReturnType } from '../../hooks/use-user-profile';

export function useSettingsProfileForm(profile?: UserProfileQueryReturnType) {
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

  return { form, isPending };
}
