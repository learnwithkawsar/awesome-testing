---
name: test-case-design
description: Design test cases for a feature, page, user story or Jira ticket in this Playwright repo, before any test code is written. Produces a reviewed Markdown table in docs/test-cases/ with IDs, steps, test data, expected results, priority, suite tags (@smoke/@regression/@auth) and how each case should be automated. Use this whenever the user asks what to test, wants test cases, test scenarios, a test plan, coverage for a page or ticket, edge cases, negative cases, or says "generate tests for X" without having agreed scenarios yet, even if they don't say "test case".
---

# Test case design

Turn a feature into a small, high-value set of test cases that a human can review in two minutes and that the `write-e2e-test` skill can automate directly.

The output is a design document, not code. Reviewing scenarios is cheap; reviewing and rewriting automation built on the wrong scenarios is expensive. So stop after the document and get the user's approval.

## 1. Understand the target

Collect what exists before inventing anything:

- **Requirements:** the ticket, user story or description the user gave. If they gave a Jira key and Atlassian tools are available, read the ticket and its acceptance criteria.
- **The live page:** read `BASE_URL` from `config/.env.<ENV>` (default `staging`). Open the page with Playwright MCP (`browser_navigate`, then `browser_snapshot`) and note every input, button, link, message and state. Prefer the snapshot over screenshots: it shows roles and accessible names, which later become locators.
- **What's already covered:** skim `tests/**` and `src/pages/**` for the feature. Don't duplicate existing tests; reference them instead.

If something essential is unknown (e.g. the expected behaviour for an invalid input isn't specified and the page doesn't reveal it), write it down as an open question rather than guessing an expected result.

## 2. Find the cases

Work through these lenses. Not every lens applies to every feature; skip the ones that don't and say nothing about them.

- **Happy paths:** the main thing a user comes to do, end to end.
- **Equivalence classes:** group inputs that should behave the same (valid email / invalid format / empty) and pick one representative per group.
- **Boundaries:** min, max, just inside, just outside (lengths, counts, dates, amounts).
- **Combinations:** when 3 or more inputs each have several values, don't test the full cross product. Build a pairwise set (every pair of values appears together at least once) and show the table. For example, 3 parameters with 3 values each need 9 cases instead of 27.
- **States and transitions:** logged out vs logged in, empty vs populated, first visit vs returning, back/refresh after submit.
- **Errors:** server error, timeout, empty response. These are usually automated with network mocking, so mark them that way.
- **Access control:** pages that should be blocked when logged out or for the wrong role.
- **Accessibility:** if the repo has `assertNoA11yViolations` on `BasePage`, add one case per distinct page state (default, error, populated).

Aim for the smallest set that would catch real bugs. 5–15 cases for one page is typical. If you have more than ~20, you're probably testing the cross product or duplicating classes.

## 3. Prioritise, tag and choose the automation level

For each case decide:

- **Priority:** P0 (critical path, blocks release), P1 (important), P2 (nice to have).
- **Tags** (CLAUDE.md rule 8, at least one):
  - `@smoke` only if it's fast, critical **and read-only**. Smoke runs against prod, so anything that creates, edits or deletes data is never `@smoke`. "Read-only" means nothing changes on the server: toggling a checkbox or typing into a form you don't submit is fine; submitting, saving or deleting is not.
  - `@regression` for full functional coverage.
  - `@auth` for authentication and authorization flows.
  - `@a11y` for accessibility scans, if the repo already uses that tag.
- **Automate as:**
  - `E2E` (UI through page objects),
  - `API` (through the `apiHelper` fixture; faster and more stable when the UI isn't the point; only applies when the behaviour has a server endpoint),
  - `E2E + mock` (UI with `page.route()` for error and edge states),
  - `Manual` (with a reason: visual judgement, third-party payment, etc.).

## 4. Write the document

Save to `docs/test-cases/<feature>.md` (kebab-case, e.g. `docs/test-cases/login.md`). If the file exists, update it and keep existing IDs stable, since specs refer to them.

Use this structure:

```markdown
# <Feature> test cases

Source: <ticket link / page URL / "user description">
Page(s): <paths>
Last updated: <YYYY-MM-DD>

## Test cases

| ID           | Title              | Preconditions | Steps                                                        | Test data           | Expected result                                         | Priority | Tags         | Automate as |
| ------------ | ------------------ | ------------- | ------------------------------------------------------------ | ------------------- | ------------------------------------------------------- | -------- | ------------ | ----------- |
| TC-LOGIN-001 | Valid user logs in | Logged out    | 1. Open /login 2. Enter username and password 3. Click Login | Admin user from env | Secure area shown with "You logged into a secure area!" | P0       | @smoke @auth | E2E         |

## Pairwise combinations (only if used)

<the table of parameter combinations>

## Coverage notes

- Already covered by: <existing specs>
- Not covered, and why: <deliberate gaps>

## Open questions

- <anything the expected results depend on that you couldn't confirm>
```

Writing guidance:

- **IDs:** `TC-<FEATURE>-NNN`, uppercase feature, zero-padded. Renumbering is fine while you're still drafting. Once the document has been shared or any spec uses an ID, never renumber: retire a dropped case by marking it `Removed` instead of reusing its number.
- **Steps** describe user intent ("Enter a wrong password"), not locators. Locators belong in page objects.
- **Test data** names the kind of data, not literals: "admin user from env", "unique unknown username", "password of 129 characters". Real credentials never appear in the document.
- **Expected results** must be observable and specific: the exact message, the URL, what is visible or hidden. "Works correctly" can't be automated.

## 5. Hand off

Show the user a short summary in chat: the number of cases by priority, anything marked Manual and why, and the open questions. Ask them to review the document. Then stop.

The one exception: if the user asked for design and automation in the same request ("design test cases and automate them"), show the summary and carry on with `write-e2e-test`, saying clearly that the table hasn't been reviewed. They asked not to wait.

Once they approve (possibly after edits), the `write-e2e-test` skill automates the cases, using the IDs in the test titles.
