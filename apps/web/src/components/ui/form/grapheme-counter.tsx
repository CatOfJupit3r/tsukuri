import {
  GRAPHEME_COUNTER_STATES,
  LIVE_REGION_POLITENESS,
  LIVE_REGION_POLITENESS_ARIA_VALUES,
  countUxGraphemes,
} from '#~/constants/ux-primitives';
import type { GraphemeCounterState } from '#~/constants/ux-primitives';
import { cn } from '#~/lib/utils';

interface iGraphemeCounterProps {
  className?: string;
  max: number;
  value: string;
}

function getCounterState(count: number, max: number): GraphemeCounterState {
  if (count > max) return GRAPHEME_COUNTER_STATES.EXCEEDED_LIMIT;
  if (max - count <= Math.max(5, Math.ceil(max * 0.1))) return GRAPHEME_COUNTER_STATES.APPROACHING_LIMIT;
  return GRAPHEME_COUNTER_STATES.WITHIN_LIMIT;
}

export function GraphemeCounter({ className, max, value }: iGraphemeCounterProps) {
  const count = countUxGraphemes(value);
  const state = getCounterState(count, max);
  const isAttentionNeeded = state !== GRAPHEME_COUNTER_STATES.WITHIN_LIMIT;
  const politeness = isAttentionNeeded ? LIVE_REGION_POLITENESS.POLITE : LIVE_REGION_POLITENESS.OFF;

  return (
    <span
      aria-live={LIVE_REGION_POLITENESS_ARIA_VALUES.get(politeness)}
      className={cn(
        'block text-right text-xs text-muted-foreground',
        state === GRAPHEME_COUNTER_STATES.EXCEEDED_LIMIT && 'text-destructive',
        className,
      )}
      data-state={state}
    >
      {count}/{max}
    </span>
  );
}
