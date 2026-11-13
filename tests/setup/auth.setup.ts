import { test } from '@fixtures/pageFixtures';
import { STORAGE_STATE } from '@fixtures/authState';
import { Users } from '@data/index';

/*
 * Runs once per test run (project `setup`) before every browser project.
 * Logs in through the UI and saves cookies + localStorage so specs can start authenticated.
 * Tagged with every suite tag so `--grep @smoke` etc. never filters it out.
 */
test(
  'authenticate as admin',
  { tag: ['@smoke', '@regression', '@auth'] },
  async ({ page, loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.login(Users.admin());

    await dashboardPage.assertIsVisible();

    await page.context().storageState({ path: STORAGE_STATE.admin });
  },
);
