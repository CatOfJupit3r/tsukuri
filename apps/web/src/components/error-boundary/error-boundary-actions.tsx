import { Link } from '@tanstack/react-router';
import { HiOutlineHome, HiOutlineRefresh } from 'react-icons/hi';

import { Button } from '#~/components/ui/button/button';

interface iErrorBoundaryActionsProps {
  onReset: () => unknown;
}

export function ErrorBoundaryActions({ onReset }: iErrorBoundaryActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onReset} variant="default">
        <HiOutlineRefresh className="mr-2 size-4" />
        Try Again
      </Button>
      <Button variant="outline" render={<Link to="/" />}>
        <HiOutlineHome className="mr-2 size-4" />
        Go Home
      </Button>
    </div>
  );
}
