import { PagedResponse, SearchParams } from '@/models/common';
import { useCallback, useEffect, useRef, useState } from 'react';

type SearchableService<T> = {
  search: (params: SearchParams<T>) => Promise<PagedResponse<T>>;
};

type IProps<T> = {
  service: SearchableService<T>;
  params?: SearchParams<T>;
  /** Default page size for cursor pages */
  pageSize?: number;
};

/**
 * Cursor-based list loader for OpenAPI admin pages that return nextCursor/hasMore.
 * Keeps an opaque cursor stack so "previous" works without parsing cursors.
 */
export default function useCursorApi<T>({
  service,
  params,
  pageSize = 10,
}: IProps<T>) {
  const [data, setData] = useState<PagedResponse<T>>();
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [filter, setFilter] = useState(params?.filter ?? '');
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
  const [stackIndex, setStackIndex] = useState(0);
  const [refetchToken, setRefetchToken] = useState(0);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const silentRefetchRef = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentCursor = cursorStack[stackIndex] ?? null;

  const resetPagination = useCallback(() => {
    setCursorStack([null]);
    setStackIndex(0);
  }, []);

  const handleFilter = useCallback((nextFilter: string) => {
    setFilter(nextFilter);
    setCursorStack([null]);
    setStackIndex(0);
  }, []);

  const refetch = useCallback((opts?: { silent?: boolean }) => {
    silentRefetchRef.current = Boolean(opts?.silent);
    setRefetchToken((value) => value + 1);
  }, []);

  const goNext = useCallback(() => {
    if (inFlightRef.current) {
      return;
    }
    const nextCursor = data?.page?.nextCursor;
    if (!data?.page?.hasMore || !nextCursor) {
      return;
    }
    setCursorStack((prev) => {
      const trimmed = prev.slice(0, stackIndex + 1);
      return [...trimmed, nextCursor];
    });
    setStackIndex((prev) => prev + 1);
  }, [data?.page?.hasMore, data?.page?.nextCursor, stackIndex]);

  const goPrev = useCallback(() => {
    if (inFlightRef.current) {
      return;
    }
    setStackIndex((prev) => Math.max(0, prev - 1));
  }, []);

  useEffect(() => {
    if (params?.filter !== undefined && params.filter !== filter) {
      handleFilter(params.filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.filter]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const silent = silentRefetchRef.current;
    silentRefetchRef.current = false;
    const fetchData = async () => {
      inFlightRef.current = true;
      setIsError(false);
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      try {
        const response = await service.search({
          filter,
          cursor: currentCursor,
          pageRequest: {
            page: stackIndex,
            size: pageSize,
            sort: params?.pageRequest?.sort,
          },
        });
        if (requestId !== requestIdRef.current) {
          return;
        }
        setData(response);
        setIsError(false);
      } catch {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setIsError(true);
        if (!silent) {
          setData(undefined);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          inFlightRef.current = false;
        }
      }
    };

    void fetchData();
  }, [service, filter, currentCursor, stackIndex, pageSize, refetchToken, params?.pageRequest?.sort]);

  const isEmpty = !isLoading && !isError && (data?.content?.length ?? 0) === 0;

  return [{
    data,
    isLoading,
    isRefreshing,
    isError,
    isEmpty,
    filter,
    handleFilter,
    refetch,
    resetPagination,
    goNext,
    goPrev,
    canGoPrev: stackIndex > 0 && !isLoading,
    canGoNext: Boolean(data?.page?.hasMore && data?.page?.nextCursor) && !isLoading,
    pageIndex: stackIndex,
  }];
}
