import { LuCircleAlert } from 'react-icons/lu';

import { cn } from '#~/lib/utils';

export interface iFormErrorSummaryItem {
  fieldId?: string;
  label: string;
  message: string;
}

interface iFormErrorSummaryProps {
  className?: string;
  errors: iFormErrorSummaryItem[];
  title?: string;
}

export function FormErrorSummary({ className, errors, title = 'Please fix the following' }: iFormErrorSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <div
      role="alert"
      aria-atomic="true"
      className={cn('rounded-md border border-destructive/50 p-3 text-sm text-destructive', className)}
    >
      <p className="flex items-center gap-2 font-medium">
        <LuCircleAlert aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.map((error) => (
          <li key={`${error.fieldId ?? error.label}-${error.message}`}>
            {error.fieldId ? (
              <a className="underline underline-offset-2" href={`#${error.fieldId}`}>
                {error.label}: {error.message}
              </a>
            ) : (
              `${error.label}: ${error.message}`
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
