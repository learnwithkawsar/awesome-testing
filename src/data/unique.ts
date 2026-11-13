import { randomUUID } from 'node:crypto';

/**
 * Returns a value that is unique across parallel workers and repeated runs,
 * e.g. `uniqueId('user')` -> `user-1f3a9c2b`. Use it for anything a test creates.
 */
export function uniqueId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}
