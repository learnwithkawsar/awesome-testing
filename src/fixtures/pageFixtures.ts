import { test as base } from '@playwright/test';
import { env, type EnvConfig } from '@config/env.config';
import { DashboardPage } from '@pages/dashboard.page';
import { HomePage } from '@pages/home.page';
import { LoginPage } from '@pages/login.page';
import { ApiHelper } from '@utils/apiHelper';

/** Everything a spec can request by name. Register every new Page Object here. */
export type Fixtures = {
  env: EnvConfig;
  homePage: HomePage;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  apiHelper: ApiHelper;
};

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  env: async ({}, use) => {
    await use(env);
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  apiHelper: async ({ request }, use) => {
    await use(new ApiHelper(request, env.API_URL ?? env.BASE_URL));
  },
});

export { expect } from '@playwright/test';
export { STORAGE_STATE } from './authState';
