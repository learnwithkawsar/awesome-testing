---
name: write-e2e-test
description: Write or extend Playwright end-to-end tests in this repo the way it requires — explore the page live with Playwright MCP first, then build/extend a Page Object, register its fixture, write a tagged spec that uses only fixtures, and verify with typecheck, lint and repeated runs. Use this whenever the user asks to automate test cases (e.g. "automate TC-LOGIN-003", "automate docs/test-cases/x.md"), add or write a test/spec, add a page object, cover a page or flow with E2E tests, or fix a flaky Playwright test, even if they just say "add a test for the dropdown page".
---

# Write an E2E test

[CLAUDE.md](../../../CLAUDE.md) is the source of truth for this repo's rules; read it first if it isn't already in context. This skill is the working procedure that keeps you inside those rules, which ESLint and reviewers enforce: specs never create page objects with `new`, never import `test` from `@playwright/test`, always carry a tag, and contain no locators.

## 1. Know what you're automating

- **Approved test cases** in `docs/test-cases/*.md` are the best input: each has an ID, steps and an expected result. Automate the cases marked `E2E`, `E2E + mock` or `API`; skip `Manual` ones.
- **A plain request** ("add a test for the dropdown") is fine for one or two obvious scenarios. If the feature clearly needs more than ~3 scenarios and no design exists, suggest running the `test-case-design` skill first, because agreeing on scenarios is cheaper than rewriting specs.

## 2. Walk through it live before writing code

Generated tests fail most often because the locators or the expected text were guessed. So perform each step for real first:

1. Read `BASE_URL` from `config/.env.<ENV>` (default `staging`).
2. With Playwright MCP: `browser_navigate` to the page, then `browser_snapshot`.
3. Do each step (`browser_click`, `browser_type`, `browser_select_option`, …) and take a snapshot after each one. Note:
   - the role and accessible name of every element you touch,
   - the exact text of messages you'll assert on,
   - URL changes.
4. Never type a real password into a non-local site. Login flows use the credentials from the env config inside the test itself; while exploring, check only the logged-out behaviour or ask the user to sign in.

The snapshot output is your locator source. If MCP isn't available, read the page's HTML with the browser tools you have, but don't invent locators.

Check the **assertion targets** live too, not just the elements you click. Text that looks like a label in a screenshot may be a bare text node that `getByText` or `getByLabel` won't match. A wrong assertion locator fails the same way a wrong action locator does.

Playwright MCP saves snapshots and logs to `.playwright-mcp/`. That folder is git-ignored; leave it alone.

## 3. Reuse before you create

Check what exists, so you extend instead of duplicate:

- `src/pages/*.page.ts`: is there already a page object for this page? Add locators and methods to it.
- `src/fixtures/pageFixtures.ts`: which fixtures exist (`env`, `apiHelper`, page fixtures).
- `src/data/` (if present): data builders such as `Users.admin()`, `aUser().withWrongPassword().build()`, `uniqueId('x')`. Use them instead of literals.
- `src/fixtures/authState.ts` (if present): `STORAGE_STATE` saved sessions. Tests that need a logged-in user (and aren't about login itself) start with `test.use({ storageState: STORAGE_STATE.admin })` instead of logging in through the UI.
- `BasePage` helpers: `assertHeadingVisible`, `heading()`, `button()`, `link()`, and `assertNoA11yViolations()` if present.

## 4. Page object

Create `src/pages/<name>.page.ts` or extend the existing one.

```ts
import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

export class DropdownPage extends BasePage {
  protected readonly path = '/dropdown';

  readonly optionSelect: Locator;

  constructor(page: Page) {
    super(page);
    this.optionSelect = page.getByRole('combobox');
  }

  async selectOption(label: string): Promise<void> {
    this.log.info(`Selecting "${label}"`);
    await this.optionSelect.selectOption({ label });
  }

  async assertIsVisible(): Promise<void> {
    await this.assertHeadingVisible('Dropdown List');
  }

  async assertSelected(label: string): Promise<void> {
    // CSS: there is no role locator for "the currently selected <option>".
    await expect(this.optionSelect.locator('option:checked')).toHaveText(label);
  }
}
```

- **Locator priority:** `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId` → CSS. CSS only as a last resort, with a comment saying why the accessible options don't work. No XPath.
- **Elements with no accessible name** (e.g. a checkbox with no `<label>`): scope by role inside the nearest named container and pick by position, such as `page.getByRole('main').getByRole('checkbox').nth(0)`. Hide the index behind a named method or map (`checkbox('checkbox 1')`) and comment why. Missing labels are an accessibility bug, so add it to the test case document's open questions as well.
- **Methods are user intent:** `selectOption('Option 1')`, not `clickSecondItem()`.
- **Assertions that need page knowledge** become `assert*` methods. Specs stay readable as user stories.
- **No `waitForTimeout`, no `{ force: true }`.** Web-first assertions (`await expect(locator).toBeVisible()`) already wait.
- If you add a new `assert*` method name that specs will call as their only check, add it to `assertFunctionNames` under `playwright/expect-expect` in `.eslintrc.json`, or lint will warn and fail.

## 5. Register the fixture

In `src/fixtures/pageFixtures.ts`, add the page object to the `Fixtures` type and to `base.extend`, plus its import, following the existing order (no need to reorder what's there):

```ts
dropdownPage: async ({ page }, use) => {
  await use(new DropdownPage(page));
},
```

## 6. The spec

Put it in `tests/<feature>/<name>.spec.ts`.

```ts
import { test } from '@fixtures/pageFixtures';

test.describe('Dropdown', { tag: '@regression' }, () => {
  test.beforeEach(async ({ dropdownPage }) => {
    await dropdownPage.goto();
  });

  test('TC-DROPDOWN-001: user selects an option', { tag: '@smoke' }, async ({ dropdownPage }) => {
    await dropdownPage.selectOption('Option 1');

    await dropdownPage.assertSelected('Option 1');
  });
});
```

- **Import** `test` and `expect` from `@fixtures/pageFixtures` only.
- **Titles** start with the test case ID when there is one (`TC-DROPDOWN-001: …`), so a failing test leads straight back to its design.
- **Tags** come from the test case document. `@smoke` only for read-only tests: smoke runs against prod.
- **Independent and parallel-safe:** no test relies on another's state or order. Anything a test creates gets a unique value (`uniqueId()` when available). Prefer `apiHelper` for setup and cleanup over clicking through the UI.
- **Error and edge states** (500s, empty lists, slow responses) use `page.route()` to mock the response, wrapped in a page object or helper method rather than written inline in the spec.
- **No secrets or `process.env`** in specs or pages; use the `env` fixture or builders.

## 7. Verify

Run these and fix whatever fails before reporting:

```bash
npm run typecheck
npm run lint
npx playwright test tests/<feature> --project=chromium
npx playwright test tests/<feature> --project=chromium --repeat-each=3
```

The `--repeat-each=3` run catches flakiness while the context is fresh. If a test is flaky, re-snapshot the page and fix the locator or the assertion; don't add waits or retries. At the end, format only the files you touched (`npx prettier --write <files>`), so the diff doesn't pick up unrelated formatting changes.

## 8. Report

Tell the user:

- the files created or changed,
- which test case IDs are now automated, and the result of the test runs (pass count, any flakiness seen),
- any cases you didn't automate and why (marked Manual, blocked by an open question, needs test data the app doesn't provide).

If the cases came from `docs/test-cases/<feature>.md`, add the spec path to each automated row's "Automate as" cell (e.g. `E2E — tests/dropdown/dropdown.spec.ts`), so the document shows what's covered.
