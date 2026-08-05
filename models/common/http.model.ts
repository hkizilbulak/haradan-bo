export interface PagedResponse<T> {
  content?: Array<T>;
  page?: Page;
}

export interface Page {
  size: number;
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface SearchParams<T> {
  filter?: string;
  pageRequest: PageParams<T>;
}

export interface PageParams<T> {
  page?: number;
  size?: number;
  sort?: [{ direction?: 'ASC' | 'DESC' | string, property?: keyof T | string }];
}