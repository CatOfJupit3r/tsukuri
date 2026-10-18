import { LuRefreshCw } from 'react-icons/lu';

import { Button } from '#~/components/ui/button/button';
import { AUTOSAVE_STATUS_ICONS, AUTOSAVE_STATUS_LABELS } from '#~/components/ui/form/autosave-status.constants';
import { FormDraftRecovery } from '#~/components/ui/form/form-draft-recovery';
import { FORM_SAVE_STATES } from '#~/constants/ux-primitives';
import type { FormSaveState } from '#~/constants/ux-primitives';
import { cn } from '#~/lib/utils';

interface iAutosaveStatusProps {
  state: FormSaveState | null;
  onRetry?: () => unknown;
  message?: string;
  className?: string;
  recovery: {
    isAvailable: boolean;
    onRestore: () => unknown;
    onDiscard: () => unknown;
  };
}

export function AutosaveStatus({ state, onRetry, message, className, recovery }: iAutosaveStatusProps) {
  const recoveryControl = (
    <FormDraftRecovery
      isAvailable={recovery.isAvailable}
      onRestore={recovery.onRestore}
      onDiscard={recovery.onDiscard}
    />
  );
  if (state === null) return recoveryControl;
  const isProblem =
    state === FORM_SAVE_STATES.FAILED || state === FORM_SAVE_STATES.OFFLINE || state === FORM_SAVE_STATES.CONFLICT;
  const Icon = AUTOSAVE_STATUS_ICONS[state];

  return (
    <div className="space-y-2">
      {recoveryControl}
      <div
        role={isProblem ? 'alert' : 'status'}
        aria-live={isProblem ? 'assertive' : 'polite'}
        className={cn(
          'flex items-center gap-2 text-sm text-muted-foreground',
          isProblem && 'text-destructive',
          className,
        )}
      >
        <Icon
          className={cn('size-4 shrink-0', state === FORM_SAVE_STATES.SAVING && 'animate-spin')}
          aria-hidden="true"
        />
        <span>{message ?? AUTOSAVE_STATUS_LABELS[state]}</span>
        {isProblem && onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            <LuRefreshCw className="size-4" aria-hidden="true" />
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}
