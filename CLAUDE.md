# CLAUDE.md — Awesome Testing

Instructions for Claude Code (and other AI agents) working in this repository.

## What this repo is

A Playwright + TypeScript end-to-end test framework with:

- **Multi-environment config** — `config/.env.<env>` validated by `zod` in `config/env.config.ts`.
- **Fixture-driven Page Object Model** — Page Objects are injected into tests via `src/fixtures/pageFixtures.ts`.
- **Tag-based suites** — `@smoke`, `@regression`, `@auth`, plus `@a11y` for accessibility scans.
- **Playwright MCP** — `.mcp.json` (Claude Code) and `.cursor/mcp.json` (Cursor) start `@playwright/mcp`.

## Commands

| Task                              | Command                                                           |
| --------------------------------- | ----------------------------------------------------------------- |
| Run all tests (staging, headless) | `npm test` / `npm run test:staging`                               |
| Run headed                        | `npm run test:staging:headed`                                     |
| Run against dev                   | `npm run test:dev`                                                |
| Prod smoke                        | `npm run test:prod:smoke`                                         |
| One file / one project            | `npx playwright test tests/auth/login.spec.ts --project=chromium` |
| Interactive UI                    | `npm run test:ui`                                                 |
| Type check                        | `npm run typecheck`                                               |
| Lint (must be zero warnings)      | `npm run lint`                                                    |
| Format                            | `npm run format`                                                  |

Always run `npm run typecheck && npm run lint` and the affected specs (`--project=chromium` is enough while iterating) before declaring work done.

## Architecture rules (non-negotiable)

1. **Never instantiate Page Objects in specs.** No `new LoginPage(page)` in `tests/**`. Request them as fixtures: `async ({ loginPage }) => {}`. ESLint enforces this.
2. **Import `test`/`expect` from `@fixtures/pageFixtures`**, never `test` from `@playwright/test` in specs.
3. **Every Page Object extends `BasePage`** (`src/pages/base.page.ts`), declares `protected readonly path`, and lives in `src/pages/<name>.page.ts`.
4. **Locators live in Page Objects, not specs.** Specs read like user stories; assertions that encode page knowledge become `assert*` methods on the Page Object.
5. **Locator priority:** `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId` → CSS (last resort, comment why). No XPath.
6. **No hard waits** (`waitForTimeout`) and no `{ force: true }`. Rely on web-first assertions (`await expect(locator).toBeVisible()`).
7. **No secrets in code.** Read config through the `env` fixture or `import { env } from '@config/env.config'`. Never read `process.env` directly in tests or pages.
8. **Every test is tagged** with at least one of `@smoke`, `@regression`, `@auth` using the `tag` option:
   ```ts
   test('does X', { tag: ['@smoke', '@regression'] }, async ({ loginPage }) => { ... });
   ```
   `@smoke` = fast, critical path, safe to run against prod (read-only, no data mutation).
9. **Accessibility:** use `await xPage.assertNoA11yViolations()` (axe-core, WCAG 2.1 A/AA, defined on `BasePage`) after the page has rendered; tag such tests `@a11y` plus `@regression`. Never call `AxeBuilder` from specs. `disableRules` only per page, with a comment and ticket link.
10. Tests must be independent and parallel-safe (`fullyParallel: true`). Use `apiHelper` for setup/teardown instead of UI where possible.
11. **Don't log in through the UI** except in tests about login itself. Reuse the saved session with `test.use({ storageState: STORAGE_STATE.admin })` (produced by the `setup` project in `tests/setup/auth.setup.ts`). New roles go in `src/fixtures/authState.ts` plus a matching setup test.
12. **Test data comes from builders** in `src/data/` (`Users.admin()`, `aUser().withWrongPassword().build()`, `uniqueId('x')`), not literals in specs. Anything a test creates must use `uniqueId()` so parallel runs don't collide.

## Adding a new page (workflow for agents)

1. **Inspect the live app with Playwright MCP.** Use `browser_navigate` to `BASE_URL` + path (see `config/.env.staging`), then `browser_snapshot` to read the accessibility tree. Prefer the snapshot over screenshots.
2. **Synthesize accessible locators** from the snapshot: role + accessible name first (`getByRole('button', { name: 'Save' })`), labels for form fields (`getByLabel('Email')`), `getByTestId` only when no accessible name exists.
3. **Create the Page Object** in `src/pages/<name>.page.ts`:
   ```ts
   import { expect, type Locator, type Page } from '@playwright/test';
   import { BasePage } from './base.page';

   export class SettingsPage extends BasePage {
     protected readonly path = '/settings';
     readonly saveButton: Locator;

     constructor(page: Page) {
       super(page);
       this.saveButton = page.getByRole('button', { name: 'Save' });
     }

     async assertIsVisible(): Promise<void> {
       await this.assertHeadingVisible('Settings');
     }
   }
   ```
4. **Register the fixture** in `src/fixtures/pageFixtures.ts` (add to the `Fixtures` type and to `base.extend`).
5. **Write the spec** under `tests/<feature>/<name>.spec.ts`, tagged, using only fixtures.
6. **Verify**: `npm run typecheck && npm run lint && npx playwright test tests/<feature> --project=chromium`. If a locator is flaky, re-snapshot with MCP and fix the Page Object — do not add waits or retries.

## Environment

- `ENV` selects `config/.env.<ENV>` (`local | dev | staging | prod`, default `staging`).
- Non-empty real environment variables (e.g. CI secrets) override values from the file.
- Missing/invalid values fail fast with a readable error before any test runs.
- `config/.env.*` files are git-ignored except `.env.example`; add new variables to **all** of: the zod schema, `src/types/env.d.ts`, `config/.env.example`, and the CI workflows.

## File map

```
config/env.config.ts        zod schema + env loader (exports `env`)
src/pages/*.page.ts         Page Objects (extend BasePage)
src/fixtures/pageFixtures.ts  test = base.extend<Fixtures>(...); re-exports STORAGE_STATE
src/fixtures/authState.ts   STORAGE_STATE paths (playwright/.auth/*.json, git-ignored)
src/data/*.ts               test data builders (aUser, Users, uniqueId) — import from '@data/index'
tests/setup/auth.setup.ts   `setup` project: logs in once, saves storageState
src/utils/accessibility.ts  axe-core scan + violation formatting (used by BasePage.assertNoA11yViolations)
src/utils/apiHelper.ts      API helper for hybrid tests (fixture: apiHelper)
src/utils/logger.ts         createLogger(scope); DEBUG_LOGS=true enables debug
tests/**                    Specs only — no locators, no `new XPage()`
playwright.config.ts        projects: setup → chromium, firefox, webkit, Mobile Chrome
```
