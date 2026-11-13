import { test, STORAGE_STATE } from '@fixtures/pageFixtures';

// Starts already logged in: the session saved by tests/setup/auth.setup.ts is reused,
// so no test in this file goes through the login form.
test.use({ storageState: STORAGE_STATE.admin });

test.describe('Secure area (pre-authenticated)', { tag: '@regression' }, () => {
  test(
    'logged-in user opens the secure area directly',
    { tag: '@smoke' },
    async ({ dashboardPage }) => {
      await dashboardPage.goto();

      await dashboardPage.assertOnPage();
      await dashboardPage.assertIsVisible();
    },
  );
});
