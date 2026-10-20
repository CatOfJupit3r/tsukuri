import { useState } from 'react';
import { LuTriangleAlert } from 'react-icons/lu';

import { Button } from '#~/components/ui/button/button';
import { Alert, AlertDescription } from '#~/components/ui/feedback/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#~/components/ui/layout/card';

const handleDeleteAccount = async () => {
  // TODO: Implement delete account functionality
  console.log('[Settings] Delete account requested');
};

interface iDeleteAccountConfirmationProps {
  onCancel: () => void;
}

function DeleteAccountConfirmation({ onCancel }: iDeleteAccountConfirmationProps) {
  return (
    <div className="space-y-3 pt-2">
      <p className="text-sm font-medium text-foreground">Are you absolutely sure? This action cannot be undone.</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleDeleteAccount} className="flex-1">
          Permanently Delete
        </Button>
      </div>
    </div>
  );
}

export function DeleteAccountCard() {
  const [isDeleteConfirmShown, setIsDeleteConfirmShown] = useState(false);

  return (
    <Card className="border-destructive/30 bg-danger-surface">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-destructive">
          <LuTriangleAlert className="size-5" />
          Delete Account
        </CardTitle>
        <CardDescription className="text-xs text-destructive">
          This action cannot be undone. Please be certain before proceeding.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <LuTriangleAlert />
          <AlertDescription className="text-sm">
            Deleting your account will permanently remove all your profile data, challenges you created, and challenge
            participation records. This cannot be reversed.
          </AlertDescription>
        </Alert>

        {isDeleteConfirmShown ? (
          <DeleteAccountConfirmation onCancel={() => setIsDeleteConfirmShown(false)} />
        ) : (
          <Button variant="destructive" onClick={() => setIsDeleteConfirmShown(true)} className="w-full">
            Delete My Account
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
