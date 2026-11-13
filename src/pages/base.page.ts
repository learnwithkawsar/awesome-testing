import { expect, test, type Locator, type Page } from '@playwright/test';
import { formatViolations, scanAccessibility, type A11yScanOptions } from '@utils/accessibility';
import { createLogger, type Logger } from '@utils/logger';

/**
 * Shared behaviour for every Page Object. Subclasses declare their relative `path`
 * and expose intent-revealing actions/assertions built on accessible locators.
 */
export abstract class BasePage {
  /** Path relative to `baseURL` (configured in playwright.config.ts). */
  protected abstract readonly path: string;
  protected readonly log: Logger;

  constructor(protected readonly page: Page) {
    this.log = createLogger(this.constructor.name);
  }

  /** Navigates to this page's path and waits for the DOM to be ready. */
  async goto(): Promise<void> {
    this.log.info(`Navigating to ${this.path}`);
    await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
  }

  async waitForURL(url: string | RegExp = this.urlPattern()): Promise<void> {
    await this.page.waitForURL(url);
  }

  async assertOnPage(): Promise<void> {
    await expect(this.page).toHaveURL(this.urlPattern());
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  /** Waits for a network response whose URL matches the pattern (useful around form submits). */
  async waitForResponse(urlPattern: string | RegExp, status = 200): Promise<void> {
    await this.page.waitForResponse(
      (response) =>
        (typeof urlPattern === 'string'
          ? response.url().includes(urlPattern)
          : urlPattern.test(response.url())) && response.status() === status,
    );
  }

  // --- Accessibility helpers -------------------------------------------------

  heading(name: string | RegExp, level?: number): Locator {
    return this.page.getByRole('heading', { name, level });
  }

  button(name: string | RegExp): Locator {
    return this.page.getByRole('button', { name });
  }

  link(name: string | RegExp): Locator {
    return this.page.getByRole('link', { name });
  }

  async assertHeadingVisible(name: string | RegExp, level?: number): Promise<void> {
    await expect(this.heading(name, level)).toBeVisible();
  }

  // --- Accessibility (axe-core) ---------------------------------------------

  /**
   * Scans the page with axe (WCAG 2.1 A/AA by default) and fails with a readable
   * list of violations. Full axe results are attached to the HTML report.
   */
  async assertNoA11yViolations(options: A11yScanOptions = {}): Promise<void> {
    const violations = await scanAccessibility(this.page, options);
    this.log.info(`Accessibility scan found ${violations.length} violation(s)`);
    // Compare rule IDs only so the failure shows the readable summary, not a 200-line object diff.
    expect(
      violations.map((violation) => violation.id),
      `Accessibility violations:
${formatViolations(violations)}`,
    ).toEqual([]);
  }

  // --- Diagnostics -----------------------------------------------------------

  /** Captures a full-page screenshot and attaches it to the current test's report. */
  async attachScreenshot(name: string): Promise<void> {
    const body = await this.page.screenshot({ fullPage: true });
    await test.info().attach(name, { body, contentType: 'image/png' });
    this.log.debug(`Attached screenshot "${name}"`);
  }

  private urlPattern(): RegExp {
    const escaped = this.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`${escaped}$`);
  }
}
