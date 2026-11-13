import AxeBuilder from '@axe-core/playwright';
import { test, type Page } from '@playwright/test';

/** WCAG 2.1 level A + AA: the usual legal/compliance baseline. */
export const DEFAULT_A11Y_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
export type A11yViolation = AxeResults['violations'][number];

export type A11yScanOptions = {
  /** CSS selectors to scan. Default: the whole page. */
  include?: string[];
  /** CSS selectors to skip, e.g. third-party widgets you don't own. */
  exclude?: string[];
  /** axe rule IDs to skip. Always leave a comment saying why (ideally a ticket link). */
  disableRules?: string[];
  /** axe tags to check. Default: DEFAULT_A11Y_TAGS. */
  tags?: readonly string[];
};

/** Runs axe on the current page and attaches the full results to the test report. */
export async function scanAccessibility(
  page: Page,
  options: A11yScanOptions = {},
): Promise<A11yViolation[]> {
  let builder = new AxeBuilder({ page }).withTags([...(options.tags ?? DEFAULT_A11Y_TAGS)]);
  for (const selector of options.include ?? []) builder = builder.include(selector);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
  if (options.disableRules?.length) builder = builder.disableRules(options.disableRules);

  const results = await builder.analyze();

  await test.info().attach('accessibility-scan', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  return results.violations;
}

/** Turns violations into a short, readable failure message (one block per rule). */
export function formatViolations(violations: A11yViolation[]): string {
  if (violations.length === 0) return 'No accessibility violations';

  return violations
    .map((violation) => {
      const targets = violation.nodes
        .slice(0, 5)
        .map((node) => `      - ${node.target.join(' ')}`)
        .join('\n');
      const more =
        violation.nodes.length > 5 ? `\n      ...and ${violation.nodes.length - 5} more` : '';
      return [
        `  [${violation.impact ?? 'unknown'}] ${violation.id}: ${violation.help}`,
        `    ${violation.helpUrl}`,
        `    Elements (${violation.nodes.length}):`,
        targets + more,
      ].join('\n');
    })
    .join('\n\n');
}
