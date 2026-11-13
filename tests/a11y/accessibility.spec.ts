import { test } from '@fixtures/pageFixtures';

/*
 * Automated WCAG 2.1 A/AA checks with axe-core. These catch roughly a third of
 * accessibility issues (missing labels, contrast, ARIA misuse); they don't replace
 * keyboard and screen-reader testing.
 *
 * If a page has a known issue you can't fix yet, skip that rule for that page only,
 * with a comment and ticket link:
 *   await settingsPage.assertNoA11yViolations({ disableRules: ['color-contrast'] }); // JIRA-123
 */
test.describe('Accessibility', { tag: ['@regression', '@a11y'] }, () => {
  test('home page has no WCAG A/AA violations', async ({ homePage }) => {
    await homePage.goto();
    await homePage.assertIsVisible();

    await homePage.assertNoA11yViolations();
  });

  test('login page has no WCAG A/AA violations', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.assertIsVisible();

    await loginPage.assertNoA11yViolations();
  });

  test('login error state has no WCAG A/AA violations', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.submitLoginForm('unknown-user', 'whatever');
    await loginPage.assertErrorMessage('Your username is invalid!');

    await loginPage.assertNoA11yViolations();
  });
});
