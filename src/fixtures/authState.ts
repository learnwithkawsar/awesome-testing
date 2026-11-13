import path from 'node:path';

/**
 * Saved browser sessions produced by `tests/setup/auth.setup.ts` (the `setup` project).
 * Every browser project depends on `setup`, so these files exist before any spec runs.
 *
 * Opt a spec into a logged-in session with:
 *   test.use({ storageState: STORAGE_STATE.admin });
 * Specs without it start logged out (the default).
 */
const AUTH_DIR = path.resolve(__dirname, '../../playwright/.auth');

export const STORAGE_STATE = {
  admin: path.join(AUTH_DIR, 'admin.json'),
} as const;
