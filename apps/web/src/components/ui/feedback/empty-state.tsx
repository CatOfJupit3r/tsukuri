import type { ReactNode } from 'react';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#~/components/ui/feedback/empty';

interface iEmptyStateProps {
  title: string;
  description: string;
  media?: ReactNode;
  children?: ReactNode;
}

export function EmptyState({ title, description, media, children }: iEmptyStateProps) {
  return (
    <Empty>
      <EmptyHeader>
        {media ? <EmptyMedia variant="icon">{media}</EmptyMedia> : null}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children ? <EmptyContent>{children}</EmptyContent> : null}
    </Empty>
  );
}
