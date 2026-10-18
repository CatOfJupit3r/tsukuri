import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

interface iPageParam {
  pageParam?: number;
}

export function useInfiniteList<TItem, TPage>(
  query: UseInfiniteQueryResult<InfiniteData<TPage, iPageParam>>,
  selectItems: (page: TPage) => TItem[],
  selectTotal: (page: TPage) => number,
) {
  const pages = query.data?.pages;
  const items = useMemo(() => {
    if (!pages) return [] as TItem[];
    return pages.flatMap(selectItems);
  }, [pages, selectItems]);

  const lastPage = query.data?.pages?.at(-1);
  const total = lastPage ? selectTotal(lastPage) : 0;

  return {
    data: query.data,
    error: query.error,
    isError: query.isError,
    isPending: query.isPending,
    isFetching: query.isFetching,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    items,
    total,
    hasMore: items.length < total,
  };
}
