import type { ErrorComponentProps } from '@tanstack/react-router';
import { HiOutlineExclamationCircle } from 'react-icons/hi';

import { ErrorBoundaryFrame } from '#~/components/error-boundary/error-boundary-frame';
import { Alert, AlertDescription, AlertTitle } from '#~/components/ui/feedback/alert';
import { IS_DEVELOPMENT } from '#~/constants/constants';

export function ErrorBoundary({ error, reset }: Pick<ErrorComponentProps, 'error' | 'reset'>) {
  if (IS_DEVELOPMENT) {
    return (
      <ErrorBoundaryFrame
        cardClassName="w-full max-w-3xl"
        description="An error occurred while rendering this page"
        onReset={reset}
        title="Development Error"
      >
        <Alert variant="destructive">
          <HiOutlineExclamationCircle className="size-4" />
          <AlertTitle>{error.name || 'Error'}</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>

        {error.stack ? (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Stack Trace:</h3>
            <pre className="max-h-64 overflow-x-auto rounded-lg bg-muted p-4 text-xs">
              <code>{error.stack}</code>
            </pre>
          </div>
        ) : null}
      </ErrorBoundaryFrame>
    );
  }

  return (
    <ErrorBoundaryFrame
      cardClassName="w-full max-w-md"
      description="We're sorry, but something unexpected happened"
      onReset={reset}
      title="Something went wrong"
    >
      <p className="text-sm text-muted-foreground">
        The page encountered an error and couldn&apos;t be displayed. You can try refreshing the page or return to the
        home page.
      </p>
    </ErrorBoundaryFrame>
  );
}
