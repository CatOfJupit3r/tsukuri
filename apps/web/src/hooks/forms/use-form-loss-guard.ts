import { useBlocker } from '@tanstack/react-router';
import { useCallback, useEffect, useRef } from 'react';

import { useLossAcknowledgement } from '#~/hooks/forms/use-loss-acknowledgement';

interface iUseFormLossGuardOptions {
  hasLosableWork: boolean;
  message?: string;
  confirmLoss?: (message: string) => boolean;
}

const DEFAULT_LOSS_MESSAGE = 'Your changes have not been saved. Leave without saving?';

export function useFormLossGuard({
  hasLosableWork,
  message = DEFAULT_LOSS_MESSAGE,
  // eslint-disable-next-line no-alert
  confirmLoss = (prompt) => window.confirm(prompt),
}: iUseFormLossGuardOptions) {
  const {
    isAcknowledged: isLossAcknowledged,
    acknowledge: acknowledgeLoss,
    reset: resetLossAcknowledgement,
  } = useLossAcknowledgement();
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const shouldBlockLoss = hasLosableWork && !isLossAcknowledged;

  const blocker = useBlocker({
    shouldBlockFn: () => {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return shouldBlockLoss;
    },
    enableBeforeUnload: shouldBlockLoss,
    disabled: !shouldBlockLoss,
    withResolver: true,
  });

  useEffect(() => {
    if (hasLosableWork) resetLossAcknowledgement();
  }, [hasLosableWork, resetLossAcknowledgement]);

  const stay = useCallback(() => {
    if (blocker.status !== 'blocked') return;
    blocker.reset();
    queueMicrotask(() => returnFocusRef.current?.focus());
  }, [blocker]);

  const leave = useCallback(() => {
    if (blocker.status !== 'blocked') return;
    acknowledgeLoss();
    blocker.proceed();
  }, [acknowledgeLoss, blocker]);

  useEffect(() => {
    if (blocker.status !== 'blocked') return;
    if (confirmLoss(message)) leave();
    else stay();
  }, [blocker.status, confirmLoss, leave, message, stay]);

  const requestLoss = useCallback(() => {
    if (!shouldBlockLoss) return true;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const isConfirmed = confirmLoss(message);
    if (isConfirmed) acknowledgeLoss();
    else queueMicrotask(() => returnFocusRef.current?.focus());
    return isConfirmed;
  }, [acknowledgeLoss, confirmLoss, message, shouldBlockLoss]);

  return {
    shouldBlockLoss,
    requestLoss,
    navigationConfirmation: {
      isOpen: blocker.status === 'blocked',
      message,
      stay,
      leave,
    },
  };
}
