import type { PropsWithChildren, ReactNode } from 'react';

import { ErrorBoundaryActions } from '#~/components/error-boundary/error-boundary-actions';
import { ErrorBoundaryHeading } from '#~/components/error-boundary/error-boundary-heading';
import { Card, CardContent, CardHeader } from '#~/components/ui/layout/card';

interface iErrorBoundaryFrameProps extends PropsWithChildren {
  cardClassName: string;
  description: ReactNode;
  onReset: () => unknown;
  title: string;
}

export function ErrorBoundaryFrame({ cardClassName, children, description, onReset, title }: iErrorBoundaryFrameProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className={cardClassName}>
        <CardHeader>
          <ErrorBoundaryHeading description={description} title={title} />
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          <ErrorBoundaryActions onReset={onReset} />
        </CardContent>
      </Card>
    </div>
  );
}
