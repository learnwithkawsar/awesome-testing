# Awesome Testing

End-to-end test automation with **Playwright + TypeScript**: multi-environment configuration, a fixture-driven Page Object Model, tag-based suites, HTML reports, GitHub Actions CI and Playwright MCP support for AI agents.

Out of the box it targets the public demo app [the-internet.herokuapp.com](https://the-internet.herokuapp.com), so every test passes on a fresh clone. Point `BASE_URL` at your own app to make it yours.

**Contents**

1. [Setup (everyone, once)](#1-setup-everyone-once)
2. [QA guide: running tests](#2-qa-guide-running-tests)
3. [Viewing reports](#3-viewing-reports)
4. [Developer guide: writing tests](#4-developer-guide-writing-tests)
5. [Environments](#5-environments)
6. [CI (GitHub Actions)](#6-ci-github-actions)
7. [Command reference](#7-command-reference)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Setup (everyone, once)

**Requirements:** [Node.js 20+](https://nodejs.org/) and Git.

```bash
git clone https://github.com/learnwithkawsar/awesome-testing.git
cd awesome-testing
npm install
npx playwright install
```

Create your environment file from the template (the `.env.<env>` files are not committed):

```bash
cp config/.env.example config/.env.staging
```

On Windows PowerShell use `Copy-Item config/.env.example config/.env.staging`. Do the same for `dev`, `prod` or `local` if you need them, then edit the values (URL, username, password).

Check everything works:

```bash
npm run test:staging
```

---

## 2. QA guide: running tests

You don't need to write code to run the suite. All commands run from the project folder.

### Watch the tests in a browser (headed)

```bash
npm run test:staging:headed
```

This opens **one Chromium window at a time** and runs the tests one after another, so you can follow what happens. Each test opens a fresh window and closes it when it finishes; this keeps tests independent (no shared login or cookies).

Slow it down to follow each click and keystroke:

```bash
npx cross-env SLOW_MO=500 npm run test:staging:headed
```

Watch every browser (Chromium, Firefox, WebKit, mobile) in parallel. This opens several windows at once:

```bash
npm run test:staging:headed:all
```

### Run fast, without a visible browser (headless)

```bash
npm run test:staging     # all tests, all 4 browsers
npm run test:dev         # against the dev environment
npm run test:prod:smoke  # only @smoke tests, against prod
```

### Run only some tests

| Goal                            | Command                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| Only smoke tests                | `npm run test:smoke`                                                               |
| Only regression tests           | `npm run test:regression`                                                          |
| Only accessibility tests        | `npm run test:a11y`                                                                |
| Only Chromium                   | `npm run test:chromium`                                                            |
| One file                        | `npx playwright test tests/auth/login.spec.ts`                                     |
| Tests whose name contains text  | `npx playwright test -g "logs in"`                                                 |
| One browser, headed, one window | `npx cross-env ENV=staging playwright test --headed --project=firefox --workers=1` |

Extra Playwright options can be added to any npm script after `--`:

```bash
npm run test:staging -- --project=chromium --grep @auth
```

### Interactive UI mode (recommended for exploring)

```bash
npm run test:ui
```

Opens the Playwright UI in **one window**: pick tests from a list, run them, and step through each action with a live DOM snapshot, network calls and console logs. Good for investigating a failure.

### Step-by-step debugging

```bash
npm run test:debug -- tests/auth/login.spec.ts
```

Opens the Playwright Inspector so you can pause and step through each action.

---

## 3. Viewing reports

Every run writes an **HTML report** to `playwright-report/` and failure artifacts to `test-results/`. The terminal also prints a live pass/fail list while tests run.

### Open the HTML report

```bash
npm run report
```

This starts a local server and opens the last report in your browser. In the report you can:

- Filter by passed / failed / flaky / skipped, by browser project, or by tag (`@smoke`, `@regression`, `@auth`).
- Open a test to see each step and its duration.
- For **failed** tests: see the error, the **screenshot**, the **video** of the run and the **trace**.

The report is overwritten on each run. Copy the `playwright-report/` folder if you want to keep one.

### Open a trace (time-travel debugging)

Click **Trace** on a failed test in the HTML report, or open it directly:

```bash
npx playwright show-trace test-results/<test-folder>/trace.zip
```

The trace viewer shows every action with before/after DOM snapshots, network requests and console output. You can also drag a `trace.zip` onto [trace.playwright.dev](https://trace.playwright.dev).

### What is kept

| Artifact    | When              | Where                            |
| ----------- | ----------------- | -------------------------------- |
| HTML report | Every run         | `playwright-report/index.html`   |
| Screenshot  | Failed tests only | `test-results/<test>/`           |
| Video       | Failed tests only | `test-results/<test>/video.webm` |
| Trace       | Failed tests only | `test-results/<test>/trace.zip`  |

To always record traces (e.g. for a demo), add `--trace on` to the command.

### Reports from CI

On GitHub, open **Actions → the workflow run → Artifacts** and download `playwright-report-<browser>` (or `smoke-prod-report`). Unzip it and run:

```bash
npx playwright show-report path/to/unzipped-folder
```

---

## 4. Developer guide: writing tests

### How it fits together

```text
config/env.config.ts          Loads config/.env.<ENV>, validates it with zod, exports `env`
src/pages/*.page.ts           Page Objects: locators + actions + assertions for one page
src/fixtures/pageFixtures.ts  Injects Page Objects into tests by name
src/fixtures/authState.ts     Paths of saved login sessions (STORAGE_STATE)
src/data/*.ts                 Test data builders (aUser(), Users, uniqueId())
tests/setup/auth.setup.ts     Logs in once per run and saves the session
tests/**/*.spec.ts            Test scenarios, written only against fixtures
playwright.config.ts          Browsers, timeouts, reporters, failure artifacts
```

### Writing a test

Import `test` and `expect` from the fixtures file and ask for pages by name. Never create Page Objects with `new` in a spec (ESLint blocks it).

```ts
import { test } from '@fixtures/pageFixtures';
import { Users } from '@data/index';

test('user logs in', { tag: ['@smoke', '@auth'] }, async ({ loginPage, dashboardPage }) => {
  await loginPage.goto();
  await loginPage.login(Users.admin());
  await dashboardPage.assertIsVisible();
});
```

Every test needs at least one tag:

| Tag           | Meaning                                                   |
| ------------- | --------------------------------------------------------- |
| `@smoke`      | Fast, critical path, read-only (safe to run against prod) |
| `@regression` | Full functional coverage                                  |
| `@auth`       | Authentication / authorization flows                      |
| `@a11y`       | Accessibility (axe-core) scans; add alongside another tag |

### Accessibility checks (axe-core)

Every Page Object has `assertNoA11yViolations()`. It scans the current page with [axe-core](https://github.com/dequelabs/axe-core) against WCAG 2.1 A/AA. On failure it lists each broken rule, a help link and the elements involved. The full axe results are attached to the HTML report as `accessibility-scan`.

```ts
test('settings page is accessible', { tag: ['@regression', '@a11y'] }, async ({ settingsPage }) => {
  await settingsPage.goto();
  await settingsPage.assertIsVisible(); // let the page finish rendering first
  await settingsPage.assertNoA11yViolations();
});
```

Options: `include` / `exclude` (CSS selectors), `disableRules` (axe rule IDs) and `tags`. Disable a rule only for the page that has the known issue, with a comment and ticket link. Run just these tests with `npm run test:a11y`. See [tests/a11y/accessibility.spec.ts](tests/a11y/accessibility.spec.ts).

Automated scans catch only part of accessibility problems. They don't replace keyboard and screen-reader testing.

### Starting tests already logged in

The `setup` project ([tests/setup/auth.setup.ts](tests/setup/auth.setup.ts)) logs in once per run and saves the session to `playwright/.auth/admin.json` (git-ignored). Every browser project depends on it, so it runs automatically, even with `--grep` or `--project`.

Tests start **logged out** by default. To reuse the saved session in a spec, add one line at the top of the file:

```ts
import { test, STORAGE_STATE } from '@fixtures/pageFixtures';

test.use({ storageState: STORAGE_STATE.admin });
```

Only login/logout tests should go through the login form. Everything else that needs a user should use the saved session. See [tests/secure/secureArea.spec.ts](tests/secure/secureArea.spec.ts).

To add another role, add a path to `STORAGE_STATE` in `src/fixtures/authState.ts` and a matching test in `auth.setup.ts`.

### Test data builders

Build test data in [src/data/](src/data/) instead of writing literals in specs. Builders start from valid defaults (the configured admin user), so a test only says what is different:

```ts
import { aUser, Users, uniqueId } from '@data/index';

Users.admin(); // credentials from config/.env.<ENV>
Users.unknown(); // unique, non-existent username
aUser().withWrongPassword().build(); // same as Users.withWrongPassword()
aUser().withUsername(uniqueId('qa')).build();
```

Generated values use `uniqueId()`, so parallel workers and repeated runs never collide. Add new builders as `src/data/<thing>.builder.ts` and export them from `src/data/index.ts`.

### Adding a new page

1. Create `src/pages/settings.page.ts`:

   ```ts
   import { type Locator, type Page } from '@playwright/test';
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

2. Register it in `src/fixtures/pageFixtures.ts`: add `settingsPage: SettingsPage` to the `Fixtures` type and a `settingsPage` entry in `base.extend`.
3. Use it in a spec: `async ({ settingsPage }) => { ... }`.

Locator priority: `getByRole` → `getByLabel` → `getByPlaceholder` → `getByText` → `getByTestId` → CSS as a last resort. No XPath, no `waitForTimeout`.

Tools that help find locators:

```bash
npm run codegen -- https://the-internet.herokuapp.com/login
```

### Before you push

```bash
npm run typecheck
npm run lint
npm run format
npm run test:chromium
```

CI runs the same checks and fails on any lint warning.

### Using AI agents (Claude Code / Cursor)

`.mcp.json` (Claude Code) and `.cursor/mcp.json` (Cursor) register the Playwright MCP server, which lets the agent drive a real browser. Approve the server when prompted, then ask for example:

> Open the staging app's /settings page with the Playwright MCP, read its accessibility tree, and create a SettingsPage object, fixture and @regression spec following CLAUDE.md.

[CLAUDE.md](CLAUDE.md) contains the rules agents follow in this repo.

#### Watch Claude work in your own Chrome (Claude in Chrome)

The Playwright MCP above drives a separate browser. If you'd rather **watch Claude click through the app in your everyday Chrome**, use the Claude in Chrome extension:

1. Install the **Claude in Chrome** extension from the Chrome Web Store and sign in with the same Claude account you use for Claude Code.
2. Connect it to Claude Code:
   - **Desktop app:** set "Preferred browser" to Chrome in the app's settings.
   - **CLI:** start with `claude --chrome`, or run `/chrome` inside a session.
3. Ask Claude to use Chrome, for example:

   > Using Claude in Chrome, open the staging app's /login page and walk through the "blocks direct access to the secure area" scenario from tests/auth/login.spec.ts. Tell me if the page behaves differently from what the spec expects.

   > Using Claude in Chrome, open /settings and suggest accessible locators for a SettingsPage object.

Claude opens its own tab group in your Chrome window, and you can see every navigation and click as it happens.

Which tool to use:

| You want to…                                        | Use                                               |
| --------------------------------------------------- | ------------------------------------------------- |
| Run the test suite and watch it                     | `npm run test:staging:headed` (add `SLOW_MO=500`) |
| Have Claude explore a page and write a Page Object  | Playwright MCP (`.mcp.json`)                      |
| Watch Claude walk through a scenario in your Chrome | Claude in Chrome                                  |

Notes:

- Claude in Chrome drives the browser by hand. It doesn't run `npx playwright test`; anything worth keeping should become a spec.
- It uses your real Chrome profile and sign-ins. Point it at dev or staging, not prod.
- Claude won't type passwords into sites for you. Sign in yourself in that tab, then let Claude continue.

---

## 5. Environments

| Variable         | Required       | Description                                                 |
| ---------------- | -------------- | ----------------------------------------------------------- |
| `ENV`            | set by scripts | `local` \| `dev` \| `staging` \| `prod` (default `staging`) |
| `BASE_URL`       | yes            | App URL, used as Playwright `baseURL`                       |
| `API_URL`        | no             | API base URL for `apiHelper` (falls back to `BASE_URL`)     |
| `ADMIN_USERNAME` | yes            | Login user                                                  |
| `ADMIN_PASSWORD` | yes            | Login password                                              |
| `SLOW_MO`        | no             | Milliseconds to pause between actions (e.g. `500`)          |
| `DEBUG_LOGS`     | no             | `true` prints debug-level framework logs                    |

- The `ENV` value picks the file `config/.env.<ENV>`.
- Real environment variables (e.g. CI secrets) override the file when they are non-empty.
- If a required value is missing or invalid, the run stops immediately with a clear error listing what is wrong.
- `config/.env.*` files are git-ignored except `.env.example`. Never commit real credentials.

---

## 6. CI (GitHub Actions)

| Workflow                                             | Trigger                                           | What it runs                                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [PR Tests](.github/workflows/test-pr.yml)            | Pull request or push to `main`                    | Typecheck, lint, format check, then all tests headless on Chromium, Firefox, WebKit and Mobile Chrome in parallel |
| [Production Smoke](.github/workflows/smoke-prod.yml) | Daily 06:00 UTC, or manually from the Actions tab | `@smoke` tests on Chromium against prod                                                                           |

To target your real app, set these in **Settings → Secrets and variables → Actions** (otherwise the demo values from `.env.example` are used):

- Variables: `STAGING_BASE_URL`, `STAGING_API_URL`, `PROD_BASE_URL`, `PROD_API_URL`
- Secrets: `STAGING_ADMIN_USERNAME`, `STAGING_ADMIN_PASSWORD`, `PROD_ADMIN_USERNAME`, `PROD_ADMIN_PASSWORD`

In CI, failed tests are retried up to 2 times; a test that passes on retry is marked **flaky** in the report.

---

## 7. Command reference

| Script                                                                  | What it does                                               |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| `npm test`                                                              | All tests, default env (`staging`), headless, all browsers |
| `npm run test:local` / `test:dev` / `test:staging`                      | All tests against that env, headless                       |
| `npm run test:local:headed` / `test:dev:headed` / `test:staging:headed` | Headed, Chromium only, one window at a time                |
| `npm run test:staging:headed:all`                                       | Headed, all browsers in parallel                           |
| `npm run test:prod:smoke`                                               | `@smoke` tests against prod                                |
| `npm run test:smoke` / `test:regression` / `test:a11y`                  | Filter by tag (current env)                                |
| `npm run test:chromium`                                                 | Chromium only, headless                                    |
| `npm run test:ui`                                                       | Playwright UI mode                                         |
| `npm run test:debug`                                                    | Playwright Inspector                                       |
| `npm run report`                                                        | Open the last HTML report                                  |
| `npm run codegen`                                                       | Record actions and locators                                |
| `npm run install:browsers`                                              | Install browsers plus OS dependencies                      |
| `npm run typecheck`                                                     | Strict TypeScript check                                    |
| `npm run lint` / `lint:fix`                                             | ESLint (zero warnings allowed)                             |
| `npm run format` / `format:check`                                       | Prettier                                                   |
| `npm run mcp`                                                           | Start the Playwright MCP server manually                   |

---

## 8. Troubleshooting

**Many browser windows open in headed mode.**
Use `npm run test:<env>:headed` (one browser, one worker, one window at a time) or `npm run test:ui` (everything in a single window). Each test intentionally gets its own fresh browser context, which Playwright shows as its own window; running tests as tabs of one window would make them share cookies and login state, so tests could affect each other.

**`Invalid environment configuration for ENV="staging"`.**
`config/.env.staging` is missing or has an empty/invalid value. Copy it from `config/.env.example` and fill it in.

**`Executable doesn't exist` / browser not found.**
Run `npx playwright install`.

**A test times out against the demo site.**
the-internet.herokuapp.com is a free public server and is sometimes slow. Re-run the test; against your own app this should not happen. Use the trace to see where it waited.

**Port already in use when opening the report.**
`npx playwright show-report --port 9324`

## License

MIT
