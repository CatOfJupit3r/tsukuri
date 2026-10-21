import { LuCheck, LuLock } from 'react-icons/lu';

import { Button } from '#~/components/ui/button/button';
import type { BadgesQueryReturnType } from '#~/features/badges/hooks/use-badges';

interface iBadgeOptionProps {
  badge: BadgesQueryReturnType[number];
  isUnlocked: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}

export function BadgeOption({ badge, isUnlocked, isSelected, isDisabled, onSelect }: iBadgeOptionProps) {
  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      className={`relative h-auto justify-start gap-3 p-4 ${!isUnlocked ? 'cursor-not-allowed opacity-50' : ''}`}
      disabled={!isUnlocked || isDisabled}
      onClick={() => {
        if (isUnlocked) {
          onSelect();
        }
      }}
    >
      <div className="text-2xl">{badge.icon ?? '🎖️'}</div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{badge.label}</span>
          {isUnlocked ? null : <LuLock className="size-3" />}
          {isSelected ? <LuCheck className="size-4" /> : null}
        </div>
        <p className="text-xs text-wrap opacity-80">{badge.description}</p>
      </div>
    </Button>
  );
}
