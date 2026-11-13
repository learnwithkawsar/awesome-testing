import { type Page } from '@playwright/test';
import { BasePage } from './base.page';

/** The landing page listing all example pages ("Welcome to the-internet" on the demo target). */
export class HomePage extends BasePage {
  protected readonly path = '/';

  constructor(page: Page) {
    super(page);
  }

  async assertIsVisible(): Promise<void> {
    await this.assertHeadingVisible('Welcome to the-internet', 1);
  }
}
