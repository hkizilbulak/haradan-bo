export interface PagedResponse<T> {
  content?: Array<T>;
  page?: Page;
}

export interface Page {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
  /** Present when server uses opaque cursor pagination */
  hasMore?: boolean;
  nextCursor?: string | null;
  cursorMode?: boolean;
}

export interface SearchParams<T> {
  filter?: string;
  pageRequest: PageParams<T>;
  /** Opaque server cursor; never parse/modify */
  cursor?: string | null;
}

export interface PageParams<T> {
  page?: number;
  size?: number;
  sort?: [{ direction?: 'ASC' | 'DESC' | string, property?: keyof T | string }];
}
