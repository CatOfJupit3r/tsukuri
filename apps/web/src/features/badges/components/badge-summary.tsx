import type { ReactNode } from 'react';

import { DEFAULT_BADGE_ICON } from '@startername/common/constants/badges';

import type { BadgesQueryReturnType } from '../hooks/use-badges';

interface iBadgeSummaryProps {
  badge: BadgesQueryReturnType[number];
  descriptionClassName: string;
  labelAccessories?: ReactNode;
  footer?: ReactNode;
}

export function BadgeSummary({ badge, descriptionClassName, labelAccessories, footer }: iBadgeSummaryProps) {
  return (
    <>
      <div className="text-2xl">{badge.icon ?? DEFAULT_BADGE_ICON}</div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{badge.label}</span>
          {labelAccessories}
        </div>
        <p className={descriptionClassName}>{badge.description}</p>
        {footer}
      </div>
    </>
  );
}
