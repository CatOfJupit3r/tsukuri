import type { ReactNode } from 'react';
import { HiOutlineExclamationCircle } from 'react-icons/hi';

import { CardDescription, CardTitle } from '#~/components/ui/layout/card';

interface iErrorBoundaryHeadingProps {
  description: ReactNode;
  title: string;
}

export function ErrorBoundaryHeading({ description, title }: iErrorBoundaryHeadingProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
        <HiOutlineExclamationCircle className="size-5 text-destructive" />
      </div>
      <div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
    </div>
  );
}
