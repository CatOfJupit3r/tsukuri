import { Link } from '@tanstack/react-router';
import { LuArrowLeft } from 'react-icons/lu';

import { Button } from '#~/components/ui/button/button';

export function SettingsHeader() {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="mt-1 text-muted-foreground">Manage your account settings</p>
          </div>
          <Link to="/profile">
            <Button variant="ghost" size="sm" className="gap-2">
              <LuArrowLeft className="size-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
