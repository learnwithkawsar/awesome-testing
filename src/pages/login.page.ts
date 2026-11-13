import { expect, type Locator, type Page } from '@playwright/test';
import type { UserCredentials } from '@data/user.builder';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  protected readonly path = '/login';

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly flashMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByLabel('Username');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.flashMessage = page.locator('#flash');
  }

  async submitLoginForm(username: string, password: string): Promise<void> {
    this.log.info(`Submitting login form for "${username}"`);
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async login(user: UserCredentials): Promise<void> {
    await this.submitLoginForm(user.username, user.password);
  }

  async assertIsVisible(): Promise<void> {
    await this.assertHeadingVisible('Login Page', 2);
    await expect(this.loginButton).toBeVisible();
  }

  async assertErrorMessage(message: string | RegExp): Promise<void> {
    await expect(this.flashMessage).toBeVisible();
    await expect(this.flashMessage).toContainText(message);
  }
}
