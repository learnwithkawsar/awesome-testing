import { expect, test } from '@fixtures/pageFixtures';
import { Users } from '@data/index';

test.describe('Authentication', { tag: '@auth' }, () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test(
    'user logs in successfully with valid credentials',
    { tag: ['@smoke', '@regression'] },
    async ({ loginPage, dashboardPage }) => {
      await loginPage.login(Users.admin());

      await dashboardPage.assertIsVisible();
      await dashboardPage.assertWelcomeMessage();
    },
  );

  test(
    'user can log out after logging in',
    { tag: '@regression' },
    async ({ loginPage, dashboardPage }) => {
      await loginPage.login(Users.admin());
      await dashboardPage.assertIsVisible();

      await dashboardPage.logout();

      await loginPage.assertIsVisible();
      await expect(loginPage.flashMessage).toContainText('You logged out of the secure area!');
    },
  );

  test('shows an error for an unknown username', { tag: '@regression' }, async ({ loginPage }) => {
    await loginPage.login(Users.unknown());

    await loginPage.assertErrorMessage('Your username is invalid!');
    await loginPage.assertOnPage();
  });

  test('shows an error for a wrong password', { tag: '@regression' }, async ({ loginPage }) => {
    await loginPage.login(Users.withWrongPassword());

    await loginPage.assertErrorMessage('Your password is invalid!');
  });

  test(
    'blocks direct access to the secure area when logged out',
    { tag: '@regression' },
    async ({ dashboardPage, loginPage }) => {
      await dashboardPage.goto();

      await loginPage.assertOnPage();
      await loginPage.assertErrorMessage('You must login to view the secure area!');
    },
  );
});
