import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/** The authenticated landing page ("Secure Area" on the demo target). */
export class DashboardPage extends BasePage {
  protected readonly path = '/secure';

  readonly logoutLink: Locator;
  readonly flashMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.logoutLink = page.getByRole('link', { name: 'Logout' });
    // The app's live region for flash messages (role="region", aria-label="Messages").
    this.flashMessage = page.getByRole('region', { name: 'Messages' });
  }

  async assertIsVisible(): Promise<void> {
    await this.assertHeadingVisible('Secure Area', 2);
    await expect(this.logoutLink).toBeVisible();
  }

  async assertWelcomeMessage(): Promise<void> {
    await expect(this.flashMessage).toContainText('You logged into a secure area!');
  }

  async logout(): Promise<void> {
    this.log.info('Logging out');
    await this.logoutLink.click();
  }
}
