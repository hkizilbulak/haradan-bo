/** Maps backend `id` to BO UI `identifier` without losing the original field. */
export function withIdentifier<T extends { id: string }>(item: T): T & { identifier: string } {
  return {
    ...item,
    identifier: item.id,
  };
}

export function withIdentifiers<T extends { id: string }>(items: T[]): Array<T & { identifier: string }> {
  return items.map(withIdentifier);
}
